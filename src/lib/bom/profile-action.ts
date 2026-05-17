"use server";

import { getCurrentUserProfile } from "@/lib/auth";

export type BomProfileSnapshot = {
  id: string;
  role: "owner" | "manager" | "leader";
  store_id: string | null;
  can_access_bom: boolean;
  can_access_inspection: boolean;
};

/**
 * Server action: 回傳當前登入 user 的 BOM 相關 profile snapshot。
 *
 * 為什麼是 server action：`public.users` 在 SCS 沒給 `authenticated` role
 * table-level SELECT GRANT，所以 browser client 直接查會撞 PG error 42501
 * "permission denied for table users"（即使 `users_select_self` RLS policy 存在，
 * 也需要先有 base-level grant）。
 *
 * SCS 既有 code path 都走 admin client 從 server 端讀 public.users
 * （見 src/lib/auth.ts `getCurrentUserProfile`），這個 server action 沿用
 * 同一條路徑、被 client component 透過 RSC 呼叫。
 *
 * 回傳 null 代表未登入或 user row 不存在（caller 應該 redirect）。
 */
export async function getCurrentBomProfile(): Promise<BomProfileSnapshot | null> {
  const profile = await getCurrentUserProfile();
  if (!profile) return null;
  return {
    id: profile.id,
    role: profile.role,
    store_id: profile.store_id,
    can_access_bom: profile.can_access_bom,
    can_access_inspection: profile.can_access_inspection,
  };
}
