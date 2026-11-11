import { describe, expect, it } from "vitest";
import { replySchema, unreadInquiryCount, INQUIRY_STATUSES } from "@/lib/manzil/inquiry-crm";
import type { Inquiry } from "@/lib/manzil/inquiries";

const base = (status: Inquiry["status"]): Inquiry => ({
  id: "1",
  property_id: null,
  owner_id: "o",
  inquirer_id: "i",
  name: "A",
  email: null,
  phone: null,
  message: "hi",
  status,
  lead_id: null,
  created_at: "",
  updated_at: "",
});

describe("inquiry CRM UI helpers", () => {
  it("exposes Phase 4 status filters", () => {
    expect(INQUIRY_STATUSES).toEqual([
      "new",
      "contacted",
      "viewing",
      "negotiating",
      "qualified",
      "converted",
      "closed",
    ]);
  });

  it("counts unread as status=new", () => {
    expect(unreadInquiryCount([base("new"), base("contacted"), base("new")])).toBe(2);
  });

  it("validates reply body with zod", () => {
    expect(replySchema.safeParse({ body: "" }).success).toBe(false);
    expect(replySchema.safeParse({ body: "  Thanks  " }).success).toBe(true);
  });
});
