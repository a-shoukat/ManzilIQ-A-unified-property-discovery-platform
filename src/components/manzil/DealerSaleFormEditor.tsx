import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DealerSaleFormSheet } from '@/components/manzil/DealerSaleFormSheet';
import {
  createSaleForm,
  fetchFormSettings,
  issueSaleForm,
  saleFormSchema,
  updateSaleForm,
  type DealerFormSettings,
  type DealerSaleForm,
  type SaleFormInput,
} from '@/lib/manzil/dealer-sale-forms';
import { computeTotals } from '@/lib/manzil/dealer-sale-form-math';
import { errorText } from '@/lib/manzil/errors';
import { useAuth } from '@/lib/manzil/auth';

const empty: SaleFormInput = {
  form_date: new Date().toISOString().slice(0, 10),
  buyer_name: '',
  buyer_guardian_name: '',
  buyer_cnic: '',
  buyer_phone: '',
  buyer_address: '',
  seller_name: '',
  seller_guardian_name: '',
  plot_size_text: '',
  rate_per_marla: 0,
  total_price: 0,
  file_fee_commission: 0,
  token_received: 0,
  previous_amount: 0,
  total_received: 0,
  balance_amount: 0,
  amounts_manually_edited: false,
  balance_due_date: null,
  bayana_date: null,
  notes: '',
  booking_id: null,
  plot_id: null,
};

