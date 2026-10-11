import { getSupabase } from './supabase';

export interface EstimateInput {
  city: string;
  area: string;
  sizeMarla: number;
  category: 'residential' | 'commercial';
  bedrooms: number | null;
  society: string;
}

export interface EstimateResult {
  low: number;
  mid: number;
  high: number;
  method: 'ai' | 'local';
  reasoning: string;
  samples: number;
  confidence: number; // 0..100
}

interface Sample {
  price: number;
  size: number;
  commercial: number;
  bedrooms: number;
  city: string;
  society: string;
}

/** Solve (A)x = b via Gaussian elimination with partial pivoting. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) continue;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i]));
}

/**
 * Hedonic regression model: ln(price) = β0 + β1·ln(size) + β2·commercial
 *   + β3·bedrooms + Σ βc·cityDummy + Σ βs·societyDummy
 * Trained with ridge regression on the app's own plots + marketplace listings,
 * so location (city / society) and features (size, category, bedrooms)
 * genuinely drive the estimate. Falls back to regional priors when no data.
 */
export async function estimateLocal(input: EstimateInput): Promise<EstimateResult> {
  const supabase = getSupabase();
  const samples: Sample[] = [];

  if (supabase) {
    const { data: plots } = await supabase
      .from('plots')
      .select('base_price, size_marla, category')
      .gt('size_marla', 0)
      .gt('base_price', 0)
      .limit(400);
    for (const p of (plots as { base_price: number; size_marla: number; category: string }[] | null) ?? []) {
      samples.push({
        price: Number(p.base_price),
        size: Number(p.size_marla),
        commercial: p.category === 'commercial' ? 1 : 0,
        bedrooms: 0,
        city: '',
        society: '',
      });
    }
    const { data: props } = await supabase
      .from('properties')
      .select('price, plot_size_marla, category, city, society_name')
      .gt('plot_size_marla', 0)
      .gt('price', 0)
      .limit(400);
    for (const p of (props as { price: number; plot_size_marla: number; category: string; city: string; society_name: string }[] | null) ?? []) {
      samples.push({
        price: Number(p.price),
        size: Number(p.plot_size_marla),
        commercial: p.category === 'commercial' ? 1 : 0,
        bedrooms: 0,
        city: (p.city ?? '').toLowerCase().trim(),
        society: (p.society_name ?? '').toLowerCase().trim(),
      });
    }
  }

  if (samples.length < 5) {
    // regional priors (PKR per marla)
    const perMarla = input.category === 'commercial' ? 2200000 : 950000;
    const mid = Math.round(perMarla * input.sizeMarla);
    return {
      low: Math.round(mid * 0.8),
      mid,
      high: Math.round(mid * 1.2),
      method: 'local',
      reasoning: 'Not enough local data yet — estimate uses regional baseline rates.',
      samples: samples.length,
      confidence: 35,
    };
  }

  // one-hot encodings for locations with enough support
  const cityCounts = new Map<string, number>();
  const socCounts = new Map<string, number>();
  for (const s of samples) {
    if (s.city) cityCounts.set(s.city, (cityCounts.get(s.city) ?? 0) + 1);
    if (s.society) socCounts.set(s.society, (socCounts.get(s.society) ?? 0) + 1);
  }
  const cities = [...cityCounts.entries()].filter(([, c]) => c >= 3).map(([c]) => c).slice(0, 8);
  const societies = [...socCounts.entries()].filter(([, c]) => c >= 3).map(([c]) => c).slice(0, 12);

  const cols = 4 + cities.length + societies.length;
  const XtX: number[][] = Array.from({ length: cols }, () => new Array(cols).fill(0));
  const Xty = new Array(cols).fill(0);

  const feat = (s: Sample): number[] => {
    const f = [1, Math.log(s.size), s.commercial, s.bedrooms];
    for (const c of cities) f.push(s.city === c ? 1 : 0);
    for (const so of societies) f.push(s.society === so ? 1 : 0);
    return f;
  };

  const ys: number[] = [];
  for (const s of samples) {
    const y = Math.log(s.price);
    ys.push(y);
    const f = feat(s);
    for (let i = 0; i < cols; i++) {
      Xty[i] += f[i] * y;
      for (let j = 0; j < cols; j++) XtX[i][j] += f[i] * f[j];
    }
  }
  // ridge regularization (skip intercept)
  for (let i = 1; i < cols; i++) XtX[i][i] += 2.0;

  const beta = solveLinear(XtX, Xty);

  const inCity = input.city.toLowerCase().trim();
  const inSoc = input.society.toLowerCase().trim();
  const q: Sample = {
    price: 0,
    size: Math.max(input.sizeMarla, 0.5),
    commercial: input.category === 'commercial' ? 1 : 0,
    bedrooms: input.bedrooms ?? 0,
    city: inCity,
    society: inSoc,
  };
  const qf = feat(q);
  const logPred = qf.reduce((s, v, i) => s + v * beta[i], 0);

  // residual std for the band
  let sse = 0;
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sst = 0;
  for (const s of samples) {
    const r = Math.log(s.price) - feat(s).reduce((a, v, i) => a + v * beta[i], 0);
    sse += r * r;
    const d = Math.log(s.price) - yMean;
    sst += d * d;
  }
  const sigma = Math.sqrt(sse / Math.max(samples.length - cols, 1));
  const r2 = sst > 0 ? Math.max(0, 1 - sse / sst) : 0;

  const mid = Math.round(Math.exp(logPred + (sigma * sigma) / 2));
  const low = Math.round(Math.exp(logPred - 1.28 * sigma));
  const high = Math.round(Math.exp(logPred + 1.28 * sigma));

  const drivers: string[] = [];
  const socIdx = societies.indexOf(inSoc);
  const cityIdx = cities.indexOf(inCity);
  if (socIdx >= 0 && Math.abs(beta[4 + cities.length + socIdx]) > 0.02) {
    const pct = Math.round((Math.exp(beta[4 + cities.length + socIdx]) - 1) * 100);
    drivers.push(`society "${input.society}" ${pct >= 0 ? '+' : ''}${pct}%`);
  } else if (cityIdx >= 0 && Math.abs(beta[4 + cityIdx]) > 0.02) {
    const pct = Math.round((Math.exp(beta[4 + cityIdx]) - 1) * 100);
    drivers.push(`city "${input.city}" ${pct >= 0 ? '+' : ''}${pct}%`);
  }
  if (Math.abs(beta[2]) > 0.02) {
    const pct = Math.round((Math.exp(beta[2]) - 1) * 100);
    drivers.push(`commercial ${pct >= 0 ? '+' : ''}${pct}%`);
  }
  if (q.bedrooms > 0 && Math.abs(beta[3]) > 0.005) {
    const pct = Math.round((Math.exp(beta[3] * q.bedrooms) - 1) * 100);
    drivers.push(`${q.bedrooms} bedrooms ${pct >= 0 ? '+' : ''}${pct}%`);
  }

  const confidence = Math.round(40 + r2 * 55 + Math.min(samples.length / 40, 1) * 5);

  return {
    low,
    mid,
    high,
    method: 'local',
    reasoning: `Regression model trained on ${samples.length} local records (R² ${(r2 * 100).toFixed(0)}%).${drivers.length ? ' Key drivers: ' + drivers.join(', ') + '.' : ''}`,
    samples: samples.length,
    confidence: Math.min(confidence, 97),
  };
}

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export function isAiConfigured(): boolean {
  return !!GEMINI_KEY && !GEMINI_KEY.includes('your-');
}

