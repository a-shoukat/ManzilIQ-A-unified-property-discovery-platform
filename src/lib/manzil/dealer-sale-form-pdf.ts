/**
 * Printable HTML PDF for dealer sale forms — same approach as Phase 10.5
 * generatePaymentReceiptPdf (Noto Nastaliq Urdu + Source Sans 3, browser Save as PDF).
 */
import type { DealerFormSettings, DealerSaleForm } from "./dealer-sale-forms";
import { formatRupeeUr } from "./dealer-sale-form-math";
import { isFormManuallyEdited } from "./dealer-sale-forms";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ltr(s: string): string {
  return `<span dir="ltr" style="unicode-bidi:isolate;display:inline-block">${esc(s)}</span>`;
}

export function buildDealerSaleFormPdfHtml(
  form: DealerSaleForm,
  settings: DealerFormSettings,
): string {
  const edited = isFormManuallyEdited(form);
  const cancelled = form.status === "cancelled";
  const serial = form.serial_no != null ? String(form.serial_no) : "—";
  return `<!doctype html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>Sale form ${esc(serial)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    body { font-family: "Noto Nastaliq Urdu", "Source Sans 3", serif; line-height: 2.1; margin: 0; padding: 16px; color:#111; }
    .sheet { max-width: 148mm; margin: 0 auto; border: 1px solid #ccc; position: relative; overflow: hidden; }
    .header { background: ${esc(settings.header_bg_color)}; color:#fff; padding:12px; text-align:center; border-bottom:4px solid ${esc(settings.header_accent_color)}; }
    .biz { font-size: 22px; font-weight: 700; }
    .body { padding: 10px 12px 16px; }
    .row { display:grid; grid-template-columns:1fr 1fr; gap:8px; border-bottom:1px solid #bbb; padding:4px 0; }
    .label { font-weight:700; margin-inline-end:6px; }
    .signs { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:28px; text-align:center; }
    .sign-line { border-top:1px solid #333; margin-top:40px; padding-top:4px; }
    ${cancelled ? `.sheet::after{content:'منسوخ';position:absolute;inset:30% 10%;font-size:64px;font-weight:700;color:rgba(180,0,0,.28);display:flex;align-items:center;justify-content:center;transform:rotate(-24deg);pointer-events:none;}` : ""}
    @media print { @page { size: A5; margin: 8mm; } body { padding:0; } .sheet { border:none; } .noprint{display:none} }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="biz">${esc(settings.business_name_ur || "—")}</div>
      ${settings.business_name_en ? `<div style="font-family:Source Sans 3,sans-serif;direction:ltr;unicode-bidi:isolate;font-size:12px">${esc(settings.business_name_en)}</div>` : ""}
      ${settings.address_ur ? `<div style="font-size:12px;margin-top:6px">${esc(settings.address_ur)}</div>` : ""}
    </div>
    <div class="body">
      <div class="row"><div><span class="label">نمبر شمار</span>${ltr(serial)}</div><div><span class="label">تاریخ</span>${ltr(form.form_date)}</div></div>
      <div class="row"><div><span class="label">نام خریدار</span>${esc(form.buyer_name)}</div><div><span class="label">ولدیت/زوجہ</span>${esc(form.buyer_guardian_name)}</div></div>
      <div class="row"><div><span class="label">شناختی کارڈ</span>${ltr(form.buyer_cnic)}</div><div><span class="label">رابطہ نمبر</span>${ltr(form.buyer_phone)}</div></div>
      <div class="row" style="grid-template-columns:1fr"><div><span class="label">ایڈریس</span>${esc(form.buyer_address)}</div></div>
      <div class="row"><div><span class="label">نام فروخت کنندہ</span>${esc(form.seller_name)}</div><div><span class="label">ولدیت/زوجہ</span>${esc(form.seller_guardian_name)}</div></div>
      <div class="row"><div><span class="label">سائز</span>${esc(form.plot_size_text)}</div><div><span class="label">ریٹ فی مرلہ</span>${ltr(formatRupeeUr(Number(form.rate_per_marla)))}</div></div>
      <div class="row"><div><span class="label">کل قیمت</span>${ltr(formatRupeeUr(Number(form.total_price)))}</div><div><span class="label">فائل فیس + کمیشن</span>${ltr(formatRupeeUr(Number(form.file_fee_commission)))}</div></div>
      <div class="row"><div><span class="label">ٹوکن وصول</span>${ltr(formatRupeeUr(Number(form.token_received)))}</div><div><span class="label">سابقہ رقم</span>${ltr(formatRupeeUr(Number(form.previous_amount)))}</div></div>
      <div class="row"><div><span class="label">کل رقم وصول</span>${ltr(formatRupeeUr(Number(form.total_received)))}${edited ? " (ترمیم شدہ)" : ""}</div><div><span class="label">بقایا رقم</span>${ltr(formatRupeeUr(Number(form.balance_amount)))}${edited ? " (ترمیم شدہ)" : ""}</div></div>
      <div class="row"><div><span class="label">بقایا رقم مورخہ</span>${ltr(form.balance_due_date ?? "—")}</div><div><span class="label">بیعانہ مورخہ</span>${ltr(form.bayana_date ?? "—")}</div></div>
      <div class="signs">
        <div><div class="sign-line">دستخط فروخت کنندہ</div></div>
        ${settings.show_manager_signature ? `<div><div class="sign-line">دستخط مینجر</div></div>` : ""}
      </div>
      ${form.status === "issued" ? `<p style="text-align:center;font-weight:700;color:#1a4d2e">✓ تصدیق شدہ از ڈیلر</p>` : ""}
      <p class="noprint" style="text-align:center;color:#666;font-size:12px">Print → Save as PDF</p>
    </div>
  </div>
</body>
</html>`;
}

export function downloadDealerSaleFormPdfHtml(
  form: DealerSaleForm,
  settings: DealerFormSettings,
): void {
  const html = buildDealerSaleFormPdfHtml(form, settings);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sale-form-${form.serial_no ?? form.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
