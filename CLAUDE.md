# CLAUDE.md

This file gives Claude Code / 任何 AI assistant 快速進入專案的脈絡。如果你是第一次接手這個 repo，**請從頭讀完這份文件**。

## 專案身分

這個 repo 是 **Stores-checking-system（SCS，巡店系統）**，目前是好初早餐（4 間店）的 production 系統，員工每日使用。

**重要**：本 repo 目前正在進行「好初內部系統合併」專案，未來會擴展成 `hoochuu-internal` 平台，整合 BOM 系統（chahababa/Hoochuu-Bom-System）。詳見下方「合併專案脈絡」。

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

### 已完成

- 前置：4 條未合 PR 全部處置進 main（PR #9 / #10 / #19 + 死分支 #15）
- Phase 0 Step B：Next 16 + React 19.2 升級（commit `8830d73`）
- Phase 0 Step C：Tailwind v4 升級（commit `5574a32`）
- Phase 0 Step H：bom schema 空殼 migration（commit `1b2f1df`）
- middleware → proxy 改名（commit `ec84971`）
- Phase 0.5：Email/Password login 並排 Google OAuth（commit `7b24bc7`）
- CHANGELOG 紀錄（commit `6238029`）

### 戰術延後

- **Phase 0 Step D（shadcn init）**：新版 shadcn CLI `-d` 預設（`base-nova` preset）會覆寫 `src/lib/utils.ts`（刪 `formatMonthValue`）、改 `layout.tsx` 加 Geist 字體、`globals.css` 加 140 行 `body { bg-background }` 直接覆蓋 Neo Brutalism 米黃底。已 `git restore` + `git clean -fd` 撤回。延到 Phase 4 BOM UI port 進來時再評估整合方式。

### 工作分支

`phase-0-framework-upgrade`（push 上 GitHub）→ Draft PR：https://github.com/chahababa/Stores-checking-system/pull/22

### 保險點

Git tag `pre-phase-0` → `fa5cd11`。整段 Phase 0 要回滾隨時可：

```
git reset --hard pre-phase-0
```

## 剩餘待辦（按建議順序）

1. **Supabase Dashboard 3 件事**（owner 親自做）：
   - Authentication → Providers → Email → Enable
   - 建第一個 password 帳號（勾 Auto Confirm User），email 對到 `public.users.email`
   - Project Settings → API → Exposed schemas 加 `bom`
2. **本機驗證**：補 `.env.local` + `npm run dev` 視覺巡檢，重點頁面：
   - `/login`（測 Google OAuth 與 password 兩種都 work）
   - `/inspection/new`（sticky nav backdrop-blur、上週未通過 chip）
   - `/inspection/improvements`（改善追蹤）
   - `/notifications`（三欄、長標題不溢出）
   - `/settings/items`（自助 form）
   - 跑 `npm run dev` + 開瀏覽器、跟升級前印象對比
3. **GitHub repo 改名**：`Stores-checking-system` → `hoochuu-internal`（plan §B Phase 0 第 4 點）
   - 用 `gh repo rename hoochuu-internal` 可一行解決
   - **連鎖影響**：要同步更新所有本機 `.git/config` 的 remote URL、Zeabur Git source、書籤
4. **Zeabur staging redeploy + 驗證**（owner 親自做）
5. **PR #22 draft → ready-for-review → merge → production redeploy**

## 部署注意（PR #22 merge 前要做完）

- 上述「Supabase Dashboard 3 件事」缺一不可，否則 redeploy 後：
  - 沒啟 Email provider → password 登入 form 看得到但呼叫 API 會 500
  - 沒建第一個 password 帳號 → 任何人想用 password 登入都會 invalid credentials
  - 沒加 bom 到 Exposed schemas → bom schema 已存在但 PostgREST 不會自動產生 API（Phase 2 port BOM 表時才會感覺）

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

**最後更新**：2026-05-13，由 Claude（Cowork mode Dispatch + Claude Code task）寫入。下次接手請更新本文件「目前進度」與「剩餘待辦」區段。
