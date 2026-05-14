import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "@/lib/relative-time";

describe("formatRelativeTime", () => {
  const now = new Date("2026-05-14T10:00:00Z");

  it("returns 剛剛 for <60s ago", () => {
    expect(formatRelativeTime("2026-05-14T09:59:30Z", now)).toBe("剛剛");
    expect(formatRelativeTime("2026-05-14T10:00:00Z", now)).toBe("剛剛");
  });

  it("returns X 分鐘前 for 1-59 min ago", () => {
    expect(formatRelativeTime("2026-05-14T09:55:00Z", now)).toBe("5 分鐘前");
    expect(formatRelativeTime("2026-05-14T09:01:00Z", now)).toBe("59 分鐘前");
  });

  it("returns X 小時前 for 1-23 hr ago", () => {
    expect(formatRelativeTime("2026-05-14T07:00:00Z", now)).toBe("3 小時前");
    expect(formatRelativeTime("2026-05-13T11:00:00Z", now)).toBe("23 小時前");
  });

  it("returns X 天前 for 1-13 days ago", () => {
    expect(formatRelativeTime("2026-05-13T10:00:00Z", now)).toBe("1 天前");
    expect(formatRelativeTime("2026-05-01T10:00:00Z", now)).toBe("13 天前");
  });

  it("falls back to date format for >=14 days", () => {
    expect(formatRelativeTime("2026-04-30T10:00:00Z", now)).toBe("2026-04-30");
  });

  it("returns date for future timestamps", () => {
    expect(formatRelativeTime("2026-05-15T10:00:00Z", now)).toBe("2026-05-15");
  });

  it("returns date for invalid timestamps", () => {
    expect(formatRelativeTime("not-a-date", now)).toMatch(/Invalid|NaN|\d{4}-\d{2}-\d{2}/);
  });
});
