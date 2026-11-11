import { z } from "zod";
import { getSupabase } from "./supabase";
import { writeAudit } from "./audit";
import {
  computeTotals,
  makeShareToken,
  maskCnic,
  maskPhone,
  normalizePkPhone,
  rupeeSchema,
  totalsWereEdited,
} from "./dealer-sale-form-math";
import type { Booking, Payment } from "./types";

function editedFlag(input: SaleFormInput): boolean {
  return !!(input.amounts_manually_edited ?? input.totals_edited);
}

export type FormStatus = "draft" | "issued" | "cancelled";

export interface DealerFormSettings {
  dealer_id: string;
  logo_url: string | null;
  business_name_ur: string;
  business_name_en: string;
  society_name_ur: string;
  scheme_badge_ur: string;
  phase_badge_ur: string;
  tagline_ur: string;
  address_ur: string;
  ceo_label_ur: string;
  ceo_name_ur: string;
  phone: string;
  header_bg_color: string;
  header_accent_color: string;
  footer_note_ur: string;
  show_manager_signature: boolean;
  next_serial: number;
  updated_at?: string;
}

export interface DealerSaleForm {
  id: string;
  dealer_id: string;
  booking_id: string | null;
  plot_id: string | null;
  serial_no: number | null;
  form_date: string;
  buyer_name: string;
  buyer_guardian_name: string;
  buyer_cnic: string;
  buyer_phone: string;
  buyer_address: string;
  seller_name: string;
  seller_guardian_name: string;
  plot_size_text: string;
  rate_per_marla: number;
  total_price: number;
  file_fee_commission: number;
  token_received: number;
  previous_amount: number;
  total_received: number;
  balance_amount: number;
  amounts_manually_edited: boolean;
  /** @deprecated use amounts_manually_edited */
  totals_edited?: boolean;
  balance_due_date: string | null;
  bayana_date: string | null;
  notes: string;
  status: FormStatus;
  public_share_token: string | null;
  revoked_at?: string | null;
  issued_at?: string | null;
  cancelled_at?: string | null;
  version?: number;
  duplicated_from?: string | null;
  header_snapshot?: DealerFormSettings | null;
  created_at: string;
  updated_at: string;
}

/** Public DTO — no dealer_id / internal ids; PII masked. */
export type PublicSaleFormView = {
  serial_no: number | null;
  form_date: string;
  buyer_name: string;
  buyer_guardian_name: string;
  buyer_cnic_masked: string;
  buyer_phone_masked: string;
  buyer_address: string;
  seller_name: string;
  seller_guardian_name: string;
  plot_size_text: string;
  rate_per_marla: number;
  total_price: number;
  file_fee_commission: number;
  token_received: number;
  previous_amount: number;
  total_received: number;
  balance_amount: number;
  amounts_manually_edited: boolean;
  balance_due_date: string | null;
  bayana_date: string | null;
  status: FormStatus;
  header: DealerFormSettings;
};

/** Seeded Afridi Estate defaults — only place Afridi branding is hard-coded. */
export const DEFAULT_FORM_SETTINGS: Omit<DealerFormSettings, "dealer_id" | "updated_at"> = {
  logo_url: null,
  business_name_ur: "افریدی اسٹیٹ",
  business_name_en: "Afridi Estate",
  society_name_ur: "گارڈن ٹاؤن · ڈاکٹرز کالونی",
  scheme_badge_ur: "گارڈن ٹاؤن",
  phase_badge_ur: "ڈاکٹرز کالونی فیز 3",
  tagline_ur: "خرید و فروخت جائیداد",
  address_ur: "",
  ceo_label_ur: "سی ای او",
  ceo_name_ur: "",
  phone: "",
  header_bg_color: "#1a4d2e",
  header_accent_color: "#c9a227",
  footer_note_ur: "",
  show_manager_signature: true,
  next_serial: 1,
};

