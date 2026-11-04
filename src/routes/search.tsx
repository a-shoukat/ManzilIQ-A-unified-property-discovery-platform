import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { PageFrame, useAppNavigation } from '@/components/manzil/PageFrame';
import { SearchBar } from '@/components/manzil/SearchBar';
import PropertyCard from '@/components/manzil/PropertyCard';
import { useDebounce } from '@/hooks/use-debounce';
import { searchProperties } from '@/lib/manzil/search';
import { useCompare } from '@/lib/manzil/compare';
import { errorText } from '@/lib/manzil/errors';
import type { Property } from '@/lib/manzil/types';

export const Route = createFileRoute('/search')({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s['q'] === 'string' ? s['q'] : '' }),
  head: () => ({ meta: [
    { title: 'Search available properties | ManzilIQ' },
    { name: 'description', content: 'Search available plots, houses and commercial properties across Pakistan on ManzilIQ.' },
    { property: 'og:title', content: 'Search available properties | ManzilIQ' },
    { property: 'og:description', content: 'Search available plots, houses and commercial properties across Pakistan on ManzilIQ.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: SearchPage,
});

function SearchPage() {
  const { q: initial } = Route.useSearch();
  const onNavigate = useAppNavigation(); const { has, toggle } = useCompare();
  const [q, setQ] = useState(initial); const dq = useDebounce(q, 350);
  const [results, setResults] = useState<Property[]>([]); const [loading, setLoading] = useState(false);
  useEffect(() => { setQ(initial); }, [initial]);
  useEffect(() => {
    if (dq.trim().length < 2) { setResults([]); return; }
    let live = true; setLoading(true);
    searchProperties(dq, { limit: 30, onlyAvailable: true }).then(r => live && setResults(r))
      .catch(e => live && toast.error(errorText(e, 'Search failed'))).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [dq]);
  return <PageFrame publicPage><div className="marketplace-page">
    <div className="page-heading"><div><span className="eyebrow">SEARCH</span><h1>Find an available property</h1><p>Search by title, area, city, society or type.</p></div></div>
    <SearchBar value={q} onChange={setQ} autoFocus loading={loading} placeholder="Try “DHA Lahore” or “5 marla”…" className="search-bar-lg" />
    {dq.trim().length < 2 ? <p className="muted search-hint-text">Type at least 2 characters to search.</p>
      : !loading && results.length === 0 ? <div className="listing-empty"><Search size={28}/><h3>No results found</h3><p>Try a different area or keyword.</p></div>
      : <div className="listings-grid search-results">{results.map(p => <PropertyCard key={p.id} property={p} onOpen={id => onNavigate('property', id)} inCompare={has(p.id)} onToggleCompare={toggle} />)}</div>}
  </div></PageFrame>;
}
