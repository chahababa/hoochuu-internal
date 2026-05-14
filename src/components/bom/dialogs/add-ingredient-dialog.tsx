"use client";

// Ported from Hoochuu-Bom-System/src/components/bom/add-ingredient-dialog.tsx (Phase 3+4c)
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

type SimilarIngredient = {
  id: string;
  name: string;
  category: string;
  similarity_score: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function AddIngredientDialog({ open, onOpenChange, onCreated }: Props) {
  const [stage, setStage] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [suggestions, setSuggestions] = useState<SimilarIngredient[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirmedNoMatch, setConfirmedNoMatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog-open reset pattern, BOM-ported
      setStage(1);
      setName("");
      setCategory("");
      setSuggestions([]);
      setConfirmedNoMatch(false);
    }
  }, [open]);

  // Debounced search
  const searchSimilar = useCallback((query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const supabase = createClient();
    const timer = setTimeout(async () => {
      const { data } = await supabase.schema("bom").rpc("suggest_similar_ingredients", {
        query,
      });
      setSuggestions(data ?? []);
      setSearching(false);
      setConfirmedNoMatch(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- debounced search-similar pattern, BOM-ported
    const cleanup = searchSimilar(name);
    return cleanup;
  }, [name, searchSimilar]);

  const canProceedToStage2 =
    name.length > 0 && (suggestions.length === 0 || confirmedNoMatch);

  async function handleSubmit() {
    if (!category) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.schema("bom").from("ingredients").insert({
      name,
      category,
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
          <DialogTitle>新增食材</DialogTitle>
        </DialogHeader>

        {stage === 1 && (
          <div className="space-y-4">
            <Input
              placeholder="輸入食材名稱..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            {searching && (
              <p className="text-sm text-muted-foreground">搜尋中...</p>
            )}

            {!searching && name.length > 0 && suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  你是不是要選以下其中一個？
                </p>
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    className="w-full text-left p-3 rounded-md border hover:bg-accent transition-colors"
                    onClick={() => {
                      onOpenChange(false);
                    }}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      （相似度 {Math.round(s.similarity_score * 100)}%）
                    </span>
                  </button>
                ))}
                {!confirmedNoMatch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setConfirmedNoMatch(true)}
                  >
                    都不是我要的，建立新食材
                  </Button>
                )}
              </div>
            )}

            {!searching && name.length > 0 && suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                沒有找到相似食材
              </p>
            )}

            {canProceedToStage2 && (
              <Button className="w-full" onClick={() => setStage(2)}>
                下一步
              </Button>
            )}
          </div>
        )}

        {stage === 2 && (
          <div className="space-y-4">
            <p className="text-sm">
              食材名稱：<span className="font-medium">{name}</span>
            </p>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="選擇分類" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="food">食材</SelectItem>
                <SelectItem value="packaging">包材</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStage(1)}>
                上一步
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={!category || submitting}
              >
                {submitting ? "建立中..." : "確認建立"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
