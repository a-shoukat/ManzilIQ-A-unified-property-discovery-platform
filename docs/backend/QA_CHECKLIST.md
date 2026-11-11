# Manual QA checklist (UI unchanged)

- [ ] Marketplace `/` loads; cards/layout identical
- [ ] Login / signup OTP demo path still works without messaging secrets
- [ ] Property detail inquiry send still shows same form; toast on success
- [ ] Mock wallet checkout markup/DEMO badge unchanged; OTP 123456 still works without merchant env
- [ ] Inbox still lists in-app notifications
- [ ] Map view layout identical; Punjab iframe still present
- [ ] Price estimator form unchanged; local estimate when no AI URL
- [ ] Society/dealer/admin hubs navigate as before
- [ ] After owner SQL: payments update policy allows buyer pending write
- [ ] After owner SQL: subscription upsert on `user_id` works for admin grant
