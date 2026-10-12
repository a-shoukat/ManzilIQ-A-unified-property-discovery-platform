# Fix: receipt amount, double booking, and 4 small issues

## What the database shows
- Plot A-101 (Block A) is still marked **available** even though two bookings use it: BK-3SLCEC86 (token paid) and TST-297F4636 (approved). Approving a booking never actually changed the plot's status (the write is silently refused), so the "available plots" filter can't catch it. This is the real cause of the double booking.
- TST-297F4636 does point to a plot (the same A-101). It is the duplicate booking. It probably shows no plot because the person viewing it can't read that plot.
- The confirmed down payment is stored as PKR 69.5 Lakh plus a PKR 1.39 Lakh late fee (70.9 Lakh total). The Payments page receipt already lists both, so the wrong "Installment Amount" line must come from another receipt view (the generated receipt document or the society's payment screens). Step 1 below finds it.
- The dealer sidebar already reads "Commissions" in the current code. Likely only the published site is out of date. I'll check every screen for the misspelling.

## Fixes

1. **Receipt.** Find every receipt view and make each print the same thing:
   - Amount paid (the transaction total)
   - Installment amount
   - Late fee (its own line)
   - **Total paid**, which always equals what was actually paid

   The generated receipt document will include these amounts too.
2. **Plot list in "Book a plot" and "Book for customer".** Hide any plot that is reserved or sold, or that already has an active booking (pending, approved, token paid or completed), even if its status is out of date.
3. **Booking check in the database.** A new safety rule stops a booking being saved for a plot that is not available or is already booked. The app then shows "This plot is no longer available". This works even if someone skips the app.
4. **Approving a booking really reserves the plot.** If that update is refused, the app shows an error instead of failing silently. The SQL also allows the society and super admin to update their plots' status, and fixes the status of plots that are already booked (A-101 becomes reserved).
5. **Duplicate booking TST-297F4636.** The bookings screens show "Plot details unavailable" when a plot can't be read, instead of a blank. The SQL lists duplicate bookings so you can decide which to cancel. I won't delete anything automatically.
6. **Dealer list in "Assign lot".** It shows "-- (--)" because the society can't read the dealer's name and firm. A small database function will return the name, firm and email of approved dealers, and the list will show "Name — Firm (email)".
7. **Sidebar spelling.** Check every label and fix any "Commisions".
8. **CSV tip.** Change it to "Tip: Create the sheet in Excel, choose File > Save as > CSV, then upload it here."

## You will need to do
Run a new `reference/phase7-fixes.sql` file in the Supabase SQL Editor, the same way as before.

## How I'll check it
- Tests for: the receipt total equals the paid amount, booked plots are left out of the list, and the "no longer available" message appears.
- After you run the SQL:
  - As test-buyer: A-101 is not in the list, and booking an available plot end to end gives a reference number.
  - As super admin: approve the booking, then confirm a payment. The receipt amount must equal the paid amount.
  - Then I clean up the test data, or give you the delete lines.

## Technical details
- `phase7-fixes.sql`:
  - A BEFORE INSERT trigger on bookings that raises "This plot is no longer available" when the plot's status is not available/assigned, or it already has a booking that is pending, approved, token_paid or completed.
  - An UPDATE policy on plots for the society owner and super admin.
  - A backfill that sets plots with approved, token_paid or completed bookings to reserved (sold for completed).
  - A `list_society_dealers(society_id)` SECURITY DEFINER RPC.
- `fetchAvailablePlots` and the dealer-book filter remove the plot ids of active bookings. `approveBooking` checks with `.select('id')` that the plot update changed a row.
- The receipt shows `amount`, `late_fee` and `receiptTotal` everywhere, and the `installment_receipt` template gets an `{{amount}}` built from the payment.
