import { describe, expect, it } from "vitest";

import {
  assertBomInfraJobsSafe,
  BOM_INFRA_ENV_VARS,
  BOM_INFRA_JOBS,
  buildBomCronPreviewSql,
  getBomInfraReadinessSummary,
  validateBomInfraEnv,
} from "@/lib/bom/infra-scaffold";

describe("BOM Phase 5 infra scaffold", () => {
  it("keeps env validation non-throwing and names-only when config is missing", () => {
    const result = validateBomInfraEnv({
      RESEND_API_KEY: "",
      RESEND_FROM_EMAIL: "no-reply@example.com",
    });

    expect(result).toEqual({
      ok: false,
      present: ["RESEND_FROM_EMAIL"],
      missing: [
        "RESEND_API_KEY",
        "NEXT_PUBLIC_SITE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "BOM_BACKUP_BUCKET",
        "BOM_IMPORT_BUCKET",
        "BOM_NOTIFICATION_RECIPIENTS",
      ],
      reason: "config_missing",
    });
  });

  it("reports readiness only when every required env name is present", () => {
    const env = Object.fromEntries(BOM_INFRA_ENV_VARS.map((key) => [key, `mock-${key.toLowerCase()}`]));

    const result = validateBomInfraEnv(env);
    const summary = getBomInfraReadinessSummary(env);

    expect(result.ok).toBe(true);
    expect(result.present).toEqual([...BOM_INFRA_ENV_VARS]);
    expect(summary.status).toBe("ready_for_non_production_smoke");
    expect(summary.hardGates).toContain("No production cron.schedule before Matt approval.");
  });

  it("keeps all draft cron jobs namespaced and gated by Matt approval", () => {
    expect(assertBomInfraJobsSafe()).toBe(true);
    expect(BOM_INFRA_JOBS).toHaveLength(5);
    expect(BOM_INFRA_JOBS.every((job) => job.name.startsWith("bom_"))).toBe(true);
    expect(BOM_INFRA_JOBS.every((job) => job.approvalGate.includes("Matt"))).toBe(true);
  });

  it("emits commented cron SQL only, so the scaffold has no runtime effect", () => {
    const sql = buildBomCronPreviewSql();

    expect(sql).toContain("-- SELECT cron.schedule('bom_auto_lock_previous_month'");
    expect(sql).toContain("-- SELECT cron.schedule('bom_backup_daily_r2'");
    expect(sql).not.toMatch(/^SELECT cron\.schedule/m);
    expect(sql).toContain("Do not run this SQL in production until Matt approves");
  });
});
