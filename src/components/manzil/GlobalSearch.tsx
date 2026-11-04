import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { SearchBar } from './SearchBar';
import { useDebounce } from '@/hooks/use-debounce';
import { searchProperties, searchUsers } from '@/lib/manzil/search';
import { formatPrice } from '@/lib/manzil/properties';
import { ROLE_LABELS, type Profile, type Property, type UserRole } from '@/lib/manzil/types';
import { errorText } from '@/lib/manzil/errors';

export function GlobalSearch({ role }: { role?: UserRole }) {
  const navigate = useNavigate();
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false);
  const [props, setProps] = useState<Property[]>([]); const [users, setUsers] = useState<Profile[]>([]);
  const dq = useDebounce(q, 350); const ref = useRef<HTMLDivElement>(null);
  const isAdmin = role === 'super_admin';
  const onlyAvailable = !role || role === 'buyer';

  useEffect(() => {
    if (dq.trim().length < 2) { setProps([]); setUsers([]); return; }
    let live = true; setLoading(true);
    Promise.all([searchProperties(dq, { onlyAvailable }), isAdmin ? searchUsers(dq) : Promise.resolve([])])
      .then(([p, u]) => { if (live) { setProps(p); setUsers(u); setOpen(true); } })
      .catch(e => { if (live) toast.error(errorText(e, 'Search failed')); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [dq, isAdmin, onlyAvailable]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = (fn: () => void) => { fn(); setQ(''); setOpen(false); };
  const ready = dq.trim().length >= 2 && !loading;

  return <div className="global-search" ref={ref}>
    <SearchBar value={q} onChange={v => { setQ(v); if (v.length >= 2) setOpen(true); }} onFocus={() => q.length >= 2 && setOpen(true)} loading={loading}
      placeholder={isAdmin ? 'Search properties or users…' : 'Search properties…'} />
    {open && q.trim().length >= 2 && <div className="global-search-menu" role="listbox">
      {loading && props.length === 0 && users.length === 0 && <div className="gs-empty">Searching…</div>}
      {ready && props.length === 0 && users.length === 0 && <div className="gs-empty">No results found</div>}
      {props.length > 0 && <><div className="gs-heading">Properties</div>{props.map(p =>
        <button type="button" key={p.id} className="gs-item" onClick={() => pick(() => void navigate({ to: '/property/$id', params: { id: p.id } }))}>
          <strong>{p.title}</strong><span>{[p.area, p.city].filter(Boolean).join(', ')} · {formatPrice(p.price)}</span>
        </button>)}</>}
      {isAdmin && users.length > 0 && <><div className="gs-heading">Users</div>{users.map(u =>
        <button type="button" key={u.id} className="gs-item" onClick={() => pick(() => void navigate({ to: '/admin-users', search: { q: u.email } as never }))}>
          <strong>{u.full_name || u.email}</strong><span>{u.email} · {ROLE_LABELS[u.role] ?? u.role}</span>
        </button>)}</>}
    </div>}
  </div>;
}
