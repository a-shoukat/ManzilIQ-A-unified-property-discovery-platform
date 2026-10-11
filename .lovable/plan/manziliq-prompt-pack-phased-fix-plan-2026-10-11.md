# ManzilIQ Prompt Pack: phased fix plan

The pack contains 15 prompts. That's too much to build safely in one go, so I'll do it in phases and test each phase signed in with the test accounts before moving on. This plan covers **Phase 1 (all bug fixes)** and lists the later phases.

## Phase 1: Bugs (Prompts 1-6 and 12)
I'll reproduce each bug first, then fix and re-test it.

1. **Deleting a lead freezes the page.** Add an "Are you sure?" box, delete properly, refresh the list, and show "Lead deleted" or a clear error. No freezing.
2. **Buyers see no societies under "Book a plot".** Buyers will see every society that has available plots. They see only those plots, nothing private.
3. **Dealers' Discover page shows "No verified societies yet".** Dealers will see all approved societies and can send join requests and track them.
4. **Super admin "Add plot" always fails to save.** It will use the same save step as the society admin, with the chosen society passed in explicitly.
5. **Receipt shows the wrong amount.** The receipt will print the amount actually paid, with the late fee on its own line.
6. **"Blacklisted" badge flickers on first load.** Show "Loading…" until the account is fetched. Show "Blacklisted" only when the account really is blacklisted.
7. **Data quality fixes (Prompt 12):**
   - Fix the Karachi price-per-marla figure in Market trends.
   - Leave reserved, sold and token-paid plots out of "Assign lot".
   - Hide the "Pay" button on PKR 0 installment rows.
   - Save each account's Compare list separately and clear it on sign-out.
   - First installment due date set 30 days after booking, so no fee is charged on the same day.

If any of these fixes needs a database permission change, I'll give you one SQL snippet to run, the same way as before.

## Later phases (each one gets its own plan once Phase 1 is done)
- **Phase 2 (Prompt 7):** Add user from Admin, edit/delete listings, wishlist, Profile & Settings page.
- **Phase 3 (Prompts 8 and 10):** Dealer books for a customer, commissions, society broadcast, freeze a plot during a dispute, plot map upload, Kanal unit, inquiries, cancellation letter, fraud alerts.
- **Phase 4 (Prompts 13 and 15):** Detailed listings like Zameen (gallery, amenities, similar properties, contact reveal, report, featured, freshness, saved-search alerts).
- **Phase 5 (Prompt 14):** Fill the property form by speaking, in Urdu and English.
- **Phase 6 (Prompt 9):** Real JazzCash and EasyPaisa payments, SMS/email/push, OTP, Google login. This phase needs your merchant and SMS provider accounts and keys.
- **Prompt 11 (rentals, Wanted, area guides):** a roadmap, built only after the phases above.

## Technical details
- Bug 1: `dealer-leads.tsx` delete handler. Await the delete, guard against the infinite reload loop, use an AlertDialog and sonner toasts.
- Bugs 2 and 3: queries in `booking.ts` / `dealer.ts`. Check for over-filtering, such as the 406/`.single()` lookups that previously stopped listing loops, or a row-level-security (RLS) mismatch. Confirm with real data reads.
- Bug 4: `society.ts` addPlot takes `society_id` explicitly from the selector.
- Bug 5: `payment.ts` / receipt view prints `amount`, with `late_fee` as its own line.
- Bug 6: `dashboard.tsx` status badge falls back to a loading state.
- Compare: storage key includes the user id and is cleared when the user signs out.
- Tests: one test for each rule (no Pay on PKR 0, due date at +30 days, assignable-plot filter, receipt amount).
