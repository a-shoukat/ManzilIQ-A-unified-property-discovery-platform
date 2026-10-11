# Side-menu audit for every role + signed-in testing

## 1. Test accounts (needed for signed-in testing)
New signups are always saved as Buyer and need approval, so I can't make Dealer or Society Admin test accounts on my own.
- I create 3 test accounts through the normal signup: `test-buyer@manziliq.com`, `test-dealer@manziliq.com`, `test-society@manziliq.com`.
- I give you one short SQL snippet that confirms them, sets each one's role and marks them approved. You run it in your Supabase SQL Editor.
- Super admin: I need the current working password for hello@manziliq.com, or you can reset it to `Hello@manziliq`.

## 2. Tab-by-tab audit (per role)
For each role I sign in and open every side-menu tab at desktop (1280px) and mobile (390px):
- **Buyer:** dashboard, marketplace, book plot, my bookings, my payments, documents, my activity, compare, price estimator, inbox.
- **Dealer:** dealer portal, discover societies, my lots, leads, add listing, performance, documents, inbox.
- **Society admin:** inventory, society map, booking requests, dealers, financials, sales analytics, broadcast, add listing, documents.
- **Super admin:** users, approvals, bookings, disputes, legal templates, broadcast, analytics.

On each tab I check for: page errors, failed data loads, missing "nothing here yet" messages, buttons that do nothing, forms that fail to save, text cut off or the page overflowing sideways on mobile, and whether a role can see tabs that aren't theirs.

## 3. Fixes
- Fix every problem I find inside those pages (layout, empty states, broken buttons, wrong columns in data reads).
- No database structure changes. If a fix needs a database permission, I add it to the SQL snippet for you to run.

## 4. Report
A short list of each tab per role: OK / fixed / blocked, with the reason for anything blocked.

## Technical details
- Use a Playwright script under /tmp/browser/audit that signs in through /login, then for each sidebar link captures screenshots, console errors and failed network requests.
- After the fixes, re-run the access tests and add a test for any role rule I change.
