# BOM Phase 5 Infra Readiness

最後更新：2026-05-20

本文件是 Phase 5「BOM 後勤 port」的非破壞性 readiness checklist。目標是讓 Matt / maintainer 在實際啟用 pg_cron、Vault、Edge Functions、Resend 前，可以先確認 scope、風險、驗證與回滾路徑。

## 安全邊界

- 本文件不代表已啟用 Phase 5 infra。
- 不要在未經 Matt 明確確認前執行 production `supabase db push`、SQL update、Vault secret write、pg_cron schedule、Edge Function deploy 或 Zeabur env 變更。
- 任何 migration 只能先以 idempotent PR 形式提出；合併與套用 production 前要有人工 approval gate。
- 不要在 issue、PR、log、截圖或文件中貼出 secret 值。文件只列 env var 名稱與用途。

## 目前前提狀態

已在 main 完成：

- Phase 1：`public.notifications` 與 unified notification UI。
- Phase 2：`bom` schema、RLS、functions、storage buckets port。
- Phase 3：BOM lib/types/components/routes port 到 hoochuu-internal。
- Phase 4：AppShell BOM 入口與 owner `can_access_bom=true` access gate。

尚未啟用：

- pg_cron 排程。
- Supabase Vault secret 實際寫入。
- BOM 相關 Edge Functions deploy / schedule。
- BOM 專用 Resend 或 domain 設定。

## Approval gate

Phase 5 實作 PR 在 merge / deploy / apply 前，請逐項確認：

1. Matt 已確認要啟用的 production project ref 與 Zeabur app。
2. Matt 已確認寄信 domain、from address、收件規則與測試收件人。
3. Matt 已確認 pg_cron 頻率、時區、重試策略與失敗通知方式。
4. Matt 已確認 Vault secret 名稱與 owner，不在 git 中保存值。
5. 已先在 staging / preview 或本機 mock 驗證 Edge Function 行為。
6. 已有 rollback plan，且能辨識哪些步驟可立即回復、哪些只可停用。

## Env vars / secrets names only

不要在 repo 中填值。以下只列名稱與用途：

| 名稱 | 放置位置 | 用途 | 備註 |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Zeabur env / Supabase secrets（視執行端而定） | 寄送 email | 既有巡檢完成通知也會用 |
| `RESEND_FROM_EMAIL` | Zeabur env / Supabase secrets | 寄件人地址 | 需確認 domain 驗證完成 |
| `NEXT_PUBLIC_SITE_URL` | Zeabur env | email 內部連結 base URL | 不含 secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function secret | server-side privileged operation | 絕不可輸出到 log / PR |
| `BOM_BACKUP_BUCKET` | Zeabur env / Edge Function secret | BOM backup bucket 名稱 | 預期對應 `bom-backups-staging` 或正式 bucket |
| `BOM_IMPORT_BUCKET` | Zeabur env / Edge Function secret | BOM import bucket 名稱 | 預期對應 `bom-imports` |
| `BOM_NOTIFICATION_RECIPIENTS` | Zeabur env / Edge Function secret | Phase 5 通知收件人清單 | 可先使用測試信箱 |

## pg_cron readiness checklist

啟用前：

- 確認 extension 狀態與權限，但不要在未 approval 前建立 schedule。
- 排程 SQL 必須 idempotent：重跑不應建立重複 job。
- job name 使用固定 namespace，例如 `bom_*`，方便查詢與停用。
- 每個 job 必須有明確 owner、頻率、時區（Asia/Taipei）與最大執行時間預期。
- cron job 的 side effect 要能在 log / audit table 中追蹤。

建議驗證（先在非 production）：

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname like 'bom_%'
order by jobname;
```

Rollback / disable 方向：

```sql
select cron.unschedule(jobid)
from cron.job
where jobname like 'bom_%';
```

以上 SQL 僅為操作方向；production 執行前仍需 Matt approval。

## Vault readiness checklist

啟用前：

- 只存 secret 值，不在 migration、seed、fixture 或測試 snapshot 中保存 secret。
- Secret name 必須穩定、可讀、可輪替，例如 `bom_resend_api_key`。
- Edge Function / SQL function 讀取 Vault 的失敗情境要有安全 fallback，不可默默成功。
- 確認 log 不會印出 secret 值。

驗證方向：

- 確認 secret key 存在（只驗 name / metadata，不讀值）。
- 用測試 secret 在非 production 驗證 function 是否能讀取。
- 輪替測試：替換測試 secret 後，確認新值生效且舊值失效。

Rollback 方向：

- 停用依賴 secret 的 cron / function。
- 輪替或刪除受影響 secret。
- 保留 audit log，避免在 incident review 中洩漏值。

## Edge Functions readiness checklist

啟用前：

- Function 名稱、route、trigger 來源與權限要在 PR body 明列。
- 所有 function 都要有 dry-run 或 mockable test path。
- 失敗時要回傳可觀測 error code，但不可包含 secret 或個資。
- function deploy 是 production side effect；PR 不應自動 deploy。

建議驗證：

- 本機或 preview：以 mock env 跑 unit / integration test。
- Supabase CLI：只在非 production project deploy smoke test。
- production 前：先以單次 manual invocation 驗證，再開排程。

Rollback 方向：

- 先 unschedule pg_cron job 或移除 trigger。
- 再回退 function deploy / redeploy 前一版。
- 如涉及寄信，暫停 Resend key 或收件人清單。

## Resend readiness checklist

啟用前：

- Domain verification、DKIM / SPF / DMARC 狀態由 Matt 確認。
- `RESEND_FROM_EMAIL` 必須與 verified domain 相符。
- 測試收件人先使用 Matt 指定名單，不直接寄全員。
- email template 不含敏感資料；連結必須回到 production site 並走 auth gate。

驗證：

- 缺 env 時 function 應安全跳過或回傳 `config_missing`。
- 測試寄送只寄到 allowlist。
- Resend dashboard 可看到 delivery / bounce / complaint 狀態。

Rollback：

- 移除或停用 `RESEND_API_KEY`。
- 停用觸發寄信的 cron / function。
- 如出現誤寄，保留 delivery log 供事後追蹤。

## 建議 Phase 5 PR 切法

1. `docs/phase-5-readiness`：本文件與 handoff 更新（無 runtime 風險）。
2. `feat/bom-infra-scaffold`：code-only Edge Function / SQL scaffold + tests，不 deploy、不 apply。scaffold 合約見 [`docs/BOM_PHASE_5_SCAFFOLD.md`](BOM_PHASE_5_SCAFFOLD.md)，cron preview 見 [`docs/sql/bom_phase_5_cron_preview.sql`](sql/bom_phase_5_cron_preview.sql)。
3. `feat/bom-cron-migration`：idempotent migration review package；先放在 `docs/sql/bom_phase_5_cron_migration_draft.sql` 而非 `supabase/migrations`，避免 merge 後誤套用 production cron。Matt approval 後再轉成可執行 migration / ops runbook。
4. `ops/enable-bom-infra`：Matt approval 後才進行實際啟用，並記錄每一步驗證與 rollback。

## PR body 必填聲明

Phase 5 相關 PR 請明確寫：

- 本 PR 是否包含 migration；若有，是否 idempotent。
- 本 PR 是否 deploy Edge Function；預設應為「否」。
- 本 PR 是否修改 secrets / env；預設應為「否」。
- 本 PR 是否對 production DB 做任何操作；預設應為「否」。
- 驗證命令與結果。
- Matt 必須確認的事項。
