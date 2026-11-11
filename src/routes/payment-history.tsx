import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { errorText } from '@/lib/manzil/errors';
import { formatPrice } from '@/lib/manzil/properties';
import {
  fetchBuyerGatewayPayments,
  fetchSocietyGatewayPayments,
  receiptHashOf,
  verifyReceiptHash,
  verifySchema,
  type GatewayPayment,
} from '@/lib/manzil/payment-history';
import { PAYMENTS_COPY as C } from '@/lib/manzil/phase10-copy/payments';

/**
 * Screen 6 — Gateway payment history + receipts.
 * /my-payments left untouched (Absolute Rule / Needs decision).
 * Phase 3 PDF receipt server fn MISSING → PDF button skipped.
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
      setError(errorText(e, C.loadError));
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
    setVerifyMsg(verifyReceiptHash(p, parsed.data.hash) ? C.verifiedOk : C.verifiedFail);
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{isSociety ? C.societyTitle : C.buyerTitle}</h1>
          <p className="muted" style={{ margin: 0 }}>{C.subtitle}</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          {!isSociety && (
            <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('my-payments')}>
              {C.myPayments}
            </Button>
          )}
          {isSociety && (
            <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('society-financials')}>
              {C.financials}
            </Button>
          )}
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>
            {C.dashboard}
          </Button>
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 12 }}>{C.skipNote}</div>

      {error && <div className="error" role="alert">{error}</div>}
      {verifyMsg && <div className="notice" style={{ marginBottom: 12 }}>{verifyMsg}</div>}

      {loading ? (
        <p className="muted">{C.loading}</p>
      ) : list.length === 0 ? (
        <p className="muted">{C.empty}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{C.booking}</th>
                <th>{C.installment}</th>
                <th>{C.amount}</th>
                <th>{C.status}</th>
                <th>{C.gatewayRef}</th>
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
                      {/* Phase 3 PDF receipt server fn MISSING — button skipped per Absolute Rules. */}
                      <Button
                        variant="legacy"
                        className="btn secondary small"
                        onClick={() => {
                          setVerifyFor(verifyFor === p.id ? null : p.id);
                          setHashInput(receiptHashOf(p));
                          setVerifyMsg(null);
                        }}
                      >
                        {C.verifyReceipt}
                      </Button>
                    </div>
                    {verifyFor === p.id && (
                      <div style={{ marginTop: 8 }}>
                        <label className="small">
                          {C.verificationHash}
                          <input value={hashInput} onChange={(e) => setHashInput(e.target.value)} />
                        </label>
                        <Button variant="legacy" className="btn small" onClick={() => runVerify(p)}>
                          {C.checkHash}
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
  head: () => pageHead(C.buyerTitle),
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
