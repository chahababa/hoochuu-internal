-- BOM Phase 5 cron preview only.
-- Do not run this SQL in production until Matt approves the approval gates in docs/BOM_PHASE_5_READINESS.md.
-- This file is intentionally commented out so the scaffold PR has no runtime effect.

-- bom_auto_lock_previous_month: 每月 5 號 03:00 Asia/Taipei 自動鎖上月
-- Requires: pg_cron
-- Approval: Matt 確認月結鎖頻率、時區、解鎖流程與失敗通知方式後才可 schedule。
-- SELECT cron.schedule('bom_auto_lock_previous_month', '0 19 4 * *', $$SELECT bom.fn_auto_lock_previous_month();$$);

-- bom_query_audit_purge_daily: 每日 02:00 Asia/Taipei 清除超過 365 天 BOM query audit log
-- Requires: pg_cron
-- Approval: Matt 確認 audit log 保留天數與可刪除政策後才可 schedule。
-- SELECT cron.schedule('bom_query_audit_purge_daily', '0 18 * * *', $$SELECT bom.fn_purge_query_audit_old();$$);

-- bom_backup_daily_r2: 每日 03:30 Asia/Taipei 觸發 R2 備份
-- Requires: pg_cron, vault, edge_function
-- Approval: Matt 確認 R2 bucket、保留策略、Vault secret 與 restore 測試後才可 schedule。
-- SELECT cron.schedule('bom_backup_daily_r2', '30 19 * * *', $$SELECT bom.fn_trigger_backup('r2', 'cron');$$);

-- bom_backup_monthly_gdrive: 每月 2 號 04:00 Asia/Taipei 觸發 Google Drive 月備份
-- Requires: pg_cron, vault, edge_function
-- Approval: Matt 確認 Google Drive 目的地、憑證 owner、保留月數與 restore 測試後才可 schedule。
-- SELECT cron.schedule('bom_backup_monthly_gdrive', '0 20 1 * *', $$SELECT bom.fn_trigger_backup('gdrive', 'cron');$$);

-- bom_backup_purge_daily: 每日 12:00 Asia/Taipei 清理過期備份
-- Requires: pg_cron, vault, edge_function
-- Approval: Matt 確認備份保留策略與可刪除範圍後才可 schedule。
-- SELECT cron.schedule('bom_backup_purge_daily', '0 4 * * *', $$SELECT bom.fn_call_backup_purge();$$);
