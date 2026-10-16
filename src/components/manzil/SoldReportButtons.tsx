import { useState } from 'react';
import { FileDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { Booking } from '@/lib/manzil/types';
import { buildSoldReportHtml, buildSoldTranscript, downloadText, loadSoldReport, type SoldReport } from '@/lib/manzil/sold-report';

/** "Generate sold report" → then Download PDF (print A4) + Download transcript. Completed bookings only. */
export function SoldReportButtons({ b }: { b: Booking }) {
  const [report, setReport] = useState<SoldReport | null>(null);
  const [busy, setBusy] = useState(false);
  if (b.status !== 'completed') return null;
  const gen = async () => {
    setBusy(true);
    try { setReport(await loadSoldReport(b)); } catch { toast.error('Could not generate sold report'); } finally { setBusy(false); }
  };
  const pdf = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([buildSoldReportHtml(report)], { type: 'text/html' }));
    const w = window.open(url, '_blank');
    if (!w) toast.error('Allow pop-ups to save the PDF');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  const txt = () => report && downloadText(buildSoldTranscript(report), `${b.reference_no}-sold-report.txt`);
  return (
    <div className="link-row" style={{ margin: 0 }}>
      {!report ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => void gen()}><FileText size={15} />{busy ? 'Generating…' : 'Generate sold report'}</Button> : (<>
        <Button size="sm" onClick={pdf}><FileDown size={15} />Download PDF</Button>
        <Button size="sm" variant="secondary" onClick={txt}><FileDown size={15} />Download transcript</Button>
      </>)}
    </div>
  );
}
