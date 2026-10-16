import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { askAssistant, GREETINGS, QUICK_PROMPTS_BY_LANG, type AssistantLang, type ChatMessage } from '@/lib/manzil/ai';

interface UiMsg extends ChatMessage {
  id: number;
  action?: { label: string; page: string };
}

const LANG_KEY = 'manziliq-ai-lang';

/** Module 13 — AI Assistance: floating chat assistant on every page. English by default (matches app); user can switch to Roman Urdu. */
export default function AiAssistant({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<AssistantLang>('en');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<UiMsg[]>([{ id: 0, role: 'assistant', text: GREETINGS.en }]);
  const idRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'ur') switchLang('ur');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  function switchLang(next: AssistantLang) {
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
    // Replace the greeting if the user hasn't chatted yet; otherwise append a short note.
    setMsgs((p) => (p.length === 1 ? [{ id: 0, role: 'assistant', text: GREETINGS[next] }] : [...p, { id: idRef.current++, role: 'assistant', text: GREETINGS[next] }]));
  }

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    setInput('');
    const userMsg: UiMsg = { id: idRef.current++, role: 'user', text: t };
    setMsgs((p) => [...p, userMsg]);
    setLoading(true);
    try {
      const history: ChatMessage[] = [...msgs, userMsg].map(({ role, text }) => ({ role, text }));
      const reply = await askAssistant(history, t);
      setMsgs((p) => [...p, { id: idRef.current++, role: 'assistant', text: reply.text, ...(reply.action ? { action: reply.action } : {}) }]);
    } catch {
      setMsgs((p) => [...p, { id: idRef.current++, role: 'assistant', text: lang === 'ur' ? 'Kuch ghalat ho gaya — dobara koshish karein.' : 'Something went wrong — please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="legacy" className="ai-fab" onClick={() => setOpen(!open)} aria-label="AI Assistant">
        {open ? <X size={18}/> : <span className="ai-fab-m">M</span>}
        {!open && <span className="ai-fab-live"><i />Live</span>}
      </Button>
      {open && (
        <div className="ai-panel">
          <div className="ai-header">
            <strong>ManzilIQ AI Assistant</strong>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Button size="sm" variant={lang === 'en' ? 'default' : 'ghost'} onClick={() => lang !== 'en' && switchLang('en')} aria-pressed={lang === 'en'}>EN</Button>
              <Button size="sm" variant={lang === 'ur' ? 'default' : 'ghost'} onClick={() => lang !== 'ur' && switchLang('ur')} aria-pressed={lang === 'ur'}>اردو</Button>
              <Button variant="legacy" className="link inline" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
          <div className="ai-messages">
            {msgs.map((m) => (
              <div key={m.id} className={`ai-msg ${m.role}`}>
                <div style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
                {m.action && (
                  <Button variant="legacy" className="btn secondary small" style={{ marginTop: 8 }} onClick={() => { setOpen(false); onNavigate(m.action!.page); }}>
                    {m.action.label} →
                  </Button>
                )}
              </div>
            ))}
            {loading && <div className="ai-msg assistant">…</div>}
            <div ref={endRef} />
          </div>
          <div className="ai-prompts">
            {QUICK_PROMPTS_BY_LANG[lang].map((p) => (
              <Button variant="legacy" key={p} className="ai-chip" onClick={() => send(p)}>{p}</Button>
            ))}
          </div>
          <form className="ai-input" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={lang === 'ur' ? 'Apna sawal likhein…' : 'Type your question…'} />
            <Button variant="legacy" className="btn small" type="submit" disabled={loading}>{lang === 'ur' ? 'Bhejein' : 'Send'}</Button>
          </form>
        </div>
      )}
    </>
  );
}
