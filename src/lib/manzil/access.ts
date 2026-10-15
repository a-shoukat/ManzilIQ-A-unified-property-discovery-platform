import type { UserRole } from './types';
const permissions: Record<string, UserRole[]> = {
 'add-property':['dealer','society_admin','super_admin'],
 'admin-verification':['super_admin'], 'admin-users':['super_admin'], 'admin':['super_admin'], 'admin-disputes':['super_admin'], 'admin-templates':['super_admin'], 'admin-analytics':['super_admin'], 'admin-bookings':['super_admin'], 'admin-fraud':['super_admin'], 'admin-reports':['super_admin'],
 'society':['society_admin','super_admin'], 'society-inventory':['society_admin','super_admin'], 'society-map':['society_admin','super_admin'], 'society-dealers':['society_admin','super_admin'], 'society-bookings':['society_admin','super_admin'], 'society-financials':['society_admin','super_admin'], 'society-analytics':['society_admin','super_admin'], 'broadcast':['society_admin','super_admin'],
 'dealer':['dealer','super_admin'], 'dealer-discover':['dealer','super_admin'], 'dealer-lots':['dealer','super_admin'], 'dealer-leads':['dealer','super_admin'], 'dealer-commissions':['dealer','super_admin'], 'dealer-book':['dealer'],
 'book-plot':['buyer','super_admin'], 'my-bookings':['buyer','super_admin'], 'my-payments':['buyer','super_admin'],
 'master-plan':['buyer','dealer','society_admin','super_admin'],
 'dealer-analytics':['dealer','super_admin'], 'my-activity':['buyer','super_admin'],
};
export function canAccessPage(page:string, role:UserRole | undefined):boolean {
 const roles=permissions[page];
 return !roles || (role !== undefined && roles.includes(role));
}
/** Pages a signed-in but not-yet-approved account may still open. */
const OPEN_WHILE_PENDING = new Set(['dashboard','inbox','documents','login','marketplace','map-view','master-plan','price-estimator','compare','market-trends','profile','wishlist','saved-searches']);
export function needsApproval(page:string, role:UserRole|undefined, status:string|undefined):boolean {
 if (!role || role==='super_admin' || status==='approved') return false;
 return !OPEN_WHILE_PENDING.has(page);
}
