import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSupabase } from '@/lib/manzil/supabase';
import { uploadDocument } from '@/lib/manzil/storage';

interface Props {
  onDone: () => void;
}

/** Society registration — WBS: Society Portal · Registration & Verification (5) */
export function SocietyRegistrationForm({ onDone }: Props) {
  const { t } = useTranslation(['auth', 'common']);
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
    if (!noc || !secp) { setError(t('auth:uploadNocSecp')); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: ud } = await supabase.auth.getUser();
      const user = ud.user;
      if (!user) throw new Error(t('auth:notSignedIn'));
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
      setError(err instanceof Error ? err.message : t('auth:registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label>
        {t('auth:societyName')}
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('auth:societyNamePlaceholder')} />
      </label>
      <label>
        {t('common:address')}
        <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('auth:addressPlaceholder')} />
      </label>
      <label>
        {t('auth:developerInfo')}
        <input value={developer} onChange={(e) => setDeveloper(e.target.value)} placeholder={t('auth:developerPlaceholder')} />
      </label>
      <label>
        {t('auth:nocDocument')}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setNoc(e.target.files?.[0] ?? null)} />
      </label>
      <label>
        {t('auth:secpRegistration')}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setSecp(e.target.files?.[0] ?? null)} />
      </label>
      {error && <div className="error">{error}</div>}
      <Button variant="legacy" className="btn" disabled={loading}>
        {loading ? t('auth:submitting') : t('auth:submitForVerification')}
      </Button>
      <p className="muted" style={{ marginTop: 12 }}>
        {t('auth:societyReviewNote')}
      </p>
    </form>
  );
}

/** Dealer registration — WBS: Dealer Portal · Registration & Profile (5) */
export function DealerRegistrationForm({ onDone }: Props) {
  const { t } = useTranslation(['auth', 'common']);
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
      if (!user) throw new Error(t('auth:notSignedIn'));
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
      setError(err instanceof Error ? err.message : t('auth:registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label>
        {t('auth:agentLicense')}
        <input required value={license} onChange={(e) => setLicense(e.target.value)} placeholder={t('auth:licensePlaceholder')} />
      </label>
      <label>
        {t('auth:firmName')}
        <input required value={firm} onChange={(e) => setFirm(e.target.value)} placeholder={t('auth:firmPlaceholder')} />
      </label>
      <label>
        {t('auth:experienceYears')}
        <input type="number" min={0} value={exp} onChange={(e) => setExp(e.target.value)} dir="ltr" className="ltr-isolate" />
      </label>
      <label>
        {t('auth:cnicVerificationUpload')}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setCnic(e.target.files?.[0] ?? null)} />
      </label>
      <label>
        {t('auth:profilePhotoUpload')}
        <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
      </label>
      {error && <div className="error">{error}</div>}
      <Button variant="legacy" className="btn" disabled={loading}>
        {loading ? t('auth:submitting') : t('auth:submitForVerification')}
      </Button>
      <p className="muted" style={{ marginTop: 12 }}>
        {t('auth:dealerReviewNote')}
      </p>
    </form>
  );
}

/** Customer registration with CNIC verification — reviewed by super admin. */
export function CustomerRegistrationForm({ onDone }: Props) {
  const { t } = useTranslation(['auth', 'common']);
  const [fullName, setFullName] = useState('');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    if (!front || !back) { setError(t('auth:uploadBothCnic')); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: ud } = await supabase.auth.getUser();
      const user = ud.user;
      if (!user) throw new Error(t('auth:notSignedIn'));
      const frontUrl = await uploadDocument(front);
      const backUrl = await uploadDocument(back);
      const { error: dErr } = await supabase.from('customer_details').upsert({
        profile_id: user.id,
        cnic_number: cnic,
        contact_phone: phone,
        address: address || null,
        photo_url: frontUrl,
        cnic_front_url: frontUrl,
        cnic_back_url: backUrl,
      });
      if (dErr) throw dErr;
      await supabase.from('profiles').update({ verification_status: 'pending', full_name: fullName }).eq('id', user.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth:registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <label>
        {t('auth:fullNameOnCnic')}
        <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('auth:fullNamePlaceholder')} />
      </label>
      <label>
        {t('auth:cnicNumber')}
        <input required pattern="[0-9]{5}-?[0-9]{7}-?[0-9]" title={t('auth:cnicFormatTitle')} value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder={t('auth:cnicPlaceholder')} dir="ltr" className="ltr-isolate" />
      </label>
      <label>
        {t('auth:phoneNumber')}
        <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('auth:mobilePlaceholder')} dir="ltr" className="ltr-isolate" />
      </label>
      <label>
        {t('common:address')}
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('auth:addressPlaceholder')} />
      </label>
      <label>
        {t('auth:cnicFrontPhoto')}
        <input required type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setFront(e.target.files?.[0] ?? null)} />
      </label>
      <label>
        {t('auth:cnicBackPhoto')}
        <input required type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setBack(e.target.files?.[0] ?? null)} />
      </label>
      {error && <div className="error">{error}</div>}
      <Button variant="legacy" className="btn" disabled={loading}>
        {loading ? t('auth:submitting') : t('auth:submitForVerification')}
      </Button>
      <p className="muted" style={{ marginTop: 12 }}>
        {t('auth:buyerReviewNote')}
      </p>
    </form>
  );
}
