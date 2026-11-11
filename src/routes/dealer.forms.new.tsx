import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { PageFrame, pageHead, useAppNavigation } from '@/components/manzil/PageFrame';
import { DealerSaleFormEditor } from '@/components/manzil/DealerSaleFormEditor';
import { autofillFromBooking, type SaleFormInput } from '@/lib/manzil/dealer-sale-forms';

const searchSchema = z.object({
  bookingId: z.string().uuid().optional(),
});

function NewForm() {
  const onNavigate = useAppNavigation();
  const { bookingId } = Route.useSearch();
  const [initial, setInitial] = useState<Partial<SaleFormInput> | undefined>();
  const [loading, setLoading] = useState(!!bookingId);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    void autofillFromBooking(bookingId)
      .then(setInitial)
      .finally(() => setLoading(false));
  }, [bookingId]);

  return (
    <div>
      <div className="container">
        <div className="topbar">
          <div>
            <h1>New sale / booking form</h1>
            <p className="muted" style={{ margin: 0 }}>
              {bookingId ? 'Auto-filled from booking — edit before Issue' : 'Blank draft'}
            </p>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="container"><p className="muted">Loading booking…</p></div>
      ) : (
        <DealerSaleFormEditor
          {...(initial ? { initial } : {})}
          onSaved={(f) => onNavigate(`dealer/forms/${f.id}`)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

export const Route = createFileRoute('/dealer/forms/new')({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => pageHead('New sale form'),
  component: () => (
    <PageFrame>
      <NewForm />
    </PageFrame>
  ),
});
