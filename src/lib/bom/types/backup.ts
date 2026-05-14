// Ported from Hoochuu-Bom-System/src/lib/types/backup.ts (Phase 3+4b)

export type BackupTarget = "r2" | "gdrive";

export type BackupTriggeredBy = "cron" | "manual" | "pre_restore";

export type BackupStatus = "pending" | "success" | "failed" | "purged";

export interface BackupHistoryRow {
  id: string;
  created_at: string;
  triggered_by: BackupTriggeredBy;
  target: BackupTarget;
  status: BackupStatus;
  object_key: string | null;
  size_bytes: number | null;
  error_message: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Dump file metadata header (the first JSON object inside the gzipped+encrypted blob).
 */
export interface DumpHeader {
  dump_version: 1;
  created_at_taipei: string; // YYYY-MM-DD HH:mm:ss
  schema_migration_version: number;
  tables_included: string[];
  table_counts: Record<string, number>;
}

/**
 * The complete dump payload structure (after decrypt + gunzip).
 */
export interface DumpPayload {
  header: DumpHeader;
  data: Record<string, unknown[]>; // table_name -> array of row objects
}

export const BUSINESS_TABLES = [
  "stores",
  "users",
  "ingredients",
  "products",
  "purchase_records",
  "current_prices",
  "price_change_log",
  "semi_products",
  "semi_product_versions",
  "takeout_pack_combos",
  "dishes",
  "dish_versions",
  "cost_snapshots",
  "cost_baselines",
  "alerts",
  "monthly_locks",
  "system_config",
] as const;

/**
 * Tables intentionally NOT backed up — these are auth (Supabase managed) or
 * audit logs that must be preserved untouched across restore.
 */
export const EXCLUDED_TABLES = [
  "query_audit_log",
  "monthly_lock_audit",
  "backup_history",
] as const;
