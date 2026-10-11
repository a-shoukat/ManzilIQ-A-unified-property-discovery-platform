import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { getSupabase } from '@/lib/manzil/supabase';
import { uploadDocument } from '@/lib/manzil/storage';

interface Props {
  onDone: () => void;
}

/** Society registration — WBS: Society Portal · Registration & Verification (5) */
export function SocietyRegistrationForm({ onDone }: Props) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [developer, setDeveloper] = useState('');
  const [noc, setNoc] = useState<File | null>(null);
  const [secp, setSecp] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data: ud } = await supabase.auth.getUser();
      const user = ud.user;
      if (!user) throw new Error('Not signed in');
      const nocUrl = noc ? await uploadDocument(noc) : null;
      const secpUrl = secp ? await uploadDocument(secp) : null;
      const { error: dErr } = await supabase.from('society_details').insert({
        profile_id: user.id,
        society_name: name,
        address,
        developer_info: developer || null,
        noc_doc_url: nocUrl,
        secp_doc_url: secpUrl,
      });
      if (dErr) throw dErr;
      await supabase
        .from('profiles')
        .update({ verification_status: 'pending' })
        .eq('id', user.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label>
        Society name
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dream Gardens" />
      </label>
      <label>
        Address
        <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, area" />
      </label>
      <label>
        Developer info
        <input value={developer} onChange={(e) => setDeveloper(e.target.value)} placeholder="Developer / company name" />
      </label>
      <label>
        NOC document (upload)
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setNoc(e.target.files?.[0] ?? null)} />
      </label>
      <label>
        SECP registration (upload)
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSecp(e.target.files?.[0] ?? null)} />
      </label>
      {error && <div className="error">{error}</div>}
      <Button variant="legacy" className="btn" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit for verification'}
      </Button>
      <p className="muted" style={{ marginTop: 12 }}>
        Admin will review your NOC & SECP documents before activation.
      </p>
    </form>
  );
}

/** Dealer registration — WBS: Dealer Portal · Registration & Profile (5) */
export function DealerRegistrationForm({ onDone }: Props) {
  const [license, setLicense] = useState('');
  const [firm, setFirm] = useState('');
  const [exp, setExp] = useState('0');
  const [cnic, setCnic] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data: ud } = await supabase.auth.getUser();
      const user = ud.user;
      if (!user) throw new Error('Not signed in');
      const cnicUrl = cnic ? await uploadDocument(cnic) : null;
      const photoUrl = photo ? await uploadDocument(photo) : null;
      const { error: dErr } = await supabase.from('dealer_details').insert({
        profile_id: user.id,
        license_no: license,
        firm_name: firm,
        experience_years: parseInt(exp || '0', 10),
        cnic_doc_url: cnicUrl,
        photo_url: photoUrl,
      });
      if (dErr) throw dErr;
      await supabase
        .from('profiles')
        .update({ verification_status: 'pending' })
        .eq('id', user.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label>
        Agent license number
        <input required value={license} onChange={(e) => setLicense(e.target.value)} placeholder="e.g. DL-12345" />
      </label>
      <label>
        Firm name
        <input required value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="e.g. Ahmed Estates" />
      </label>
      <label>
        Experience (years)
        <input type="number" min={0} value={exp} onChange={(e) => setExp(e.target.value)} />
      </label>
      <label>
        CNIC verification (upload)
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setCnic(e.target.files?.[0] ?? null)} />
      </label>
      <label>
        Profile photo (upload)
        <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </label>
      {error && <div className="error">{error}</div>}
      <Button variant="legacy" className="btn" disabled={loading}>
        {loading ? 'Submitting…' : 'Submit for verification'}
      </Button>
      <p className="muted" style={{ marginTop: 12 }}>
        Admin will verify your CNIC & license before activation.
      </p>
    </form>
  );
}

/** Customer registration — WBS: Customer Portal · Account Registration (5) */
export function CustomerRegistrationForm({ onDone }: Props) {
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data: ud } = await supabase.auth.getUser();
      const user = ud.user;
      if (!user) throw new Error('Not signed in');
      const photoUrl = photo ? await uploadDocument(photo) : null;
      const { error: dErr } = await supabase.from('customer_details').insert({
        profile_id: user.id,
        cnic_number: cnic || null,
        contact_phone: phone || null,
        address: address || null,
        photo_url: photoUrl,
      });
      if (dErr) throw dErr;
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label>
        CNIC number
        <input value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="35202-1234567-1" />
      </label>
      <label>
        Contact info (phone)
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
      </label>
      <label>
        Address
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, area" />
      </label>
      <label>
        Profile photo (upload)
        <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </label>
      {error && <div className="error">{error}</div>}
      <Button variant="legacy" className="btn" disabled={loading}>
        {loading ? 'Saving…' : 'Complete registration'}
      </Button>
    </form>
  );
}
