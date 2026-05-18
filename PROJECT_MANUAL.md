# hoochuu-internal — 完整使用說明書與維護手冊

> 版本：v1.0.0（2026-05-18）
> 適用對象：Matt 本人、未來接手的工程師或 AI 助手、員工日常使用查閱

---

## 1. 專案簡介

### 它是什麼

**hoochuu-internal** 是好初早餐（板橋 4 間店）的**單一內部營運平台**，員工從這個系統處理：

1. **巡店流程**（INSPECTION）：店長／經理巡店打分、追蹤改善任務、查報表
2. **BOM 成本管理**（BOM COST）：管理食材、品項、進貨紀錄、餐點 BOM、月結成本

### 為什麼合併

合併前是 2 個獨立系統：

- **SCS 巡店系統**（`Stores-checking-system`）— 已 production，員工每天用
- **BOM 成本系統**（`Hoochuu-Bom-System`）— pre-launch，獨立 Supabase project + 獨立 Next.js repo

使用者完全重疊（4 間店全員）。獨立兩套會帶來：
- 兩個登入畫面
- 兩套通知（員工要查兩處）
- 統一通知中心無法跨獨立 app 乾淨實作
- 未來盤點、打烊紀錄都得做兩次

→ 2026-05-13 起執行合併計畫，2026-05-18 完成全套上 prod + 整合測試。

### 規模

- 4 間店：一店 / 中山 / 二店 / 敦南
- ~20 名員工（owner 1 / managers + leaders 多名）
- Solo developer：Matt（板橋好初早餐 SPM/owner）

---

## 2. 系統架構總覽

```
┌─────────────────────────────────────────────────────────────────────┐
│                        員工瀏覽器（Chrome）                          │
│                     ↓ Google OAuth / Email pwd                       │
│                                                                       │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │  Next.js 16 App（hoochuu-internal repo on Zeabur）           │    │
│   │  https://stores-checking-system.zeabur.app                   │    │
│   │                                                                │    │
│   │  ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐    │    │
│   │  │ /inspection │  │ /bom/*           │  │ /notifications│    │    │
│   │  │ 巡檢業務     │  │ BOM 成本管理      │  │ 通知中心       │    │    │
│   │  └─────────────┘  └──────────────────┘  └──────────────┘    │    │
│   │       │                    │                    │             │    │
│   │       └────────────────────┴────────────────────┘             │    │
│   │                            ↓                                   │    │
│   │              AppShell（模組切換 + Bell UI）                    │    │
│   └─────────────────────────────────────────────────────────────┘    │
│                            ↓ Supabase SSR client + admin client       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│            Supabase project（ref owogsszmolouoqsgmwik）              │
│                                                                       │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐   │
│  │ public schema       │  │ bom schema                            │   │
│  │ ─ users             │  │ ─ ingredients / products              │   │
│  │ ─ stores            │  │ ─ purchase_records / current_prices   │   │
│  │ ─ staff_members     │  │ ─ price_change_log                    │   │
│  │ ─ categories        │  │ ─ semi_products / semi_product_       │   │
│  │ ─ inspection_items  │  │   versions / takeout_pack_combos      │   │
│  │ ─ inspections       │  │ ─ dishes / dish_versions              │   │
│  │ ─ inspection_scores │  │ ─ cost_snapshots / cost_baselines     │   │
│  │ ─ improvement_tasks │  │ ─ alerts                              │   │
│  │ ─ inspection_photos │  │ ─ monthly_locks / monthly_lock_audit  │   │
│  │ ─ audit_logs        │  │ ─ query_audit_log / backup_history    │   │
│  │ ─ notifications ★   │  │ ─ import_errors / system_config       │   │
│  │ ─ release_anno...   │  │                                        │   │
│  └─────────────────────┘  └─────────────────────────────────────┘   │
│                                                                       │
│  Storage buckets:                                                     │
│  ─ inspection-photos  ─ bom-imports  ─ bom-backups-staging           │
│                                                                       │
│  pg_cron jobs（Phase 5 才啟用）:                                      │
│  ─ auto_lock_previous_month       ─ backup_daily_r2                  │
│  ─ query_audit_purge              ─ backup_monthly_gdrive            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ Phase 5 啟用後
        ┌────────────────────────────────────────┐
        │  Resend（Email）/ Cloudflare R2 / GDrive │
        │  ─ 巡店完成 email                         │
        │  ─ BOM alert email                       │
        │  ─ L2 / L3 三層備份                       │
        └────────────────────────────────────────┘

★ = realtime channel 訂閱（Bell UI 即時收新通知）
```

