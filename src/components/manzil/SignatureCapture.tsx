import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PartySignature } from '@/lib/manzil/legal-signature';

function Pad({ role, onChange }: { role: string; onChange: (s: PartySignature | null) => void }) {
  const [mode, setMode] = useState<'typed' | 'drawn'>('typed');
  const [name, setName] = useState('');
  const [drawn, setDrawn] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    if (!name.trim() || (mode === 'drawn' && !drawn)) return onChange(null);
    onChange({ role, mode, name: name.trim(), dataUrl: mode === 'drawn' ? ref.current?.toDataURL('image/png') : undefined, signedAt: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, mode, drawn]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) * e.currentTarget.width) / r.width, ((e.clientY - r.top) * e.currentTarget.height) / r.height] as const;
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget.getContext('2d'); if (!c) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true; const [x, y] = pos(e);
    c.lineWidth = 2.4; c.lineCap = 'round'; c.strokeStyle = '#111'; c.beginPath(); c.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return; const c = e.currentTarget.getContext('2d'); if (!c) return;
    const [x, y] = pos(e); c.lineTo(x, y); c.stroke();
  };
  const up = () => { if (drawing.current) { drawing.current = false; setDrawn(false); setTimeout(() => setDrawn(true)); } };
  const clear = () => { const c = ref.current; c?.getContext('2d')?.clearRect(0, 0, c.width, c.height); setDrawn(false); };

  return (
    <div style={{ flex: 1, minWidth: 240 }}>
      <label>{role} — full name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type full name" />
      </label>
      <div className="link-row" style={{ margin: '6px 0' }}>
        <Button size="sm" variant={mode === 'typed' ? 'default' : 'secondary'} onClick={() => setMode('typed')}>Type</Button>
        <Button size="sm" variant={mode === 'drawn' ? 'default' : 'secondary'} onClick={() => setMode('drawn')}>Draw</Button>
        {mode === 'drawn' && <Button size="sm" variant="secondary" onClick={clear}>Clear</Button>}
      </div>
      {mode === 'drawn' ? (
        <canvas ref={ref} width={480} height={140} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
          style={{ width: '100%', height: 110, background: '#fff', border: '1px dashed var(--border)', borderRadius: 8, touchAction: 'none' }} />
      ) : (
        <p className="muted small" style={{ margin: 0 }}>Typed name is embedded as the e-signature.</p>
      )}
    </div>
  );
}

/** Buyer + seller signature capture; returns signatures only when both are complete. */
export function SignatureCapture({ parties, onChange }: { parties: [string, string]; onChange: (s: PartySignature[]) => void }) {
  const [a, setA] = useState<PartySignature | null>(null);
  const [b, setB] = useState<PartySignature | null>(null);
  useEffect(() => { onChange(a && b ? [a, b] : []); }, [a, b, onChange]);
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '10px 0' }}>
      <Pad role={parties[0]} onChange={setA} />
      <Pad role={parties[1]} onChange={setB} />
    </div>
  );
}