export function DealerSaleFormEditor({
  initial,
  existing,
  readOnly,
  onSaved,
  onNavigate,
}: {
  initial?: Partial<SaleFormInput>;
  existing?: DealerSaleForm | null;
  readOnly?: boolean;
  onSaved: (form: DealerSaleForm) => void;
  onNavigate: (p: string, arg?: string) => void;
}) {
  const { session, profile } = useAuth();
  const [settings, setSettings] = useState<DealerFormSettings | null>(null);
  const [form, setForm] = useState<SaleFormInput>({ ...empty, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = readOnly || (existing ? existing.status !== 'draft' : false) || profile?.role === 'super_admin';

  useEffect(() => {
    if (!session) return;
    const dealerId = existing?.dealer_id ?? session.user.id;
    void fetchFormSettings(dealerId).then(setSettings);
  }, [session, existing?.dealer_id]);

  useEffect(() => {
    if (initial) setForm((f) => ({ ...f, ...initial }));
  }, [initial]);

  const auto = useMemo(
    () =>
      computeTotals({
        token_received: Number(form.token_received) || 0,
        previous_amount: Number(form.previous_amount) || 0,
        total_price: Number(form.total_price) || 0,
      }),
    [form.token_received, form.previous_amount, form.total_price],
  );

  useEffect(() => {
    if (!form.amounts_manually_edited) {
      setForm((f) => ({
        ...f,
        total_received: auto.total_received,
        balance_amount: auto.balance_amount,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto.total_received, auto.balance_amount, form.amounts_manually_edited]);

  const set = (key: keyof SaleFormInput, value: string | number | boolean | null) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const previewForm: DealerSaleForm = {
    id: existing?.id ?? 'preview',
    dealer_id: session?.user.id ?? '',
    booking_id: form.booking_id ?? null,
    plot_id: form.plot_id ?? null,
    serial_no: existing?.serial_no ?? 0,
    form_date: form.form_date,
    buyer_name: form.buyer_name,
    buyer_guardian_name: form.buyer_guardian_name,
    buyer_cnic: form.buyer_cnic,
    buyer_phone: form.buyer_phone,
    buyer_address: form.buyer_address,
    seller_name: form.seller_name,
    seller_guardian_name: form.seller_guardian_name,
    plot_size_text: form.plot_size_text,
    rate_per_marla: Number(form.rate_per_marla) || 0,
    total_price: Number(form.total_price) || 0,
    file_fee_commission: Number(form.file_fee_commission) || 0,
    token_received: Number(form.token_received) || 0,
    previous_amount: Number(form.previous_amount) || 0,
    total_received: Number(form.total_received) || 0,
    balance_amount: Number(form.balance_amount) || 0,
    amounts_manually_edited: !!form.amounts_manually_edited,
    balance_due_date: form.balance_due_date ?? null,
    bayana_date: form.bayana_date ?? null,
    notes: form.notes,
    status: existing?.status ?? 'draft',
    public_share_token: existing?.public_share_token ?? null,
    created_at: existing?.created_at ?? '',
    updated_at: existing?.updated_at ?? '',
  };

  const save = async () => {
    if (!session) return;
    const parsed = saleFormSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = existing
        ? await updateSaleForm(existing.id, session.user.id, parsed.data)
        : await createSaleForm(session.user.id, parsed.data);
      setMsg('Saved');
      onSaved(saved);
    } catch (e) {
      setError(errorText(e, 'Could not save form'));
    } finally {
      setBusy(false);
    }
  };

  const issue = async () => {
    if (!session || !existing) return;
    setBusy(true);
    try {
      const issued = await issueSaleForm(existing.id, session.user.id);
      setMsg('Issued');
      onSaved(issued);
    } catch (e) {
      setError(errorText(e, 'Could not issue'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      {msg && <div className="notice" style={{ marginBottom: 12 }}>{msg}</div>}
      {error && <div className="error" role="alert">{error}</div>}
      {locked && existing?.status === 'issued' && (
        <div className="notice warn-box" style={{ marginBottom: 12 }}>
          Issued forms are locked. Duplicate to create an editable version.
        </div>
      )}

      <div className="panel-grid" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>Form fields</h3>
          <div className="form-row">
            <label>تاریخ<input type="date" disabled={locked} value={form.form_date} onChange={(e) => set('form_date', e.target.value)} /></label>
            <label>سائز<input disabled={locked} value={form.plot_size_text} onChange={(e) => set('plot_size_text', e.target.value)} /></label>
          </div>
          <div className="form-row">
            <label>نام خریدار<input disabled={locked} required value={form.buyer_name} onChange={(e) => set('buyer_name', e.target.value)} /></label>
            <label>ولدیت/زوجہ<input disabled={locked} value={form.buyer_guardian_name} onChange={(e) => set('buyer_guardian_name', e.target.value)} /></label>
          </div>
          <div className="form-row">
            <label>شناختی کارڈ<input disabled={locked} value={form.buyer_cnic} onChange={(e) => set('buyer_cnic', e.target.value)} dir="ltr" /></label>
            <label>رابطہ نمبر<input disabled={locked} value={form.buyer_phone} onChange={(e) => set('buyer_phone', e.target.value)} dir="ltr" /></label>
          </div>
          <label>ایڈریس<textarea disabled={locked} rows={2} value={form.buyer_address} onChange={(e) => set('buyer_address', e.target.value)} /></label>
          <div className="form-row">
            <label>نام فروخت کنندہ<input disabled={locked} value={form.seller_name} onChange={(e) => set('seller_name', e.target.value)} /></label>
            <label>ولدیت/زوجہ (فروخت)<input disabled={locked} value={form.seller_guardian_name} onChange={(e) => set('seller_guardian_name', e.target.value)} /></label>
          </div>
          <div className="form-row">
            <label>ریٹ فی مرلہ<input type="number" min={0} step={1} disabled={locked} value={form.rate_per_marla} onChange={(e) => set('rate_per_marla', e.target.value)} /></label>
            <label>کل قیمت<input type="number" min={0} step={1} disabled={locked} value={form.total_price} onChange={(e) => set('total_price', e.target.value)} /></label>
          </div>
          <div className="form-row">
            <label>فائل فیس + کمیشن<input type="number" min={0} step={1} disabled={locked} value={form.file_fee_commission} onChange={(e) => set('file_fee_commission', e.target.value)} /></label>
            <label>ٹوکن وصول<input type="number" min={0} step={1} disabled={locked} value={form.token_received} onChange={(e) => set('token_received', e.target.value)} /></label>
          </div>
          <div className="form-row">
            <label>سابقہ رقم<input type="number" min={0} step={1} disabled={locked} value={form.previous_amount} onChange={(e) => set('previous_amount', e.target.value)} /></label>
            <label>
              کل رقم وصول
              <input
                type="number"
                min={0}
                step={1}
                disabled={locked}
                value={form.total_received ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, total_received: Number(e.target.value), amounts_manually_edited: true }))}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              بقایا رقم
              <input
                type="number"
                step={1}
                disabled={locked}
                value={form.balance_amount ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, balance_amount: Number(e.target.value), amounts_manually_edited: true }))}
              />
            </label>
            <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                disabled={locked}
                checked={!!form.amounts_manually_edited}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    amounts_manually_edited: e.target.checked,
                    ...(e.target.checked
                      ? {}
                      : { total_received: auto.total_received, balance_amount: auto.balance_amount }),
                  }))
                }
              />
              Totals edited (manual override)
            </label>
          </div>
          {!form.amounts_manually_edited && (
            <p className="muted small">Auto: کل وصول = ٹوکن + سابقہ · بقایا = کل قیمت − کل وصول</p>
          )}
          <div className="form-row">
            <label>بقایا رقم مورخہ<input type="date" disabled={locked} value={form.balance_due_date ?? ''} onChange={(e) => set('balance_due_date', e.target.value || null)} /></label>
            <label>بیعانہ مورخہ<input type="date" disabled={locked} value={form.bayana_date ?? ''} onChange={(e) => set('bayana_date', e.target.value || null)} /></label>
          </div>
          <label>نوٹس<textarea disabled={locked} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></label>

          <div className="link-row">
            {!locked && (
              <Button variant="legacy" className="btn small" disabled={busy} onClick={() => void save()}>
                {busy ? 'Saving…' : existing ? 'Save draft' : 'Create draft'}
              </Button>
            )}
            {existing?.status === 'draft' && !readOnly && profile?.role === 'dealer' && (
              <Button variant="legacy" className="btn small" disabled={busy} onClick={() => void issue()}>
                Issue
              </Button>
            )}
            <Button variant="legacy" className="btn secondary small" onClick={() => onNavigate('dealer-forms')}>
              Back to list
            </Button>
          </div>
        </div>

        <div>
          <h3>Live preview</h3>
          {settings ? <DealerSaleFormSheet form={previewForm} settings={settings} /> : <p className="muted">Loading header…</p>}
        </div>
      </div>
    </div>
  );
}
