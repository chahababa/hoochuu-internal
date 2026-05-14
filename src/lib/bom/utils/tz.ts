// Ported from Hoochuu-Bom-System/src/lib/utils/tz.ts (Phase 3+4b)

import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "Asia/Taipei";

/**
 * Format a date in Asia/Taipei timezone.
 */
export function formatTaipei(date: Date | string | number, formatStr: string): string {
  const zonedDate = toZonedTime(new Date(date), TIMEZONE);
  return format(zonedDate, formatStr);
}

/**
 * Get current date/time in Asia/Taipei timezone.
 */
export function nowTaipei(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Convert a timestamp to a date string (yyyy-MM-dd) in Asia/Taipei timezone.
 */
export function toTaipeiDate(timestamp: Date | string | number): string {
  return formatTaipei(timestamp, "yyyy-MM-dd");
}
