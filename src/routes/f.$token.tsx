import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PageFrame, pageHead } from '@/components/manzil/PageFrame';
import { DealerSaleFormSheet } from '@/components/manzil/DealerSaleFormSheet';
import {
  fetchFormSettings,
  fetchSaleFormByToken,
  publicViewAsSheetForm,
  toPublicSaleFormView,
  type DealerFormSettings,
  type DealerSaleForm,
  type PublicSaleFormView,
} from '@/lib/manzil/dealer-sale-forms';
import { SALE_FORMS_COPY as C } from '@/lib/manzil/phase11-copy/sale-forms';

function PublicForm() {
  const { token } = Route.useParams();
  const [view, setView] = useState<PublicSaleFormView | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setLoading(true);
    setMissing(false);
    void fetchSaleFormByToken(token)
      .then(async (f: DealerSaleForm | null) => {
        if (!f || !f.public_share_token || f.revoked_at) {
          setMissing(true);
          return;
        }
        const header =
          (f.header_snapshot as DealerFormSettings | null) ??
          (await fetchFormSettings(f.dealer_id));
        // Strip internal ids before rendering: public view masks CNIC/phone.
        setView(toPublicSaleFormView(f, header));
      })
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
      {loading ? (
        <p className="muted">{C.publicLoading}</p>
      ) : missing || !view ? (
        <div className="card">
          <h1>{C.publicUnavailableTitle}</h1>
          <p className="muted">{C.publicUnavailableBody}</p>
          <p className="muted" dir="rtl">یہ لنک دستیاب نہیں۔</p>
        </div>
      ) : (
        <>
          <p className="muted small" style={{ textAlign: 'center' }}>
            {C.publicReadOnly}
          </p>
          <DealerSaleFormSheet form={publicViewAsSheetForm(view)} settings={view.header} />
          {view.status === 'issued' && (
            <p style={{ textAlign: 'center', marginTop: 12 }} className="muted">
              {C.verifiedNote}
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
