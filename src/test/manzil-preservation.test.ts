import { describe, expect, it, vi } from 'vitest';
import { estimateLocal } from '@/lib/manzil/estimator';
import { fetchProperties } from '@/lib/manzil/properties';
import { getSupabase } from '@/lib/manzil/supabase';
vi.mock('@/lib/manzil/supabase', () => ({ getSupabase: vi.fn(() => null) }));
describe('Imported data preservation', () => {
 it('only reads existing properties and never writes or seeds on page load', async () => {
  const order = vi.fn().mockResolvedValue({ data: [{ id:'original-record' }], error:null });
  const select = vi.fn(() => ({ order }));
  const insert = vi.fn(); const update = vi.fn(); const remove = vi.fn();
  const from = vi.fn(() => ({ select, insert, update, delete:remove }));
  vi.mocked(getSupabase).mockReturnValueOnce({ from } as unknown as NonNullable<ReturnType<typeof getSupabase>>);
  const result = await fetchProperties();
  expect(from).toHaveBeenCalledWith('properties');
  expect(result.list[0]?.id).toBe('original-record');
  expect(result.demo).toBe(false);
  expect(insert).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
 });
 it('retains the original residential baseline calculation', async () => {
  const result = await estimateLocal({city:'Narowal',area:'',sizeMarla:5,category:'residential',bedrooms:null,society:''});
  expect(result.mid).toBe(4750000); expect(result.low).toBe(3800000); expect(result.high).toBe(5700000);
 });
});
