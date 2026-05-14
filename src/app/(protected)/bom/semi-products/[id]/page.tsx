"use client";

// Ported from Hoochuu-Bom-System/src/app/bom/semi-products/[id]/page.tsx (Phase 3+4d)

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
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

type BomItem = {
  product_id: string;
  quantity: number;
  unit: string;
  note?: string;
  product_name?: string;
};

type Version = {
  id: string;
  version_number: number;
  effective_from: string;
  bom_items: BomItem[];
  notes: string | null;
};

type SemiProduct = {
  id: string;
  name: string;
  standard_output_qty: number;
  standard_output_unit: string;
  current_version_id: string | null;
};

type Product = { id: string; name: string; brand: string | null; spec: string | null };

export default function SemiProductEditPage() {
  const params = useParams();
  const id = params.id as string;
  useAuditLog({ resource: "semi-product-detail", action: "view", params: { semi_product_id: id } });

  const [semiProduct, setSemiProduct] = useState<SemiProduct | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [publishNotes, setPublishNotes] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Add item form
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [itemUnit, setItemUnit] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();

    const { data: sp } = await supabase
      .schema("bom")
      .from("semi_products")
      .select("id, name, standard_output_qty, standard_output_unit, current_version_id")
      .eq("id", id)
      .single();
    setSemiProduct(sp as SemiProduct | null);

    const { data: vers } = await supabase
      .schema("bom")
      .from("semi_product_versions")
      .select("id, version_number, effective_from, bom_items, notes")
      .eq("semi_product_id", id)
      .eq("is_deleted", false)
      .order("version_number", { ascending: false });
    setVersions((vers as unknown as Version[]) ?? []);

    // Load current version's bom_items with product names
    if (sp?.current_version_id && vers?.length) {
      const current = (vers as unknown as Version[]).find((v) => v.id === sp.current_version_id);
      if (current) {
        const productIds = current.bom_items.map((b) => b.product_id);
        if (productIds.length > 0) {
          const { data: prods } = await supabase
            .schema("bom")
            .from("products")
            .select("id, name, brand, spec")
            .in("id", productIds);
          const prodMap = new Map((prods ?? []).map((p) => [p.id, p]));
          setBomItems(
            current.bom_items.map((b) => ({
              ...b,
              product_name: prodMap.get(b.product_id)?.name ?? "未知",
            }))
          );
        } else {
          setBomItems([]);
        }
      }
    }

    // Load all products for add dialog
    const { data: allProds } = await supabase
      .schema("bom")
      .from("products")
      .select("id, name, brand, spec")
      .eq("is_deleted", false)
      .neq("status", "merged")
      .order("name");
    setProducts((allProds as Product[]) ?? []);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- BOM-ported on-mount fetch
    load();
  }, [load]);

  function handleAddItem() {
    if (!selectedProductId || !itemQty || !itemUnit) return;
    const prod = products.find((p) => p.id === selectedProductId);
    setBomItems((prev) => [
      ...prev,
      {
        product_id: selectedProductId,
        quantity: parseFloat(itemQty),
        unit: itemUnit,
        product_name: prod?.name ?? "未知",
      },
    ]);
    setAddItemOpen(false);
    setSelectedProductId("");
    setItemQty("");
    setItemUnit("");
  }

  function handleRemoveItem(index: number) {
    setBomItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePublish() {
    if (bomItems.length === 0) {
      toast.error("BOM 至少需要一個品項");
      return;
    }
    setPublishing(true);
    const supabase = createClient();

    const nextVersion = versions.length > 0 ? Math.max(...versions.map((v) => v.version_number)) + 1 : 1;

    const bomData = bomItems.map(({ product_id, quantity, unit, note }) => ({
      product_id, quantity, unit, note: note ?? null,
    }));

    const { data: newVer, error } = await supabase
      .schema("bom")
      .from("semi_product_versions")
      .insert({
        semi_product_id: id,
        version_number: nextVersion,
        bom_items: bomData,
        notes: publishNotes || null,
      })
      .select("id")
      .single();

    if (error || !newVer) {
      toast.error("發布失敗：" + (error?.message ?? "未知錯誤"));
      setPublishing(false);
      return;
    }

    await supabase
      .schema("bom")
      .from("semi_products")
      .update({ current_version_id: newVer.id })
      .eq("id", id);

    toast.success(`v${nextVersion} 發布成功！`);
    setPublishNotes("");
    setPublishing(false);
    load();
  }

  if (!semiProduct) {
    return <p className="text-center text-muted-foreground py-8">載入中...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">{semiProduct.name}</h2>
        <p className="text-sm text-muted-foreground">
          標準產量：{semiProduct.standard_output_qty} {semiProduct.standard_output_unit}
        </p>
      </div>

      {/* BOM Editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">BOM 配方</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setAddItemOpen(true)}>
            新增品項
          </Button>
        </CardHeader>
        <CardContent>
          {bomItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">尚未加入品項</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>品項</TableHead>
                  <TableHead className="text-right">數量</TableHead>
                  <TableHead>單位</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bomItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(i)}>
                        移除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 space-y-3">
            <Input
              placeholder="版本備註（選填）"
              value={publishNotes}
              onChange={(e) => setPublishNotes(e.target.value)}
            />
            <Button className="w-full" onClick={handlePublish} disabled={publishing || bomItems.length === 0}>
              {publishing ? "發布中..." : "發布新版本"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">版本歷史</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">尚無版本</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <span className="font-medium">v{v.version_number}</span>
                    {v.id === semiProduct.current_version_id && (
                      <Badge variant="default" className="ml-2">當前</Badge>
                    )}
                    <span className="text-sm text-muted-foreground ml-2">
                      {formatTaipei(v.effective_from, "yyyy-MM-dd HH:mm")}
                    </span>
                    {v.notes && (
                      <span className="text-sm text-muted-foreground ml-2">— {v.notes}</span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{v.bom_items.length} 個品項</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>新增 BOM 品項</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">品項</label>
              <Select value={selectedProductId} onValueChange={(v) => setSelectedProductId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇品項..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.brand ? `(${p.brand})` : ""} {p.spec ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">數量</label>
                <Input type="number" value={itemQty} onChange={(e) => setItemQty(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">單位</label>
                <Input placeholder="g / ml" value={itemUnit} onChange={(e) => setItemUnit(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleAddItem} disabled={!selectedProductId || !itemQty || !itemUnit}>
              加入
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
