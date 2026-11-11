import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@tanstack/react-router';
import { SALE_FORMS_COPY as C } from '@/lib/manzil/phase11-copy/sale-forms';

export function GenerateSaleFormButton({
  bookingId,
}: {
  bookingId?: string | null;
}) {
  const navigate = useNavigate();
  return (
    <Button
      variant="legacy"
      className="btn secondary small"
      onClick={() => {
        if (bookingId) {
          void navigate({ to: '/dealer-forms/new', search: { bookingId } });
        } else {
          void navigate({ to: '/dealer-forms/new' });
        }
      }}
    >
      <FileText size={15} /> {C.generateForm}
    </Button>
  );
}
