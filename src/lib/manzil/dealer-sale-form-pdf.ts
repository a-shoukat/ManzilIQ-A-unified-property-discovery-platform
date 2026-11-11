/**
 * Printable HTML PDF for dealer sale forms — Phase 10.5 print-to-PDF approach
 * with *embedded* Noto Nastaliq Urdu (no Google Fonts at render/print time).
 * Markup mirrors reference/mockups/Afridi_Estate_Form_Mockup.html.
 */
import type { DealerFormSettings, DealerSaleForm } from "./dealer-sale-forms";
import { formatRupeeUr } from "./dealer-sale-form-math";
import { isFormManuallyEdited } from "./dealer-sale-forms";
import { notoNastaliqEmbedCss } from "./noto-nastaliq-embed";

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

function cell(label: string, valueHtml: string): string {
  return `<div class="cell"><span class="label">${esc(label)}</span><span class="value">${valueHtml}</span></div>`;
}

function row(left: string, right?: string, full = false): string {
  return `<div class="ruled-row${full ? " full" : ""}">${left}${right ?? ""}</div>`;
}

export function buildDealerSaleFormPdfHtml(
  form: DealerSaleForm,
  settings: DealerFormSettings,
  pageSize: "a4" | "a5" = "a5",
): string {
  const edited = isFormManuallyEdited(form);
  const cancelled = form.status === "cancelled";
  const serial = form.serial_no != null ? String(form.serial_no) : "—";
  const page = pageSize === "a4" ? "A4" : "A5";
  const maxW = pageSize === "a4" ? "210mm" : "148mm";
  const showScheme = Boolean(settings.scheme_badge_ur?.trim());
  const showPhase = Boolean(settings.phase_badge_ur?.trim());
  const showBadges = showScheme || showPhase;
  const editedFlag = edited ? `<span class="edited">(ترمیم شدہ)</span>` : "";

  const badges = showBadges
    ? `<div class="badges">${
        showScheme ? `<span class="badge">${esc(settings.scheme_badge_ur)}</span>` : ""
      }${showPhase ? `<span class="badge">${esc(settings.phase_badge_ur)}</span>` : ""}</div>`
    : `<div></div>`;

  const logo = settings.logo_url
    ? `<img src="${esc(settings.logo_url)}" alt=""/>`
    : "";

  return `<!doctype html>
<html lang="ur" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>Sale form ${esc(serial)}</title>
  <style>
    ${notoNastaliqEmbedCss()}
    :root {
      --header-bg: ${esc(settings.header_bg_color)};
      --header-accent: ${esc(settings.header_accent_color)};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: "Noto Nastaliq Urdu", "Source Sans 3", serif;
      line-height: 2.05;
      color: #111;
      background: #fff;
    }
    .sheet {
      max-width: ${maxW};
      margin: 0 auto;
      border: 1px solid #bbb;
      position: relative;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .letterhead {
      background: var(--header-bg);
      color: #fff;
      padding: 10px 12px 12px;
      border-bottom: 5px solid var(--header-accent);
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .letterhead-top {
      display: grid;
      grid-template-columns: 72px 1fr ${showBadges ? "88px" : "0fr"};
      gap: 8px;
      align-items: start;
    }
    .logo-slot {
      width: 64px; height: 64px;
      background: #fff;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    .logo-slot img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .titles { text-align: center; min-width: 0; }
    .biz-ur { font-size: 22px; font-weight: 700; line-height: 1.55; margin: 0; }
    .biz-en {
      font-family: system-ui, sans-serif;
      font-size: 12px; direction: ltr; unicode-bidi: isolate; opacity: .92; margin-top: 2px;
    }
    .tagline { font-size: 12px; opacity: .95; margin-top: 2px; }
    .badges { display: flex; flex-direction: column; gap: 4px; align-items: stretch; }
    .badge {
      background: var(--header-accent);
      color: #111;
      font-size: 11px; font-weight: 700;
      padding: 2px 8px; border-radius: 3px; text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .scheme-bar { margin-top: 8px; font-size: 13px; opacity: .98; }
    .address-pill {
      margin-top: 8px;
      background: rgba(0,0,0,.18);
      border-radius: 999px;
      padding: 4px 14px;
      font-size: 12px;
      display: inline-block;
      max-width: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ceo-row {
      display: flex; justify-content: space-between; gap: 10px;
      margin-top: 8px; font-size: 12px;
    }
    .body { padding: 8px 12px 14px; }
    .ruled-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px;
      border-bottom: 1px solid #9a9a9a; padding: 3px 0 2px;
    }
    .ruled-row.full { grid-template-columns: 1fr; }
    .cell { display: flex; gap: 6px; align-items: baseline; min-width: 0; }
    .label { white-space: nowrap; font-weight: 700; font-size: 13px; }
    .value {
      flex: 1; border-bottom: 1px dotted #aaa; min-height: 1.7em;
      font-size: 13px; padding: 0 4px;
    }
    .edited { color: #a60; font-size: 11px; margin-inline-start: 4px; }
    .signatures {
      display: grid; grid-template-columns: 1fr 1fr; gap: 28px;
      margin-top: 36px; text-align: center; font-size: 13px;
    }
    .sig-rule { border-top: 1.5px solid #222; margin: 0 8px 6px; height: 0; }
    .sig-label { padding-top: 2px; }
    .footer { text-align: center; font-size: 11px; color: #444; margin-top: 10px; }
    .verified { text-align: center; font-size: 12px; color: #1a4d2e; font-weight: 700; margin-top: 8px; }
    ${
      cancelled
        ? `.sheet::after{content:'منسوخ';position:absolute;inset:28% 8%;display:flex;align-items:center;justify-content:center;font-size:72px;font-weight:700;color:rgba(180,0,0,.26);transform:rotate(-24deg);pointer-events:none;z-index:5;}`
        : ""
    }
    @page { size: ${page}; margin: 8mm; }
    @media print {
      body { padding: 0; }
      .sheet { border: none; max-width: none; width: 100%; }
      .sheet, .letterhead, .badge, .address-pill {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .noprint { display: none; }
    }
  </style>
</head>
<body>
  <article class="sheet">
    <header class="letterhead">
      <div class="letterhead-top">
        <div class="logo-slot">${logo}</div>
        <div class="titles">
          <div class="biz-ur">${esc(settings.business_name_ur || "—")}</div>
          ${settings.business_name_en?.trim() ? `<div class="biz-en">${esc(settings.business_name_en)}</div>` : ""}
          ${settings.tagline_ur?.trim() ? `<div class="tagline">${esc(settings.tagline_ur)}</div>` : ""}
        </div>
        ${badges}
      </div>
      ${settings.society_name_ur?.trim() ? `<div class="scheme-bar">${esc(settings.society_name_ur)}</div>` : ""}
      ${settings.address_ur?.trim() ? `<div class="address-pill">${esc(settings.address_ur)}</div>` : ""}
      <div class="ceo-row">
        <span>${esc(settings.ceo_label_ur || "سی ای او")}${settings.ceo_name_ur?.trim() ? `: ${esc(settings.ceo_name_ur)}` : ""}</span>
        <span>فون: ${ltr(settings.phone?.trim() || "—")}</span>
      </div>
    </header>
    <div class="body">
      ${row(cell("نمبر شمار", ltr(serial)), cell("تاریخ", ltr(form.form_date)))}
      ${row(cell("نام خریدار", esc(form.buyer_name)), cell("ولدیت/زوجہ", esc(form.buyer_guardian_name)))}
      ${row(cell("شناختی کارڈ", ltr(form.buyer_cnic)), cell("رابطہ نمبر", ltr(form.buyer_phone)))}
      ${row(cell("ایڈریس", esc(form.buyer_address)), undefined, true)}
      ${row(cell("نام فروخت کنندہ", esc(form.seller_name)), cell("ولدیت/زوجہ", esc(form.seller_guardian_name)))}
      ${row(cell("سائز", esc(form.plot_size_text)), cell("ریٹ فی مرلہ", ltr(formatRupeeUr(Number(form.rate_per_marla)))))}
      ${row(cell("کل قیمت", ltr(formatRupeeUr(Number(form.total_price)))), cell("فائل فیس + کمیشن", ltr(formatRupeeUr(Number(form.file_fee_commission)))))}
      ${row(cell("ٹوکن وصول", ltr(formatRupeeUr(Number(form.token_received)))), cell("سابقہ رقم", ltr(formatRupeeUr(Number(form.previous_amount)))))}
      ${row(
        cell("کل رقم وصول", `${ltr(formatRupeeUr(Number(form.total_received)))}${editedFlag}`),
        cell("بقایا رقم", `${ltr(formatRupeeUr(Number(form.balance_amount)))}${editedFlag}`),
      )}
      ${row(cell("بقایا رقم مورخہ", ltr(form.balance_due_date ?? "—")), cell("بیعانہ مورخہ", ltr(form.bayana_date ?? "—")))}
      <div class="signatures">
        <div><div class="sig-rule"></div><div class="sig-label">دستخط فروخت کنندہ</div></div>
        ${
          settings.show_manager_signature
            ? `<div><div class="sig-rule"></div><div class="sig-label">دستخط مینجر</div></div>`
            : `<div></div>`
        }
      </div>
      ${settings.footer_note_ur?.trim() ? `<div class="footer">${esc(settings.footer_note_ur)}</div>` : ""}
      ${form.status === "issued" ? `<div class="verified">✓ تصدیق شدہ از ڈیلر — Verified by dealer</div>` : ""}
      <p class="noprint" style="text-align:center;color:#666;font-size:12px">Print → Save as PDF</p>
    </div>
  </article>
</body>
</html>`;
}

export function downloadDealerSaleFormPdfHtml(
  form: DealerSaleForm,
  settings: DealerFormSettings,
  pageSize: "a4" | "a5" = "a5",
): void {
  const html = buildDealerSaleFormPdfHtml(form, settings, pageSize);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sale-form-${form.serial_no ?? form.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
