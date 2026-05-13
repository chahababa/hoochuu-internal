# CLAUDE.md

This file gives Claude Code / 任何 AI assistant 快速進入專案的脈絡。如果你是第一次接手這個 repo，**請從頭讀完這份文件**。

## 專案身分

這個 repo 是 **`hoochuu-internal`**（前身 `Stores-checking-system`，SCS 巡店系統），目前是好初早餐（4 間店）的 production 系統，員工每日使用。

**重要**：本 repo 已於 2026-05-13 改名為 `hoochuu-internal`，正在進行「好初內部系統合併」專案，會把 BOM 系統（`chahababa/Hoochuu-Bom-System`）合併進來。詳見下方「合併專案脈絡」。

## 技術 stack（2026-05-13 起）

- Next.js 16.2.6（Turbopack 預設化）
- React 19.2.6
- Tailwind CSS 4.3.0（CSS-first config，無 `tailwind.config.ts`，theme 在 `src/app/globals.css` 的 `@theme` 區塊）
- Supabase（auth + Postgres，Dashboard-managed，無 `supabase/config.toml`）
- TypeScript strict mode
- vitest（unit test）+ playwright（e2e，需 `.env.local` + Google OAuth interactive setup）

## 設計系統

**Neo Brutalism**（自製）— 30+ 個 `.nb-*` utility class 定義在 `src/app/globals.css`，用 v4 `@utility` 語法寫。色票主軸：cream / warm / ink / soft + Neo Brutalism 8 色（nb.bg / bg2 / paper / ink / yellow / red / green / blue）。

**不要引入 shadcn**：新版 CLI default 會破壞此設計（覆寫 `src/lib/utils.ts`、強加 Geist 字體、`globals.css` 加 140 行覆蓋 body 米黃底）。已決議延後到 Phase 4 BOM UI port 時再評估整合方式。

## 工作守則（**重要，必讀**）

- **語系**：全程正體中文。避免簡體字與中國用語。台灣慣用詞：品質（非質量）、影片（非視頻）、專案（非項目）、建立（非創建）、列印（非打印）、數位（非數字）。
- **使用者背景**：自評「程式小白」。每個關鍵動作前要用人話解釋「要做什麼、會改哪些檔、有什麼風險」。任何破壞性指令要先停下確認。
- **Production 安全**：SCS 是 production，員工每天用。動 `main` / push / migration / Zeabur redeploy 前都要明確確認。
- **回滾優先**：破壞性變更前先打 git tag（例：`pre-phase-X`）。每個 sub-step 跑完先 build + typecheck + test 驗證，過了才下一步。
- **不裝 deps 就解決時不裝 deps**：能用既有 utility 寫的不要 import 新元件庫。
- **信心指數**：每次分析或建議結尾標 (0-100%)。
- **決策權重**：穩定 40% > 成本 30% = 創新／延展 30%。

## 合併專案脈絡

- **規劃 source of truth**：https://github.com/chahababa/hoochuu-internal-docs
  - 主文件：`merge-plan-curried-brewing-fog.md`（7-phase plan）
- **Notion overview**：https://www.notion.so/35f6f4831a618112b94bd67de520d73e
- **Notion 對應的 Session Insight**：https://www.notion.so/35f6f4831a618166ac07e91457951435（2026-05-13 收工紀錄）

## 目前進度（2026-05-13 末）

### Phase 0 / 0.5 — 已上線 production

