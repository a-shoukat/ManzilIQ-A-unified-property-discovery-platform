import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { fetchMyRequests, fetchSocietySummaries, sendJoinRequest, withTimeout } from '@/lib/manzil/dealer';
import type { SocietySummary } from '@/lib/manzil/types';

const DISCOVER_TIMEOUT_MS = 12_000;

/** WBS: Dealer Portal — Society Discovery & Join (5 features) */
function Discover({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useTranslation(['dealer', 'common']);
  const { session } = useAuth();
  const [societies, setSocieties] = useState<SocietySummary[]>([]);
  const [reqMap, setReqMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, r] = await withTimeout(
        Promise.all([
          fetchSocietySummaries(),
          session ? fetchMyRequests(session.user.id) : Promise.resolve([]),
        ]),
        DISCOVER_TIMEOUT_MS,
        t('dealer:discoverHeading'),
      );
      setSocieties(s);
      const m: Record<string, string> = {};
      r.forEach((x) => (m[x.society_id] = x.status));
      setReqMap(m);
    } catch (e) {
      setSocieties([]);
      setError(e instanceof Error ? e.message : t('common:tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = async (sid: string) => {
    if (!session) return;
    try {
      await sendJoinRequest(session.user.id, sid);
      setMsg(t('dealer:joinRequestSent'));
      void load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t('common:tryAgain'));
    }
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{t('dealer:discoverHeading')}</h1>
          <p className="muted" style={{ margin: 0 }}>{t('dealer:discoverDesc')}</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dealer')}>
          {t('dealer:hubTitle')}
        </Button>
      </div>
      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      {error && (
        <div className="error" role="alert" style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 8px' }}>{error}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>{t('common:retry')}</Button>
        </div>
      )}
      {loading ? (
        <div className="hub-grid" aria-busy="true" aria-label={t('common:loading')}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="hub-card discover-skeleton">
              <span className="skeleton-line wide" />
              <span className="skeleton-line" />
              <span className="skeleton-line short" />
            </div>
          ))}
        </div>
      ) : !error && societies.length === 0 ? (
        <p className="muted">{t('dealer:noSocieties')}</p>
      ) : !error ? (
        <div className="hub-grid">
          {societies.map((s) => {
            const st = reqMap[s.id];
            return (
              <div key={s.id} className="hub-card" style={{ cursor: 'default' }}>
                <strong>{s.name}</strong>
                <span className="muted small">{s.email}</span>
                <span className="muted small">
                  {s.plots_available} / {s.plots_total} {t('common:plotsAvailable')}
                </span>
                {st === 'approved' ? (
                  <span className="badge ok">{t('dealer:approvedLotsHint')}</span>
                ) : st === 'pending' ? (
                  <span className="badge warn">{t('dealer:requestPending')}</span>
                ) : st === 'rejected' ? (
                  <span className="badge warn">{t('common:rejected')}</span>
                ) : (
                  <Button variant="legacy" className="btn small" onClick={() => void join(s.id)}>
                    {t('dealer:requestJoin')}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute('/dealer-discover')({
  head: () => pageHead('Dealer Discover'),
  component: RoutePage,
});
function RoutePage() {
  const onNavigate = useAppNavigation();
  return <PageFrame><Discover onNavigate={onNavigate} /></PageFrame>;
}
