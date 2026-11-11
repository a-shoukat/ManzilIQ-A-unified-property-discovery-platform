# Phase 4 — Inquiry CRM backend

## End-of-phase report

### Files added
- `src/lib/manzil/inquiries.ts` — create/list/status/reply/link-to-lead
- `src/test/inquiries-rules.test.ts`

### Files modified
- `src/lib/manzil/phase3.ts` — `sendInquiry` persists via `createInquiry`
- `src/routes/property.$id.tsx` — passes `propertyId` / `inquirerId` (no markup change)

### SQL to run
`inquiries`, `inquiry_replies` (+ RLS)

### Env vars
None new

### Manual verify
1. Send inquiry from property page → row in `inquiries` + owner notification
2. `setInquiryStatus` / `replyToInquiry` / `linkInquiryToLead` from console or future UI

### Needs UI decision
- Agent reply thread UI, status pipeline screen, conversion analytics — backend ready, no new screens added

### Rollback
`sendInquiry` falls back to notify-only if table missing. Stop writing replies.
