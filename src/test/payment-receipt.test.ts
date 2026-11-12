import { describe, expect, it } from "vitest";
import {
  buildAuthorizedReceiptHtml,
  isDemoGatewayPayment,
  receiptHashOf,
  verificationQrSvg,
} from "@/lib/manzil/payment-receipt";
import { computeVerificationHash, verifyReceiptHash } from "@/lib/manzil/payment-history";
import { receiptPdfInputSchema } from "@/lib/manzil/payment-receipt";
import type { GatewayPayment } from "@/lib/manzil/payment-history";

const sample: GatewayPayment = {
  id: "11111111-1111-4111-8111-111111111111",
  booking_id: "22222222-2222-4222-8222-222222222222",
  customer_id: "33333333-3333-4333-8333-333333333333",
  society_id: "44444444-4444-4444-8444-444444444444",
  amount: 250000,
  method: "jazzcash",
  proof_url: null,
  status: "confirmed",
  due_date: null,
  paid_at: "2026-11-11T10:00:00Z",
  late_fee: 0,
  receipt_no: "RCP-TEST01",
  label: "Installment 1/12",
  created_at: "2026-11-11T10:00:00Z",
  booking_ref: "BK-1",
  gateway: "jazzcash",
  gateway_txn_id: "DEMO-JC-ABC123",
};

describe("payment receipt PDF helpers", () => {
  it("marks DEMO when gateway txn is mock", () => {
    expect(isDemoGatewayPayment(sample)).toBe(true);
    expect(
      isDemoGatewayPayment({ ...sample, gateway_txn_id: "JC-LIVE-1", gateway: "jazzcash" }),
    ).toBe(false);
  });

  it("embeds verification hash matching Verify receipt logic", () => {
    const hash = receiptHashOf(sample);
    expect(hash).toBe(computeVerificationHash(sample));
    expect(verifyReceiptHash(sample, hash)).toBe(true);
    const html = buildAuthorizedReceiptHtml({
      payment: sample,
      buyerName: "Ali Buyer",
      plotLabel: "A / 12",
      societyName: "Green Valley",
    });
    expect(html).toContain(hash);
    expect(html).toContain("DEMO");
    expect(html).toContain("Noto Nastaliq Urdu");
    expect(html).toContain("Source Sans 3");
    expect(html).toContain("Ali Buyer");
    expect(html).toContain("Green Valley");
    expect(html).toContain("A / 12");
    expect(html).toContain('content: "ManzilIQ"');
    expect(verificationQrSvg(hash)).toContain("<svg");
  });

  it("validates zod input", () => {
    expect(
      receiptPdfInputSchema.safeParse({
        paymentId: sample.id,
        accessToken: "x".repeat(24),
      }).success,
    ).toBe(true);
    expect(
      receiptPdfInputSchema.safeParse({ paymentId: "nope", accessToken: "short" }).success,
    ).toBe(false);
  });
});
