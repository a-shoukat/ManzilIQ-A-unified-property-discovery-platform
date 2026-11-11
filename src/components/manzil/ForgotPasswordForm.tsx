import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/manzil/supabase';

/** Sends a password reset link. Always shows the same message so it never reveals which emails have accounts. */
export function ForgotPasswordForm() {
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    const db = getSupabase(); if (!db) { setError(t('auth:connectionUnavailable')); return; }
    setLoading(true);
    const { error: err } = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (err && /rate|too many/i.test(err.message)) { setError(t('auth:tooManyRequests')); return; }
    setSent(true);
  };
  if (sent) return <div className="notice" role="status">{t('auth:resetSent', { email })}</div>;
  return (
    <form onSubmit={submit}>
      <label>{t('auth:emailAddress')}<input type="email" required autoComplete="email" placeholder={t('auth:emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="ltr-isolate" /></label>
      {error && <div className="error" role="alert">{error}</div>}
      <Button className="login-submit" disabled={loading}>{loading ? t('common:pleaseWait') : t('auth:sendResetLink')}<ArrowUpRight className="dir-flip" /></Button>
    </form>
  );
}
