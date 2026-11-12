import { createServerFn } from "@tanstack/react-start";
import { checkRateLimit } from "./security";

/**
 * Signup OTP. Live channels: email via RESEND_API_KEY (+ optional OTP_FROM_EMAIL),
 * SMS via TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM.
 * Stateless: the client keeps a signed token (expiry + HMAC of email|phone|code);
 * the code itself never leaves the server except through the channel.
 */
const TTL_MS = 10 * 60 * 1000;

function env(k: string): string | undefined {
  const v = process.env[k];
  return v && v.trim() ? v.trim() : undefined;
}

function signingKey(): string | undefined {
  return env("OTP_SECRET") ?? env("RESEND_API_KEY") ?? env("TWILIO_AUTH_TOKEN");
}

async function hmac(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("92")) return `+${d}`;
  if (d.startsWith("0")) return `+92${d.slice(1)}`;
  return d ? `+${d}` : "";
}

export const sendSignupOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; phone?: string }) => ({
    email: String(d.email ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 255),
    phone: String(d.phone ?? "")
      .trim()
      .slice(0, 20),
  }))
  .handler(async ({ data }) => {
    const rl = checkRateLimit(`otp:${data.email}`, 8, 60_000);
    if (!rl.ok) throw new Error("Too many verification codes requested. Please wait a minute.");
    const resend = env("RESEND_API_KEY");
    const tw = {
      sid: env("TWILIO_ACCOUNT_SID"),
      token: env("TWILIO_AUTH_TOKEN"),
      from: env("TWILIO_FROM"),
    };
    const smsReady = !!(tw.sid && tw.token && tw.from) && !!data.phone;
    const key = signingKey();
    if ((!resend && !smsReady) || !key)
      return { mode: "mock" as const, token: "", channels: [] as string[] };

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1000000).padStart(6, "0");
    const exp = Date.now() + TTL_MS;
    const phone = normPhone(data.phone);
    const sig = await hmac(key, `${data.email}|${phone}|${code}|${exp}`);
    const text = `Your ManzilIQ verification code is ${code}. It expires in 10 minutes.`;
    const channels: string[] = [];

    if (resend) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env("OTP_FROM_EMAIL") ?? "ManzilIQ <onboarding@resend.dev>",
          to: [data.email],
          subject: "Your ManzilIQ verification code",
          text,
        }),
      });
      if (r.ok) channels.push("email");
      else console.error("otp email failed", r.status, await r.text());
    }
    if (smsReady) {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${tw.sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${tw.sid}:${tw.token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: phone, From: tw.from!, Body: text }),
      });
      if (r.ok) channels.push("sms");
      else console.error("otp sms failed", r.status, await r.text());
    }
    if (channels.length === 0)
      throw new Error("Could not send the verification code. Please try again.");
    return { mode: "live" as const, token: `${exp}.${sig}`, channels };
  });

export const verifySignupOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; phone?: string; code: string; token: string }) => ({
    email: String(d.email ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 255),
    phone: String(d.phone ?? "")
      .trim()
      .slice(0, 20),
    code: String(d.code ?? "")
      .replace(/\D/g, "")
      .slice(0, 6),
    token: String(d.token ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const key = signingKey();
    const [expStr, sig] = data.token.split(".");
    const exp = Number(expStr);
    if (!key || !sig || !exp)
      return { ok: false, reason: "Verification expired. Please request a new code." };
    if (Date.now() > exp)
      return { ok: false, reason: "This code has expired. Please request a new one." };
    const expect = await hmac(key, `${data.email}|${normPhone(data.phone)}|${data.code}|${exp}`);
    return expect === sig
      ? { ok: true, reason: "" }
      : { ok: false, reason: "Incorrect code. Please check and try again." };
  });
