import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/manzil/properties";
import {
  DEMO_OTP,
  isValidCnicLast6,
  isValidMobile,
  maskMobile,
  type WalletMethod,
} from "@/lib/manzil/mock-gateway";
import {
  chargeWallet,
  getWalletChargeMode,
  walletUiFlags,
} from "@/lib/manzil/payment-gateway.functions";

type Step = "details" | "otp" | "processing" | "failed";

/** Wallet checkout for JazzCash / EasyPaisa — DEMO chrome only when mode is mock. */
export function MockWalletCheckout({
  method,
  amount,
  onPaid,
  onCancel,
}: {
  method: WalletMethod;
  amount: number;
  onPaid: (txnId: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation("payments");
  const name = method === "jazzcash" ? "JazzCash" : "EasyPaisa";
  const [step, setStep] = useState<Step>("details");
  const [mobile, setMobile] = useState("");
  const [cnic, setCnic] = useState("");
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"live" | "mock">("mock");
  const ui = walletUiFlags(mode);

  useEffect(() => {
    let cancelled = false;
    getWalletChargeMode()
      .then((m) => {
        if (!cancelled) setMode(m[method]);
      })
      .catch(() => {
        if (!cancelled) setMode("mock");
      });
    return () => {
      cancelled = true;
    };
  }, [method]);

  const sendOtp = () => {
    if (!isValidMobile(mobile)) {
      setErr(t("invalidMobile"));
      return;
    }
    if (method === "jazzcash" && !isValidCnicLast6(cnic)) {
      setErr(t("invalidCnicLast6"));
      return;
    }
    setErr(null);
    setStep("otp");
  };
  const verify = async () => {
    setErr(null);
    setStep("processing");
    await new Promise((r) => setTimeout(r, 1600));
    const res = await chargeWallet({ data: { method, mobile, otp, amount, cnicLast6: cnic } });
    if (res.mode) setMode(res.mode);
    if (!res.ok) {
      setErr(res.reason);
      setStep(res.reason.startsWith("Incorrect OTP") ? "otp" : "failed");
      return;
    }
    try {
      await onPaid(res.txnId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("couldNotRecord"));
      setStep("failed");
    }
  };

  return (
    <div className={`wallet-checkout wallet-${method}`}>
      <div className="wallet-brand">
        <Smartphone size={18} />
        <strong>{name}</strong>
        {ui.showDemoBadge && <span className="wallet-demo">DEMO</span>}
        {!ui.showDemoBadge && (
          <span className="wallet-demo wallet-live">{t("liveBadge")}</span>
        )}
      </div>
      <div className="wallet-amount">{formatPrice(amount)}</div>

      {step === "details" && (
        <>
          <label>
            {name} {t("mobileNumber")}
            <input
              inputMode="tel"
              autoFocus
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="03xx xxxxxxx"
            />
          </label>
          {method === "jazzcash" && (
            <label>
              {t("cnicLast6")}
              <input
                inputMode="numeric"
                maxLength={6}
                value={cnic}
                onChange={(e) => setCnic(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
            </label>
          )}
          {err && <div className="error">{err}</div>}
          <div className="link-row">
            <Button size="sm" onClick={sendOtp}>
              {t("continue")}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </>
      )}

      {step === "otp" && (
        <>
          <p className="muted small">{t("otpSentTo", { mobile: maskMobile(mobile) })}</p>
          {ui.showDemoOtpHint && (
            <div className="notice small">
              {t("demoOtpHint", { code: DEMO_OTP })}
            </div>
          )}
          {!ui.showDemoOtpHint && (
            <div className="notice small">{t("liveOtpHint")}</div>
          )}
          <label>
            {t("enterOtp")}
            <input
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          {err && <div className="error">{err}</div>}
          <div className="link-row">
            <Button size="sm" disabled={otp.length !== 6} onClick={() => void verify()}>
              {t("payAmount", { amount: formatPrice(amount) })}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStep("details");
                setOtp("");
                setErr(null);
              }}
            >
              {t("back")}
            </Button>
          </div>
        </>
      )}

      {step === "processing" && (
        <div className="wallet-processing">
          <Loader2 className="spin" size={28} />
          <span>{t("processingWith", { name })}</span>
        </div>
      )}

      {step === "failed" && (
        <>
          <div className="error">{err}</div>
          <div className="link-row">
            <Button
              size="sm"
              onClick={() => {
                setStep("details");
                setOtp("");
                setErr(null);
              }}
            >
              {t("tryAgain")}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </div>
        </>
      )}

      {ui.showDemoFoot ? (
        <p className="muted small wallet-foot">
          <ShieldCheck size={13} />
          {t("demoFoot")}
        </p>
      ) : (
        <p className="muted small wallet-foot">
          <ShieldCheck size={13} />
          {t("liveFoot")}
        </p>
      )}
    </div>
  );
}
