import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { createProperty, fetchProperty, updateProperty } from '@/lib/manzil/properties';
import { errorText } from '@/lib/manzil/errors';
import { useAuth } from '@/lib/manzil/auth';
import type { PropertyCategory, PropertyPurpose } from '@/lib/manzil/types';

/** Manual property entry — for dealers / societies (full inventory mgmt in v4) */
function AddProperty({ onNavigate, editId }: { onNavigate: (p: string, arg?: string) => void; editId?: string }) {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [society, setSociety] = useState('');
  const [block, setBlock] = useState('');
  const [size, setSize] = useState('5');
  const [category, setCategory] = useState<PropertyCategory>('residential');
  const [purpose, setPurpose] = useState<PropertyPurpose>('sale');
  const [price, setPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [description, setDescription] = useState('');
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
          plot_size_marla: parseFloat(size) || 0,
          category,
          purpose,
          price: parseFloat(price) || 0,
          bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
          bathrooms: bathrooms ? parseInt(bathrooms, 10) : null,
          description: description || null,
          status: existingStatus,
        };
      if (editId) { await updateProperty(editId, fields); onNavigate('property', editId); }
      else { await createProperty({ ...fields, image_url: null }, session?.user.id ?? ""); onNavigate('marketplace'); }
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
              <input required type="number" min={0} step="0.5" value={size} onChange={(e) => setSize(e.target.value)} />
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
          {error && <div className="error">{error}</div>}
          <Button variant="legacy" className="btn" disabled={loading}>
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