export const settingsSchema = z.object({
  business_name_ur: z.string().max(120),
  business_name_en: z.string().max(120),
  society_name_ur: z.string().max(120),
  scheme_badge_ur: z.string().max(80),
  phase_badge_ur: z.string().max(80),
  tagline_ur: z.string().max(160),
  address_ur: z.string().max(240),
  ceo_label_ur: z.string().max(40),
  ceo_name_ur: z.string().max(80),
  phone: z.string().max(30),
  header_bg_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  header_accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  footer_note_ur: z.string().max(240),
  show_manager_signature: z.boolean(),
  next_serial: z.coerce.number().int().min(1).max(999999),
});

export const saleFormSchema = z.object({
  booking_id: z.string().uuid().nullable().optional(),
  plot_id: z.string().uuid().nullable().optional(),
  form_date: z.string().min(8),
  buyer_name: z.string().trim().min(1, "خریدار کا نام درکار ہے").max(120),
  buyer_guardian_name: z.string().max(120),
  buyer_cnic: z.string().max(20),
  buyer_phone: z.string().max(30),
  buyer_address: z.string().max(300),
  seller_name: z.string().max(120),
  seller_guardian_name: z.string().max(120),
  plot_size_text: z.string().max(80),
  rate_per_marla: rupeeSchema,
  total_price: rupeeSchema,
  file_fee_commission: rupeeSchema,
  token_received: rupeeSchema,
  previous_amount: rupeeSchema,
  total_received: rupeeSchema.optional(),
  balance_amount: rupeeSchema.optional(),
  amounts_manually_edited: z.boolean().optional(),
  totals_edited: z.boolean().optional(),
  balance_due_date: z.string().nullable().optional(),
  bayana_date: z.string().nullable().optional(),
  notes: z.string().max(500),
});

export type SaleFormInput = z.infer<typeof saleFormSchema>;

export async function fetchFormSettings(dealerId: string): Promise<DealerFormSettings> {
  const sb = getSupabase();
  if (!sb) return { ...DEFAULT_FORM_SETTINGS, dealer_id: dealerId };
  const { data } = await sb
    .from("dealer_form_settings")
    .select("*")
    .eq("dealer_id", dealerId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_FORM_SETTINGS, dealer_id: dealerId };
  return data as DealerFormSettings;
}

