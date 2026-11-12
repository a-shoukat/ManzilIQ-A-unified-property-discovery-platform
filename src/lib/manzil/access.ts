import type { UserRole } from './types';
import { isPublicPage } from './public-pages';
const permissions: Record<string, UserRole[]> = {
 'add-property':['dealer','society_admin','super_admin'],
 'admin-verification':['super_admin'], 'admin-users':['super_admin'], 'admin':['super_admin'], 'admin-disputes':['super_admin'], 'admin-templates':['super_admin'], 'admin-analytics':['super_admin'], 'admin-bookings':['super_admin'], 'admin-fraud':['super_admin'], 'admin-reports':['super_admin'], 'admin-subscriptions':['super_admin'],
 'admin-moderation':['super_admin'], 'admin-cms':['super_admin'], 'admin-audit':['super_admin'], 'admin-status':['super_admin'],
 'society':['society_admin','super_admin'], 'society-inventory':['society_admin','super_admin'], 'society-map':['society_admin','super_admin'], 'society-dealers':['society_admin','super_admin'], 'society-bookings':['society_admin','super_admin'], 'society-financials':['society_admin','super_admin'], 'society-analytics':['society_admin','super_admin'], 'broadcast':['society_admin','super_admin'],
 'dealer':['dealer','super_admin'], 'dealer-discover':['dealer','super_admin'], 'dealer-lots':['dealer','super_admin'], 'dealer-leads':['dealer','super_admin'], 'dealer-commissions':['dealer','super_admin'], 'dealer-book':['dealer'], 'dealer-forms':['dealer','super_admin'], 'dealer-form-settings':['dealer','super_admin'],
 'book-plot':['buyer','super_admin'], 'my-bookings':['buyer','super_admin'], 'my-payments':['buyer','super_admin'],
 'my-inquiries':['buyer','super_admin'],
 'inquiries':['dealer','society_admin','super_admin'],
 'payment-history':['buyer','society_admin','super_admin'],
 'settings':['buyer','dealer','society_admin','super_admin'],
 // master-plan is guest-public (view-only); omit role list so canAccessPage allows undefined
 'dealer-analytics':['dealer','super_admin'], 'my-activity':['buyer','super_admin'],
};
export function canAccessPage(page:string, role:UserRole | undefined):boolean {
 if (role === undefined && isPublicPage(page)) return true;
 // society-map: guests / buyers / dealers view-only; society + super admin edit (Growth-gated in UI)
 if (page === 'society-map') {
  return role === undefined || role === 'buyer' || role === 'dealer' || role === 'society_admin' || role === 'super_admin';
 }
 const roles=permissions[page];
 return !roles || (role !== undefined && roles.includes(role));
}
/** Pages a signed-in but not-yet-approved account may still open. */
const OPEN_WHILE_PENDING = new Set(['dashboard','inbox','documents','login','marketplace','map-view','master-plan','price-estimator','compare','market-trends','profile','wishlist','saved-searches','pricing','settings','my-inquiries']);
export function needsApproval(page:string, role:UserRole|undefined, status:string|undefined):boolean {
 if (!role || role==='super_admin' || status==='approved') return false;
 return !OPEN_WHILE_PENDING.has(page);
}
