import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSupabase } from './supabase';
import { useAuth } from './auth';
import { canUse as canUseFor, effectivePlan, type Feature, type Plan, type SubscriptionRow } from './plans';

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

/** Save a plan for the signed-in user for the next 30 days (demo checkout). */
export async function saveSubscription(userId: string, role: string, planId: string, status: SubscriptionRow['status'] = 'active', days = 30) {
  const db = getSupabase();
  if (!db) throw new Error('Not connected');
  const start = new Date();
  const end = new Date(start.getTime() + days * 86400000);
  const { error } = await db.from('subscriptions').upsert({ user_id: userId, role, plan_id: planId, status, current_period_start: start.toISOString(), current_period_end: end.toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}
