# Area 3 review sheet — dealer module (lots, leads, forms, settings)

**Status:** complete for sale-form chrome + hub keys; lots/leads hubs already keyed  
**Namespace:** `dealer`  
**Printed form body:** always Urdu (unchanged)

## Route mapping

| Screen | Route |
| --- | --- |
| Forms list | `/dealer-forms` |
| New form | `/dealer-forms/new` |
| Form detail | `/dealer-forms/$id` |
| Form settings | `/dealer-form-settings` |
| Public share | `/f/$token` |

## Top 40 visible strings

| Key | English | Urdu |
| --- | --- | --- |
| dealer:hubTitle | Dealer portal | ڈیلر پورٹل |
| dealer:lotsTitle | My Lots & Plots | میرے لاٹس اور پلاٹس |
| dealer:leadsTitle | Leads & Pipeline | لیڈز اور پائپ لائن |
| dealer:saleFormsTitle | Sale forms | بیع فارمز |
| dealer:saleFormsSettingsTitle | Sale form settings | بیع فارم کی ترتیبات |
| dealer:saleFormsNew | New form | نیا فارم |
| dealer:saleFormsHeaderSettings | Header settings | ہیڈر ترتیبات |
| dealer:saleFormsSearch | Search buyer or serial | خریدار یا سیریل تلاش کریں |
| dealer:saleFormsStatusDraft | Draft | مسودہ |
| dealer:saleFormsStatusIssued | Issued | جاری شدہ |
| dealer:saleFormsStatusCancelled | Cancelled | منسوخ |
| dealer:saleFormsOpen | Open | کھولیں |
| dealer:saleFormsDuplicate | Duplicate | نقل بنائیں |
| dealer:saleFormsCancel | Cancel form | فارم منسوخ کریں |
| dealer:saleFormsIssue | Issue form | فارم جاری کریں |
| dealer:saleFormsSave | Save | محفوظ کریں |
| dealer:saleFormsReset | Reset to default | ڈیفالٹ پر واپس |
| dealer:saleFormsUploadLogo | Upload logo | لوگو اپ لوڈ کریں |
| dealer:saleFormsRemoveLogo | Remove logo | لوگو ہٹائیں |
| dealer:saleFormsDownloadPdf | Download PDF | PDF ڈاؤن لوڈ کریں |
| dealer:saleFormsDownloadPng | Download PNG | PNG ڈاؤن لوڈ کریں |
| dealer:saleFormsPrintA5 | Print A5 | A5 پرنٹ |
| dealer:saleFormsPrintA4 | Print A4 | A4 پرنٹ |
| dealer:saleFormsShare | Share | شیئر |
| dealer:saleFormsCopyLink | Copy link | لنک کاپی کریں |
| dealer:saleFormsWhatsapp | WhatsApp | WhatsApp |
| dealer:saleFormsGenerateForm | Generate Form | فارم تیار کریں |
| dealer:saleFormsNewTitle | New sale / booking form | نیا بیع / بکنگ فارم |
| dealer:saleFormsEmpty | No sale forms yet. | ابھی کوئی بیع فارم نہیں۔ |
| dealer:saleFormsPortal | Dealer portal | ڈیلر پورٹل |
| dealer:saleFormsLiveHeaderPreview | Live header preview | لائیو ہیڈر پیش نظارہ |
| dealer:saleFormsShowManagerSig | Show manager signature line | مینجر دستخط کی لائن دکھائیں |
| dealer:saleFormsPublicReadOnly | Public sale receipt · read-only | عوامی بیع رسید · صرف مطالعہ |
| dealer:saleFormsVerifiedNote | تصدیق شدہ از ڈیلر — Verified by dealer | (same bilingual) |
| dealer:addLead | Add lead | لیڈ شامل کریں |
| dealer:pipeline | Deal pipeline | ڈیل پائپ لائن |
| dealer:markShowing | Mark showing | دکھانا نشان زد کریں |
| dealer:bookCustomer | Book for customer | گاہک کے لیے بکنگ |
| dealer:commissionPct | Commission % | کمیشن ٪ |
| dealer:requestJoin | Request to join | شمولیت کی درخواست |

## Files modified

- `src/locales/en|ur/dealer.json`
- `src/lib/manzil/phase11-copy/sale-forms.ts`
- `src/routes/dealer-forms.index.tsx`, `dealer-forms.new.tsx`, `dealer-forms.$id.tsx`, `dealer-form-settings.tsx`
- (existing) `dealer.tsx`, `dealer-lots.tsx`, `dealer-leads.tsx`, `dealer-discover.tsx`, actions/button components

## NEEDS NATIVE REVIEW

- DealerSaleFormEditor chrome still mixed (field labels intentionally Urdu on sheet)
- `dealer-book` / `dealer-commissions` / `dealer-analytics` titles still partially English — follow-up if full hub parity required

## Needs decision

- None for English pixel parity on form chrome (`t()` swaps only).
