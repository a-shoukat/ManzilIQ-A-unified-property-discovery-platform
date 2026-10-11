import { describe, it, expect } from 'vitest';
import { ROLE_OVERVIEW } from '@/lib/manzil/role-overview';
import { canAccessPage } from '@/lib/manzil/access';

describe('role dashboards', () => {
  for (const role of ['buyer', 'dealer', 'society_admin'] as const) {
    it(`${role} dashboard only links to pages ${role} can open`, () => {
      const pages = [...ROLE_OVERVIEW[role].areas.map(([p]) => p), ...ROLE_OVERVIEW[role].stats.map((s) => s.page)];
      for (const p of pages) expect(canAccessPage(p, role), p).toBe(true);
    });
  }
});
