import { useState } from 'react';
import { toPng } from 'html-to-image';
import { Button } from '@/components/ui/button';
import {
  fetchFormSettings,
  publicFormPath,
  regenerateShareToken,
  revokeShareToken,
  whatsappShareUrl,
  type DealerSaleForm,
} from '@/lib/manzil/dealer-sale-forms';
import { downloadDealerSaleFormPdfHtml } from '@/lib/manzil/dealer-sale-form-pdf';
import { errorText } from '@/lib/manzil/errors';
import { useAuth } from '@/lib/manzil/auth';
import { SALE_FORMS_COPY as C } from '@/lib/manzil/phase11-copy/sale-forms';

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
      setMsg(C.downloadPng);
    } catch (e) {
      setErr(errorText(e, 'Export failed'));
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    setBusy(true);
    setErr(null);
    try {
      const settings =
        (form.header_snapshot as Awaited<ReturnType<typeof fetchFormSettings>> | null) ??
        (await fetchFormSettings(form.dealer_id));
      downloadDealerSaleFormPdfHtml(form, settings);
      setMsg(C.downloadPdf);
    } catch (e) {
      setErr(errorText(e, 'PDF export failed'));
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
    setMsg(C.linkCopied);
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
      setMsg(C.revoked);
    } catch (e) {
      setErr(errorText(e, 'Could not revoke'));
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const next = await regenerateShareToken(form.id, session.user.id);
      onChanged?.(next);
      setMsg(C.regenerateLink);
    } catch (e) {
      setErr(errorText(e, 'Could not regenerate'));
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
        <Button variant="legacy" className="btn secondary small" onClick={() => print('a5')}>{C.printA5}</Button>
        <Button variant="legacy" className="btn secondary small" onClick={() => print('a4')}>{C.printA4}</Button>
        <Button variant="legacy" className="btn secondary small" disabled={busy} onClick={() => void downloadPdf()}>
          {C.downloadPdf}
        </Button>
        <Button variant="legacy" className="btn secondary small" disabled={busy} onClick={() => void downloadPng()}>
          {C.downloadPng}
        </Button>
        {issued && (
          <>
            <Button variant="legacy" className="btn secondary small" disabled={busy} onClick={() => void share()}>
              {C.share}
            </Button>
            <Button variant="legacy" className="btn secondary small" onClick={wa}>{C.whatsapp}</Button>
            {shareUrl && (
              <Button variant="legacy" className="btn secondary small" onClick={() => void copyLink()}>
                {C.copyLink}
              </Button>
            )}
            {form.public_share_token ? (
              <Button variant="legacy" className="btn danger small" disabled={busy} onClick={() => void revoke()}>
                {C.revokeLink}
              </Button>
            ) : (
              <Button variant="legacy" className="btn secondary small" disabled={busy} onClick={() => void regenerate()}>
                {C.regenerateLink}
              </Button>
            )}
          </>
        )}
      </div>
      {shareUrl && <p className="muted small" dir="ltr">{shareUrl}</p>}
    </div>
  );
}
