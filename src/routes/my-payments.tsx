import { MockWalletCheckout } from '@/components/manzil/MockWalletCheckout';
import { receiptTotal, canPay } from '@/lib/manzil/payment-rules';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { calcLateFee, fetchMyPayments, payInstallment } from '@/lib/manzil/payment';
import { formatPrice } from '@/lib/manzil/properties';
import { formatAppDate } from '@/lib/i18n';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { Payment, PaymentMethod } from '@/lib/manzil/types';

/** WBS: Payment & Financial System — customer side (tracking + receipts) */
function MyPayments({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useTranslation(['payments', 'common']);
  const { language } = useLanguage();
  const { session } = useAuth();
  const [list, setList] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<Payment | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('jazzcash');
  const [proof, setProof] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ txn: string; amount: number; method: string } | null>(null);

  const methods: { id: PaymentMethod; label: string }[] = [
    { id: 'jazzcash', label: t('payments:jazzCash') },
    { id: 'easypaisa', label: t('payments:easyPaisa') },
    { id: 'bank', label: t('payments:bankTransfer') },
    { id: 'cash', label: t('payments:cashManual') },
    { id: 'cheque', label: t('payments:chequeManual') },
  ];

  const load = async () => {
    if (!session) return;
    setLoading(true);
    setList(await fetchMyPayments(session.user.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const dueSoon = list.filter(
    (p) => p.status === 'pending' && p.due_date && p.due_date <= today,
  );

  const doPay = async () => {
    if (!paying) return;
    try {
      await payInstallment(paying, method, method === 'bank' ? proof : null);
      setMsg(t('payments:paymentRecorded'));
      setPaying(null);
      setProof(null);
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t('payments:paymentFailed'));
    }
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{t('payments:title')}</h1>
          <p className="muted" style={{ margin: 0 }}>{t('payments:dueCalendar')}</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>{t('common:dashboard')}</Button>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      {dueSoon.length > 0 && (
        <div className="notice warn-box" style={{ marginBottom: 12 }}>
          {t('payments:dueOverdueBanner', { count: dueSoon.length })}
        </div>
      )}

      {loading ? <p className="muted">{t('common:loading')}</p> : list.length === 0 ? (
        <p className="muted">{t('payments:noSchedule')}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>{t('payments:bookingLabel')}</th><th>{t('payments:label')}</th><th>{t('payments:due')}</th><th>{t('payments:amount')}</th><th>{t('payments:lateFee')}</th><th>{t('payments:status')}</th><th></th></tr></thead>
            <tbody>
              {list.map((p) => {
                const late = calcLateFee(p);
                const overdue = p.status === 'pending' && p.due_date && p.due_date < today;
                return (
                  <tr key={p.id} className={overdue ? 'row-overdue' : ''}>
                    <td dir="ltr" className="ltr-isolate">{p.booking_ref}</td>
                    <td>{p.label ?? '—'}</td>
                    <td dir="ltr" className="ltr-isolate">{p.due_date ?? '—'}</td>
                    <td>{formatPrice(p.amount)}</td>
                    <td>{late > 0 ? formatPrice(late) : '—'}</td>
                    <td>
                      <span className={`badge ${p.status === 'confirmed' ? 'ok' : 'warn'}`}>
                        {p.status === 'pending' && p.paid_at
                          ? t('payments:awaitingConfirmation')
                          : p.status === 'confirmed'
                            ? t('payments:paid')
                            : p.status === 'pending'
                              ? t('payments:pending')
                              : p.status}
                      </span>
                    </td>
                    <td className="row-actions">
                      {p.status === 'pending' && canPay(p) && (
                        <Button variant="legacy" className="link inline" onClick={() => setPaying(p)}>{t('payments:pay')}</Button>
                      )}
                      {p.status === 'confirmed' && (
                        <Button variant="legacy" className="link inline" onClick={() => setReceipt(p)}>{t('payments:receipt')}</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paying && (
        <div className="modal-backdrop" onClick={() => setPaying(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <h3>{t('payments:payAmount', { amount: formatPrice(paying.amount + calcLateFee(paying)) })}</h3>
            <p className="muted small">{paying.label} · <span dir="ltr" className="ltr-isolate">{paying.booking_ref}</span></p>
            <label>{t('payments:method')}
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {methods.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
            {(method === 'jazzcash' || method === 'easypaisa') ? (
              <MockWalletCheckout key={method} method={method} amount={paying.amount + calcLateFee(paying)} onCancel={() => setPaying(null)}
                onPaid={async (txn) => { const amt = paying.amount + calcLateFee(paying); await payInstallment(paying, method, null, txn); setSuccess({ txn, amount: amt, method: method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa' }); setPaying(null); void load(); }} />
            ) : <>
            {method === 'bank' && (
              <label>{t('payments:transferProof')}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
              </label>
            )}
            <div className="notice" style={{ marginBottom: 12 }}>{method === 'bank' ? t('payments:bankNotice') : t('payments:recordNotice')}</div>
            <div className="link-row">
              <Button variant="legacy" className="btn small" onClick={doPay}>{t('payments:confirmPayment')}</Button>
              <Button variant="legacy" className="btn secondary small" onClick={() => setPaying(null)}>{t('common:cancel')}</Button>
            </div>
            </>}
          </div>
        </div>
      )}

      {success && (
        <div className="modal-backdrop" onClick={() => setSuccess(null)}>
          <div className="card wallet-success" onClick={(e) => e.stopPropagation()}>
            <div className="wallet-tick">✓</div>
            <h3>{t('payments:paymentSuccessful')}</h3>
            <p className="price big">{formatPrice(success.amount)}</p>
            <p className="muted small">{t('payments:paidWithDemo', { method: success.method })}</p>
            <div className="spec-row"><span className="detail-key">{t('payments:transactionId')}</span><strong dir="ltr" className="ltr-isolate">{success.txn}</strong></div>
            <p className="muted small">{t('payments:societyConfirms')}</p>
            <div className="link-row"><Button size="sm" onClick={() => setSuccess(null)}>{t('payments:done')}</Button></div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="modal-backdrop" onClick={() => setReceipt(null)}>
          <div className="card receipt" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ textAlign: 'center' }}>{t('payments:paymentReceipt')}</h2>
            <p style={{ textAlign: 'center' }} className="muted" dir="ltr">{receipt.receipt_no}</p>
            <div className="spec-table">
              <div className="spec-row"><span className="detail-key">{t('payments:bookingLabel')}</span><span dir="ltr" className="ltr-isolate">{receipt.booking_ref}</span></div>
              <div className="spec-row"><span className="detail-key">{t('payments:label')}</span><span>{receipt.label}</span></div>
              <div className="spec-row"><span className="detail-key"><strong>{t('payments:amountPaid')}</strong></span><strong>{formatPrice(receiptTotal(receipt))}</strong></div>
              <div className="spec-row"><span className="detail-key">{t('payments:installment')}</span><span>{formatPrice(receipt.amount)}</span></div>
              <div className="spec-row"><span className="detail-key">{t('payments:lateFee')}</span><span>{receipt.late_fee > 0 ? formatPrice(receipt.late_fee) : '—'}</span></div>
              <div className="spec-row"><span className="detail-key"><strong>{t('payments:totalPaid')}</strong></span><strong>{formatPrice(receiptTotal(receipt))}</strong></div>
              <div className="spec-row"><span className="detail-key">{t('payments:method')}</span><span>{receipt.method}</span></div>
              <div className="spec-row"><span className="detail-key">{t('payments:paidOn')}</span><span dir="ltr" className="ltr-isolate">{receipt.paid_at ? formatAppDate(receipt.paid_at, language, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span></div>
            </div>
            <div className="link-row no-print">
              <Button variant="legacy" className="btn small" onClick={() => window.print()}>{t('payments:printPdf')}</Button>
              <Button variant="legacy" className="btn secondary small" onClick={() => setReceipt(null)}>{t('payments:close')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/my-payments")({ head: () => pageHead("My Payments"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><MyPayments onNavigate={onNavigate} /></PageFrame>; }
