"use client";

// Ported from Hoochuu-Bom-System/src/app/bom/ingredients/ingredients-client.tsx (Phase 3+4d)

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/bom/ui/input";
import { Button } from "@/components/bom/ui/button";
import { Badge } from "@/components/bom/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/bom/ui/table";
import { AddIngredientDialog } from "@/components/bom/dialogs/add-ingredient-dialog";
import { AddProductDialog } from "@/components/bom/dialogs/add-product-dialog";

type Ingredient = {
  id: string;
  name: string;
  category: string;
  status: string;
  product_count: number;
};

const categoryLabels: Record<string, string> = {
  food: "食材",
  packaging: "包材",
  other: "其他",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  pending: "secondary",
  merged: "outline",
};

const statusLabels: Record<string, string> = {
  active: "已審核",
  pending: "待審核",
  merged: "已合併",
};

export function IngredientsClient({
  initialIngredients,
}: {
  initialIngredients: Ingredient[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [addIngredientOpen, setAddIngredientOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  const filtered = initialIngredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleCreated() {
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="搜尋食材..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setAddProductOpen(true)}>
            新增品項
          </Button>
          <Button onClick={() => setAddIngredientOpen(true)}>新增食材</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>食材名稱</TableHead>
            <TableHead>分類</TableHead>
            <TableHead>狀態</TableHead>
            <TableHead className="text-right">品項數量</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {search ? "找不到符合的食材" : "尚無食材資料"}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((ingredient) => (
              <TableRow key={ingredient.id}>
                <TableCell className="font-medium">{ingredient.name}</TableCell>
                <TableCell>{categoryLabels[ingredient.category] ?? ingredient.category}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[ingredient.status] ?? "outline"}>
                    {statusLabels[ingredient.status] ?? ingredient.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{ingredient.product_count}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AddIngredientDialog
        open={addIngredientOpen}
        onOpenChange={setAddIngredientOpen}
        onCreated={handleCreated}
      />
      <AddProductDialog
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
