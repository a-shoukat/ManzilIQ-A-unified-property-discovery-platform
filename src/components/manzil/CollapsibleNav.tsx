import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CollapsibleNav({
  id,
  label,
  defaultOpen = true,
  children,
}: {
  id: string;
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const key = `manzil-nav-${id}`;
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === '0') setOpen(false);
      if (raw === '1') setOpen(true);
    } catch { /* ignore */ }
  }, [key]);
  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      try { localStorage.setItem(key, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };
  return (
    <div className="nav-collapse">
      <Button type="button" variant="legacy" className="nav-collapse-toggle" onClick={toggle} aria-expanded={open}>
        <span>{label}</span>
        <ChevronDown size={14} className={open ? 'nav-chevron open' : 'nav-chevron'} />
      </Button>
      {open && <div className="nav-collapse-body">{children}</div>}
    </div>
  );
}
