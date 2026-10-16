import { describe, expect, it } from 'vitest';
import { attachSignatures, buildLegalPdfHtml, splitSignatures, watermarkText } from '@/lib/manzil/legal-signature';

const sigs = [
  { role: 'Buyer', mode: 'typed' as const, name: 'Ali Khan', signedAt: '2026-10-16T06:00:00Z' },
  { role: 'Seller', mode: 'drawn' as const, name: 'DHA', dataUrl: 'data:image/png;base64,AAA', signedAt: '2026-10-16T06:00:00Z' },
];

describe('legal signatures & watermark', () => {
  it('round-trips signatures without changing template text', () => {
    const body = attachSignatures('ALLOTMENT LETTER', sigs);
    expect(splitSignatures(body)).toEqual({ text: 'ALLOTMENT LETTER', sigs });
  });
  it('watermark contains reference and generation timestamp', () => {
    expect(watermarkText('BK-123', '2026-10-16T06:31:05Z')).toBe('MANZILIQ · BK-123 · 2026-10-16 06:31:05 UTC');
  });
  it('PDF embeds drawn signature and watermark', () => {
    const html = buildLegalPdfHtml({ title: 'Sale Agreement', body: attachSignatures('X', sigs), reference: 'BK-123', generatedAt: '2026-10-16T06:31:05Z', version: 1 });
    expect(html).toContain('data:image/png;base64,AAA');
    expect(html).toContain('BK-123 · 2026-10-16 06:31:05 UTC');
  });
});
