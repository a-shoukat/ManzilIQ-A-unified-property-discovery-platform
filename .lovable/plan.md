# Role dashboards: Buyer, Dealer, Society Admin + full audit

Each role gets a proper management dashboard after login, in the same full-width style as the super admin dashboard.

## Buyer dashboard
- Stats: My bookings, Pending bookings, Payments made, Amount due, Saved/compared properties, Unread notifications.
- "Needs attention": next payment due, bookings awaiting society approval, recent notifications.
- Quick cards: Browse marketplace, Book a plot, My bookings, My payments, Documents, Compare, Price estimator, My activity, Inbox.

## Dealer dashboard
- Stats: My lots, Active listings, New leads, Leads this month, Bookings closed, Total sales value.
- "Needs attention": newest uncontacted leads, lots without photos/price.
- Quick cards: Dealer portal, Discover societies, My lots, Leads, Add listing, Performance, Documents, Inbox.

## Society admin dashboard
- Stats: Total plots, Available, Booked/sold, Pending booking requests, Linked dealers, Collected revenue.
- "Needs attention": pending booking requests (Approve/Review), overdue installments, dealer join requests.
- Quick cards: Inventory, Society map, Booking requests, Dealers, Financials, Sales analytics, Broadcast, Add listing, Documents.

## Shared behaviour
- Pending/rejected accounts keep seeing the verification form/status banner instead of stats (existing rule kept).
- Numbers show "—" if a table is empty or not readable; no database changes.
- Mobile: stats 2 per row, cards single column.

## Full audit
- Open every side-menu tab for each role, fix broken/empty screens, missing loading/empty states, and mobile overflow.
- Verify role access rules (each role sees only its own tabs) with tests.
- Note: signed-in checks need a working login; I'll verify layout and logic, and list anything I couldn't test live.

## Technical details
- Split `src/routes/dashboard.tsx` into `src/components/manzil/dashboards/{Buyer,Dealer,Society}Overview.tsx`, reusing `stat-grid`, `attention-grid`, `hub-grid`.
- Counts via `getSupabase()` scoped by `user_id`/`dealer_id`/`society_id` (match existing columns from reference schema; RLS unchanged).
- Add access tests in `src/test/` for role-to-tab mapping.
