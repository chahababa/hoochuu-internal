# 系統整合測試 — 2026-05-14 / 2026-05-18

合併計畫 Phase 0~3+4e 全部上 prod 後跑的系統整合測試。Layer 1 + 2 + 3 三層驗證、抓到 2 個阻擋性 bug、都已修並 deploy。

## 範圍

- **Phase 0 / 0.5**：SCS 框架升級（Next 16 / Tailwind v4）+ Email/Password auth + bom schema 空殼
- **Phase 1-A / 1-B**：統一通知中心 DB 骨幹 + Bell UI + realtime
- **Phase 2-A / 2-B / 2-C**：users module flags + BOM schema port (19 tables/5 enums/25 fn/20 trig/42 RLS) + storage buckets
- **Phase 3+4 a~e**：types.ts 重生 + BOM lib/components/routes port + AppShell 模組切換 + owner grant

## 測試結構

### Layer 1：Schema 完整性 audit

腳本：[`system-schema-audit.sql`](./system-schema-audit.sql)
方法：在 Supabase Dashboard SQL Editor 跑單一 jsonb_build_object query、比對預期值
**結果：100% 全綠**（首次跑就過）

| 檢查 | 預期 | 實際 |
|---|---|---|
| Phase 1-A notifications | 12 cols / 2 policies / RLS on / `fn_notify` + `fn_notify_role` + trigger | ✅ |
| Phase 2-A users 4 新欄位 | `auth_method` / `display_name` / `can_access_bom` / `can_access_inspection` + helper | ✅ |
| Phase 2-B BOM schema | 19 tables / 5 enums / 25 functions / 20 triggers / 42 policies / 41 含 `can_access_bom` / pg_trgm / 3 FK to stores | ✅ |
| Phase 2-C buckets | 2 buckets / 4 policies / `inspection-photos` 未動 | ✅ |
| Phase 3+4e grants | 1 owner / 0 manager-leader 有 bom access | ✅ |
| Migration tracking | 21 筆，last 5 = `2026051400001[7-9]/0[2]0/0[2]1` | ✅ |

### Layer 2：瀏覽器 smoke test

方法：以 owner 身份登入 prod (`stores-checking-system.zeabur.app`)，逐 BOM route navigate + 截圖 + console error 抓取

| Route | URL 不 redirect | Console 0 error | UI 渲染 |
|---|---|---|---|
| `/bom/cost-overview` | ✅ | ✅ | ✅ |
| `/bom/ingredients` | ✅ | ✅ | ✅ |
| `/bom/baselines` | ✅ | ✅ | ✅ |
| `/bom/dishes` | ✅ | ✅ | ✅ |
| `/bom/semi-products` | ✅ | ✅ | ✅ |
| `/bom/purchase` | ✅ | ✅ | ✅ |
| `/bom/search` | ✅ | ✅ | ✅ |
| `/bom/import` | ✅ | ✅ | ✅ |
| `/settings/bom/monthly-close` | ✅ | ✅ | ✅ |
| `/settings/bom/audit-log` | ✅ | ✅ | ✅ |
| `/settings/bom/backup` | ✅ | ✅ | ✅ |

**11 routes 全通過**。Bell icon 在 header 顯示、AppShell 兩個 BOM nav group 渲染、既有巡店 dashboard 數字無 regression（員工持續使用中，從 7 → 9 次巡檢）。

### Layer 3：RLS 行為 sanity check

腳本：擴充 `system-schema-audit.sql` 加 RLS 檢查
**結果：全綠**

- ✅ 5 個 RLS helper 全存在（`current_user_id` / `_role` / `_store_id` / `_profile` / `_can_access_bom`）
- ✅ `fn_notify` 是 SECURITY DEFINER（正確 — bypass RLS 寫 notifications）
- ✅ BOM table policies 都含 `current_user_can_access_bom()` 檢查
- ✅ `alerts_insert_denied` 用 `WITH CHECK (false)` 硬擋（強制走 SECURITY DEFINER `fn_notify` 路徑）

## 抓到的 Bug

### Bug #1：BOM port code 讀 `user.app_metadata.role` — PR #39

**現象**：點 `/settings/bom/monthly-close` 立即 redirect 回 `/`；BOM 主頁面的 owner-gated 按鈕（如「新增食材」）永遠隱藏。

**根因**：BOM repo 原始 client code 讀 `user.app_metadata.role` 拿角色。但 hoochuu-internal 的 SCS 設計**不同步 role 到 JWT app_metadata**（merge plan §A.2 走資料庫查詢路線）— `user.app_metadata.role` 在 hoochuu-internal 永遠 `undefined`。9 處 client-side 讀取全失敗。

**第一版修法**：寫 `fetchClientUserProfile()` helper 從 `public.users` 直接查（PR #39）。9 個 callers 改用。

### Bug #2：`public.users` 沒給 authenticated table-level GRANT — PR #40

**現象**：PR #39 上 prod 後 monthly-close **仍然** redirect。

**根因**：直接從 browser client (`authenticated` role) 打 Supabase REST `/rest/v1/users` 回 `PG error 42501 permission denied for table users`。SCS 的 mvp_schema migration 給了 `users_select_self` RLS policy，但**沒給 table-level `GRANT SELECT ON public.users TO authenticated`**。RLS policy 等於擺著不能用。SCS 既有 code 都走 admin client（service_role bypass）讀 `public.users`，所以這個 grant gap 在 BOM port 之前沒被發現。

**最終修法**：把 `fetchClientUserProfile` 改成單純委派 server action `getCurrentBomProfile()`（PR #40）— 走既有 `getCurrentUserProfile()` admin client 路徑。Client 端介面不變。

## 結論

- Phase 0 ~ 3+4e 整套 prod 系統 **100% 功能性可用**
- 既有巡店流程零影響
- BOM 模組對 owner（目前唯一拿到 `can_access_bom=true` 的角色）完全可訪問、UI 正常
- 員工繼續使用 SCS 沒看到任何變化（無 `can_access_bom` → 看不到 BOM nav）

## 已知待辦（不影響當前運作）

1. **Phase 5 BOM Infra 未啟用**：pg_cron 排程 / pg_net Edge Function dispatch / Vault secrets 都還是 stub。影響：BOM 自動備份、月結自動鎖、立即 alert email 不會發。手動 backup / 月結 / alert log 可用。
2. **視覺整合**：BOM `@base-ui/react` shadcn primitives 用 `bg-background` 等 CSS variables，hoochuu-internal Neo Brutalism 沒對應變數定義 — BOM 頁面視覺風格跟巡店不同。功能正常。
3. **`public.users` grant gap**：SCS 設計缺陷，目前透過 admin client 路徑繞過。未來如果有需要 client-side 讀 `public.users`，可考慮加 `GRANT SELECT TO authenticated`（讓 `users_select_self` RLS 真的能用）。
4. **PR-C 通知頁面 cutover**：等 PR-B（Bell UI）穩定 2-3 週後做。

## 重跑這份 audit 的方法

1. SQL Layer：在 Supabase Dashboard SQL Editor 跑 [`system-schema-audit.sql`](./system-schema-audit.sql)，比對預期數字（檔尾註解）
2. Browser Layer：以 owner 身份登入 `stores-checking-system.zeabur.app`，逐個訪問上表 11 個 BOM routes
3. RLS Layer：見本文「Layer 3」段落的 SQL（jsonb 包檢查 helpers + policies + fn_notify SECDEF 狀態）
