"use client";

// Ported from Hoochuu-Bom-System/src/lib/hooks/use-monthly-lock-status.ts (Phase 3+4b)
// Rewrites: .from("monthly_locks") → .schema("bom").from("monthly_locks"),
// import paths to @/lib/bom/types/*.

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { MonthlyLockRow } from "@/lib/bom/types/monthly-lock";

export function useMonthlyLockStatus() {
  const [locks, setLocks] = useState<MonthlyLockRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .schema("bom")
      .from("monthly_locks")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(24);
    setLocks((data as MonthlyLockRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- on-mount data fetching pattern, BOM-ported
    reload();
  }, [reload]);

  const isDateLocked = useCallback(
    (date: string | null | undefined): boolean => {
      if (!date) return false;
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return false;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      return locks.some((l) => l.year === y && l.month === m && l.status === "locked");
    },
    [locks],
  );

  return { locks, loading, reload, isDateLocked };
}
