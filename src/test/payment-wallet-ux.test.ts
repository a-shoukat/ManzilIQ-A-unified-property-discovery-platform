import { describe, expect, it } from "vitest";
import { walletUiFlags } from "@/lib/manzil/payment-gateway.functions";

describe("wallet UX flags", () => {
  it("shows DEMO chrome in mock mode", () => {
    expect(walletUiFlags("mock")).toEqual({
      showDemoBadge: true,
      showDemoOtpHint: true,
      showDemoFoot: true,
    });
  });

  it("hides DEMO chrome in live mode", () => {
    expect(walletUiFlags("live")).toEqual({
      showDemoBadge: false,
      showDemoOtpHint: false,
      showDemoFoot: false,
    });
  });
});
