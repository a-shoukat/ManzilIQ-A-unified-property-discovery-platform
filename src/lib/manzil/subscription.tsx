import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSupabase } from './supabase';
import { useAuth } from './auth';
import { canUse as canUseFor, effectivePlan, type Feature, type Plan, type SubscriptionRow } from './plans';
import {
  resolveGrantSocietyId,
  SOCIETY_PROFILE_REQUIRED,
  subscriptionConflictTarget,
  subscriptionWritePayload,
  type SubscriptionUpsertRow,
} from './subscription-grant';
import { writeAudit } from './audit';

interface SubState { sub: SubscriptionRow | null; plan: Plan | null; expired: boolean; ready: boolean; canUse: (f: Feature) => boolean; reload: () => Promise<void> }
const Ctx = createContext<SubState>({ sub: null, plan: null, expired: false, ready: false, canUse: () => false, reload: async () => {} });

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [ready, setReady] = useState(false);
  const uid = session?.user.id;
  const reload = useCallback(async () => {
    const db = getSupabase();
    if (!db || !uid) { setSub(null); setReady(true); return; }
    const { data } = await db.from('subscriptions').select('*').eq('user_id', uid).maybeSingle();
    setSub((data as SubscriptionRow | null) ?? null); setReady(true);
  }, [uid]);
  useEffect(() => { void reload(); }, [reload]);
  const role = profile?.role;
  const { plan, expired } = effectivePlan(role, sub);
  return <Ctx.Provider value={{ sub, plan, expired, ready, canUse: (f) => canUseFor(f, role, sub), reload }}>{children}</Ctx.Provider>;
}

export const useSubscription = () => useContext(Ctx);

export type SaveSubscriptionOpts = {
  /** Required for society_admin when the admin selects a society; otherwise looked up from society_details. */
  societyId?: string | null;
  status?: SubscriptionRow['status'];
  days?: number;
  /** When set, write subscription.grant audit (admin grants). */
  actorId?: string | null;
};

/** Save a plan for a user for the next N days. Society grants always send society_id. */
export async function saveSubscription(
  userId: string,
  role: string,
  planId: string,
  statusOrOpts: SubscriptionRow['status'] | SaveSubscriptionOpts = 'active',
  daysArg = 30,
) {
  const opts: SaveSubscriptionOpts =
    typeof statusOrOpts === 'string'
      ? { status: statusOrOpts, days: daysArg }
      : statusOrOpts;
  const status = opts.status ?? 'active';
  const days = opts.days ?? 30;
  const db = getSupabase();
  if (!db) throw new Error('Not connected');

  let hasSocietyProfile = false;
  if (role === 'society_admin') {
    const societyKey = opts.societyId || userId;
    const { data } = await db.from('society_details').select('profile_id').eq('profile_id', societyKey).maybeSingle();
    hasSocietyProfile = !!data;
  }

  const societyId = resolveGrantSocietyId({
    role,
    userId,
    explicitSocietyId: opts.societyId,
    hasSocietyProfile,
  });

  const start = new Date();
  const end = new Date(start.getTime() + days * 86400000);
  if (role === 'society_admin' && !societyId) {
    throw new Error(SOCIETY_PROFILE_REQUIRED);
  }
  const row: SubscriptionUpsertRow = {
    user_id: userId,
    role,
    plan_id: planId,
    status,
    current_period_start: start.toISOString(),
    current_period_end: end.toISOString(),
    society_id: societyId,
  };
  const payload = subscriptionWritePayload(row);
  const onConflict = subscriptionConflictTarget(societyId);
  // Prefer conflict target that matches live hybrid unique keys.
  let { error } = await db.from('subscriptions').upsert(payload, { onConflict });
  if (error && onConflict === 'society_id') {
    // Fallback when society_id unique index is missing / unnamed for PostgREST
    ({ error } = await db.from('subscriptions').upsert({ ...payload, user_id: userId }, { onConflict: 'user_id' }));
  }
  if (error) throw new Error(error.message);

  if (opts.actorId !== undefined) {
    await writeAudit({
      actorId: opts.actorId,
      action: 'subscription.grant',
      entityType: 'subscriptions',
      entityId: userId,
      meta: { plan_id: planId, society_id: societyId, role },
    });
  }
}
