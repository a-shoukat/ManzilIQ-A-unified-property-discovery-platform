import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { errorText } from '@/lib/manzil/errors';
import { formatPrice } from '@/lib/manzil/properties';
import {
  approveListing,
  fetchModerationQueue,
  listingApprovalRequired,
  rejectListing,
  rejectSchema,
  type ModerationRow,
} from '@/lib/manzil/moderation-ui';

/** Screen 2 — Admin listing moderation queue (admin-verification style). */
function AdminModeration({ onNavigate }: { onNavigate: (p: string, arg?: string) => void }) {
  const { session } = useAuth();
  const [rows, setRows] = useState<ModerationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);
  const approvalOn = listingApprovalRequired();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchModerationQueue());
    } catch (e) {
      setError(errorText(e, 'Could not load moderation queue'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const approve = async (id: string) => {
    if (!session) return;
    setActing(id);
    try {
      await approveListing(id, session.user.id);
      await load();
    } catch (e) {
      setError(errorText(e, 'Approve failed'));
    } finally {
      setActing(null);
    }
  };

  const reject = async (id: string) => {
    if (!session) return;
    const parsed = rejectSchema.safeParse({ reason: reasons[id] ?? '' });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Reason required');
      return;
    }
    setActing(id);
    try {
      await rejectListing(id, session.user.id, parsed.data.reason);
      await load();
    } catch (e) {
      setError(errorText(e, 'Reject failed'));
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="page">
      <div className="card wide">
        <div className="topbar">
          <div>
            <h1>Listing moderation</h1>
            <p className="muted" style={{ margin: 0 }}>Pending listings awaiting approve / reject</p>
          </div>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('admin')}>
            Admin hub
          </Button>
        </div>

        {!approvalOn && (
          <div className="notice warn-box" style={{ marginBottom: 12 }}>
            REQUIRE_LISTING_APPROVAL is off (VITE_REQUIRE_LISTING_APPROVAL unset). Queue still lists
            pending rows when present; live publish gating is inactive until the flag is enabled.
          </div>
        )}

        {error && <div className="error" role="alert">{error}</div>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="muted">No pending listings.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Listing</th>
                  <th>Owner</th>
                  <th>Price</th>
                  <th>Flags</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.image_url ? (
                        <img src={r.image_url} alt="" width={64} height={48} style={{ objectFit: 'cover', borderRadius: 4 }} />
                      ) : (
                        <span className="muted small">—</span>
                      )}
                    </td>
                    <td>
                      <strong>{r.title}</strong>
                      <div className="muted small">{r.city ?? '—'} · {new Date(r.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="small">{r.owner_email ?? r.owner_id.slice(0, 8)}</td>
                    <td>{r.price != null ? formatPrice(Number(r.price)) : '—'}</td>
                    <td>
                      {r.fraud_note ? (
                        <span className="badge warn">{r.fraud_note}</span>
                      ) : (
                        <span className="muted small">None</span>
                      )}
                    </td>
                    <td>
                      <div className="queue-actions">
                        <input
                          placeholder="Reject reason"
                          value={reasons[r.id] ?? ''}
                          onChange={(e) => setReasons({ ...reasons, [r.id]: e.target.value })}
                        />
                        <Button variant="legacy" className="btn small" disabled={acting === r.id} onClick={() => void approve(r.id)}>
                          Approve
                        </Button>
                        <Button variant="legacy" className="btn secondary small" disabled={acting === r.id} onClick={() => void reject(r.id)}>
                          Reject
                        </Button>
                        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('property', r.id)}>
                          Open
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/admin-moderation')({
  head: () => pageHead('Listing moderation'),
  component: RoutePage,
});
function RoutePage() {
  const onNavigate = useAppNavigation();
  return (
    <PageFrame>
      <AdminModeration onNavigate={onNavigate} />
    </PageFrame>
  );
}
