import { describe, it, expect } from 'vitest';
import { parseListing } from '@/lib/manzil/voice-parse';

describe('voice form-fill parser', () => {
  it('English', () => {
    const p = parseListing('5 marla house for sale in Lahore, 3 bedrooms 2 baths, price 1 crore 20 lakh, block C, corner, gas');
    expect(p).toMatchObject({ size: 5, unit: 'marla', category: 'residential', purpose: 'sale', city: 'Lahore', bedrooms: 3, bathrooms: 2, price: 12_000_000, block: 'C' });
    expect(p.amenities).toEqual(['Gas', 'Corner plot']);
  });
  it('Roman Urdu', () => {
    const p = parseListing('ek kanal ka ghar kiraye pe Islamabad mein, panch kamre, 2 lakh');
    expect(p).toMatchObject({ size: 1, unit: 'kanal', purpose: 'rent', city: 'Islamabad', bedrooms: 5, price: 200_000 });
  });
  it('Urdu script with Urdu digits', () => {
    const p = parseListing('نارووال میں ۱۰ مرلہ پلاٹ برائے فروخت قیمت ۸۵ لاکھ فون 03001234567');
    expect(p).toMatchObject({ size: 10, unit: 'marla', city: 'Narowal', purpose: 'sale', price: 8_500_000, phone: '03001234567', category: 'residential' });
  });
  it('commercial shop', () => {
    expect(parseListing('dukan for rent karachi').category).toBe('commercial');
  });
});
