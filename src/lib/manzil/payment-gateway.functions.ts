import { createServerFn } from "@tanstack/react-start";
import { createHash } from "node:crypto";
import { serverEnv } from "./env-server";
import { checkRateLimit } from "./security";
import {
  DEMO_OTP,
  DECLINE_SUFFIX,
  makeTxnId,
  normalizeMobile,
  type WalletMethod,
  type ChargeResult,
} from "./mock-gateway";

function jazzConfigured(): boolean {
  return !!(
    serverEnv("JAZZCASH_MERCHANT_ID") &&
    serverEnv("JAZZCASH_PASSWORD") &&
    serverEnv("JAZZCASH_INTEGRITY_SALT")
  );
}

function easyConfigured(): boolean {
  return !!(serverEnv("EASYPAISA_STORE_ID") && serverEnv("EASYPAISA_PASSWORD"));
}

function mockCharge(method: WalletMethod, mobile: string, otp: string): ChargeResult {
  if (otp.trim() !== DEMO_OTP) {
    return { ok: false, reason: "Incorrect OTP. Please check the code and try again." };
  }
  if (normalizeMobile(mobile).endsWith(DECLINE_SUFFIX)) {
    return {
      ok: false,
      reason: `Insufficient balance in your ${method === "jazzcash" ? "JazzCash" : "EasyPaisa"} account.`,
    };
  }
  return { ok: true, txnId: makeTxnId(method) };
}

/** JazzCash MWALLET-style sandbox charge (HMAC integrity). Falls back to mock when unset. */
async function jazzcashCharge(
  mobile: string,
  amount: number,
  cnicLast6: string,
): Promise<ChargeResult> {
  const merchantId = serverEnv("JAZZCASH_MERCHANT_ID")!;
  const password = serverEnv("JAZZCASH_PASSWORD")!;
  const salt = serverEnv("JAZZCASH_INTEGRITY_SALT")!;
  const endpoint =
    serverEnv("JAZZCASH_API_URL") ??
    "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction";
  const txnRef = `JC${Date.now()}`;
  const amt = String(Math.round(amount * 100)); // paisa
  const billRef = txnRef;
  const desc = "ManzilIQ payment";
  const txnDateTime = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const expiry = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const pp_MobileNumber = normalizeMobile(mobile);
  const pp_CNIC = cnicLast6;
  // Integrity hash field order per JazzCash docs (subset for MWALLET)
  const hashFields = [
    amt,
    billRef,
    desc,
    "PKR",
    "MWALLET",
    merchantId,
    password,
    pp_MobileNumber,
    pp_CNIC,
    txnDateTime,
    expiry,
    txnRef,
    "1.1",
  ];
  const hash = createHash("sha256")
    .update(salt + "&" + hashFields.join("&"))
    .digest("hex");
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pp_Version: "1.1",
        pp_TxnType: "MWALLET",
        pp_Language: "EN",
        pp_MerchantID: merchantId,
        pp_Password: password,
        pp_TxnRefNo: txnRef,
        pp_Amount: amt,
        pp_TxnCurrency: "PKR",
        pp_TxnDateTime: txnDateTime,
        pp_BillReference: billRef,
        pp_Description: desc,
        pp_TxnExpiryDateTime: expiry,
        pp_MobileNumber: pp_MobileNumber,
        pp_CNIC: pp_CNIC,
        pp_SecureHash: hash,
      }),
    });
    const json = (await r.json().catch(() => ({}))) as {
      pp_ResponseCode?: string;
      pp_ResponseMessage?: string;
      pp_RetrievalReferenceNo?: string;
    };
    if (String(json.pp_ResponseCode) === "000") {
      return { ok: true, txnId: json.pp_RetrievalReferenceNo || txnRef };
    }
    return {
      ok: false,
      reason: json.pp_ResponseMessage || `JazzCash declined (${json.pp_ResponseCode ?? r.status})`,
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "JazzCash request failed" };
  }
}

/** EasyPaisa MA payment initiate (sandbox). Falls back to mock when unset. */
async function easypaisaCharge(mobile: string, amount: number): Promise<ChargeResult> {
  const storeId = serverEnv("EASYPAISA_STORE_ID")!;
  const password = serverEnv("EASYPAISA_PASSWORD")!;
  const endpoint =
    serverEnv("EASYPAISA_API_URL") ??
    "https://easypay.easypaisa.com.pk/easypay-service/rest/v4/initiate-ma-transaction";
  const orderId = `EP${Date.now()}`;
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Credentials: btoa(`${storeId}:${password}`),
      },
      body: JSON.stringify({
        orderId,
        storeId,
        transactionAmount: amount.toFixed(2),
        transactionType: "MA",
        mobileAccountNo: normalizeMobile(mobile),
        emailAddress: serverEnv("EASYPAISA_MERCHANT_EMAIL") ?? "payments@manziliq.com",
      }),
    });
    const json = (await r.json().catch(() => ({}))) as {
      responseCode?: string;
      responseDesc?: string;
      transactionId?: string;
    };
    if (String(json.responseCode) === "0000" || r.ok) {
      return { ok: true, txnId: json.transactionId || orderId };
    }
    return {
      ok: false,
      reason: json.responseDesc || `EasyPaisa declined (${json.responseCode ?? r.status})`,
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "EasyPaisa request failed" };
  }
}

/**
 * Charge JazzCash / EasyPaisa. Uses live merchant APIs when env is set;
 * otherwise keeps the existing mock OTP / decline simulation.
 */
export const chargeWallet = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      method: WalletMethod;
      mobile: string;
      otp: string;
      amount: number;
      cnicLast6?: string;
    }) => ({
      method: (d.method === "easypaisa" ? "easypaisa" : "jazzcash") as WalletMethod,
      mobile: String(d.mobile ?? "")
        .trim()
        .slice(0, 20),
      otp: String(d.otp ?? "")
        .replace(/\D/g, "")
        .slice(0, 6),
      amount: Number(d.amount) || 0,
      cnicLast6: String(d.cnicLast6 ?? "")
        .replace(/\D/g, "")
        .slice(0, 6),
    }),
  )
  .handler(async ({ data }): Promise<ChargeResult & { mode: "live" | "mock" }> => {
    const rl = checkRateLimit(`charge:${normalizeMobile(data.mobile)}`, 20, 60_000);
    if (!rl.ok)
      return {
        ok: false,
        reason: "Too many payment attempts. Please wait a minute.",
        mode: "mock",
      };
    if (data.method === "jazzcash" && jazzConfigured()) {
      const res = await jazzcashCharge(data.mobile, data.amount, data.cnicLast6);
      return { ...res, mode: "live" };
    }
    if (data.method === "easypaisa" && easyConfigured()) {
      const res = await easypaisaCharge(data.mobile, data.amount);
      return { ...res, mode: "live" };
    }
    return { ...mockCharge(data.method, data.mobile, data.otp), mode: "mock" };
  });

export function paymentGatewayConfigured(method?: WalletMethod): boolean {
  if (method === "jazzcash") return jazzConfigured();
  if (method === "easypaisa") return easyConfigured();
  return jazzConfigured() || easyConfigured();
}