---

## 3. 服務與網址

| 類別 | 名稱 | URL / 識別碼 |
|---|---|---|
| **GitHub repo** | hoochuu-internal | <https://github.com/chahababa/hoochuu-internal> |
| **規劃文件 repo** | hoochuu-internal-docs | <https://github.com/chahababa/hoochuu-internal-docs> |
| **Production URL** | Zeabur 部署 | <https://stores-checking-system.zeabur.app> |
| **Zeabur project** | Stores-checking-System | <https://zeabur.com/projects/69d6eb3686ea5714a4e49e39> |
| **Supabase project** | stores-checking-system | ref `owogsszmolouoqsgmwik`，<https://supabase.com/dashboard/project/owogsszmolouoqsgmwik> |
| **Supabase Org** | chahababa's Org | ref `atgmecpcbeakkustayna` |
| **BOM 舊獨立 project** | haochu-bom | ref `zwghptkjkkhgclhapjtb`（Phase 7 才會 pause/刪）|
| **Notion 規劃 page** | 合併計畫 overview | `35f6f4831a618112b94bd67de520d73e` |

---

## 4. 檔案結構說明

```
hoochuu-internal/
├── src/
│   ├── app/
│   │   ├── (protected)/              # 需 auth 的 routes（authenticated user only）
│   │   │   ├── layout.tsx            # AppShell wrapper + auth gate
│   │   │   ├── inspection/           # 巡檢模組（既有）
│   │   │   │   ├── new/              # 新增巡店
│   │   │   │   ├── history/          # 巡店紀錄列表 + 詳情 + 編輯
│   │   │   │   ├── improvements/     # 改善追蹤
│   │   │   │   └── reports/          # 月度報表
│   │   │   ├── bom/                  # BOM 模組（Phase 3+4d port）
│   │   │   │   ├── layout.tsx        # ★ Access gate（can_access_bom 檢查）
│   │   │   │   ├── cost-overview/    # 成本總覽
│   │   │   │   ├── baselines/        # 成本基準（list + new + edit）
│   │   │   │   ├── dishes/           # 餐點 BOM
│   │   │   │   ├── semi-products/    # 半成品
│   │   │   │   ├── ingredients/      # 食材／品項
│   │   │   │   ├── purchase/         # 進貨紀錄
│   │   │   │   ├── search/           # BOM 跨表搜尋
│   │   │   │   └── import/           # 批次 Excel 匯入
│   │   │   ├── notifications/        # 通知中心頁面
│   │   │   ├── audit/                # 操作稽核紀錄
│   │   │   └── settings/             # 設定區
│   │   │       ├── users/, staff/, items/, focus-items/,
│   │   │       │  stores/, workstations/, qa-cleanup/,
│   │   │       │  release-announcements/        # 既有設定頁
│   │   │       └── bom/              # BOM 設定（Phase 3+4d）
│   │   │           ├── layout.tsx    # ★ Access gate
│   │   │           ├── monthly-close/    # 月結鎖定
│   │   │           ├── audit-log/        # BOM 查詢稽核
│   │   │           └── backup/           # 備份還原
│   │   ├── api/                      # API routes（OAuth callback, reports CSV）
│   │   ├── forbidden/, login/, pending/  # 公開頁
│   │   └── page.tsx                  # 首頁 dashboard
│   ├── components/
│   │   ├── app-shell.tsx             # ★ Header + nav group 渲染（含模組切換）
│   │   ├── notification-bell.tsx     # 通知 bell server component
│   │   ├── notification-bell-client.tsx  # bell client：realtime + dropdown UI
│   │   ├── ...（既有 SCS 元件）
│   │   └── bom/                      # BOM 元件（Phase 3+4c port）
│   │       ├── ui/                   # shadcn primitives（@base-ui/react 底層）
│   │       ├── baselines/, dialogs/, dashboard/  # BOM 領域元件
│   ├── lib/
│   │   ├── auth.ts                   # UserProfile + requireUser + requireRole
│   │   ├── notify.ts                 # 通知寫入 server helper
│   │   ├── notification-bell-actions.ts  # mark-read server actions
│   │   ├── relative-time.ts          # 「剛剛 / X 分鐘前」formatter
│   │   ├── inspection.ts             # 巡店業務邏輯
│   │   ├── audit.ts                  # 稽核 log 寫入
│   │   ├── supabase/                 # client / server / admin / types
│   │   └── bom/                      # BOM 共用 lib（Phase 3+4b port）
│   │       ├── client-profile.ts     # ★ fetchClientUserProfile（走 server action）
│   │       ├── profile-action.ts     # ★ getCurrentBomProfile server action（admin path）
│   │       ├── hooks/                # use-audit-log / use-backup-history / use-monthly-lock-status
│   │       ├── types/                # audit-log / backup / cost-baseline / monthly-lock
│   │       └── utils/                # tz / cost-rate-status
├── supabase/
│   ├── migrations/                   # 21 支 migration（標準 14-digit 命名）
│   ├── scripts/
│   │   └── restore-migration-tracking.sql  # 2026-05-14 重建 tracking 用
│   ├── seed.sql                      # 初始資料（中文 store/category/item 名）
│   └── .temp/project-ref             # 本機 link 的 project ref（已加 .gitignore）
├── tests/
│   └── integration/
│       ├── README.md                 # 系統整合測試 findings（v1.0.0 加）
│       └── system-schema-audit.sql   # Schema 完整性 audit
├── e2e/                              # Playwright e2e tests
├── scripts/                          # CLI 工具腳本
├── CLAUDE.md                         # AI 助手接手指南
├── README.md                         # 專案門面
├── CHANGELOG.md                      # 完整版本紀錄
├── PROJECT_MANUAL.md                 # 本文件
├── DEPLOYMENT.md, GO_LIVE_CHECKLIST.md, ...  # 其他輔助文件
└── package.json, next.config.ts, tsconfig.json, ...
```

