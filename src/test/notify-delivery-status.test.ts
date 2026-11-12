import { describe, expect, it } from "vitest";
import { deliveryStatusFromResult } from "@/lib/manzil/notify-status";
import { bumpReminderCount, emptyReminderCounts } from "@/lib/manzil/reminder-counts";

describe("deliveryStatusFromResult", () => {
  it("marks sent when ok", () => {
    expect(deliveryStatusFromResult(true, "sent")).toBe("sent");
  });
  it("skips when env missing", () => {
    expect(deliveryStatusFromResult(false, "email_not_configured")).toBe("skipped");
    expect(deliveryStatusFromResult(false, "sms_not_configured")).toBe("skipped");
    expect(deliveryStatusFromResult(false, "fcm_not_configured")).toBe("skipped");
    expect(deliveryStatusFromResult(false, "skipped_no_email")).toBe("skipped");
  });
  it("fails on transport errors", () => {
    expect(deliveryStatusFromResult(false, "email_http_500")).toBe("failed");
    expect(deliveryStatusFromResult(false, "sms_http_401")).toBe("failed");
  });
});

describe("reminder job counts", () => {
  it("bumps each kind", () => {
    const c = emptyReminderCounts();
    bumpReminderCount(c, "t_minus_3");
    bumpReminderCount(c, "due");
    bumpReminderCount(c, "overdue");
    bumpReminderCount(c, "escalation");
    expect(c).toEqual({ t_minus_3: 1, due: 1, overdue: 1, escalated: 1 });
  });
});
