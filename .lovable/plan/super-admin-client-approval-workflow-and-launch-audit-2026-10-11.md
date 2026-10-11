# Super admin, client approval workflow, and launch audit

## 1. Super admin account
- Create the account `hello@manziliq.com` through the app's normal sign-up. The password is never stored in the app code.
- Your database is linked with a public key only, so the app cannot make itself admin. That protection is deliberate. After sign-up, you paste one ready-made line into your database dashboard (SQL editor) to turn this account into super admin. I will give you the exact line.
- After that, logging in with this email and password opens the super admin dashboard straight away.

## 2. Super admin dashboard
- Overview: total users, pending approvals, listings, bookings, payments and disputes.
- Quick links to every management area: Verification, Users, Listings, Bookings, Disputes, Templates, Broadcast and Analytics.
- Super admin sees every side-menu tab.

## 3. Client onboarding with ID verification
- Sign-up steps: account details, CNIC number, CNIC front and back photos, then submit.
- New clients get "Pending approval" status. Until approved they see a waiting screen and cannot book or buy.
- Super admin reviews in Verification: sees CNIC details and photos, then clicks Approve or Reject (with a reason). The client gets a notification.
- Approved clients get full access. Rejected clients see the reason and can submit again.

## 4. Side-menu tabs completion
- Open every tab (buyer, dealer, society, admin) and finish anything incomplete: empty screens, buttons that do nothing, missing loading or empty states, broken links.

## 5. Full audit and mobile
- Check every page at phone, tablet and desktop sizes. Fix overflowing content and the side menu, and make tables scroll or turn into cards on phones.
- Check errors, access per role, page titles and descriptions, then test sign-up, approval, booking and listing flows end to end.
- Publish when everything passes.

## Technical details
- Use the existing `profiles.role` (`super_admin`) and `profiles.verification_status` columns and the existing `customer_details` and `notifications` tables. No schema change is planned.
- I will check the live tables and permissions (read-only) before building.
- If the database rules block new sign-ups from being set to "pending", or block storing CNIC uploads, I will give you a small optional SQL snippet to run yourself. I will not run anything on your database.
- All role checks stay in the shared access module. The admin promotion is done only on the database side.
