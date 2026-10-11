import { VoiceFill } from '@/components/manzil/VoiceFill';
import { toast } from 'sonner';
import { AMENITIES, MAX_PHOTOS } from '@/lib/manzil/listing-detail';
import { uploadListingPhoto } from '@/lib/manzil/phase4';
import { toMarla } from '@/lib/manzil/phase3-rules';
import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { createProperty, fetchProperty, updateProperty } from '@/lib/manzil/properties';
import { errorText } from '@/lib/manzil/errors';
import { useAuth } from '@/lib/manzil/auth';
import type { PropertyCategory, PropertyPurpose } from '@/lib/manzil/types';

/** Manual property entry — for dealers / societies (full inventory mgmt in v4) */
function AddProperty({ onNavigate, editId }: { onNavigate: (p: string, arg?: string) => void; editId?: string | undefined }) {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [society, setSociety] = useState('');
  const [block, setBlock] = useState('');
  const [size, setSize] = useState('5');
  const [unit, setUnit] = useState<'marla' | 'kanal'>('marla');
  const [category, setCategory] = useState<PropertyCategory>('residential');
  const [purpose, setPurpose] = useState<PropertyPurpose>('sale');
  const [price, setPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [featured, setFeatured] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { profile } = useAuth();
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - images.length;
    if (room <= 0) { setError(`Up to ${MAX_PHOTOS} photos`); return; }
    setUploading(true); setError(null);
    try { const urls: string[] = []; for (const f of [...files].slice(0, room)) urls.push(await uploadListingPhoto(f)); setImages((p) => [...p, ...urls]); }
    catch (err) { setError(errorText(err, 'Photo upload failed')); }
    setUploading(false);
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingStatus, setExistingStatus] = useState<'available' | 'reserved' | 'sold'>('available');

  useEffect(() => {
    if (!editId) return;
    void fetchProperty(editId).then((p) => {
      if (!p) return;
      setTitle(p.title); setCity(p.city); setArea(p.area ?? ''); setSociety(p.society_name ?? ''); setBlock(p.block ?? '');
      setSize(String(p.plot_size_marla)); setCategory(p.category); setPurpose(p.purpose); setPrice(String(p.price));
      setBedrooms(p.bedrooms != null ? String(p.bedrooms) : ''); setBathrooms(p.bathrooms != null ? String(p.bathrooms) : '');
      setDescription(p.description ?? ''); setExistingStatus(p.status);
      setAmenities(p.amenities ?? []); setImages(p.images ?? (p.image_url ? [p.image_url] : [])); setPhone(p.contact_phone ?? ''); setFeatured(!!p.is_featured);
    });
  }, [editId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fields = {
          title,
          city,
          area: area || null,
          society_name: society || null,
          block: block || null,
          plot_size_marla: toMarla(parseFloat(size) || 0, unit),
          category,
          purpose,
          price: parseFloat(price) || 0,
          bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
          bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
          description: description || null,
          status: existingStatus,
          // Detail fields are only sent when used, so listings still save before the Phase 4 setup runs.
          ...(images.length ? { images, image_url: images[0] } : {}),
          ...(amenities.length ? { amenities } : {}),
          ...(phone ? { contact_phone: phone } : {}),
          ...(profile?.role === 'super_admin' ? { is_featured: featured } : {}),
        };
      if (editId) { await updateProperty(editId, fields); onNavigate('property', editId); }
      else { await createProperty({ image_url: null, ...fields }, session?.user.id ?? ""); onNavigate('marketplace'); }
    } catch (err) {
      setError(errorText(err, editId ? 'Failed to save changes' : 'Failed to add property'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card wide">
        <h1>{editId ? 'Edit property' : 'Add property'}</h1>
        <p className="muted">List a new property on the marketplace</p>
        <VoiceFill onApply={(v) => {
          if (v.title && !title) setTitle(v.title);
          if (v.city) setCity(v.city); if (v.society) setSociety(v.society); if (v.block) setBlock(v.block);
          if (v.size) { setSize(String(v.size)); setUnit(v.unit ?? 'marla'); }
          if (v.price) setPrice(String(v.price)); if (v.category) setCategory(v.category); if (v.purpose) setPurpose(v.purpose);
          if (v.bedrooms) setBedrooms(String(v.bedrooms)); if (v.bathrooms) setBathrooms(String(v.bathrooms));
          if (v.phone) setPhone(v.phone); if (v.amenities) setAmenities((p) => [...new Set([...p, ...v.amenities!])]);
          toast.success('Form filled — please check the details before saving');
        }} />
        <form onSubmit={submit}>
          <label>
            Title
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 5 Marla House — Dream Gardens" />
          </label>
          <div className="form-row">
            <label>
              City
              <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Narowal" />
            </label>
            <label>
              Area
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Zafarwal Road" />
            </label>
          </div>
          <div className="form-row">
            <label>
              Society
              <input value={society} onChange={(e) => setSociety(e.target.value)} />
            </label>
            <label>
              Block
              <input value={block} onChange={(e) => setBlock(e.target.value)} placeholder="A" />
            </label>
          </div>
          <div className="form-row">
            <label>
              Size (Marla)
              <span style={{ display: 'flex', gap: 8 }}><input required type="number" min={0} step="0.5" value={size} onChange={(e) => setSize(e.target.value)} /><select aria-label="Size unit" value={unit} onChange={(e) => setUnit(e.target.value as 'marla' | 'kanal')} style={{ width: 110 }}><option value="marla">Marla</option><option value="kanal">Kanal</option></select></span>
            </label>
            <label>
              Price (PKR)
              <input required type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value as PropertyCategory)}>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </label>
            <label>
              Purpose
              <select value={purpose} onChange={(e) => setPurpose(e.target.value as PropertyPurpose)}>
                <option value="sale">Sale</option>
                <option value="rent">Rent</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Bedrooms
              <input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
            </label>
            <label>
              Bathrooms
              <input type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
            </label>
          </div>
          <label>
            Description
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>Contact phone (shown to signed-in buyers)<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" /></label>
          <fieldset className="amenity-picker"><legend>Amenities & features</legend>
            {AMENITIES.map((a) => <label key={a} className="amenity-chip"><input type="checkbox" checked={amenities.includes(a)} onChange={(e) => setAmenities((p) => e.target.checked ? [...p, a] : p.filter((x) => x !== a))} />{a}</label>)}
          </fieldset>
          <div className="photo-picker">
            <div className="muted small">Photos ({images.length}/{MAX_PHOTOS}) — the first photo is the cover.</div>
            <div className="photo-thumbs">
              {images.map((u, i) => <div key={u} className="photo-thumb"><img src={u} alt={`Photo ${i + 1}`} /><button type="button" aria-label="Remove photo" onClick={() => setImages((p) => p.filter((x) => x !== u))}>×</button></div>)}
              {images.length < MAX_PHOTOS && <label className="photo-add">{uploading ? 'Uploading…' : '+ Add photos'}<input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={(e) => void addPhotos(e.target.files)} /></label>}
            </div>
          </div>
          {profile?.role === 'super_admin' && <label className="amenity-chip"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />Featured listing (shown first)</label>}
          {error && <div className="error">{error}</div>}
          <Button variant="legacy" className="btn" disabled={loading || uploading}>
            {loading ? 'Saving…' : editId ? 'Save changes' : 'Add property'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/add-property")({
  validateSearch: (s: Record<string, unknown>): { edit?: string } => (typeof s['edit'] === 'string' ? { edit: s['edit'] } : {}),
  head: () => pageHead("Add Property"),
  component: RoutePage,
});
function RoutePage() { const onNavigate = useAppNavigation(); const { edit } = Route.useSearch(); return <PageFrame ><AddProperty key={edit ?? 'new'} onNavigate={onNavigate} editId={edit} /></PageFrame>; }
