import { formatSize } from '@/lib/manzil/phase3-rules';
import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useCompare } from '@/lib/manzil/compare';
import { formatPrice } from '@/lib/manzil/properties';

/** WBS: Customer Portal — Plot Comparison (5 features) */
function Compare({ onNavigate }: { onNavigate: (p: string, arg?: string) => void }) {
  const { t } = useTranslation(['marketplace', 'common']);
  const { items, clear, toggle } = useCompare();

  const rows: { label: string; get: (p: (typeof items)[number]) => string }[] = [
    { label: t('marketplace:price'), get: (p) => formatPrice(p.price) },
    { label: t('marketplace:size'), get: (p) => formatSize(p.plot_size_marla) },
    { label: t('marketplace:location'), get: (p) => `${p.city}${p.area ? ', ' + p.area : ''}` },
    { label: t('common:society'), get: (p) => p.society_name ?? '—' },
    { label: t('marketplace:category'), get: (p) => p.category === 'commercial' ? t('marketplace:commercial') : t('marketplace:residential') },
    { label: t('marketplace:purpose'), get: (p) => p.purpose === 'rent' ? t('marketplace:rentPurpose') : t('marketplace:sale') },
    { label: t('marketplace:bedrooms'), get: (p) => (p.bedrooms != null ? String(p.bedrooms) : '—') },
    { label: t('marketplace:bathrooms'), get: (p) => (p.bathrooms != null ? String(p.bathrooms) : '—') },
    { label: t('marketplace:status'), get: (p) => p.status === 'available' ? t('marketplace:available') : p.status === 'reserved' ? t('marketplace:reserved') : p.status === 'sold' ? t('marketplace:sold') : p.status },
    { label: t('marketplace:paymentPlan'), get: (p) => (p.purpose === 'rent' ? t('marketplace:monthlyRent') : t('marketplace:fullPaymentInstallments')) },
  ];

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{t('marketplace:compareTitle')}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {t('marketplace:compareSubtitle')}
          </p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('marketplace')}>
            {t('common:marketplace')}
          </Button>
          {items.length > 0 && (
            <Button variant="legacy" className="btn secondary small" onClick={clear}>
              {t('marketplace:clearAll')}
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <p className="muted">
            {t('marketplace:compareEmpty')}
          </p>
          <Button variant="legacy" className="btn small" onClick={() => onNavigate('marketplace')}>
            {t('marketplace:browseProperties')}
          </Button>
        </div>
      ) : (
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th></th>
                {items.map((p) => (
                  <th key={p.id}>
                    {p.title}
                    <Button variant="legacy" className="link inline" onClick={() => toggle(p)}>
                      {' '}✕ {t('marketplace:remove')}
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="row-label">{r.label}</td>
                  {items.map((p) => (
                    <td key={p.id}>{r.get(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/compare")({ head: () => pageHead("Compare"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame publicPage><Compare onNavigate={onNavigate} /></PageFrame>; }
