import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PageFrame, pageHead, useAppNavigation } from '@/components/manzil/PageFrame';
import { DealerSaleFormActions } from '@/components/manzil/DealerSaleFormActions';
import { DealerSaleFormEditor } from '@/components/manzil/DealerSaleFormEditor';
import { DealerSaleFormSheet } from '@/components/manzil/DealerSaleFormSheet';
import { useAuth } from '@/lib/manzil/auth';
import { errorText } from '@/lib/manzil/errors';
import {
  fetchFormSettings,
  fetchSaleForm,
  type DealerFormSettings,
  type DealerSaleForm,
} from '@/lib/manzil/dealer-sale-forms';

function EditForm() {
  const { id } = Route.useParams();
  const onNavigate = useAppNavigation();
  const { profile } = useAuth();
  const [form, setForm] = useState<DealerSaleForm | null>(null);
  const [settings, setSettings] = useState<DealerFormSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetchSaleForm(id)
      .then(async (f) => {
        setForm(f);
        if (f) setSettings(await fetchFormSettings(f.dealer_id));
      })
      .catch((e) => setError(errorText(e, 'Could not load form')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container"><p className="muted">Loading…</p></div>;
  if (error) return <div className="container"><div className="error">{error}</div></div>;
  if (!form) return <div className="container"><p className="muted">Form not found.</p></div>;

  return (
    <div>
      <div className="container">
        <div className="topbar">
          <div>
            <h1>Form #{form.serial_no}</h1>
            <p className="muted" style={{ margin: 0 }}>Status: {form.status}</p>
          </div>
        </div>
        {(form.status === 'issued' || form.status === 'cancelled') && settings && (
          <>
            <DealerSaleFormActions form={form} onChanged={setForm} />
            <DealerSaleFormSheet form={form} settings={settings} />
          </>
        )}
      </div>
      {form.status === 'draft' && (
        <DealerSaleFormEditor
          existing={form}
          initial={form}
          readOnly={profile?.role === 'super_admin'}
          onSaved={setForm}
          onNavigate={onNavigate}
        />
      )}
      {form.status !== 'draft' && profile?.role === 'super_admin' && (
        <div className="container"><p className="muted">Super admin view is read-only.</p></div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/dealer-forms/$id')({
  head: () => pageHead('Sale form'),
  component: () => (
    <PageFrame>
      <EditForm />
    </PageFrame>
  ),
});
