import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/manzil/auth';
import { useSubscription } from '@/lib/manzil/subscription';
import { FEATURE_LABELS, requiredPlanFor, type Feature } from '@/lib/manzil/plans';

/** Shows children normally when unlocked; otherwise blurred + disabled with an Upgrade button. */
export function GatedFeature({ feature, children }: { feature: Feature; children: ReactNode }) {
  const { profile } = useAuth();
  const { canUse, ready } = useSubscription();
  if (!ready || canUse(feature)) return <>{children}</>;
  const need = requiredPlanFor(feature, profile?.role);
  return (
    <div className="gated">
      <div className="gated-content" aria-hidden inert>{children}</div>
      <div className="gated-overlay">
        <span className="gated-badge"><Lock size={14} />Locked</span>
        <strong>{FEATURE_LABELS[feature]}</strong>
        <p className="muted small">{need ? `Available on ${need.name}.` : 'Available on a paid plan.'}</p>
        <Button asChild size="sm"><Link to="/pricing">Upgrade</Link></Button>
      </div>
    </div>
  );
}

/** Banner shown when a paid plan has expired. */
export function RenewalBanner() {
  const { expired, sub } = useSubscription();
  if (!expired) return null;
  return (
    <div className="notice renewal-banner">
      <span>Your paid plan {sub?.status === 'cancelled' ? 'was cancelled' : 'has expired'}. Your account and data are safe; paid features are locked until you renew.</span>
      <Button asChild size="sm"><Link to="/pricing">Renew plan</Link></Button>
    </div>
  );
}
