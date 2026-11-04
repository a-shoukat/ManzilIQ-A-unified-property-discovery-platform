import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import iconAsset from '@/assets/manziliq-icon.png.asset.json';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/manzil/supabase';
import { PageFrame, pageHead, useAppNavigation } from '@/components/manzil/PageFrame';
import { PasswordInput, PASSWORD_MISMATCH } from '@/components/manzil/PasswordInput';
import { errorText } from '@/lib/manzil/errors';

export const Route = createFileRoute('/reset-password')({ head: () => pageHead('Reset password'), component: ResetPassword });

function ResetPassword() {
  const navigate = useAppNavigation();
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const db = getSupabase(); if (!db) { setReady('invalid'); return; }
    const hash = window.location.hash;
    const isRecovery = hash.includes('type=recovery') || new URLSearchParams(window.location.search).has('code');
    if (hash.includes('error=')) { setReady('invalid'); return; }
    const { data } = db.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setReady('ok'); });
    const t = setTimeout(async () => {
      const { data: s } = await db.auth.getSession();
      setReady((r) => (r === 'ok' ? r : s.session && isRecovery ? 'ok' : 'invalid'));
    }, 1200);
    return () => { clearTimeout(t); data.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (pw !== pw2) { setError(PASSWORD_MISMATCH); return; }
    const db = getSupabase(); if (!db) return;
    setLoading(true);
    const { error: err } = await db.auth.updateUser({ password: pw });
    setLoading(false);
    if (err) { setError(errorText(err, 'Could not update password')); return; }
    await db.auth.signOut();
    setDone(true);
  };

  return (
    <PageFrame publicPage>
      <div className="login-layout"><div className="login-form">
        <span className="login-icon"><img src={iconAsset.url} alt="ManzilIQ" /></span>
        <span className="eyebrow">RESET PASSWORD</span>
        <h1>Set a new password.</h1>
        {done ? <>
          <div className="notice" role="status">Your password has been updated. Please sign in with your new password.</div>
          <Button className="login-submit" onClick={() => navigate('login')}>Go to sign in<ArrowUpRight /></Button>
        </> : ready === 'checking' ? <p className="muted">Checking your reset link…</p>
        : ready === 'invalid' ? <>
          <div className="error" role="alert">This reset link is invalid or has expired. Please request a new one.</div>
          <Button className="login-submit" onClick={() => navigate('login')}>Back to sign in<ArrowUpRight /></Button>
        </> : (
          <form onSubmit={submit}>
            <label>New password<PasswordInput required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
            <label>Confirm new password<PasswordInput required autoComplete="new-password" placeholder="Re-enter your password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
            {pw2 && pw2 !== pw && <div className="error" role="alert">{PASSWORD_MISMATCH}</div>}
            {error && error !== PASSWORD_MISMATCH && <div className="error" role="alert">{error}</div>}
            <Button className="login-submit" disabled={loading}>{loading ? 'Please wait…' : 'Update password'}<ArrowUpRight /></Button>
          </form>
        )}
      </div></div>
    </PageFrame>
  );
}
