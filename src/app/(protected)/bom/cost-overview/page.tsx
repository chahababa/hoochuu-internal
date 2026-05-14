"use client";

// Ported from Hoochuu-Bom-System/src/app/dishes/cost-overview/page.tsx (Phase 3+4d)

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/bom/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/bom/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/bom/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/bom/ui/dialog";
import { toast } from "sonner";
import type { CostBaseline } from "@/lib/bom/types/cost-baseline";
import { toPercent } from "@/lib/bom/types/cost-baseline";
import {
  getDishOverviewStatus, STATUS_COLORS, STATUS_LABELS, type CostRateStatus,
} from "@/lib/bom/utils/cost-rate-status";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

type DishRow = {
  id: string;
  name: string;
  category: string | null;
  cost_baseline_id: string | null;
  dine_in_rate: number | null;
  takeout_rate: number | null;
};

type SortKey = "name" | "category" | "tier" | "dine_in_rate" | "takeout_rate";
type SortDir = "asc" | "desc";
const UNASSIGNED = "__unassigned__";
const ALL = "__all__";

function SortHeader({
  k, label, className, sortKey, sortDir, onToggle,
}: {
  k: SortKey;
  label: string;
  className?: string;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <TableHead className={className}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => onToggle(k)}
      >
        {label}
        {active && <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </TableHead>
  );
}

