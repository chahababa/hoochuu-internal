"use client";

// Ported from Hoochuu-Bom-System/src/app/purchase/page.tsx (Phase 3+4d)

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/bom/ui/button";
import { Input } from "@/components/bom/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/bom/ui/table";
import { toTaipeiDate, formatTaipei } from "@/lib/bom/utils/tz";
import Link from "next/link";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

type PurchaseRecord = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  supplier: string | null;
  created_at: string;
  products: { name: string } | null;
};

type CurrentPrice = {
  product_id: string;
  weighted_avg_price: number;
};

export default function PurchaseListPage() {
  const [date, setDate] = useState(toTaipeiDate(new Date()));
  useAuditLog({
    resource: "purchase-list",
    action: "filter",
    params: { date },
  });
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [currentPrices, setCurrentPrices] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- BOM-ported on-mount fetch
    setLoading(true);
    const supabase = createClient();

    supabase
      .schema("bom")
      .from("purchase_records")
      .select("id, product_id, quantity, unit_price, total_amount, supplier, created_at, products(name)")
      .eq("purchase_date", date)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const recs = (data as unknown as PurchaseRecord[]) ?? [];
        setRecords(recs);

        // 取得這些品項的 current_prices
        const productIds = [...new Set(recs.map((r) => r.product_id))];
        if (productIds.length > 0) {
          const { data: prices } = await supabase
            .schema("bom")
            .from("current_prices")
            .select("product_id, weighted_avg_price")
            .in("product_id", productIds);

          const priceMap = new Map<string, number>();
          (prices as CurrentPrice[] | null)?.forEach((p) => {
            priceMap.set(p.product_id, p.weighted_avg_price);
          });
          setCurrentPrices(priceMap);
        }

        setLoading(false);
      });
  }, [date]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">進貨管理</h1>
      <div className="flex items-center gap-3">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="max-w-xs"
        />
        <Link href="/bom/purchase/new" className="ml-auto">
          <Button>新增進貨</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">載入中...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>品項</TableHead>
              <TableHead className="text-right">數量</TableHead>
              <TableHead className="text-right">單價</TableHead>
              <TableHead className="text-right">總額</TableHead>
              <TableHead className="text-right">現行均價</TableHead>
              <TableHead>供應商</TableHead>
              <TableHead>時間</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  該日無進貨紀錄
                </TableCell>
              </TableRow>
            ) : (
              records.map((r) => {
                const avgPrice = currentPrices.get(r.product_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.products?.name ?? "未知品項"}
                    </TableCell>
                    <TableCell className="text-right">{r.quantity}</TableCell>
                    <TableCell className="text-right">${r.unit_price}</TableCell>
                    <TableCell className="text-right font-semibold">${r.total_amount}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {avgPrice != null ? `$${avgPrice}` : "-"}
                    </TableCell>
                    <TableCell>{r.supplier ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatTaipei(r.created_at, "HH:mm")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
