"use client";

// Ported from Hoochuu-Bom-System/src/app/bom/dishes/page.tsx (Phase 3+4d)

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/bom/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/bom/ui/table";
import { Badge } from "@/components/bom/ui/badge";
import { AddDishDialog } from "@/components/bom/dialogs/add-dish-dialog";
import Link from "next/link";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

type Dish = {
  id: string;
  name: string;
  category: string | null;
  service_mode: string;
  price: number | null;
  current_version_id: string | null;
  dish_versions: { version_number: number }[] | null;
};

const modeLabels: Record<string, string> = {
  dine_in: "內用",
  takeout: "外帶",
  both: "內用+外帶",
};

export default function DishesPage() {
  useAuditLog({ resource: "dish-list", action: "view" });

  const [items, setItems] = useState<Dish[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  function load() {
    const supabase = createClient();
    supabase
      .schema("bom")
      .from("dishes")
      .select("id, name, category, service_mode, price, current_version_id, dish_versions!dish_id(version_number)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as unknown as Dish[]) ?? []));
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">餐點清單</h2>
        <Button onClick={() => setDialogOpen(true)}>新增餐點</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名稱</TableHead>
            <TableHead>分類</TableHead>
            <TableHead>供餐</TableHead>
            <TableHead className="text-right">售價</TableHead>
            <TableHead>版本</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">尚無餐點</TableCell>
            </TableRow>
          ) : (
            items.map((d) => {
              const maxVer = d.dish_versions?.map((v) => v.version_number).sort((a, b) => b - a)[0];
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/bom/dishes/${d.id}`} className="font-medium hover:underline">{d.name}</Link>
                  </TableCell>
                  <TableCell>{d.category ?? "-"}</TableCell>
                  <TableCell><Badge variant="outline">{modeLabels[d.service_mode]}</Badge></TableCell>
                  <TableCell className="text-right">{d.price != null ? `$${d.price}` : "-"}</TableCell>
                  <TableCell>{maxVer ? `v${maxVer}` : "未發布"}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <AddDishDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={load} />
    </div>
  );
}
