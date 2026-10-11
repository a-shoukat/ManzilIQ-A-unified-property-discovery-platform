import { describe, it, expect } from 'vitest';
import { ROLE_OVERVIEW } from '@/lib/manzil/role-overview';
import { canAccessPage } from '@/lib/manzil/access';

describe('role dashboards', () => {
  for (const role of ['buyer', 'dealer', 'society_admin'] as const) {
    it(`${role} dashboard only links to pages ${role} can open`, () => {
      const cfg = ROLE_OVERVIEW[role]!;
      const pages = [...cfg.areas.map(([p]) => p), ...cfg.stats.map((s) => s.page)];
      for (const p of pages) expect(canAccessPage(p, role), p).toBe(true);
    });
  }
});
