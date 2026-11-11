import type { DealerFormSettings, DealerSaleForm } from '@/lib/manzil/dealer-sale-forms';
import { formatRupeeUr } from '@/lib/manzil/dealer-sale-form-math';
/** Screen preview uses root Noto Nastaliq; PDF HTML embeds woff2 (see dealer-sale-form-pdf). */

/** Western digits + روپے; never Eastern Arabic-Indic digits. */
function Ltr({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" className="ltr" style={{ unicodeBidi: 'isolate', display: 'inline-block' }}>
      {children}
    </span>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="cell">
      <span className="label">{label}</span>
      <span className="value">{children ?? <span className="blank">&nbsp;</span>}</span>
    </div>
  );
}

function RuledRow({
  children,
  full,
}: {
  children: React.ReactNode;
  full?: boolean;
}) {
  return <div className={`ruled-row${full ? ' full' : ''}`}>{children}</div>;
}

/**
 * Printed Urdu sale receipt — structure mirrors
 * reference/mockups/Afridi_Estate_Form_Mockup.html.
 * All letterhead fields come from dealer_form_settings.
 */
export function DealerSaleFormSheet({
  form,
  settings,
  pageSize = 'a5',
}: {
  form: DealerSaleForm;
  settings: DealerFormSettings;
  pageSize?: 'a4' | 'a5';
}) {
  const cancelled = form.status === 'cancelled';
  const edited = !!(form.amounts_manually_edited || form.totals_edited);
  const page = pageSize === 'a4' ? 'A4' : 'A5';
  const maxW = pageSize === 'a4' ? '210mm' : '148mm';

  const showSchemeBadge = Boolean(settings.scheme_badge_ur?.trim());
  const showPhaseBadge = Boolean(settings.phase_badge_ur?.trim());
  const showBadges = showSchemeBadge || showPhaseBadge;

  return (
    <article
      className={`sheet dsf-${pageSize}${cancelled ? ' cancelled' : ''}`}
      dir="rtl"
      id="dealer-sale-form-print"
      style={
        {
          ['--header-bg' as string]: settings.header_bg_color,
          ['--header-accent' as string]: settings.header_accent_color,
          maxWidth: maxW,
        } as React.CSSProperties
      }
    >
      <style>{`
        #dealer-sale-form-print.sheet {
          font-family: "Noto Nastaliq Urdu", "Source Sans 3", serif;
          line-height: 2.05;
          color: #111;
          background: #fff;
          width: 100%;
          margin: 0 auto;
          border: 1px solid #bbb;
          position: relative;
          overflow: hidden;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #dealer-sale-form-print .letterhead {
          background: var(--header-bg, #1a4d2e);
          color: #fff;
          padding: 10px 12px 12px;
          border-bottom: 5px solid var(--header-accent, #c9a227);
          text-align: center;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #dealer-sale-form-print .letterhead-top {
          display: grid;
          grid-template-columns: 72px 1fr ${showBadges ? '88px' : '0fr'};
          gap: 8px;
          align-items: start;
        }
        #dealer-sale-form-print .logo-slot {
          width: 64px; height: 64px;
          background: #fff;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        #dealer-sale-form-print .logo-slot img { max-width: 100%; max-height: 100%; object-fit: contain; }
        #dealer-sale-form-print .titles { text-align: center; min-width: 0; }
        #dealer-sale-form-print .biz-ur { font-size: 22px; font-weight: 700; line-height: 1.55; margin: 0; }
        #dealer-sale-form-print .biz-en {
          font-family: "Source Sans 3", system-ui, sans-serif;
          font-size: 12px; direction: ltr; unicode-bidi: isolate; opacity: .92; margin-top: 2px;
        }
        #dealer-sale-form-print .tagline { font-size: 12px; opacity: .95; margin-top: 2px; }
        #dealer-sale-form-print .badges { display: flex; flex-direction: column; gap: 4px; align-items: stretch; }
        #dealer-sale-form-print .badge {
          background: var(--header-accent, #c9a227);
          color: #111;
          font-size: 11px; font-weight: 700;
          padding: 2px 8px; border-radius: 3px; text-align: center;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        #dealer-sale-form-print .scheme-bar {
          margin-top: 8px;
          font-size: 13px;
          letter-spacing: .02em;
          opacity: .98;
        }
        #dealer-sale-form-print .address-pill {
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
        #dealer-sale-form-print .ceo-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 8px;
          font-size: 12px;
        }
        #dealer-sale-form-print .body { padding: 8px 12px 14px; }
        #dealer-sale-form-print .ruled-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 14px;
          border-bottom: 1px solid #9a9a9a;
          padding: 3px 0 2px;
        }
        #dealer-sale-form-print .ruled-row.full { grid-template-columns: 1fr; }
        #dealer-sale-form-print .cell { display: flex; gap: 6px; align-items: baseline; min-width: 0; }
        #dealer-sale-form-print .label { white-space: nowrap; font-weight: 700; font-size: 13px; }
        #dealer-sale-form-print .value {
          flex: 1;
          border-bottom: 1px dotted #aaa;
          min-height: 1.7em;
          font-size: 13px;
          padding: 0 4px;
        }
        #dealer-sale-form-print .blank { display: inline-block; min-width: 4em; }
        #dealer-sale-form-print .edited { color: #a60; font-size: 11px; margin-inline-start: 4px; }
        #dealer-sale-form-print .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
          margin-top: 36px;
          text-align: center;
          font-size: 13px;
        }
        #dealer-sale-form-print .sig-rule {
          border-top: 1.5px solid #222;
          margin: 0 8px 6px;
          height: 0;
        }
        #dealer-sale-form-print .sig-label { padding-top: 2px; }
        #dealer-sale-form-print .footer { text-align: center; font-size: 11px; color: #444; margin-top: 10px; }
        #dealer-sale-form-print .verified { text-align: center; font-size: 12px; color: #1a4d2e; font-weight: 700; margin-top: 8px; }
        #dealer-sale-form-print.cancelled::after {
          content: "منسوخ";
          position: absolute; inset: 28% 8%;
          display: flex; align-items: center; justify-content: center;
          font-size: 72px; font-weight: 700; color: rgba(180,0,0,.26);
          transform: rotate(-24deg); pointer-events: none; z-index: 5;
        }
        @media print {
          @page { size: ${page}; margin: 8mm; }
          body * { visibility: hidden !important; }
          #dealer-sale-form-print, #dealer-sale-form-print * { visibility: visible !important; }
          #dealer-sale-form-print.sheet {
            position: absolute; left: 0; top: 0; width: 100%; max-width: none; border: none;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {cancelled && (
        <div className="watermark no-print" aria-hidden="true" style={{ display: 'none' }}>
          منسوخ
        </div>
      )}

      <header className="letterhead">
        <div className="letterhead-top">
          <div className="logo-slot">
            {settings.logo_url ? <img src={settings.logo_url} alt="" /> : null}
          </div>
          <div className="titles">
            <div className="biz-ur">{settings.business_name_ur || '—'}</div>
            {settings.business_name_en?.trim() ? (
              <div className="biz-en">{settings.business_name_en}</div>
            ) : null}
            {settings.tagline_ur?.trim() ? <div className="tagline">{settings.tagline_ur}</div> : null}
          </div>
          {showBadges ? (
            <div className="badges">
              {showSchemeBadge ? <span className="badge">{settings.scheme_badge_ur}</span> : null}
              {showPhaseBadge ? <span className="badge">{settings.phase_badge_ur}</span> : null}
            </div>
          ) : (
            <div />
          )}
        </div>
        {settings.society_name_ur?.trim() ? (
          <div className="scheme-bar">{settings.society_name_ur}</div>
        ) : null}
        {settings.address_ur?.trim() ? (
          <div className="address-pill">{settings.address_ur}</div>
        ) : null}
        <div className="ceo-row">
          <span>
            {settings.ceo_label_ur || 'سی ای او'}
            {settings.ceo_name_ur?.trim() ? `: ${settings.ceo_name_ur}` : ''}
          </span>
          <span>
            فون: <Ltr>{settings.phone?.trim() || '—'}</Ltr>
          </span>
        </div>
      </header>

      <div className="body">
        <RuledRow>
          <Cell label="نمبر شمار">
            <Ltr>{form.serial_no != null ? String(form.serial_no) : '—'}</Ltr>
          </Cell>
          <Cell label="تاریخ">
            <Ltr>{form.form_date}</Ltr>
          </Cell>
        </RuledRow>
        <RuledRow>
          <Cell label="نام خریدار">{form.buyer_name}</Cell>
          <Cell label="ولدیت/زوجہ">{form.buyer_guardian_name}</Cell>
        </RuledRow>
        <RuledRow>
          <Cell label="شناختی کارڈ">
            <Ltr>{form.buyer_cnic}</Ltr>
          </Cell>
          <Cell label="رابطہ نمبر">
            <Ltr>{form.buyer_phone}</Ltr>
          </Cell>
        </RuledRow>
        <RuledRow full>
          <Cell label="ایڈریس">{form.buyer_address}</Cell>
        </RuledRow>
        <RuledRow>
          <Cell label="نام فروخت کنندہ">{form.seller_name}</Cell>
          <Cell label="ولدیت/زوجہ">{form.seller_guardian_name}</Cell>
        </RuledRow>
        <RuledRow>
          <Cell label="سائز">{form.plot_size_text}</Cell>
          <Cell label="ریٹ فی مرلہ">
            <Ltr>{formatRupeeUr(Number(form.rate_per_marla))}</Ltr>
          </Cell>
        </RuledRow>
        <RuledRow>
          <Cell label="کل قیمت">
            <Ltr>{formatRupeeUr(Number(form.total_price))}</Ltr>
          </Cell>
          <Cell label="فائل فیس + کمیشن">
            <Ltr>{formatRupeeUr(Number(form.file_fee_commission))}</Ltr>
          </Cell>
        </RuledRow>
        <RuledRow>
          <Cell label="ٹوکن وصول">
            <Ltr>{formatRupeeUr(Number(form.token_received))}</Ltr>
          </Cell>
          <Cell label="سابقہ رقم">
            <Ltr>{formatRupeeUr(Number(form.previous_amount))}</Ltr>
          </Cell>
        </RuledRow>
        <RuledRow>
          <Cell label="کل رقم وصول">
            <Ltr>{formatRupeeUr(Number(form.total_received))}</Ltr>
            {edited ? <span className="edited">(ترمیم شدہ)</span> : null}
          </Cell>
          <Cell label="بقایا رقم">
            <Ltr>{formatRupeeUr(Number(form.balance_amount))}</Ltr>
            {edited ? <span className="edited">(ترمیم شدہ)</span> : null}
          </Cell>
        </RuledRow>
        <RuledRow>
          <Cell label="بقایا رقم مورخہ">
            <Ltr>{form.balance_due_date ?? '—'}</Ltr>
          </Cell>
          <Cell label="بیعانہ مورخہ">
            <Ltr>{form.bayana_date ?? '—'}</Ltr>
          </Cell>
        </RuledRow>

        <div className="signatures">
          <div>
            <div className="sig-rule" />
            <div className="sig-label">دستخط فروخت کنندہ</div>
          </div>
          {settings.show_manager_signature ? (
            <div>
              <div className="sig-rule" />
              <div className="sig-label">دستخط مینجر</div>
            </div>
          ) : (
            <div />
          )}
        </div>

        {settings.footer_note_ur?.trim() ? <div className="footer">{settings.footer_note_ur}</div> : null}
        {form.status === 'issued' ? (
          <div className="verified">✓ تصدیق شدہ از ڈیلر — Verified by dealer</div>
        ) : null}
      </div>
    </article>
  );
}
