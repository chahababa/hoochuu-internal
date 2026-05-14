"use client";

// Ported from Hoochuu-Bom-System/src/app/baselines/page.tsx (Phase 3+4d)

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchClientUserProfile } from "@/lib/bom/client-profile";
import { Button } from "@/components/bom/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/bom/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/bom/ui/dialog";
import { Textarea } from "@/components/bom/ui/textarea";
import { toast } from "sonner";
import type { CostBaseline } from "@/lib/bom/types/cost-baseline";
import { toPercent } from "@/lib/bom/types/cost-baseline";

type Row = CostBaseline & { dish_count: number };

export default function BaselinesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canEdit = role === "owner" || role === "manager";

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const profile = await fetchClientUserProfile();
    setRole(profile?.role ?? null);

    const { data: baselines } = await supabase
      .schema("bom")
      .from("cost_baselines")
      .select("*")
      .eq("is_deleted", false)
      .order("category", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    const { data: dishes } = await supabase
      .schema("bom")
      .from("dishes")
      .select("cost_baseline_id")
      .eq("is_deleted", false)
      .not("cost_baseline_id", "is", null);

    const counts = new Map<string, number>();
    (dishes ?? []).forEach((d) => {
      const k = d.cost_baseline_id as string;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });

    setRows(((baselines as CostBaseline[] | null) ?? []).map((b) => ({
      ...b,
      dish_count: counts.get(b.id) ?? 0,
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- BOM-ported on-mount fetch
    load();
  }, [load]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.schema("bom").from("cost_baselines").update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user?.id,
      delete_reason: deleteReason || null,
    }).eq("id", deleteTarget.id);

    setDeleting(false);
    if (error) { toast.error("刪除失敗：" + error.message); return; }
    toast.success("已刪除");
    setDeleteTarget(null);
    setDeleteReason("");
    load();
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">基準線</h1>
        {canEdit && (
          <Link href="/bom/baselines/new">
            <Button>新增基準線</Button>
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-muted-foreground">尚未設定任何基準線</p>
          {canEdit && (
            <Link href="/bom/baselines/new">
              <Button>建立第一個基準線</Button>
            </Link>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名稱</TableHead>
              <TableHead>分類</TableHead>
              <TableHead className="text-right">目標</TableHead>
              <TableHead className="text-right">警示</TableHead>
              <TableHead className="text-right">使用中餐點</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.category ?? "-"}</TableCell>
                <TableCell className="text-right">{toPercent(r.target_cost_rate)}</TableCell>
                <TableCell className="text-right">{toPercent(r.warning_cost_rate)}</TableCell>
                <TableCell className="text-right">{r.dish_count}</TableCell>
                <TableCell className="text-right">
                  {canEdit && (
                    <div className="flex justify-end gap-2">
                      <Link href={`/bom/baselines/${r.id}/edit`}>
                        <Button size="sm" variant="ghost">編輯</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setDeleteTarget(r); setDeleteReason(""); }}
                      >
                        刪除
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteReason(""); } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>確認刪除基準線</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-3">
              <p className="text-sm">
                {deleteTarget.dish_count > 0
                  ? `此基準線目前被 ${deleteTarget.dish_count} 個餐點使用，確認刪除？`
                  : `確認刪除「${deleteTarget.name}」？`}
              </p>
              <div className="space-y-1">
                <label className="text-sm font-medium">刪除原因（選填）</label>
                <Textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button onClick={handleDelete} disabled={deleting}>
              {deleting ? "刪除中..." : "確認刪除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
