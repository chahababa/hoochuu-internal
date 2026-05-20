import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("BOM Phase 4 activation guardrails", () => {
  it("exposes BOM navigation only through the can_access_bom feature flag", () => {
    const source = readSource("src/components/app-shell.tsx");

    expect(source).toContain("const visibleBomLinks = profile.can_access_bom");
    expect(source).toContain("const visibleBomSettingsLinks = profile.can_access_bom");
    expect(source).toContain('NavigationGroup title="BOM 成本管理"');
    expect(source).toContain('NavigationGroup title="BOM 設定"');
    expect(source).toContain('href: "/bom/cost-overview"');
    expect(source).toContain('href: "/settings/bom/monthly-close"');
  });

  it("keeps both BOM route trees behind the same server-side access gate", () => {
    for (const relativePath of [
      "src/app/(protected)/bom/layout.tsx",
      "src/app/(protected)/settings/bom/layout.tsx",
    ]) {
      const source = readSource(relativePath);

      expect(source).toContain("await requireUser()");
      expect(source).toContain('.select("can_access_bom")');
      expect(source).toContain("data?.can_access_bom");
      expect(source).toContain('redirect("/forbidden?reason=bom")');
    }
  });

  it("documents the owner-only production grant as an idempotent migration", () => {
    const source = readSource("supabase/migrations/20260514000021_grant_bom_access_to_owners.sql");

    expect(source).toContain("UPDATE public.users");
    expect(source).toContain("role = 'owner'");
    expect(source).toContain("is_active = true");
    expect(source).toContain("can_access_bom IS DISTINCT FROM true");
    expect(source).not.toContain("role IN");
  });
});
