# Phase 5 — Admin backend

## End-of-phase report

### Files added
- `src/lib/manzil/audit.ts` — `writeAudit`, `fetchAuditLogs`, listing moderation helpers

### Files modified
- None required for existing admin pages

### SQL to run
Extend existing `audit_logs` (IF NOT EXISTS); `properties.moderation_status|moderated_at|moderated_by`

### Env vars
None new

### Manual verify
1. `writeAudit({ actorId, action: 'listing.moderate', ... })` inserts without recreating table
2. `setListingModeration` updates property + audit row
3. `fetchPendingModeration` lists pending

### Needs UI decision
- Formal pre-publish moderation queue UI; audit log browser; homepage CMS — skipped (UI risk)

### Rollback
Leave columns; stop calling helpers.
