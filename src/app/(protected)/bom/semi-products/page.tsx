"use client";

// Ported from Hoochuu-Bom-System/src/app/bom/semi-products/page.tsx (Phase 3+4d)

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/bom/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/bom/ui/table";
import { AddSemiProductDialog } from "@/components/bom/dialogs/add-semi-product-dialog";
import Link from "next/link";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

type SemiProduct = {
  id: string;
  name: string;
  standard_output_qty: number;
  standard_output_unit: string;
  current_version_id: string | null;
  created_at: string;
  semi_product_versions: { version_number: number }[] | null;
};

export default function SemiProductsPage() {
  useAuditLog({ resource: "semi-product-list", action: "view" });

  const [items, setItems] = useState<SemiProduct[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  function load() {
    const supabase = createClient();
    supabase
      .schema("bom")
      .from("semi_products")
      .select("id, name, standard_output_qty, standard_output_unit, current_version_id, created_at, semi_product_versions!semi_product_versions_semi_product_id_fkey(version_number)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as unknown as SemiProduct[]) ?? []));
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">半成品清單</h2>
        <Button onClick={() => setDialogOpen(true)}>新增半成品</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名稱</TableHead>
            <TableHead>標準產量</TableHead>
            <TableHead>版本</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">尚無半成品</TableCell>
            </TableRow>
          ) : (
            items.map((sp) => {
              const maxVersion = sp.semi_product_versions
                ?.map((v) => v.version_number)
                .sort((a, b) => b - a)[0];
              return (
                <TableRow key={sp.id}>
                  <TableCell>
                    <Link href={`/bom/semi-products/${sp.id}`} className="font-medium hover:underline">
                      {sp.name}
                    </Link>
                  </TableCell>
                  <TableCell>{sp.standard_output_qty} {sp.standard_output_unit}</TableCell>
                  <TableCell>{maxVersion ? `v${maxVersion}` : "未發布"}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <AddSemiProductDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={load} />
    </div>
  );
}
