# Area 5 review sheet — legal documents + receipts

**Status:** documents UI keyed; PDF receipt respects `profiles.preferred_language`  
**Namespaces:** `legal`, `admin` (doc titles), receipt HTML labels

## Coverage

| Surface | Behavior |
| --- | --- |
| `/documents` | `legal:*` + `translatedDocTitle` |
| Gateway PDF (`generatePaymentReceiptPdf`) | Selects `preferred_language`; builds EN or UR HTML (`lang`/`dir`) |
| In-app receipt modal (`/my-payments`) | `payments:*` keys |
| Phase 11 printed sale form | Always Urdu (by design) |

## Top strings

| Key / label | English | Urdu |
| --- | --- | --- |
| legal:title | Documents | دستاویزات |
| legal:subtitle | Legal locker, generation and signatures | قانونی لاکر، تیاری اور دستخط |
| legal:saleAgreement | Sale agreement | بیع نامہ |
| legal:allotmentLetter | Allotment letter | الاٹمنٹ خط |
| legal:transferDeed | Transfer deed | منتقلی نامہ |
| legal:noc | NOC | این او سی |
| legal:cancellation | Cancellation | منسوخی |
| legal:downloadPdf | Download PDF | PDF ڈاؤن لوڈ کریں |
| legal:sign | Sign | دستخط |
| legal:generate | Generate document | دستاویز تیار کریں |
| admin:docAllotment | Allotment Letter | الاٹمنٹ خط |
| admin:docSaleAgreement | Sale & Purchase Agreement | بیع و شراء نامہ |
| admin:docNoc | NOC Issuance Letter | این او سی اجراء خط |
| receipt title | ManzilIQ payment receipt | ManzilIQ ادائیگی کی رسید |
| receipt buyer | Buyer | خریدار |
| receipt lateFee | Late fee | تاخیری جرمانہ |
| receipt installment | Installment | قسط |
| receipt society | Society | سوسائٹی |
| receipt plot | Plot | پلاٹ |
| receipt date | Date | تاریخ |

## Files

- `src/routes/documents.tsx`
- `src/lib/i18n/docTitles.ts`
- `src/lib/manzil/payment-receipt.ts`
- `src/lib/manzil/payment-receipt.functions.ts`
- `src/locales/en|ur/legal.json`

## NEEDS NATIVE REVIEW

- Long legal template body paragraphs (server-generated) — glossary applied to titles; full bilingual templates still need native counsel review

## Needs decision

- Whether English receipt should omit the Urdu subtitle line entirely (currently bilingual footer line remains for brand continuity).
