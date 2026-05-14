"use client";

// Ported from Hoochuu-Bom-System/src/components/dashboard/MonthlyCloseCard.tsx (Phase 3+4c)
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/bom/ui/card";
import { Button } from "@/components/bom/ui/button";
import { Badge } from "@/components/bom/ui/badge";
import { toast } from "sonner";
import {
  type MonthlyLockRow,
  periodLabel,
  previousTaipeiMonth,
} from "@/lib/bom/types/monthly-lock";

export function MonthlyCloseCard() {
  const [role, setRole] = useState<string | null>(null);
  const [lock, setLock] = useState<MonthlyLockRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const target = useMemo(() => previousTaipeiMonth(), []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [{ data: { user } }, { data: lockRow }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .schema("bom")
        .from("monthly_locks")
        .select("*")
        .eq("year", target.year)
        .eq("month", target.month)
        .maybeSingle(),
    ]);
    setRole((user?.app_metadata?.role as string | undefined) ?? null);
    setLock((lockRow as MonthlyLockRow | null) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLockNow() {
    setActing(true);
    const supabase = createClient();
    const { error } = await supabase.schema("bom").rpc("fn_lock_month", {
      p_year: target.year,
      p_month: target.month,
    });
    setActing(false);
    if (error) {
      toast.error("鎖定失敗：" + error.message);
      return;
    }
    toast.success(`已鎖定 ${periodLabel(target.year, target.month)}`);
    load();
  }

  const isLocked = lock?.status === "locked";
  const period = periodLabel(target.year, target.month);
  const isOwner = role === "owner";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>月結狀態</span>
          {!loading && (
            <Badge variant={isLocked ? "secondary" : "outline"}>
              {isLocked ? "🔒 已鎖" : "⏳ 補註中"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">載入中…</p>
        ) : (
          <>
            <div className="text-sm">
              <span className="text-muted-foreground">上月：</span>
              <span className="font-medium">{period}</span>
            </div>
            {isLocked && lock?.locked_at && (
              <div className="text-xs text-muted-foreground">
                鎖定於 {new Date(lock.locked_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
              </div>
            )}
            {!isLocked && lock?.last_unlocked_at && (
              <div className="text-xs text-muted-foreground">
                最近解鎖：{new Date(lock.last_unlocked_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
                {lock.last_unlock_reason ? `（${lock.last_unlock_reason}）` : ""}
              </div>
            )}
            {!isLocked && !lock && (
              <div className="text-xs text-muted-foreground">
                每月 5 號 03:00 將自動鎖定上月
              </div>
            )}
            {isOwner && (
              <div className="flex gap-2 pt-2">
                {!isLocked && (
                  <Button size="sm" onClick={handleLockNow} disabled={acting}>
                    {acting ? "處理中…" : `提早鎖定 ${period}`}
                  </Button>
                )}
                <Link href="/settings/monthly-close">
                  <Button size="sm" variant="ghost">月結管理</Button>
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
