# Dealer Urdu Sale Receipt / Booking Form

## Mapping (repo actual → feature)

| Feature need | Actual in repo |
| --- | --- |
| Bookings | `public.bookings` via `src/lib/manzil/booking.ts` (`createBooking`, enrich) |
| Plots / price / size | `public.plots` (`size_marla`, `base_price`, `block`, `plot_no`) |
| Buyer CNIC/phone/address | `public.customer_details` + `profiles.full_name` |
| Token / installments | `bookings.token_amount` + `public.payments` (`status`, `label`, `amount`, `due_date`) |
| Audit on issue/cancel | `writeAudit` → `public.audit_logs` (Phase 5) |
| Storage pattern | Same as `listing-photos` / `documents`; new bucket `dealer-logos` |
| Dealer role gate | `canAccessPage('dealer', …)` (nested `/dealer/*` uses first segment) |
| Deal detail CTA | `dealer-leads` lead row (+ optional booking via `lead.booking_id`) |

## SQL to run
`reference/migrations/11_dealer_sale_forms.sql` (after Phases 0–10 SQL)

## Files added
- Routes: `dealer.form-settings`, `dealer.forms`, `dealer.forms.new`, `dealer.forms.$id`, `f.$token`
- Libs: `dealer-sale-form-math.ts`, `dealer-sale-forms.ts`
- Components: `DealerSaleFormSheet`, `DealerSaleFormEditor`, `DealerSaleFormActions`, `GenerateSaleFormButton`
- Tests: `dealer-sale-forms.test.ts`
- Dep: `html-to-image`

## Existing files modified
- `PageFrame.tsx` — dealer nav links for forms + settings
- `dealer.tsx` — hub cards + Outlet for nested `/dealer/*` (hub at exact `/dealer` unchanged visually aside from new cards)
- `dealer-leads.tsx` — Generate Form button
- `dealer.ts` / `types.ts` — additive `booking_id` on leads for autofill CTA
- `routeTree.gen.ts` — regenerated
- `bun.lock` — html-to-image

## Env vars
None new.

## Needs decision
1. **society_admin optional access** — nested under `/dealer` which is dealer/super_admin only; granting society would open all dealer pages. Skipped.
2. **Server-side PDF with embedded Nastaliq** — uses Print → Save as PDF + PNG via `html-to-image` (browser path).
3. **dealer-commissions Generate Form** — skipped to avoid changing commissions table layout.

## Verify
`bunx tsc --noEmit` · `bunx vitest run` · `bun run build`
