import { describe, it, expect } from 'vitest';
import { rectToPct, mapStatus, mappingProgress, isUnlinked, buildTranscript, type MapRegion } from '@/lib/manzil/master-plan-rules';
import type { Plot } from '@/lib/manzil/types';

const plot = (id: string, plot_no: string, status: Plot['status']): Plot => ({ id, society_id: 's', block: 'A', plot_no, size_marla: 5, category: 'residential', base_price: 5000000, status, lot_id: null, showing_client: null, created_at: '' } as Plot);
const region = (id: string, plot_id: string | null): MapRegion => ({ id, society_id: 's', plot_id, plot_label: null, page: 1, x_pct: 0, y_pct: 0, w_pct: 5, h_pct: 5 });

describe('master plan map', () => {
  it('stores geometry as page percentages regardless of drag direction', () => {
    expect(rectToPct(300, 200, 100, 100, 1000, 500)).toEqual({ x_pct: 10, y_pct: 20, w_pct: 20, h_pct: 20 });
  });
  it('colours: available green, reserved amber, sold red, blocked gray', () => {
    expect([mapStatus('available'), mapStatus('reserved'), mapStatus('sold'), mapStatus('blocked')]).toEqual(['available', 'reserved', 'sold', 'blocked']);
  });
  it('progress counts distinct mapped plots, e.g. 2/3', () => {
    const plots = [plot('1', '101', 'available'), plot('2', '102', 'sold'), plot('3', '103', 'reserved')];
    expect(mappingProgress([region('a', '1'), region('b', '1'), region('c', '2')], plots)).toEqual({ mapped: 2, total: 3 });
  });
  it('region of a deleted plot is flagged unlinked, not dropped', () => {
    expect(isUnlinked(region('a', 'gone'), [plot('1', '101', 'available')])).toBe(true);
  });
  it('transcript lists all 3 mapped plots with summary', () => {
    const plots = [plot('1', '101', 'available'), plot('2', '102', 'sold'), plot('3', '103', 'reserved')];
    const t = buildTranscript('DHA', [region('a', '1'), region('b', '2'), region('c', '3')], plots);
    expect(t).toContain('3 plots mapped — 1 available, 1 reserved, 1 sold');
    expect(t.split('\n').filter((l) => /^10[123]\t/.test(l))).toHaveLength(3);
  });
});
