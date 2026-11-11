# Phase 11 — Dealer Urdu sale receipt / booking form

## Status

**Complete (Groups 1–4)** on branch stack ending in `cursor/i18n-urdu-phase10-11-dcf3` / PR #10 (also originally shipped on `cursor/dealer-sale-forms-flat-dcf3`).

## Name mapping

| Spec / informal | Actual in repo |
| --- | --- |
| payments | `public.payments` |
| bookings / plots | `public.bookings`, `public.plots` |
| audit | `writeAudit` → `public.audit_logs` |
| notification_deliveries | unchanged (Phase 10 status screen) |
| setListingModeration | existing admin moderation helper |
| `/my-payments` history | **`/payment-history`** (installments stay `/my-payments`) |
| dealer forms list | `/dealer-forms` |
| form settings | `/dealer-form-settings` |
| form editor | `/dealer-forms/new`, `/dealer-forms/$id` |
| public share | `/f/$token` |
| amounts edited flag | `amounts_manually_edited` (legacy `totals_edited` backfilled if present) |
| PDF | HTML print-to-PDF + embedded Noto Nastaliq (`dealer-sale-form-pdf.ts` / `noto-nastaliq-embed.ts`) + PNG via `html-to-image` |

## SQL (run in order)

1. `reference/migrations/10_phase10_ui_support.sql` (if Phase 10 tables missing)
2. `reference/migrations/11_dealer_sale_forms.sql` — settings, forms, `allocate_dealer_form_serial`, `dealer-logos` bucket + RLS

## Routes (flat)

| Path | Access |
| --- | --- |
| `/dealer-form-settings` | dealer write; super_admin read-only |
| `/dealer-forms` | dealer / super_admin |
| `/dealer-forms/new?bookingId=` | dealer (autofill from booking + payments) |
| `/dealer-forms/$id` | dealer / super_admin |
| `/f/$token` | public; masked CNIC/phone; no dealer_id |

## Existing-file edits (allowed)

1. `PageFrame.tsx` — one dealer nav link (`saleForms` → `/dealer-forms`)
2. `access.ts` — `dealer-forms`, `dealer-form-settings`
3. `dealer-leads.tsx` — `GenerateSaleFormButton` (sibling button style)
4. `types` / lead `booking_id` for CTA autofill (supporting)
5. `routeTree.gen.ts` regenerated; `html-to-image` dependency

## Group checklist

### Group 1 — SQL + `/dealer-form-settings`
- Tables: `dealer_form_settings`, `dealer_sale_forms`
- Logo upload/replace/remove → `dealer-logos` (png/jpg/webp, max 2 MB, own folder)
- Live header preview + Reset to default (Afridi seed in `DEFAULT_FORM_SETTINGS` only)

### Group 2 — list + editor + autofill + issue
- List: search buyer/serial, status filter, create / open / duplicate / cancel
- Editor until Issue; serial assigned at Issue via `allocate_dealer_form_serial` (`FOR UPDATE`)
- Server math: `total_received` / `balance_amount`; read-only unless manual override → `(ترمیم شدہ)`
- `writeAudit` on create, issue, cancel, revoke, regenerate

### Group 3 — layout + print + PDF
- Sheet mirrors `reference/mockups/Afridi_Estate_Form_Mockup.html`
- RTL ruled rows in paper order; blank signature lines `دستخط فروخت کنندہ` / `دستخط مینجر`
- Print A5/A4 + `print-color-adjust: exact`
- PDF HTML embeds Noto Nastaliq woff2 (no Google Fonts at PDF render)

### Group 4 — share
- Web Share / WhatsApp (`+92`) / Copy link / regenerate / revoke
- Public `/f/$token`: masked PII, verified note; cancelled → `منسوخ`; revoked → unavailable page

## Manual QA

1. Run `11_dealer_sale_forms.sql` in Supabase
2. Dealer → Sale forms → Form settings → logo + colors + live preview → Reset
3. Lead with booking → Generate Form → confirm autofill → Issue (serial appears; draft had none)
4. Print A5/A4 (dark header prints) → Download PDF HTML → PNG
5. Share: copy `/f/…`, open incognito → masked CNIC/phone
6. Cancel → watermark `منسوخ`; Revoke → “link unavailable”
7. Confirm marketplace / login / society hub visuals unchanged

## Screenshot checklist

- [ ] Settings live preview (letterhead)
- [ ] Draft editor + autofill
- [ ] Issued sheet (serial, amounts, signatures)
- [ ] Public masked page
- [ ] Cancelled watermark
- [ ] Generate Form on dealer leads

## Rollback

- Remove routes under `dealer-forms*`, `dealer-form-settings`, `f.$token`
- Remove `src/lib/manzil/dealer-sale-form*`, `phase11-copy`, components, tests, mockup, font embed assets
- Revert nav link, access entries, Generate Form CTA; regenerate `routeTree`
- **Do not DROP** live `dealer_form_settings` / `dealer_sale_forms` / storage bucket

## Needs decision

- Optional `society_admin` read of society dealers’ forms — skipped (would widen gates)
- Server Chromium binary PDF — not added; HTML print-to-PDF + PNG used (Phase 10.5 pattern)

## Env vars

None expected.
