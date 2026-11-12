import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageFrame, pageHead } from '@/components/manzil/PageFrame';
import { getSupabase } from '@/lib/manzil/supabase';
import { effectivePlan, getPlan, plansFor, type PaidRole, type SubscriptionRow } from '@/lib/manzil/plans';
import { saveSubscription } from '@/lib/manzil/subscription';
import { SOCIETY_PROFILE_REQUIRED, societyAdminsWithProfile } from '@/lib/manzil/subscription-grant';
import { useAuth } from '@/lib/manzil/auth';
import type { Profile } from '@/lib/manzil/types';

function titleCaseRole(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function titleCaseStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function AdminSubscriptions() {
  const { t } = useTranslation(['admin', 'common']);
  const { session } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [subs, setSubs] = useState<Record<string, SubscriptionRow>>({});
  const [societyIds, setSocietyIds] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<string>('all');
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingGrant, setPendingGrant] = useState<{ user: Profile; planId: string; planName: string } | null>(null);

  const load = async () => {
    const db = getSupabase();
    if (!db) { setLoading(false); return; }
    setLoading(true);
    const [{ data: p }, { data: s, error }, { data: details }] = await Promise.all([
      db.from('profiles').select('*').neq('role', 'super_admin'),
      db.from('subscriptions').select('*'),
      db.from('society_details').select('profile_id'),
    ]);
    if (error) setErr(t('admin:subscriptionsMissingTable'));
    setUsers((p as Profile[]) ?? []);
    setSubs(Object.fromEntries(((s as SubscriptionRow[]) ?? []).map((r) => [r.user_id, r])));
    setSocietyIds(new Set(((details as { profile_id: string }[]) ?? []).map((d) => d.profile_id)));
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const grantable = useMemo(
    () => societyAdminsWithProfile(users, societyIds),
    [users, societyIds],
  );

  const act = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try { await fn(); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : t('common:tryAgain')); }
  };

  const extend = (s: SubscriptionRow) => act(async () => {
    const db = getSupabase()!;
    const endMs = s.current_period_end ? new Date(s.current_period_end).getTime() : NaN;
    const base = Number.isFinite(endMs) ? Math.max(Date.now(), endMs) : Date.now();
    const { error } = await db.from('subscriptions').update({
      status: 'active',
      current_period_end: new Date(base + 30 * 86400000).toISOString(),
    }).eq('user_id', s.user_id);
    if (error) throw new Error(error.message);
  });

  const cancel = (s: SubscriptionRow) => act(async () => {
    const { error } = await getSupabase()!.from('subscriptions').update({ status: 'cancelled' }).eq('user_id', s.user_id);
    if (error) throw new Error(error.message);
  });

  const confirmGrant = () => {
    if (!pendingGrant) return;
    const { user: u, planId } = pendingGrant;
    setPendingGrant(null);
    void act(async () => {
      if (u.role === 'society_admin' && !societyIds.has(u.id)) {
        throw new Error(SOCIETY_PROFILE_REQUIRED);
      }
      await saveSubscription(u.id, u.role, planId, {
        societyId: u.role === 'society_admin' ? u.id : null,
        actorId: session?.user.id ?? null,
      });
    });
  };

  const needle = q.trim().toLowerCase();
  const list = grantable.filter((u) => {
    if (role !== 'all' && u.role !== role) return false;
    if (!needle) return true;
    return (u.email ?? '').toLowerCase().includes(needle) || (u.full_name ?? '').toLowerCase().includes(needle);
  });
  const skippedSociety = users.filter((u) => u.role === 'society_admin' && !societyIds.has(u.id)).length;
  const roleFilters = ['all', 'buyer', 'dealer', 'society_admin'] as const;

  return (
    <div className="container">
      <div className="card wide">
        <h1>{t('admin:subscriptionsTitle')}</h1>
        <p className="muted">{t('admin:subscriptionsSubtitle')}</p>
        {skippedSociety > 0 && (
          <p className="muted small">{t('admin:subscriptionsSkipNoProfile', { count: skippedSociety })}</p>
        )}
        <div className="subs-toolbar">
          <input
            type="search"
            className="subs-search"
            placeholder={t('admin:searchSubscriptions')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t('admin:searchSubscriptions')}
          />
          <div className="link-row filter-pills">
            {roleFilters.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={role === r ? 'default' : 'outline'}
                className="filter-pill"
                onClick={() => setRole(r)}
              >
                {r === 'all' ? t('common:all') : titleCaseRole(r)}
              </Button>
            ))}
          </div>
        </div>
        {err && <div className="error">{err}</div>}
        {loading ? (
          <p className="muted">{t('admin:loading')}</p>
        ) : (
          <div className="table-wrap subs-table-wrap">
            <table className="data-table subs-table">
              <thead>
                <tr>
                  <th>{t('admin:customer')}</th>
                  <th>{t('admin:role')}</th>
                  <th>{t('admin:plan')}</th>
                  <th>{t('admin:statusCol')}</th>
                  <th>{t('admin:renewsEnds')}</th>
                  <th>{t('admin:actions')}</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">{t('admin:subscriptionsEmpty')}</td>
                  </tr>
                ) : list.map((u) => {
                  const s = subs[u.id] ?? null;
                  const { plan, expired } = effectivePlan(u.role, s);
                  const status = !s
                    ? 'free'
                    : expired || (s.current_period_end && new Date(s.current_period_end) < new Date())
                      ? (s.status === 'cancelled' ? 'cancelled' : 'expired')
                      : s.status;
                  const endLabel = s?.current_period_end
                    ? new Date(s.current_period_end).toLocaleDateString()
                    : t('common:notAvailable');
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="email-ellipsis" title={u.email}>{u.email}</span>
                      </td>
                      <td>{titleCaseRole(u.role)}</td>
                      <td>{s ? getPlan(s.plan_id)?.name ?? s.plan_id : plan?.name}</td>
                      <td><span className="status-pill">{titleCaseStatus(status)}</span></td>
                      <td>{endLabel}</td>
                      <td>
                        <div className="link-row row-actions">
                          <select
                            defaultValue=""
                            aria-label={t('admin:grantPlan')}
                            onChange={(e) => {
                              const v = e.target.value;
                              e.target.value = '';
                              if (!v) return;
                              const planName = getPlan(v)?.name ?? v;
                              setPendingGrant({ user: u, planId: v, planName });
                            }}
                          >
                            <option value="">{t('admin:grantPlan')}</option>
                            {plansFor(u.role as PaidRole).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          {s && (
                            <Button size="sm" variant="outline" onClick={() => void extend(s)}>
                              {t('admin:extend30')}
                            </Button>
                          )}
                          {s && s.status !== 'cancelled' && (
                            <Button size="sm" variant="outline" onClick={() => void cancel(s)}>
                              {t('common:cancel')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingGrant} onOpenChange={(open) => { if (!open) setPendingGrant(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin:confirmGrantTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingGrant
                ? t('admin:confirmGrantBody', {
                    plan: pendingGrant.planName,
                    email: pendingGrant.user.email,
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGrant}>{t('admin:confirmGrantAction')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute('/admin-subscriptions')({
  head: () => pageHead('Subscriptions'),
  component: () => <PageFrame><AdminSubscriptions /></PageFrame>,
});
