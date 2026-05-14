"use client";

// Ported from Hoochuu-Bom-System/src/app/baselines/[id]/edit/page.tsx (Phase 3+4d)

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BaselineForm } from "@/components/bom/baselines/baseline-form";
import type { CostBaseline } from "@/lib/bom/types/cost-baseline";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

export default function EditBaselinePage() {
  const params = useParams();
  const id = params.id as string;
  useAuditLog({ resource: "baselines-edit", action: "view", params: { baseline_id: id } });
  const [baseline, setBaseline] = useState<CostBaseline | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .schema("bom")
      .from("cost_baselines")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setBaseline(data as CostBaseline);
        else setNotFound(true);
      });
  }, [id]);

  if (notFound) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <p className="text-muted-foreground">找不到此基準線</p>
      </div>
    );
  }
  if (!baseline) return <div className="container mx-auto px-4 py-6 max-w-5xl text-muted-foreground">載入中...</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-4">
      <h1 className="text-lg font-semibold">編輯基準線</h1>
      <BaselineForm initial={baseline} />
    </div>
  );
}
