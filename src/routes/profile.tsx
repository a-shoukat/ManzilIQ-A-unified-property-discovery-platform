import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = getSupabase(); if (!db || !profile) return;
    if (pw.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    if (pw !== pw2) { toast.error('Passwords do not match.'); return; }
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
        <h3>Change password</h3>
        <form onSubmit={changePassword}>
          <label>Current password<input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
          <div className="form-row">
            <label>New password<input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></label>
            <label>Confirm new password<input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
          </div>
          <Button variant="outline">Change password</Button>
        </form>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/profile')({ head: () => pageHead('Profile & settings'), component: () => <PageFrame><ProfilePage /></PageFrame> });
