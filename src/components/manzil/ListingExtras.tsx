import { useEffect, useState } from 'react';
import { Check, Flag, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PropertyCard from '@/components/manzil/PropertyCard';
import { useAuth } from '@/lib/manzil/auth';
import { useCompare } from '@/lib/manzil/compare';
import { filterForViewer } from '@/lib/manzil/sold-visibility';
import { fetchProperties } from '@/lib/manzil/properties';
import { freshness, similarProperties, REPORT_REASONS } from '@/lib/manzil/listing-detail';
import { reportListing } from '@/lib/manzil/phase4';
import { errorText } from '@/lib/manzil/errors';
import type { Property } from '@/lib/manzil/types';
import { isFlaggedListingImage } from '@/lib/manzil/listing-flags';

export function Gallery({ p, fallback }: { p: Property; fallback: string | null }) {
  const raw = p.images?.length ? p.images : p.image_url ? [p.image_url] : fallback ? [fallback] : [];
  const photos = isFlaggedListingImage(p) ? (fallback ? [fallback] : []) : raw;
  const [i, setI] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const showFallback = !photos.length || failed[i];
  if (showFallback && !fallback) {
    return <div className="prop-img large"><div className="prop-img-fallback">{p.category === 'commercial' ? 'Commercial' : 'Residence'}</div></div>;
  }
  const src = showFallback ? fallback! : photos[i]!;
  return (
    <div className="gallery">
      <div className="prop-img large">
        <img
          src={src}
          alt={`${p.title} — photo ${i + 1}`}
          width={1024}
          height={768}
          onError={() => setFailed((f) => ({ ...f, [i]: true }))}
        />
      </div>
      {photos.length > 1 && <div className="gallery-thumbs">{photos.map((u, k) => (
        <button key={u} type="button" className={k === i ? 'active' : ''} aria-label={`Show photo ${k + 1}`} onClick={() => setI(k)}><img src={u} alt="" loading="lazy" /></button>
      ))}</div>}
    </div>
  );
}

export function ListingMeta({ p }: { p: Property }) {
  const f = freshness(p.created_at);
  return <div className="listing-meta">{p.is_featured && <span className="flag-featured">Featured</span>}{f.isNew && <span className="flag-new">New</span>}<span className="muted small">{f.label}</span></div>;
}

export function ContactReveal({ p, onNavigate }: { p: Property; onNavigate: (page: string) => void }) {
  const { session } = useAuth();
  const [shown, setShown] = useState(false);
  if (!p.contact_phone) return null;
  if (!session) return <Button size="sm" variant="outline" onClick={() => onNavigate('login')}><Phone size={15} />Sign in to see phone</Button>;
  return shown
    ? <a className="contact-phone" href={`tel:${p.contact_phone}`}><Phone size={15} />{p.contact_phone}</a>
    : <Button size="sm" onClick={() => setShown(true)}><Phone size={15} />Show phone number</Button>;
}

export function Amenities({ p }: { p: Property }) {
  // Only show amenities that are explicitly present/true — ignore blank or "false" defaults.
  const list = (p.amenities ?? []).map((a) => String(a).trim()).filter((a) => a && a.toLowerCase() !== 'false' && a !== '0');
  if (!list.length) return null;
  return <section className="card card-full" style={{ margin: '16px 0' }}><h3>Amenities & features</h3>
    <div className="amenity-list">{list.map((a) => <span key={a}><Check size={14} />{a}</span>)}</div></section>;
}

export function ReportListing({ p }: { p: Property }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  if (!session || p.id.startsWith('demo-')) return null;
  const send = async () => {
    setBusy(true);
    try { await reportListing(p.id, p.title, reason, details); toast.success('Thanks — our team will review this listing'); setOpen(false); setDetails(''); }
    catch (e) { toast.error(errorText(e, 'Could not send report')); }
    setBusy(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="ghost"><Flag size={15} />Report listing</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report this listing</DialogTitle></DialogHeader>
        <label>Reason<select value={reason} onChange={(e) => setReason(e.target.value)}>{REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}</select></label>
        <label>Details (optional)<textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} /></label>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={() => void send()}>{busy ? 'Sending…' : 'Send report'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SimilarListings({ p, onNavigate }: { p: Property; onNavigate: (page: string, arg?: string) => void }) {
  const [list, setList] = useState<Property[]>([]);
  const { has, toggle } = useCompare();
  const { profile } = useAuth();
  useEffect(() => { fetchProperties().then(({ list }) => setList(similarProperties(p, filterForViewer(list, profile?.role)))); }, [p, profile?.role]);
  if (!list.length) return null;
  return <section style={{ marginTop: 32 }}><h2>Similar properties</h2>
    <div className="listings-grid">{list.map((x) => <PropertyCard key={x.id} property={x} onOpen={(id) => onNavigate('property', id)} inCompare={has(x.id)} onToggleCompare={toggle} />)}</div></section>;
}
