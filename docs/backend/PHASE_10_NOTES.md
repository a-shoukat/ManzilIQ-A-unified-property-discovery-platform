# Phase 10 — Missing screens (UI for Phases 1–8 backends)

## End-of-phase report

### Files added
- Routes: `my-inquiries`, `inquiries`, `admin-moderation`, `admin-cms`, `admin-audit`, `settings.notifications`, `payment-history`, `admin-status`
- Libs: `inquiry-crm`, `moderation-ui`, `cms`, `audit-ui`, `notification-prefs`, `payment-history`, `system-status`
- `reference/migrations/10_phase10_ui_support.sql`
- Tests: `inquiry-crm.test.ts`, `phase10-ui.test.ts`

### Files modified (nav / guards only)
- `src/lib/manzil/access.ts` — role keys for new pages
- `src/components/manzil/PageFrame.tsx` — sidebar + account menu links
- `src/routes/profile.tsx` — notification preferences link
- `src/routes/admin.tsx` — hub cards for new admin screens
- `src/routeTree.gen.ts` — regenerated

### SQL to run
`reference/migrations/10_phase10_ui_support.sql` (after Phases 0–9 parity SQL)

### Env
- Optional: `VITE_REQUIRE_LISTING_APPROVAL=true` for moderation gating notice

### Needs decision
See store doc `docs/manziliq-phase10-summary.md` — `/my-payments` untouched; homepage CMS not wired; inquiry statuses match Phase 4 DB.

### CI fix
Phase 9 workflow used `actions/setup-node` with `cache: npm` but the repo only has `bun.lock`, so the **test** job failed before install. Workflow now uses `oven-sh/setup-bun` + vitest/tsc/build. Full-repo `eslint` remains skipped in CI (pre-existing Prettier debt).

### Spec-gap follow-up (`cursor/phase10-spec-gaps-dcf3`)
- Isolatable copy: `src/lib/manzil/phase10-copy/{inquiries,notifications,moderation,cms,audit,payments,status}.ts`
- Screen 6: Phase 3 PDF receipt server fn MISSING → PDF download button skipped on `/payment-history`

### Verify
`bunx tsc --noEmit` · `bunx vitest run` · `bun run build`
