import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageFrame, pageHead, useAppNavigation } from '@/components/manzil/PageFrame';
import { useAuth } from '@/lib/manzil/auth';
import { errorText } from '@/lib/manzil/errors';
import {
  cancelSaleForm,
  duplicateSaleForm,
  listSaleForms,
  type DealerSaleForm,
  type FormStatus,
} from '@/lib/manzil/dealer-sale-forms';

function FormsList({ onNavigate }: { onNavigate: (p: string, arg?: string) => void }) {
  const { session, profile } = useAuth();
  const [rows, setRows] = useState<DealerSaleForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<FormStatus | 'all'>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await listSaleForms(session.user.id, { q, status }));
    } catch (e) {
      setError(errorText(e, 'Could not load forms'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, status]);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Sale receipts / booking forms</h1>
          <p className="muted" style={{ margin: 0 }}>{rows.length} forms</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          {profile?.role === 'dealer' && (
            <Button variant="legacy" className="btn small" onClick={() => onNavigate('dealer-forms/new')}>
              + New form
            </Button>
          )}
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dealer-form-settings')}>
            Header settings
          </Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dealer')}>
            Dealer portal
          </Button>
        </div>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      <div className="link-row" style={{ marginBottom: 12 }}>
        <input placeholder="Search buyer / serial" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
        <Button variant="legacy" className="btn secondary small" onClick={() => void load()}>Search</Button>
        {(['all', 'draft', 'issued', 'cancelled'] as const).map((s) => (
          <Button
            key={s}
            variant="legacy"
            className={`btn secondary small${status === s ? ' active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No forms yet.</p>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="queue-card">
            <div className="queue-head">
              <div>
                <strong>#{r.serial_no} · {r.buyer_name}</strong>
                <div className="muted small">
                  {r.form_date} · {r.buyer_phone || 'no phone'} · {r.plot_size_text || '—'}
                </div>
              </div>
              <span className={`badge ${r.status === 'issued' ? 'ok' : 'warn'}`}>{r.status}</span>
            </div>
            <div className="link-row">
              <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate(`dealer-forms/${r.id}`)}>
                Open
              </Button>
              {profile?.role === 'dealer' && (
                <>
                  <Button
                    variant="legacy"
                    className="btn secondary small"
                    disabled={busy === r.id}
                    onClick={() =>
                      void duplicateSaleForm(r.id, session!.user.id).then((n) => onNavigate(`dealer-forms/${n.id}`))
                    }
                  >
                    Duplicate
                  </Button>
                  {r.status !== 'cancelled' && (
                    <Button
                      variant="legacy"
                      className="btn danger small"
                      disabled={busy === r.id}
                      onClick={() => {
                        setBusy(r.id);
                        void cancelSaleForm(r.id, session!.user.id)
                          .then(() => load())
                          .finally(() => setBusy(null));
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export const Route = createFileRoute('/dealer-forms/')({
  head: () => pageHead('Sale forms'),
  component: () => {
    const onNavigate = useAppNavigation();
    return (
      <PageFrame>
        <FormsList onNavigate={onNavigate} />
      </PageFrame>
    );
  },
});
