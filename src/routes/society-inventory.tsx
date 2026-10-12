import { errorText } from '@/lib/manzil/errors';
import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useEffect, useState } from 'react';
import { deletePlot, fetchPlots, parsePlotCsv, setPlotStatus, upsertPlot } from '@/lib/manzil/society';
import { formatPrice } from '@/lib/manzil/properties';
import type { Plot, PropertyCategory } from '@/lib/manzil/types';
import { useSocietyId } from './society';

/** WBS: Society Portal — Plot Inventory Management (7 features) */
function Inventory({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { societyId, societies, setSocietyId } = useSocietyId();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [blockFilter, setBlockFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // add/edit form state
  const [editing, setEditing] = useState<Plot | null>(null);
  const [fBlock, setFBlock] = useState('A');
  const [fNo, setFNo] = useState('');
  const [fSize, setFSize] = useState('5');
  const [fCat, setFCat] = useState<PropertyCategory>('residential');
  const [fPrice, setFPrice] = useState('');

  const load = async (sid: string) => {
    setLoading(true);
    setPlots(await fetchPlots(sid));
    setLoading(false);
  };

  useEffect(() => {
    if (societyId) load(societyId);
  }, [societyId]);

  const blocks = [...new Set(plots.map((p) => p.block))].sort();
  const shown = blockFilter ? plots.filter((p) => p.block === blockFilter) : plots;

  const resetForm = () => {
    setEditing(null);
    setFBlock('A');
    setFNo('');
    setFSize('5');
    setFCat('residential');
    setFPrice('');
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!societyId) return;
    try {
      await upsertPlot(societyId, {
        block: fBlock.trim().toUpperCase(),
        plot_no: fNo.trim(),
        size_marla: parseFloat(fSize) || 0,
        category: fCat,
        base_price: parseFloat(fPrice) || 0,
        status: editing?.status ?? 'available',
      });
      setMsg(editing ? 'Plot updated.' : 'Plot added.');
      resetForm();
      load(societyId);
    } catch (err) {
      setMsg(errorText(err, 'Save failed'));
    }
  };

  const startEdit = (p: Plot) => {
    setEditing(p);
    setFBlock(p.block);
    setFNo(p.plot_no);
    setFSize(String(p.size_marla));
    setFCat(p.category);
    setFPrice(String(p.base_price));
  };

  const handleCsv = async (file: File) => {
    if (!societyId) return;
    const text = await file.text();
    const { rows, error } = parsePlotCsv(text);
    if (error) {
      setMsg(error);
      return;
    }
    let ok = 0;
    for (const r of rows) {
      try {
        await upsertPlot(societyId, {
          block: (r['block'] || 'A').toUpperCase(),
          plot_no: (r['plot_no'] ?? ''),
          size_marla: parseFloat((r['size_marla'] ?? '0')) || 0,
          category: (r['category'] as PropertyCategory) || 'residential',
          base_price: parseFloat((r['base_price'] ?? '0')) || 0,
        });
        ok++;
      } catch {
        /* skip bad rows */
      }
    }
    setMsg(`${ok} plots imported from CSV.`);
    load(societyId);
  };

  const cycleStatus = async (p: Plot) => {
    if (p.status !== 'available' && p.status !== 'blocked') return;
    await setPlotStatus(p.id, p.status === 'available' ? 'blocked' : 'available');
    if (societyId) load(societyId);
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>Plot inventory</h1>
          <p className="muted" style={{ margin: 0 }}>{plots.length} plots</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          {societies.length > 0 && (
            <select value={societyId ?? ''} onChange={(e) => setSocietyId(e.target.value)}>
              {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('society')}>Society portal</Button>
        </div>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="panel-grid">
        <div className="card">
          <h3>{editing ? 'Edit plot' : 'Manual plot entry'}</h3>
          <form onSubmit={submitForm}>
            <div className="form-row">
              <label>Block<input required value={fBlock} onChange={(e) => setFBlock(e.target.value)} /></label>
              <label>Plot no.<input required value={fNo} onChange={(e) => setFNo(e.target.value)} /></label>
            </div>
            <div className="form-row">
              <label>Size (Marla)<input required type="number" min={0} step={0.5} value={fSize} onChange={(e) => setFSize(e.target.value)} /></label>
              <label>Category
                <select value={fCat} onChange={(e) => setFCat(e.target.value as PropertyCategory)}>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              </label>
            </div>
            <label>Base price (PKR)<input required type="number" min={0} value={fPrice} onChange={(e) => setFPrice(e.target.value)} /></label>
            <div className="link-row">
              <Button variant="legacy" className="btn small" type="submit">{editing ? 'Update' : 'Add plot'}</Button>
              {editing && <Button variant="legacy" className="btn secondary small" type="button" onClick={resetForm}>Cancel</Button>}
            </div>
          </form>
        </div>
        <div className="card">
          <h3>Upload via CSV / Excel</h3>
          <p className="muted small">Columns: block, plot_no, size_marla, category, base_price</p>
          <input type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsv(f); }} />
          <p className="muted small" style={{ marginTop: 12 }}>
            Tip: Create the sheet in Excel, choose File &gt; Save as &gt; CSV, then upload it here.
          </p>
        </div>
      </div>

      <div className="filters" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)}>
          <option value="">All blocks</option>
          {blocks.map((b) => <option key={b} value={b}>Block {b}</option>)}
        </select>
      </div>

      {loading ? <p className="muted">Loading…</p> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Block</th><th>Plot</th><th>Size</th><th>Category</th><th>Base price</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <td>{p.block}</td>
                  <td>{p.plot_no}</td>
                  <td>{p.size_marla} M</td>
                  <td>{p.category}</td>
                  <td>{formatPrice(p.base_price)}</td>
                  <td><span className={`badge ${p.status === 'available' ? 'ok' : 'warn'}`}>{p.status}</span></td>
                  <td className="row-actions">
                    <Button variant="legacy" className="link inline" onClick={() => startEdit(p)}>Edit</Button>
                    <Button variant="legacy" className="link inline" onClick={() => cycleStatus(p)}>
                      {p.status === 'blocked' ? 'Unblock' : 'Block'}
                    </Button>
                    <Button variant="legacy" className="link inline danger-text" onClick={async () => { if (confirm('Delete this plot?')) { await deletePlot(p.id); if (societyId) load(societyId); } }}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="muted">No plots yet — add manually or upload CSV.</p>}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/society-inventory")({ head: () => pageHead("Society Inventory"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame ><Inventory onNavigate={onNavigate} /></PageFrame>; }