★ = 維護時最常動的關鍵檔案

---

## 5. 環境變數（API 金鑰）

實際值放在 **Notion「API 金鑰管理」資料庫**，**不可入 git**。

| 變數名稱 | 用途 | 取得方式 | 存放位置 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings → API → Project URL | Zeabur env vars + 本機 `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公開 anon key（前端可見） | Supabase Dashboard → Project Settings → API → anon public | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服務角色 key（**只在 server**） | Supabase Dashboard → Project Settings → API → service_role secret | 同上 |
| `NEXT_PUBLIC_SITE_URL` | 公開站台 URL（OAuth callback 用） | 本機填 `http://localhost:3000`、prod 填 `https://stores-checking-system.zeabur.app` | 同上 |
| `RESEND_API_KEY` | Resend Email API key（選填）| Resend dashboard → API Keys → Create API Key | 同上，Phase 5 才用 |
| `RESEND_FROM_EMAIL` | 發信來源（選填）| 自定，需在 Resend 驗證 domain | 同上 |

### `.env.local` 範例

```env
NEXT_PUBLIC_SUPABASE_URL=https://owogsszmolouoqsgmwik.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

### Zeabur 環境變數設定步驟

1. 開 <https://zeabur.com/projects> → 點 `Stores-checking-System`
2. 點服務 `stores-checking-system` → 上方 tab「Variable」
3. 加入上述 6 個變數（生產環境值來自 Notion）
4. 改動後 Zeabur 會自動重新部署

---

## 6. 各外部服務的設定細節

### 6.1 Supabase

**Project 識別**：
- Project ref：`owogsszmolouoqsgmwik`
- URL：<https://supabase.com/dashboard/project/owogsszmolouoqsgmwik>
- Region：依當時建立的（從 Dashboard → Settings 看）

**Auth providers**（兩種同時啟用）：

1. **Google OAuth**
   - Dashboard → Authentication → Providers → Google → 啟用
   - 填入 Google Cloud Console 的 OAuth Client ID / Secret
   - 設定 Redirect URLs：
     - 本機：`http://localhost:3000/api/auth/callback`
     - Production：`https://stores-checking-system.zeabur.app/api/auth/callback`

2. **Email / Password**
   - Dashboard → Authentication → Providers → Email → 啟用
   - 用於未來員工沒 Google 帳號的情境（目前所有 owner 都是 Google）