export async function saveFormSettings(
  dealerId: string,
  patch: z.infer<typeof settingsSchema> & { logo_url?: string | null },
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const parsed = settingsSchema.parse(patch);
  const { data: maxRow } = await sb
    .from("dealer_sale_forms")
    .select("serial_no")
    .eq("dealer_id", dealerId)
    .not("serial_no", "is", null)
    .order("serial_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  const maxIssued = Number((maxRow as { serial_no?: number } | null)?.serial_no ?? 0);
  if (parsed.next_serial <= maxIssued) {
    throw new Error(`Next serial must be greater than ${maxIssued}`);
  }
  const { error } = await sb.from("dealer_form_settings").upsert(
    {
      dealer_id: dealerId,
      ...parsed,
      ...(patch.logo_url !== undefined ? { logo_url: patch.logo_url } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "dealer_id" },
  );
  if (error) throw error;
}

export async function resetFormSettings(dealerId: string): Promise<void> {
  await saveFormSettings(dealerId, {
    ...DEFAULT_FORM_SETTINGS,
    next_serial: (await fetchFormSettings(dealerId)).next_serial,
  });
}

const LOGO_MAX = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadDealerLogo(file: File): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  if (!LOGO_TYPES.includes(file.type)) throw new Error("Logo must be an image (JPG/PNG/WebP)");
  if (file.size > LOGO_MAX) throw new Error("Logo must be 2 MB or smaller");
  const { data: userData } = await sb.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not signed in");
  const ext = file.name.split(".").pop() || "png";
  const path = `${uid}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("dealer-logos").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = sb.storage.from("dealer-logos").getPublicUrl(path);
  return data.publicUrl;
}

export async function removeDealerLogo(dealerId: string, logoUrl: string | null): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  if (logoUrl) {
    try {
      const marker = "/dealer-logos/";
      const idx = logoUrl.indexOf(marker);
      if (idx >= 0) {
        const path = decodeURIComponent(logoUrl.slice(idx + marker.length));
        await sb.storage.from("dealer-logos").remove([path]);
      }
    } catch {
      /* ignore storage miss */
    }
  }
  await saveFormSettings(dealerId, {
    ...(await fetchFormSettings(dealerId)),
    logo_url: null,
  });
}

export async function allocateSerial(dealerId: string): Promise<number> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const { data, error } = await sb.rpc("allocate_dealer_form_serial", {
    p_dealer_id: dealerId,
  });
  if (error) throw error;
  return Number(data);
}

function applyComputed(input: SaleFormInput): {
  total_received: number;
  balance_amount: number;
  amounts_manually_edited: boolean;
} {
  const auto = computeTotals({
    token_received: Number(input.token_received),
    previous_amount: Number(input.previous_amount),
    total_price: Number(input.total_price),
  });
  if (editedFlag(input) && input.total_received != null && input.balance_amount != null) {
    return {
      total_received: Number(input.total_received),
      balance_amount: Number(input.balance_amount),
      amounts_manually_edited: true,
    };
  }
  return { ...auto, amounts_manually_edited: false };
}

export function isFormManuallyEdited(form: DealerSaleForm): boolean {
  return !!(form.amounts_manually_edited || form.totals_edited);
}

export async function listSaleForms(
  dealerId: string,
  opts?: { q?: string; status?: FormStatus | "all" },
): Promise<DealerSaleForm[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb
    .from("dealer_sale_forms")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (opts?.status && opts.status !== "all") q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data as DealerSaleForm[]) ?? [];
  if (opts?.q?.trim()) {
    const needle = opts.q.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.buyer_name.toLowerCase().includes(needle) ||
        String(r.serial_no).includes(needle) ||
        r.buyer_phone.includes(needle),
    );
  }
  return rows;
}

export async function fetchSaleForm(id: string): Promise<DealerSaleForm | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.from("dealer_sale_forms").select("*").eq("id", id).maybeSingle();
  return (data as DealerSaleForm) ?? null;
}

export async function fetchSaleFormByToken(token: string): Promise<DealerSaleForm | null> {
  const sb = getSupabase();
  if (!sb || !token) return null;
  const { data } = await sb
    .from("dealer_sale_forms")
    .select("*")
    .eq("public_share_token", token)
    .is("revoked_at", null)
    .in("status", ["issued", "cancelled"])
    .maybeSingle();
  const row = (data as DealerSaleForm) ?? null;
  if (row?.revoked_at) return null;
  return row;
}

export async function createSaleForm(
  dealerId: string,
  input: SaleFormInput,
  opts?: { duplicatedFrom?: string | null },
): Promise<DealerSaleForm> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const parsed = saleFormSchema.parse(input);
  const computed = applyComputed(parsed);
  const row = {
    dealer_id: dealerId,
    booking_id: parsed.booking_id ?? null,
    plot_id: parsed.plot_id ?? null,
    serial_no: null as number | null,
    form_date: parsed.form_date,
    buyer_name: parsed.buyer_name,
    buyer_guardian_name: parsed.buyer_guardian_name,
    buyer_cnic: parsed.buyer_cnic,
    buyer_phone: parsed.buyer_phone,
    buyer_address: parsed.buyer_address,
    seller_name: parsed.seller_name,
    seller_guardian_name: parsed.seller_guardian_name,
    plot_size_text: parsed.plot_size_text,
    rate_per_marla: parsed.rate_per_marla,
    total_price: parsed.total_price,
    file_fee_commission: parsed.file_fee_commission,
    token_received: parsed.token_received,
    previous_amount: parsed.previous_amount,
    total_received: computed.total_received,
    balance_amount: computed.balance_amount,
    amounts_manually_edited: computed.amounts_manually_edited,
    balance_due_date: parsed.balance_due_date || null,
    bayana_date: parsed.bayana_date || null,
    notes: parsed.notes,
    status: "draft" as const,
    public_share_token: null,
    version: 1,
    duplicated_from: opts?.duplicatedFrom ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb.from("dealer_sale_forms").insert(row).select("*").single();
  if (error) throw error;
  const created = data as DealerSaleForm;
  await writeAudit({
    actorId: dealerId,
    action: "dealer_sale_form.create",
    entityType: "dealer_sale_forms",
    entityId: created.id,
    meta: { booking_id: created.booking_id },
  });
  return created;
}

export async function updateSaleForm(
  id: string,
  dealerId: string,
  input: SaleFormInput,
): Promise<DealerSaleForm> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const existing = await fetchSaleForm(id);
  if (!existing) throw new Error("Form not found");
  if (existing.dealer_id !== dealerId) throw new Error("Not allowed");
  if (existing.status !== "draft") throw new Error("Issued forms are locked — duplicate to edit");
  const parsed = saleFormSchema.parse(input);
  const computed = applyComputed(parsed);
  const { data, error } = await sb
    .from("dealer_sale_forms")
    .update({
      booking_id: parsed.booking_id ?? null,
      plot_id: parsed.plot_id ?? null,
      form_date: parsed.form_date,
      buyer_name: parsed.buyer_name,
      buyer_guardian_name: parsed.buyer_guardian_name,
      buyer_cnic: parsed.buyer_cnic,
      buyer_phone: parsed.buyer_phone,
      buyer_address: parsed.buyer_address,
      seller_name: parsed.seller_name,
      seller_guardian_name: parsed.seller_guardian_name,
      plot_size_text: parsed.plot_size_text,
      rate_per_marla: parsed.rate_per_marla,
      total_price: parsed.total_price,
      file_fee_commission: parsed.file_fee_commission,
      token_received: parsed.token_received,
      previous_amount: parsed.previous_amount,
      total_received: computed.total_received,
      balance_amount: computed.balance_amount,
      amounts_manually_edited:
        computed.amounts_manually_edited ||
        totalsWereEdited({
          ...parsed,
          total_received: computed.total_received,
          balance_amount: computed.balance_amount,
        } as never),
      balance_due_date: parsed.balance_due_date || null,
      bayana_date: parsed.bayana_date || null,
      notes: parsed.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("dealer_id", dealerId)
    .select("*")
    .single();
  if (error) throw error;
  return data as DealerSaleForm;
}

export async function issueSaleForm(id: string, actorId: string): Promise<DealerSaleForm> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const existing = await fetchSaleForm(id);
  if (!existing) throw new Error("Form not found");
  if (existing.status === "cancelled") throw new Error("Cancelled forms cannot be re-issued");
  if (existing.status !== "draft") throw new Error("Only drafts can be issued");
  const serial =
    existing.serial_no != null ? existing.serial_no : await allocateSerial(existing.dealer_id);
  const token = existing.public_share_token || makeShareToken();
  const settings = await fetchFormSettings(existing.dealer_id);
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("dealer_sale_forms")
    .update({
      status: "issued",
      serial_no: serial,
      public_share_token: token,
      revoked_at: null,
      issued_at: now,
      header_snapshot: settings,
      updated_at: now,
    })
    .eq("id", id)
    .eq("status", "draft")
    .select("*")
    .single();
  if (error) throw error;
  await writeAudit({
    actorId,
    action: "dealer_sale_form.issue",
    entityType: "dealer_sale_forms",
    entityId: id,
    meta: { serial_no: serial },
  });
  return data as DealerSaleForm;
}

export async function cancelSaleForm(id: string, actorId: string): Promise<DealerSaleForm> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const existing = await fetchSaleForm(id);
  if (!existing) throw new Error("Form not found");
  const now = new Date().toISOString();
  // Keep public_share_token so cancelled watermark can still render until revoked.
  const { data, error } = await sb
    .from("dealer_sale_forms")
    .update({
      status: "cancelled",
      cancelled_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await writeAudit({
    actorId,
    action: "dealer_sale_form.cancel",
    entityType: "dealer_sale_forms",
    entityId: id,
    meta: { serial_no: existing.serial_no },
  });
  return data as DealerSaleForm;
}

export async function revokeShareToken(id: string, actorId: string): Promise<DealerSaleForm> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("dealer_sale_forms")
    .update({
      public_share_token: null,
      revoked_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await writeAudit({
    actorId,
    action: "dealer_sale_form.revoke_share",
    entityType: "dealer_sale_forms",
    entityId: id,
    meta: {},
  });
  return data as DealerSaleForm;
}

export async function regenerateShareToken(id: string, actorId: string): Promise<DealerSaleForm> {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not connected");
  const existing = await fetchSaleForm(id);
  if (!existing) throw new Error("Form not found");
  if (existing.status !== "issued") throw new Error("Only issued forms can share");
  const token = makeShareToken();
  const { data, error } = await sb
    .from("dealer_sale_forms")
    .update({
      public_share_token: token,
      revoked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await writeAudit({
    actorId,
    action: "dealer_sale_form.regenerate_share",
    entityType: "dealer_sale_forms",
    entityId: id,
    meta: {},
  });
  return data as DealerSaleForm;
}

export async function duplicateSaleForm(
  id: string,
  dealerId: string,
): Promise<DealerSaleForm> {
  const existing = await fetchSaleForm(id);
  if (!existing || existing.dealer_id !== dealerId) throw new Error("Form not found");
  return createSaleForm(
    dealerId,
    {
      booking_id: existing.booking_id,
      plot_id: existing.plot_id,
      form_date: new Date().toISOString().slice(0, 10),
      buyer_name: existing.buyer_name,
      buyer_guardian_name: existing.buyer_guardian_name,
      buyer_cnic: existing.buyer_cnic,
      buyer_phone: existing.buyer_phone,
      buyer_address: existing.buyer_address,
      seller_name: existing.seller_name,
      seller_guardian_name: existing.seller_guardian_name,
      plot_size_text: existing.plot_size_text,
      rate_per_marla: existing.rate_per_marla,
      total_price: existing.total_price,
      file_fee_commission: existing.file_fee_commission,
      token_received: existing.token_received,
      previous_amount: existing.previous_amount,
      amounts_manually_edited: isFormManuallyEdited(existing),
      total_received: existing.total_received,
      balance_amount: existing.balance_amount,
      balance_due_date: existing.balance_due_date,
      bayana_date: existing.bayana_date,
      notes: existing.notes,
    },
    { duplicatedFrom: existing.id },
  );
}

export function toPublicSaleFormView(
  form: DealerSaleForm,
  header: DealerFormSettings,
): PublicSaleFormView {
  return {
    serial_no: form.serial_no,
    form_date: form.form_date,
    buyer_name: form.buyer_name,
    buyer_guardian_name: form.buyer_guardian_name,
    buyer_cnic_masked: maskCnic(form.buyer_cnic),
    buyer_phone_masked: maskPhone(form.buyer_phone),
    buyer_address: form.buyer_address,
    seller_name: form.seller_name,
    seller_guardian_name: form.seller_guardian_name,
    plot_size_text: form.plot_size_text,
    rate_per_marla: Number(form.rate_per_marla),
    total_price: Number(form.total_price),
    file_fee_commission: Number(form.file_fee_commission),
    token_received: Number(form.token_received),
    previous_amount: Number(form.previous_amount),
    total_received: Number(form.total_received),
    balance_amount: Number(form.balance_amount),
    amounts_manually_edited: isFormManuallyEdited(form),
    balance_due_date: form.balance_due_date,
    bayana_date: form.bayana_date,
    status: form.status,
    header,
  };
}

/** Build a DealerSaleForm-shaped object for the sheet from a public view (masked PII). */
export function publicViewAsSheetForm(view: PublicSaleFormView): DealerSaleForm {
  return {
    id: "public",
    dealer_id: "public",
    booking_id: null,
    plot_id: null,
    serial_no: view.serial_no ?? 0,
    form_date: view.form_date,
    buyer_name: view.buyer_name,
    buyer_guardian_name: view.buyer_guardian_name,
    buyer_cnic: view.buyer_cnic_masked,
    buyer_phone: view.buyer_phone_masked,
    buyer_address: view.buyer_address,
    seller_name: view.seller_name,
    seller_guardian_name: view.seller_guardian_name,
    plot_size_text: view.plot_size_text,
    rate_per_marla: view.rate_per_marla,
    total_price: view.total_price,
    file_fee_commission: view.file_fee_commission,
    token_received: view.token_received,
    previous_amount: view.previous_amount,
    total_received: view.total_received,
    balance_amount: view.balance_amount,
    amounts_manually_edited: view.amounts_manually_edited,
    balance_due_date: view.balance_due_date,
    bayana_date: view.bayana_date,
    notes: "",
    status: view.status,
    public_share_token: null,
    created_at: "",
    updated_at: "",
  };
}

/** Auto-fill draft fields from booking + customer_details + payments. */
export async function autofillFromBooking(bookingId: string): Promise<Partial<SaleFormInput>> {
  const sb = getSupabase();
  if (!sb) return {};
  const { data: b } = await sb.from("bookings").select("*").eq("id", bookingId).maybeSingle();
  if (!b) return {};
  const booking = b as Booking;
  let plot_size_text = "";
  let rate_per_marla = 0;
  let total_price = 0;
  let plot_id: string | null = booking.plot_id;
  if (booking.plot_id) {
    const { data: plot } = await sb
      .from("plots")
      .select("id, block, plot_no, size_marla, base_price")
      .eq("id", booking.plot_id)
      .maybeSingle();
    if (plot) {
      const size = Number(plot.size_marla) || 0;
      const price = Number(plot.base_price) || 0;
      plot_size_text = `${plot.block}-${plot.plot_no} · ${size} مرلہ`;
      total_price = Math.round(price);
      rate_per_marla = size > 0 ? Math.round(price / size) : 0;
    }
  }
  let buyer_name = booking.customer_name ?? "";
  let buyer_cnic = "";
  let buyer_phone = "";
  let buyer_address = "";
  if (booking.customer_id) {
    const [{ data: profile }, { data: cust }] = await Promise.all([
      sb.from("profiles").select("full_name, email").eq("id", booking.customer_id).maybeSingle(),
      sb
        .from("customer_details")
        .select("cnic_number, contact_phone, address")
        .eq("profile_id", booking.customer_id)
        .maybeSingle(),
    ]);
    buyer_name = (profile?.full_name as string) || buyer_name || (profile?.email as string) || "";
    buyer_cnic = (cust?.cnic_number as string) || "";
    buyer_phone = (cust?.contact_phone as string) || "";
    buyer_address = (cust?.address as string) || "";
  }
  const { data: pays } = await sb
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("due_date", { ascending: true });
  const payments = (pays as Payment[]) ?? [];
  const confirmed = payments.filter((p) => p.status === "confirmed" || !!p.paid_at);
  const tokenLike = confirmed.filter((p) =>
    /token|down/i.test(p.label ?? ""),
  );
  const token_received =
    tokenLike.reduce((s, p) => s + Math.round(Number(p.amount) + Number(p.late_fee || 0)), 0) ||
    Math.round(Number(booking.token_amount) || 0);
  const previous_amount = confirmed
    .filter((p) => !tokenLike.includes(p))
    .reduce((s, p) => s + Math.round(Number(p.amount) + Number(p.late_fee || 0)), 0);
  const pending = payments.find((p) => p.status === "pending" && !p.paid_at);
  const balance_due_date = pending?.due_date ?? null;
  const auto = computeTotals({
    token_received,
    previous_amount,
    total_price,
  });
  return {
    booking_id: bookingId,
    plot_id,
    form_date: new Date().toISOString().slice(0, 10),
    buyer_name,
    buyer_guardian_name: "",
    buyer_cnic,
    buyer_phone,
    buyer_address,
    seller_name: "",
    seller_guardian_name: "",
    plot_size_text,
    rate_per_marla,
    total_price,
    file_fee_commission: 0,
    token_received,
    previous_amount,
    total_received: auto.total_received,
    balance_amount: auto.balance_amount,
    amounts_manually_edited: false,
    balance_due_date,
    bayana_date: booking.created_at?.slice(0, 10) ?? null,
    notes: booking.reference_no ? `بکنگ ${booking.reference_no}` : "",
  };
}

export function whatsappShareUrl(phone: string, message: string): string | null {
  const norm = normalizePkPhone(phone);
  if (!norm) return null;
  const digits = norm.replace("+", "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function publicFormPath(token: string): string {
  return `/f/${token}`;
}
