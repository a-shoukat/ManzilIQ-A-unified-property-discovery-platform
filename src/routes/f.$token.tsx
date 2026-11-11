import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PageFrame, pageHead } from '@/components/manzil/PageFrame';
import { DealerSaleFormSheet } from '@/components/manzil/DealerSaleFormSheet';
import {
  fetchFormSettings,
  fetchSaleFormByToken,
  type DealerFormSettings,
  type DealerSaleForm,
} from '@/lib/manzil/dealer-sale-forms';

function PublicForm() {
  const { token } = Route.useParams();
  const [form, setForm] = useState<DealerSaleForm | null>(null);
  const [settings, setSettings] = useState<DealerFormSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setLoading(true);
    void fetchSaleFormByToken(token)
      .then(async (f) => {
        if (!f || !f.public_share_token) {
          setMissing(true);
          return;
        }
        setForm(f);
        setSettings(
          (f.header_snapshot as DealerFormSettings | null) ??
            (await fetchFormSettings(f.dealer_id)),
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : missing || !form || !settings ? (
        <div className="card">
          <h1>Link unavailable</h1>
          <p className="muted">This share link was revoked or does not exist.</p>
        </div>
      ) : (
        <>
          <p className="muted small" style={{ textAlign: 'center' }}>
            Public sale receipt · read-only
          </p>
          <DealerSaleFormSheet form={form} settings={settings} />
          {form.status === 'issued' && (
            <p style={{ textAlign: 'center', marginTop: 12 }} className="muted">
              تصدیق شدہ از ڈیلر — Verified by dealer
            </p>
          )}
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute('/f/$token')({
  head: () => pageHead('Sale receipt'),
  component: () => (
    <PageFrame publicPage>
      <PublicForm />
    </PageFrame>
  ),
});
