import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import {
  fetchLegalTemplates,
  renderTemplatePreview,
  saveLegalTemplate,
} from '@/lib/manzil/admin';
import { LEGAL_TEMPLATE_KEYS, type LegalTemplate } from '@/lib/manzil/types';

const DEFAULT_BODIES: Record<string, string> = {
  allotment: `ALLOTMENT LETTER

Date: {{date}}
Ref: {{reference_no}}

Dear {{customer_name}} (CNIC: {{cnic}}),

This letter confirms the allotment of {{plot}}, {{society}} against a total consideration of {{amount}}.

Terms and installment schedule apply as per the sale agreement.

Authorized signature: ____________`,
  sale_agreement: `SALE & PURCHASE AGREEMENT

Date: {{date}} | Ref: {{reference_no}}

Between the society ({{society}}) and {{customer_name}} (CNIC: {{cnic}}) for {{plot}} at a total price of {{amount}}.

Both parties agree to the payment schedule and transfer terms attached.

Seller: ____________   Buyer: ____________`,
  transfer_deed: `TRANSFER DEED

Date: {{date}} | Ref: {{reference_no}}

Plot {{plot}}, {{society}} is hereby transferred to {{customer_name}} (CNIC: {{cnic}}) after full payment of {{amount}}.

Transferor: ____________   Transferee: ____________`,
};

/** WBS: Admin Panel — Legal Template Management (5 features) */
function LegalTemplates({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [templates, setTemplates] = useState<LegalTemplate[]>([]);
  const [key, setKey] = useState('allotment');
  const [body, setBody] = useState(DEFAULT_BODIES['allotment'] ?? '');
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => setTemplates(await fetchLegalTemplates());

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const latest = templates.find((t) => t.key === key);
    setBody(latest ? latest.body : (DEFAULT_BODIES[key] ?? ''));
    setPreview(false);
  }, [key, templates]);

  const save = async (publish: boolean) => {
    const meta = LEGAL_TEMPLATE_KEYS.find((k) => k.key === key);
    if (!meta) return;
    await saveLegalTemplate(key, meta.title, body, publish);
    setMsg(publish ? 'Published as new version.' : 'Saved as draft version.');
    load();
  };

  const versions = templates.filter((t) => t.key === key);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Legal templates</h1>
          <p className="muted" style={{ margin: 0 }}>Edit, preview, version, publish</p>
        </div>
        <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('admin')}>Admin panel</Button>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="block-tabs" style={{ marginBottom: 16 }}>
        {LEGAL_TEMPLATE_KEYS.map((k) => (
          <Button variant="legacy" key={k.key} className={`tab${k.key === key ? ' active' : ''}`} onClick={() => setKey(k.key)}>
            {k.title}
          </Button>
        ))}
      </div>

      <div className="panel-grid">
        <div className="card">
          <h3>Edit — v{versions.length > 0 ? (versions[0]?.version ?? 0) + 1 : 1} (new)</h3>
          <p className="muted small">
            Placeholders: {'{{customer_name}} {{cnic}} {{plot}} {{society}} {{amount}} {{date}} {{reference_no}}'}
          </p>
          <textarea rows={14} value={body} onChange={(e) => setBody(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 13 }} />
          <div className="link-row">
            <Button variant="legacy" className="btn secondary small" onClick={() => setPreview(!preview)}>
              {preview ? 'Hide preview' : 'Preview'}
            </Button>
            <Button variant="legacy" className="btn secondary small" onClick={() => save(false)}>Save draft</Button>
            <Button variant="legacy" className="btn small" onClick={() => save(true)}>Publish new version</Button>
          </div>
        </div>
        <div className="card">
          <h3>Version history</h3>
          {versions.length === 0 && <p className="muted small">No versions yet.</p>}
          {versions.map((v) => (
            <div key={v.id} className="queue-head" style={{ borderBottom: '1px solid #1e293b', padding: '8px 0' }}>
              <span>v{v.version} · {new Date(v.created_at).toLocaleDateString()}</span>
              <span className={`badge ${v.published ? 'ok' : 'warn'}`}>{v.published ? 'published' : 'draft'}</span>
            </div>
          ))}
        </div>
      </div>

      {preview && (
        <div className="card wide" style={{ marginTop: 16, background: '#fff', color: '#000' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
            {renderTemplatePreview(body)}
          </pre>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin-templates")({ head: () => pageHead("Admin Templates"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><LegalTemplates onNavigate={onNavigate} /></PageFrame>; }
