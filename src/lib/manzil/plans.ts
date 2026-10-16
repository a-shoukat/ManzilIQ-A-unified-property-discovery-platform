import type { UserRole } from './types';

/** Edit prices / features here. Demo prices in PKR per month. */
export type Feature =
  | 'advanced_price_predictor' | 'saved_search_alerts' | 'compare_5'
  | 'unlimited_lots' | 'lead_crm' | 'commission_dashboard' | 'featured_listings'
  | 'master_plan_map' | 'society_analytics' | 'whatsapp_broadcasts' | 'multi_society' | 'ai_assistant' | 'api_access';

export type PaidRole = Exclude<UserRole, 'super_admin'>;
export interface Plan { id: string; role: PaidRole; name: string; price: number; highlights: string[]; features: Feature[]; limits?: { plots?: number; lots?: number; compare?: number } }

export const PLANS: Plan[] = [
  { id: 'buyer_free', role: 'buyer', name: 'Free', price: 0, highlights: ['Browse & search', 'Wishlist', 'Book plots', 'Basic price estimate'], features: [], limits: { compare: 2 } },
  { id: 'buyer_plus', role: 'buyer', name: 'Buyer Plus', price: 499, highlights: ['Everything in Free', 'Advanced AI price predictor', 'Saved-search alerts', 'Compare up to 5 properties'], features: ['advanced_price_predictor', 'saved_search_alerts', 'compare_5'], limits: { compare: 5 } },
  { id: 'dealer_free', role: 'dealer', name: 'Free', price: 0, highlights: ['Browse societies', '1 active lot request', 'Basic profile'], features: [], limits: { lots: 1 } },
  { id: 'dealer_pro', role: 'dealer', name: 'Dealer Pro', price: 1499, highlights: ['Unlimited lot requests', 'Lead inbox + CRM', 'Commission dashboard', 'Featured listings'], features: ['unlimited_lots', 'lead_crm', 'commission_dashboard', 'featured_listings'] },
  { id: 'society_free', role: 'society_admin', name: 'Starter', price: 0, highlights: ['1 society', 'Up to 50 plots', 'Listings', 'Bookings'], features: [], limits: { plots: 50 } },
  { id: 'society_growth', role: 'society_admin', name: 'Growth', price: 4999, highlights: ['Up to 500 plots', 'Interactive master-plan map', 'Analytics dashboard', 'WhatsApp broadcasts'], features: ['master_plan_map', 'society_analytics', 'whatsapp_broadcasts'], limits: { plots: 500 } },
  { id: 'society_enterprise', role: 'society_admin', name: 'Enterprise', price: 14999, highlights: ['Unlimited plots', 'Multi-society', 'AI assistant', 'API access'], features: ['master_plan_map', 'society_analytics', 'whatsapp_broadcasts', 'multi_society', 'ai_assistant', 'api_access'] },
];

export const FEATURE_LABELS: Record<Feature, string> = {
  advanced_price_predictor: 'Advanced AI price predictor', saved_search_alerts: 'Saved-search alerts', compare_5: 'Compare up to 5',
  unlimited_lots: 'Unlimited lot requests', lead_crm: 'Lead inbox + CRM', commission_dashboard: 'Commission dashboard', featured_listings: 'Featured listings',
  master_plan_map: 'Interactive master-plan map', society_analytics: 'Analytics dashboard', whatsapp_broadcasts: 'WhatsApp broadcasts',
  multi_society: 'Multi-society', ai_assistant: 'AI assistant', api_access: 'API access',
};

/** Pages that are fully gated behind a feature (per role). */
export const PAGE_FEATURES: Record<string, Partial<Record<UserRole, Feature>>> = {
  'saved-searches': { buyer: 'saved_search_alerts' },
  'dealer-leads': { dealer: 'lead_crm' },
  'dealer-commissions': { dealer: 'commission_dashboard' },
  'society-map': { society_admin: 'master_plan_map' },
  'society-analytics': { society_admin: 'society_analytics' },
  'broadcast': { society_admin: 'whatsapp_broadcasts' },
};

export const plansFor = (role: PaidRole) => PLANS.filter((p) => p.role === role);
export const freePlan = (role: PaidRole): Plan => plansFor(role)[0]!;
export const getPlan = (id: string | undefined) => PLANS.find((p) => p.id === id);

export interface SubscriptionRow { id?: string; user_id: string; role: string; plan_id: string; status: 'active' | 'trialing' | 'expired' | 'cancelled'; current_period_start: string; current_period_end: string }

/** Plan actually in effect: expired/cancelled/missing/mismatched subscriptions fall back to Free. */
export function effectivePlan(role: UserRole | undefined, sub: SubscriptionRow | null, now = new Date()): { plan: Plan | null; expired: boolean } {
  if (!role || role === 'super_admin') return { plan: null, expired: false };
  const plan = getPlan(sub?.plan_id);
  if (!sub || !plan || plan.role !== role) return { plan: freePlan(role), expired: false };
  const live = (sub.status === 'active' || sub.status === 'trialing') && new Date(sub.current_period_end) > now;
  if (live) return { plan, expired: false };
  return { plan: freePlan(role), expired: plan.price > 0 };
}

export function canUse(feature: Feature, role: UserRole | undefined, sub: SubscriptionRow | null, now = new Date()): boolean {
  if (role === 'super_admin') return true;
  const { plan } = effectivePlan(role, sub, now);
  return !!plan?.features.includes(feature);
}

export function requiredPlanFor(feature: Feature, role: UserRole | undefined): Plan | undefined {
  if (!role || role === 'super_admin') return undefined;
  return plansFor(role).find((p) => p.features.includes(feature));
}
