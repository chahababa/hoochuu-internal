import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

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
  metadata?: Json;
};

// Supabase rpc 對「帶參的 Functions」型別推導在 ssr client + 本 schema 結構下失效
// （Schema generic 解析為 never；嘗試過 hand-written types 與 supabase gen types 兩種來源都同樣結果）。
// 此處用結構化 cast 保留 type-safe 介面、runtime 行為不變。修這個需要研究 ssr/supabase-js
// 版本相容性，不在 PR 範圍內 — 開 followup issue 處理。
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
    p_body: params.body ?? "",
    p_link: params.link ?? "",
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
    p_store_id: storeId ?? "",
    p_module: params.module,
    p_type: params.type,
    p_severity: params.severity ?? "info",
    p_title: params.title,
    p_body: params.body ?? "",
    p_link: params.link ?? "",
    p_metadata: params.metadata ?? {},
  });
  if (error) throw new Error(error.message);
  return data as number;
}
