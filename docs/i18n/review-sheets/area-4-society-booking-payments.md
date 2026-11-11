# Area 4 review sheet — society + booking + payments + /payment-history

**Status:** hubs + payment-history (phase10 copy) + my-payments chrome complete  
**Namespaces:** `society`, `booking`, `payments`

## Route mapping

| Screen | Route |
| --- | --- |
| Installment schedule | `/my-payments` |
| Gateway history + PDF | `/payment-history` |
| Book plot | `/book-plot` |
| My bookings | `/my-bookings` |
| Society hub | `/society` |

## Top visible strings (sample 40)

| Key | English | Urdu |
| --- | --- | --- |
| payments:title | Payments | ادائیگیاں |
| payments:historyBuyerTitle | Payment history & receipts | ادائیگی کی تاریخ اور رسیدیں |
| payments:installment | Installment | قسط |
| payments:overdue | Overdue | واجب الادا |
| payments:lateFee | Late fee | تاخیری جرمانہ |
| payments:balance | Balance | بقایا رقم |
| payments:receipt | Receipt | رسید |
| payments:pay | Pay | ادا کریں |
| payments:confirmPayment | Confirm payment | ادائیگی کی تصدیق کریں |
| payments:paymentSuccessful | Payment successful | ادائیگی کامیاب |
| payments:jazzCash | JazzCash | JazzCash |
| payments:easyPaisa | EasyPaisa | EasyPaisa |
| payments:dueCalendar | Due calendar & history | واجب الادا کیلنڈر اور تاریخ |
| payments:downloadPdf | Download PDF receipt | PDF رسید ڈاؤن لوڈ کریں |
| payments:verifyReceipt | Verify receipt | رسید کی تصدیق کریں |
| booking:title | Book a plot | پلاٹ بک کریں |
| booking:myBookings | My bookings | میری بکنگز |
| booking:tokenAmount | Token amount | ٹوکن رقم |
| booking:bayanaAmount | Bayana (down payment) | بیعانہ (ڈاون پیمنٹ) |
| booking:submitBooking | Submit booking | بکنگ جمع کروائیں |
| society:hubTitle | Society portal | سوسائٹی پورٹل |
| society:inventoryTitle | Plot inventory | پلاٹ انوینٹری |
| society:dealersTitle | Dealer Management | ڈیلر انتظام |
| society:financialsTitle | Financials | مالیات |
| society:addPlot | Add plot | پلاٹ شامل کریں |
| society:approveDealer | Approve dealer | ڈیلر منظور کریں |
| common:dashboard | Dashboard | ڈیش بورڈ |
| common:booking | Booking | بکنگ |
| common:plot | Plot | پلاٹ |
| common:society | Society | سوسائٹی |
| common:cancel | Cancel | منسوخ کریں |
| common:loading | Loading… | لوڈ ہو رہا ہے… |
| payments:bankTransfer | Bank transfer (proof upload) | بینک منتقلی (ثبوت اپ لوڈ) |
| payments:awaitingConfirmation | awaiting confirmation | تصدیق کا انتظار |
| payments:paymentReceipt | Payment Receipt | ادائیگی کی رسید |
| payments:printPdf | Print / PDF | پرنٹ / PDF |
| payments:noSchedule | No payment schedule yet… | ابھی کوئی ادائیگی شیڈول نہیں… |
| payments:societyConfirms | The society confirms… | وصولی پر سوسائٹی… |
| payments:emptyHistory | No payment transactions yet. | ابھی کوئی ادائیگی لین دین نہیں۔ |
| payments:verifiedOk | Receipt verified — hash matches. | رسید تصدیق شدہ — ہیش مماثل ہے۔ |

## Files

- `src/routes/my-payments.tsx`, `payment-history.tsx`, `book-plot.tsx`, `society.tsx`, …
- `src/locales/en|ur/{payments,society,booking}.json`
- `src/lib/manzil/phase10-copy/payments.ts`

## NEEDS NATIVE REVIEW

- Society inventory / financials nested tables still have residual English chrome
- `book-plot` payment-method label row may need a second pass

## Needs decision

- None for English pixel parity on touched screens.
