"use client";

import { createClient } from "@/lib/supabase/client";

export type ClientUserProfile = {
  id: string;
  role: "owner" | "manager" | "leader";
  store_id: string | null;
  can_access_bom: boolean;
  can_access_inspection: boolean;
};

/**
 * Fetch the current authenticated user's `public.users` row from a client
 * component.
 *
 * Why: BOM 程式碼原本讀 `user.app_metadata.role` / `store_id`，但 hoochuu-internal
 * 沒同步 role/store_id 到 JWT app_metadata（merge plan §A.2 決議走資料庫查詢）。
 * `public.users` 有 `users_select_self` policy 允許 authenticated 讀自己 row。
 *
 * Returns null if not authenticated / row missing — caller should redirect.
 */
export async function fetchClientUserProfile(): Promise<ClientUserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data } = await supabase
    .from("users")
    .select("id, role, store_id, can_access_bom, can_access_inspection")
    .eq("email", user.email)
    .maybeSingle();

  if (!data) return null;
  return data as ClientUserProfile;
}
