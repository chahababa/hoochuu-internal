"use client";

// Ported from Hoochuu-Bom-System/src/components/bom/add-dish-dialog.tsx (Phase 3+4c)
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/bom/ui/dialog";
import { Input } from "@/components/bom/ui/input";
import { Button } from "@/components/bom/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/bom/ui/select";
import type { CostBaseline } from "@/lib/bom/types/cost-baseline";
import { toPercent } from "@/lib/bom/types/cost-baseline";

const UNASSIGNED = "__unassigned__";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function AddDishDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [serviceMode, setServiceMode] = useState("");
  const [price, setPrice] = useState("");
  const [baselineId, setBaselineId] = useState<string>(UNASSIGNED);
  const [baselines, setBaselines] = useState<CostBaseline[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog-open reset pattern, BOM-ported
      setName(""); setCategory(""); setServiceMode(""); setPrice(""); setBaselineId(UNASSIGNED);
      const supabase = createClient();
      supabase.schema("bom").from("cost_baselines")
        .select("*").eq("is_deleted", false).order("name")
        .then(({ data }) => setBaselines((data as CostBaseline[] | null) ?? []));
    }
  }, [open]);

  async function handleSubmit() {
    if (!name || !serviceMode) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.schema("bom").from("dishes").insert({
      name,
      category: category || null,
      service_mode: serviceMode,
      price: price ? parseFloat(price) : null,
      cost_baseline_id: baselineId === UNASSIGNED ? null : baselineId,
    });
    setSubmitting(false);
    if (!error) { onOpenChange(false); onCreated(); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>新增餐點</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">餐點名稱</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">分類</label>
            <Input placeholder="三明治 / 漢堡 / 飲料" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">供餐方式</label>
            <Select value={serviceMode} onValueChange={(v) => setServiceMode(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="選擇..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dine_in">內用</SelectItem>
                <SelectItem value="takeout">外帶</SelectItem>
                <SelectItem value="both">內用+外帶</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">售價</label>
            <Input type="number" placeholder="選填" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">基準線</label>
            <Select value={baselineId} onValueChange={(v) => setBaselineId(v ?? UNASSIGNED)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>未指派</SelectItem>
                {baselines.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}（{toPercent(b.target_cost_rate)}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!name || !serviceMode || submitting}>
            {submitting ? "建立中..." : "確認建立"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
