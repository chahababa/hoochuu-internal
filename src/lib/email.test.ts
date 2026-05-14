import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  sendMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn(function ResendMock() {
    return {
      emails: {
        send: mocks.sendMock,
      },
    };
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mocks.fromMock,
  }),
}));

function queryResult(data: unknown, error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data, error })),
    })),
  };
}

function inspectionQueryResult(data: unknown, error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data, error })),
      })),
    })),
  };
}

function usersQueryResult(data: unknown, error: unknown = null) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        or: vi.fn(() => Promise.resolve({ data, error })),
      })),
    })),
  };
}

describe("sendInspectionCompletedEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.sendMock.mockReset();
    mocks.fromMock.mockReset();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("skips sending when Resend config is missing", async () => {
    const { sendInspectionCompletedEmail } = await import("@/lib/email");

    await expect(sendInspectionCompletedEmail("inspection-1")).resolves.toEqual({
      ok: false,
      reason: "config_missing",
    });
    expect(mocks.fromMock).not.toHaveBeenCalled();
    expect(mocks.sendMock).not.toHaveBeenCalled();
  });

  it("sends inspection report email to store leader, managers, and owners by BCC", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "reports@example.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://stores.example.com/";

    const inspectionRow = {
      id: "inspection-1",
      date: "2026-05-14",
      time_slot: "午班",
      total_score: 2.25,
      store_id: "store-1",
      stores: { id: "store-1", name: "好初測試店" },
      users: { email: "inspector@example.com", name: "巡店員" },
    };
    const scoreRows = [
      {
        score: 1,
        note: "冰箱溫度需追蹤 <確認>",
        applied_tag_types: ["critical"],
        inspection_items: { name: "冰箱溫度", categories: { name: "食安" } },
      },
      {
        score: 3,
        note: null,
        applied_tag_types: [],
        inspection_items: { name: "服務招呼", categories: { name: "服務" } },
      },
    ];
    const recipientRows = [
      { email: "owner@example.com", role: "owner", store_id: null },
      { email: "manager@example.com", role: "manager", store_id: null },
      { email: "leader@example.com", role: "leader", store_id: "store-1" },
      { email: "Leader@Example.com", role: "leader", store_id: "store-1" },
    ];

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === "inspections") return inspectionQueryResult(inspectionRow);
      if (table === "inspection_scores") return queryResult(scoreRows);
      if (table === "users") return usersQueryResult(recipientRows);
      throw new Error(`unexpected table: ${table}`);
    });
    mocks.sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });

    const { sendInspectionCompletedEmail } = await import("@/lib/email");
    const result = await sendInspectionCompletedEmail("inspection-1");

    expect(result).toEqual({ ok: true, recipientCount: 3, messageId: "email-1" });
    expect(mocks.sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "reports@example.com",
        to: "reports@example.com",
        bcc: ["owner@example.com", "manager@example.com", "leader@example.com"],
        subject: expect.stringContaining("[巡店通知] 好初測試店 2026-05-14 午班"),
        text: expect.stringContaining("查看完整報告：\nhttps://stores.example.com/inspection/history/inspection-1"),
        html: expect.stringContaining("冰箱溫度需追蹤 &lt;確認&gt;"),
      }),
    );
  });
});
