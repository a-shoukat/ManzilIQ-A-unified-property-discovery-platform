# Phase 3 — Payment gateways

## End-of-phase report

### Files added
- `src/lib/manzil/payment-gateway.functions.ts` — `chargeWallet` (JazzCash/EasyPaisa + mock fallback)

### Files modified
- `src/components/manzil/MockWalletCheckout.tsx` — logic only: calls `chargeWallet` (markup/copy unchanged)

### SQL to run
`payments.gateway`, `gateway_txn_id`, `gateway_payload` columns (in consolidated migration)

### Env vars
- JazzCash: `JAZZCASH_MERCHANT_ID`, `JAZZCASH_PASSWORD`, `JAZZCASH_INTEGRITY_SALT`, optional `JAZZCASH_API_URL`
- EasyPaisa: `EASYPAISA_STORE_ID`, `EASYPAISA_PASSWORD`, optional `EASYPAISA_API_URL`, `EASYPAISA_MERCHANT_EMAIL`

### Manual verify
1. No merchant env → DEMO OTP `123456` still succeeds; `…0000` declines
2. With sandbox env → live API path (`mode: 'live'`); society still confirms payment
3. Rate limit: >20 charges/min per mobile returns friendly error

### Needs UI decision
- Live checkout still shows DEMO badge/copy (absolute no-copy-change rule). Update badges when going production.

### Rollback
Unset merchant env → mock path. No schema drops.
