"use client";

// Ported from Hoochuu-Bom-System/src/app/search/compare/page.tsx (Phase 3+4d)

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/bom/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/bom/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/bom/ui/table";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatTaipei } from "@/lib/bom/utils/tz";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

type Dish = { id: string; name: string };
type Store = { id: string; name: string };
type Snapshot = {
  store_id: string;
  dine_in_cost: number | null;
  takeout_cost: number | null;
  dine_in_rate: number | null;
  takeout_rate: number | null;
  calculated_at: string;
};

const STORE_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04"];

export default function ComparePage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedDish, setSelectedDish] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  useAuditLog({
    resource: "cross-store-compare",
    action: selectedDish ? "filter" : "view",
    params: selectedDish ? { product_id: selectedDish } : {},
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.schema("bom").from("dishes").select("id, name").eq("is_deleted", false).order("name")
      .then(({ data }) => setDishes((data as Dish[]) ?? []));
    supabase.from("stores").select("id, name").order("name")
      .then(({ data }) => setStores((data as Store[]) ?? []));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- BOM-ported on-mount fetch
    if (!selectedDish) { setSnapshots([]); return; }
    const supabase = createClient();
    supabase.schema("bom").from("cost_snapshots")
      .select("store_id, dine_in_cost, takeout_cost, dine_in_rate, takeout_rate, calculated_at")
      .eq("dish_id", selectedDish)
      .order("calculated_at", { ascending: true })
      .then(({ data }) => setSnapshots((data as Snapshot[]) ?? []));
  }, [selectedDish]);

  const storeMap = new Map(stores.map((s) => [s.id, s.name]));

  // Latest snapshot per store
  const latestByStore = stores.map((store) => {
    const storeSnaps = snapshots.filter((s) => s.store_id === store.id);
    const latest = storeSnaps[storeSnaps.length - 1];
    return {
      store_name: store.name,
      dine_in_cost: latest?.dine_in_cost ?? null,
      takeout_cost: latest?.takeout_cost ?? null,
      dine_in_rate: latest?.dine_in_rate ?? null,
      takeout_rate: latest?.takeout_rate ?? null,
    };
  });

  // Chart data: group by date, each store as a column
  const chartData = (() => {
    const dateMap = new Map<string, Record<string, unknown>>();
    snapshots.forEach((s) => {
      const date = formatTaipei(s.calculated_at, "MM/dd");
      if (!dateMap.has(date)) dateMap.set(date, { date });
      const entry = dateMap.get(date)!;
      const storeName = storeMap.get(s.store_id) ?? s.store_id;
      entry[storeName] = s.dine_in_rate != null ? Math.round(s.dine_in_rate * 1000) / 10 : null;
    });
    return Array.from(dateMap.values());
  })();

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">跨店成本比較</h1>

      <Select value={selectedDish} onValueChange={(v) => setSelectedDish(v ?? "")}>
        <SelectTrigger className="max-w-sm mb-6">
          <SelectValue placeholder="選擇餐點..." />
        </SelectTrigger>
        <SelectContent>
          {dishes.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedDish && (
        <div className="space-y-6">
          {/* Four stores table */}
          <Card>
            <CardHeader><CardTitle className="text-base">四店成本比較</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>店別</TableHead>
                    <TableHead className="text-right">內用成本</TableHead>
                    <TableHead className="text-right">外帶成本</TableHead>
                    <TableHead className="text-right">內用成本率</TableHead>
                    <TableHead className="text-right">外帶成本率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestByStore.map((row) => (
                    <TableRow key={row.store_name}>
                      <TableCell className="font-medium">{row.store_name}</TableCell>
                      <TableCell className="text-right">{row.dine_in_cost != null ? `$${row.dine_in_cost}` : "尚未計算"}</TableCell>
                      <TableCell className="text-right">{row.takeout_cost != null ? `$${row.takeout_cost}` : "-"}</TableCell>
                      <TableCell className="text-right">{row.dine_in_rate != null ? `${(row.dine_in_rate * 100).toFixed(1)}%` : "-"}</TableCell>
                      <TableCell className="text-right">{row.takeout_rate != null ? `${(row.takeout_rate * 100).toFixed(1)}%` : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">內用成本率趨勢</CardTitle></CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">尚無歷史資料</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" />
                    <YAxis unit="%" />
                    <Tooltip />
                    <Legend />
                    {stores.map((store, i) => (
                      <Line
                        key={store.id}
                        type="monotone"
                        dataKey={store.name}
                        stroke={STORE_COLORS[i % STORE_COLORS.length]}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
