/** Phase 10 Screen 6 — isolatable copy for Phase 12 Urdu. */
export const PAYMENTS_COPY = {
  buyerTitle: "Payment history & receipts",
  societyTitle: "Society payment history",
  subtitle: "Gateway references, receipts, verification",
  myPayments: "My payments",
  financials: "Financials",
  dashboard: "Dashboard",
  skipNote:
    "Existing /my-payments and society financials screens were not modified (Absolute Rule). This additive page lists payments (+ gateway columns). Phase 3 PDF receipt server function is MISSING — PDF download button skipped.",
  loading: "Loading…",
  empty: "No payment transactions yet.",
  booking: "Booking",
  installment: "Installment",
  amount: "Amount",
  status: "Status",
  gatewayRef: "Gateway ref",
  verifyReceipt: "Verify receipt",
  verificationHash: "Verification hash",
  checkHash: "Check hash",
  verifiedOk: "Receipt verified — hash matches.",
  verifiedFail: "Verification failed — hash does not match this payment.",
  loadError: "Could not load payment history",
} as const;
