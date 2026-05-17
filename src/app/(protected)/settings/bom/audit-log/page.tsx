"use client";

// Ported from Hoochuu-Bom-System/src/app/settings/audit-log/page.tsx (Phase 3+4d)

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchClientUserProfile } from "@/lib/bom/client-profile";
import { Button } from "@/components/bom/ui/button";
import { Input } from "@/components/bom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/bom/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/bom/ui/table";
import { toast } from "sonner";
import type { QueryAuditLogRow } from "@/lib/bom/types/audit-log";
import { useAuditLog } from "@/lib/bom/hooks/use-audit-log";

const PAGE_SIZE = 50;
const CSV_LIMIT = 5000;
const ALL = "__all__";

type UserOption = { id: string; email: string };

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function formatTaipei(ts: string): string {
  return new Date(ts).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}

export default function AuditLogPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  // 自身也要記 audit（meta：誰看過 audit）
  useAuditLog({ resource: "audit-log", action: "view" });

  // Filters
  const [userFilter, setUserFilter] = useState<string>(ALL);
  const [resourceFilter, setResourceFilter] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState<string>(isoDaysAgo(30));
  const [dateTo, setDateTo] = useState<string>(isoDaysAgo(0));

  // Data
  const [rows, setRows] = useState<QueryAuditLogRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filter dropdown sources
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [resourceOptions, setResourceOptions] = useState<string[]>([]);

  const userMap = useMemo(
    () => new Map(userOptions.map((u) => [u.id, u.email])),
    [userOptions],
  );

  // Auth check
  useEffect(() => {
    (async () => {
      const profile = await fetchClientUserProfile();
      const role = profile?.role;
      if (role !== "owner" && role !== "manager") {
        router.replace("/");
        return;
      }
      setAuthChecked(true);
    })();
  }, [router]);

  // Load filter dropdown data once
  useEffect(() => {
    if (!authChecked) return;
    const supabase = createClient();
    (async () => {
      const { data: usersRow } = await supabase
        .schema("bom")
        .from("query_audit_log")
        .select("user_id")
        .order("created_at", { ascending: false })
        .limit(500);
      const ids = Array.from(new Set((usersRow ?? []).map((r) => r.user_id as string)));
      if (ids.length > 0) {
        const { data: emails } = await supabase
          .from("users")
          .select("id, email")
          .in("id", ids);
        setUserOptions(((emails as UserOption[] | null) ?? []).sort((a, b) => a.email.localeCompare(b.email)));
      }

      const { data: rs } = await supabase
        .schema("bom")
        .from("query_audit_log")
        .select("resource")
        .order("created_at", { ascending: false })
        .limit(1000);
      const distinct = Array.from(new Set((rs ?? []).map((r) => r.resource as string))).sort();
      setResourceOptions(distinct);
    })();
  }, [authChecked]);

  const buildQuery = useCallback(() => {
    const supabase = createClient();
    let q = supabase
      .schema("bom")
      .from("query_audit_log")
      .select("*")
      .gte("created_at", dateFrom)
      .lte("created_at", `${dateTo}T23:59:59`);
    if (userFilter !== ALL) q = q.eq("user_id", userFilter);
    if (resourceFilter !== ALL) q = q.eq("resource", resourceFilter);
    return q.order("created_at", { ascending: false });
  }, [dateFrom, dateTo, userFilter, resourceFilter]);

  const load = useCallback(async () => {
    if (!authChecked) return;
    setLoading(true);
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;
    const { data } = await buildQuery().range(start, end + 1);
    const arr = (data as QueryAuditLogRow[] | null) ?? [];
    setHasMore(arr.length > PAGE_SIZE);
    setRows(arr.slice(0, PAGE_SIZE));
    setLoading(false);
  }, [authChecked, page, buildQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- BOM-ported on-mount fetch
    load();
  }, [load]);

  // Reset page on filter change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- BOM-ported pagination reset
    setPage(0);
  }, [userFilter, resourceFilter, dateFrom, dateTo]);

  async function handleExport() {
    setExporting(true);
    const { data } = await buildQuery().limit(CSV_LIMIT + 1);
    const arr = (data as QueryAuditLogRow[] | null) ?? [];
    if (arr.length > CSV_LIMIT) {
      toast.warning(`結果超過 ${CSV_LIMIT} 筆，CSV 已截斷至前 ${CSV_LIMIT} 筆`);
    }
    const truncated = arr.slice(0, CSV_LIMIT);

    const header = ["created_at_taipei", "user_email", "user_role", "user_store_id", "resource", "action", "params"];
    const lines = [header.join(",")];
    for (const r of truncated) {
      const email = userMap.get(r.user_id) ?? r.user_id;
      const cells = [
        formatTaipei(r.created_at),
        email,
        r.user_role,
        r.user_store_id ?? "",
        r.resource,
        r.action,
        JSON.stringify(r.params ?? {}),
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }

    const csvBom = "﻿" + lines.join("\n");
    const blob = new Blob([csvBom], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  if (!authChecked) {
    return <div className="p-8 text-center text-muted-foreground">檢查權限中…</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">查詢審計日誌</h1>
        <p className="text-sm text-muted-foreground mt-1">
          記錄誰、何時看過敏感資料（成本 / 價格 / 警報 / 進貨 / 月結 / 配方 / 基準線）。預設顯示近 30 天，最多保留 1 年。
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">使用者</label>
          <Select value={userFilter} onValueChange={(v) => setUserFilter(v ?? ALL)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部</SelectItem>
              {userOptions.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">資源</label>
          <Select value={resourceFilter} onValueChange={(v) => setResourceFilter(v ?? ALL)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>全部</SelectItem>
              {resourceOptions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">起始日期</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">結束日期</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {loading ? "載入中…" : `第 ${page + 1} 頁、本頁 ${rows.length} 筆`}
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? "匯出中…" : "匯出 CSV"}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>時間（台北）</TableHead>
            <TableHead>使用者</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>資源</TableHead>
            <TableHead>動作</TableHead>
            <TableHead>條件 / params</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                沒有符合條件的紀錄
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs whitespace-nowrap">{formatTaipei(r.created_at)}</TableCell>
              <TableCell className="text-xs">{userMap.get(r.user_id) ?? r.user_id.slice(0, 8)}</TableCell>
              <TableCell className="text-xs">{r.user_role}</TableCell>
              <TableCell className="text-xs">{r.resource}</TableCell>
              <TableCell className="text-xs">{r.action}</TableCell>
              <TableCell className="text-xs font-mono break-all">
                {r.params ? JSON.stringify(r.params) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || loading}
        >
          ← 上一頁
        </Button>
        <span className="text-xs text-muted-foreground">第 {page + 1} 頁</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore || loading}
        >
          下一頁 →
        </Button>
      </div>
    </div>
  );
}
