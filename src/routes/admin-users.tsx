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
import { ROLE_LABELS, type UserRole, type VerificationStatus } from '@/lib/manzil/types';
import { formatStatusLabel } from '@/lib/manzil/format';

interface Row { id: string; email: string; full_name?: string | null; role: UserRole; verification_status: VerificationStatus; created_at?: string }
const EDITABLE_ROLES: UserRole[] = ['buyer', 'dealer', 'society_admin'];
const PAGE_SIZE = 20;

type PendingAction =
  | { kind: 'reject'; row: Row }
  | { kind: 'blacklist'; row: Row }
  | { kind: 'role'; row: Row; next: UserRole };

function AdminUsers() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [nu, setNu] = useState({ name: '', email: '', role: 'buyer' as UserRole, password: '' });
  const [creating, setCreating] = useState(false);
  const [pw2, setPw2] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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

  useEffect(() => { setPage(1); }, [q, role, status]);

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const nameCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const key = (r.full_name || r.email.split('@')[0] || '').trim().toLowerCase();
      if (!key) continue;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [rows]);

  const update = async (r: Row, patch: Partial<Row> & { rejection_reason?: string | null }, note: string) => {
    const db = getSupabase(); if (!db) return;
    setBusy(r.id); setMsg(null);
    const { error } = await db.from('profiles').update(patch).eq('id', r.id);
    if (error) { setMsg(error.message); setBusy(null); return; }
    await db.from('notifications').insert({ user_id: r.id, type: 'account', title: 'Account updated', body: note });
    setBusy(null); void load();
  };

  const confirmPending = () => {
    if (!pending) return;
    const action = pending;
    setPending(null);
    if (action.kind === 'reject') {
      const reason = rejectReason.trim() || 'No reason provided';
      setRejectReason('');
      void update(action.row, { verification_status: 'rejected', rejection_reason: reason }, `Your verification was rejected: ${reason}`);
      return;
    }
    if (action.kind === 'blacklist') {
      void update(action.row, { verification_status: 'blacklisted' }, 'Your account has been suspended.');
      return;
    }
    void update(action.row, { role: action.next }, `Your role is now ${ROLE_LABELS[action.next]}.`);
  };

  return (
    <div className="page">
      <div className="card wide">
        <div className="topbar users-header">
          <div>
            <h1 style={{ margin: 0 }}>Users</h1>
            <p className="muted" style={{ margin: 0 }}>Manage every account: roles, approvals and access.</p>
          </div>
          <Button onClick={() => setAdding(true)}>+ Add user</Button>
        </div>
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
        <div className="filter-row users-filters">
          <input placeholder="Search email or name" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {['pending', 'approved', 'rejected', 'blacklisted'].map((s) => <option key={s} value={s}>{formatStatusLabel(s)}</option>)}
          </select>
        </div>
        {msg && <div className="error">{msg}</div>}
        {loading ? <p className="muted">Loading users…</p> : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {pageRows.map((r) => {
                    const self = r.id === profile?.id || r.role === 'super_admin';
                    const display = r.full_name || r.email.split('@')[0] || r.email;
                    const dup = (nameCounts.get(display.trim().toLowerCase()) ?? 0) > 1;
                    return (
                      <tr key={r.id}>
                        <td>
                          <strong>{display}</strong>
                          {dup && <span className="badge warn" title="Duplicate display name">Duplicate name</span>}
                          <div className="muted small">{r.email}</div>
                        </td>
                        <td>{self ? ROLE_LABELS[r.role] : (
                          <select value={r.role} disabled={busy === r.id}
                            onChange={(e) => setPending({ kind: 'role', row: r, next: e.target.value as UserRole })}>
                            {EDITABLE_ROLES.map((x) => <option key={x} value={x}>{ROLE_LABELS[x]}</option>)}
                          </select>)}
                        </td>
                        <td><span className={`badge ${r.verification_status === 'approved' ? 'ok' : 'warn'}`}>{formatStatusLabel(r.verification_status)}</span></td>
                        <td>{!self && <div className="queue-actions">
                          {r.verification_status !== 'approved' && <Button size="sm" disabled={busy === r.id} onClick={() => void update(r, { verification_status: 'approved', rejection_reason: null }, 'Your account has been approved.')}>{r.verification_status === 'blacklisted' ? 'Reactivate' : 'Approve'}</Button>}
                          {r.verification_status !== 'rejected' && r.verification_status !== 'blacklisted' && <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => { setRejectReason(''); setPending({ kind: 'reject', row: r }); }}>Reject</Button>}
                          {r.verification_status !== 'blacklisted' && <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => setPending({ kind: 'blacklist', row: r })}>Blacklist</Button>}
                        </div>}</td>
                      </tr>
                    );
                  })}
                  {shown.length === 0 && <tr><td colSpan={4} className="muted">No users found.</td></tr>}
                </tbody>
              </table>
            </div>
            {shown.length > PAGE_SIZE && (
              <div className="link-row" style={{ marginTop: 12, alignItems: 'center' }}>
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="muted small">Page {page} / {pages}</span>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === 'reject' ? 'Reject this user?'
                : pending?.kind === 'blacklist' ? 'Blacklist this user?'
                  : 'Change user role?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === 'reject' && `Reject verification for ${pending.row.email}.`}
              {pending?.kind === 'blacklist' && `Suspend ${pending.row.email}. They will lose platform access.`}
              {pending?.kind === 'role' && `Change ${pending.row.email} to ${ROLE_LABELS[pending.next]}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pending?.kind === 'reject' && (
            <label>Reason
              <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Required for the user notification" />
            </label>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPending}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute('/admin-users')({
  head: () => pageHead('Users'),
  component: () => <PageFrame><AdminUsers /></PageFrame>,
});
