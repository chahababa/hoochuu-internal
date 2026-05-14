"use client";

// Ported from Hoochuu-Bom-System/src/components/bom/add-product-dialog.tsx (Phase 3+4c)
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/bom/ui/dialog";
import { Input } from "@/components/bom/ui/input";
import { Button } from "@/components/bom/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/bom/ui/select";

type SimilarProduct = {
  id: string;
  name: string;
  brand: string | null;
  spec: string | null;
  ingredient_id: string;
  similarity_score: number;
};

type Ingredient = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function AddProductDialog({ open, onOpenChange, onCreated }: Props) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<string>("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [spec, setSpec] = useState("");
  const [unit, setUnit] = useState("");
  const [purchaseType, setPurchaseType] = useState("");
  const [suggestions, setSuggestions] = useState<SimilarProduct[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load ingredients list
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .schema("bom")
      .from("ingredients")
      .select("id, name")
      .eq("is_deleted", false)
      .neq("status", "merged")
      .order("name")
      .then(({ data }) => setIngredients(data ?? []));

    // Reset form
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog-open reset pattern, BOM-ported
    setSelectedIngredient("");
    setName("");
    setBrand("");
    setSpec("");
    setUnit("");
    setPurchaseType("");
    setSuggestions([]);
  }, [open]);

  // Debounced product name search
  const searchSimilar = useCallback((query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const { data } = await supabase.schema("bom").rpc("suggest_similar_products", {
        query,
      });
      setSuggestions(data ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- debounced search-similar pattern, BOM-ported
    const cleanup = searchSimilar(name);
    return cleanup;
  }, [name, searchSimilar]);

  async function handleSubmit() {
    if (!selectedIngredient || !name || !unit || !purchaseType) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.schema("bom").from("products").insert({
      ingredient_id: selectedIngredient,
      name,
      brand: brand || null,
      spec: spec || null,
      unit,
      purchase_type: purchaseType,
    });
    setSubmitting(false);
    if (!error) {
      onOpenChange(false);
      onCreated();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新增品項</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 選擇食材 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">食材</label>
            <Select
              value={selectedIngredient}
              onValueChange={(v) => setSelectedIngredient(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇食材..." />
              </SelectTrigger>
              <SelectContent>
                {ingredients.map((ing) => (
                  <SelectItem key={ing.id} value={ing.id}>
                    {ing.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 品項名稱 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">品項名稱</label>
            <Input
              placeholder="例：義美鮮奶"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* 查重建議 */}
          {suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                已有相似品項：
              </p>
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="text-sm p-2 rounded border bg-muted/50"
                >
                  <span className="font-medium">{s.name}</span>
                  {s.brand && (
                    <span className="text-muted-foreground ml-1">
                      ({s.brand})
                    </span>
                  )}
                  {s.spec && (
                    <span className="text-muted-foreground ml-1">
                      {s.spec}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 品牌 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">品牌</label>
            <Input
              placeholder="例：義美"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          {/* 規格 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">規格</label>
            <Input
              placeholder="例：946ml"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
            />
          </div>

          {/* 計價單位 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">計價單位</label>
            <Select value={unit} onValueChange={(v) => setUnit(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="選擇單位" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="個">個</SelectItem>
                <SelectItem value="包">包</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 採購類型 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">採購類型</label>
            <Select value={purchaseType} onValueChange={(v) => setPurchaseType(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="選擇類型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collective">統一採購</SelectItem>
                <SelectItem value="regional">區域採購</SelectItem>
                <SelectItem value="individual">個別採購</SelectItem>
                <SelectItem value="temporary">臨時採購</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={
              !selectedIngredient ||
              !name ||
              !unit ||
              !purchaseType ||
              submitting
            }
          >
            {submitting ? "建立中..." : "確認建立"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
