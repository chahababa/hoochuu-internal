# BOM Phase 5 Production Preflight Checklist

最後更新：2026-05-20

本 checklist 供 Stage A read-only preflight 使用。所有命令都必須以「讀取 / 查詢 / names-only」為原則；若任何工具即將寫入、部署、排程、寄信、修改 secret/env，請立即停止並等 Matt 明確 approval。

## 0. Preflight 原則

- [ ] 不執行 production DB write。
- [ ] 不執行 `supabase db push`。
- [ ] 不建立、修改或停用 pg_cron schedule。
- [ ] 不寫入、刪除或輪替 Vault / Supabase secrets。
- [ ] 不 deploy Edge Functions。
- [ ] 不修改 Zeabur env、不重啟服務、不觸發部署。
- [ ] 不進行 Resend real send。
- [ ] 不輸出 secret 值；紀錄只寫 names-only / pass-fail。

## 1. GitHub / repo baseline（read-only）

目的：確認操作基準分支、PR、CI 狀態。

```bash
# read-only：查看目前 repo / branch / clean state
git status --short --branch

git remote -v

git log --oneline -10 --decorate

# read-only：查看未合 PR；不要 merge
gh pr list --state open --limit 20

# read-only：查看 main 最近 workflow；不要 rerun / cancel
gh run list --branch main --limit 10
```

核對：

- [ ] local branch 乾淨，沒有未預期變更。
- [ ] target repo 是 `chahababa/hoochuu-internal`（舊 remote name 可能仍顯示 `Stores-checking-system`，以 GitHub repo rename 後 URL 為準）。
- [ ] 沒有需要先處理的 production hotfix PR。
- [ ] 任何 deploy / merge 都未執行。

## 2. Supabase project baseline（read-only）

目的：確認 project ref 與現況，不套用 migration、不改資料。

```bash
# read-only：列出目前 CLI 可見 projects；不要 link / db push / migration up
supabase projects list

# read-only：只查看本機 migration 檔案與狀態，不推到遠端
git status --short supabase
```

若需要查 production DB，請只使用 read-only SQL；在 Supabase SQL Editor 或受控 psql session 中執行前再次確認連線目標。

```sql
-- read-only：確認 pg_cron extension 是否存在
select extname, extversion
from pg_extension
where extname in ('pg_cron', 'pg_net', 'vault')
order by extname;

-- read-only：確認現有 bom_* cron jobs；不可新增 / unschedule
select jobid, jobname, schedule, active
from cron.job
where jobname like 'bom_%'
order by jobname;

-- read-only：確認 BOM function names；不呼叫會改資料的 function
select n.nspname as schema_name, p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'bom'
  and p.proname in (
    'fn_auto_lock_previous_month',
    'fn_purge_query_audit_old',
    'fn_trigger_backup',
    'fn_call_backup_purge'
  )
order by p.proname;
```

核對：

- [ ] project ref 與 Matt 指定 production ref 一致。
- [ ] `bom_*` cron jobs 現況已記錄。
- [ ] extension 狀態已記錄。
- [ ] 沒有執行 `supabase db push`、`migration up`、SQL write、`cron.schedule` 或 `cron.unschedule`。

## 3. Edge Functions baseline（read-only）

目的：確認 Edge Function 是否已存在 / 是否已部署；不 deploy、不 invoke production side effect。

```bash
# read-only：列出 functions；不要 deploy / delete / invoke
supabase functions list
```

核對：

- [ ] BOM 相關 function names 已記錄。
- [ ] 沒有執行 `supabase functions deploy`。
- [ ] 沒有對 production function 做會寄信、寫 DB、備份或呼叫外部服務的 invoke。
- [ ] 若需要 smoke test，改排 Stage B non-production rehearsal。

## 4. Secrets / env names-only check（read-only / manual）

目的：確認需要哪些 secret/env；不讀值、不貼值、不寫入。

Names-only 清單：

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BOM_BACKUP_BUCKET`
- `BOM_IMPORT_BUCKET`
- `BOM_NOTIFICATION_RECIPIENTS`

核對方式：

- Supabase Dashboard：只看 secret names / presence；不要 reveal value。
- Zeabur Dashboard：只看 env key names / presence；不要 reveal value，不 edit，不 redeploy。
- Local `.env*`：只確認是否有 key name；不要把值複製到紀錄。

```bash
# read-only / names-only：只列本機 env 檔中是否有 key name，不印值
python3 - <<'PY'
from pathlib import Path
keys = [
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'NEXT_PUBLIC_SITE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BOM_BACKUP_BUCKET',
  'BOM_IMPORT_BUCKET',
  'BOM_NOTIFICATION_RECIPIENTS',
]
for path in [Path('.env'), Path('.env.local'), Path('.env.example')]:
    if not path.exists():
        print(f'{path}: missing')
        continue
    text = path.read_text(errors='ignore')
    present = [k for k in keys if any(line.split('=', 1)[0].strip() == k for line in text.splitlines() if '=' in line and not line.lstrip().startswith('#'))]
    print(f'{path}: names present = {present}')
PY
```

核對：

- [ ] 只記錄 key names / present-missing，不記錄 value。
- [ ] 沒有執行 Zeabur env write。
- [ ] 沒有執行 Supabase secrets set / unset。
- [ ] 缺少的 key 已列為 Matt decision / ops TODO。

## 5. Zeabur baseline（read-only）

目的：確認 app / service；不修改 env、不 redeploy、不 restart。

```bash
# read-only：確認 CLI 登入身份與可見 project/service；不要 deploy / restart / env set
zeabur auth whoami
zeabur project list
```

若要看 service 詳細資訊，僅限 CLI / dashboard 的 read-only view；看到 env value reveal、edit、restart、redeploy 按鈕時不要操作。

核對：

- [ ] Zeabur app 是 Matt 指定 production app。
- [ ] 沒有 env write。
- [ ] 沒有 redeploy / restart。
- [ ] 沒有更改 domain / build settings。

## 6. Resend baseline（read-only / manual）

目的：確認 domain / sender readiness；不寄信、不改 domain。

Manual read-only checklist：

- [ ] Domain verification 狀態。
- [ ] DKIM / SPF / DMARC 狀態。
- [ ] `RESEND_FROM_EMAIL` 是否與 verified domain 相符。
- [ ] 測試收件人 allowlist 是否由 Matt 指定。
- [ ] Dashboard 中 delivery / bounce / complaint 監控位置已確認。

禁止：

- [ ] 不送 test email。
- [ ] 不修改 domain settings。
- [ ] 不建立 / rotate API key。

## 7. Go / No-Go summary

Preflight 完成後填寫：

```md
## Go / No-Go

- Recommendation: Go / No-Go
- Reasons:
- Existing bom_* jobs:
- Missing secrets/env names:
- Edge Functions status:
- Resend readiness:
- Matt decisions needed:
- Side effects performed: none
```

若 Recommendation 是 Go，仍只代表「可以請 Matt review production enablement plan」；不代表已批准 deploy、DB write、cron schedule、secret/env 變更或寄信。
