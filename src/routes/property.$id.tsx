import { sendInquiry } from '@/lib/manzil/phase3';
import { formatSize } from '@/lib/manzil/phase3-rules';
import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { fetchProperty, formatPrice, deleteProperty } from '@/lib/manzil/properties';
import { canManageListing, canDeleteListing } from '@/lib/manzil/listing-rules';
import { useWishlist } from '@/lib/manzil/wishlist';
import { useAuth } from '@/lib/manzil/auth';
import { errorText } from '@/lib/manzil/errors';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCompare } from '@/lib/manzil/compare';
import type { Property } from '@/lib/manzil/types';
import residence from '@/assets/residence.jpg';
import plot from '@/assets/plot.jpg';
import commercial from '@/assets/commercial.jpg';

function PropertyDetail({
  id,
  onNavigate,
}: {
  id: string;
  onNavigate: (p: string, arg?: string) => void;
}) {
  const [p, setP] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const { toggle, has } = useCompare();
  const wish = useWishlist();
  const { profile } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const removeListing = async (prop: Property) => {
    if (!canDeleteListing(prop)) { toast.error('This property is reserved or sold. Resolve its booking before deleting.'); return; }
    setDeleting(true);
    try { await deleteProperty(prop.id); toast.success('Listing deleted'); onNavigate('marketplace'); }
    catch (err) { toast.error(errorText(err, 'Could not delete listing')); setDeleting(false); }
  };

  useEffect(() => {
    fetchProperty(id).then((prop) => {
      setP(prop);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="container">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="container">
        <p className="muted">Property not found.</p>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('marketplace')}>
          Back to marketplace
        </Button>
      </div>
    );
  }

  const rows: [string, string][] = [
    ['City', p.city],
    ['Area', p.area ?? '—'],
    ['Society', p.society_name ?? '—'],
    ['Block', p.block ?? '—'],
    ['Plot size', formatSize(p.plot_size_marla)],
    ['Category', p.category],
    ['Purpose', p.purpose],
    ['Bedrooms', p.bedrooms != null ? String(p.bedrooms) : '—'],
    ['Bathrooms', p.bathrooms != null ? String(p.bathrooms) : '—'],
    ['Status', p.status],
  ];

  return (
    <div className="container">
      <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('marketplace')}>
        ← Back
      </Button>
      <div className="detail-hero">
        <div className="prop-img large">
          {p.image_url || p.id.startsWith('demo-') ? (
            <img src={p.image_url || (p.category === 'commercial' ? commercial : p.bedrooms ? residence : plot)} alt={p.title} width={1024} height={768} />
          ) : (
            <div className="prop-img-fallback">{p.category === 'commercial' ? '🏢' : '🏠'}</div>
          )}
        </div>
        <div>
          <h1>{p.title}</h1>
          <p className="muted">
            {p.city}
            {p.area ? ` · ${p.area}` : ''}
          </p>
          <p className="price big">{formatPrice(p.price)}</p>
          <div className="link-row">
            <Button variant="legacy" className={`btn small ${has(p.id) ? 'secondary' : ''}`} onClick={() => toggle(p)}>
              {has(p.id) ? '✓ In comparison' : '+ Add to compare'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void wish.toggle(p.id)}>{wish.has(p.id) ? '♥ Saved' : '♡ Save'}</Button>
            {canManageListing(p, profile) && <>
              <Button size="sm" variant="outline" onClick={() => onNavigate('edit-property', p.id)}>Edit</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild><Button size="sm" variant="destructive" disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                    <AlertDialogDescription>“{p.title}” will be removed from the marketplace. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void removeListing(p)}>Delete</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>}
          </div>
        </div>
      </div>
      {p.description && <p className="desc">{p.description}</p>}
      <InquiryBox p={p} />
      <div className="spec-table">
        {rows.map(([k, v]) => (
          <div key={k} className="spec-row">
            <span className="detail-key">{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InquiryBox({ p }: { p: Property }) {
  const { session, profile } = useAuth();
  const [msg, setMsg] = useState(`Is "${p.title}" still available?`);
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  if (!p.owner_id || p.owner_id === session?.user.id) return null;
  if (!session) return <div className="card card-full" style={{ margin: '16px 0' }}><strong>Interested?</strong><p className="muted small">Sign in to send an inquiry to the seller.</p></div>;
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try { await sendInquiry(p.owner_id!, p.title, { name: profile?.full_name || session.user.email || 'Buyer', phone, email: session.user.email ?? '' }, msg); toast.success('Inquiry sent to the seller'); setMsg(''); }
    catch (err) { toast.error(errorText(err, 'Could not send inquiry')); }
    setSending(false);
  };
  return (
    <form className="card card-full" style={{ margin: '16px 0' }} onSubmit={send}>
      <strong>Send an inquiry</strong>
      <label>Your phone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" /></label>
      <label>Message<textarea required rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} /></label>
      <Button size="sm" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send inquiry'}</Button>
    </form>
  );
}

export const Route = createFileRoute("/property/$id")({ head: () => pageHead("Property"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame publicPage><PropertyDetail id={Route.useParams().id} onNavigate={onNavigate} /></PageFrame>; }
