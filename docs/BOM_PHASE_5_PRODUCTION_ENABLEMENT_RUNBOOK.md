# BOM Phase 5 Production Enablement Runbook

最後更新：2026-05-20

本 runbook 是 Phase 5「BOM 後勤 production enablement」的人工作業指南。此文件本身沒有任何 production side effect；它只整理啟用 pg_cron、Vault、Edge Functions、Zeabur env 與 Resend 前後要如何檢查、怎麼分段、何時停下等 Matt approval。

相關文件：

- [`docs/BOM_PHASE_5_READINESS.md`](BOM_PHASE_5_READINESS.md)：Phase 5 readiness / 風險總覽。
- [`docs/BOM_PHASE_5_SCAFFOLD.md`](BOM_PHASE_5_SCAFFOLD.md)：code-only scaffold 與 cron draft registry。
- [`docs/BOM_PHASE_5_PRODUCTION_PREFLIGHT.md`](BOM_PHASE_5_PRODUCTION_PREFLIGHT.md)：production preflight checklist。
- [`docs/sql/bom_phase_5_cron_migration_draft.sql`](sql/bom_phase_5_cron_migration_draft.sql)：review-only cron migration draft；不在 `supabase/migrations`。

## 0. 本文件安全邊界

本文件與配套 checklist 只允許：

- 讀取 repo / GitHub / Supabase / Zeabur / Resend 的狀態。
- 記錄指令、人工核對項目、rollback 方向。
- 建立 PR 讓 Matt review。

本文件不允許、也沒有要求執行：

- production DB write / `supabase db push` / SQL migration apply。
- `cron.schedule` / `cron.unschedule` 等 pg_cron runtime 變更。
- Supabase Vault secret write / delete / rotate。
- Supabase Edge Function deploy / invoke production side effect。
- Zeabur env write / redeploy / service restart。
- Resend real send / domain 設定變更。

上述任何一步都必須在 Matt 明確確認後，另開 ops 執行紀錄逐步操作。

## 1. 建議分段

### Stage A — Read-only preflight（本 PR 允許）

目的：確認 production 現況、風險、缺口與 rollback path，不改任何狀態。

輸出：

- 已填好的 [`docs/BOM_PHASE_5_PRODUCTION_PREFLIGHT.md`](BOM_PHASE_5_PRODUCTION_PREFLIGHT.md) checklist。
- Matt decision list：要啟用哪些 job、從哪個環境先測、誰收測試信、誰持有 secrets。

### Stage B — Non-production rehearsal（需 Matt 指定環境）

目的：在 staging / preview / mock 環境驗證 Edge Function、env fallback、cron SQL 與寄信 allowlist 行為。

禁止：不能把 rehearsal 當 production approval；不能使用 production secrets 值寫入 repo、PR 或 log。

### Stage C — Production enablement plan freeze（需 Matt approval）

目的：把要執行的 production 步驟 freeze 成逐步清單。每一步都要有：

- operator。
- 預期 side effect。
- 驗證方式。
- rollback / disable 方式。
- 停止條件。

### Stage D — Production enablement（另案，不屬於本 PR）

目的：Matt approval 後逐步啟用。每一步之間都要做驗證並留下紀錄。

建議順序：

1. 確認 production project / app / domain。
2. 設定或確認 secrets / env（只在 dashboard 或 CLI 安全通道，不進 git）。
3. Deploy Edge Functions 或確認既有部署版本。
4. 單次 dry-run / allowlist smoke test。
5. 啟用一個低風險 cron job 或只啟用月結 job。
6. 觀察 log / notification / audit table。
7. 再逐步啟用其他 job。

## 2. Go / No-Go gate

開始 Stage D 前，Matt 需要明確回答：

- Production Supabase project ref 是否為 `owogsszmolouoqsgmwik`。
- Zeabur app 是否為 `stores-checking-system` production。
- 要啟用哪些 `bom_*` job；是否先只啟用月結、暫不啟用備份。
- 每個 job 的頻率與時區是否接受目前 draft（UTC schedule 對應 Asia/Taipei）。
- Resend domain / from address / 測試收件人 / 正式收件規則。
- Vault / Zeabur env secret owner 與輪替責任人。
- 是否先做 staging / preview rehearsal。
- rollback owner 與 incident contact。

未全部確認前，結論一律是 No-Go。

## 3. Production enablement 操作草案（需 Matt approval 後才可執行）

以下是順序草案，不是本 PR 要執行的命令。

### 3.1 Edge Functions

- 確認 function names、routes、trigger source 與 runtime env。
- 確認 missing config 時回傳 `config_missing` 或安全跳過。
- 先在 non-production 或 mock env 驗證。
- Production deploy 前停止並取得 Matt 明確 approval。

### 3.2 Secrets / env

- Secret 值不得進 git、PR、Notion、terminal output 或 screenshots。
- 只在 dashboard / CLI 安全通道寫入。
- 寫入後只驗證「名稱存在」或「功能可用」，不可讀回值貼到紀錄。

### 3.3 pg_cron

- 先以 read-only SQL 查詢現況。
- 只啟用 Matt 指定的 `bom_*` jobs。
- 每個 job 先確認 idempotent 行為與 rollback SQL。
- 啟用後立即查詢 `cron.job` 確認沒有 duplicate。

### 3.4 Resend

- 先確認 domain / DKIM / SPF / DMARC。
- 測試寄送只寄 Matt 指定 allowlist。
- 正式收件規則需 Matt 另行確認。
- 出現 bounce / complaint / 誤寄時，先 disable cron / function，再處理 key 或 recipient list。

## 4. 停止條件

任一條件發生即停止，不繼續下一步：

- project ref / app / domain 與 Matt 確認不一致。
- read-only preflight 發現既有 `bom_*` job、未知 Edge Function、未知 secret name 或未知 env 設定。
- CLI / dashboard 顯示要執行的是 write / deploy / restart / send。
- 測試收件人不是 allowlist。
- log 可能輸出 secret 或個資。
- GitHub main / production app 正在部署、CI 失敗或有未合併 hotfix。

## 5. Rollback / disable 優先順序

發生問題時，先停 side effect，再查原因：

1. 停用或 unschedule 相關 `bom_*` cron job。
2. 停用觸發寄信或外部呼叫的 Edge Function path / env。
3. 暫停或輪替 Resend key / recipient list。
4. 保留 audit / delivery / cron log，不貼出 secret 或個資。
5. 開 incident note，記錄時間、operator、影響範圍、rollback 結果。

`cron.unschedule`、secret delete / rotate、env write、function redeploy 都是 production side effect，必須有 Matt approval 或 incident authority 才能執行。

## 6. Handoff template

Stage A preflight 完成後，請用以下格式交接：

```md
## BOM Phase 5 production preflight handoff

- Date / operator:
- GitHub baseline:
- Supabase project checked:
- Zeabur app checked:
- Resend status checked:
- Existing bom_* cron jobs:
- Edge Functions status:
- Secrets/env names-only status:
- Go / No-Go recommendation:
- Matt decisions still needed:
- No-side-effect statement:
  - No DB write
  - No pg_cron schedule / unschedule
  - No Vault secret write
  - No Edge Function deploy
  - No Zeabur env change / redeploy
  - No Resend send
```
