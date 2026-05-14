// Ported from Hoochuu-Bom-System/src/app/bom/ingredients/page.tsx (Phase 3+4d)

import { createClient } from "@/lib/supabase/server";
import { IngredientsClient } from "./ingredients-client";

export default async function IngredientsPage() {
  const supabase = await createClient();

  const { data: ingredients } = await supabase
    .schema("bom")
    .from("ingredients")
    .select("*, products(count)")
    .eq("is_deleted", false)
    .neq("status", "merged")
    .order("created_at", { ascending: false });

  return (
    <IngredientsClient
      initialIngredients={
        ingredients?.map((i) => ({
          ...i,
          product_count: (i.products as unknown as { count: number }[])?.[0]?.count ?? 0,
        })) ?? []
      }
    />
  );
}
