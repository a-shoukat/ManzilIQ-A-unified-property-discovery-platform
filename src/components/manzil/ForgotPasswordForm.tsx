import { useState, type FormEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/manzil/supabase';

/** Sends a password reset link. Always shows the same message so it never reveals which emails have accounts. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    const db = getSupabase(); if (!db) { setError('Connection not available. Please try again shortly.'); return; }
    setLoading(true);
    const { error: err } = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (err && /rate|too many/i.test(err.message)) { setError('Too many requests. Please wait a minute and try again.'); return; }
    setSent(true);
  };
  if (sent) return <div className="notice" role="status">If an account exists for <strong>{email}</strong>, we have sent a link to reset your password. Check your inbox (and spam folder). The link expires in one hour.</div>;
  return (
    <form onSubmit={submit}>
      <label>Email address<input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      {error && <div className="error" role="alert">{error}</div>}
      <Button className="login-submit" disabled={loading}>{loading ? 'Please wait…' : 'Send reset link'}<ArrowUpRight /></Button>
    </form>
  );
}
