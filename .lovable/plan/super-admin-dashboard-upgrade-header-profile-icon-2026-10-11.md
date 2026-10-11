# Super admin dashboard upgrade + header profile icon

## What you'll get
1. **Better super admin dashboard**
   - Stats at the top (users, pending approvals, listings, bookings, payments, open disputes). Click a stat to open its page.
   - A "Needs attention" panel showing the latest pending approvals and open disputes, with quick Approve/Open buttons.
   - Cards to manage every part of the app: Users, Approvals, Listings, Bookings, Payments, Disputes, Templates, Broadcast, Analytics, Societies, Dealers.
2. **New "Users" page for the super admin**
   - Lists every user with email, name, role and status. You can search and filter by role or status.
   - For each user you can: change the role (buyer, dealer, society admin), approve, reject (with a reason), blacklist or reactivate. The user gets a notification.
   - Adds "Users" to the admin side menu.
3. **Profile icon in the header**
   - When signed in, a round avatar with your initial appears. Clicking it opens a menu with your email, role, Dashboard, Notifications and Sign out.
   - The separate sign-out icon goes away. Signed-out visitors still see "Sign in".
4. Works on phones too: the dashboard and users table stack into one column.

## Technical details
- New route `src/routes/admin-users.tsx`, gated through the shared access module (super_admin only). Reads and updates `profiles` and inserts `notifications`. This relies on the `profiles_admin_all` and `notifications_admin_insert` policies from `reference/admin-setup.sql`. No new SQL is needed.
- Super admins can't change their own role, and the role list leaves out super_admin, to keep admin accounts safe.
- `dashboard.tsx` AdminOverview gets an attention panel (latest 5 pending profiles and open disputes) and an expanded hub grid.
- `PageFrame.tsx` header gets an avatar dropdown built with the existing shadcn DropdownMenu. Add the admin-users nav link.
- New styles use only semantic tokens in `src/styles.css`. Add an access test for `admin-users`.
