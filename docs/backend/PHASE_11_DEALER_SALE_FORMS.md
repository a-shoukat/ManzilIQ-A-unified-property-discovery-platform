# Phase 11 — Dealer Urdu sale receipt / booking form

## SQL (run in order)
1. `reference/migrations/10_phase10_ui_support.sql` (if Phase 10 tables missing)
2. `reference/migrations/11_dealer_sale_forms.sql`

## Routes (flat)
- `/dealer-form-settings`
- `/dealer-forms` · `/dealer-forms/new` · `/dealer-forms/$id`
- `/f/$token` (public)

## Key behaviors
- Serial allocated at **Issue** via `allocate_dealer_form_serial` (`SELECT … FOR UPDATE`)
- Drafts have `serial_no = null`
- Cancel keeps share token (watermark); revoke clears token + `revoked_at`
- Public page masks CNIC/phone; no dealer_id in public DTO
- PDF: HTML print-to-PDF with Noto Nastaliq (Phase 10.5 approach) + PNG via html-to-image

## App copy
`src/lib/manzil/phase11-copy/sale-forms.ts` — printed form labels stay Urdu in the sheet.
