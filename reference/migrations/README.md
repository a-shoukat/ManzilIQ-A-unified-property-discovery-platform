# ManzilIQ migrations

**Owner-run only** in Supabase → SQL Editor. Never auto-execute against a live DB from the app.

## Ordered run list

1. `00_all_migrations.sql` — consolidated idempotent script (admin-setup through phase12 + backend parity).
2. `10_phase10_ui_support.sql` → `10_5_*.sql` → `11_dealer_sale_forms.sql` → `12_preferred_language.sql` → `13_ops_parity.sql` (additive after tip).
3. `verify_schema.sql` — read-only checks (missing tables, subscription uniqueness, RLS).

See `docs/OPS_RUNBOOK.md` for the full owner order. Individual historical scripts remain under `reference/*.sql`; prefer the consolidated file for new environments.

## Live quirks (do not drop/rename)

- `audit_logs` and `push_tokens` may already exist — scripts use `CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`.
- `subscriptions` may be hybrid (`society_id` UNIQUE + optional `user_id`) — consolidation ensures user_id uniqueness for upserts without recreating the table.
- `reference/source-schema.sql` is **context only** — do not run on an existing project.

## Rollback

See `docs/backend/ROLLBACK.md`. Additive migrations have no automatic down scripts; disable features via env flags instead.
