import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageFrame, pageHead } from '@/components/manzil/PageFrame';
import { MockWalletCheckout } from '@/components/manzil/MockWalletCheckout';
import { useAuth } from '@/lib/manzil/auth';
import { saveSubscription, useSubscription } from '@/lib/manzil/subscription';
import { plansFor, type PaidRole, type Plan } from '@/lib/manzil/plans';
import { formatPrice } from '@/lib/manzil/properties';
import type { WalletMethod } from '@/lib/manzil/mock-gateway';

const ROLES: { key: PaidRole; label: string }[] = [{ key: 'buyer', label: 'Buyers' }, { key: 'dealer', label: 'Dealers' }, { key: 'society_admin', label: 'Societies' }];

function Pricing() {
  const { session, profile } = useAuth();
  const { plan: current, reload } = useSubscription();
  const myRole = profile?.role && profile.role !== 'super_admin' ? profile.role : undefined;
  const [tab, setTab] = useState<PaidRole>(myRole ?? 'buyer');
  const [checkout, setCheckout] = useState<{ plan: Plan; method: WalletMethod | null } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const choose = async (p: Plan) => {
    setMsg(null);
    if (!session || !profile) return;
    try {
      if (p.price === 0) {
        await saveSubscription(profile.id, profile.role, p.id, {
          societyId: profile.role === 'society_admin' ? profile.id : null,
        });
        await reload();
        setMsg(`You are now on ${p.name}.`);
        return;
      }
      setCheckout({ plan: p, method: null });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not update plan');
    }
  };

  return (
    <div className="container">
      <div className="card wide">
        <h1>Plans & pricing</h1>
        <p className="muted">Monthly plans in PKR. {profile?.role === 'super_admin' ? 'Super admins always have full access.' : ''}</p>
        <div className="link-row">{ROLES.map((r) => <Button key={r.key} size="sm" variant={tab === r.key ? 'default' : 'outline'} onClick={() => setTab(r.key)}>{r.label}</Button>)}</div>
        {msg && <div className="notice">{msg}</div>}
        <div className="pricing-grid">
          {plansFor(tab).map((p) => {
            const isCurrent = myRole === tab && current?.id === p.id;
            const mine = myRole === tab;
            const up = current ? p.price > current.price : true;
            return (
              <div key={p.id} className={`pricing-card${isCurrent ? ' current' : ''}`}>
                <div className="pricing-head"><strong>{p.name}</strong>{isCurrent && <span className="gated-badge">Current plan</span>}</div>
                <div className="pricing-price">{p.price === 0 ? 'Free' : formatPrice(p.price)}<small>{p.price ? ' / month' : ''}</small></div>
                <ul>{p.highlights.map((h) => <li key={h}><Check size={14} />{h}</li>)}</ul>
                {!session ? <Button asChild variant="outline"><Link to="/login">Sign in to choose</Link></Button>
                  : !mine ? <Button variant="outline" disabled>For {ROLES.find((r) => r.key === tab)?.label.toLowerCase()}</Button>
                  : isCurrent ? <Button variant="outline" disabled>Current plan</Button>
                  : <Button variant={up ? 'default' : 'outline'} onClick={() => void choose(p)}>{up ? 'Upgrade' : 'Downgrade'}</Button>}
              </div>
            );
          })}
        </div>
        {checkout && profile && (
          <div className="card">
            <h3>Demo checkout — {checkout.plan.name}</h3>
            <p className="muted small">Demo checkout: no real payment gateway, no money is charged.</p>
            {!checkout.method ? (
              <div className="link-row">
                <Button onClick={() => setCheckout({ ...checkout, method: 'jazzcash' })}>JazzCash</Button>
                <Button onClick={() => setCheckout({ ...checkout, method: 'easypaisa' })}>EasyPaisa</Button>
                <Button variant="outline" onClick={() => setCheckout(null)}>Cancel</Button>
              </div>
            ) : (
              <MockWalletCheckout method={checkout.method} amount={checkout.plan.price} onCancel={() => setCheckout(null)}
                onPaid={async () => {
                  try {
                    await saveSubscription(profile.id, profile.role, checkout.plan.id, {
                      societyId: profile.role === 'society_admin' ? profile.id : null,
                    });
                    await reload();
                    setMsg(`Payment received. ${checkout.plan.name} is active for 30 days.`);
                    setCheckout(null);
                  } catch (e) {
                    setMsg(e instanceof Error ? e.message : 'Could not activate plan');
                  }
                }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/pricing')({
  head: () => pageHead('Plans & pricing'),
  component: () => <PageFrame publicPage><Pricing /></PageFrame>,
});
