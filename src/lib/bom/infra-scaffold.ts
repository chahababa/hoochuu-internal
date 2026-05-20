export const BOM_INFRA_ENV_VARS = [
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "BOM_BACKUP_BUCKET",
  "BOM_IMPORT_BUCKET",
  "BOM_NOTIFICATION_RECIPIENTS",
] as const;

export type BomInfraEnvVar = (typeof BOM_INFRA_ENV_VARS)[number];

export type BomInfraFeature = "pg_cron" | "vault" | "edge_function" | "resend";

export type BomInfraJobSpec = {
  name: `bom_${string}`;
  scheduleUtc: string;
  taipeiDescription: string;
  sql: string;
  features: BomInfraFeature[];
  sideEffects: string[];
  approvalGate: string;
};

export const BOM_INFRA_JOBS: BomInfraJobSpec[] = [
  {
    name: "bom_auto_lock_previous_month",
    scheduleUtc: "0 19 4 * *",
    taipeiDescription: "每月 5 號 03:00 Asia/Taipei 自動鎖上月",
    sql: "SELECT bom.fn_auto_lock_previous_month();",
    features: ["pg_cron"],
    sideEffects: ["寫入 bom.monthly_locks / bom.monthly_lock_audit", "可能觸發月結鎖通知 stub"],
    approvalGate: "Matt 確認月結鎖頻率、時區、解鎖流程與失敗通知方式後才可 schedule。",
  },
  {
    name: "bom_query_audit_purge_daily",
    scheduleUtc: "0 18 * * *",
    taipeiDescription: "每日 02:00 Asia/Taipei 清除超過 365 天 BOM query audit log",
    sql: "SELECT bom.fn_purge_query_audit_old();",
    features: ["pg_cron"],
    sideEffects: ["刪除 bom.query_audit_log 中超過保留期的紀錄"],
    approvalGate: "Matt 確認 audit log 保留天數與可刪除政策後才可 schedule。",
  },
  {
    name: "bom_backup_daily_r2",
    scheduleUtc: "30 19 * * *",
    taipeiDescription: "每日 03:30 Asia/Taipei 觸發 R2 備份",
    sql: "SELECT bom.fn_trigger_backup('r2', 'cron');",
    features: ["pg_cron", "vault", "edge_function"],
    sideEffects: ["呼叫備份 Edge Function", "寫入 bom.backup_history", "寫入外部備份儲存"],
    approvalGate: "Matt 確認 R2 bucket、保留策略、Vault secret 與 restore 測試後才可 schedule。",
  },
  {
    name: "bom_backup_monthly_gdrive",
    scheduleUtc: "0 20 1 * *",
    taipeiDescription: "每月 2 號 04:00 Asia/Taipei 觸發 Google Drive 月備份",
    sql: "SELECT bom.fn_trigger_backup('gdrive', 'cron');",
    features: ["pg_cron", "vault", "edge_function"],
    sideEffects: ["呼叫備份 Edge Function", "寫入 bom.backup_history", "寫入 Google Drive 備份"],
    approvalGate: "Matt 確認 Google Drive 目的地、憑證 owner、保留月數與 restore 測試後才可 schedule。",
  },
  {
    name: "bom_backup_purge_daily",
    scheduleUtc: "0 4 * * *",
    taipeiDescription: "每日 12:00 Asia/Taipei 清理過期備份",
    sql: "SELECT bom.fn_call_backup_purge();",
    features: ["pg_cron", "vault", "edge_function"],
    sideEffects: ["呼叫備份清理 Edge Function", "標記或刪除過期外部備份"],
    approvalGate: "Matt 確認備份保留策略與可刪除範圍後才可 schedule。",
  },
];

export type BomInfraValidationResult =
  | { ok: true; present: BomInfraEnvVar[]; missing: [] }
  | { ok: false; present: BomInfraEnvVar[]; missing: BomInfraEnvVar[]; reason: "config_missing" };

export function validateBomInfraEnv(env: Record<string, string | undefined | null>): BomInfraValidationResult {
  const present: BomInfraEnvVar[] = [];
  const missing: BomInfraEnvVar[] = [];

  for (const key of BOM_INFRA_ENV_VARS) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    return { ok: false, present, missing, reason: "config_missing" };
  }

  return { ok: true, present, missing: [] };
}

export function getBomInfraReadinessSummary(env: Record<string, string | undefined | null>) {
  const envValidation = validateBomInfraEnv(env);

  return {
    status: envValidation.ok ? "ready_for_non_production_smoke" : "blocked_by_config",
    env: envValidation,
    jobs: BOM_INFRA_JOBS.map(({ name, scheduleUtc, taipeiDescription, features, approvalGate }) => ({
      name,
      scheduleUtc,
      taipeiDescription,
      features,
      approvalGate,
    })),
    hardGates: [
      "No production cron.schedule before Matt approval.",
      "No Vault secret writes before Matt approval.",
      "No Edge Function deploy before Matt approval.",
      "No Resend activation or recipient expansion before Matt approval.",
      "No production DB write / migration apply from this scaffold PR.",
    ],
  } as const;
}

export function buildBomCronPreviewSql(jobs: BomInfraJobSpec[] = BOM_INFRA_JOBS) {
  const lines = [
    "-- BOM Phase 5 cron preview only.",
    "-- Do not run this SQL in production until Matt approves the approval gates in docs/BOM_PHASE_5_READINESS.md.",
    "-- This file is intentionally commented out so the scaffold PR has no runtime effect.",
    "",
  ];

  for (const job of jobs) {
    lines.push(`-- ${job.name}: ${job.taipeiDescription}`);
    lines.push(`-- Requires: ${job.features.join(", ")}`);
    lines.push(`-- Approval: ${job.approvalGate}`);
    lines.push(`-- SELECT cron.schedule('${job.name}', '${job.scheduleUtc}', $$${job.sql}$$);`);
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function assertBomInfraJobsSafe(jobs: BomInfraJobSpec[] = BOM_INFRA_JOBS) {
  const names = new Set<string>();

  for (const job of jobs) {
    if (!job.name.startsWith("bom_")) {
      throw new Error(`BOM infra job must use bom_ namespace: ${job.name}`);
    }
    if (names.has(job.name)) {
      throw new Error(`Duplicate BOM infra job name: ${job.name}`);
    }
    if (!job.approvalGate.includes("Matt")) {
      throw new Error(`BOM infra job is missing Matt approval gate: ${job.name}`);
    }
    names.add(job.name);
  }

  return true;
}
