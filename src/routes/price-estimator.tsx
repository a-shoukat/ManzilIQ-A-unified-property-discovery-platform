import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { PageFrame, useAppNavigation, pageHead } from '@/components/manzil/PageFrame';
import { useState } from 'react';
import { estimatePrice, isAiConfigured, type EstimateInput, type EstimateResult } from '@/lib/manzil/estimator';
import { formatPrice } from '@/lib/manzil/properties';
import { normalizeCity } from '@/lib/manzil/format';

/** Module 8 — AI Price Prediction */
function PriceEstimator({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [city, setCity] = useState('Narowal');
  const [area, setArea] = useState('');
  const [society, setSociety] = useState('');
  const [size, setSize] = useState('5');
  const [category, setCategory] = useState<'residential' | 'commercial'>('residential');
  const [bedrooms, setBedrooms] = useState('');
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const cityNorm = normalizeCity(city) || 'Narowal';
    const input: EstimateInput = {
      city: cityNorm,
      area: area.trim() || cityNorm,
      sizeMarla: parseFloat(size) || 0,
      category,
      bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
      society: society.trim(),
    };
    setCity(cityNorm);
    setResult(await estimatePrice(input));
    setLoading(false);
  };

  return (
    <div className="container">
      <div className="card wide">
        <div className="topbar">
          <div>
            <h1 style={{ margin: 0 }}>AI price estimator</h1>
            <p className="muted" style={{ margin: 0 }}>
              {isAiConfigured() ? 'AI-assisted valuation' : 'Valuation based on local comparables and regional baselines'}
            </p>
          </div>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dashboard')}>Dashboard</Button>
        </div>

        <form onSubmit={run}>
          <div className="form-row">
            <label>City<input value={city} onChange={(e) => setCity(e.target.value)} /></label>
            <label>Area<input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Zafarwal Road" /></label>
          </div>
          <div className="form-row">
            <label>Society (optional)<input value={society} onChange={(e) => setSociety(e.target.value)} /></label>
            <label>Size (Marla)<input required type="number" min={0.5} step={0.5} value={size} onChange={(e) => setSize(e.target.value)} /></label>
          </div>
          <div className="form-row">
            <label>Category
              <select value={category} onChange={(e) => setCategory(e.target.value as 'residential' | 'commercial')}>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </label>
            <label>Bedrooms (optional)<input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></label>
          </div>
          <Button variant="legacy" className="btn" disabled={loading}>{loading ? 'Estimating…' : 'Estimate price'}</Button>
        </form>

        {result && (
          <div style={{ marginTop: 20 }}>
            <div className="badge ok">{result.method === 'ai' ? 'AI estimate' : 'Local estimate'}</div>
            <p className="price big" style={{ margin: '8px 0' }}>{formatPrice(result.mid)}</p>
            <p className="estimate-range" style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>
              Range {formatPrice(result.low)} – {formatPrice(result.high)}
            </p>
            {((result.mid > 0 && (result.high - result.low) / result.mid > 0.6) || (result.r2 != null && result.r2 < 0.35)) && (
              <div className="notice warn-box" style={{ marginBottom: 12 }}>
                {result.r2 != null && result.r2 < 0.35
                  ? `Low model fit (R² ${Math.round(result.r2 * 100)}%). Treat the mid-point as directional only.`
                  : 'Wide price band — local comparables disagree. Prefer the range over the mid-point.'}
              </div>
            )}
            <div className="detail-grid">
              <div className="detail-item"><span className="detail-key">Low</span><span>{formatPrice(result.low)}</span></div>
              <div className="detail-item"><span className="detail-key">High</span><span>{formatPrice(result.high)}</span></div>
              <div className="detail-item"><span className="detail-key">Confidence score</span><span>{result.confidence}%</span></div>
              <div className="detail-item"><span className="detail-key">R² fit</span><span>{result.r2 != null ? `${Math.round(result.r2 * 100)}%` : '—'}</span></div>
              <div className="detail-item"><span className="detail-key">Data points</span><span>{result.samples}</span></div>
            </div>
            <p className="muted small" style={{ marginTop: 12 }}>{result.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/price-estimator")({ head: () => pageHead("Price Estimator"), component: RoutePage });
function RoutePage() { const onNavigate = useAppNavigation(); return <PageFrame publicPage><PriceEstimator onNavigate={onNavigate} /></PageFrame>; }
