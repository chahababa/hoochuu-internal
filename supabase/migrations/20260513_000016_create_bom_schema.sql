-- 20260513_000016_create_bom_schema.sql
-- 建立 bom schema 作為 BOM 系統合併的容器（hoochuu-internal merge, Phase 0）。
-- 對應 plan: hoochuu-internal-docs/merge-plan-curried-brewing-fog.md §B Phase 0 步驟 6-7。
--
-- 注意：本 migration 只建空 schema 並 grant usage。
-- BOM 系統的 17 張表 + pg_cron + Edge Function 會在 Phase 1-3 陸續 port 過來。
--
-- 部署 TODO（要在合 main + Zeabur redeploy 前手動做）：
--   去 Supabase Dashboard → Project Settings → API → Exposed schemas，加上 `bom`。
--   SCS 沒有 supabase/config.toml，PostgREST 暴露的 schema 是 Dashboard 設定的。

create schema if not exists bom;

grant usage on schema bom to anon, authenticated, service_role;

comment on schema bom is
  'BOM cost management system tables; ported from chahababa/Hoochuu-Bom-System during hoochuu-internal merge.';
