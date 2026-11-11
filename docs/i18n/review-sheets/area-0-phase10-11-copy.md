# Area 0 review sheet — phase10-copy / phase11-copy → i18n

**Status:** complete  
**Default language:** English (unchanged visually)  
**Namespaces touched:** `payments`, `notifications`, `admin`, `inquiries` (new), `dealer`

## Route name mapping

| Spec / informal name | Actual route |
| --- | --- |
| `/my-payments` (installments UI) | `/my-payments` (unchanged; separate from history) |
| Payment history / “my payments history” | `/payment-history` |
| Dealer sale forms list | `/dealer-forms` |
| Dealer form settings | `/dealer-form-settings` |
| Dealer form detail / new | `/dealer-forms/$id`, `/dealer-forms/new` |
| Public share | `/f/$token` |

## New / extended keys (by namespace)

- **inquiries** (new file): full Screen 1 inquiry UI + status glossary labels
- **payments**: history screen keys (`historyBuyerTitle` … `pdfError`)
- **notifications**: prefs screen keys (`prefsTitle` … `channelPush`)
- **admin**: moderation / CMS / audit / status screen keys
- **dealer**: sale-form chrome keys (`saleForms*`); printed sheet stays hard-coded Urdu

## Top 40 visible strings

| Key | English | Urdu |
| --- | --- | --- |
| inquiries:myTitle | My inquiries | میرے استفسارات |
| inquiries:ownerTitle | Inquiries | استفسارات |
| inquiries:convertToLead | Convert to lead | لیڈ میں تبدیل کریں |
| inquiries:sendReply | Send reply | جواب بھیجیں |
| inquiries:statusNew | new | نیا |
| inquiries:statusContacted | contacted | رابطہ کیا گیا |
| inquiries:statusQualified | qualified | اہل |
| inquiries:statusConverted | converted | تبدیل شدہ |
| inquiries:statusClosed | closed | بند |
| notifications:prefsTitle | Notification preferences | اطلاع کی ترجیحات |
| notifications:channels | Channels | چینلز |
| notifications:savePrefs | Save preferences | ترجیحات محفوظ کریں |
| notifications:saved | Preferences saved | ترجیحات محفوظ ہو گئیں |
| payments:historyBuyerTitle | Payment history & receipts | ادائیگی کی تاریخ اور رسیدیں |
| payments:historySocietyTitle | Society payment history | سوسائٹی ادائیگی کی تاریخ |
| payments:downloadPdf | Download PDF receipt | PDF رسید ڈاؤن لوڈ کریں |
| payments:verifyReceipt | Verify receipt | رسید کی تصدیق کریں |
| payments:installment | Installment | قسط |
| payments:emptyHistory | No payment transactions yet. | ابھی کوئی ادائیگی لین دین نہیں۔ |
| admin:moderationTitle | Listing moderation | اشتہار کی جانچ |
| admin:approve | Approve | منظور کریں |
| admin:reject | Reject | مسترد کریں |
| admin:cmsTitle | Homepage CMS | ہوم پیج CMS |
| admin:saveContent | Save content | مواد محفوظ کریں |
| admin:addBanner | Add banner | بینر شامل کریں |
| admin:auditTitle | Audit log | آڈٹ لاگ |
| admin:exportCsv | Export CSV | CSV ایکسپورٹ |
| admin:statusTitle | System status | سسٹم کی حالت |
| admin:failedTitle | Recent failed notifications | حالیہ ناکام اطلاعات |
| dealer:saleFormsTitle | Sale forms | بیع فارمز |
| dealer:saleFormsSettingsTitle | Sale form settings | بیع فارم کی ترتیبات |
| dealer:saleFormsNew | New form | نیا فارم |
| dealer:saleFormsIssue | Issue form | فارم جاری کریں |
| dealer:saleFormsSearch | Search buyer or serial | خریدار یا سیریل تلاش کریں |
| dealer:saleFormsDownloadPdf | Download PDF | PDF ڈاؤن لوڈ کریں |
| dealer:saleFormsShare | Share | شیئر |
| dealer:saleFormsCancel | Cancel form | فارم منسوخ کریں |
| dealer:saleFormsSave | Save | محفوظ کریں |
| dealer:saleFormsGenerateForm | Generate Form | فارم تیار کریں |
| dealer:saleFormsPublicReadOnly | Public sale receipt · read-only | عوامی بیع رسید · صرف مطالعہ |

## Files modified

- `src/locales/en|ur/{inquiries,payments,notifications,admin,dealer}.json`
- `src/lib/i18n/index.ts` (register `inquiries`)
- `src/lib/manzil/phase10-copy/*` (i18n getters)
- `src/lib/manzil/phase11-copy/sale-forms.ts` (i18n getters)
- `src/test/phase10-ui.test.ts`
- `docs/backend/SQL_RUN_LIST.md` (migration 12)
- `reference/migrations/12_preferred_language.sql`

## NEEDS NATIVE REVIEW

- `payments:skipNote` (dev-facing migration note; may stay English-only in UI)
- `admin:approvalOff` (env-flag explanation)
- `dealer:saleFormsVerifiedNote` (bilingual by design)
- Inquiry statuses `viewing` / `negotiating` (not in fixed glossary; used natural Urdu معائنہ / مذاکرات)

## Needs decision

- None for Area 0 (English getters preserve prior English strings).