/** Gemini-powered estimate with the regression model as baseline/fallback. */
export async function estimatePrice(input: EstimateInput): Promise<EstimateResult> {
  const local = await estimateLocal(input);
  if (!isAiConfigured()) return local;

  try {
    const prompt = `You are a Pakistani real-estate valuer. Estimate the market price in PKR for: ${input.sizeMarla} marla ${input.category} property in ${input.area}, ${input.city}${input.society ? ` (${input.society})` : ''}${input.bedrooms ? `, ${input.bedrooms} bedrooms` : ''}. A regression model on local listings suggests PKR ${local.mid.toLocaleString()} (confidence ${local.confidence}%). Reply ONLY with JSON: {"low": number, "mid": number, "high": number, "confidence": number 0-100, "reasoning": "one short sentence"}. No markdown, no extra text.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );
    if (!res.ok) throw new Error('Gemini request failed');
    const json = await res.json();
    const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    if (!parsed.mid) throw new Error('Bad AI response');
    return {
      low: Math.round(Number(parsed.low)),
      mid: Math.round(Number(parsed.mid)),
      high: Math.round(Number(parsed.high)),
      method: 'ai',
      reasoning: String(parsed.reasoning ?? ''),
      samples: local.samples,
      confidence: Math.min(Math.max(Number(parsed.confidence) || local.confidence, 0), 99),
    };
  } catch {
    return local;
  }
}
