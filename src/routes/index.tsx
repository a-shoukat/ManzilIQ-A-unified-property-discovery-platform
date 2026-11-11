import { featuredFirst, describeSearch, type SearchFilters } from '@/lib/manzil/listing-detail';
import { saveSearch } from '@/lib/manzil/phase4';
import { useAuth } from '@/lib/manzil/auth';
import { toast } from 'sonner';
import { errorText } from '@/lib/manzil/errors';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Search, MapPin, ChevronDown, SlidersHorizontal, LayoutGrid, List, ArrowUpRight, X, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageFrame, pageHead, useAppNavigation } from '@/components/manzil/PageFrame';
import PropertyCard from '@/components/manzil/PropertyCard';
import { filterForViewer } from '@/lib/manzil/sold-visibility';
import { fetchProperties, readCachedProperties } from '@/lib/manzil/properties';
import { useCompare } from '@/lib/manzil/compare';
import type { Property } from '@/lib/manzil/types';
import residence from '@/assets/residence.jpg';
import { getHomepageCms } from '@/lib/manzil/homepage-cms.functions';
import {
  BUILTIN_RESIDENCE_PATH,
  defaultHomepageView,
  homepageTitleLines,
  type HomepageCmsView,
} from '@/lib/manzil/homepage-cms';
import { bannerImageUrl } from '@/lib/manzil/cms';

