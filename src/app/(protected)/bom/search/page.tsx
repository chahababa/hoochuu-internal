"use client";

// Ported from Hoochuu-Bom-System/src/app/search/page.tsx (Phase 3+4d)

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/bom/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/bom/ui/card";
import { Badge } from "@/components/bom/ui/badge";
import Link from "next/link";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

type SearchResult = {
  dishes: { id: string; name: string; category: string | null; price: number | null }[];
  ingredients: { id: string; name: string; category: string }[];
  products: { id: string; name: string; brand: string | null; spec: string | null }[];
};

type DishBreakdown = {
  dish_name: string;
  items: { name: string; quantity: number; unit: string; price: number | null; subtotal: number | null }[];
};

type RelatedDish = { id: string; name: string };

export default function SearchPage() {
  useAuditLog({ resource: "global-search", action: "view" });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [breakdown, setBreakdown] = useState<DishBreakdown | null>(null);
  const [relatedDishes, setRelatedDishes] = useState<{ ingredientName: string; dishes: RelatedDish[] } | null>(null);

  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  useAuditLog({
    resource: "global-search",
    action: "search",
    params: submittedQuery ? { query: submittedQuery } : {},
    skip: !submittedQuery,
  });

  async function handleSearch() {
    if (!query.trim()) return;
    setSubmittedQuery(query.trim());
    setSearching(true);
    setBreakdown(null);
    setRelatedDishes(null);
    const supabase = createClient();
    const q = `%${query}%`;

    const [dishRes, ingRes, prodRes] = await Promise.all([
      supabase.schema("bom").from("dishes").select("id, name, category, price").ilike("name", q).eq("is_deleted", false).limit(20),
      supabase.schema("bom").from("ingredients").select("id, name, category").ilike("name", q).eq("is_deleted", false).limit(20),
      supabase.schema("bom").from("products").select("id, name, brand, spec").or(`name.ilike.${q},brand.ilike.${q}`).eq("is_deleted", false).limit(20),
    ]);

    setResults({
      dishes: (dishRes.data ?? []) as SearchResult["dishes"],
      ingredients: (ingRes.data ?? []) as SearchResult["ingredients"],
      products: (prodRes.data ?? []) as SearchResult["products"],
    });
    setSearching(false);
  }

  async function showDishBreakdown(dishId: string, dishName: string) {
    const supabase = createClient();
    const { data: dish } = await supabase
      .schema("bom")
      .from("dishes")
      .select("current_version_id")
      .eq("id", dishId)
      .single();

    if (!dish?.current_version_id) return;

    const { data: version } = await supabase
      .schema("bom")
      .from("dish_versions")
      .select("bom_items")
      .eq("id", dish.current_version_id)
      .single();

    if (!version) return;

    const bomItems = version.bom_items as { type: string; ref_id: string; quantity: number; unit: string }[];
    const productIds = bomItems.filter((b) => b.type === "product").map((b) => b.ref_id);

    const { data: products } = await supabase.schema("bom").from("products").select("id, name").in("id", productIds);
    const { data: prices } = await supabase.schema("bom").from("current_prices").select("product_id, weighted_avg_price").in("product_id", productIds);

    const prodMap = new Map((products ?? []).map((p) => [p.id, p.name]));
    const priceMap = new Map((prices ?? []).map((p) => [p.product_id, p.weighted_avg_price]));

    setBreakdown({
      dish_name: dishName,
      items: bomItems.filter((b) => b.type === "product").map((b) => {
        const price = priceMap.get(b.ref_id) ?? null;
        return {
          name: prodMap.get(b.ref_id) ?? "未知",
          quantity: b.quantity, unit: b.unit,
          price, subtotal: price ? b.quantity * price : null,
        };
      }),
    });
  }

  async function showRelatedDishes(ingredientId: string, ingredientName: string) {
    const supabase = createClient();
    // Get products under this ingredient
    const { data: prods } = await supabase.schema("bom").from("products").select("id").eq("ingredient_id", ingredientId);
    const productIds = (prods ?? []).map((p) => p.id);
    if (productIds.length === 0) { setRelatedDishes({ ingredientName, dishes: [] }); return; }

    // Find dishes using these products
    const { data: allDishes } = await supabase
      .schema("bom")
      .from("dishes")
      .select("id, name, current_version_id")
      .eq("is_deleted", false);

    const matched: RelatedDish[] = [];
    for (const d of allDishes ?? []) {
      if (!d.current_version_id) continue;
      const { data: ver } = await supabase.schema("bom").from("dish_versions").select("bom_items").eq("id", d.current_version_id).single();
      if (!ver) continue;
      const bom = ver.bom_items as { type: string; ref_id: string }[];
      if (bom.some((b) => b.type === "product" && productIds.includes(b.ref_id))) {
        matched.push({ id: d.id, name: d.name });
      }
    }
    setRelatedDishes({ ingredientName, dishes: matched });
  }

  const total = results ? results.dishes.length + results.ingredients.length + results.products.length : 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">全域查詢</h1>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="搜尋餐點、食材、品項、供應商..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Link href="/bom/search/compare">
          <Badge variant="outline" className="h-10 px-4 flex items-center whitespace-nowrap cursor-pointer">跨店比較</Badge>
        </Link>
      </div>

      {searching && <p className="text-center text-muted-foreground py-8">搜尋中...</p>}

      {results && !searching && (
        <div className="space-y-4">
          {total === 0 && <p className="text-center text-muted-foreground py-8">找不到符合的結果</p>}

          {results.dishes.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">餐點（{results.dishes.length}）</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {results.dishes.map((d) => (
                  <div key={d.id} className="flex justify-between items-center p-2 border rounded hover:bg-accent cursor-pointer"
                    onClick={() => showDishBreakdown(d.id, d.name)}>
                    <div>
                      <span className="font-medium">{d.name}</span>
                      {d.category && <span className="text-sm text-muted-foreground ml-2">{d.category}</span>}
                    </div>
                    {d.price != null && <span className="text-sm">${d.price}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {results.ingredients.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">食材（{results.ingredients.length}）</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {results.ingredients.map((ing) => (
                  <div key={ing.id} className="p-2 border rounded hover:bg-accent cursor-pointer"
                    onClick={() => showRelatedDishes(ing.id, ing.name)}>
                    <span className="font-medium">{ing.name}</span>
                    <Badge variant="outline" className="ml-2">{ing.category === "food" ? "食材" : ing.category === "packaging" ? "包材" : "其他"}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {results.products.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">品項（{results.products.length}）</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {results.products.map((p) => (
                  <div key={p.id} className="p-2 border rounded">
                    <span className="font-medium">{p.name}</span>
                    {p.brand && <span className="text-sm text-muted-foreground ml-2">({p.brand})</span>}
                    {p.spec && <span className="text-sm text-muted-foreground ml-1">{p.spec}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dish cost breakdown */}
      {breakdown && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">成本明細：{breakdown.dish_name}</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-1">品項</th><th className="text-right">數量</th><th className="text-right">單價</th><th className="text-right">小計</th></tr></thead>
              <tbody>
                {breakdown.items.map((item, i) => (
                  <tr key={i} className="border-b"><td className="py-1">{item.name}</td><td className="text-right">{item.quantity} {item.unit}</td>
                    <td className="text-right">{item.price != null ? `$${item.price}` : "-"}</td>
                    <td className="text-right font-medium">{item.subtotal != null ? `$${item.subtotal.toFixed(2)}` : "-"}</td></tr>
                ))}
                <tr className="font-bold"><td className="py-2">合計</td><td></td><td></td>
                  <td className="text-right">${breakdown.items.reduce((s, i) => s + (i.subtotal ?? 0), 0).toFixed(2)}</td></tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Related dishes */}
      {relatedDishes && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">使用「{relatedDishes.ingredientName}」的餐點</CardTitle></CardHeader>
          <CardContent>
            {relatedDishes.dishes.length === 0 ? (
              <p className="text-muted-foreground">沒有餐點使用此食材</p>
            ) : (
              <div className="space-y-1">
                {relatedDishes.dishes.map((d) => (
                  <Link key={d.id} href={`/bom/dishes/${d.id}`} className="block p-2 border rounded hover:bg-accent">{d.name}</Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
