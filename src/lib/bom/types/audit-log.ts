// Ported from Hoochuu-Bom-System/src/lib/types/audit-log.ts (Phase 3+4b)

export type AuditAction = "view" | "filter" | "search" | "export";

export type AuditResource =
  | "dashboard"
  | "cost-overview"
  | "baselines-list"
  | "baselines-new"
  | "baselines-edit"
  | "purchase-list"
  | "purchase-form"
  | "monthly-close"
  | "dish-list"
  | "dish-detail"
  | "semi-product-list"
  | "semi-product-detail"
  | "global-search"
  | "cross-store-compare"
  | "audit-log";

export interface QueryAuditLogRow {
  id: string;
  created_at: string;
  user_id: string;
  user_role: string;
  user_store_id: string | null;
  resource: string;
  action: string;
  params: Record<string, unknown> | null;
}
