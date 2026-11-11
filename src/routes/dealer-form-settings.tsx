import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PageFrame, pageHead, useAppNavigation } from '@/components/manzil/PageFrame';
import { DealerSaleFormSheet } from '@/components/manzil/DealerSaleFormSheet';
import { useAuth } from '@/lib/manzil/auth';
import { errorText } from '@/lib/manzil/errors';
import {
  DEFAULT_FORM_SETTINGS,
  fetchFormSettings,
  removeDealerLogo,
  resetFormSettings,
  saveFormSettings,
  settingsSchema,
  uploadDealerLogo,
  type DealerFormSettings,
  type DealerSaleForm,
} from '@/lib/manzil/dealer-sale-forms';
import { SALE_FORMS_COPY as C } from '@/lib/manzil/phase11-copy/sale-forms';

function FormSettings({ onNavigate }: { onNavigate: (p: string) => void }) {
  useTranslation('dealer');
  const { session, profile } = useAuth();
  const [s, setS] = useState<DealerFormSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const readOnly = profile?.role === 'super_admin';

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      setS(await fetchFormSettings(session.user.id));
    } catch (e) {
      setError(errorText(e, C.loadSettingsError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  const save = async () => {
    if (!session || !s) return;
    const parsed = settingsSchema.safeParse(s);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? C.invalidSettings);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveFormSettings(session.user.id, { ...parsed.data, logo_url: s.logo_url });
      setMsg(C.settingsSaved);
      await load();
    } catch (e) {
      setError(errorText(e, C.saveError));
    } finally {
      setBusy(false);
    }
  };

  const onLogo = async (file: File | null) => {
    if (!session || !file) return;
    setBusy(true);
    try {
      const url = await uploadDealerLogo(file);
      setS((prev) => (prev ? { ...prev, logo_url: url } : prev));
      setMsg(C.logoUploaded);
    } catch (e) {
      setError(errorText(e, C.logoError));
    } finally {
      setBusy(false);
    }
  };

  const preview: DealerSaleForm = {
    id: 'preview',
    dealer_id: session?.user.id ?? '',
    booking_id: null,
    plot_id: null,
    serial_no: s?.next_serial ?? 1,
    form_date: new Date().toISOString().slice(0, 10),
    buyer_name: 'نمونہ خریدار',
    buyer_guardian_name: '—',
    buyer_cnic: '35202-1234567-1',
    buyer_phone: '03001234567',
    buyer_address: 'نمونہ ایڈریس',
    seller_name: 'نمونہ فروخت کنندہ',
    seller_guardian_name: '—',
    plot_size_text: '10 مرلہ',
    rate_per_marla: 500000,
    total_price: 5000000,
    file_fee_commission: 50000,
    token_received: 500000,
    previous_amount: 0,
    total_received: 500000,
    balance_amount: 4500000,
    amounts_manually_edited: false,
    balance_due_date: null,
    bayana_date: null,
    notes: '',
    status: 'draft',
    public_share_token: null,
    created_at: '',
    updated_at: '',
  };

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1>{C.settingsTitle}</h1>
          <p className="muted" style={{ margin: 0 }}>{C.settingsSubtitle}</p>
        </div>
        <div className="link-row" style={{ margin: 0 }}>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dealer-forms')}>
            {C.formsLink}
          </Button>
          <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dealer')}>
            {C.portal}
          </Button>
        </div>
      </div>

      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      {error && <div className="error" role="alert">{error}</div>}
      {loading || !s ? (
        <p className="muted">{C.loading}</p>
      ) : (
        <div className="panel-grid">
          <div className="card">
            <h3>{C.headerFields}</h3>
            <label>Logo
              <input type="file" accept="image/*" disabled={readOnly || busy} onChange={(e) => void onLogo(e.target.files?.[0] ?? null)} />
            </label>
            {s.logo_url && (
              <div className="link-row">
                <img src={s.logo_url} alt="" width={64} height={64} style={{ objectFit: 'contain' }} />
                {!readOnly && (
                  <Button
                    variant="legacy"
                    className="btn danger small"
                    disabled={busy}
                    onClick={() =>
                      void removeDealerLogo(session!.user.id, s.logo_url).then(() => {
                        setS({ ...s, logo_url: null });
                        setMsg(C.logoRemoved);
                      })
                    }
                  >
                    {C.removeLogo}
                  </Button>
                )}
              </div>
            )}
            {(
              [
                ['business_name_ur', 'کاروباری نام (اردو)'],
                ['business_name_en', 'Business name (EN)'],
                ['society_name_ur', 'سوسائٹی نام'],
                ['scheme_badge_ur', 'سکیم بیج'],
                ['phase_badge_ur', 'فیز بیج'],
                ['tagline_ur', 'ٹیگ لائن'],
                ['address_ur', 'ایڈریس'],
                ['ceo_label_ur', 'CEO لیبل'],
                ['ceo_name_ur', 'CEO نام'],
                ['phone', 'فون'],
                ['footer_note_ur', 'فوٹر نوٹ'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  disabled={readOnly}
                  value={s[key]}
                  onChange={(e) => setS({ ...s, [key]: e.target.value })}
                  dir={key === 'phone' || key === 'business_name_en' ? 'ltr' : 'rtl'}
                />
              </label>
            ))}
            <div className="form-row">
              <label>{C.headerBg}<input type="color" disabled={readOnly} value={s.header_bg_color} onChange={(e) => setS({ ...s, header_bg_color: e.target.value })} /></label>
              <label>{C.accent}<input type="color" disabled={readOnly} value={s.header_accent_color} onChange={(e) => setS({ ...s, header_accent_color: e.target.value })} /></label>
              <label>{C.nextSerial}<input type="number" min={1} disabled={readOnly} value={s.next_serial} onChange={(e) => setS({ ...s, next_serial: Number(e.target.value) || 1 })} dir="ltr" className="ltr-isolate" /></label>
            </div>
            <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                disabled={readOnly}
                checked={s.show_manager_signature}
                onChange={(e) => setS({ ...s, show_manager_signature: e.target.checked })}
              />
              {C.showManagerSig}
            </label>
            {!readOnly && (
              <div className="link-row">
                <Button variant="legacy" className="btn small" disabled={busy} onClick={() => void save()}>
                  {busy ? C.saving : C.save}
                </Button>
                <Button
                  variant="legacy"
                  className="btn secondary small"
                  disabled={busy}
                  onClick={() =>
                    void resetFormSettings(session!.user.id).then(async () => {
                      setMsg(C.resetKept);
                      await load();
                    })
                  }
                >
                  {C.reset}
                </Button>
              </div>
            )}
          </div>
          <div>
            <h3>{C.liveHeaderPreview}</h3>
            <DealerSaleFormSheet form={preview} settings={s ?? { ...DEFAULT_FORM_SETTINGS, dealer_id: '' }} />
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/dealer-form-settings')({
  head: () => pageHead('Sale form settings'),
  component: () => {
    const onNavigate = useAppNavigation();
    return (
      <PageFrame>
        <FormSettings onNavigate={onNavigate} />
      </PageFrame>
    );
  },
});
