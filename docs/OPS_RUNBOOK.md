# ManzilIQ ops runbook (owner)

Code ships migrations and server paths; **only the owner** can apply SQL on live Supabase and set secrets. This runbook is the exact order for production parity.

## 1. Apply SQL on live Supabase (exact order)

In **Supabase → SQL Editor**, run each file top-to-bottom. Prefer one-shot consolidated where noted. Never run `reference/source-schema.sql` against an existing project.

1. `reference/migrations/00_all_migrations.sql` — consolidated idempotent base (admin through phase12 + backend parity tables including `notification_deliveries`, `reminder_runs`, geo columns, gateway cols).
2. `reference/migrations/10_phase10_ui_support.sql` — `notification_preferences`, `site_banners`, `site_content`, moderation/hash helpers.
3. `reference/migrations/10_5_homepage_cms_seed.sql` — homepage CMS seed (safe if banners already exist).
4. `reference/migrations/10_5_inquiry_statuses.sql` — inquiry status extensions if not already in tip.
5. `reference/migrations/11_dealer_sale_forms.sql` — dealer sale forms / serial allocation.
6. `reference/migrations/12_preferred_language.sql` — `profiles.preferred_language` (`en`|`ur`).
7. `reference/migrations/13_ops_parity.sql` — `reminder_job_runs` summary rows for cron counts (Task 3).
8. `reference/migrations/14_subscription_society_grant.sql` — nullable `society_id` + backfill so society plan grants succeed on hybrid live schema.
9. `reference/migrations/15_anon_public_read.sql` — anon SELECT for plots/properties + `list_societies` (no KYC/doc columns) so guests can open `/master-plan`.
10. `reference/migrations/verify_schema.sql` — **read-only** checks; fix any reported missing tables/columns before go-live.
11. *(optional DEV-ONLY)* `reference/migrations/16_dev_seed_test_society_growth.sql` — set test society email/UUID; seeds `society_details` + Growth grant for map unlock.

All scripts are idempotent (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`). Re-running is safe.

Confirm in app: **Admin → System status** → Migration state should move toward **ok** after SQL + env.

## 2. Environment variables

Copy from `.env.example`. **Never** put service/merchant secrets in `VITE_*` keys.

| Variable | Purpose | If missing |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Public Supabase URL | App stays offline / demo listings |
| `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`) | Public anon key | Same |
| `SUPABASE_URL` | Server URL (cron / admin client) | Reminder job returns `needs_credentials` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/cron only | Reminder scan inert; migration probe may be `unknown` |
| `RESEND_API_KEY` / `NOTIFY_EMAIL_API_KEY` | Email OTP + notify | Email channel skipped; logged as `skipped` / `email_not_configured` |
| `OTP_FROM_EMAIL` / `NOTIFY_FROM_EMAIL` | From address | Defaults to Resend onboarding sender |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM` | SMS OTP + notify | SMS skipped / mock OTP path for signup |
| `NOTIFY_SMS_API_KEY` | Optional SMS alias | Same as Twilio missing |
| `FCM_SERVER_KEY` (or `FIREBASE_SERVICE_ACCOUNT_JSON`) | Push | FCM skipped; in-app only |
| `JAZZCASH_MERCHANT_ID` + `JAZZCASH_PASSWORD` + `JAZZCASH_INTEGRITY_SALT` | Live JazzCash | Wallet stays **mock** (DEMO OTP `123456`) |
| `JAZZCASH_API_URL` | Optional JazzCash endpoint | Sandbox default URL used when live |
| `EASYPAISA_STORE_ID` + `EASYPAISA_PASSWORD` | Live EasyPaisa | Wallet stays **mock** for EasyPaisa |
| `EASYPAISA_API_URL` / `EASYPAISA_MERCHANT_EMAIL` | Optional EasyPaisa | Defaults used when live |
| `REMINDER_CRON_SECRET` | Authorize reminder cron | Job returns `unauthorized`; scheduler inert |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JS / Embed | Layer-1 pins use **Leaflet OSM** fallback (no error) |
| `VITE_AI_ESTIMATE_URL` / `AI_ESTIMATE_*` | Remote AI | Local estimator only |
| `OTP_SECRET` | OTP HMAC | Demo OTP path when messaging unset |

## 3. Schedule the reminder cron

Server function: `runInstallmentReminders` (POST) with body `{ "secret": "<REMINDER_CRON_SECRET>" }`.

Call it on a schedule (e.g. daily 09:00 Asia/Karachi) via any external cron that can hit your deployed TanStack server route / function URL:

```bash
# Example shape — replace URL with your deployed server-fn endpoint
curl -sS -X POST "$APP_ORIGIN/api/reminders" \
  -H "Content-Type: application/json" \
  -d "{\"data\":{\"secret\":\"$REMINDER_CRON_SECRET\"}}"
```

Exact path depends on your TanStack Start deploy. From the app you can also invoke the exported `runInstallmentReminders({ data: { secret } })` from a trusted server worker.

**Requires:** `REMINDER_CRON_SECRET` + `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Messaging keys optional (in-app still written; email/SMS skipped gracefully).

Each successful invocation inserts:

- Per-payment rows in `reminder_runs` (unique on `payment_id, kind`)
- One summary row in `reminder_job_runs` with counts for T-3 / due / overdue / escalated

Check **Admin → System status** for last reminder timestamp and counts.

## 4. Smoke after ops

1. Admin status: mode `partial` or `live`; integrations match env.
2. Signup OTP: live channels if Resend/Twilio set; else demo code.
3. Wallet charge: DEMO when merchant env missing; live mode hides DEMO badge.
4. Reminder: one manual cron call → `reminder_job_runs` row.
5. Full path: see `docs/E2E_APPROVE_BOOK_CHARGE_RECEIPT_TRANSFER.md`.

## 5. Rollback (ops)

Unset secrets → mock/demo paths return. Do **not** DROP live tables. See `docs/backend/ROLLBACK.md`.
