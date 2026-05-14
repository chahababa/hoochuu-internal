-- system-schema-audit.sql
--
-- 系統整合測試 Layer 1：Schema 完整性 audit
-- 驗證 2026-05-14 合併計畫所有 phase 上 prod 的物件都還在、設定正確。
--
-- 套用方式：在 Supabase Dashboard SQL Editor 跑這支 query，比對結果 JSON
-- 跟預期表（最後一段註解）。
--
-- 目標 project: stores-checking-system (ref owogsszmolouoqsgmwik)

SELECT jsonb_build_object(

  -- =====================================================================
  -- Phase 1-A: 通知中心 DB 骨幹
  -- =====================================================================
  'phase_1a_notifications', jsonb_build_object(
    'table_exists', (
      SELECT count(*)::int = 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'notifications'
    ),
    'column_count', (
      SELECT count(*)::int
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications'
    ),
    'rls_enabled', (
      SELECT relrowsecurity
      FROM pg_class WHERE oid = 'public.notifications'::regclass
    ),
    'policies', (
      SELECT jsonb_agg(polname ORDER BY polname)
      FROM pg_policy
      WHERE polrelid = 'public.notifications'::regclass
    ),
    'fn_notify_exists', (
      SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'fn_notify' AND pronargs = 8)
    ),
    'fn_notify_role_exists', (
      SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'fn_notify_role' AND pronargs = 9)
    ),
    'improvement_tasks_trigger', (
      SELECT EXISTS(
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_improvement_tasks_notify_leaders'
          AND NOT tgisinternal
      )
    )
  ),

  -- =====================================================================
  -- Phase 2-A: users 模組權限欄位
  -- =====================================================================
  'phase_2a_users_flags', jsonb_build_object(
    'new_columns', (
      SELECT jsonb_object_agg(column_name, jsonb_build_object('type', data_type, 'default', column_default))
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
        AND column_name IN ('auth_method', 'display_name', 'can_access_bom', 'can_access_inspection')
    ),
    'can_access_bom_helper', (
      SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'current_user_can_access_bom')
    )
  ),

  -- =====================================================================
  -- Phase 2-B: BOM schema port (19 tables / 5 enums / 25 functions / 20 triggers / 42 RLS)
  -- =====================================================================
  'phase_2b_bom_schema', jsonb_build_object(
    'tables_count', (
      SELECT count(*)::int FROM information_schema.tables
      WHERE table_schema = 'bom' AND table_type = 'BASE TABLE'
    ),
    'tables_list', (
      SELECT jsonb_agg(table_name ORDER BY table_name)
      FROM information_schema.tables
      WHERE table_schema = 'bom' AND table_type = 'BASE TABLE'
    ),
    'enums_count', (
      SELECT count(*)::int FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'bom' AND t.typtype = 'e'
    ),
    'enums_list', (
      SELECT jsonb_agg(typname ORDER BY typname)
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'bom' AND t.typtype = 'e'
    ),
    'functions_count', (
      SELECT count(*)::int FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'bom'
    ),
    'triggers_count', (
      SELECT count(*)::int FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'bom' AND NOT t.tgisinternal
    ),
    'policies_count', (
      SELECT count(*)::int FROM pg_policies WHERE schemaname = 'bom'
    ),
    'policies_with_can_access_bom', (
      SELECT count(*)::int FROM pg_policies
      WHERE schemaname = 'bom'
        AND (qual LIKE '%current_user_can_access_bom%' OR with_check LIKE '%current_user_can_access_bom%')
    ),
    'pg_trgm_enabled', (
      SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm')
    ),
    'fk_to_public_stores_count', (
      SELECT count(*)::int FROM information_schema.constraint_column_usage ccu
      JOIN information_schema.table_constraints tc ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'bom'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'stores'
    )
  ),

  -- =====================================================================
  -- Phase 2-C: BOM storage buckets
  -- =====================================================================
  'phase_2c_buckets', jsonb_build_object(
    'bom_imports', (
      SELECT jsonb_build_object('exists', count(*) > 0, 'public', max(public::int), 'size_mb', max(file_size_limit / 1048576))
      FROM storage.buckets WHERE id = 'bom-imports'
    ),
    'bom_backups_staging', (
      SELECT jsonb_build_object('exists', count(*) > 0, 'public', max(public::int), 'size_mb', max(file_size_limit / 1048576))
      FROM storage.buckets WHERE id = 'bom-backups-staging'
    ),
    'bom_imports_policy_count', (
      SELECT count(*)::int FROM pg_policy
      WHERE polrelid = 'storage.objects'::regclass
        AND polname LIKE 'bom_imports_%'
    ),
    'inspection_photos_untouched', (
      SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'inspection-photos')
    )
  ),

  -- =====================================================================
  -- Phase 3+4e: owner grant + can_access_bom helper
  -- =====================================================================
  'phase_3_4e_grants', jsonb_build_object(
    'owners_with_bom_access', (
      SELECT count(*)::int FROM public.users
      WHERE role = 'owner' AND is_active = true AND can_access_bom = true
    ),
    'owners_without_bom_access', (
      SELECT count(*)::int FROM public.users
      WHERE role = 'owner' AND is_active = true AND can_access_bom = false
    ),
    'non_owners_with_bom_access', (
      SELECT count(*)::int FROM public.users
      WHERE role IN ('manager', 'leader') AND can_access_bom = true
    )
  ),

  -- =====================================================================
  -- Migration tracking 完整性
  -- =====================================================================
  'migration_tracking', jsonb_build_object(
    'total_count', (SELECT count(*)::int FROM supabase_migrations.schema_migrations),
    'last_5_versions', (
      SELECT jsonb_agg(version ORDER BY version DESC)
      FROM (
        SELECT version FROM supabase_migrations.schema_migrations
        ORDER BY version DESC LIMIT 5
      ) t
    )
  )

) AS system_audit;

-- =====================================================================
-- 預期結果（2026-05-14 末態）
-- =====================================================================
-- phase_1a_notifications:
--   table_exists: true, column_count: 12
--   rls_enabled: true, policies: [notifications_select_own, notifications_update_own]
--   fn_notify_exists / fn_notify_role_exists: true
--   improvement_tasks_trigger: true
--
-- phase_2a_users_flags:
--   new_columns: 4 個（auth_method/display_name/can_access_bom/can_access_inspection）
--   can_access_bom_helper: true
--
-- phase_2b_bom_schema:
--   tables_count: 19, enums_count: 5, functions_count: 25
--   triggers_count: 20, policies_count: 42, policies_with_can_access_bom: 41
--   pg_trgm_enabled: true
--   fk_to_public_stores_count: 3 (purchase_records / cost_snapshots / alerts)
--
-- phase_2c_buckets:
--   bom_imports: exists=true, public=0, size_mb=10
--   bom_backups_staging: exists=true, public=0, size_mb=500
--   bom_imports_policy_count: 4
--   inspection_photos_untouched: true
--
-- phase_3_4e_grants:
--   owners_with_bom_access: 1（chahababa@gmail.com）
--   owners_without_bom_access: 0
--   non_owners_with_bom_access: 0
--
-- migration_tracking:
--   total_count: 21（16 原始 + 5 新增 = 17/18/19/20/21）
--   last_5_versions: [20260514000021, 20260514000020, 20260514000019, 20260514000018, 20260514000017]