export default function CostOverviewPage() {
  useAuditLog({ resource: "cost-overview", action: "view" });

  const [role, setRole] = useState<string | null>(null);
  const [dishes, setDishes] = useState<DishRow[]>([]);
  const [baselines, setBaselines] = useState<CostBaseline[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [tierFilter, setTierFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [sortKey, setSortKey] = useState<SortKey>("dine_in_rate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useAuditLog({
    resource: "cost-overview",
    action: "filter",
    params: { category: categoryFilter, tier: tierFilter, status: statusFilter },
    skip: categoryFilter === ALL && tierFilter === ALL && statusFilter === ALL,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTier, setBulkTier] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const canEdit = role === "owner" || role === "manager";
  const baselineMap = useMemo(
    () => new Map(baselines.map((b) => [b.id, b])),
    [baselines],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    setRole((user?.app_metadata?.role as string | undefined) ?? null);

    const { data: bs } = await supabase.schema("bom").from("cost_baselines")
      .select("*").eq("is_deleted", false).order("name");
    setBaselines((bs as CostBaseline[] | null) ?? []);

    const { data: ds } = await supabase.schema("bom").from("dishes")
      .select("id, name, category, cost_baseline_id")
      .eq("is_deleted", false).order("name");

    const { data: snaps } = await supabase.schema("bom").from("cost_snapshots")
      .select("dish_id, store_id, dine_in_rate, takeout_rate, calculated_at")
      .order("calculated_at", { ascending: false });

    // 每 (dish, store) 取最新一筆，再對 dish 跨 store 取平均
    const latestByPair = new Map<string, { dine: number | null; take: number | null }>();
    (snaps ?? []).forEach((s) => {
      const pairKey = `${s.dish_id}:${s.store_id}`;
      if (latestByPair.has(pairKey)) return;
      latestByPair.set(pairKey, {
        dine: s.dine_in_rate as number | null,
        take: s.takeout_rate as number | null,
      });
    });

    const byDish = new Map<string, { dine: number[]; take: number[] }>();
    latestByPair.forEach((v, pairKey) => {
      const dishId = pairKey.split(":")[0];
      const bucket = byDish.get(dishId) ?? { dine: [], take: [] };
      if (v.dine != null) bucket.dine.push(v.dine);
      if (v.take != null) bucket.take.push(v.take);
      byDish.set(dishId, bucket);
    });

    const avg = (arr: number[]) => arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

    const rows: DishRow[] = ((ds as DishRow[] | null) ?? []).map((d) => {
      const bucket = byDish.get(d.id);
      return {
        ...d,
        dine_in_rate: bucket ? avg(bucket.dine) : null,
        takeout_rate: bucket ? avg(bucket.take) : null,
      };
    });
    setDishes(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- BOM-ported on-mount fetch
    load();
  }, [load]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    dishes.forEach((d) => { if (d.category) set.add(d.category); });
    return Array.from(set).sort();
  }, [dishes]);

  const filteredSorted = useMemo(() => {
    const rows = dishes.filter((d) => {
      if (categoryFilter !== ALL && d.category !== categoryFilter) return false;
      if (tierFilter === UNASSIGNED && d.cost_baseline_id) return false;
      if (tierFilter !== ALL && tierFilter !== UNASSIGNED && d.cost_baseline_id !== tierFilter) return false;
      if (statusFilter !== ALL) {
        const b = d.cost_baseline_id ? baselineMap.get(d.cost_baseline_id) : null;
        const status = getDishOverviewStatus(
          d.dine_in_rate, b?.target_cost_rate, b?.warning_cost_rate, !!d.cost_baseline_id,
        );
        if (status !== statusFilter) return false;
      }
      return true;
    });

    const cmp = (a: DishRow, b: DishRow) => {
      let av: string | number | null = null;
      let bv: string | number | null = null;
      switch (sortKey) {
        case "name": av = a.name; bv = b.name; break;
        case "category": av = a.category; bv = b.category; break;
        case "tier":
          av = a.cost_baseline_id ? baselineMap.get(a.cost_baseline_id)?.name ?? null : null;
          bv = b.cost_baseline_id ? baselineMap.get(b.cost_baseline_id)?.name ?? null : null;
          break;
        case "dine_in_rate": av = a.dine_in_rate; bv = b.dine_in_rate; break;
        case "takeout_rate": av = a.takeout_rate; bv = b.takeout_rate; break;
      }
      // nulls 排到最後
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    };
    return rows.sort(cmp);
  }, [dishes, categoryFilter, tierFilter, statusFilter, sortKey, sortDir, baselineMap]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "dine_in_rate" || key === "takeout_rate" ? "desc" : "asc");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filteredSorted.length) setSelected(new Set());
    else setSelected(new Set(filteredSorted.map((d) => d.id)));
  }

  async function handleBulkAssign() {
    if (selected.size === 0) { toast.error("未選擇餐點"); return; }
    setBulkSubmitting(true);
    const supabase = createClient();
    const newId = bulkTier === UNASSIGNED ? null : bulkTier || null;
    const { error } = await supabase.schema("bom").from("dishes")
      .update({ cost_baseline_id: newId })
      .in("id", Array.from(selected));
    setBulkSubmitting(false);
    if (error) { toast.error("批次指派失敗：" + error.message); return; }
    toast.success(`已指派 ${selected.size} 個餐點`);
    setSelected(new Set());
    setBulkOpen(false);
    setBulkTier("");
    load();
  }

  if (loading) return <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">載入中...</div>;

  const allSelected = filteredSorted.length > 0 && selected.size === filteredSorted.length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold">成本率總覽</h1>
        {canEdit && selected.size > 0 && (
          <Button onClick={() => setBulkOpen(true)}>批次指派基準線（{selected.size}）</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="w-40">
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? ALL)}>
            <SelectTrigger>
              <SelectValue>
                {(v: string) => (v === ALL ? "全部分類" : v)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部分類</SelectItem>
              {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={tierFilter} onValueChange={(v) => setTierFilter(v ?? ALL)}>
            <SelectTrigger>
              <SelectValue>
                {(v: string) => {
                  if (v === ALL) return "全部基準線";
                  if (v === UNASSIGNED) return "未指派";
                  return baselines.find((b) => b.id === v)?.name ?? "";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部基準線</SelectItem>
              <SelectItem value={UNASSIGNED}>未指派</SelectItem>
              {baselines.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-32">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? ALL)}>
            <SelectTrigger>
              <SelectValue>
                {(v: string) => {
                  if (v === ALL) return "全部狀態";
                  return { green: "達標", yellow: "偏高", red: "超標", gray: "未指派", pending: "待計算" }[v] ?? "";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部狀態</SelectItem>
              <SelectItem value="green">達標</SelectItem>
              <SelectItem value="yellow">偏高</SelectItem>
              <SelectItem value="red">超標</SelectItem>
              <SelectItem value="pending">待計算</SelectItem>
              <SelectItem value="gray">未指派</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {canEdit && (
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="全選"
                />
              </TableHead>
            )}
            <SortHeader k="name" label="名稱" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortHeader k="category" label="分類" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortHeader k="tier" label="基準線" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <TableHead className="text-right">目標</TableHead>
            <SortHeader k="dine_in_rate" label="內用率" className="text-right" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <SortHeader k="takeout_rate" label="外帶率" className="text-right" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
            <TableHead>狀態</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-8">
                無符合條件的餐點
              </TableCell>
            </TableRow>
          ) : filteredSorted.map((d) => {
            const b = d.cost_baseline_id ? baselineMap.get(d.cost_baseline_id) : undefined;
            const status: CostRateStatus = getDishOverviewStatus(
              d.dine_in_rate, b?.target_cost_rate, b?.warning_cost_rate, !!d.cost_baseline_id,
            );
            return (
              <TableRow key={d.id}>
                {canEdit && (
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(d.id)}
                      onChange={() => toggleSelect(d.id)}
                      aria-label={`選擇 ${d.name}`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  <Link href={`/bom/dishes/${d.id}`} className="hover:underline">{d.name}</Link>
                </TableCell>
                <TableCell>{d.category ?? "-"}</TableCell>
                <TableCell>{b?.name ?? "未指派"}</TableCell>
                <TableCell className="text-right">{b ? toPercent(b.target_cost_rate) : "—"}</TableCell>
                <TableCell className="text-right">
                  {d.dine_in_rate != null ? toPercent(d.dine_in_rate) : "尚未計算"}
                </TableCell>
                <TableCell className="text-right">
                  {d.takeout_rate != null ? toPercent(d.takeout_rate) : "尚未計算"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-3 h-3 rounded-full ${STATUS_COLORS[status]}`} />
                    <span className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>批次指派基準線</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">將 {selected.size} 個餐點指派到：</p>
            <Select value={bulkTier} onValueChange={(v) => setBulkTier(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="選擇基準線">
                  {(v: string) => {
                    if (!v) return "選擇基準線";
                    if (v === UNASSIGNED) return "未指派（清除）";
                    return baselines.find((b) => b.id === v)?.name ?? "";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>未指派（清除）</SelectItem>
                {baselines.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>取消</Button>
            <Button onClick={handleBulkAssign} disabled={!bulkTier || bulkSubmitting}>
              {bulkSubmitting ? "指派中..." : "確認指派"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
