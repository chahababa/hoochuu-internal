"use client";

// Ported from Hoochuu-Bom-System/src/app/settings/backup/page.tsx (Phase 3+4d)

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchClientUserProfile } from "@/lib/bom/client-profile";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/bom/ui/select";
import { Badge } from "@/components/bom/ui/badge";
import { toast } from "sonner";
import { useBackupHistory } from "@/lib/bom/hooks/use-backup-history";
import type { BackupTarget, BackupHistoryRow } from "@/lib/bom/types/backup";
import { RestoreWizard } from "./RestoreWizard";

function formatTaipei(ts: string): string {
  return new Date(ts).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}

function formatBytes(b: number | null): string {
  if (b == null) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function targetLabel(t: string): string {
  return t === "r2" ? "R2" : t === "gdrive" ? "Drive" : t;
}

function triggeredByLabel(t: string): string {
  return t === "cron" ? "自動" : t === "manual" ? "手動" : t === "pre_restore" ? "還原前快照" : t;
}

function statusBadge(s: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    pending: { label: "進行中", variant: "outline" },
    success: { label: "✅ 成功", variant: "secondary" },
    failed: { label: "❌ 失敗", variant: "destructive" },
    purged: { label: "已清除", variant: "outline" },
  };
  const conf = map[s] ?? { label: s, variant: "outline" as const };
  return <Badge variant={conf.variant}>{conf.label}</Badge>;
}

export default function BackupPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [actorId, setActorId] = useState<string>("");
  const [trigOpen, setTrigOpen] = useState(false);
  const [trigTarget, setTrigTarget] = useState<BackupTarget>("r2");
  const [trigSubmitting, setTrigSubmitting] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const { rows, page, setPage, hasMore, loading, reload, triggerBackup } = useBackupHistory();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const profile = await fetchClientUserProfile();
      if (profile?.role !== "owner") {
        router.replace("/");
        return;
      }
      setActorId(user?.id ?? "");
      setAuthChecked(true);
    })();
  }, [router]);

  const restoreCandidates = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- BOM-ported: snapshot 30-day window at render time
    const now = Date.now();
    return rows.filter(
      (r) =>
        r.status === "success" &&
        now - new Date(r.created_at).getTime() < 30 * 24 * 60 * 60 * 1000,
    ) as BackupHistoryRow[];
  }, [rows]);

  async function handleTrigger() {
    setTrigSubmitting(true);
    const err = await triggerBackup(trigTarget, "manual");
    setTrigSubmitting(false);
    if (err) {
      toast.error(`觸發失敗：${err}`);
      return;
    }
    toast.success(`已觸發 ${targetLabel(trigTarget)} 備份，30 秒內列表會出現新紀錄`);
    setTrigOpen(false);
    setTimeout(() => reload(), 5000);
  }

  async function handleDownload(row: BackupHistoryRow) {
    if (row.status !== "success" || !row.object_key) {
      toast.error("此備份無法下載");
      return;
    }
    if (row.target === "gdrive") {
      const m = row.object_key.match(/^gdrive:\/\/[^/]+\/(.+)$/);
      if (m) {
        window.open(`https://drive.google.com/file/d/${m[1]}/view`, "_blank");
      } else {
        toast.error("Google Drive 物件路徑格式不對");
      }
      return;
    }
    // R2 — 呼叫 backup-export 的同捆 endpoint 或另一 lightweight function 產 presigned URL
    // 簡化：直接告訴 owner 用 SQL 取出 presigned URL（cli 場景），UI 暫不實作
    // 實際上需另一個輕量 Edge Function `backup-presign` 才能 client-side 產 URL
    // 本 sprint 暫不實作，留待下個 sprint
    toast.message("R2 下載連結請從 Cloudflare Dashboard 自行取得 (S18 暫不支援 UI 直接下載)");
  }

  if (!authChecked) {
    return <div className="p-8 text-center text-muted-foreground">檢查權限中…</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">備份還原</h1>
          <p className="text-sm text-muted-foreground mt-1">
            三層備份：L1 Supabase 自帶（7 天）/ L2 Cloudflare R2 每日（30 天）/ L3 Google Drive 每月（12 個月）。
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setTrigOpen(true)}>立即備份</Button>
          <Button variant="outline" onClick={() => setRestoreOpen(true)}>
            還原…
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>時間（台北）</TableHead>
            <TableHead>觸發</TableHead>
            <TableHead>目標</TableHead>
            <TableHead>狀態</TableHead>
            <TableHead className="text-right">大小</TableHead>
            <TableHead>備註 / 錯誤</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                尚無備份紀錄
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs whitespace-nowrap">{formatTaipei(r.created_at)}</TableCell>
              <TableCell className="text-xs">{triggeredByLabel(r.triggered_by)}</TableCell>
              <TableCell className="text-xs">{targetLabel(r.target)}</TableCell>
              <TableCell>{statusBadge(r.status)}</TableCell>
              <TableCell className="text-right text-xs">{formatBytes(r.size_bytes)}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                {r.error_message ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => handleDownload(r)}>
                  下載
                </Button>
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

      {/* 立即備份 dialog */}
      <Dialog open={trigOpen} onOpenChange={setTrigOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>立即備份</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              備份會壓縮 + 加密整個業務資料，上傳到所選位置。預估 30 秒內完成。
            </p>
            <Select value={trigTarget} onValueChange={(v) => setTrigTarget((v ?? "r2") as BackupTarget)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="r2">Cloudflare R2（L2 每日層）</SelectItem>
                <SelectItem value="gdrive">Google Drive（L3 每月封存層）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTrigOpen(false)} disabled={trigSubmitting}>
              取消
            </Button>
            <Button onClick={handleTrigger} disabled={trigSubmitting}>
              {trigSubmitting ? "觸發中…" : "確認備份"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 還原 wizard */}
      <RestoreWizard
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        candidateBackups={restoreCandidates}
        ownerActorId={actorId}
        onSuccess={reload}
      />
    </div>
  );
}
