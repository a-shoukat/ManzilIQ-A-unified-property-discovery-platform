import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import { fetchDocuments, generateDocument } from '@/lib/manzil/legal';
import { fetchAllBookings, fetchSocietyBookings } from '@/lib/manzil/booking';
import { DOC_TITLES, type Booking, type GeneratedDocType, type GeneratedDocument } from '@/lib/manzil/types';
import { useSocietyId } from './society';
import { SignatureCapture } from '@/components/manzil/SignatureCapture';
import { SIGNABLE_DOCS, SIGN_PARTIES, buildLegalPdfHtml, splitSignatures, watermarkText, type PartySignature } from '@/lib/manzil/legal-signature';

const docTypeOptions = Object.keys(DOC_TITLES) as GeneratedDocType[];

/** Module 11 — Document & Legal System: locker, generation, audit trail */
function Documents({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { t } = useTranslation(['legal', 'common']);
  const { session, profile } = useAuth();
  const { societyId } = useSocietyId();
  const [docs, setDocs] = useState<GeneratedDocument[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<GeneratedDocument | null>(null);
  const [genBooking, setGenBooking] = useState('');
  const [genType, setGenType] = useState<GeneratedDocType>('sale_agreement');
  const [msg, setMsg] = useState<string | null>(null);
  const [bulk, setBulk] = useState<string[]>([]);
  const [sigs, setSigs] = useState<PartySignature[]>([]);

  const openPdf = (d: GeneratedDocument) => {
    const html = buildLegalPdfHtml({ title: DOC_TITLES[d.doc_type], body: d.body, reference: d.booking_ref ?? d.id.slice(0, 8), generatedAt: d.created_at, version: d.version });
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    if (!window.open(url, '_blank')) setMsg(t('legal:allowPopups'));
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const isSociety = profile?.role === 'society_admin' || profile?.role === 'super_admin';

  const load = async () => {
    if (!session) return;
    setLoading(true);
    const role = profile?.role;
    let d: GeneratedDocument[] = [];
    if (role === 'buyer') d = await fetchDocuments({ customerId: session.user.id });
    else if (role === 'dealer') d = await fetchDocuments({ dealerId: session.user.id });
    else if (role === 'society_admin' && societyId) d = await fetchDocuments({ societyId });
    else if (role === 'super_admin') d = await fetchDocuments({ all: true });
    setDocs(d);
    if (role === 'super_admin') setBookings(await fetchAllBookings());
    else if (isSociety && societyId) setBookings(await fetchSocietyBookings(societyId));
    setLoading(false);
  };

  useEffect(() => {
    if (profile && (profile.role !== 'society_admin' || societyId)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, societyId]);

  const doGenerate = async () => {
    const b = bookings.find((x) => x.id === genBooking);
    if (!b) {
      setMsg(t('legal:selectBooking'));
      return;
    }
    if (SIGNABLE_DOCS.includes(genType) && sigs.length < 2) {
      setMsg(t('legal:signatures'));
      return;
    }
    try {
      await generateDocument(b, genType, undefined, SIGNABLE_DOCS.includes(genType) ? sigs : undefined);
      setMsg(t('legal:generated'));
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t('legal:generated'));
    }
  };

  const toggleBulk = (id: string) =>
    setBulk((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const expiringSoon = (d: GeneratedDocument) => {
    if (!d.expires_at) return false;
    const days = (new Date(d.expires_at).getTime() - Date.now()) / (24 * 3600 * 1000);
    return days < 30;
  };

  const bulkDocs = docs.filter((d) => bulk.includes(d.id));

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{t('legal:title')}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {t('legal:subtitle')}
          </p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>{t('common:dashboard')}</Button>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}

      {isSociety && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Generate document</h3>
          <div className="form-row">
            <label>Booking
              <select value={genBooking} onChange={(e) => setGenBooking(e.target.value)}>
                <option value="">Select…</option>
                {bookings.map((b) => <option key={b.id} value={b.id}>{b.reference_no} · {b.plot_label}</option>)}
              </select>
            </label>
            <label>Type
              <select value={genType} onChange={(e) => setGenType(e.target.value as GeneratedDocType)}>
                {docTypeOptions.map((k) => (
                  <option key={k} value={k}>{DOC_TITLES[k]}</option>
                ))}
              </select>
            </label>
          </div>
          {SIGNABLE_DOCS.includes(genType) && (
            <SignatureCapture key={genType} parties={SIGN_PARTIES[genType]!} onChange={setSigs} />
          )}
          <Button variant="legacy" className="btn small" onClick={doGenerate}>Generate</Button>
        </div>
      )}

      {loading ? <p className="muted">Loading…</p> : docs.length === 0 ? (
        <p className="muted">No documents yet. They generate automatically on booking approval, payments and transfers.</p>
      ) : (
        <>
          {isSociety && bulk.length > 0 && (
            <div className="compare-bar">
              <span>{bulk.length} selected</span>
              <Button variant="legacy" className="btn small" onClick={() => window.print()}>Print selected (bulk)</Button>
            </div>
          )}
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>{isSociety && <th></th>}<th>Document</th><th>Booking</th><th>Version</th><th>Created</th><th>Expiry</th><th></th></tr></thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    {isSociety && (
                      <td><input type="checkbox" checked={bulk.includes(d.id)} onChange={() => toggleBulk(d.id)} style={{ width: 'auto' }} /></td>
                    )}
                    <td>{DOC_TITLES[d.doc_type]}</td>
                    <td>{d.booking_ref}</td>
                    <td>v{d.version}</td>
                    <td>{new Date(d.created_at).toLocaleDateString()}</td>
                    <td>
                      {d.expires_at ? (
                        <span className={`badge ${expiringSoon(d) ? 'warn' : 'ok'}`}>{d.expires_at}</span>
                      ) : '—'}
                    </td>
                    <td className="row-actions">
                      <Button variant="legacy" className="link inline" onClick={() => setViewing(d)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {viewing && (
        <div className="modal-backdrop" onClick={() => setViewing(null)}>
          <div className="card receipt wide" onClick={(e) => e.stopPropagation()}>
            <div className="doc-watermark">MANZILIQ · SYSTEM GENERATED</div>
            <h2 style={{ textAlign: 'center' }}>{DOC_TITLES[viewing.doc_type]}</h2>
            <p style={{ textAlign: 'center' }} className="muted small">
              v{viewing.version} · {new Date(viewing.created_at).toLocaleDateString()}
            </p>
            <pre className="doc-body">{splitSignatures(viewing.body).text}</pre>
            {splitSignatures(viewing.body).sigs.length > 0 && (
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {splitSignatures(viewing.body).sigs.map((s) => (
                  <div key={s.role} style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ height: 60, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-end' }}>
                      {s.dataUrl ? <img src={s.dataUrl} alt={`${s.role} signature`} style={{ maxHeight: 56 }} /> : <i style={{ fontSize: 22 }}>{s.name}</i>}
                    </div>
                    <p className="small muted" style={{ margin: '4px 0 0' }}>{s.role}: {s.name}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="link-row no-print">
              <Button variant="legacy" className="btn small" onClick={() => openPdf(viewing)}>Print / PDF</Button>
              <Button variant="legacy" className="btn secondary small" onClick={() => setViewing(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* bulk print area */}
      {bulkDocs.length > 0 && (
        <div className="bulk-print">
          {bulkDocs.map((d) => (
            <div key={d.id} className="bulk-doc">
              <h2>{DOC_TITLES[d.doc_type]}</h2>
              <div className="doc-watermark">{watermarkText(d.booking_ref ?? d.id.slice(0, 8), d.created_at)}</div>
              <pre className="doc-body">{splitSignatures(d.body).text}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/documents")({ head: () => pageHead("Documents"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><Documents onNavigate={onNavigate} /></PageFrame>; }
