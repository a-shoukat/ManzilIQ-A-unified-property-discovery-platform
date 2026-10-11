import { useState } from 'react';
import { Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/manzil/properties';
import { DEMO_OTP, isValidCnicLast6, isValidMobile, maskMobile, simulateCharge, type WalletMethod } from '@/lib/manzil/mock-gateway';

type Step = 'details' | 'otp' | 'processing' | 'failed';

/** Wallet checkout screen that behaves like JazzCash / EasyPaisa, in demo mode. */
export function MockWalletCheckout({ method, amount, onPaid, onCancel }: {
  method: WalletMethod; amount: number; onPaid: (txnId: string) => Promise<void>; onCancel: () => void;
}) {
  const name = method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa';
  const [step, setStep] = useState<Step>('details');
  const [mobile, setMobile] = useState('');
  const [cnic, setCnic] = useState('');
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const sendOtp = () => {
    if (!isValidMobile(mobile)) { setErr('Enter a valid mobile number, e.g. 0300 1234567'); return; }
    if (method === 'jazzcash' && !isValidCnicLast6(cnic)) { setErr('Enter the last 6 digits of your CNIC'); return; }
    setErr(null); setStep('otp');
  };
  const verify = async () => {
    setErr(null); setStep('processing');
    await new Promise((r) => setTimeout(r, 1600));
    const res = simulateCharge(method, mobile, otp);
    if (!res.ok) { setErr(res.reason); setStep(res.reason.startsWith('Incorrect OTP') ? 'otp' : 'failed'); return; }
    try { await onPaid(res.txnId); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not record the payment'); setStep('failed'); }
  };

  return (
    <div className={`wallet-checkout wallet-${method}`}>
      <div className="wallet-brand"><Smartphone size={18} /><strong>{name}</strong><span className="wallet-demo">DEMO</span></div>
      <div className="wallet-amount">{formatPrice(amount)}</div>

      {step === 'details' && <>
        <label>{name} mobile number<input inputMode="tel" autoFocus value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="03xx xxxxxxx" /></label>
        {method === 'jazzcash' && <label>Last 6 digits of CNIC<input inputMode="numeric" maxLength={6} value={cnic} onChange={(e) => setCnic(e.target.value.replace(/\D/g, ''))} placeholder="123456" /></label>}
        {err && <div className="error">{err}</div>}
        <div className="link-row"><Button size="sm" onClick={sendOtp}>Continue</Button><Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button></div>
      </>}

      {step === 'otp' && <>
        <p className="muted small">A 6-digit code was sent to {maskMobile(mobile)}.</p>
        <div className="notice small">Demo mode: use code <strong>{DEMO_OTP}</strong>. Numbers ending in 0000 simulate a failed payment.</div>
        <label>Enter OTP<input inputMode="numeric" autoFocus maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} /></label>
        {err && <div className="error">{err}</div>}
        <div className="link-row"><Button size="sm" disabled={otp.length !== 6} onClick={() => void verify()}>Pay {formatPrice(amount)}</Button><Button size="sm" variant="outline" onClick={() => { setStep('details'); setOtp(''); setErr(null); }}>Back</Button></div>
      </>}

      {step === 'processing' && <div className="wallet-processing"><Loader2 className="spin" size={28} /><span>Processing with {name}…</span></div>}

      {step === 'failed' && <>
        <div className="error">{err}</div>
        <div className="link-row"><Button size="sm" onClick={() => { setStep('details'); setOtp(''); setErr(null); }}>Try again</Button><Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button></div>
      </>}

      <p className="muted small wallet-foot"><ShieldCheck size={13} />Demo payment — no money is charged.</p>
    </div>
  );
}
