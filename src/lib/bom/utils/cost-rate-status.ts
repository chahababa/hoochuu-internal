// Ported from Hoochuu-Bom-System/src/lib/utils/cost-rate-status.ts (Phase 3+4b)

export type CostRateStatus = "green" | "yellow" | "red" | "gray" | "pending";

export function getCostRateStatus(
  rate: number | null | undefined,
  target: number | null | undefined,
  warning: number | null | undefined,
): CostRateStatus {
  if (rate == null || target == null || warning == null) return "gray";
  if (rate <= target) return "green";
  if (rate <= warning) return "yellow";
  return "red";
}

// 區分「未指派 baseline」與「baseline 已指派但 snapshot 還沒算」(s12-followup-fixes BUG-009)
//   hasBaseline=false                                 → "gray"   (未指派)
//   hasBaseline=true, rate/target/warning 任一為空    → "pending" (待計算)
//   hasBaseline=true, 都有值                          → 既有四色邏輯
export function getDishOverviewStatus(
  rate: number | null | undefined,
  target: number | null | undefined,
  warning: number | null | undefined,
  hasBaseline: boolean,
): CostRateStatus {
  if (!hasBaseline) return "gray";
  if (rate == null || target == null || warning == null) return "pending";
  if (rate <= target) return "green";
  if (rate <= warning) return "yellow";
  return "red";
}

export const STATUS_COLORS: Record<CostRateStatus, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  gray: "bg-gray-300",
  pending: "bg-white border border-gray-400",
};

export const STATUS_LABELS: Record<CostRateStatus, string> = {
  green: "達標",
  yellow: "偏高",
  red: "超標",
  gray: "未指派",
  pending: "待計算",
};
