"use client";

// Ported from Hoochuu-Bom-System/src/app/baselines/new/page.tsx (Phase 3+4d)

import { BaselineForm } from "@/components/bom/baselines/baseline-form";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

export default function NewBaselinePage() {
  useAuditLog({ resource: "baselines-new", action: "view" });
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-4">
      <h1 className="text-lg font-semibold">新增基準線</h1>
      <BaselineForm />
    </div>
  );
}