**RLS（Row-Level Security）**：
- `public.*` 全部表都開 RLS，policy 用 `current_user_role()` / `current_user_store_id()` helpers
- `bom.*` 全部表也開 RLS，**每條 policy 末尾接 `AND public.current_user_can_access_bom()`**（除了 `alerts_insert_denied` 用 `WITH CHECK (false)` 硬擋）

**Realtime**：
- 預設啟用，bell UI 透過 `postgres_changes` channel 訂閱 `public.notifications` filtered by `user_id`

**Exposed schemas**（PostgREST 暴露）：
- `public`, `bom`, `graphql_public`（在 Dashboard → API → Settings → Exposed schemas）

### 6.2 Zeabur 部署

**Project ID**：`project-69d6eb...`（從 dashboard URL 抓）

**Service**：`stores-checking-system`
- Source：GitHub `chahababa/hoochuu-internal`
- Auto-deploy：push 進 `main` 即觸發 build & deploy
- Build：`next build`（Next 16 + Turbopack standalone output）
- 預估 build 時間：3-8 分鐘（看 deps install 多快）

**Domain**：`stores-checking-system.zeabur.app`（PROVISIONED）

**重新部署**：Zeabur dashboard → 服務頁面 → `Redeploy` button

### 6.3 Resend Email（Phase 5 才啟用）

設定步驟見 [TODO_RESEND_SETUP.md](./TODO_RESEND_SETUP.md)。簡要：
1. <https://resend.com> 建立帳號
2. Domain 驗證（`hoochuu.com.tw` 需要在 Cloudflare DNS 加 TXT / DKIM 記錄）
3. 建 API Key → 填到 Zeabur env vars

### 6.4 Cloudflare R2 / Google Drive（Phase 5 才啟用）

BOM 三層備份用：
- **L1**：Supabase 自帶（7 天）— 預設就有，不用設
- **L2**：Cloudflare R2 每日（30 天）— 需建 R2 bucket + API token，secrets 放 Supabase Vault
- **L3**：Google Drive 每月（12 個月）— 需 Google Service Account JSON，secrets 放 Vault

設定細節等 Phase 5 啟動時再補。

---

## 7. 功能使用說明（給員工看）

### 7.1 登入

1. 開 <https://stores-checking-system.zeabur.app>
2. 點「使用 Google 登入」→ 選好初公司的 Google 帳號
3. 第一次登入需 owner 在「帳號管理」加你進來（已加進 `public.users` 才能進入主畫面）

### 7.2 巡檢業務（INSPECTION）

**新增巡店**：
- 點 header「新增巡店」→ 選店 + 日期 + 時段
- 填每題評分（1-5 分）+ 重點題目標籤（critical / monthly_attention / complaint_watch）
- 上傳照片（自動壓縮）+ 可標記為「標準照片」
- 送出 → 系統自動分等 A/B/C + 對低分題目自動建立改善任務 + 通知該店 leader

**改善追蹤**：
- 點 header「改善追蹤」→ 列出 pending / resolved / verified 任務
- Leader：可標記為 resolved（附解決說明 + 解決照片）
- Manager/Owner：可審核標 verified

**月度報表**：
- 點 header「報表分析」→ 看當月各店得分 + 改善任務統計
- CSV 匯出按鈕：單筆 / 月度

### 7.3 BOM 成本管理（限有 `can_access_bom=true` 角色）

**新增食材／品項**：
- 點 BOM 成本管理「食材／品項」→ 「新增食材」（食材層）或「新增品項」（品項層）
- 食材：通用名稱（如「全脂牛奶」），不分品牌
- 品項：具體 SKU（如「光泉鮮乳 1L」），歸屬於某食材

**進貨紀錄**：
- 點「進貨紀錄」→ 「新增進貨」→ 選店、日期、品項、數量、總金額
- 系統自動算單價 + 更新 current_prices（最近 N=3 筆加權平均）

**餐點 BOM**：
- 點「餐點 BOM」→ 「新增餐點」→ 填名稱、分類、單價、外帶模式（dine_in/takeout）+ 指派成本基準
- 進入餐點 → 編輯 BOM（食材組成 + 半成品組成）→ 發布版本
- 發布後系統自動算成本快照（cost_snapshots），跟成本基準比對得到狀態（green/yellow/red/gray/pending）

**成本總覽**：
- 點「成本總覽」→ 全店餐點成本率列表 + filter（分類 / 基準線 / 狀態）

