# Phase 6 — AI pricing infra

## End-of-phase report

### Files added
- `src/lib/manzil/ai-pricing.functions.ts` — `remoteEstimate`, `logPricePrediction`

### Files modified
- `src/lib/manzil/estimator.ts` — `isAiConfigured` / `estimatePrice` prefer remote then local; log predictions

### SQL to run
`price_predictions` table

### Env vars
- `VITE_AI_ESTIMATE_URL` or `AI_ESTIMATE_URL`
- optional `AI_ESTIMATE_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` to persist prediction logs from server

### Manual verify
1. No AI URL → local estimator unchanged
2. With URL returning `{low,mid,high}` → method `ai`
3. Predictions logged when service role present

### Needs credentials / research
- Narowal dataset + Flask/XGBoost training pipeline not shipped (infra hook only)

### Rollback
Unset AI URL → local only.
