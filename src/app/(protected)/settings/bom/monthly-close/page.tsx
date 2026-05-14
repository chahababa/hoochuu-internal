"use client";

// Ported from Hoochuu-Bom-System/src/app/settings/monthly-close/page.tsx (Phase 3+4d)

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/bom/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/bom/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/bom/ui/dialog";
import { Textarea } from "@/components/bom/ui/textarea";
import { Badge } from "@/components/bom/ui/badge";
import { toast } from "sonner";
import {
  type MonthlyLockAuditRow,
  type MonthlyLockEventType,
  type MonthlyLockRow,
  periodLabel,
} from "@/lib/bom/types/monthly-lock";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

type MonthCell = {
  year: number;
  month: number;
  lock: MonthlyLockRow | null;
};

function buildRecentMonths(count = 12): { year: number; month: number }[] {
  const taipei = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const out: { year: number; month: number }[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(taipei.getFullYear(), taipei.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out;
}

function formatTs(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}

function eventLabel(e: MonthlyLockEventType): string {
  switch (e) {
    case "lock":
      return "手動鎖定";
    case "auto_lock":
      return "自動鎖定";
    case "unlock":
      return "解鎖";
    case "lock_noop":
      return "重複鎖定（no-op）";
  }
}

export default function MonthlyClosePage() {
  const router = useRouter();
  const recent = useMemo(() => buildRecentMonths(12), []);

  const [authChecked, setAuthChecked] = useState(false);
  const [locks, setLocks] = useState<MonthlyLockRow[]>([]);
  const [audits, setAudits] = useState<MonthlyLockAuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [unlockTarget, setUnlockTarget] = useState<MonthCell | null>(null);
  const [unlockReason, setUnlockReason] = useState("");
  const [acting, setActing] = useState(false);

  useAuditLog({ resource: "monthly-close", action: "view" });

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: lockRows }, { data: auditRows }] = await Promise.all([
      supabase
        .schema("bom")
        .from("monthly_locks")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(24),
      supabase
        .schema("bom")
        .from("monthly_lock_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setLocks((lockRows as MonthlyLockRow[] | null) ?? []);
    setAudits((auditRows as MonthlyLockAuditRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const role = user?.app_metadata?.role as string | undefined;
      if (role !== "owner") {
        router.replace("/");
        return;
      }
      setAuthChecked(true);
      load();
    })();
  }, [load, router]);

  const cells: MonthCell[] = useMemo(
    () =>
      recent.map((m) => ({
        ...m,
        lock: locks.find((l) => l.year === m.year && l.month === m.month) ?? null,
      })),
    [recent, locks],
  );

  async function handleLock(cell: MonthCell) {
    setActing(true);
    const supabase = createClient();
    const { error } = await supabase.schema("bom").rpc("fn_lock_month", {
      p_year: cell.year,
      p_month: cell.month,
    });
    setActing(false);
    if (error) {
      toast.error("鎖定失敗：" + error.message);
      return;
    }
    toast.success(`已鎖定 ${periodLabel(cell.year, cell.month)}`);
    load();
  }

  async function handleUnlock() {
    if (!unlockTarget) return;
    const reason = unlockReason.trim();
    if (!reason) {
      toast.error("請填寫解鎖原因");
      return;
    }
    setActing(true);
    const supabase = createClient();
    const { error } = await supabase.schema("bom").rpc("fn_unlock_month", {
      p_year: unlockTarget.year,
      p_month: unlockTarget.month,
      p_reason: reason,
    });
    setActing(false);
    if (error) {
      toast.error("解鎖失敗：" + error.message);
      return;
    }
    toast.success(`已解鎖 ${periodLabel(unlockTarget.year, unlockTarget.month)}`);
    setUnlockTarget(null);
    setUnlockReason("");
    load();
  }

  if (!authChecked) {
    return <div className="p-8 text-center text-muted-foreground">檢查權限中…</div>;
  }
  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">載入中…</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">月結管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          每月 5 號 03:00（台北）自動鎖定上月。鎖定後該月所有進貨／成本快照／價格變動／警報無法寫入。
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">最近 12 個月</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>月份</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>鎖定時間</TableHead>
              <TableHead>最近解鎖時間</TableHead>
              <TableHead>解鎖原因</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cells.map((c) => {
              const isLocked = c.lock?.status === "locked";
              return (
                <TableRow key={`${c.year}-${c.month}`}>
                  <TableCell className="font-medium">{periodLabel(c.year, c.month)}</TableCell>
                  <TableCell>
                    {c.lock ? (
                      <Badge variant={isLocked ? "secondary" : "outline"}>
                        {isLocked ? "🔒 已鎖" : "已解鎖"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">未鎖</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{formatTs(c.lock?.locked_at ?? null)}</TableCell>
                  <TableCell className="text-xs">
                    {formatTs(c.lock?.last_unlocked_at ?? null)}
                  </TableCell>
                  <TableCell className="text-xs">{c.lock?.last_unlock_reason ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {isLocked ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={acting}
                        onClick={() => {
                          setUnlockTarget(c);
                          setUnlockReason("");
                        }}
                      >
                        解鎖
                      </Button>
                    ) : (
                      <Button size="sm" disabled={acting} onClick={() => handleLock(c)}>
                        鎖定
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">事件記錄</h2>
        {audits.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無事件</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>時間</TableHead>
                <TableHead>月份</TableHead>
                <TableHead>事件</TableHead>
                <TableHead>原因</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{formatTs(a.created_at)}</TableCell>
                  <TableCell>{periodLabel(a.year, a.month)}</TableCell>
                  <TableCell>{eventLabel(a.event_type)}</TableCell>
                  <TableCell className="text-xs">{a.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <Dialog
        open={unlockTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setUnlockTarget(null);
            setUnlockReason("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              解鎖 {unlockTarget ? periodLabel(unlockTarget.year, unlockTarget.month) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              解鎖後該月恢復可寫入。請填寫原因，本筆操作會記錄並寄信通知老闆與店長。
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">解鎖原因</label>
              <Textarea
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                rows={3}
                placeholder="例：補登 4/30 進貨"
              />
              {unlockReason.trim().length === 0 && (
                <p className="text-xs text-destructive">請填寫解鎖原因</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUnlockTarget(null)}>
              取消
            </Button>
            <Button
              onClick={handleUnlock}
              disabled={acting || unlockReason.trim().length === 0}
            >
              {acting ? "處理中…" : "確認解鎖"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
