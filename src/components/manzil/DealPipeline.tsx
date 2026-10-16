import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PIPELINE_STAGES, stageName } from '@/lib/manzil/deal-pipeline';
import { fetchBookingDealStage, setBookingPipelineStage } from '@/lib/manzil/booking';
import { errorText } from '@/lib/manzil/errors';
import type { Booking } from '@/lib/manzil/types';

/** 6-stage deal tracker for a booking: advances from booking events, manual otherwise. */
export function BookingDealPipeline({ b, editable }: { b: Booking; editable?: boolean }) {
  const [stage, setStage] = useState<number | null>(null);
  const [auto, setAuto] = useState(1);
  useEffect(() => {
    setStage(null);
    fetchBookingDealStage(b).then(setStage);
    fetchBookingDealStage({ ...b, pipeline_stage: null }).then(setAuto);
  }, [b.id, b.status, b.pipeline_stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = async (next: number) => {
    try {
      await setBookingPipelineStage(b.id, next);
      setStage(Math.max(auto, next));
    } catch (err) { toast.error(errorText(err, 'Could not update stage')); }
  };

  if (stage === null) return <p className="muted small">Loading…</p>;
  return (
    <div>
      <div className="pipeline">
        {PIPELINE_STAGES.map((s, i) => (
          <div key={s} className={`pipe-stage${i + 1 <= stage ? ' done' : ''}`} title={s}>{i + 1}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
        <span className="muted small">Stage {stage}/6: {stageName(stage)}</span>
        {editable && (
          <>
            <Button variant="legacy" className="btn secondary small" disabled={stage <= auto} onClick={() => move(stage - 1)}>←</Button>
            <Button variant="legacy" className="btn secondary small" disabled={stage >= 6} onClick={() => move(stage + 1)}>→</Button>
          </>
        )}
      </div>
    </div>
  );
}
