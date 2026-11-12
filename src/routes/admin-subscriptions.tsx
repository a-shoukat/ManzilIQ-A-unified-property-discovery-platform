import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PageFrame, pageHead } from '@/components/manzil/PageFrame';
import { getSupabase } from '@/lib/manzil/supabase';
import { effectivePlan, getPlan, plansFor, type PaidRole, type SubscriptionRow } from '@/lib/manzil/plans';
import { saveSubscription } from '@/lib/manzil/subscription';
import { SOCIETY_PROFILE_REQUIRED, societyAdminsWithProfile } from '@/lib/manzil/subscription-grant';
import { useAuth } from '@/lib/manzil/auth';
import type { Profile } from '@/lib/manzil/types';

function AdminSubscriptions() {
  const { t } = useTranslation(['admin', 'common']);
  const { session } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [subs, setSubs] = useState<Record<string, SubscriptionRow>>({});
  const [societyIds, setSocietyIds] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<string>('all');
  const [err, setErr] = useState<string | null>(null);
  const load = async () => {
    const db = getSupabase(); if (!db) return;
    const [{ data: p }, { data: s, error }, { data: details }] = await Promise.all([
      db.from('profiles').select('*').neq('role', 'super_admin'),
      db.from('subscriptions').select('*'),
      db.from('society_details').select('profile_id'),
    ]);
    if (error) setErr(t('admin:subscriptionsMissingTable'));
    setUsers((p as Profile[]) ?? []);
    setSubs(Object.fromEntries(((s as SubscriptionRow[]) ?? []).map((r) => [r.user_id, r])));
    setSocietyIds(new Set(((details as { profile_id: string }[]) ?? []).map((d) => d.profile_id)));
  };
  useEffect(() => { void load(); }, []);

  const grantable = useMemo(
    () => societyAdminsWithProfile(users, societyIds),
    [users, societyIds],
  );

  const act = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); await load(); } catch (e) { setErr(e instanceof Error ? e.message : t('common:tryAgain')); } };
  const extend = (s: SubscriptionRow) => act(async () => {
    const db = getSupabase()!;
    const base = Math.max(Date.now(), new Date(s.current_period_end).getTime());
    const { error } = await db.from('subscriptions').update({ status: 'active', current_period_end: new Date(base + 30 * 86400000).toISOString() }).eq('user_id', s.user_id);
    if (error) throw new Error(error.message);
  });
  const cancel = (s: SubscriptionRow) => act(async () => {
    const { error } = await getSupabase()!.from('subscriptions').update({ status: 'cancelled' }).eq('user_id', s.user_id);
    if (error) throw new Error(error.message);
  });
  const grant = (u: Profile, planId: string) => act(async () => {
    if (u.role === 'society_admin' && !societyIds.has(u.id)) {
      throw new Error(SOCIETY_PROFILE_REQUIRED);
    }
    await saveSubscription(u.id, u.role, planId, {
      societyId: u.role === 'society_admin' ? u.id : null,
      actorId: session?.user.id ?? null,
    });
  });

  const list = grantable.filter((u) => role === 'all' || u.role === role);
  const skippedSociety = users.filter((u) => u.role === 'society_admin' && !societyIds.has(u.id)).length;

  return (
    <div className="container"><div className="card wide">
      <h1>{t('admin:subscriptionsTitle')}</h1>
      <p className="muted">{t('admin:subscriptionsSubtitle')}</p>
      {skippedSociety > 0 && (
        <p className="muted small">{t('admin:subscriptionsSkipNoProfile', { count: skippedSociety })}</p>
      )}
      <div className="link-row">{['all', 'buyer', 'dealer', 'society_admin'].map((r) => <Button key={r} size="sm" variant={role === r ? 'default' : 'outline'} onClick={() => setRole(r)}>{r.replace('_', ' ')}</Button>)}</div>
      {err && <div className="error">{err}</div>}
      <div className="table-wrap"><table>
        <thead><tr><th>{t('admin:customer')}</th><th>{t('admin:role')}</th><th>{t('admin:plan')}</th><th>{t('admin:statusCol')}</th><th>{t('admin:renewsEnds')}</th><th>{t('admin:actions')}</th></tr></thead>
        <tbody>{list.map((u) => {
          const s = subs[u.id] ?? null;
          const { plan, expired } = effectivePlan(u.role, s);
          const status = !s ? 'free' : expired || new Date(s.current_period_end) < new Date() ? (s.status === 'cancelled' ? 'cancelled' : 'expired') : s.status;
          return <tr key={u.id}>
            <td>{u.email}</td><td>{u.role.replace('_', ' ')}</td>
            <td>{s ? getPlan(s.plan_id)?.name ?? s.plan_id : plan?.name}</td><td>{status}</td>
            <td>{s ? new Date(s.current_period_end).toLocaleDateString() : '—'}</td>
            <td><div className="link-row">
              <select defaultValue="" aria-label={t('admin:grantPlan')} onChange={(e) => { const v = e.target.value; e.target.value = ''; if (v) void grant(u, v); }}>
                <option value="">{t('admin:grantPlan')}</option>
                {plansFor(u.role as PaidRole).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {s && <Button size="sm" variant="outline" onClick={() => void extend(s)}>{t('admin:extend30')}</Button>}
              {s && s.status !== 'cancelled' && <Button size="sm" variant="outline" onClick={() => void cancel(s)}>{t('common:cancel')}</Button>}
            </div></td>
          </tr>;
        })}</tbody>
      </table></div>
    </div></div>
  );
}

export const Route = createFileRoute('/admin-subscriptions')({
  head: () => pageHead('Subscriptions'),
  component: () => <PageFrame><AdminSubscriptions /></PageFrame>,
});
