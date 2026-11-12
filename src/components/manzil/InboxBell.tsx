import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/manzil/auth';
import { unreadCount } from '@/lib/manzil/notify';

export function InboxBell({ onClick, label }: { onClick: () => void; label: string }) {
  const { session } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    let live = true;
    if (!session?.user.id) { setCount(0); return; }
    void unreadCount(session.user.id).then((n) => { if (live) setCount(n); });
    const t = setInterval(() => {
      void unreadCount(session.user.id).then((n) => { if (live) setCount(n); });
    }, 60_000);
    return () => { live = false; clearInterval(t); };
  }, [session?.user.id]);
  return (
    <Button variant="ghost" size="icon" aria-label={label} onClick={onClick} className="inbox-bell">
      <Bell size={18} />
      {count > 0 && <span className="inbox-badge" aria-hidden>{count > 9 ? '9+' : count}</span>}
    </Button>
  );
}
