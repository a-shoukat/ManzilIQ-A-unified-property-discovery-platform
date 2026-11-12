# E2E checklist — approve → book → charge → receipt → transfer

Manual (or future Playwright) path. Run on an environment where Phase 0–13 SQL is applied and at least Supabase public keys are set.

## Preconditions

- [ ] Owner applied SQL per `docs/OPS_RUNBOOK.md`
- [ ] Test accounts: `super_admin`, approved `society_admin`, approved `buyer` (and optional `dealer`)
- [ ] Society has at least one **available** plot with price / installment plan
- [ ] Optional: JazzCash/EasyPaisa sandbox env for live charge; otherwise DEMO OTP `123456`

## Steps

### 1. Approve

- [ ] As super_admin → `/admin-verification`: approve pending society/buyer if needed
- [ ] Confirm profiles show `verification_status = approved`

### 2. Book

- [ ] As buyer → `/book-plot` (or dealer book flow): select society/plot, submit booking
- [ ] As society_admin → `/society-bookings`: approve booking → stage advances; installment schedule created
- [ ] Note booking reference / id

### 3. Charge

- [ ] As buyer → `/my-payments` (or `/payment-history`): open a due installment
- [ ] Pay with JazzCash or EasyPaisa
  - Mock: DEMO badge visible; OTP `123456`; numbers ending `0000` decline
  - Live: no DEMO badge / demo OTP hint; real gateway response
- [ ] Or bank/cash/cheque: upload/record proof unchanged
- [ ] As society_admin: confirm pending payment

### 4. Receipt

- [ ] Buyer/society → `/payment-history`: confirmed payment shows gateway ref
- [ ] Download / generate PDF receipt (`generatePaymentReceiptPdf`)
- [ ] Verify receipt hash succeeds

### 5. Transfer

- [ ] Advance booking pipeline to transfer stage (society/admin booking UI)
- [ ] Approve transfer → plot **sold**; legal docs / locker entry present
- [ ] Buyer sees sold status; society inventory reflects sold

## Pass criteria

| Gate | Pass |
| --- | --- |
| Approve | Role can use gated pages |
| Book | Booking + schedule rows exist |
| Charge | Payment confirmed (mock or live) |
| Receipt | PDF + hash verify |
| Transfer | Plot sold + docs |

## Fail / fallback notes

- Missing merchant env → mock charge only (still valid for E2E if society confirms)
- Missing Resend/Twilio/FCM → in-app notifications only; delivery log shows skipped
- Missing cron secret → skip reminder assertion; charge/receipt/transfer still valid
