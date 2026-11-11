# Ordered SQL run list

1. `reference/migrations/00_all_migrations.sql` — one-shot idempotent (preferred)
2. `reference/migrations/verify_schema.sql` — validation only

## Equivalent historical order (if applying piecewise)

1. `reference/admin-setup.sql`
2. `reference/phase1-fixes.sql`
3. `reference/phase2-features.sql`
4. `reference/phase3-features.sql`
5. `reference/phase4-features.sql`
6. `reference/phase6-features.sql`
7. `reference/phase7-fixes.sql`
8. `reference/phase8-fixes.sql` (skip terminal SELECT when consolidating)
9. `reference/phase9-master-plan.sql`
10. `reference/phase10-sold-at.sql`
11. Hybrid-safe subscriptions patch (inside `00_all_migrations.sql`, not raw `phase11` alone)
12. `reference/phase12-pipeline.sql`
13. Backend parity section (notifications, reminders, inquiries, AI log, geo, moderation, gateway cols)
14. `reference/migrations/11_dealer_sale_forms.sql` — dealer sale forms / serial allocation
15. `reference/migrations/12_preferred_language.sql` — profiles.preferred_language (en|ur)

**Never run** `reference/source-schema.sql` against an existing live database.
