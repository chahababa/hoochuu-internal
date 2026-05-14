"use client";

// Ported from Hoochuu-Bom-System/src/lib/hooks/use-backup-history.ts (Phase 3+4b)
// Rewrites: .from("backup_history") → .schema("bom").from("backup_history"),
// .rpc("fn_trigger_backup") → .schema("bom").rpc("fn_trigger_backup"),
// import paths to @/lib/bom/types/*.

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type {
  BackupHistoryRow,
  BackupTarget,
  BackupTriggeredBy,
} from "@/lib/bom/types/backup";

interface UseBackupHistoryOptions {
  pageSize?: number;
  daysWindow?: number;
}

export function useBackupHistory(opts: UseBackupHistoryOptions = {}) {
  const pageSize = opts.pageSize ?? 50;
  const daysWindow = opts.daysWindow ?? 90;

  const [rows, setRows] = useState<BackupHistoryRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const since = new Date();
    since.setDate(since.getDate() - daysWindow);
    const start = page * pageSize;
    const end = start + pageSize - 1;
    const { data } = await supabase
      .schema("bom")
      .from("backup_history")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .range(start, end + 1);
    const arr = (data as BackupHistoryRow[] | null) ?? [];
    setHasMore(arr.length > pageSize);
    setRows(arr.slice(0, pageSize));
    setLoading(false);
  }, [page, pageSize, daysWindow]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- on-mount data fetching pattern, BOM-ported
    load();
  }, [load]);

  const triggerBackup = useCallback(
    async (target: BackupTarget, triggeredBy: BackupTriggeredBy = "manual") => {
      const supabase = createClient();
      const { error } = await supabase.schema("bom").rpc("fn_trigger_backup", {
        p_target: target,
        p_triggered_by: triggeredBy,
      });
      return error?.message ?? null;
    },
    [],
  );

  return { rows, page, setPage, hasMore, loading, reload: load, triggerBackup };
}
