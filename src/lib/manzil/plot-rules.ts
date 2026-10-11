import type { Plot } from './types';
/** Plots a society may assign to a dealer lot: available and not tied to a live booking. */
export function assignablePlots(plots: Plot[], bookedIds: Set<string>): Plot[] {
  return plots.filter((p) => p.status === 'available' && !p.lot_id && !bookedIds.has(p.id));
}
