# Phase 8 — Security hardening

## End-of-phase report

### Files added
- `src/lib/manzil/security.ts` — in-memory rate limit + OWASP-oriented checklist

### Files modified
- `src/lib/manzil/otp.functions.ts` — OTP send rate limit
- `src/lib/manzil/payment-gateway.functions.ts` — charge rate limit
- CSRF already present in `src/start.ts` (unchanged)

### SQL to run
Optional `rate_limit_buckets` (service_role); primary limit is process-local

### Env vars
Existing secrets only; never expose service role to Vite

### Manual verify
1. Spam OTP → error after 8/min
2. Spam charge → friendly rate limit message
3. Review `SECURITY_CHECKLIST` in deploy docs

### Needs UI decision / credentials
- Formal OWASP ZAP report, SUS study — out of scope for code PR

### Rollback
Remove rate-limit checks via revert; CSRF stays.
