-- 20260514000021_grant_bom_access_to_owners.sql
--
-- Phase 3+4e: 把現有 owner 帳號的 can_access_bom 設為 true，
-- 讓他們在 AppShell 看到 BOM 模組入口點。
--
-- 參照：https://github.com/chahababa/hoochuu-internal-docs/blob/main/merge-plan-curried-brewing-fog.md §B Phase 4 step 7
--
-- 影響：
--   - 所有 role='owner' 的 active user 自動拿到 can_access_bom=true
--   - manager / leader 依然 can_access_bom=false（需另案 grant）
--   - 既有 can_access_inspection=true 不變（巡店繼續運作）
--
-- 為什麼安全：
--   - WHERE clause 限定 role='owner'，不影響其他角色
--   - BOM module 上線 day 1 owner 可立刻看到入口、開始驗證
--   - 若需回滾：UPDATE public.users SET can_access_bom = false WHERE role = 'owner';

UPDATE public.users
SET can_access_bom = true
WHERE role = 'owner'
  AND is_active = true
  AND can_access_bom IS DISTINCT FROM true;
