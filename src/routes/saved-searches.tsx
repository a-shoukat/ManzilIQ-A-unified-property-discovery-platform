import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import PropertyCard from '@/components/manzil/PropertyCard';
import { useCompare } from '@/lib/manzil/compare';
import { fetchProperties } from '@/lib/manzil/properties';
import { newMatches, matchesSearch } from '@/lib/manzil/listing-detail';
import { fetchSavedSearches, markSearchSeen, deleteSavedSearch, type SavedSearch } from '@/lib/manzil/phase4';
import { errorText } from '@/lib/manzil/errors';
import type { Property } from '@/lib/manzil/types';

function SavedSearches({ onNavigate }: { onNavigate: (p: string, arg?: string) => void }) {
  const [list, setList] = useState<SavedSearch[] | null>(null);
  const [all, setAll] = useState<Property[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { has, toggle } = useCompare();
  const load = () => fetchSavedSearches().then(setList).catch((e) => { setErr(errorText(e, 'Could not load saved searches')); setList([]); });
  useEffect(() => { void load(); fetchProperties().then(({ list }) => setAll(list.filter((p) => !p.id.startsWith('demo-')))); }, []);

  return (
    <div className="page page-full">
      <div className="topbar">
        <div><h1>Saved searches</h1><p className="muted" style={{ margin: 0 }}>New listings that match your searches appear here.</p></div>
        <Button variant="outline" size="sm" onClick={() => onNavigate('marketplace')}>New search</Button>
      </div>
      {err && <p className="error">{err}</p>}
      {!list ? <p className="muted">Loading…</p> : list.length === 0 ? (
        <div className="card card-full"><strong>No saved searches yet</strong><p className="muted">On the marketplace, pick a city or type and press “Save this search & get alerts”.</p></div>
      ) : list.map((s) => {
        const fresh = newMatches(all, s.filters, s.last_seen_at);
        const shown = open === s.id ? all.filter((p) => matchesSearch(p, s.filters)) : [];
        return (
          <div key={s.id} className="card card-full" style={{ marginBottom: 12 }}>
            <div className="queue-head">
              <div><strong>{s.label}</strong><div className="muted small">Saved {new Date(s.created_at).toLocaleDateString()}</div></div>
              {fresh.length > 0 ? <span className="badge ok">{fresh.length} new</span> : <span className="badge">No new</span>}
            </div>
            <div className="link-row">
              <Button size="sm" onClick={async () => { setOpen(open === s.id ? null : s.id); if (fresh.length) { try { await markSearchSeen(s.id); void load(); } catch { /* ignore */ } } }}>{open === s.id ? 'Hide results' : 'View matches'}</Button>
              <Button size="sm" variant="outline" onClick={async () => { try { await deleteSavedSearch(s.id); toast.success('Search removed'); void load(); } catch (e) { toast.error(errorText(e, 'Could not remove')); } }}>Remove</Button>
            </div>
            {open === s.id && (shown.length ? <div className="listings-grid" style={{ marginTop: 12 }}>{shown.map((p) => <PropertyCard key={p.id} property={p} onOpen={(id) => onNavigate('property', id)} inCompare={has(p.id)} onToggleCompare={toggle} />)}</div> : <p className="muted">No listings match yet.</p>)}
          </div>
        );
      })}
    </div>
  );
}

export const Route = createFileRoute('/saved-searches')({ head: () => pageHead('Saved Searches'), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame><SavedSearches onNavigate={onNavigate} /></PageFrame>; }
