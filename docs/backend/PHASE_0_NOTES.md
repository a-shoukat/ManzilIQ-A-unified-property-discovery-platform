# Phase 0 — DB parity & health flags

## End-of-phase report

### Files added
- `reference/migrations/00_all_migrations.sql` — consolidated owner-run migrations + backend parity
- `reference/migrations/verify_schema.sql` — read-only verification queries
- `reference/migrations/README.md` — ordered run list
- `src/lib/manzil/features.ts` — public feature flags + mode summary
- `src/lib/manzil/health.functions.ts` — server `getBackendHealth`
- `docs/backend/PHASE_0_NOTES.md`

### Files modified
- None (additive)

### SQL to run
1. `reference/migrations/00_all_migrations.sql`
2. `reference/migrations/verify_schema.sql`

### Env vars
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (existing)
- Health reports readiness for later-phase secrets (no new required secrets for Phase 0)

### Manual verify
1. Run consolidated SQL in Supabase SQL Editor
2. Run verify_schema; confirm no missing tables; `subscriptions_user_id_unique` true
3. Call `getBackendHealth` from a server context / later admin probe — mode is `demo` without secrets

### Rollback
Stop using new tables; leave columns in place (additive). Revert app commit if needed. Do not DROP live tables.
