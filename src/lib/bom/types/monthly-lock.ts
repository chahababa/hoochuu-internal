// Ported from Hoochuu-Bom-System/src/lib/types/monthly-lock.ts (Phase 3+4b)

export type MonthlyLockStatus = "locked" | "unlocked";

export type MonthlyLockEventType = "lock" | "unlock" | "lock_noop" | "auto_lock";

export interface MonthlyLockRow {
  year: number;
  month: number;
  status: MonthlyLockStatus;
  locked_at: string;
  locked_by: string | null;
  last_unlocked_at: string | null;
  last_unlocked_by: string | null;
  last_unlock_reason: string | null;
}

export interface MonthlyLockAuditRow {
  id: string;
  event_type: MonthlyLockEventType;
  year: number;
  month: number;
  actor_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function periodLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function previousTaipeiMonth(now: Date = new Date()): { year: number; month: number } {
  const taipei = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const firstOfThis = new Date(taipei.getFullYear(), taipei.getMonth(), 1);
  const lastOfPrev = new Date(firstOfThis.getTime() - 24 * 60 * 60 * 1000);
  return { year: lastOfPrev.getFullYear(), month: lastOfPrev.getMonth() + 1 };
}

export function isDateInLockedMonth(
  date: string | null | undefined,
  lockedMonths: { year: number; month: number; status: MonthlyLockStatus }[],
): boolean {
  if (!date) return false;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return lockedMonths.some((l) => l.year === y && l.month === m && l.status === "locked");
}