- 前置：4 條未合 PR 全部處置進 main（PR #9 / #10 / #19 + 死分支 #15）
- Phase 0 Step B：Next 16 + React 19.2 升級
- Phase 0 Step C：Tailwind v4 升級
- Phase 0 Step H：`bom` schema 空殼 migration（已在 production 套用 — 透過 Supabase SQL Editor 跑 idempotent SQL，不走 `supabase db push`）
- middleware → proxy 改名
- Phase 0.5：Email/Password login 並排 Google OAuth
- CHANGELOG 紀錄
- 整段以 squash-merge 進 `main`（commit `3b9888e`，[PR #22](https://github.com/chahababa/hoochuu-internal/pull/22)）

### Post-Phase-0 cleanup — 已合併

- GitHub repo rename：`Stores-checking-system` → `hoochuu-internal`（Zeabur GitHub App 自動 follow source）
- Supabase production Dashboard 設定（SCS project ref `owogsszmolouoqsgmwik`）：Email provider enabled、`bom` schema 加進 Exposed schemas（3 of 3）
- 程式碼 / tests / docs 內舊 repo 名引用全面替換為新名（commit `145d4d4`，[PR #23](https://github.com/chahababa/hoochuu-internal/pull/23)）
- 本機 dev 視覺巡檢：`/login`、`/inspection/new`、`/notifications`、`/settings/items` 4 頁全綠
- Stale remote branches 清除：`phase-0-framework-upgrade`、`claude/vibrant-kepler-e0527c`、`design/neo-brutalism-dashboard`、`ui/neo-brutalism`

### 戰術延後

- **Phase 0 Step D（shadcn init）**：新版 shadcn CLI `-d` 預設（`base-nova` preset）會覆寫 `src/lib/utils.ts`（刪 `formatMonthValue`）、改 `layout.tsx` 加 Geist 字體、`globals.css` 加 140 行 `body { bg-background }` 直接覆蓋 Neo Brutalism 米黃底。延到 Phase 4 BOM UI port 進來時再評估整合方式。
- **第一個 password 帳號**：Phase 0.5 完成 UI、Dashboard Email provider 也啟用了，但沒建測試帳號 — `chahababa@gmail.com` / `chahababa@hoochuu.com.tw` 都已是 Google OAuth user，Supabase Dashboard 不允許同 email 跨 provider。未來真有員工要 password 登入再用測試 email 或 SQL 補 identity。

### 保險點

Git tag `pre-phase-0` → `fa5cd11`。整段 Phase 0 要回滾隨時可：

```
git reset --hard pre-phase-0
```

## 下一步（Phase 1+）

依 [merge plan](https://github.com/chahababa/hoochuu-internal-docs/blob/main/merge-plan-curried-brewing-fog.md) 7-phase 規劃，Phase 0 / 0.5 完成後接：

1. **Phase 1：統一通知中心** — 建 `public.notifications` 表 + bell UI（SCS 自己先用，Phase 2-4 BOM port 進來後共用）
2. **Phase 2**：BOM 17 張表 port 進 `bom` schema（無 UI）
3. **Phase 3**：BOM auth 改讀 SCS `public.users`（feature branch）
4. **Phase 4**：BOM UI 掛 `(protected)/bom/*`、AppShell 加模組切換器、評估 shadcn 整合
5. **Phase 5**：BOM 後勤 port（pg_cron + Vault + Edge Functions + Resend）
6. **Phase 6**：BOM Sprint 19–21
7. **Phase 7**：清舊 BOM Supabase project、archive 舊 BOM repo

**節奏**：每個 Phase 結束等 2-3 天確認穩定才接下一個。

### ⚠️ 開 Phase 1 前必須先解決

**SCS production migration tracking 缺口**：remote `supabase_migrations.schema_migrations` table 完全空白，前 15 支 migration 都沒在 tracking — schema 是用 SQL Editor 累積出來的、不是走 `supabase db push` 流程。直接跑 `supabase db push` 會撞「table already exists」。

兩個解法擇一：
- 重建 tracking（手動 INSERT 15 筆到 `supabase_migrations.schema_migrations`，之後才能正規走 CLI migration flow）
- 繼續走 SQL Editor 跑 idempotent SQL（短期可行、長期不可維護）

建議在開 Phase 1 第一支 migration 前先處理。

## 常用指令

```bash
npm run dev          # local dev server，port 3000
npm run build        # next build（Turbopack）
npm run typecheck    # tsc --noEmit -p tsconfig.typecheck.json
npm run test         # vitest run
npm run lint         # eslint .
npm run test:e2e     # playwright test（需先用 :auth:owner/leader setup 互動式登入）
```

## 接續工作的建議第一句

> 我要繼續好初內部系統合併專案。請先跑 `git status` + `git log --oneline -10` 看當前分支狀態，然後告訴我目前所在的 phase、剩下的待辦中哪一件最划算先做，等我拍板再動。

---

**最後更新**：2026-05-13（PR #22 / #23 / cleanup PR 合併後），由 Claude Code 寫入。下次接手請更新本文件「目前進度」與「下一步」區段。
