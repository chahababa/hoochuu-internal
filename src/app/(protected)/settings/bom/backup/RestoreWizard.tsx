"use client";

// Ported from Hoochuu-Bom-System/src/app/settings/backup/RestoreWizard.tsx (Phase 3+4d)

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/bom/ui/dialog";
import { Button } from "@/components/bom/ui/button";
import { Input } from "@/components/bom/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/bom/ui/select";
import { toast } from "sonner";
import type { BackupHistoryRow } from "@/lib/bom/types/backup";
import { createClient } from "@/lib/supabase/client";

interface RestoreWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateBackups: BackupHistoryRow[]; // 30 days, status='success'
  ownerActorId: string;
  onSuccess?: () => void;
}

function expectedConfirmation(createdAt: string): string {
  const taipei = new Date(new Date(createdAt).toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `還原 ${taipei.getFullYear()}-${pad(taipei.getMonth() + 1)}-${pad(taipei.getDate())}`;
}

function formatTaipei(ts: string): string {
  return new Date(ts).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}

export function RestoreWizard({
  open,
  onOpenChange,
  candidateBackups,
  ownerActorId,
  onSuccess,
}: RestoreWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedId, setSelectedId] = useState<string>("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => candidateBackups.find((b) => b.id === selectedId) ?? null,
    [candidateBackups, selectedId],
  );

  const expected = selected ? expectedConfirmation(selected.created_at) : "";
  const tableCounts = (selected?.metadata as { table_counts?: Record<string, number> } | null)?.table_counts ?? {};
  const totalRows = Object.values(tableCounts).reduce((a, b) => a + b, 0);

  function reset() {
    setStep(1);
    setSelectedId("");
    setConfirmation("");
    setSubmitting(false);
  }

  async function handleSubmit() {
    if (!selected) return;
    if (confirmation.trim() !== expected) {
      toast.error("確認字串不正確");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/backup-restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          backup_history_id: selected.id,
          owner_confirmation: confirmation.trim(),
          owner_actor_id: ownerActorId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(`還原失敗：${json.error ?? res.status}`);
        setSubmitting(false);
        return;
      }
      toast.success("還原成功");
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(`還原失敗：${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>還原備份（步驟 {step} / 3）</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              選擇近 30 天內的成功備份點作為還原來源。
            </p>
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="選擇備份…" />
              </SelectTrigger>
              <SelectContent>
                {candidateBackups.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {formatTaipei(b.created_at)}（{b.target} / {b.triggered_by}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {candidateBackups.length === 0 && (
              <p className="text-sm text-destructive">近 30 天無成功備份可選</p>
            )}
          </div>
        )}

        {step === 2 && selected && (
          <div className="space-y-3">
            <div className="rounded-md border-2 border-destructive/50 bg-destructive/10 p-3 space-y-2 text-sm">
              <p className="font-bold text-destructive">⚠ 將清空所有業務資料表，由所選備份替換。</p>
              <p>備份時間（台北）：{formatTaipei(selected.created_at)}</p>
              <p>備份大小：{selected.size_bytes ? `${(selected.size_bytes / 1024).toFixed(1)} KB` : "未知"}</p>
              <p>預估還原列數：{totalRows} 列（共 {Object.keys(tableCounts).length} 張表）</p>
              <p className="text-xs">
                注意：query_audit_log 與 monthly_lock_audit 會保留歷史軌跡不被覆蓋。還原前會自動拍一份 pre_restore 快照到 R2 作為安全網。
              </p>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">展開逐表列數</summary>
              <ul className="mt-2 space-y-0.5">
                {Object.entries(tableCounts).map(([t, n]) => (
                  <li key={t} className="font-mono">
                    {t}: {n}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        {step === 3 && selected && (
          <div className="space-y-3">
            <p className="text-sm">
              請在下方輸入框打入確認字串：
              <span className="block mt-1 font-mono font-bold">{expected}</span>
            </p>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={expected}
              autoFocus
            />
            {confirmation.length > 0 && confirmation.trim() !== expected && (
              <p className="text-xs text-destructive">字串不符</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
              上一步
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={!selected || (step === 1 && !selectedId)}
            >
              下一步
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || confirmation.trim() !== expected}
            >
              {submitting ? "還原中…" : "確認還原"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
