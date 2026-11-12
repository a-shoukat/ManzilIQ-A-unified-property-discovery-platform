# i18n Areas 0–6 — status

**Branch:** `cursor/i18n-urdu-phase10-11-dcf3` (PR #10)  
**Default:** English first visit; English markup/classNames unchanged aside from `t()` swaps + language switch control.

## Route name mapping

| Informal / wrong | Actual |
| --- | --- |
| `/my-payments` (history) | `/payment-history` |
| Installment schedule | `/my-payments` (unchanged) |
| Dealer forms | `/dealer-forms` |
| Form settings | `/dealer-form-settings` |
| Public sale receipt | `/f/$token` |

## Area status

| Area | Status | Review sheet |
| --- | --- | --- |
| 0 phase10/11 copy → keys | Done | `review-sheets/area-0-phase10-11-copy.md` |
| 1 setup + switch + RTL + common/auth | Done | `review-sheets/area-1-setup-auth.md` |
| 2 marketplace / compare / wishlist / maps | Done | `review-sheets/area-2-marketplace.md` |
| 3 dealer (+ form chrome; printed form always Urdu) | Done | `review-sheets/area-3-dealer.md` |
| 4 society + booking + payments + `/payment-history` | Done | `review-sheets/area-4-society-booking-payments.md` |
| 5 legal + receipts (`preferred_language` on PDF) | Done | `review-sheets/area-5-legal-receipts.md` |
| 6 admin + notifications + errors + validation + gates | Done | `review-sheets/area-6-admin-notifications-gates.md` |

## Namespaces (13)

`common`, `auth`, `marketplace`, `dealer`, `society`, `booking`, `payments`, `legal`, `admin`, `inquiries`, `notifications`, `errors`, `validation` — en + ur under `src/locales/`.

## Quality gates

| Gate | Status |
| --- | --- |
| `bun run i18n:check` (en/ur key parity) | Pass |
| `bun run i18n:report` (hardcoded candidates) | Pass (reports residual secondary screens) |
| Vitest `src/test/i18n.test.ts` (switch, lang/dir, fallback, formatters) | Pass |
| Typecheck / build | Pass |
| Playwright EN baseline + UR 375/1280 overflow | **Not in repo** — see Needs decision |

## Deliverables

- `docs/i18n/GLOSSARY.md`
- `docs/i18n/QA_CHECKLIST.md`
- `docs/i18n/ROLLBACK.md` (remove switch → stays English)
- Review sheets Areas 0–6
- Migration `reference/migrations/12_preferred_language.sql`

## NEEDS NATIVE REVIEW

- Marketing login headlines; CMS hero DB seed copy; long legal template bodies; residual `i18n:report` strings on analytics/AI/master-plan

## Needs decision

1. **Playwright visual baselines** — no Playwright dependency or baseline suite in repo yet. Adding it would be a new tooling package + CI job; deferred so English pixel gate is manual/`QA_CHECKLIST.md` until approved.
2. Secondary hardcoded chrome (`RoleOverview`, `MasterPlanWorkspace`, `AiAssistant`, etc.) — incremental follow-up; not blocking primary flows.
3. Optional society_admin read of dealer forms (Phase 11) — skipped earlier.
