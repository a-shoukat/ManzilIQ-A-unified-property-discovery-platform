import { describe, expect, it } from "vitest";
import { summarizeMode, type BackendFeature } from "@/lib/manzil/features";
import { checkRateLimit, SECURITY_CHECKLIST } from "@/lib/manzil/security";
import { buildMapPins, mapsEmbedUrl } from "@/lib/manzil/maps-geo";
import { DEMO_OTP, simulateCharge } from "@/lib/manzil/mock-gateway";

function allOff(): Record<BackendFeature, boolean> {
  return {
    supabase: true,
    otp_email: false,
    otp_sms: false,
    notify_email: false,
    notify_sms: false,
    notify_fcm: false,
    payments_live: false,
    reminders: false,
    ai_remote: false,
    maps_js: false,
  };
}

describe("feature flags / health mode", () => {
  it("demo when no live channels", () => {
    expect(summarizeMode(allOff())).toBe("demo");
  });
  it("partial with a few channels", () => {
    expect(summarizeMode({ ...allOff(), otp_email: true, notify_sms: true })).toBe("partial");
  });
  it("live when many channels on", () => {
    expect(
      summarizeMode({
        ...allOff(),
        otp_email: true,
        otp_sms: true,
        notify_email: true,
        notify_sms: true,
        notify_fcm: true,
        payments_live: true,
      }),
    ).toBe("live");
  });
});

describe("security rate limit", () => {
  it("allows then blocks", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).ok).toBe(false);
  });
  it("checklist is non-empty", () => {
    expect(SECURITY_CHECKLIST.length).toBeGreaterThan(5);
  });
});

describe("maps geo helpers", () => {
  it("builds pins", () => {
    const pins = buildMapPins([{ id: "1", title: "A", lat: 32.1, lng: 74.8, price: 1 }]);
    expect(pins[0]?.position.lat).toBe(32.1);
  });
  it("embed url encodes query", () => {
    expect(mapsEmbedUrl("Narowal")).toContain("Narowal");
  });
});

describe("mock gateway preserved", () => {
  it("demo otp still works", () => {
    expect(simulateCharge("jazzcash", "03001234567", DEMO_OTP).ok).toBe(true);
  });
});
