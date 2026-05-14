"use client";

// Ported from Hoochuu-Bom-System/src/components/baselines/baseline-form.tsx (Phase 3+4c)
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchClientUserProfile } from "@/lib/bom/client-profile";
import { Button } from "@/components/bom/ui/button";
import { Input } from "@/components/bom/ui/input";
import { Textarea } from "@/components/bom/ui/textarea";
import { toast } from "sonner";
import type { CostBaseline } from "@/lib/bom/types/cost-baseline";

type Props = {
  initial?: CostBaseline;
};

export function BaselineForm({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [targetPct, setTargetPct] = useState(
    initial ? (initial.target_cost_rate * 100).toString() : "",
  );
  const [warningPct, setWarningPct] = useState(
    initial ? (initial.warning_cost_rate * 100).toString() : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  const [access, setAccess] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    fetchClientUserProfile().then((profile) => {
      const role = profile?.role;
      setAccess(role === "owner" || role === "manager" ? "ok" : "denied");
    });
  }, []);

  const targetNum = parseFloat(targetPct);
  const warningNum = parseFloat(warningPct);
  const rateValid =
    !Number.isNaN(targetNum) &&
    !Number.isNaN(warningNum) &&
    targetNum >= 0 && targetNum <= 100 &&
    warningNum >= 0 && warningNum <= 100 &&
    warningNum >= targetNum;

  const canSubmit = name.trim().length > 0 && rateValid && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      name: name.trim(),
      category: category.trim() || null,
      target_cost_rate: targetNum / 100,
      warning_cost_rate: warningNum / 100,
      notes: notes.trim() || null,
    };

    if (initial) {
      const { error } = await supabase.schema("bom").from("cost_baselines").update({
        ...payload,
        updated_by: user?.id,
      }).eq("id", initial.id);
      setSubmitting(false);
      if (error) { toast.error("更新失敗：" + error.message); return; }
      toast.success("已更新");
      router.push("/baselines");
    } else {
      const { error } = await supabase.schema("bom").from("cost_baselines").insert({
        ...payload,
        created_by: user?.id,
        updated_by: user?.id,
      });
      setSubmitting(false);
      if (error) { toast.error("建立失敗：" + error.message); return; }
      toast.success("已建立");
      router.push("/baselines");
    }
  }

  if (access === "loading") return <div className="text-muted-foreground">載入中...</div>;
  if (access === "denied") {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">此頁僅限 owner 與 manager 存取</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="space-y-1">
        <label className="text-sm font-medium">名稱 *</label>
        <Input
          placeholder="例：飲料-基礎"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">分類</label>
        <Input
          placeholder="飲料 / 餐點"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">目標成本率 (%) *</label>
          <Input
            type="number"
            placeholder="28"
            value={targetPct}
            onChange={(e) => setTargetPct(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">警示成本率 (%) *</label>
          <Input
            type="number"
            placeholder="32"
            value={warningPct}
            onChange={(e) => setWarningPct(e.target.value)}
          />
        </div>
      </div>

      {!Number.isNaN(targetNum) && !Number.isNaN(warningNum) && warningNum < targetNum && (
        <p className="text-sm text-red-600">警示成本率必須大於或等於目標成本率</p>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium">備註</label>
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "儲存中..." : (initial ? "儲存" : "建立")}
        </Button>
        <Button variant="ghost" onClick={() => router.push("/baselines")}>取消</Button>
      </div>
    </div>
  );
}
