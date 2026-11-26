import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PasswordInput } from '@/components/manzil/PasswordInput';
import { LanguageSwitch } from '@/components/manzil/LanguageSwitch';
import { Button } from '@/components/ui/button';
import { PageFrame, pageHead, useAppNavigation } from '@/components/manzil/PageFrame';
import { getSupabase } from '@/lib/manzil/supabase';
import { useAuth } from '@/lib/manzil/auth';
import { uploadDocument } from '@/lib/manzil/storage';
import { errorText } from '@/lib/manzil/errors';

function ProfilePage() {
  const { t } = useTranslation(['auth', 'common']);
  const onNavigate = useAppNavigation();
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
  const passwordMismatch = t('auth:passwordMismatch');

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
      toast.success(t('auth:profileSaved'));
    } catch (err) { toast.error(errorText(err, t('auth:couldNotSaveProfile'))); }
    finally { setSaving(false); }
  };

  const canCnic = profile?.role === 'buyer' || profile?.role === 'dealer';
  const dd = (details ?? {}) as { cnic_front_url?: string | null; cnic_doc_url?: string | null };
  const hasCnic = !!(dd.cnic_front_url || dd.cnic_doc_url);
  const status = profile?.verification_status ?? 'pending';
  const statusLabel = status === 'approved' ? t('auth:verified') : status === 'pending' ? t('auth:pending') : t('auth:rejected');

  const submitCnic = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = getSupabase(); if (!db || !profile) return;
    if (!cnicFront || (isBuyer && !cnicBack)) { toast.error(isBuyer ? t('auth:uploadBothCnic') : t('auth:uploadCnicImage')); return; }
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
      toast.success(t('auth:cnicSubmitted'));
    } catch (err) { toast.error(errorText(err, t('auth:couldNotUploadCnic'))); }
    finally { setCnicBusy(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = getSupabase(); if (!db || !profile) return;
    if (pw.length < 8) { toast.error(t('auth:newPasswordMin8')); return; }
    if (pw !== pw2) { toast.error(passwordMismatch); return; }
    const check = await db.auth.signInWithPassword({ email: profile.email, password: current });
    if (check.error) { toast.error(t('auth:currentPasswordIncorrect')); return; }
    const { error } = await db.auth.updateUser({ password: pw });
    if (error) toast.error(errorText(error, t('auth:couldNotChangePassword')));
    else { toast.success(t('auth:passwordChanged')); setCurrent(''); setPw(''); setPw2(''); }
  };

  if (!profile) return <div className="container"><p className="muted">{t('auth:loadingEllipsis')}</p></div>;
  return (
    <div className="container">
      <div className="card wide">
        <h1>{t('auth:profileTitle')}</h1>
        <p className="muted">{profile.email} · {t(`common:roles.${profile.role}`)}</p>
        <div className="link-row" style={{ margin: '8px 0 16px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="legacy" className="btn secondary small" type="button" onClick={() => onNavigate('settings/notifications')}>
            {t('common:notificationPrefs')}
          </Button>
          <span className="muted small">{t('auth:languagePreference')}</span>
          <LanguageSwitch />
        </div>
        <form onSubmit={save}>
          <label>{t('auth:fullName')}<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          {isBuyer && <>
            <div className="form-row">
              <label>{t('auth:phone')}<input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="ltr-isolate" /></label>
              <label>{t('common:address')}<input value={address} onChange={(e) => setAddress(e.target.value)} /></label>
            </div>
            <label>{t('auth:profilePhoto')}<input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
          </>}
          {!isBuyer && <p className="muted small">{t('auth:businessDetailsNote')}</p>}
          <Button type="submit" className="btn" disabled={saving}>{saving ? t('auth:saving') : t('auth:saveProfile')}</Button>
        </form>
        <h3>{t('auth:cnicVerification')}</h3>
        <p className="small">
          {t('auth:status')}: <span className={`badge ${status === 'approved' ? 'ok' : 'warn'}`}>{statusLabel}</span>
          {canCnic && !hasCnic && <span className="muted"> · {t('auth:noCnicUploaded')}</span>}
        </p>
        {status !== 'approved' && status !== 'pending' && profile.rejection_reason && <div className="error">{t('auth:reason', { reason: profile.rejection_reason })}</div>}
        {canCnic && status !== 'approved' && (
          <form onSubmit={submitCnic}>
            <div className="form-row">
              <label>{isBuyer ? t('auth:cnicFrontImage') : t('auth:cnicImage')}<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setCnicFront(e.target.files?.[0] ?? null)} /></label>
              {isBuyer && <label>{t('auth:cnicBackImage')}<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setCnicBack(e.target.files?.[0] ?? null)} /></label>}
            </div>
            <Button variant="outline" disabled={cnicBusy}>{cnicBusy ? t('auth:uploading') : hasCnic ? t('auth:reuploadCnic') : t('auth:uploadCnic')}</Button>
          </form>
        )}
        <h3>{t('auth:changePassword')}</h3>
        <form onSubmit={changePassword}>
          <label>{t('auth:currentPassword')}<PasswordInput required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
          <div className="form-row">
            <label>{t('auth:newPassword')}<PasswordInput required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
            <label>{t('auth:confirmNewPassword')}<PasswordInput required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
          </div>
          {pw2 && pw2 !== pw && <div className="error" role="alert">{passwordMismatch}</div>}
          <Button type="submit" variant="outline" className="btn secondary">
            {t('auth:changePassword')}
          </Button>
        </form>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/profile')({ head: () => pageHead('Profile & settings'), component: () => <PageFrame><ProfilePage /></PageFrame> });
