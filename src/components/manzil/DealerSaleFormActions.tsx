import { useState } from 'react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import {
  publicFormPath,
  revokeShareToken,
  whatsappShareUrl,
  type DealerSaleForm,
} from '@/lib/manzil/dealer-sale-forms';
import { errorText } from '@/lib/manzil/errors';
import { useAuth } from '@/lib/manzil/auth';

export function DealerSaleFormActions({
  form,
  onChanged,
}: {
  form: DealerSaleForm;
  onChanged?: (f: DealerSaleForm) => void;
}) {
  const { session } = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const issued = form.status === 'issued';
  const shareUrl =
    typeof window !== 'undefined' && form.public_share_token
      ? `${window.location.origin}${publicFormPath(form.public_share_token)}`
      : form.public_share_token
        ? publicFormPath(form.public_share_token)
        : null;

  const print = (size: 'a4' | 'a5') => {
    const el = document.getElementById('dealer-sale-form-print');
    if (!el) return;
    el.classList.remove('dsf-a4', 'dsf-a5');
    el.classList.add(`dsf-${size}`);
    window.print();
  };

  const capturePng = async (): Promise<Blob | null> => {
    const el = document.getElementById('dealer-sale-form-print');
    if (!el) return null;
    const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
    const res = await fetch(dataUrl);
    return res.blob();
  };

  const downloadPng = async () => {
    setBusy(true);
    setErr(null);
    try {
      const blob = await capturePng();
      if (!blob) throw new Error('Could not render image');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sale-form-${form.serial_no}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('PNG downloaded — use Print → Save as PDF for PDF with Urdu fonts');
    } catch (e) {
      setErr(errorText(e, 'Export failed'));
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    setErr(null);
    try {
      const blob = await capturePng();
      const file = blob
        ? new File([blob], `sale-form-${form.serial_no}.png`, { type: 'image/png' })
        : null;
      const text = `آپ کی فروخت کی رسید / بکنگ فارم نمبر ${form.serial_no}${shareUrl ? `\n${shareUrl}` : ''}`;
      if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'Sale receipt', text, files: [file] });
      } else if (navigator.share) {
        await navigator.share(shareUrl ? { title: 'Sale receipt', text, url: shareUrl } : { title: 'Sale receipt', text });
      } else {
        setMsg('Web Share not available — use WhatsApp or Copy link');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErr(errorText(e, 'Share failed'));
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setMsg('Link copied');
  };

  const wa = () => {
    const message = `السلام علیکم، آپ کی فروخت کی رسید / بکنگ فارم نمبر ${form.serial_no} یہ ہے:${shareUrl ? `\n${shareUrl}` : ''}`;
    const url = whatsappShareUrl(form.buyer_phone, message);
    if (!url) {
      setErr('Buyer phone missing or invalid for WhatsApp');
      return;
    }
    window.open(url, '_blank');
  };

  const revoke = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const next = await revokeShareToken(form.id, session.user.id);
      onChanged?.(next);
      setMsg('Share link revoked');
    } catch (e) {
      setErr(errorText(e, 'Could not revoke'));
    } finally {
      setBusy(false);
    }
  };

  if (!issued && form.status !== 'cancelled') return null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Output</h3>
      {msg && <div className="notice" style={{ marginBottom: 8 }}>{msg}</div>}
      {err && <div className="error" role="alert">{err}</div>}
      <div className="link-row">
        <Button variant="legacy" className="btn secondary small" onClick={() => print('a5')}>Print A5</Button>
        <Button variant="legacy" className="btn secondary small" onClick={() => print('a4')}>Print A4 / PDF</Button>
        <Button variant="legacy" className="btn secondary small" disabled={busy} onClick={() => void downloadPng()}>
          Download PNG
        </Button>
        {issued && (
          <>
            <Button variant="legacy" className="btn secondary small" disabled={busy} onClick={() => void share()}>
              Share
            </Button>
            <Button variant="legacy" className="btn secondary small" onClick={wa}>WhatsApp</Button>
            {shareUrl && (
              <Button variant="legacy" className="btn secondary small" onClick={() => void copyLink()}>
                Copy link
              </Button>
            )}
            {form.public_share_token && (
              <Button variant="legacy" className="btn danger small" disabled={busy} onClick={() => void revoke()}>
                Revoke link
              </Button>
            )}
          </>
        )}
      </div>
      {shareUrl && <p className="muted small" dir="ltr">{shareUrl}</p>}
    </div>
  );
}
