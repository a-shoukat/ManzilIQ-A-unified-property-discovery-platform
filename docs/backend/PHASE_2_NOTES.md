# Phase 2 — Installment reminders

## End-of-phase report

### Files added
- `src/lib/manzil/reminder-rules.ts` — T-3 / due / overdue / escalation pure rules
- `src/lib/manzil/reminders.functions.ts` — `runInstallmentReminders` cron server fn
- `src/test/reminder-rules.test.ts`
- `docs/backend/PHASE_2_NOTES.md`

### Files modified
- None beyond Phase 1 shared notify channels

### SQL to run
`reminder_runs` table (in `00_all_migrations.sql`)

### Env vars
- `REMINDER_CRON_SECRET` (required to authorize job)
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (required to scan payments)
- Messaging keys from Phase 1 for SMS/email delivery

### Manual verify
1. Without service role / secret → job returns `needs_credentials` / `unauthorized`
2. Seed a pending payment due today; run job with secret → notification + `reminder_runs` row
3. Re-run → unique (payment_id, kind) prevents duplicates

### Rollback
Unset `REMINDER_CRON_SECRET`; stop cron. Rows in `reminder_runs` are historical only.
