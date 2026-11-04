import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PasswordInput, PASSWORD_MISMATCH } from '@/components/manzil/PasswordInput';
import { Button } from '@/components/ui/button';
import { PageFrame, pageHead } from '@/components/manzil/PageFrame';
import { getSupabase } from '@/lib/manzil/supabase';
import { useAuth } from '@/lib/manzil/auth';
import { uploadDocument } from '@/lib/manzil/storage';
import { errorText } from '@/lib/manzil/errors';
import { ROLE_LABELS } from '@/lib/manzil/types';

function ProfilePage() {
  const { profile, details, refresh } = useAuth();
  const d = (details ?? {}) as { contact_phone?: string | null; address?: string | null; photo_url?: string | null };
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [cnicFront, setCnicFront] = useState<File | null>(null);
  const [cnicBack, setCnicBack] = useState<File | null>(null);
  const [cnicBusy, setCnicBusy] = useState(false);
  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  useEffect(() => {
    setName(profile?.full_name ?? '');
    setPhone(d.contact_phone ?? '');
    setAddress(d.address ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, details]);

  const isBuyer = profile?.role === 'buyer';

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = getSupabase(); if (!db || !profile) return;
    setSaving(true);
    try {
      const { error } = await db.from('profiles').update({ full_name: name || null }).eq('id', profile.id);
      if (error) throw error;
      if (isBuyer) {
        const patch: Record<string, string | null> = { contact_phone: phone || null, address: address || null };
        if (photo) patch['photo_url'] = await uploadDocument(photo);
        const { error: e2 } = await db.from('customer_details').upsert({ profile_id: profile.id, ...patch }, { onConflict: 'profile_id' });
        if (e2) throw e2;
      }
      await refresh();
      toast.success('Profile saved');
    } catch (err) { toast.error(errorText(err, 'Could not save profile')); }
    finally { setSaving(false); }
  };

  const canCnic = profile?.role === 'buyer' || profile?.role === 'dealer';
  const dd = (details ?? {}) as { cnic_front_url?: string | null; cnic_doc_url?: string | null };
  const hasCnic = !!(dd.cnic_front_url || dd.cnic_doc_url);
  const status = profile?.verification_status ?? 'pending';
  const statusLabel = status === 'approved' ? 'Verified' : status === 'pending' ? 'Pending' : 'Rejected';

  const submitCnic = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = getSupabase(); if (!db || !profile) return;
    if (!cnicFront || (isBuyer && !cnicBack)) { toast.error(isBuyer ? 'Please upload both sides of your CNIC.' : 'Please upload your CNIC image.'); return; }
    setCnicBusy(true);
    try {
      const front = await uploadDocument(cnicFront);
      if (isBuyer) {
        const back = await uploadDocument(cnicBack!);
        const { error } = await db.from('customer_details').upsert({ profile_id: profile.id, cnic_front_url: front, cnic_back_url: back }, { onConflict: 'profile_id' });
        if (error) throw error;
      } else {
        const { error } = await db.from('dealer_details').update({ cnic_doc_url: front }).eq('profile_id', profile.id);
        if (error) throw error;
      }
      const { error: sErr } = await db.from('profiles').update({ verification_status: 'pending' }).eq('id', profile.id);
      if (sErr) throw sErr;
      setCnicFront(null); setCnicBack(null);
      await refresh();
      toast.success('CNIC submitted for review');
    } catch (err) { toast.error(errorText(err, 'Could not upload CNIC')); }
    finally { setCnicBusy(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = getSupabase(); if (!db || !profile) return;
    if (pw.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    if (pw !== pw2) { toast.error(PASSWORD_MISMATCH); return; }
    const check = await db.auth.signInWithPassword({ email: profile.email, password: current });
    if (check.error) { toast.error('Current password is incorrect.'); return; }
    const { error } = await db.auth.updateUser({ password: pw });
    if (error) toast.error(errorText(error, 'Could not change password'));
    else { toast.success('Password changed'); setCurrent(''); setPw(''); setPw2(''); }
  };

  if (!profile) return <div className="container"><p className="muted">Loading…</p></div>;
  return (
    <div className="container">
      <div className="card wide">
        <h1>Profile & settings</h1>
        <p className="muted">{profile.email} · {ROLE_LABELS[profile.role]}</p>
        <form onSubmit={save}>
          <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          {isBuyer && <>
            <div className="form-row">
              <label>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              <label>Address<input value={address} onChange={(e) => setAddress(e.target.value)} /></label>
            </div>
            <label>Profile photo<input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
          </>}
          {!isBuyer && <p className="muted small">Business details (firm, society, licence) are managed through your verification record.</p>}
          <Button disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
        </form>
        <h3>CNIC verification</h3>
        <p className="small">
          Status: <span className={`badge ${status === 'approved' ? 'ok' : 'warn'}`}>{statusLabel}</span>
          {canCnic && !hasCnic && <span className="muted"> · No CNIC uploaded yet</span>}
        </p>
        {status !== 'approved' && status !== 'pending' && profile.rejection_reason && <div className="error">Reason: {profile.rejection_reason}</div>}
        {canCnic && status !== 'approved' && (
          <form onSubmit={submitCnic}>
            <div className="form-row">
              <label>{isBuyer ? 'CNIC front image' : 'CNIC image'}<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setCnicFront(e.target.files?.[0] ?? null)} /></label>
              {isBuyer && <label>CNIC back image<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setCnicBack(e.target.files?.[0] ?? null)} /></label>}
            </div>
            <Button variant="outline" disabled={cnicBusy}>{cnicBusy ? 'Uploading…' : hasCnic ? 'Re-upload CNIC' : 'Upload CNIC'}</Button>
          </form>
        )}
        <h3>Change password</h3>
        <form onSubmit={changePassword}>
          <label>Current password<PasswordInput required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
          <div className="form-row">
            <label>New password<PasswordInput required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
            <label>Confirm new password<PasswordInput required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
          </div>
          {pw2 && pw2 !== pw && <div className="error" role="alert">{PASSWORD_MISMATCH}</div>}
          <Button variant="outline">Change password</Button>
        </form>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/profile')({ head: () => pageHead('Profile & settings'), component: () => <PageFrame><ProfilePage /></PageFrame> });
