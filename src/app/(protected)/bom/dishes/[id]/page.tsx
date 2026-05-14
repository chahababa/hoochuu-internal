"use client";

// Ported from Hoochuu-Bom-System/src/app/bom/dishes/[id]/page.tsx (Phase 3+4d)

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/bom/ui/button";
import { Input } from "@/components/bom/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/bom/ui/card";
import { Badge } from "@/components/bom/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/bom/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/bom/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/bom/ui/select";
import { toast } from "sonner";
import { formatTaipei } from "@/lib/bom/utils/tz";
import type { CostBaseline } from "@/lib/bom/types/cost-baseline";
import { toPercent } from "@/lib/bom/types/cost-baseline";
import {
  getCostRateStatus, STATUS_COLORS, STATUS_LABELS,
} from "@/lib/bom/utils/cost-rate-status";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

const UNASSIGNED = "__unassigned__";

type BomItem = {
  type: "product" | "semi";
  ref_id: string;
  quantity: number;
  unit: string;
  display_name?: string;
};

type Version = {
  id: string;
  version_number: number;
  effective_from: string;
  bom_items: BomItem[];
  takeout_pack_combo_id: string | null;
  notes: string | null;
};

type Dish = {
  id: string;
  name: string;
  category: string | null;
  service_mode: string;
  price: number | null;
  cost_baseline_id: string | null;
  current_version_id: string | null;
};

type Product = { id: string; name: string };
type SemiProduct = { id: string; name: string };
type TakeoutCombo = { id: string; name: string };
type CostSnapshot = {
  store_id: string;
  store_name: string;
  dine_in_cost: number | null;
  takeout_cost: number | null;
  dine_in_rate: number | null;
  takeout_rate: number | null;
};

