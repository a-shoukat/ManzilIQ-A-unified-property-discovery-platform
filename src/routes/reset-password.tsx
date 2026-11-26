import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/manzil/supabase';
import { PageFrame, pageHead, useAppNavigation } from '@/components/manzil/PageFrame';
import { BrandLogo } from '@/components/manzil/BrandLogo';
import { PasswordInput } from '@/components/manzil/PasswordInput';
import { errorText } from '@/lib/manzil/errors';

export const Route = createFileRoute('/reset-password')({ head: () => pageHead('Reset password'), component: ResetPassword });

function ResetPassword() {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useAppNavigation();
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const passwordMismatch = t('auth:passwordMismatch');

  useEffect(() => {
    const db = getSupabase(); if (!db) { setReady('invalid'); return; }
    const hash = window.location.hash;
    const isRecovery = hash.includes('type=recovery') || new URLSearchParams(window.location.search).has('code');
    if (hash.includes('error=')) { setReady('invalid'); return; }
    const { data } = db.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setReady('ok'); });
    const timer = setTimeout(async () => {
      const { data: s } = await db.auth.getSession();
      setReady((r) => (r === 'ok' ? r : s.session && isRecovery ? 'ok' : 'invalid'));
    }, 1200);
    return () => { clearTimeout(timer); data.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (pw.length < 8) { setError(t('auth:passwordMin8')); return; }
    if (pw !== pw2) { setError(passwordMismatch); return; }
    const db = getSupabase(); if (!db) return;
    setLoading(true);
    const { error: err } = await db.auth.updateUser({ password: pw });
    setLoading(false);
    if (err) { setError(errorText(err, t('auth:couldNotUpdatePassword'))); return; }
    await db.auth.signOut();
    setDone(true);
  };

  return (
    <PageFrame publicPage>
      <div className="login-layout"><div className="login-form">
        <span className="login-icon"><BrandLogo compact /></span>
        <span className="eyebrow">{t('auth:resetEyebrow')}</span>
        <h1>{t('auth:setNewPassword')}</h1>
        {done ? <>
          <div className="notice" role="status">{t('auth:passwordUpdated')}</div>
          <Button className="login-submit" onClick={() => navigate('login')}>{t('auth:goToSignIn')}<ArrowUpRight className="dir-flip" /></Button>
        </> : ready === 'checking' ? <p className="muted">{t('auth:checkingResetLink')}</p>
        : ready === 'invalid' ? <>
          <div className="error" role="alert">{t('auth:resetLinkInvalid')}</div>
          <Button className="login-submit" onClick={() => navigate('login')}>{t('auth:backToSignIn')}<ArrowUpRight className="dir-flip" /></Button>
        </> : (
          <form onSubmit={submit}>
            <label>{t('auth:newPassword')}<PasswordInput required minLength={8} autoComplete="new-password" placeholder={t('auth:atLeast8Chars')} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
            <label>{t('auth:confirmNewPassword')}<PasswordInput required autoComplete="new-password" placeholder={t('auth:reenterPassword')} value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
            {pw2 && pw2 !== pw && <div className="error" role="alert">{passwordMismatch}</div>}
            {error && error !== passwordMismatch && <div className="error" role="alert">{error}</div>}
            <Button className="login-submit" disabled={loading}>{loading ? t('common:pleaseWait') : t('auth:updatePassword')}<ArrowUpRight className="dir-flip" /></Button>
          </form>
        )}
      </div></div>
    </PageFrame>
  );
}