**月結鎖定**：
- 點 BOM 設定「月結鎖定」→ 看最近 12 個月鎖定狀態
- Owner 可手動「鎖定」某月 → 該月所有進貨／成本快照／價格變動／警報無法寫入
- 每月 5 號 03:00 台北時間會自動鎖定上月（Phase 5 啟用 pg_cron 後）
- 要解鎖必須填解鎖原因（會記入 audit log）

### 7.4 通知中心

**Bell icon**（header 右上）：
- 紅色 badge 顯示未讀數（>9 顯示「9+」）
- 點開 → dropdown 顯示最近 20 筆通知
- 點通知 → 自動標記已讀 + 跳對應頁面
- 「全部標已讀」一鍵清掉

**`/notifications` 頁面**：
- header「通知中心」link 進入
- 目前仍用舊 rule-based 聚合（從 inspections / improvement_tasks / release_announcements 動態組）
- PR-C 之後會 cutover 到讀新表

### 7.5 Owner 身份模擬視角

Owner 帳號 header 右上有「模擬視角 ▾」按鈕：
- 切換成某店的 leader → 用該角色身份看畫面（測試 RLS / 權限用）
- 切換期間有橘色 banner 提示「正在模擬」

---

## 8. 排程或自動化機制

### 8.1 已啟用

| 機制 | 觸發點 | 行為 |
|---|---|---|
| `improvement_tasks` AFTER INSERT trigger | 員工建巡店 → 自動建改善任務 | 同 transaction 內呼叫 `fn_notify_role('leader', store_id, ...)`，寫一筆通知給該店 leader |
| Supabase realtime | client subscribe `public.notifications` filtered by user_id | INSERT 事件 → 推到該 user 瀏覽器，bell badge 即時更新 |

### 8.2 Phase 5 待啟用（pg_cron schedule）

| Job 名稱 | 排程 | 行為 |
|---|---|---|
| `auto_lock_previous_month` | 每月 5 號 03:00 台北（19:00 UTC 前一日） | 鎖定上月 `bom.monthly_locks` |
| `query_audit_purge` | 每日 04:00 台北 | 清除 90 天前的 `bom.query_audit_log` |
| `backup_daily_r2` | 每日 03:30 台北 | 觸發 backup Edge Function → R2 |
| `backup_monthly_gdrive` | 每月 1 號 04:00 台北 | 觸發 backup Edge Function → Google Drive |
| `backup_purge_daily` | 每日 05:00 台北 | 清除過期備份（R2 30 天、GDrive 12 個月） |

啟用方式：解開 [`20260514000019_bom_schema_port.sql`](supabase/migrations/20260514000019_bom_schema_port.sql) 內的 `cron.schedule()` 註解 + Vault 加 R2/GDrive 憑證 + 部署對應 Edge Functions。

### 8.3 時區提醒

所有 pg_cron schedule 用 UTC。台北時間 = UTC + 8。Migration 內已硬編 `'Asia/Taipei'`，BOM utility `formatTaipei()` / `nowTaipei()` 也以此為準。

---

## 9. 日常維護指南

### 9.1 員工反映「畫面打不開」

1. 開 <https://stores-checking-system.zeabur.app>，看 owner 自己能不能進
2. 進不去 → 看 Zeabur dashboard 服務狀態
   - Running 但畫面 500 → 看 Logs（Zeabur 服務頁面 → Logs tab）
   - 變 Failed / Removed → 看最後一次 deploy 是哪個 commit 出問題、可手動 `Redeploy` 上一個版本
3. 進得去 → 是員工特定問題：
   - 員工沒在 `public.users` 表 → 從「帳號管理」加他
   - 員工的 `is_active=false` → 改成 `true`
   - 員工 role 不對 → 改 role

### 9.2 員工反映「巡店送不出去」

1. F12 看 Console error
2. 多半是照片上傳失敗（Supabase Storage 配額 / 網路）
3. 暫時請員工縮小照片 / 重試
4. 看 Supabase Dashboard → Storage → `inspection-photos` bucket 用量

### 9.3 員工反映「BOM 點不到」

1. 確認該員工 `public.users.can_access_bom = true`
2. 如果 false → 改成 true（owner 從 SQL Editor 或「帳號管理」改）：
   ```sql
   UPDATE public.users SET can_access_bom = true WHERE email = 'xxx@hoochuu.com.tw';
   ```
