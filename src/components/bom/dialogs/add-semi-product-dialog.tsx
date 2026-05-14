"use client";

// Ported from Hoochuu-Bom-System/src/components/bom/add-semi-product-dialog.tsx (Phase 3+4c)
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/bom/ui/dialog";
import { Input } from "@/components/bom/ui/input";
import { Button } from "@/components/bom/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function AddSemiProductDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog-open reset pattern, BOM-ported
      setName("");
      setQty("");
      setUnit("");
    }
  }, [open]);

  async function handleSubmit() {
    if (!name || !qty || !unit) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.schema("bom").from("semi_products").insert({
      name,
      standard_output_qty: parseFloat(qty),
      standard_output_unit: unit,
    });
    setSubmitting(false);
    if (!error) {
      onOpenChange(false);
      onCreated();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>新增半成品</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">名稱</label>
            <Input placeholder="例：凱薩醬" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">標準產量</label>
              <Input type="number" placeholder="500" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">單位</label>
              <Input placeholder="ml" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!name || !qty || !unit || submitting}>
            {submitting ? "建立中..." : "確認建立"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
