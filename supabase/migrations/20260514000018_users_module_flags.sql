-- 20260514000018_users_module_flags.sql
--
-- Phase 2-A: users 表加模組權限欄位 + can_access_bom helper（hoochuu-internal merge）
--
-- 參照：https://github.com/chahababa/hoochuu-internal-docs/blob/main/merge-plan-curried-brewing-fog.md §A.2
--
-- 內容：
--   1. public.users 加 4 個欄位（auth_method / display_name / can_access_bom / can_access_inspection）
--   2. public.current_user_can_access_bom() helper
--
-- 為什麼現在做：
--   Phase 2-B（BOM 17 張表 port）的所有 RLS policy 末尾會接
--   `AND public.current_user_can_access_bom()`，依賴本 helper + can_access_bom 欄位。
--
-- 影響範圍：
--   - 純 additive，預設值不破壞既有功能：所有現存 users 自動 auth_method='google' /
--     can_access_inspection=true / can_access_bom=false，跟現況一致
--   - 沒有任何 SCS code path 讀新欄位（要等 Phase 2-C/4 才開始用）
--   - Phase 0.5 雖然加了 password login UI，但目前 prod 0 個 password user，
--     所以 default 'google' 對所有現存 row 正確

-- 1. Additive columns

alter table public.users
  add column if not exists auth_method text
    check (auth_method in ('google', 'password'))
    default 'google';

alter table public.users
  add column if not exists display_name text;

alter table public.users
  add column if not exists can_access_bom boolean not null default false;

alter table public.users
  add column if not exists can_access_inspection boolean not null default true;

comment on column public.users.auth_method is
  'Authentication method: google (Google OAuth) or password (Supabase email/password). Added in Phase 2-A of hoochuu-internal merge.';

comment on column public.users.display_name is
  'Optional display name distinct from `name` (used by BOM module). Added in Phase 2-A of hoochuu-internal merge.';

comment on column public.users.can_access_bom is
  'Per-user feature flag: can access the BOM (Bill of Materials) module. Default false until explicit grant. Added in Phase 2-A.';

comment on column public.users.can_access_inspection is
  'Per-user feature flag: can access the Inspection module. Default true (existing SCS behavior preserved). Added in Phase 2-A.';

-- 2. Helper function used by upcoming Phase 2-B BOM RLS policies

create or replace function public.current_user_can_access_bom()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(can_access_bom, false)
  from public.users
  where id = public.current_user_id()
$$;

grant execute on function public.current_user_can_access_bom() to authenticated;

comment on function public.current_user_can_access_bom is
  'Returns whether the current user has BOM module access. Used in BOM RLS policies (Phase 2-B). Built on public.current_user_id() to handle the auth.uid() vs public.users.id mapping correctly.';
