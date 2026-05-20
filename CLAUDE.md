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

## 目前進度（2026-05-20）

### Phase 0 / 0.5 — 已上線 production

- 前置：4 條未合 PR 全部處置進 main（PR #9 / #10 / #19 + 死分支 #15）
- Phase 0 Step B：Next 16 + React 19.2 升級
- Phase 0 Step C：Tailwind v4 升級
- Phase 0 Step H：`bom` schema 空殼 migration（已在 production 套用 — 透過 Supabase SQL Editor 跑 idempotent SQL，不走 `supabase db push`）
- middleware → proxy 改名
- Phase 0.5：Email/Password login 並排 Google OAuth
- 整段以 squash-merge 進 `main`（commit `3b9888e`，[PR #22](https://github.com/chahababa/hoochuu-internal/pull/22)）

### Migration tracking 重建 — 已合併（2026-05-14）

- SCS production 的 `supabase_migrations.schema_migrations` 表先前完全空白，已透過 Supabase Dashboard SQL Editor 補登 16 筆 tracking 紀錄（PR #26、squash commit `6642104`）。
- 16 支 migration 檔案 `git mv` rename 為標準 14-digit 格式（`YYYYMMDD_NNNNNN_name.sql` → `YYYYMMDDNNNNNN_name.sql`）。
- Restore SQL 存於 [`supabase/scripts/restore-migration-tracking.sql`](supabase/scripts/restore-migration-tracking.sql)，ON CONFLICT DO NOTHING 安全可重跑。
- 從現在起 `supabase db push` 可正常運作；但仍依「Production 安全」守則 — push prod 前先告知 Matt 並等確認。

### Phase 1–4 BOM merge — 已合併到 main

- **Phase 1：統一通知中心** — `public.notifications` + bell UI 已完成，SCS 巡檢完成 email notification 測試也已補上（latest main：`test: cover inspection report email notification`，PR #27）。
- **Phase 2：BOM schema/storage** — `bom` schema、19 tables、5 enums、25 functions、20 triggers、42 RLS policies、`bom-imports` / `bom-backups-staging` storage buckets 已 port（PR #31–#33）。
- **Phase 3：BOM lib/auth/types** — Supabase types 已包含 `Database['bom']`，BOM lib/hooks/types 已移到 `src/lib/bom/*`，BOM auth 改以 SCS `public.users` / module flags 為準（PR #34–#35、#39 bug fix）。
- **Phase 4：BOM UI routes/AppShell** — BOM components 與 routes 已掛到 `(protected)/bom/*`、`(protected)/settings/bom/*`，AppShell 已顯示 BOM 成本管理 / BOM 設定 group，並以 `can_access_bom` gate；active owners 已 grant（PR #36–#38）。

### 目前已知後續

- **Phase 5 BOM Infra 尚未啟用**：pg_cron、Vault、Edge Functions、Resend 仍需 Matt approval；readiness checklist 見 [`docs/BOM_PHASE_5_READINESS.md`](docs/BOM_PHASE_5_READINESS.md)。
- **BOM access 擴權**：manager / leader 若要使用 BOM，需另案 grant `can_access_bom=true`，不要混在 infra PR。
- **BOM UI cleanup**：shadcn-style primitives 與 Neo Brutalism 共存仍待視覺巡檢 / cleanup PR。
- **Resend**：巡檢完成通知 code 已存在，但 production env / domain 啟用仍需 Matt 確認；不要在 repo 中寫 secret 值。

### 保險點

Git tag `pre-phase-0` → `fa5cd11`。整段 Phase 0 要回滾可參考：

```
git reset --hard pre-phase-0
```

注意：目前 main 已遠超過 Phase 0；實際回滾 production 前必須先由 Matt 確認影響範圍。

## 下一步（Phase 5+）

依 [merge plan](https://github.com/chahababa/hoochuu-internal-docs/blob/main/merge-plan-curried-brewing-fog.md) 7-phase 規劃，Phase 0–4 已完成後接：

1. **Phase 5：BOM 後勤 port（pg_cron + Vault + Edge Functions + Resend）** — 先做 code-only scaffold / idempotent migration PR；實際啟用需 Matt approval，且不可在 PR 中動 production secrets/env/DB。
2. **Phase 6：BOM Sprint 19–21** — 等 Phase 5 穩定後再排。
3. **Phase 7：清舊 BOM Supabase project、archive 舊 BOM repo** — 最後確認無 production 依賴後才做。

**節奏**：每個 Phase 結束等 2-3 天確認穩定才接下一個。Phase 5 的任何 production infra 動作都要有明確 approval gate、驗證步驟與 rollback plan。

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

**最後更新**：2026-05-20（Phase 1–4 已合併、Phase 5 readiness 文件補齊），由 Vibe Coding Agent 寫入。下次接手請先讀 `CHANGELOG.md` 與 `docs/BOM_PHASE_5_READINESS.md`。