if (typeof window !== 'undefined') void fetchProperties();
export const Route = createFileRoute('/')({ head:()=>pageHead('Marketplace — Find your next property'), component:Index });
function Index() {
 const onNavigate=useAppNavigation();
 const [all,setAll]=useState<Property[]>([]); const [demo,setDemo]=useState(false); const [loading,setLoading]=useState(true);
 const [q,setQ]=useState(''); const [city,setCity]=useState(''); const [category,setCategory]=useState(''); const [purpose,setPurpose]=useState(''); const [status,setStatus]=useState(''); const [maxPrice,setMaxPrice]=useState(''); const [sort,setSort]=useState('newest'); const [advanced,setAdvanced]=useState(false); const [view,setView]=useState('grid');
 const {items,toggle,has,clear}=useCompare();
 const [cms,setCms]=useState<HomepageCmsView>(()=>defaultHomepageView());
 const [bannerUrls,setBannerUrls]=useState<Record<string,string>>({});
 useEffect(()=>{const c=readCachedProperties(); if(c){setAll(c.list);setDemo(c.demo);setLoading(false)} fetchProperties().then(({list,demo})=>{setAll(list);setDemo(demo)}).finally(()=>setLoading(false))},[]);
 useEffect(()=>{
  let cancelled=false;
  void getHomepageCms().then(async (view)=>{
   if(cancelled) return;
   setCms(view);
   const next:Record<string,string>={};
   for(const b of view.banners){
    if(!b.image_path || b.image_path===BUILTIN_RESIDENCE_PATH) continue;
    const u=await bannerImageUrl(b.image_path);
    if(u) next[b.id]=u;
   }
   if(!cancelled) setBannerUrls(next);
  }).catch(()=>{ if(!cancelled) setCms(defaultHomepageView()); });
  return ()=>{ cancelled=true; };
 },[]);
 const { profile:viewer }=useAuth(); const shown=filterForViewer(all,viewer?.role);
 const cities=[...new Set(shown.map(p=>p.city))];
 const filtered=featuredFirst(shown.filter(p=>(!q||`${p.title} ${p.area??''} ${p.society_name??''}`.toLowerCase().includes(q.toLowerCase()))&&(!city||p.city===city)&&(!category||p.category===category)&&(!purpose||p.purpose===purpose)&&(!status||p.status===status)&&(!maxPrice||p.price<=Number(maxPrice))).sort((a,b)=>sort==='price-asc'?a.price-b.price:sort==='price-desc'?b.price-a.price:sort==='size-desc'?b.plot_size_marla-a.plot_size_marla:new Date(b.created_at).getTime()-new Date(a.created_at).getTime()));
 const reset=()=>{setQ('');setCity('');setCategory('');setPurpose('');setStatus('');setMaxPrice('')};
 const content=cms.content;
 return <PageFrame publicPage><div className="marketplace-page"><div className="page-heading"><div><span className="eyebrow">{content['marketplace_eyebrow']}</span><h1>{content['marketplace_title']}</h1><p>{content['marketplace_subtitle']}</p></div><Button variant="legacy" className="quiet-link" onClick={()=>onNavigate('map-view')}>Explore on map <ArrowUpRight size={17}/></Button></div>
 {cms.banners.map((banner)=>(
  <section key={banner.id} className="property-banner"><img src={banner.image_path===BUILTIN_RESIDENCE_PATH||!banner.image_path?residence:(bannerUrls[banner.id]??residence)} alt="Contemporary residence with landscaped garden" width={1920} height={768} fetchPriority="high" decoding="async"/><div className="banner-shade"/><div className="banner-content"><span className="banner-eyebrow">{content['hero_eyebrow']}</span><h2>{homepageTitleLines(banner.title).map((line,i)=><span key={i}>{i>0&&<br/>}{line}</span>)}</h2><p>{banner.subtitle}</p><Button variant="legacy" className="banner-button" onClick={()=>{ if(banner.href){ onNavigate(banner.href.replace(/^\//,'')); return; } document.getElementById('listings')?.scrollIntoView({behavior:'smooth'}); }}>Find your place <ArrowUpRight size={17}/></Button></div><span className="banner-caption"><MapPin size={13}/> Spaces worth imagining</span></section>
 ))}
 <section className="search-section"><div className="purpose-tabs">{([['','All properties'],['sale','Buy'],['rent','Rent']] as const).map(([value,label])=><Button variant="legacy" key={label} className={`purpose-tab${purpose===value?' active':''}`} onClick={()=>setPurpose(value)}>{label}</Button>)}<span className="search-hint">Find a property that fits your plans</span></div><div className="search-controls"><label className="search-field"><Search size={18}/><input aria-label="Search properties" placeholder="Search area, society or property…" value={q} onChange={e=>setQ(e.target.value)}/></label><label className="search-select"><MapPin size={16}/><select aria-label="City" value={city} onChange={e=>setCity(e.target.value)}><option value="">All cities</option>{cities.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={14}/></label><label className="search-select"><select aria-label="Property type" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Property type</option><option value="residential">Residential</option><option value="commercial">Commercial</option></select><ChevronDown size={14}/></label><Button variant="outline" className="filter-button" onClick={()=>setAdvanced(!advanced)}><SlidersHorizontal size={16}/>Filters</Button></div>{advanced&&<div className="advanced-filters"><label>Maximum price (PKR)<input type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Any budget"/></label><label>Availability<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select></label><Button variant="ghost" onClick={reset}><RotateCcw/>Reset filters</Button></div>}<SaveSearchButton filters={{q:q||undefined,city:city||undefined,category:category||undefined,purpose:purpose||undefined,maxPrice:maxPrice?Number(maxPrice):undefined}} onNavigate={onNavigate}/></section>
 <section id="listings"><div className="listings-heading"><div><h2>Properties for you <span>{filtered.length}</span></h2><p>{demo?'Sample properties · Preview collection':'Explore the latest properties on the market'}</p></div><div className="listing-tools"><label>Sort by: <select aria-label="Sort properties" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="size-desc">Largest first</option></select></label><div className="view-toggle"><Button variant="legacy" className={view==='grid'?'active':''} aria-label="Grid view" onClick={()=>setView('grid')}><LayoutGrid size={16}/></Button><Button variant="legacy" className={view==='list'?'active':''} aria-label="List view" onClick={()=>setView('list')}><List size={17}/></Button></div></div></div>
 {items.length>0&&<div className="compare-bar"><span>{items.length} of 3 properties selected</span><div><Button size="sm" onClick={()=>onNavigate('compare')}>Compare properties <ArrowUpRight size={14}/></Button><Button variant="ghost" size="icon" aria-label="Clear comparison" onClick={clear}><X/></Button></div></div>}
 {loading?<div className="listings-grid">{[0,1,2,3,4,5].map(i=><div key={i} className="listing-skeleton"/>)}</div>:filtered.length===0?<div className="listing-empty"><Search size={28}/><h3>No properties found</h3><p>Try a different area or adjust your filters.</p><Button variant="outline" onClick={reset}>Reset filters</Button></div>:<div className={`listings-grid${view==='list'?' list-view':''}`}>{filtered.map(p=><PropertyCard key={p.id} property={p} onOpen={id=>onNavigate('property',id)} inCompare={has(p.id)} onToggleCompare={toggle}/>)}</div>}</section>
 <div className="estimate-strip"><span className="estimate-icon"><Sparkles size={21}/></span><div><strong>What's the right price?</strong><p>A little insight before your next big decision.</p></div><Button variant="legacy" className="quiet-link" onClick={()=>onNavigate('price-estimator')}>Get a price estimate <ArrowUpRight size={16}/></Button></div></div></PageFrame>;
}

function SaveSearchButton({ filters, onNavigate }: { filters: SearchFilters; onNavigate: (p: string) => void }) {
 const { session } = useAuth();
 const [busy, setBusy] = useState(false);
 const empty = !Object.values(filters).some(Boolean);
 const save = async () => {
  if (!session) { onNavigate('login'); return; }
  setBusy(true);
  try { await saveSearch(filters, describeSearch(filters)); toast.success('Search saved — you will see new matches under Saved searches'); }
  catch (e) { toast.error(errorText(e, 'Could not save search')); }
  setBusy(false);
 };
 return <div className="save-search-row"><Button variant="outline" size="sm" disabled={busy || empty} onClick={() => void save()} title={empty ? 'Pick a filter first' : undefined}><Bell size={15}/>{busy ? 'Saving…' : 'Save this search & get alerts'}</Button></div>;
}
