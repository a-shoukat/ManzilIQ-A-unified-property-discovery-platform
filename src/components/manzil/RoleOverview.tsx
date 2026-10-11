import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/manzil/supabase';
import { ROLE_OVERVIEW, type CountSpec } from '@/lib/manzil/role-overview';

type Row = { id: string; label: string; page: string };

function useCounts(specs: CountSpec[], userId: string) {
  const [stats, setStats] = useState<Record<string, number | null>>({});
  useEffect(() => {
    const db = getSupabase();
    if (!db) return;
    void Promise.all(specs.map(async (s) => {
      let q = db.from(s.table).select(s.sum ?? '*', s.sum ? undefined : { count: 'exact', head: true }).eq(s.owner, userId);
      for (const [k, v] of s.filters ?? []) q = Array.isArray(v) ? q.in(k, v) : q.eq(k, v);
      const res = await q;
      if (res.error) return [s.key, null] as const;
      if (s.sum) {
        const rows = (res.data ?? []) as unknown as Record<string, number>[];
        return [s.key, rows.reduce((a, r) => a + Number(r[s.sum!] ?? 0), 0)] as const;
      }
      return [s.key, res.count ?? 0] as const;
    })).then((pairs) => setStats(Object.fromEntries(pairs)));
  }, [specs, userId]);
  return stats;
}

function useAttention(role: string, userId: string) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    const db = getSupabase(); if (!db) return;
    const out: Row[] = [];
    const jobs: PromiseLike<unknown>[] = [];
    if (role === 'buyer') {
      jobs.push(db.from('bookings').select('id,status').eq('customer_id', userId).eq('status', 'pending').limit(4)
        .then(({ data }) => (data ?? []).forEach((b) => out.push({ id: `b${b.id}`, label: 'Booking awaiting society approval', page: 'my-bookings' }))));
      jobs.push(db.from('payments').select('id,amount').eq('customer_id', userId).eq('status', 'pending').limit(4)
        .then(({ data }) => (data ?? []).forEach((p) => out.push({ id: `p${p.id}`, label: `Payment pending · PKR ${Number(p.amount).toLocaleString()}`, page: 'my-payments' }))));
    }
    if (role === 'dealer') {
      jobs.push(db.from('leads').select('*').eq('dealer_id', userId).eq('status', 'new').order('created_at', { ascending: false }).limit(5)
        .then(({ data }) => (data ?? []).forEach((l: Record<string, unknown>) => out.push({ id: `l${l.id}`, label: `New lead · ${String(l.name ?? l.full_name ?? 'Customer')}`, page: 'dealer-leads' }))));
    }
    if (role === 'society_admin') {
      jobs.push(db.from('bookings').select('id').eq('society_id', userId).eq('status', 'pending').limit(5)
        .then(({ data }) => (data ?? []).forEach((b) => out.push({ id: `b${b.id}`, label: 'Booking request awaiting review', page: 'society-bookings' }))));
      jobs.push(db.from('dealer_requests').select('id').eq('society_id', userId).eq('status', 'pending').limit(5)
        .then(({ data }) => (data ?? []).forEach((d) => out.push({ id: `d${d.id}`, label: 'Dealer wants to join your society', page: 'society-dealers' }))));
    }
    jobs.push(db.from('notifications').select('id,title').eq('user_id', userId).eq('read', false).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => (data ?? []).forEach((n) => out.push({ id: `n${n.id}`, label: n.title, page: 'inbox' }))));
    void Promise.all(jobs).then(() => setRows([...out]));
  }, [role, userId]);
  return rows;
}

export function RoleOverview({ role, userId, onNavigate }: { role: string; userId: string; onNavigate: (p: string) => void }) {
  const cfg = ROLE_OVERVIEW[role];
  const stats = useCounts(cfg?.stats ?? [], userId);
  const attention = useAttention(role, userId);
  if (!cfg) return null;
  return (
    <>
      <p className="muted">{cfg.text}</p>
      <div className="stat-grid">
        {cfg.stats.map((t) => (
          <Button variant="legacy" key={t.key} className="stat-tile" onClick={() => onNavigate(t.page)}>
            <span className="muted small">{t.label}</span>
            <strong>{stats[t.key] == null ? '—' : t.sum ? `PKR ${stats[t.key]!.toLocaleString()}` : stats[t.key]}</strong>
          </Button>
        ))}
      </div>
      <div className="attention-grid">
        <div className="attention-card">
          <h3>Needs attention</h3>
          {attention.length === 0 ? <p className="muted small">All caught up.</p> : attention.map((r) => (
            <div key={r.id} className="attention-row"><span>{r.label}</span>
              <Button size="sm" onClick={() => onNavigate(r.page)}>Open</Button></div>))}
        </div>
      </div>
      <h3>Manage</h3>
      <div className="hub-grid">
        {cfg.areas.map(([page, label]) => (
          <Button variant="legacy" key={page} className="hub-card" onClick={() => onNavigate(page)}><strong>{label}</strong></Button>
        ))}
      </div>
    </>
  );
}
