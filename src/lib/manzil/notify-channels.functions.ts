import { createServerFn } from "@tanstack/react-start";
import { serverEnv, normPhonePk } from "./env-server";

export type NotifyChannel = "email" | "sms" | "fcm";

export async function sendEmailChannel(
  to: string,
  subject: string,
  text: string,
): Promise<{ ok: boolean; detail: string }> {
  const key = serverEnv("RESEND_API_KEY") ?? serverEnv("NOTIFY_EMAIL_API_KEY");
  if (!key) return { ok: false, detail: "email_not_configured" };
  const from =
    serverEnv("OTP_FROM_EMAIL") ??
    serverEnv("NOTIFY_FROM_EMAIL") ??
    "ManzilIQ <onboarding@resend.dev>";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!r.ok) return { ok: false, detail: `email_http_${r.status}` };
  return { ok: true, detail: "sent" };
}

export async function sendSmsChannel(
  to: string,
  text: string,
): Promise<{ ok: boolean; detail: string }> {
  const sid = serverEnv("TWILIO_ACCOUNT_SID");
  const token = serverEnv("TWILIO_AUTH_TOKEN");
  const from = serverEnv("TWILIO_FROM");
  if (!sid || !token || !from) return { ok: false, detail: "sms_not_configured" };
  const phone = normPhonePk(to);
  if (!phone) return { ok: false, detail: "invalid_phone" };
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phone, From: from, Body: text }),
  });
  if (!r.ok) return { ok: false, detail: `sms_http_${r.status}` };
  return { ok: true, detail: "sent" };
}

export async function sendFcmChannel(
  token: string,
  title: string,
  body: string,
): Promise<{ ok: boolean; detail: string }> {
  const key = serverEnv("FCM_SERVER_KEY");
  if (!key) return { ok: false, detail: "fcm_not_configured" };
  const r = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: { Authorization: `key=${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: token, notification: { title, body }, data: { title, body } }),
  });
  if (!r.ok) return { ok: false, detail: `fcm_http_${r.status}` };
  return { ok: true, detail: "sent" };
}

export async function dispatchChannels(input: {
  email?: string;
  phone?: string;
  pushTokens?: string[];
  title: string;
  body: string;
  channels?: NotifyChannel[];
}): Promise<{ results: { channel: NotifyChannel; ok: boolean; detail: string }[] }> {
  const channels = input.channels ?? (["email", "sms", "fcm"] as NotifyChannel[]);
  const results: { channel: NotifyChannel; ok: boolean; detail: string }[] = [];
  const text = `${input.title}\n\n${input.body}`;
  if (channels.includes("email")) {
    results.push(
      input.email
        ? { channel: "email", ...(await sendEmailChannel(input.email, input.title, text)) }
        : { channel: "email", ok: false, detail: "skipped_no_email" },
    );
  }
  if (channels.includes("sms")) {
    results.push(
      input.phone
        ? { channel: "sms", ...(await sendSmsChannel(input.phone, text.slice(0, 320))) }
        : { channel: "sms", ok: false, detail: "skipped_no_phone" },
    );
  }
  if (channels.includes("fcm")) {
    const tokens = input.pushTokens ?? [];
    if (tokens.length === 0)
      results.push({ channel: "fcm", ok: false, detail: "skipped_no_token" });
    else
      for (const t of tokens)
        results.push({ channel: "fcm", ...(await sendFcmChannel(t, input.title, input.body)) });
  }
  return { results };
}

/** Dispatch external channels for a notification. Secrets never leave the server. */
export const dispatchNotificationChannels = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      email?: string;
      phone?: string;
      pushTokens?: string[];
      title: string;
      body: string;
      channels?: NotifyChannel[];
    }) => ({
      email:
        String(d.email ?? "")
          .trim()
          .slice(0, 255) || undefined,
      phone:
        String(d.phone ?? "")
          .trim()
          .slice(0, 20) || undefined,
      pushTokens: Array.isArray(d.pushTokens) ? d.pushTokens.map(String).slice(0, 20) : [],
      title: String(d.title ?? "").slice(0, 200),
      body: String(d.body ?? "").slice(0, 2000),
      channels: (d.channels ?? ["email", "sms", "fcm"]) as NotifyChannel[],
    }),
  )
  .handler(async ({ data }) =>
    dispatchChannels({
      title: data.title,
      body: data.body,
      ...(data.email ? { email: data.email } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.pushTokens.length ? { pushTokens: data.pushTokens } : {}),
      ...(data.channels ? { channels: data.channels } : {}),
    }),
  );
