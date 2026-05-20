# hoochuu-internal

好初早餐（4 間店）內部營運系統。整合**門市巡檢**與 **BOM 成本管理**兩大模組於單一 Next.js + Supabase 平台，員工每日使用。

> Production: <https://stores-checking-system.zeabur.app>

---

## 功能

### 巡檢模組（INSPECTION）
- Google OAuth + Email/Password 雙軌登入
- 新增 / 編輯 / 鎖定 / 刪除巡店紀錄
- 巡店題目評分（A/B/C 等級）+ 重點題目標籤系統
- 照片上傳（client-side 壓縮）+ 標準照片切換
- 改善任務追蹤（pending / resolved / verified / superseded）
- 月度報表 + 單筆／月度 CSV 匯出
- 操作稽核 log + audit CSV 匯出
- 巡店改善任務自動觸發**通知中心**

### BOM 成本管理模組（BOM COST）
- 食材／品項兩層管理 + pg_trgm 相似度查重
- 進貨紀錄 + 自動重算 current_prices（最近 N=3 筆加權平均，4 位小數精度）
- 半成品／餐點兩層 BOM + 版本快照
- 成本基準（target / warning rate）+ 成本快照計算
- 月結鎖定（手動 + 每月 5 號 03:00 台北時間自動 — Phase 5 啟用）
- 變異警報 + 三層備份（L1 Supabase / L2 Cloudflare R2 / L3 Google Drive — Phase 5 啟用）
- 批次 Excel 匯入

### 跨模組
- 統一通知中心（Bell UI + Supabase realtime + 標記已讀）
- AppShell 模組切換器（根據 `can_access_bom` / `can_access_inspection` 條件渲染 nav group）
- Owner 角色身份模擬視角（impersonate manager/leader）

---

## 技術架構

| 元件 | 版本 / 服務 |
|---|---|
| 框架 | Next.js 16.2.6（App Router + Turbopack）+ React 19.2.6 |
| 語言 | TypeScript（strict mode）|
| 樣式 | Tailwind CSS 4.3（CSS-first `@theme` config）+ 自製 Neo Brutalism utility（`.nb-*` 30+ classes）+ shadcn/`@base-ui/react` primitives（BOM 模組）|
| 資料庫 | Supabase Postgres + SSR auth + storage + realtime |
| 部署 | Zeabur（GitHub App auto-deploy on main）|
| Email | Resend（巡店完成 + BOM 警報；Phase 5 啟用）|
| 測試 | Vitest（unit）+ Playwright（e2e）+ SQL audit script |
| 包管理 | npm |

---

## 快速開始

```bash
# 1. Clone + install
git clone https://github.com/chahababa/hoochuu-internal.git
cd hoochuu-internal
npm install

# 2. 環境變數（從 .env.example 複製）
cp .env.example .env.local
# 編輯 .env.local 填入 Supabase URL / keys

# 3. 套用 migration（首次或本機環境）
supabase link --project-ref <your-project-ref>
supabase db push

# 4. 跑起來
npm run dev
# → http://localhost:3000
```

完整開發、設定與部署細節請看 **[PROJECT_MANUAL.md](./PROJECT_MANUAL.md)**。

---

## 環境變數

| 名稱 | 用途 | 必填 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key（client） | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（server admin client） | ✓ |
| `NEXT_PUBLIC_SITE_URL` | 站台 URL（OAuth callback 用） | ✓ |
| `RESEND_API_KEY` | Resend Email API key | 選填（Phase 5 才用） |
| `RESEND_FROM_EMAIL` | 發信來源 email | 選填（搭配 RESEND_API_KEY） |

實際值放在 Notion「API 金鑰管理」資料庫 — 不可入 git。

---

## 常用指令

```bash
npm run dev          # 本機 dev server，port 3000
npm run build        # next build（Turbopack standalone）
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run lint         # eslint .
npm run test:e2e     # playwright test（需 :auth:owner/leader 先互動式登入）
```

部署：push 進 `main` → Zeabur 自動 build & deploy → <https://stores-checking-system.zeabur.app>。

---

## 文件總覽

| 文件 | 用途 |
|---|---|
| **[PROJECT_MANUAL.md](./PROJECT_MANUAL.md)** | 完整使用說明書 + 維護手冊（Notion 存檔用） |
| **[CHANGELOG.md](./CHANGELOG.md)** | 版本更新紀錄（v1.0.0 = 2026-05-18 合併計畫完成） |
| **[CLAUDE.md](./CLAUDE.md)** | AI 助手接手用：技術 stack / 工作守則 / 合併專案脈絡 |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | 部署細節 |
| **[GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md)** | 上線前 smoke test 清單 |
| **[tests/integration/](./tests/integration/)** | 系統整合測試 audit SQL + findings |
| 規劃 source of truth | <https://github.com/chahababa/hoochuu-internal-docs> |

---

## 角色與權限

| 角色 | 巡店 | BOM | 後台設定 |
|---|---|---|---|
| `owner` | ✓ 全店 | ✓（需 grant） | ✓ |
| `manager` | ✓ 全店 | grant 才有 | 部分 |
| `leader` | ✓ 自店 | grant 才有 | 部分 |

模組存取由 `public.users.can_access_inspection` / `can_access_bom` 兩個 flag 控制（預設：inspection=true、bom=false）。

---

## 已知限制

- BOM 視覺風格（shadcn primitives）跟巡店 Neo Brutalism 不一致 — 功能正常，視覺待 cleanup PR 對齊
- Phase 5 BOM Infra（pg_cron 排程 + Edge Functions + Vault）尚未啟用 — 自動備份、月結自動鎖、即時 alert email 都待後續啟用
- 通知中心目前是雙軌：bell UI 讀新 `public.notifications` 表，`/notifications` 頁面仍用舊 rule-based 聚合（PR-C 之後 cutover）
