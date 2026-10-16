import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { errorText } from '@/lib/manzil/errors';
import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/manzil/auth';
import {
  addActivity,
  createLead,
  deleteLead,
  fetchActivities,
  fetchLeads,
  fetchLotPlots,
  fetchMyLots,
  updateLead,
} from '@/lib/manzil/dealer';
import { LEAD_LABELS, filterByLabel, leadLabelOf, type LeadLabel } from '@/lib/manzil/deal-pipeline';
import { PIPELINE_STAGES, type Lead, type LeadActivity, type LeadStatus, type Plot } from '@/lib/manzil/types';

const STATUSES: LeadStatus[] = ['new', 'hot', 'warm', 'cold', 'converted', 'lost'];

/** WBS: Dealer Portal — Customer Lead Management (6) + Deal Pipeline (6 stages) */
function Leads({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { session } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [labelFilter, setLabelFilter] = useState<LeadLabel | 'all'>('all');
  const [msg, setMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const removeLead = async (lead: Lead) => {
    setDeleting(lead.id);
    try {
      await deleteLead(lead.id);
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      if (openLead === lead.id) setOpenLead(null);
      toast.success('Lead deleted');
    } catch (err) {
      toast.error(errorText(err, 'Could not delete lead'));
    } finally {
      setDeleting(null);
    }
  };

  // new lead form
  const [showForm, setShowForm] = useState(false);
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fStatus, setFStatus] = useState<LeadStatus>('new');
  const [fLabel, setFLabel] = useState<LeadLabel | ''>('');
  const [fPlot, setFPlot] = useState('');
  const [fFollowUp, setFFollowUp] = useState('');

  // activity form
  const [aType, setAType] = useState<LeadActivity['activity_type']>('call');
  const [aDetails, setADetails] = useState('');

  const load = async () => {
    if (!session) return;
    setLoading(true);
    const [l, lots] = await Promise.all([fetchLeads(session.user.id), fetchMyLots(session.user.id)]);
    setLeads(l);
    const allPlots: Plot[] = [];
    for (const lot of lots) allPlots.push(...(await fetchLotPlots(lot.id)));
    setPlots(allPlots);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id: string) => {
    if (openLead === id) {
      setOpenLead(null);
      return;
    }
    setOpenLead(id);
    setActivities(await fetchActivities(id));
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    try {
      await createLead(session.user.id, {
        customer_name: fName,
        phone: fPhone,
        email: fEmail,
        status: fStatus,
        label: fLabel || null,
        plot_id: fPlot || null,
        follow_up_date: fFollowUp || null,
      });
      setMsg('Lead added.');
      setShowForm(false);
      setFName(''); setFPhone(''); setFEmail(''); setFPlot(''); setFFollowUp('');
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    }
  };

  const logActivity = async (leadId: string) => {
    if (!aDetails.trim()) return;
    await addActivity(leadId, aType, aDetails.trim());
    setADetails('');
    setActivities(await fetchActivities(leadId));
  };

  const moveStage = async (lead: Lead, dir: 1 | -1) => {
    const floor = lead.booking_stage ?? 1;
    const next = Math.min(6, Math.max(floor, stageOf(lead) + dir));
    await updateLead(lead.id, { pipeline_stage: next });
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, pipeline_stage: next } : l)));
  };

  const stageOf = (l: Lead) => Math.max(l.pipeline_stage, l.booking_stage ?? 1);
  const setLabel = async (lead: Lead, label: LeadLabel | null) => {
    try {
      await updateLead(lead.id, { label });
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, label } : l)));
    } catch (err) { toast.error(errorText(err, 'Could not save label')); }
  };
  const visible = filterByLabel(leads, labelFilter);
  const today = new Date().toISOString().slice(0, 10);
  const dueFollowUps = leads.filter((l) => l.follow_up_date && l.follow_up_date <= today && !['converted', 'lost'].includes(l.status));

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Leads & pipeline</h1>
          <p className="muted" style={{ margin: 0 }}>{leads.length} leads</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="legacy" className="btn small" onClick={() => setShowForm(!showForm)}>+ Add lead</Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dealer')}>Dealer portal</Button>
        </div>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}

      {dueFollowUps.length > 0 && (
        <div className="notice warn-box" style={{ marginBottom: 12 }}>
          ⏰ {dueFollowUps.length} follow-up{dueFollowUps.length > 1 ? 's' : ''} due: {dueFollowUps.map((l) => l.customer_name).join(', ')}
        </div>
      )}

      {showForm && (
        <div className="card wide" style={{ marginBottom: 16 }}>
          <h3>Add new customer lead</h3>
          <form onSubmit={submitLead}>
            <div className="form-row">
              <label>Name<input required value={fName} onChange={(e) => setFName(e.target.value)} /></label>
              <label>Phone<input value={fPhone} onChange={(e) => setFPhone(e.target.value)} placeholder="03xx-xxxxxxx" /></label>
            </div>
            <div className="form-row">
              <label>Email<input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} /></label>
              <label>Status
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value as LeadStatus)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>Label
                <select value={fLabel} onChange={(e) => setFLabel(e.target.value as LeadLabel | '')}>
                  <option value="">— none —</option>
                  {LEAD_LABELS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>Assign plot
                <select value={fPlot} onChange={(e) => setFPlot(e.target.value)}>
                  <option value="">— none —</option>
                  {plots.map((p) => <option key={p.id} value={p.id}>{p.block}-{p.plot_no} ({p.size_marla}M)</option>)}
                </select>
              </label>
              <label>Follow-up date<input type="date" value={fFollowUp} onChange={(e) => setFFollowUp(e.target.value)} /></label>
            </div>
            <Button variant="legacy" className="btn small" type="submit">Save lead</Button>
          </form>
        </div>
      )}

      {leads.length > 0 && (
        <div className="link-row" style={{ marginBottom: 12 }}>
          {(['all', ...LEAD_LABELS] as const).map((l) => (
            <Button key={l} variant="legacy" className={`btn small${labelFilter === l ? '' : ' secondary'}`} onClick={() => setLabelFilter(l)}>
              {l === 'all' ? `All (${leads.length})` : `${l[0].toUpperCase() + l.slice(1)} (${filterByLabel(leads, l).length})`}
            </Button>
          ))}
        </div>
      )}

      {loading ? <p className="muted">Loading…</p> : leads.length === 0 ? (
        <p className="muted">No leads yet — add your first customer lead.</p>
      ) : (
        visible.length === 0 ? <p className="muted">No {labelFilter} leads.</p> : visible.map((lead) => (
          <div key={lead.id} className="card wide" style={{ marginBottom: 12 }}>
            <div className="queue-head">
              <div>
                <strong>{lead.customer_name}</strong>
                <div className="muted small">
                  {lead.phone ?? ''} {lead.email ? `· ${lead.email}` : ''}
                  {lead.plot_label ? ` · Plot ${lead.plot_label}` : ''}
                  {lead.follow_up_date ? ` · Follow-up: ${lead.follow_up_date}` : ''}
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={lead.status}
                    onChange={async (e) => {
                      await updateLead(lead.id, { status: e.target.value as LeadStatus });
                      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: e.target.value as LeadStatus } : l)));
                    }}
                    style={{ width: 'auto', marginTop: 0 }}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    aria-label="Lead label"
                    value={leadLabelOf(lead) ?? ''}
                    onChange={(e) => setLabel(lead, (e.target.value || null) as LeadLabel | null)}
                    style={{ width: 'auto', marginTop: 0 }}
                  >
                    <option value="">No label</option>
                    {LEAD_LABELS.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
                  </select>
                  {leadLabelOf(lead) && <span className={`badge${leadLabelOf(lead) === 'hot' ? ' warn' : leadLabelOf(lead) === 'warm' ? ' ok' : ''}`}>{leadLabelOf(lead)}</span>}
                  <span className="muted small">
                    Stage {stageOf(lead)}/6: {PIPELINE_STAGES[stageOf(lead) - 1]}
                  </span>
                </div>
              </div>
              <div className="link-row" style={{ margin: 0 }}>
                <Button variant="legacy" className="btn secondary small" disabled={stageOf(lead) <= (lead.booking_stage ?? 1)} onClick={() => moveStage(lead, -1)}>←</Button>
                <Button variant="legacy" className="btn secondary small" disabled={stageOf(lead) >= 6} onClick={() => moveStage(lead, 1)}>→</Button>
                <Button variant="legacy" className="btn secondary small" onClick={() => openDetail(lead.id)}>
                  {openLead === lead.id ? 'Hide' : 'History'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="legacy" className="link inline danger-text" disabled={deleting === lead.id}>{deleting === lead.id ? 'Deleting…' : 'Delete'}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                      <AlertDialogDescription>{lead.customer_name} and its activity history will be removed. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void removeLead(lead)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* pipeline progress */}
            <div className="pipeline">
              {PIPELINE_STAGES.map((s, i) => (
                <div key={s} className={`pipe-stage${i + 1 <= stageOf(lead) ? ' done' : ''}`} title={s}>
                  {i + 1}
                </div>
              ))}
            </div>

            {openLead === lead.id && (
              <div style={{ marginTop: 12 }}>
                <h3>Contact history</h3>
                {activities.length === 0 && <p className="muted small">No calls/visits logged yet.</p>}
                {activities.map((a) => (
                  <div key={a.id} className="activity">
                    <span className="badge">{a.activity_type}</span>
                    <span>{a.details}</span>
                    <span className="muted small">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
                <div className="form-row" style={{ marginTop: 12 }}>
                  <select value={aType} onChange={(e) => setAType(e.target.value as LeadActivity['activity_type'])} style={{ marginTop: 0 }}>
                    <option value="call">Call</option>
                    <option value="visit">Visit</option>
                    <option value="note">Note</option>
                    <option value="follow_up">Follow-up</option>
                  </select>
                  <input value={aDetails} onChange={(e) => setADetails(e.target.value)} placeholder="Log call / visit details…" style={{ marginTop: 0 }} />
                </div>
                <Button variant="legacy" className="btn small" style={{ marginTop: 8 }} onClick={() => logActivity(lead.id)}>Log</Button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export const Route = createFileRoute("/dealer-leads")({ head: () => pageHead("Dealer Leads"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><Leads onNavigate={onNavigate} /></PageFrame>; }
