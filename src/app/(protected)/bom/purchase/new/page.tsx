"use client";

// Ported from Hoochuu-Bom-System/src/app/purchase/new/page.tsx (Phase 3+4d)

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/bom/ui/button";
import { Input } from "@/components/bom/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/bom/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/bom/ui/select";
import { toast } from "sonner";
import { toTaipeiDate } from "@/lib/bom/utils/tz";
import { useMonthlyLockStatus } from "@/lib/bom/hooks/use-monthly-lock-status";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

type Ingredient = { id: string; name: string; category: string };
type Product = { id: string; name: string; brand: string | null; spec: string | null };
type Store = { id: string; name: string };

export default function NewPurchasePage() {
  useAuditLog({ resource: "purchase-form", action: "view" });

  const [step, setStep] = useState(1);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState("");

  // Selections
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [storeId, setStoreId] = useState<string>("");
  const [needStoreSelector, setNeedStoreSelector] = useState(false);

  // Form fields
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [isTemporary, setIsTemporary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { isDateLocked, loading: lockLoading } = useMonthlyLockStatus();
  const todayTaipei = toTaipeiDate(new Date());
  const todayLocked = !lockLoading && isDateLocked(todayTaipei);

  // Load ingredients + determine store_id
  useEffect(() => {
    const supabase = createClient();

    supabase
      .schema("bom")
      .from("ingredients")
      .select("id, name, category")
      .eq("is_deleted", false)
      .neq("status", "merged")
      .order("name")
      .then(({ data }) => setIngredients(data ?? []));

    supabase.auth.getUser().then(({ data: { user } }) => {
      const sid = user?.app_metadata?.store_id;
      if (sid) {
        setStoreId(sid);
      } else {
        setNeedStoreSelector(true);
        supabase
          .from("stores")
          .select("id, name")
          .order("name")
          .then(({ data }) => setStores(data ?? []));
      }
    });
  }, []);

  // Load products when ingredient selected
  useEffect(() => {
    if (!selectedIngredient) return;
    const supabase = createClient();
    supabase
      .schema("bom")
      .from("products")
      .select("id, name, brand, spec")
      .eq("ingredient_id", selectedIngredient.id)
      .eq("is_deleted", false)
      .neq("status", "merged")
      .order("name")
      .then(({ data }) => setProducts(data ?? []));
  }, [selectedIngredient]);

  const totalAmount =
    quantity && unitPrice ? (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2) : "0";

  async function handleSubmit() {
    if (!selectedProduct || !storeId || !quantity || !unitPrice) return;
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.schema("bom").from("purchase_records").insert({
      product_id: selectedProduct.id,
      store_id: storeId,
      purchase_date: toTaipeiDate(new Date()),
      quantity: parseFloat(quantity),
      unit_price: parseFloat(unitPrice),
      total_amount: 0, // trigger 會自動計算
      supplier: supplier || null,
      is_temporary: isTemporary,
    });

    setSubmitting(false);

    if (error) {
      toast.error("登記失敗：" + error.message);
      return;
    }

    toast.success("進貨登記成功！");
    setSubmitted(true);
  }

  function handleAddAnother() {
    // 保留食材選擇，重置其他
    setStep(selectedIngredient ? 2 : 1);
    setSelectedProduct(null);
    setQuantity("");
    setUnitPrice("");
    setSupplier("");
    setIsTemporary(false);
    setSubmitted(false);
  }

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  // Step 1: 選食材
  if (step === 1) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">進貨管理</h1>
        <h2 className="text-lg font-semibold">步驟 1：選擇食材</h2>

        {needStoreSelector && (
          <div className="space-y-1">
            <label className="text-sm font-medium">選擇店別</label>
            <Select value={storeId} onValueChange={(v) => setStoreId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="選擇店別..." />
              </SelectTrigger>
              <SelectContent>
                {stores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Input
          placeholder="搜尋食材..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          {filteredIngredients.map((ing) => (
            <Button
              key={ing.id}
              variant="outline"
              className="h-16 text-left flex flex-col items-start justify-center"
              onClick={() => {
                setSelectedIngredient(ing);
                setStep(2);
              }}
            >
              <span className="font-medium">{ing.name}</span>
              <span className="text-xs text-muted-foreground">
                {ing.category === "food" ? "食材" : ing.category === "packaging" ? "包材" : "其他"}
              </span>
            </Button>
          ))}
        </div>
        {filteredIngredients.length === 0 && (
          <p className="text-center text-muted-foreground">找不到食材</p>
        )}
      </div>
    );
  }

  // Step 2: 選品項
  if (step === 2) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">進貨管理</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
            ← 上一步
          </Button>
          <h2 className="text-lg font-semibold">
            步驟 2：選擇品項（{selectedIngredient?.name}）
          </h2>
        </div>
        <div className="space-y-2">
          {products.map((prod) => (
            <Button
              key={prod.id}
              variant="outline"
              className="w-full h-14 text-left flex flex-col items-start justify-center"
              onClick={() => {
                setSelectedProduct(prod);
                setStep(3);
              }}
            >
              <span className="font-medium">{prod.name}</span>
              <span className="text-xs text-muted-foreground">
                {[prod.brand, prod.spec].filter(Boolean).join(" / ")}
              </span>
            </Button>
          ))}
          {products.length === 0 && (
            <p className="text-center text-muted-foreground">此食材下尚無品項</p>
          )}
        </div>
      </div>
    );
  }

  // Step 3: 填寫明細
  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">進貨管理</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
          ← 上一步
        </Button>
        <h2 className="text-lg font-semibold">步驟 3：填寫明細</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedIngredient?.name} / {selectedProduct?.name}
          </CardTitle>
          {selectedProduct?.brand && (
            <p className="text-sm text-muted-foreground">
              {selectedProduct.brand} {selectedProduct.spec}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-lg font-medium text-green-600">登記成功！</p>
              <Button onClick={handleAddAnother} className="w-full">
                再記一筆
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = "/bom/purchase")}
              >
                查看進貨紀錄
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">數量</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">單價</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="text-right text-lg font-semibold">
                總額：${totalAmount}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">供應商</label>
                <Input
                  placeholder="選填"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isTemporary}
                  onChange={(e) => setIsTemporary(e.target.checked)}
                />
                臨時採購（不納入 N=3 加權平均計算）
              </label>

              {todayLocked && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  該月已封存，請改填其他日期或聯絡老闆解鎖。
                </div>
              )}
              <Button
                className="w-full h-12 text-base"
                onClick={handleSubmit}
                disabled={
                  !quantity ||
                  !unitPrice ||
                  submitting ||
                  (!storeId && needStoreSelector) ||
                  todayLocked
                }
              >
                {submitting ? "登記中..." : todayLocked ? "該月已封存" : "送出進貨紀錄"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
