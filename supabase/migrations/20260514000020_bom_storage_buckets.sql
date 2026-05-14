-- 20260514000020_bom_storage_buckets.sql
--
-- Phase 2-C: BOM storage buckets（hoochuu-internal merge）
--
-- 參照：https://github.com/chahababa/hoochuu-internal-docs/blob/main/merge-plan-curried-brewing-fog.md §A.1, §B Phase 2
--
-- 內容：
--   1. bom-imports bucket：私有，owner/manager + can_access_bom 才能 CRUD（用於 BOM Excel 匯入暫存）
--   2. bom-backups-staging bucket：service_role only（Edge Function 中介用，Phase 5 BOM 三層備份 R2/GDrive）
--
-- 為什麼安全：
--   - 純新增 bucket + storage.objects RLS policies
--   - 既有 inspection-photos bucket 完全不動
--   - 0 員工 can_access_bom=true，所以 bom-imports 上線後沒人能存取
--   - bom-backups-staging 沒有 authenticated user policy，只有 service_role 經 Edge Function 訪問

-- 1. Create buckets (idempotent)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bom-imports',
  'bom-imports',
  false,
  10485760,  -- 10 MB
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  -- .xlsx
        'application/vnd.ms-excel',                                            -- .xls
        'text/csv']                                                            -- .csv
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'bom-backups-staging',
  'bom-backups-staging',
  false,
  524288000  -- 500 MB (full DB dump 暫存)
)
on conflict (id) do nothing;

-- 2. RLS policies on storage.objects scoped to bom-imports

drop policy if exists "bom_imports_select_owner_manager" on storage.objects;
create policy "bom_imports_select_owner_manager"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'bom-imports'
    and public.current_user_role() in ('owner', 'manager')
    and public.current_user_can_access_bom()
  );

drop policy if exists "bom_imports_insert_owner_manager" on storage.objects;
create policy "bom_imports_insert_owner_manager"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'bom-imports'
    and public.current_user_role() in ('owner', 'manager')
    and public.current_user_can_access_bom()
  );

drop policy if exists "bom_imports_update_owner_manager" on storage.objects;
create policy "bom_imports_update_owner_manager"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'bom-imports'
    and public.current_user_role() in ('owner', 'manager')
    and public.current_user_can_access_bom()
  )
  with check (
    bucket_id = 'bom-imports'
    and public.current_user_role() in ('owner', 'manager')
    and public.current_user_can_access_bom()
  );

drop policy if exists "bom_imports_delete_owner_manager" on storage.objects;
create policy "bom_imports_delete_owner_manager"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'bom-imports'
    and public.current_user_role() in ('owner', 'manager')
    and public.current_user_can_access_bom()
  );

-- 3. bom-backups-staging：no authenticated policies
-- 只有 service_role（Edge Functions, supabase admin client）可以存取。
-- Phase 5 BOM Infra 的 Edge Function 啟用後會用 service_role 寫入、上傳到 R2/GDrive 後清理。