3. 員工 hard refresh（Ctrl+Shift+R）

### 9.4 通知 bell 沒跳

1. F12 → Network tab → 看有沒有 supabase realtime websocket 連線
2. 沒連 → Supabase realtime 可能斷線、檢查 Dashboard → Settings → API → Realtime 啟用狀態
3. 連了但沒新 row → 看 SQL `SELECT * FROM public.notifications WHERE user_id = ... ORDER BY created_at DESC LIMIT 5;`

### 9.5 想加新 migration

⚠️ 動 prod schema 前**先 git tag** 當保險點：

```bash
git tag pre-<phase-name> && git push origin pre-<phase-name>
```

流程：
1. 在 `supabase/migrations/` 加新檔，命名 `YYYYMMDDHHMMSS_<name>.sql`（14 位數字 + 描述）
2. 本機 typecheck / test / lint / build 全綠
3. `supabase db push --dry-run` 看識別到的 pending migration 名稱對
4. `supabase db push` 實 apply
5. SQL Editor 跑 verify query 確認
6. commit / push / PR / merge

### 9.6 想 rollback 某個 phase

每個 phase 上 prod 前都會打 `git tag pre-phase-N`。回滾：
- 程式碼：`git revert <merge-commit>` 開 PR merge（不要 hard reset main）
- DB schema：寫 down migration（例如 `DROP SCHEMA bom CASCADE;`）
- Supabase 自帶 PITR：Dashboard → Database → Backups → 可回到 7 天內任一時點

### 9.7 想重跑系統整合測試

見 [`tests/integration/README.md`](./tests/integration/README.md)。

---

## 10. 費用估算

| 服務 | 方案 | 月費（USD） | 備註 |
|---|---|---|---|
| Supabase | Pro | $25 | 8GB DB + 100GB egress + L1 PITR backup |
| Zeabur | Hobby 開發者方案 | ~$5 / 服務 | 1 個服務（hoochuu-internal）|
| Cloudflare R2 | Pay-as-you-go | <$1 | 預估 BOM backup <10GB |
| Google Workspace | 既有 | 不額外 | GDrive backup 用既有 storage |
| Resend | Free（3000 emails/月） | $0 | 巡店完成 + alert 預估遠低於 3000 |
| **總計** | | **~$30** | 約 NT$1,000/月 |

---

## 11. 技術注意事項

### 11.1 客戶端不能直接讀 `public.users`

**地雷**：BOM port 過來的 code 原本讀 `user.app_metadata.role`，但 hoochuu-internal **不同步 role 到 JWT app_metadata**。直接從 browser client `.from("users").select(...)` 也會撞 **PG 42501 permission denied**（`public.users` 沒給 authenticated 的 table-level GRANT）。

**正確做法**：呼叫 `fetchClientUserProfile()`（內部委派 server action via admin client），跟 SCS 既有 `getCurrentUserProfile()` 同條路。

### 11.2 BOM RLS 必含 `current_user_can_access_bom()`

所有 `bom.*` 表的 RLS policy **末尾都接 `AND public.current_user_can_access_bom()`**。沒這條的 user 拿不到任何 BOM data。例外只有 `alerts_insert_denied` 用 `WITH CHECK (false)` 硬擋（強迫走 SECURITY DEFINER `fn_notify` 路徑）。

### 11.3 Migration 檔名必須 14 位數字

Supabase CLI 解析 regex `^([0-9]+)_(.*)\.sql$`，只取第一個 `_` 前的數字。所以 `YYYYMMDD_NNN_name.sql` 兩段格式會被解析成只取 8 位日期，多檔同日會 collision。**統一用 `YYYYMMDDNNNNNN_name.sql` 14 位**。

### 11.4 修 production schema 前 dry-run

```bash
supabase db push --dry-run  # 看會 push 哪些 pending migration
```

### 11.5 git push 永不直推 main

Sandbox 已擋。流程：
1. `git checkout -b feat/...` 開 feature branch
2. `git push origin <branch>`
3. `gh pr create --fill`
4. **Matt 明確同意才 `gh pr merge <PR#> --squash --delete-branch`**

### 11.6 Auth users.id ≠ public.users.id

