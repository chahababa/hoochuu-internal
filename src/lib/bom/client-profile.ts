"use client";

import { getCurrentBomProfile, type BomProfileSnapshot } from "@/lib/bom/profile-action";

export type ClientUserProfile = BomProfileSnapshot;

/**
 * Client-side helper to get current user's BOM-related profile fields.
 *
 * 內部委派給 `getCurrentBomProfile` server action：`public.users` 沒給 authenticated
 * role 的 table-level SELECT grant，browser client 直接查會撞 PG error 42501
 * "permission denied for table users"。Server action 透過 admin client 讀
 * public.users，跟 SCS 既有 `getCurrentUserProfile` 走同條路徑。
 *
 * Returns null if not authenticated / row missing — caller should redirect.
 */
export async function fetchClientUserProfile(): Promise<ClientUserProfile | null> {
  return await getCurrentBomProfile();
}
