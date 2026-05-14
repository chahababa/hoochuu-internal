-- restore-migration-tracking.sql
--
-- 目的：補登 SCS production 16 支既存 migration 到 supabase_migrations.schema_migrations。
--
-- 背景：早期 schema 是用 Supabase Dashboard SQL Editor 直接跑 SQL 建出來的，沒走
-- `supabase db push` 流程，因此 tracking 表完全空白。CLI 認為這些 migration 都
-- 「未套用」，直接 `db push` 會撞 `table already exists`，擋住 Phase 1 開工。
--
-- 安全性：
--   - `ON CONFLICT (version) DO NOTHING` — 已存在的 version 不會被覆蓋、重跑無害
--   - 只動 supabase_migrations schema 的 metadata 表，不動實際資料表
--   - statements 欄位寫 empty array（原始 SQL 不在 tracking、不影響功能）
--
-- 套用方式：在 Supabase Dashboard → SQL Editor 貼上整段執行
-- 套用對象：stores-checking-system project (ref `owogsszmolouoqsgmwik`)
--
-- 驗證：跑完應該看到 16 筆 tracking 紀錄，依時序排列。

-- Step 1（可選）：先看 tracking 表 schema，確認 column 存在
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'supabase_migrations'
  AND table_name = 'schema_migrations'
ORDER BY ordinal_position;

-- Step 2：補登 16 筆 tracking 紀錄
INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES
  ('20260408000001', 'mvp_schema',                              ARRAY[]::text[]),
  ('20260408000002', 'inspections',                             ARRAY[]::text[]),
  ('20260408000003', 'inspection_photos',                       ARRAY[]::text[]),
  ('20260408000004', 'audit_logs',                              ARRAY[]::text[]),
  ('20260410000005', 'localize_seed_content',                   ARRAY[]::text[]),
  ('20260410000006', 'fix_store_names',                         ARRAY[]::text[]),
  ('20260411000007', 'expand_focus_items_to_tags',              ARRAY[]::text[]),
  ('20260411000008', 'workstations_and_shift_assignment',       ARRAY[]::text[]),
  ('20260412000009', 'menu_item_photos',                        ARRAY[]::text[]),
  ('20260423000010', 'add_menu_observation_note',               ARRAY[]::text[]),
  ('20260504000011', 'improvement_task_notion_sync',            ARRAY[]::text[]),
  ('20260504000012', 'release_announcements',                   ARRAY[]::text[]),
  ('20260504000013', 'release_announcement_sources',            ARRAY[]::text[]),
  ('20260505000014', 'improvement_task_resolution',             ARRAY[]::text[]),
  ('20260505000015', 'normalize_inspection_item_store_names',   ARRAY[]::text[]),
  ('20260513000016', 'create_bom_schema',                       ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;

-- Step 3：驗證
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
