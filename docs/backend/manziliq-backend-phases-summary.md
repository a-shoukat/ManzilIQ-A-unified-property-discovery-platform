# ManzilIQ backend Phases 0–9 — summary

**Repo:** `a-shoukat/design-spark-cloud`  
**Branch:** `cursor/manziliq-backend-phases-85dd`  
**UI:** unchanged (no layout/copy/className changes except logic-only wiring)

## Phase status

| Phase | Task | Status | Notes |
| --- | --- | --- | --- |
| 0 DB parity | MAN-9 | **Done** | `reference/migrations/00_all_migrations.sql` + `verify_schema.sql` + `getBackendHealth` |
| 1 Notifications | MAN-10 | **Done** | Email/SMS/FCM server dispatch; in-app fallback; `notification_deliveries` |
| 2 Reminders | MAN-11 | **Done** | T-3/due/overdue/escalation cron fn; needs `REMINDER_CRON_SECRET` + service role |
| 3 Payments | MAN-12 | **Done** | `chargeWallet` JazzCash/EasyPaisa + mock fallback; DEMO badge copy unchanged |
| 4 Inquiry CRM | MAN-13 | **Done** (backend) | `inquiries` + replies + status machine; **Needs UI decision** for thread UI |
| 5 Admin backend | MAN-14 | **Done** (backend) | Extend live `audit_logs`; moderation helpers; **Needs UI decision** for queue/CMS |
| 6 AI pricing | MAN-15 | **Done** (infra) | Remote estimate hook + `price_predictions`; local estimator default; **Needs credentials**/dataset for ML |
| 7 Maps | MAN-16 | **Done** (no layout) | Geo columns + embed key path + pin builder; **Needs UI decision** for Markers/Directions |
| 8 Security | MAN-17 | **Done** | Rate limits on OTP/charge; checklist; CSRF already present |
| 9 Tests/CI/docs | MAN-18 | **Done** | Vitest + CI workflow + `.env.example` + QA/rollback/SQL run list |

## Gap-report mapping (high level)

| Gap area | Outcome |
| --- | --- |
| Owner DB parity | Consolidated idempotent SQL + verify |
| Real JazzCash/EasyPaisa | Server path behind env; mock without secrets |
| SMS/email/FCM notify | Wired; skipped when env missing |
| Reminder scheduler | Server cron fn; owner must schedule + secrets |
| Inquiry CRM | Persist + reply APIs; no new screens |
| AI / Flask ML | Hook only; local heuristics remain |
| Google Maps Layer-1 suite | Infra only; no map layout change |
| Flutter/Express/OWASP ZAP/SUS | **Skipped** (platform / academic deliverables) |

## Ordered SQL

1. `reference/migrations/00_all_migrations.sql`
2. `reference/migrations/verify_schema.sql`

Respect live quirks: existing `audit_logs`, `push_tokens`; hybrid `subscriptions` (user_id unique ensured without drop/rename).

## Env

See repo `.env.example` and `docs/backend/PHASE_*_NOTES.md`.

## Verify locally

`npm test` (100 passed), `npx tsc --noEmit`, `npm run build` — green. Full-repo `npm run lint` still has pre-existing Prettier debt outside this change set; new files lint clean.

## Rollback

`docs/backend/ROLLBACK.md` — unset env flags; never DROP live tables.
