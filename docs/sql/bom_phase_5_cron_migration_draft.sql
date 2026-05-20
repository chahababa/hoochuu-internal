-- BOM Phase 5 cron migration draft / review package.
-- Safe artifact status: this file is NOT in supabase/migrations and has no runtime effect.
-- Do not copy, uncomment, or run in production until Matt explicitly approves the gates in docs/BOM_PHASE_5_READINESS.md.
--
-- Why this remains under docs/sql for review:
-- 1. Scheduling pg_cron jobs is a production runtime side effect.
-- 2. Some jobs call Phase 5 Edge Function / Vault stubs that are not deployed or secret-backed yet.
-- 3. The project boundary for this PR is branch + PR only: no production DB write, no db push, no secret/env change.
--
-- Approval gates before this can become an executable Supabase migration:
-- - Matt confirms which bom_* jobs to enable, project ref, Zeabur app, schedules, timezone, recipients, and rollback owner.
-- - pg_cron is available in the target project and the operator has permission to schedule / unschedule jobs.
-- - Vault / Edge Function / Resend dependencies are deployed and verified in non-production or approved manual smoke tests.
-- - Rollback path is rehearsed: unschedule all bom_* jobs and verify cron.job has no active matching rows.

-- ============================================================
-- Preflight inspection: names-only, read-only
-- ============================================================

-- SELECT jobid, jobname, schedule, active
-- FROM cron.job
-- WHERE jobname LIKE 'bom_%'
-- ORDER BY jobname;

-- ============================================================
-- Idempotent enablement draft
-- ============================================================
-- Pattern: unschedule existing job by fixed name first, then schedule exactly one replacement.
-- This makes reruns converge to one active job per bom_* name instead of creating duplicates.

-- SELECT cron.unschedule(jobid)
-- FROM cron.job
-- WHERE jobname = 'bom_auto_lock_previous_month';
-- SELECT cron.schedule(
--   'bom_auto_lock_previous_month',
--   '0 19 4 * *',
--   $$SELECT bom.fn_auto_lock_previous_month();$$
-- );

-- SELECT cron.unschedule(jobid)
-- FROM cron.job
-- WHERE jobname = 'bom_query_audit_purge_daily';
-- SELECT cron.schedule(
--   'bom_query_audit_purge_daily',
--   '0 18 * * *',
--   $$SELECT bom.fn_purge_query_audit_old();$$
-- );

-- SELECT cron.unschedule(jobid)
-- FROM cron.job
-- WHERE jobname = 'bom_backup_daily_r2';
-- SELECT cron.schedule(
--   'bom_backup_daily_r2',
--   '30 19 * * *',
--   $$SELECT bom.fn_trigger_backup('r2', 'cron');$$
-- );

-- SELECT cron.unschedule(jobid)
-- FROM cron.job
-- WHERE jobname = 'bom_backup_monthly_gdrive';
-- SELECT cron.schedule(
--   'bom_backup_monthly_gdrive',
--   '0 20 1 * *',
--   $$SELECT bom.fn_trigger_backup('gdrive', 'cron');$$
-- );

-- SELECT cron.unschedule(jobid)
-- FROM cron.job
-- WHERE jobname = 'bom_backup_purge_daily';
-- SELECT cron.schedule(
--   'bom_backup_purge_daily',
--   '0 4 * * *',
--   $$SELECT bom.fn_call_backup_purge();$$
-- );

-- ============================================================
-- Post-apply verification draft
-- ============================================================

-- SELECT jobid, jobname, schedule, active
-- FROM cron.job
-- WHERE jobname LIKE 'bom_%'
-- ORDER BY jobname;

-- Expected schedules:
-- - bom_auto_lock_previous_month: 0 19 4 * *      -- 每月 5 號 03:00 Asia/Taipei
-- - bom_query_audit_purge_daily: 0 18 * * *       -- 每日 02:00 Asia/Taipei
-- - bom_backup_daily_r2: 30 19 * * *              -- 每日 03:30 Asia/Taipei
-- - bom_backup_monthly_gdrive: 0 20 1 * *         -- 每月 2 號 04:00 Asia/Taipei
-- - bom_backup_purge_daily: 0 4 * * *             -- 每日 12:00 Asia/Taipei

-- ============================================================
-- Rollback / disable draft
-- ============================================================
-- Safe rollback direction after Matt approval: unschedule all BOM cron jobs by namespace.

-- SELECT cron.unschedule(jobid)
-- FROM cron.job
-- WHERE jobname LIKE 'bom_%';

-- SELECT jobid, jobname, schedule, active
-- FROM cron.job
-- WHERE jobname LIKE 'bom_%'
-- ORDER BY jobname;
