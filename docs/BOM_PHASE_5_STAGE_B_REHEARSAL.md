# BOM Phase 5 Stage B Non-production Rehearsal

最後更新：2026-05-21

本文件是 Stage B「non-production / mock rehearsal」作業指南。目標是在不碰 production data、secret、deploy、cron schedule 的前提下，把 Stage A preflight 發現的缺口先轉成可演練、可 review、可 rollback 的清單。

相關文件：

- [`docs/BOM_PHASE_5_PRODUCTION_PREFLIGHT.md`](BOM_PHASE_5_PRODUCTION_PREFLIGHT.md)：Stage A read-only preflight。
- [`docs/BOM_PHASE_5_PRODUCTION_ENABLEMENT_RUNBOOK.md`](BOM_PHASE_5_PRODUCTION_ENABLEMENT_RUNBOOK.md)：Phase 5 production enablement runbook。
- [`docs/BOM_PHASE_5_SCAFFOLD.md`](BOM_PHASE_5_SCAFFOLD.md)：Phase 5 code-only scaffold / cron draft registry。
- [`docs/sql/bom_phase_5_cron_migration_draft.sql`](sql/bom_phase_5_cron_migration_draft.sql)：review-only cron migration draft；不可直接套到 production。

## 0. 安全邊界

Stage B 允許：

- 在 local / preview / staging / mock 環境做 names-only、read-only、dry-run 或 mock output 驗證。
- 檢查 repo 內 `.env.example` 是否列出需要的 key name。
- 檢查 Edge Function 檔案或 CLI list output；不 deploy、不 invoke production side effect。
- 檢查 cron SQL draft 內容；不呼叫 `cron.schedule` / `cron.unschedule`。
- 人工在 Dashboard 確認 Resend / Zeabur / Supabase 設定「名稱存在與否」；不 reveal value、不修改。

Stage B 禁止：

- 不執行 production DB write、`supabase db push`、migration apply。
- 不建立、修改、停用 production pg_cron schedule。
- 不寫入、刪除、輪替 Supabase Vault / Zeabur env / Resend API key。
- 不 deploy Edge Functions，不 restart / redeploy Zeabur service。
- 不寄送 real email，不把 secret value 複製到 terminal、PR、Notion 或文件。

## 1. Stage A gaps → Stage B rehearsal map

| Stage A gap | Stage B rehearsal / verification | Safe output |
| --- | --- | --- |
| `pg_cron` / `pg_net` / `cron.job` 可能不存在或 production 不可查 | 用 local/mock SQL 檔檢查 draft 是否只在 `docs/sql/`；若有 non-production DB，先用 read-only SQL 查 extension/table 存在，不 schedule | pass/fail + missing reason，不執行 `cron.schedule` |
| Edge Functions 尚未 deployed | 檢查 `supabase/functions/*` 是否存在；如使用 CLI，只允許 `supabase functions list` 對 non-production project | function names-only + deployed/missing，不 deploy |
| Zeabur login/readiness gap | 只跑 `zeabur auth whoami` / `zeabur project list`；若未登入，記錄 blocker，請 Matt 在可控 host 登入 | account/project names-only，不改 env、不 redeploy |
| Resend dashboard/manual confirmation | Dashboard 人工確認 domain、sender、delivery monitor、測試收件人 allowlist；不可寄信 | names-only checklist，不 reveal API key |
| `.env.example` 缺少 BOM buckets / recipients | 更新 `.env.example` key names only；用 script 確認 key name 存在 | required keys present/missing，不讀實際 `.env.local` value |

## 2. Non-production rehearsal commands

### 2.1 Repo / docs / env names-only local rehearsal

這個 script 只讀 repo 內檔案與 env 檔 key name，不連 Supabase / Zeabur / Resend，不印出 value。

```bash
npm run bom:stage-b:rehearsal
```

預期輸出：

- `.env.example` 是否包含 Phase 5 required key names。
- docs / SQL draft 是否存在。
- 若本機 `.env` / `.env.local` 有對應 key，只顯示 `present` / `missing`，不顯示值。
- 列出下一步 manual checklist。

### 2.2 pg_cron / pg_net / cron.job read-only SQL（僅 non-production）

只在 Matt 指定的 non-production DB 或 local throwaway DB 執行。不要在 production 執行；不要把查詢結果中的敏感資訊貼到 PR。

```sql
-- read-only：extension presence
select extname, extversion
from pg_extension
where extname in ('pg_cron', 'pg_net')
order by extname;

-- read-only：cron schema/table presence
select table_schema, table_name
from information_schema.tables
where table_schema = 'cron'
  and table_name = 'job';

-- read-only：BOM job names-only；若 cron.job 不存在，此查詢會失敗，記錄為 gap 即可
select jobname, schedule, active
from cron.job
where jobname like 'bom_%'
order by jobname;
```

Rollback / no-op note：上述 SQL 全部是 `select`，不應產生 side effect。若看到 `cron.schedule`、`cron.unschedule`、`create extension`、`drop extension`，立即停止。

### 2.3 Edge Functions non-production readiness

```bash
# 只在 non-production linked project 或明確指定 ref 時使用；不要 deploy
supabase functions list

# repo-only：確認 function source 是否存在，不連線
find supabase/functions -maxdepth 2 -type f | sort
```

核對：

- `bom-backup` / `bom-notify` 類 function 若尚未存在，記錄為 Stage C/D blocker。
- 不執行 `supabase functions deploy`。
- 不執行會寄信、寫 DB、備份、呼叫外部服務的 invoke。

### 2.4 Zeabur read-only readiness

```bash
# read-only：不會修改 env / service / deployment
zeabur auth whoami
zeabur project list
```

若 CLI 顯示未登入，Stage B 結論是 `blocked: Zeabur CLI login required`。Matt 需在可控主機登入；登入完成後仍只允許 read-only list，不代表 deploy approval。

### 2.5 Resend manual names-only checklist

Dashboard 人工核對，不使用 API key，不寄信：

- [ ] Domain verification status 已確認。
- [ ] DKIM / SPF / DMARC status 已確認。
- [ ] `RESEND_FROM_EMAIL` domain 與 verified domain 相符。
- [ ] 測試收件人 allowlist 由 Matt 指定。
- [ ] Delivery / bounce / complaint 監控頁面位置已確認。
- [ ] 沒有建立、rotate、reveal API key。
- [ ] 沒有送 test email。

## 3. Rehearsal handoff template

```md
## BOM Phase 5 Stage B non-production rehearsal handoff

- Date / operator:
- Environment: local / preview / staging / mock only
- Repo baseline:
- `.env.example` names-only status:
- pg_cron / pg_net / cron.job rehearsal:
- Edge Functions readiness:
- Zeabur readiness:
- Resend manual readiness:
- Commands run:
- Side effects performed: none
- Risks / blockers:
- Matt decisions needed before Stage C/D:
```

## 4. Readiness verdict rule

Stage B 只能輸出 readiness verdict，不能視為 production approval。

- `Ready for Stage C plan freeze`：所有 names-only / mock / non-production rehearsal 都通過，且 blocker 只剩 Matt approval。
- `Blocked`：缺 CLI login、缺 non-production target、缺 function source、缺 env key name、缺 dashboard manual confirmation。
- `No-Go`：任何檢查發現可能需要 production write/deploy/secret/env/send 才能完成，或安全邊界不清楚。

無論 verdict 為何，後續 merge、deploy、secret/env、production SQL、cron schedule、real email 都需要 Matt 另行明確確認。
