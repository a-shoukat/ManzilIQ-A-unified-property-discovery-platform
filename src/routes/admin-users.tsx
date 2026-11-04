import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/manzil/supabase';
import { useAuth } from '@/lib/manzil/auth';
import { toast } from 'sonner';
import { createUserAsAdmin } from '@/lib/manzil/admin-users';
import { errorText } from '@/lib/manzil/errors';
import { PasswordInput, PASSWORD_MISMATCH } from '@/components/manzil/PasswordInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ROLE_LABELS, type UserRole, type VerificationStatus } from '@/lib/manzil/types';

interface Row { id: string; email: string; full_name?: string | null; role: UserRole; verification_status: VerificationStatus; created_at?: string }
const EDITABLE_ROLES: UserRole[] = ['buyer', 'dealer', 'society_admin'];

function AdminUsers() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [nu, setNu] = useState({ name: '', email: '', role: 'buyer' as UserRole, password: '' });
  const [creating, setCreating] = useState(false);
  const [pw2, setPw2] = useState('');
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nu.password !== pw2) { toast.error(PASSWORD_MISMATCH); return; }
    if (nu.password.length < 8) { toast.error('Temporary password must be at least 8 characters.'); return; }
    setCreating(true);
    try { await createUserAsAdmin(nu); toast.success(`${nu.email} created`); setAdding(false); setNu({ name: '', email: '', role: 'buyer', password: '' }); setPw2(''); void load(); }
    catch (err) { toast.error(errorText(err, 'Could not create user')); }
    finally { setCreating(false); }
  };

  const load = async () => {
    const db = getSupabase(); if (!db) return;
    setLoading(true);
    const { data, error } = await db.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) setMsg(error.message);
    setRows((data ?? []) as Row[]); setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const shown = useMemo(() => rows.filter((r) =>
    (role === 'all' || r.role === role) && (status === 'all' || r.verification_status === status) &&
    (!q || `${r.email} ${r.full_name ?? ''}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, role, status]);

  const update = async (r: Row, patch: Partial<Row> & { rejection_reason?: string | null }, note: string) => {
    const db = getSupabase(); if (!db) return;
    setBusy(r.id); setMsg(null);
    const { error } = await db.from('profiles').update(patch).eq('id', r.id);
    if (error) { setMsg(error.message); setBusy(null); return; }
    await db.from('notifications').insert({ user_id: r.id, type: 'account', title: 'Account updated', body: note });
    setBusy(null); void load();
  };

  const reject = (r: Row) => {
    const reason = window.prompt('Reason for rejection?')?.trim();
    if (reason) void update(r, { verification_status: 'rejected', rejection_reason: reason }, `Your verification was rejected: ${reason}`);
  };

  return (
    <div className="page">
      <div className="card wide">
        <h1>Users</h1>
        <div className="topbar"><p className="muted" style={{ margin: 0 }}>Manage every account: roles, approvals and access.</p>
          <Button onClick={() => setAdding(true)}>+ Add user</Button></div>
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add user</DialogTitle></DialogHeader>
            <form onSubmit={createUser}>
              <label>Full name<input required value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></label>
              <label>Email<input required type="email" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></label>
              <label>Role<select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as UserRole })}>
                {EDITABLE_ROLES.map((x) => <option key={x} value={x}>{ROLE_LABELS[x]}</option>)}</select></label>
              <label>Temporary password<PasswordInput required minLength={8} autoComplete="new-password" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} /></label>
              <label>Confirm password<PasswordInput required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
              {pw2 && pw2 !== nu.password && <div className="error" role="alert">{PASSWORD_MISMATCH}</div>}
              <p className="muted small">The account is created approved. Share the temporary password; they can change it in Profile & settings.</p>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={creating}>{creating ? 'Creating…' : 'Create user'}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <div className="filter-row">
          <input placeholder="Search email or name" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {['pending', 'approved', 'rejected', 'blacklisted'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {msg && <div className="error">{msg}</div>}
        {loading ? <p className="muted">Loading users…</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {shown.map((r) => {
                  const self = r.id === profile?.id || r.role === 'super_admin';
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.full_name || r.email.split('@')[0]}</strong><div className="muted small">{r.email}</div></td>
                      <td>{self ? ROLE_LABELS[r.role] : (
                        <select value={r.role} disabled={busy === r.id}
                          onChange={(e) => void update(r, { role: e.target.value as UserRole }, `Your role is now ${ROLE_LABELS[e.target.value as UserRole]}.`)}>
                          {EDITABLE_ROLES.map((x) => <option key={x} value={x}>{ROLE_LABELS[x]}</option>)}
                        </select>)}
                      </td>
                      <td><span className={`badge ${r.verification_status === 'approved' ? 'ok' : 'warn'}`}>{r.verification_status}</span></td>
                      <td>{!self && <div className="queue-actions">
                        {r.verification_status !== 'approved' && <Button size="sm" disabled={busy === r.id} onClick={() => void update(r, { verification_status: 'approved', rejection_reason: null }, 'Your account has been approved.')}>{r.verification_status === 'blacklisted' ? 'Reactivate' : 'Approve'}</Button>}
                        {r.verification_status !== 'rejected' && r.verification_status !== 'blacklisted' && <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => reject(r)}>Reject</Button>}
                        {r.verification_status !== 'blacklisted' && <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => void update(r, { verification_status: 'blacklisted' }, 'Your account has been suspended.')}>Blacklist</Button>}
                      </div>}</td>
                    </tr>
                  );
                })}
                {shown.length === 0 && <tr><td colSpan={4} className="muted">No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/admin-users')({
  head: () => pageHead('Users'),
  component: () => <PageFrame><AdminUsers /></PageFrame>,
});
