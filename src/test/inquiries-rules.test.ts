import { describe, expect, it } from "vitest";
import { canTransitionInquiryStatus, INQUIRY_STATUS_VALUES } from "@/lib/manzil/inquiry-status";

describe("inquiry status machine", () => {
  it("includes viewing and negotiating", () => {
    expect(INQUIRY_STATUS_VALUES).toContain("viewing");
    expect(INQUIRY_STATUS_VALUES).toContain("negotiating");
  });
  it("new → contacted", () => expect(canTransitionInquiryStatus("new", "contacted")).toBe(true));
  it("new → viewing", () => expect(canTransitionInquiryStatus("new", "viewing")).toBe(true));
  it("new → converted blocked", () =>
    expect(canTransitionInquiryStatus("new", "converted")).toBe(false));
  it("contacted → negotiating", () =>
    expect(canTransitionInquiryStatus("contacted", "negotiating")).toBe(true));
  it("viewing → negotiating", () =>
    expect(canTransitionInquiryStatus("viewing", "negotiating")).toBe(true));
  it("qualified → converted", () =>
    expect(canTransitionInquiryStatus("qualified", "converted")).toBe(true));
  it("closed is terminal", () => expect(canTransitionInquiryStatus("closed", "new")).toBe(false));
});
