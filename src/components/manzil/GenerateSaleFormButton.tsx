import { useNavigate } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Allowed existing-page control: same sibling button style as sold-report / lead actions. */
export function GenerateSaleFormButton({
  bookingId = null,
  className = 'btn secondary small',
}: {
  bookingId?: string | null;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <Button
      variant="legacy"
      className={className}
      type="button"
      onClick={() => {
        if (bookingId) {
          void navigate({ to: '/dealer/forms/new', search: { bookingId } });
        } else {
          void navigate({ to: '/dealer/forms/new' });
        }
      }}
    >
      <FileText size={15} /> Generate Form
    </Button>
  );
}
