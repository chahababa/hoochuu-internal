# BOM Phase 5 code-only scaffold

最後更新：2026-05-20

本文件補充 `docs/BOM_PHASE_5_READINESS.md`，記錄本 PR 新增的低風險 scaffold。此 PR 不啟用 production infra，只提供可 review、可測試的合約與草稿。

## 本 PR 安全邊界

- 不 deploy Supabase Edge Functions。
- 不執行 `supabase db push` 或任何 production SQL。
- 不建立 pg_cron schedule。
- 不寫入 Vault secret。
- 不修改 Zeabur env / Supabase secrets。
- 不擴權 manager / leader 的 BOM access。

## 新增 scaffold

- `src/lib/bom/infra-scaffold.ts`
  - Phase 5 env var names-only contract。
  - `bom_*` pg_cron job draft registry。
  - non-throwing env validation helper。
  - commented cron SQL preview generator。
  - safety assertion：job name 必須 `bom_` prefix、不能重複、必須有 Matt approval gate。
- `src/lib/bom-infra-scaffold.test.ts`
  - 驗證 missing config 只回傳 `config_missing`，不丟 secret、不 throw。
  - 驗證所有 cron job 都有 `bom_` namespace 與 Matt gate。
  - 驗證 cron SQL preview 只輸出註解，不會產生可直接執行的 `SELECT cron.schedule`。
- `docs/sql/bom_phase_5_cron_preview.sql`
  - 只供 review 的 commented SQL preview。
  - 未經 Matt approval 前不得取消註解或在 production 執行。
- `docs/sql/bom_phase_5_cron_migration_draft.sql`
  - review-only idempotent cron migration draft，不放進 `supabase/migrations`，避免 merge 後被 `supabase db push` 誤套用。
  - 每個 `bom_*` job 先按固定 job name `cron.unschedule`，再 `cron.schedule`，重跑會收斂成一個 active job。
  - 內含 namespace rollback：`WHERE jobname LIKE 'bom_%'` 的 unschedule / verification 草稿。

## Draft job registry

| Job | UTC schedule | Taipei 說明 | 主要 gate |
| --- | --- | --- | --- |
| `bom_auto_lock_previous_month` | `0 19 4 * *` | 每月 5 號 03:00 自動鎖上月 | 月結頻率、時區、解鎖流程、失敗通知 |
| `bom_query_audit_purge_daily` | `0 18 * * *` | 每日 02:00 清舊 audit log | audit 保留天數與可刪除政策 |
| `bom_backup_daily_r2` | `30 19 * * *` | 每日 03:30 R2 備份 | R2 bucket、Vault secret、restore test |
| `bom_backup_monthly_gdrive` | `0 20 1 * *` | 每月 2 號 04:00 Google Drive 備份 | Drive 目的地、憑證 owner、保留月數 |
| `bom_backup_purge_daily` | `0 4 * * *` | 每日 12:00 清理過期備份 | 備份保留策略與可刪除範圍 |

## 後續啟用前還需要 Matt 明確確認

1. 要啟用哪些 jobs；可以只啟用月結、不啟用備份。
2. Supabase project ref / Zeabur app 是否為 production，以及是否先跑 staging / preview。
3. Resend domain、from address、測試收件人與正式收件規則。
4. Vault secret 名稱與 owner；secret 值不得進 git / PR / log。
5. Rollback：如何 unschedule、停用 Edge Function dispatch、停用 Resend key、保留 audit log。
