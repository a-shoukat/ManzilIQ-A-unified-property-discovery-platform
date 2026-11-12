import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { errorText } from '@/lib/manzil/errors';
import {
  exportAuditCsv,
  fetchAuditLogs,
  filterAuditLogs,
  metaDiff,
  paginate,
  type AuditRow,
} from '@/lib/manzil/audit-ui';
import { AUDIT_COPY as C } from '@/lib/manzil/phase10-copy/audit';

const PAGE_SIZE = 25;

/** Screen 4 — Audit log viewer. */
function AdminAudit({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState('');
  const [user, setUser] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAuditLogs(500));
    } catch (e) {
      setError(errorText(e, 'Could not load audit logs'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => filterAuditLogs(rows, { table, user, action, from, to }),
    [rows, table, user, action, from, to],
  );
  const { slice, pages } = useMemo(() => paginate(filtered, page, PAGE_SIZE), [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [table, user, action, from, to]);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{C.title}</h1>
          <p className="muted" style={{ margin: 0 }}>{C.subtitle(filtered.length, rows.length)}</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="legacy" className="btn secondary small" onClick={() => exportAuditCsv(filtered)}>
            {C.exportCsv}
          </Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('admin')}>
            {C.adminHub}
          </Button>
        </div>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="form-row">
          <label>Table / entity<input value={table} onChange={(e) => setTable(e.target.value)} placeholder="properties" /></label>
          <label>User / actor id<input value={user} onChange={(e) => setUser(e.target.value)} placeholder="uuid…" /></label>
          <label>Action<input value={action} onChange={(e) => setAction(e.target.value)} placeholder="listing.moderate" /></label>
        </div>
        <div className="form-row">
          <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : slice.length === 0 ? (
        <p className="muted">No audit events match these filters.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {slice.map((r) => {
                const diff = metaDiff((r.meta ?? {}) as Record<string, unknown>);
                return (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="small">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="small">{r.actor_id?.slice(0, 8) ?? '—'}</td>
                      <td>{r.action}</td>
                      <td className="small">{r.entity_type ?? '—'} {r.entity_id ? `· ${r.entity_id.slice(0, 8)}` : ''}</td>
                      <td>
                        <Button
                          variant="legacy"
                          className="btn secondary small"
                          onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        >
                          {openId === r.id ? 'Hide' : 'Expand'}
                        </Button>
                      </td>
                    </tr>
                    {openId === r.id && (
                      <tr>
                        <td colSpan={5}>
                          <div className="panel-grid">
                            <div className="card">
                              <h3>Old</h3>
                              <pre className="small" style={{ whiteSpace: 'pre-wrap' }}>{diff.oldVal}</pre>
                            </div>
                            <div className="card">
                              <h3>New</h3>
                              <pre className="small" style={{ whiteSpace: 'pre-wrap' }}>{diff.newVal}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="link-row" style={{ marginTop: 12 }}>
          <Button variant="legacy" className="btn secondary small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="muted small">Page {page} / {pages}</span>
          <Button variant="legacy" className="btn secondary small" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/admin-audit')({
  head: () => pageHead(C.title),
  component: RoutePage,
});
function RoutePage() {
  const onNavigate = useAppNavigation();
  return (
    <PageFrame>
      <AdminAudit onNavigate={onNavigate} />
    </PageFrame>
  );
}
