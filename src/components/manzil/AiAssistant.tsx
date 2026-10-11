import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { askAssistant, QUICK_PROMPTS, type ChatMessage } from '@/lib/manzil/ai';

interface UiMsg extends ChatMessage {
  id: number;
  action?: { label: string; page: string };
}

/** Module 13 — AI Assistance: floating chat assistant on every page */
export default function AiAssistant({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<UiMsg[]>([
    {
      id: 0,
      role: 'assistant',
      text: 'Assalam-o-Alaikum! 👋 Main ManzilIQ AI Assistant hoon. Plot prices, bookings, installments — kuch bhi poochein.',
    },
  ]);
  const idRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

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
      setMsgs((p) => [...p, { id: idRef.current++, role: 'assistant', text: reply.text, ...(reply.action ? {action:reply.action} : {}) }]);
    } catch {
      setMsgs((p) => [...p, { id: idRef.current++, role: 'assistant', text: 'Kuch ghalat ho gaya — dobara try karein.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="legacy" className="ai-fab" onClick={() => setOpen(!open)} aria-label="AI Assistant">
        {open ? <X size={22}/> : <Sparkles size={22}/>}
      </Button>
      {open && (
        <div className="ai-panel">
          <div className="ai-header">
            <strong>🤖 ManzilIQ AI Assistant</strong>
            <Button variant="legacy" className="link inline" onClick={() => setOpen(false)}>Close</Button>
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
            {QUICK_PROMPTS.map((p) => (
              <Button variant="legacy" key={p} className="ai-chip" onClick={() => send(p)}>{p}</Button>
            ))}
          </div>
          <form
            className="ai-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Apna sawal likhein…" />
            <Button variant="legacy" className="btn small" type="submit" disabled={loading}>Send</Button>
          </form>
        </div>
      )}
    </>
  );
}