`public.users` 透過 email 跟 `auth.users` 配對（見 mvp_schema.sql 的 `current_user_profile()`），不用 `auth.users.id` 當 FK。RLS policy 寫 `auth.uid()` 在這 repo **用不了**，要改用 `public.current_user_id()`（橋接 helper）。

### 11.7 `supabase config push` 永遠不跑

整段 config.toml 覆寫且非 interactive 預設 Y，會把 Google OAuth client_id、MFA、Email 設定全洗掉。Supabase 設定改 Dashboard UI 即可，本機 `supabase/config.toml` 改了也別 push。

---

## 12. 本機開發與測試

### 12.1 環境準備

需要：
- Node 22+（建議）
- npm
- Supabase CLI（`scoop install supabase` 或 `brew install supabase/tap/supabase`）
- Google 帳號（chahababa@gmail.com — 唯一 owner）

### 12.2 起站

```bash
# 1. Clone
git clone https://github.com/chahababa/hoochuu-internal.git
cd hoochuu-internal

# 2. Install
npm install

# 3. 環境變數
cp .env.example .env.local
# 編輯 .env.local 填入 Supabase URL/keys（從 Notion 抓）

# 4. Link Supabase（如果要 push migration）
supabase link --project-ref owogsszmolouoqsgmwik
# 會要求 DB password（Notion 有）

# 5. 起 dev server
npm run dev
# → http://localhost:3000
```

⚠️ **本機 dev 會連 production Supabase**。**不要從本機跑 destructive query / DELETE / DROP**。改用 staging Supabase 或先打 git tag 保險。

### 12.3 跑測試

```bash
npm run typecheck     # tsc --noEmit
npm run test          # vitest run（unit tests）
npm run lint          # eslint
npm run build         # next build 完整檢查
```

E2E（需 Google OAuth interactive setup）：
```bash
npm run test:e2e:auth:owner   # 一次性：互動式登入存 storage state
npm run test:e2e              # 跑完整 playwright suite
```

### 12.4 系統整合測試

跑 [`tests/integration/system-schema-audit.sql`](./tests/integration/system-schema-audit.sql) 在 Supabase Dashboard SQL Editor，比對結果跟檔尾預期值。

---

## 13. 未來可擴展方向

### 13.1 短期（合併計畫剩下的）

- **Phase 5 BOM Infra 啟用**
  - 開 pg_cron 排程（auto-lock-prev-month / audit-purge / backup-daily-r2 / backup-monthly-gdrive / backup-purge-daily）
  - 設定 Vault secrets（R2 access key / GDrive service account JSON / Resend API key）
  - 部署 Edge Functions（`send-alert` / `backup-export` / `backup-restore`）
- **視覺整合 cleanup**
  - BOM 元件用 `@base-ui/react` 加 shadcn 樣式，跟 hoochuu-internal Neo Brutalism 不一致
  - 重做主題化、把 shadcn primitives 換成 Neo Brutalism 風格
- **PR-C 通知頁面 cutover**
  - 把 `/notifications` 頁面從 rule-based 聚合改成讀新 `public.notifications` 表
  - 把優先序邏輯轉成寫入時的 metadata

### 13.2 中期（merge plan 沒列、但可考慮）

- **盤點系統**：和 BOM 共用 `public.users` + `public.stores`，新模組掛在 `(protected)/inventory/*`
- **打烊紀錄**：每日營業結束 checklist + 簽核
- **庫存自動扣減**：BOM 餐點銷售 → 自動扣食材庫存
- **多店成本比較 dashboard**：各店同食材進價差異 / 同餐點成本率分布

### 13.3 長期

- **iOS/Android app**：員工目前用瀏覽器，未來可考慮包 Capacitor / React Native
- **AI 對話介面**：「這個月哪間店改善任務最多？」→ 自然語言 → SQL → 答案
- **POS 整合**：餐點銷售資料對接 → 自動計算實際成本率 vs 基準

---

## 結語

合併計畫從 2026-05-13 啟動到 2026-05-18 收尾 — 整套 BOM + 巡檢統一營運平台已 production-ready。員工日常使用無感、owner 拿到完整 BOM 入口、整合測試 3-layer 全綠。

未來接手請先讀 [CLAUDE.md](./CLAUDE.md)（給 AI）+ 本文件（給人），對齊 context 後再動。

**最後更新**：2026-05-18 — v1.0.0 結案
