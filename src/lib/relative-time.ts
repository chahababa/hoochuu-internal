// Format an ISO timestamp string as a Chinese-localized relative time string.
// Examples: 「剛剛」、「5 分鐘前」、「2 小時前」、「3 天前」、「2026-04-01」(>14 天 fallback to date).

export function formatRelativeTime(isoTimestamp: string, now: Date = new Date()): string {
  const past = new Date(isoTimestamp);
  const deltaMs = now.getTime() - past.getTime();
  if (Number.isNaN(deltaMs) || deltaMs < 0) {
    return formatDate(past);
  }

  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return "剛剛";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分鐘前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;

  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} 天前`;

  return formatDate(past);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
