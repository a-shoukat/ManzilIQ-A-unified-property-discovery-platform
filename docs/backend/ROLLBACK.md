# Rollback notes per phase

| Phase | App rollback | Data rollback |
| --- | --- | --- |
| 0 | Revert health/features commits | Leave new tables/columns (additive). Do not DROP. |
| 1 | Unset Resend/Twilio/FCM env | Delivery log rows harmless |
| 2 | Unset `REMINDER_CRON_SECRET` / stop cron | `reminder_runs` historical |
| 3 | Unset JazzCash/EasyPaisa env → mock | Gateway columns unused |
| 4 | Revert `sendInquiry` wiring | `inquiries` unused |
| 5 | Stop calling audit helpers | `audit_logs` / moderation cols unused |
| 6 | Unset AI URL | `price_predictions` unused |
| 7 | Unset Maps key | lat/lng unused |
| 8 | Revert rate-limit patches | n/a |
| 9 | Disable CI workflow | n/a |
| 10 / 10.5 | Revert Phase 10 routes/CMS/receipt wiring | Leave additive tables/columns |
| 11 | Delete dealer-forms routes/nav/CTA/access; leave tables | Never DROP `dealer_form_settings` / `dealer_sale_forms` / `dealer-logos` |

Feature flags: missing env always prefers mock/demo paths.

Phase 11 detail: `docs/backend/PHASE_11_DEALER_SALE_FORMS.md`.
