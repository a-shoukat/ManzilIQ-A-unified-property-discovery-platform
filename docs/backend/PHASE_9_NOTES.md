# Phase 9 — Testing, CI, deploy docs

## End-of-phase report

### Files added
- `.github/workflows/ci.yml` — lint, test, tsc, build
- `.env.example` — complete env catalog
- `src/test/features.test.ts`, `reminder-rules.test.ts`, `inquiries-rules.test.ts`
- `docs/backend/SQL_RUN_LIST.md`, `QA_CHECKLIST.md`, `ROLLBACK.md`
- `docs/backend/PHASE_9_NOTES.md`

### Files modified
- None required beyond prior phases

### SQL to run
Same as Phase 0 ordered list

### Env vars
Documented in `.env.example`

### Manual verify
1. `npm test && npm run lint && npx tsc --noEmit && npm run build`
2. CI green on PR
3. Walk `QA_CHECKLIST.md` (UI unchanged)

### Rollback
Disable workflow; revert branch.
