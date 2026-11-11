import type { DealerFormSettings, DealerSaleForm } from '@/lib/manzil/dealer-sale-forms';
import { formatRupeeUr } from '@/lib/manzil/dealer-sale-form-math';

const NOTO =
  "https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap";

function Ltr({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: 'isolate', display: 'inline-block' }}>
      {children}
    </span>
  );
}

function Row({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue: React.ReactNode;
  rightLabel?: string;
  rightValue?: React.ReactNode;
}) {
  return (
    <div className="dsf-row">
      <div className="dsf-cell">
        <span className="dsf-label">{leftLabel}</span>
        <span className="dsf-value">{leftValue || <span className="dsf-blank">&nbsp;</span>}</span>
      </div>
      {rightLabel != null && (
        <div className="dsf-cell">
          <span className="dsf-label">{rightLabel}</span>
          <span className="dsf-value">{rightValue || <span className="dsf-blank">&nbsp;</span>}</span>
        </div>
      )}
    </div>
  );
}

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
  return (
    <div className={`dsf-sheet dsf-${pageSize}${cancelled ? ' dsf-cancelled' : ''}`} dir="rtl" id="dealer-sale-form-print">
      <link rel="stylesheet" href={NOTO} />
      <style>{`
        .dsf-sheet {
          font-family: 'Noto Nastaliq Urdu', serif;
          line-height: 2.1;
          color: #111;
          background: #fff;
          width: 100%;
          max-width: ${pageSize === 'a4' ? '210mm' : '148mm'};
          margin: 0 auto;
          border: 1px solid #ccc;
          position: relative;
          overflow: hidden;
        }
        .dsf-header {
          background: ${settings.header_bg_color};
          color: #fff;
          padding: 12px 14px 10px;
          text-align: center;
          border-bottom: 4px solid ${settings.header_accent_color};
        }
        .dsf-header-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .dsf-logo { width:56px; height:56px; object-fit:contain; background:#fff; border-radius:6px; }
        .dsf-badges { display:flex; flex-direction:column; gap:4px; align-items:flex-start; font-size:11px; }
        .dsf-badge { background:${settings.header_accent_color}; color:#111; padding:2px 8px; border-radius:3px; font-weight:700; }
        .dsf-society { font-size:13px; opacity:.95; margin-top:4px; }
        .dsf-biz { font-size:22px; font-weight:700; margin:6px 0 2px; line-height:1.6; }
        .dsf-biz-en { font-size:12px; opacity:.9; font-family: system-ui, sans-serif; direction:ltr; unicode-bidi:isolate; }
        .dsf-address { font-size:12px; background:rgba(0,0,0,.15); margin-top:8px; padding:4px 8px; }
        .dsf-ceo { display:flex; justify-content:space-between; font-size:12px; margin-top:6px; gap:8px; }
        .dsf-body { padding:10px 12px 14px; }
        .dsf-row { display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; border-bottom:1px solid #bbb; padding:4px 0; }
        .dsf-row.full { grid-template-columns:1fr; }
        .dsf-cell { display:flex; gap:6px; align-items:baseline; min-width:0; }
        .dsf-label { white-space:nowrap; font-weight:700; font-size:13px; color:#222; }
        .dsf-value { flex:1; border-bottom:1px dotted #999; min-height:1.6em; font-size:13px; padding:0 4px; }
        .dsf-blank { display:inline-block; min-width:4em; }
        .dsf-signs { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:28px; }
        .dsf-sign { text-align:center; font-size:13px; }
        .dsf-sign-line { border-top:1px solid #333; margin-top:40px; padding-top:4px; }
        .dsf-footer { font-size:11px; text-align:center; color:#444; margin-top:12px; }
        .dsf-edited { color:#a60; font-size:11px; margin-inline-start:4px; }
        .dsf-verified { text-align:center; font-size:12px; margin-top:8px; color:#1a4d2e; font-weight:700; }
        .dsf-cancelled::after {
          content: 'منسوخ';
          position:absolute; inset:30% 10%;
          font-size:64px; font-weight:700; color:rgba(180,0,0,.28);
          display:flex; align-items:center; justify-content:center;
          transform: rotate(-24deg); pointer-events:none; z-index:5;
        }
        @media print {
          @page { size: ${pageSize === 'a4' ? 'A4' : 'A5'}; margin: 8mm; }
          body * { visibility: hidden !important; }
          .dsf-sheet, .dsf-sheet * { visibility: visible !important; }
          .dsf-sheet { position: absolute; left:0; top:0; width:100%; max-width:none; border:none; box-shadow:none; }
          .no-print { display:none !important; }
        }
      `}</style>

      <header className="dsf-header">
        <div className="dsf-header-top">
          <div className="dsf-badges">
            {settings.scheme_badge_ur && <span className="dsf-badge">{settings.scheme_badge_ur}</span>}
            {settings.phase_badge_ur && <span className="dsf-badge">{settings.phase_badge_ur}</span>}
          </div>
          {settings.logo_url ? (
            <img className="dsf-logo" src={settings.logo_url} alt="" />
          ) : (
            <div className="dsf-logo" />
          )}
        </div>
        {settings.society_name_ur && <div className="dsf-society">{settings.society_name_ur}</div>}
        <div className="dsf-biz">{settings.business_name_ur || '—'}</div>
        {settings.business_name_en && <div className="dsf-biz-en">{settings.business_name_en}</div>}
        {settings.tagline_ur && <div style={{ fontSize: 12 }}>{settings.tagline_ur}</div>}
        {settings.address_ur && <div className="dsf-address">{settings.address_ur}</div>}
        <div className="dsf-ceo">
          <span>
            {settings.ceo_label_ur}: {settings.ceo_name_ur || '—'}
          </span>
          <span>
            فون: <Ltr>{settings.phone || '—'}</Ltr>
          </span>
        </div>
      </header>

      <div className="dsf-body">
        <Row
          leftLabel="نمبر شمار"
          leftValue={<Ltr>{String(form.serial_no)}</Ltr>}
          rightLabel="تاریخ"
          rightValue={<Ltr>{form.form_date}</Ltr>}
        />
        <Row
          leftLabel="نام خریدار"
          leftValue={form.buyer_name}
          rightLabel="ولدیت/زوجہ"
          rightValue={form.buyer_guardian_name}
        />
        <Row
          leftLabel="شناختی کارڈ"
          leftValue={<Ltr>{form.buyer_cnic}</Ltr>}
          rightLabel="رابطہ نمبر"
          rightValue={<Ltr>{form.buyer_phone}</Ltr>}
        />
        <div className="dsf-row full">
          <div className="dsf-cell">
            <span className="dsf-label">ایڈریس</span>
            <span className="dsf-value">{form.buyer_address || <span className="dsf-blank">&nbsp;</span>}</span>
          </div>
        </div>
        <Row
          leftLabel="نام فروخت کنندہ"
          leftValue={form.seller_name}
          rightLabel="ولدیت/زوجہ"
          rightValue={form.seller_guardian_name}
        />
        <Row
          leftLabel="سائز"
          leftValue={form.plot_size_text}
          rightLabel="ریٹ فی مرلہ"
          rightValue={<Ltr>{formatRupeeUr(Number(form.rate_per_marla))}</Ltr>}
        />
        <Row
          leftLabel="کل قیمت"
          leftValue={<Ltr>{formatRupeeUr(Number(form.total_price))}</Ltr>}
          rightLabel="فائل فیس + کمیشن"
          rightValue={<Ltr>{formatRupeeUr(Number(form.file_fee_commission))}</Ltr>}
        />
        <Row
          leftLabel="ٹوکن وصول"
          leftValue={<Ltr>{formatRupeeUr(Number(form.token_received))}</Ltr>}
          rightLabel="سابقہ رقم"
          rightValue={<Ltr>{formatRupeeUr(Number(form.previous_amount))}</Ltr>}
        />
        <Row
          leftLabel="کل رقم وصول"
          leftValue={
            <>
              <Ltr>{formatRupeeUr(Number(form.total_received))}</Ltr>
              {form.totals_edited && <span className="dsf-edited">(ترمیم شدہ)</span>}
            </>
          }
          rightLabel="بقایا رقم"
          rightValue={
            <>
              <Ltr>{formatRupeeUr(Number(form.balance_amount))}</Ltr>
              {form.totals_edited && <span className="dsf-edited">(ترمیم شدہ)</span>}
            </>
          }
        />
        <Row
          leftLabel="بقایا رقم مورخہ"
          leftValue={<Ltr>{form.balance_due_date ?? '—'}</Ltr>}
          rightLabel="بیعانہ مورخہ"
          rightValue={<Ltr>{form.bayana_date ?? '—'}</Ltr>}
        />

        <div className="dsf-signs">
          <div className="dsf-sign">
            <div className="dsf-sign-line">دستخط فروخت کنندہ</div>
          </div>
          {settings.show_manager_signature && (
            <div className="dsf-sign">
              <div className="dsf-sign-line">دستخط مینجر</div>
            </div>
          )}
        </div>

        {settings.footer_note_ur && <div className="dsf-footer">{settings.footer_note_ur}</div>}
        {form.status === 'issued' && (
          <div className="dsf-verified">✓ تصدیق شدہ از ڈیلر — Verified by dealer</div>
        )}
      </div>
    </div>
  );
}
