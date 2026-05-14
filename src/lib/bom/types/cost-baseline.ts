// Ported from Hoochuu-Bom-System/src/lib/types/cost-baseline.ts (Phase 3+4b)

export type CostBaseline = {
  id: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  delete_reason: string | null;

  name: string;
  category: string | null;
  target_cost_rate: number;
  warning_cost_rate: number;
  scope_key: string;
  notes: string | null;
};

export function toPercent(rate: number | null | undefined): string {
  if (rate == null) return "-";
  return `${(rate * 100).toFixed(1)}%`;
}

export function fromPercent(input: string): number | null {
  const n = parseFloat(input);
  if (Number.isNaN(n)) return null;
  return n / 100;
}
