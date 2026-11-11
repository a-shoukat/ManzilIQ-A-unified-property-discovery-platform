import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { errorText } from '@/lib/manzil/errors';
import { formatPrice } from '@/lib/manzil/properties';
import {
  downloadReceiptPdf,
  fetchBuyerGatewayPayments,
  fetchSocietyGatewayPayments,
  receiptHashOf,
  verifyReceiptHash,
  verifySchema,
  type GatewayPayment,
} from '@/lib/manzil/payment-history';

/**
 * Screen 6 — Gateway payment history + receipts.
 * /my-payments left untouched (Absolute Rule / Needs decision).
 * Buyers and society_admin share this additive route.
 */
function PaymentHistory({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session, profile } = useAuth();
  const [list, setList] = useState<GatewayPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyFor, setVerifyFor] = useState<string | null>(null);
  const [hashInput, setHashInput] = useState('');
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const isSociety = profile?.role === 'society_admin';

  const load = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const rows = isSociety
        ? await fetchSocietyGatewayPayments(session.user.id)
        : await fetchBuyerGatewayPayments(session.user.id);
      setList(rows);
    } catch (e) {
      setError(errorText(e, 'Could not load payment history'));
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, profile?.role]);

  const runVerify = (p: GatewayPayment) => {
    const parsed = verifySchema.safeParse({ hash: hashInput });
    if (!parsed.success) {
      setVerifyMsg(parsed.error.issues[0]?.message ?? 'Invalid hash');
      return;
    }
    setVerifyMsg(
      verifyReceiptHash(p, parsed.data.hash)
        ? 'Receipt verified — hash matches.'
        : 'Verification failed — hash does not match this payment.',
    );
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{isSociety ? 'Society payment history' : 'Payment history & receipts'}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Gateway references, receipts, verification
          </p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          {!isSociety && (
            <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('my-payments')}>
              My payments
            </Button>
          )}
          {isSociety && (
            <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('society-financials')}>
              Financials
            </Button>
          )}
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 12 }}>
        Existing /my-payments and society financials screens were not modified (Absolute Rule).
        This additive page lists payments with gateway fields.
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      {verifyMsg && <div className="notice" style={{ marginBottom: 12 }}>{verifyMsg}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="muted">No payment transactions yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Installment</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Gateway ref</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{p.booking_ref ?? '—'}</td>
                  <td>{p.label ?? '—'}</td>
                  <td>{formatPrice(p.amount)}</td>
                  <td>
                    <span className={`badge ${p.status === 'confirmed' ? 'ok' : 'warn'}`}>{p.status}</span>
                  </td>
                  <td className="small">{p.gateway_txn_id ?? p.gateway ?? '—'}</td>
                  <td>
                    <div className="link-row">
                      <Button variant="legacy" className="btn secondary small" onClick={() => downloadReceiptPdf(p)}>
                        Download PDF receipt
                      </Button>
                      <Button
                        variant="legacy"
                        className="btn secondary small"
                        onClick={() => {
                          setVerifyFor(verifyFor === p.id ? null : p.id);
                          setHashInput(receiptHashOf(p));
                          setVerifyMsg(null);
                        }}
                      >
                        Verify receipt
                      </Button>
                    </div>
                    {verifyFor === p.id && (
                      <div style={{ marginTop: 8 }}>
                        <label className="small">
                          Verification hash
                          <input value={hashInput} onChange={(e) => setHashInput(e.target.value)} />
                        </label>
                        <Button variant="legacy" className="btn small" onClick={() => runVerify(p)}>
                          Check hash
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/payment-history')({
  head: () => pageHead('Payment history'),
  component: RoutePage,
});
function RoutePage() {
  const onNavigate = useAppNavigation();
  return (
    <PageFrame>
      <PaymentHistory onNavigate={onNavigate} />
    </PageFrame>
  );
}
