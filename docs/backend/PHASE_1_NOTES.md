# Phase 1 — Real notifications

## End-of-phase report

### Files added
- `src/lib/manzil/notify-channels.functions.ts` — email/SMS/FCM server dispatch
- `src/lib/manzil/push-tokens.ts` — register/fetch push tokens (existing table)
- `src/lib/manzil/env-server.ts` — server env helpers
- `docs/backend/PHASE_1_NOTES.md`

### Files modified
- `src/lib/manzil/notify.ts` — in-app insert + best-effort external fan-out + delivery log

### SQL to run
Covered by Phase 0 parity: `push_tokens`, `notification_deliveries`

### Env vars
- `RESEND_API_KEY` / `NOTIFY_EMAIL_API_KEY`, `OTP_FROM_EMAIL` / `NOTIFY_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
- `FCM_SERVER_KEY`

### Manual verify
1. Without secrets: `notify()` still creates inbox rows only
2. With Resend/Twilio: delivery rows appear in `notification_deliveries`
3. Register a push token via `registerPushToken` then notify — FCM attempted when key set

### Rollback
Unset messaging env vars → external channels skip; in-app path unchanged.