export default function DishEditPage() {
  const params = useParams();
  const id = params.id as string;
  useAuditLog({ resource: "dish-detail", action: "view", params: { dish_id: id } });

  const [dish, setDish] = useState<Dish | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [serviceMode, setServiceMode] = useState("");
  const [takeoutComboId, setTakeoutComboId] = useState("");
  const [takeoutCombos, setTakeoutCombos] = useState<TakeoutCombo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [semiProducts, setSemiProducts] = useState<SemiProduct[]>([]);

  const [costSnapshots, setCostSnapshots] = useState<CostSnapshot[]>([]);
  const [baselines, setBaselines] = useState<CostBaseline[]>([]);
  const [baselineId, setBaselineId] = useState<string>(UNASSIGNED);
  const [savingBaseline, setSavingBaseline] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [addType, setAddType] = useState<"product" | "semi" | null>(null);
  const [selectedRefId, setSelectedRefId] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [itemUnit, setItemUnit] = useState("");
  const [publishNotes, setPublishNotes] = useState("");
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    setRole((user?.app_metadata?.role as string | undefined) ?? null);

    const { data: d } = await supabase.schema("bom").from("dishes")
      .select("id, name, category, service_mode, price, cost_baseline_id, current_version_id")
      .eq("id", id).single();
    setDish(d as Dish | null);
    if (d) {
      setServiceMode(d.service_mode);
      setBaselineId(d.cost_baseline_id ?? UNASSIGNED);
    }

    const { data: bs } = await supabase.schema("bom").from("cost_baselines")
      .select("*").eq("is_deleted", false).order("name");
    setBaselines((bs as CostBaseline[] | null) ?? []);

    const { data: vers } = await supabase.schema("bom").from("dish_versions")
      .select("id, version_number, effective_from, bom_items, takeout_pack_combo_id, notes")
      .eq("dish_id", id).eq("is_deleted", false)
      .order("version_number", { ascending: false });
    setVersions((vers as unknown as Version[]) ?? []);

    // Load current BOM with display names
    if (d?.current_version_id && vers?.length) {
      const current = (vers as unknown as Version[]).find((v) => v.id === d.current_version_id);
      if (current) {
        setTakeoutComboId(current.takeout_pack_combo_id ?? "");
        const productIds = current.bom_items.filter((b) => b.type === "product").map((b) => b.ref_id);
        const semiIds = current.bom_items.filter((b) => b.type === "semi").map((b) => b.ref_id);

        const nameMap = new Map<string, string>();
        if (productIds.length) {
          const { data: prods } = await supabase.schema("bom").from("products").select("id, name").in("id", productIds);
          prods?.forEach((p) => nameMap.set(p.id, p.name));
        }
        if (semiIds.length) {
          const { data: semis } = await supabase.schema("bom").from("semi_products").select("id, name").in("id", semiIds);
          semis?.forEach((s) => nameMap.set(s.id, s.name));
        }
        setBomItems(current.bom_items.map((b) => ({ ...b, display_name: nameMap.get(b.ref_id) ?? "未知" })));
      }
    }

    // Load cost snapshots — 每個 store 取最新一筆
    const { data: storesData } = await supabase.from("stores").select("id, name").order("name");
    const stores = (storesData as { id: string; name: string }[] | null) ?? [];
    const { data: snapshots } = await supabase.schema("bom").from("cost_snapshots")
      .select("store_id, dine_in_cost, takeout_cost, dine_in_rate, takeout_rate, calculated_at")
      .eq("dish_id", id).order("calculated_at", { ascending: false });

    const storeSnaps: CostSnapshot[] = stores.map((s) => {
      const snap = (snapshots ?? []).find((sn) => sn.store_id === s.id);
      return {
        store_id: s.id, store_name: s.name,
        dine_in_cost: snap?.dine_in_cost ?? null, takeout_cost: snap?.takeout_cost ?? null,
        dine_in_rate: snap?.dine_in_rate ?? null, takeout_rate: snap?.takeout_rate ?? null,
      };
    });
    setCostSnapshots(storeSnaps);

    // Load selectors
    const { data: prods } = await supabase.schema("bom").from("products").select("id, name").eq("is_deleted", false).neq("status", "merged").order("name");
    setProducts((prods as Product[]) ?? []);
    const { data: semis } = await supabase.schema("bom").from("semi_products").select("id, name").eq("is_deleted", false).order("name");
    setSemiProducts((semis as SemiProduct[]) ?? []);
    const { data: combos } = await supabase.schema("bom").from("takeout_pack_combos").select("id, name").eq("is_deleted", false);
    setTakeoutCombos((combos as TakeoutCombo[]) ?? []);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- BOM-ported on-mount fetch
    load();
  }, [load]);

  function handleAddItem() {
    if (!selectedRefId || !itemQty || !itemUnit || !addType) return;
    const list = addType === "product" ? products : semiProducts;
    const found = list.find((x) => x.id === selectedRefId);
    setBomItems((prev) => [...prev, {
      type: addType, ref_id: selectedRefId, quantity: parseFloat(itemQty), unit: itemUnit,
      display_name: found?.name ?? "未知",
    }]);
    setAddType(null);
    setSelectedRefId("");
    setItemQty("");
    setItemUnit("");
  }

  async function handlePublish() {
    if (bomItems.length === 0) { toast.error("BOM 至少需要一個品項"); return; }
    setPublishing(true);
    const supabase = createClient();
    const nextVer = versions.length > 0 ? Math.max(...versions.map((v) => v.version_number)) + 1 : 1;
    const bomData = bomItems.map(({ type, ref_id, quantity, unit }) => ({ type, ref_id, quantity, unit }));

    const showTakeout = serviceMode === "takeout" || serviceMode === "both";
    const { data: newVer, error } = await supabase.schema("bom").from("dish_versions").insert({
      dish_id: id, version_number: nextVer, bom_items: bomData,
      takeout_pack_combo_id: showTakeout && takeoutComboId ? takeoutComboId : null,
      notes: publishNotes || null,
    }).select("id").single();

    if (error || !newVer) { toast.error("發布失敗：" + (error?.message ?? "")); setPublishing(false); return; }

    await supabase.schema("bom").from("dishes").update({
      current_version_id: newVer.id, service_mode: serviceMode,
    }).eq("id", id);

    // 觸發四店成本重算
    const { data: allStoresData } = await supabase.from("stores").select("id");
    const allStores = (allStoresData as { id: string }[] | null) ?? [];
    for (const store of allStores) {
      await supabase.schema("bom").rpc("fn_calc_dish_cost", { p_dish_id: id, p_store_id: store.id });
    }

    toast.success(`v${nextVer} 發布成功！`);
    setPublishNotes("");
    setPublishing(false);
    load();
  }

  async function handleSaveBaseline() {
    setSavingBaseline(true);
    const supabase = createClient();
    const newId = baselineId === UNASSIGNED ? null : baselineId;
    const { error } = await supabase.schema("bom").from("dishes")
      .update({ cost_baseline_id: newId })
      .eq("id", id);
    setSavingBaseline(false);
    if (error) { toast.error("儲存失敗：" + error.message); return; }
    toast.success("已更新基準線");
    load();
  }

  if (!dish) return <p className="text-center text-muted-foreground py-8">載入中...</p>;

  const showTakeout = serviceMode === "takeout" || serviceMode === "both";
  const canEditBaseline = role === "owner" || role === "manager";
  const activeBaseline = dish.cost_baseline_id
    ? baselines.find((b) => b.id === dish.cost_baseline_id) ?? null
    : null;
  const baselineDirty = (dish.cost_baseline_id ?? UNASSIGNED) !== baselineId;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{dish.name}</h2>
        <p className="text-sm text-muted-foreground">{dish.category} {dish.price != null ? `· $${dish.price}` : ""}</p>
      </div>

      {/* Service Mode */}
      <div className="space-y-1">
        <label className="text-sm font-medium">供餐方式</label>
        <Select value={serviceMode} onValueChange={(v) => setServiceMode(v ?? "")}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dine_in">內用</SelectItem>
            <SelectItem value="takeout">外帶</SelectItem>
            <SelectItem value="both">內用+外帶</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Baseline */}
      <div className="space-y-1">
        <label className="text-sm font-medium">基準線</label>
        {canEditBaseline ? (
          <div className="flex items-center gap-2">
            <Select value={baselineId} onValueChange={(v) => setBaselineId(v ?? UNASSIGNED)}>
              <SelectTrigger className="max-w-xs">
                <SelectValue>
                  {(v: string) => {
                    if (v === UNASSIGNED) return "未指派";
                    const b = baselines.find((x) => x.id === v);
                    return b ? `${b.name}（${toPercent(b.target_cost_rate)}）` : "";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>未指派</SelectItem>
                {baselines.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}（{toPercent(b.target_cost_rate)}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleSaveBaseline}
              disabled={!baselineDirty || savingBaseline}
            >
              {savingBaseline ? "儲存中..." : "儲存"}
            </Button>
          </div>
        ) : (
          <p className="text-sm">
            {activeBaseline ? `${activeBaseline.name}（${toPercent(activeBaseline.target_cost_rate)}）` : "未指派"}
          </p>
        )}
      </div>

      {/* BOM Editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">BOM 配方</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAddType("product")}>新增品項</Button>
            <Button size="sm" variant="outline" onClick={() => setAddType("semi")}>新增半成品</Button>
          </div>
        </CardHeader>
        <CardContent>
          {bomItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">尚未加入品項</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>類型</TableHead>
                  <TableHead>名稱</TableHead>
                  <TableHead className="text-right">數量</TableHead>
                  <TableHead>單位</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bomItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="outline">{item.type === "product" ? "品項" : "半成品"}</Badge></TableCell>
                    <TableCell className="font-medium">{item.display_name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setBomItems((p) => p.filter((_, j) => j !== i))}>移除</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Takeout combo */}
          {showTakeout && (
            <div className="mt-4 space-y-1">
              <label className="text-sm font-medium">外帶加包組合</label>
              <Select value={takeoutComboId} onValueChange={(v) => setTakeoutComboId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="選擇組合..." /></SelectTrigger>
                <SelectContent>
                  {takeoutCombos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <Input placeholder="版本備註（選填）" value={publishNotes} onChange={(e) => setPublishNotes(e.target.value)} />
            <Button className="w-full" onClick={handlePublish} disabled={publishing || bomItems.length === 0}>
              {publishing ? "發布中..." : "發布新版本"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cost Snapshots */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            成本快照（四店）
            {activeBaseline && (
              <span className="ml-3 text-xs font-normal text-muted-foreground">
                基準線 {activeBaseline.name}：目標 {toPercent(activeBaseline.target_cost_rate)} / 警示 {toPercent(activeBaseline.warning_cost_rate)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>店別</TableHead>
                <TableHead className="text-right">內用成本</TableHead>
                <TableHead className="text-right">外帶成本</TableHead>
                <TableHead className="text-right">內用成本率</TableHead>
                <TableHead className="text-right">外帶成本率</TableHead>
                {activeBaseline && <TableHead>狀態</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {costSnapshots.map((cs) => {
                const status = getCostRateStatus(
                  cs.dine_in_rate,
                  activeBaseline?.target_cost_rate,
                  activeBaseline?.warning_cost_rate,
                );
                return (
                  <TableRow key={cs.store_id}>
                    <TableCell className="font-medium">{cs.store_name}</TableCell>
                    <TableCell className="text-right">{cs.dine_in_cost != null ? `$${cs.dine_in_cost}` : "尚未計算"}</TableCell>
                    <TableCell className="text-right">{cs.takeout_cost != null ? `$${cs.takeout_cost}` : "-"}</TableCell>
                    <TableCell className="text-right">{cs.dine_in_rate != null ? `${(cs.dine_in_rate * 100).toFixed(1)}%` : "-"}</TableCell>
                    <TableCell className="text-right">{cs.takeout_rate != null ? `${(cs.takeout_rate * 100).toFixed(1)}%` : "-"}</TableCell>
                    {activeBaseline && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-3 h-3 rounded-full ${STATUS_COLORS[status]}`} />
                          <span className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</span>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Version History */}
      <Card>
        <CardHeader><CardTitle className="text-base">版本歷史</CardTitle></CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">尚無版本</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <span className="font-medium">v{v.version_number}</span>
                    {v.id === dish.current_version_id && <Badge variant="default" className="ml-2">當前</Badge>}
                    <span className="text-sm text-muted-foreground ml-2">{formatTaipei(v.effective_from, "yyyy-MM-dd HH:mm")}</span>
                    {v.notes && <span className="text-sm text-muted-foreground ml-2">— {v.notes}</span>}
                  </div>
                  <span className="text-sm text-muted-foreground">{v.bom_items.length} 個品項</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addType !== null} onOpenChange={(open) => { if (!open) setAddType(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>新增{addType === "product" ? "品項" : "半成品"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={selectedRefId} onValueChange={(v) => setSelectedRefId(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="選擇..." /></SelectTrigger>
              <SelectContent>
                {(addType === "product" ? products : semiProducts).map((x) => (
                  <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">數量</label>
                <Input type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">單位</label>
                <Input placeholder="g / ml / 個" value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleAddItem} disabled={!selectedRefId || !itemQty || !itemUnit}>加入</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
