import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export type NotificationModule = "inspection" | "bom" | "system";
export type NotificationSeverity = "info" | "warning" | "critical";
export type UserRole = Database["public"]["Enums"]["user_role"];

export type NotifyParams = {
  module: NotificationModule;
  type: string;
  severity?: NotificationSeverity;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown>;
};

// types.ts 是手寫的；Supabase rpc 的 Args 推導對 hand-typed Functions 帶參的版本不買單，
// 等本 migration 上 prod 後跑 `supabase gen types` 重生 types.ts 再徹底校準。
// 改用 PostgrestFilterBuilder 的 rpc 動態呼叫，runtime 行為不變。
type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function notifyUser(
  userId: string,
  params: NotifyParams,
): Promise<string> {
  const supabase = (await createClient()) as unknown as RpcClient;
  const { data, error } = await supabase.rpc("fn_notify", {
    p_user_id: userId,
    p_module: params.module,
    p_type: params.type,
    p_severity: params.severity ?? "info",
    p_title: params.title,
    p_body: params.body ?? null,
    p_link: params.link ?? null,
    p_metadata: params.metadata ?? {},
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function notifyRole(
  role: UserRole,
  storeId: string | null,
  params: NotifyParams,
): Promise<number> {
  const supabase = (await createClient()) as unknown as RpcClient;
  const { data, error } = await supabase.rpc("fn_notify_role", {
    p_role: role,
    p_store_id: storeId,
    p_module: params.module,
    p_type: params.type,
    p_severity: params.severity ?? "info",
    p_title: params.title,
    p_body: params.body ?? null,
    p_link: params.link ?? null,
    p_metadata: params.metadata ?? {},
  });
  if (error) throw new Error(error.message);
  return data as number;
}
