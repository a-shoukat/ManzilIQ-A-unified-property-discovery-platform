import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseListing, describeParsed, type ParsedListing } from '@/lib/manzil/voice-parse';

type Rec = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
function getRecognizer(): (new () => Rec) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const LANGS = [{ code: 'ur-PK', label: 'اردو' }, { code: 'en-PK', label: 'English' }] as const;

export function VoiceFill({ onApply }: { onApply: (p: ParsedListing) => void }) {
  const [supported, setSupported] = useState(false);
  const [lang, setLang] = useState<string>('ur-PK');
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  useEffect(() => { setSupported(!!getRecognizer()); return () => rec.current?.stop(); }, []);

  const start = () => {
    const R = getRecognizer(); if (!R) return;
    setErr(null);
    const r = new R(); r.lang = lang; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => {
      let fin = '', mid = '';
      for (let i = 0; i < e.results.length; i++) { const res = e.results[i]!; (res.isFinal ? (fin += res[0]!.transcript + ' ') : (mid += res[0]!.transcript)); }
      if (fin) setText((t) => `${t} ${fin}`.trim());
      setInterim(mid);
    };
    r.onerror = (e) => setErr(e.error === 'not-allowed' ? 'Microphone permission was blocked. Allow the microphone in your browser and try again.' : e.error === 'no-speech' ? 'No speech heard — try again closer to the mic.' : `Voice input stopped (${e.error}).`);
    r.onend = () => { setListening(false); setInterim(''); };
    rec.current = r; r.start(); setListening(true);
  };
  const stop = () => rec.current?.stop();
  // Recognisers deliver the whole session each time, so reset text on a new session.
  const toggle = () => { if (listening) stop(); else { setText(''); start(); } };

  const parsed = text.trim() ? parseListing(text) : null;
  const found = parsed ? describeParsed(parsed) : [];

  return (
    <div className="voice-fill">
      <div className="voice-head">
        <div><strong>Fill by voice</strong><div className="muted small">Bolain: “Lahore mein 5 marla ghar, 3 kamre, 1 crore 20 lakh, block C” — or speak in English.</div></div>
        <div className="voice-langs">{LANGS.map((l) => <button type="button" key={l.code} className={lang === l.code ? 'active' : ''} disabled={listening} onClick={() => setLang(l.code)}>{l.label}</button>)}</div>
      </div>
      <div className="voice-row">
        {supported
          ? <Button type="button" variant={listening ? 'destructive' : 'default'} onClick={toggle}>{listening ? <><Square size={15} />Stop</> : <><Mic size={15} />Start speaking</>}</Button>
          : <span className="muted small">Voice input isn’t supported in this browser (use Chrome or Edge). You can type the description below instead.</span>}
        {listening && <span className="voice-live"><i />Listening…</span>}
      </div>
      <textarea rows={2} dir="auto" value={text + (interim ? ` ${interim}` : '')} onChange={(e) => setText(e.target.value)} placeholder="Your words appear here — you can correct them before applying." />
      {err && <div className="error">{err}</div>}
      {parsed && (found.length ? (
        <div className="voice-found">
          <div className="muted small">Understood:</div>
          <ul>{found.map((f) => <li key={f}>{f}</li>)}</ul>
          <Button type="button" size="sm" onClick={() => onApply(parsed)}><Wand2 size={15} />Fill the form</Button>
        </div>
      ) : <p className="muted small">Couldn’t pick out details yet — mention size (marla/kanal), price (lakh/crore), city and rooms.</p>)}
    </div>
  );
}
