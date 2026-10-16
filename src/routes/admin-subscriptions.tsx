import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageFrame, pageHead } from '@/components/manzil/PageFrame';
import { getSupabase } from '@/lib/manzil/supabase';
import { effectivePlan, getPlan, plansFor, type PaidRole, type SubscriptionRow } from '@/lib/manzil/plans';
import { saveSubscription } from '@/lib/manzil/subscription';
import type { Profile } from '@/lib/manzil/types';

function AdminSubscriptions() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [subs, setSubs] = useState<Record<string, SubscriptionRow>>({});
  const [role, setRole] = useState<string>('all');
  const [err, setErr] = useState<string | null>(null);
  const load = async () => {
    const db = getSupabase(); if (!db) return;
    const [{ data: p }, { data: s, error }] = await Promise.all([
      db.from('profiles').select('*').neq('role', 'super_admin'),
      db.from('subscriptions').select('*'),
    ]);
    if (error) setErr('Subscriptions table not found — run reference/phase11-subscriptions.sql first.');
    setUsers((p as Profile[]) ?? []);
    setSubs(Object.fromEntries(((s as SubscriptionRow[]) ?? []).map((r) => [r.user_id, r])));
  };
  useEffect(() => { void load(); }, []);
  const act = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); await load(); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } };
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
  const list = users.filter((u) => role === 'all' || u.role === role);
  return (
    <div className="container"><div className="card wide">
      <h1>Subscriptions</h1>
      <p className="muted">All customers, their plan and status.</p>
      <div className="link-row">{['all', 'buyer', 'dealer', 'society_admin'].map((r) => <Button key={r} size="sm" variant={role === r ? 'default' : 'outline'} onClick={() => setRole(r)}>{r.replace('_', ' ')}</Button>)}</div>
      {err && <div className="error">{err}</div>}
      <div className="table-wrap"><table>
        <thead><tr><th>Customer</th><th>Role</th><th>Plan</th><th>Status</th><th>Renews / ends</th><th>Actions</th></tr></thead>
        <tbody>{list.map((u) => {
          const s = subs[u.id] ?? null;
          const { plan, expired } = effectivePlan(u.role, s);
          const status = !s ? 'free' : expired || new Date(s.current_period_end) < new Date() ? (s.status === 'cancelled' ? 'cancelled' : 'expired') : s.status;
          return <tr key={u.id}>
            <td>{u.email}</td><td>{u.role.replace('_', ' ')}</td>
            <td>{s ? getPlan(s.plan_id)?.name ?? s.plan_id : plan?.name}</td><td>{status}</td>
            <td>{s ? new Date(s.current_period_end).toLocaleDateString() : '—'}</td>
            <td><div className="link-row">
              <select defaultValue="" onChange={(e) => { const v = e.target.value; e.target.value = ''; if (v) void act(() => saveSubscription(u.id, u.role, v)); }}>
                <option value="">Grant plan…</option>
                {plansFor(u.role as PaidRole).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {s && <Button size="sm" variant="outline" onClick={() => void extend(s)}>Extend 30 days</Button>}
              {s && s.status !== 'cancelled' && <Button size="sm" variant="outline" onClick={() => void cancel(s)}>Cancel</Button>}
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
