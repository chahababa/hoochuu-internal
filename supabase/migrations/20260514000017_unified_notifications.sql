-- 20260514000017_unified_notifications.sql
--
-- Phase 1 PR-A: 統一通知中心 DB 骨幹（hoochuu-internal merge）
--
-- 參照：https://github.com/chahababa/hoochuu-internal-docs/blob/main/merge-plan-curried-brewing-fog.md §A.4
--
-- 內容：
--   1. public.current_user_id() helper（橋接 auth.uid() → public.users.id）
--   2. public.notifications 表 + index
--   3. RLS policies（select_own / update_own；INSERT 走 SECURITY DEFINER helpers）
--   4. fn_notify / fn_notify_role helpers
--   5. improvement_tasks AFTER INSERT trigger（第一個 writer：新改善任務通知 leader）
--
-- 注意：public.users.id ≠ auth.users.id（透過 email 配對於 current_user_profile()），
-- 所以 RLS 用 public.current_user_id() 而非 auth.uid()。
--
-- 影響範圍：純新增。不動既有表 / 函式 / policy。

-- 1. Helper: bridge auth.uid() → public.users.id

create or replace function public.current_user_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.current_user_profile()
$$;

grant execute on function public.current_user_id() to authenticated;

-- 2. Notifications table + index

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  module text not null check (module in ('inspection', 'bom', 'system')),
  type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  title text not null,
  body text,
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc);

comment on table public.notifications is
  'Unified notification table; writes only via fn_notify / fn_notify_role SECURITY DEFINER helpers. Phase 1 of hoochuu-internal merge.';

-- 3. RLS（不開 INSERT policy → 直接 INSERT 一律被擋；只有 SECURITY DEFINER helpers 能寫）

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

-- 4. Write helpers（SECURITY DEFINER）

create or replace function public.fn_notify(
  p_user_id uuid,
  p_module text,
  p_type text,
  p_severity text,
  p_title text,
  p_body text,
  p_link text,
  p_metadata jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (
    user_id, module, type, severity, title, body, link, metadata
  ) values (
    p_user_id, p_module, p_type, p_severity, p_title, p_body, p_link, p_metadata
  )
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.fn_notify(uuid, text, text, text, text, text, text, jsonb)
  to authenticated;

comment on function public.fn_notify is
  'Insert a notification for a single user. Returns notification id. SECURITY DEFINER bypasses RLS.';

create or replace function public.fn_notify_role(
  p_role public.user_role,
  p_store_id uuid,
  p_module text,
  p_type text,
  p_severity text,
  p_title text,
  p_body text,
  p_link text,
  p_metadata jsonb
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  insert into public.notifications (
    user_id, store_id, module, type, severity, title, body, link, metadata
  )
  select
    u.id, p_store_id, p_module, p_type, p_severity, p_title, p_body, p_link, p_metadata
  from public.users u
  where u.role = p_role
    and u.is_active = true
    and (
      p_store_id is null
      or u.store_id = p_store_id
      or p_role in ('owner', 'manager')
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.fn_notify_role(public.user_role, uuid, text, text, text, text, text, text, jsonb)
  to authenticated;

comment on function public.fn_notify_role is
  'Broadcast a notification to active users with given role (store-scoped for leader). Returns inserted row count.';

-- 5. Trigger: improvement_tasks AFTER INSERT → notify leaders of that store

create or replace function public.fn_notify_improvement_task_created()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.fn_notify_role(
    'leader'::public.user_role,
    new.store_id,
    'inspection',
    'improvement_task.created',
    'info',
    '新的改善任務待處理',
    null,
    '/inspection/improvements',
    jsonb_build_object(
      'improvement_task_id', new.id,
      'store_id', new.store_id,
      'item_id', new.item_id,
      'score_id', new.score_id
    )
  );
  return new;
end;
$$;

comment on function public.fn_notify_improvement_task_created is
  'Trigger fn: after improvement_task INSERT, notify all active leaders of that store via fn_notify_role.';

drop trigger if exists trg_improvement_tasks_notify_leaders on public.improvement_tasks;
create trigger trg_improvement_tasks_notify_leaders
  after insert on public.improvement_tasks
  for each row
  execute function public.fn_notify_improvement_task_created();
