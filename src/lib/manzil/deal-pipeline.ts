import { PIPELINE_STAGES } from './types';
import type { BookingStatus } from './types';

export { PIPELINE_STAGES };

/** Hot/Warm/Cold lead labels (separate from the lead's lifecycle status). */
export type LeadLabel = 'hot' | 'warm' | 'cold';
export const LEAD_LABELS: LeadLabel[] = ['hot', 'warm', 'cold'];

/** Old leads stored hot/warm/cold in `status`; use that until a label is set. */
export function leadLabelOf(lead: { label?: string | null; status?: string | null }): LeadLabel | null {
  const v = (lead.label ?? lead.status ?? '') as LeadLabel;
  return LEAD_LABELS.includes(v) ? v : null;
}

export function filterByLabel<T extends { label?: string | null; status?: string | null }>(leads: T[], label: LeadLabel | 'all'): T[] {
  return label === 'all' ? leads : leads.filter((l) => leadLabelOf(l) === label);
}

export interface BookingSignals {
  status: BookingStatus;
  docTypes: string[];
  /** true when every scheduled payment is paid (false when no schedule exists) */
  allPaid: boolean;
  manualStage?: number | null;
}

/**
 * Stage reached automatically from booking events:
 * 1 booking exists · 3 token paid · 4 sale agreement generated ·
 * 5 every payment paid · 6 transfer approved (booking completed).
 * Stage 2 (site visit) has no booking event, so it is manual only.
 */
export function autoStage(s: Omit<BookingSignals, 'manualStage'>): number {
  if (s.status === 'completed') return 6;
  let stage = 1;
  if (s.status === 'token_paid') stage = 3;
  if (s.docTypes.includes('sale_agreement') && stage >= 3) stage = 4;
  if (s.allPaid && stage >= 3) stage = 5;
  if (s.docTypes.includes('transfer_deed')) stage = 6;
  return stage;
}

/** Final stage = the higher of the automatic stage and any manual override. */
export function dealStage(s: BookingSignals): number {
  const manual = Math.min(6, Math.max(0, s.manualStage ?? 0));
  return Math.max(autoStage(s), manual);
}

export function stageName(stage: number): string {
  return PIPELINE_STAGES[Math.min(6, Math.max(1, stage)) - 1] ?? '';
}
