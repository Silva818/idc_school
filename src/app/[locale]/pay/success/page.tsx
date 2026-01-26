"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { track } from "@/lib/track";

type PurchasePayload = {
  transaction_id: string;        // id_payment
  tariff_id?: string;            // Tag
  currency?: "EUR" | "USD";      // AMD нет
  value?: number;                // Sum
  site_language?: "ru" | "en";   // locale
};

type CheckPaymentResp =
  | {
      ok: true;
      status?: string;
      paid?: boolean;
      tgToken?: string | null;
      locale?: "en" | "ru"; // ✅ optional (на будущее, если вернёшь из /api/check-payment)
      purchasePayload?: PurchasePayload; // ✅ здесь
      bank?: {
        status?: string;
        code?: string;
        reason?: string;
        paymentState?: string;
        orderStatus?: string;     
      };
    }
  | {
      ok?: boolean;
      error?: string;
      details?: string;
      tgToken?: string | null;
      locale?: "en" | "ru"; // ✅ optional
      purchasePayload?: PurchasePayload; // ✅ и здесь
      bank?: any;
    };

function useLocalePrefix() {
  const pathname = usePathname();
  return pathname.startsWith("/ru") ? "/ru" : "";
}

function mapAmeriaDeclineReason(
  codeRaw: string | undefined,
  t: (k: string) => string
) {
  const code = String(codeRaw ?? "").trim();

  if (code === "0116") return t("declineReasons.notEnoughMoney");
  if (code === "0101") return t("declineReasons.expiredCard");
  if (code === "071015") return t("declineReasons.wrongCardData");
  if (code === "0100" || code === "0104" || code === "0125")
    return t("declineReasons.cardDeclined");
  if (code === "02001") return t("declineReasons.fraud");
  if (code === "0151018" || code === "0151019" || code === "0-1")
    return t("declineReasons.processingTimeout");
  if (code === "0-2007") return t("declineReasons.paymentTimeLimit");
  if (code === "0-2013") return t("declineReasons.attemptsExpired");
  if (code === "02003") return t("declineReasons.sslRestricted");

  return t("declineReasons.generic");
}

export default function PaySuccessPage() {
  const t = useTranslations("pay");
  const pref = useLocalePrefix();
  const searchParams = useSearchParams();

  const debug = useMemo(
    () => searchParams?.get("debug") === "1",
    [searchParams]
  );
  const noRedirect = useMemo(
    () => searchParams?.get("noRedirect") === "1",
    [searchParams]
  );

  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<CheckPaymentResp | null>(null);
  const [paymentId, setPaymentId] = useState<string>("");
  const [tgToken, setTgToken] = useState<string>("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const pid =
      sp.get("paymentID") ||
      sp.get("PaymentID") ||
      sp.get("paymentId") ||
      sp.get("id") ||
      "";

    setPaymentId(pid);

    if (!pid) {
      setLoading(false);
      setResp({ ok: false, error: t("errors.noPaymentId") });
      return;
    }

    localStorage.setItem("ameriaPaymentId", pid);

    const run = async () => {
      try {
        setLoading(true);

        const r = await fetch("/api/check-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: pid }),
          cache: "no-store",
        });

        const json = (await r.json().catch(() => ({}))) as any;
        setResp(json);

        const token = String(json?.tgToken ?? "").trim();
        if (token) setTgToken(token);

        const s = String(json?.status ?? "").toLowerCase();
        if (!noRedirect && s === "pending") {
          window.location.href = `${pref}/pay/pending`;
          return;
        }
      } catch (e: any) {
        setResp({ ok: false, error: e?.message ?? t("errors.checkFailed") });
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noRedirect]);

  useEffect(() => {
    if (!paymentId || !resp) return;
  
    const status = String((resp as any)?.status ?? "").toLowerCase();
    const isPaid = status === "paid" || (resp as any)?.paid === true;
    if (!isPaid) return;
  
    const payload = (resp as any)?.purchasePayload ?? {};
const transactionId = String(payload?.transaction_id ?? paymentId).trim();
if (!transactionId) return;

const key = `ga4_purchase_sent_${transactionId}`;
if (sessionStorage.getItem(key) === "1") return;

track("purchase_made", {...payload, payment_id: transactionId,});


sessionStorage.setItem(key, "1");

  }, [paymentId, resp]);
  

  const statusLabel = (() => {
    const s = String((resp as any)?.status ?? "").toLowerCase();
    if (s === "paid") return "PAID";
    if (s === "pending") return "PENDING";
    if (s === "declined") return "DECLINED";
    if (s === "canceled") return "CANCELED";
    if (s === "refunded") return "REFUNDED";
    if (s === "error") return "ERROR";
    if ((resp as any)?.paid === true) return "PAID";
    if ((resp as any)?.paid === false) return "PENDING";
    return resp ? "UNKNOWN" : "LOADING";
  })();

  const title =
    statusLabel === "PAID"
      ? t("titles.paid")
      : statusLabel === "PENDING"
      ? t("titles.pending")
      : statusLabel === "DECLINED"
      ? t("titles.declined")
      : statusLabel === "CANCELED"
      ? t("titles.canceled")
      : statusLabel === "REFUNDED"
      ? t("titles.refunded")
      : statusLabel === "ERROR"
      ? t("titles.error")
      : t("titles.unknown");

  const subtitle = (() => {
    if (loading) return t("subtitles.loading");

    if (statusLabel === "PAID") return t("subtitles.paid");
    if (statusLabel === "PENDING") return t("subtitles.pending");

    if (statusLabel === "DECLINED") {
      const code = (resp as any)?.bank?.code;
      return mapAmeriaDeclineReason(code, t);
    }

    if (statusLabel === "CANCELED") return t("subtitles.canceled");
    if (statusLabel === "REFUNDED") return t("subtitles.refunded");
    if (statusLabel === "ERROR") return t("subtitles.error");

    return t("subtitles.unknown");
  })();

  const showDebug = debug || noRedirect;

  const botUrl = tgToken
    ? `https://t.me/IDCMAIN_bot?start=${encodeURIComponent(tgToken)}`
    : "https://t.me/IDCMAIN_bot";

  return (
    <main className="min-h-screen bg-[#050816] flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-soft px-6 py-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-muted mb-3">
            {t("labels.payment")}
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-white mb-4">
            {title}
          </h1>

          <p className="text-sm text-brand-muted">{subtitle}</p>

          {statusLabel === "PAID" ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
              <p className="text-sm font-semibold text-white">
                {t("telegram.title")}
              </p>
              <p className="mt-2 text-sm text-brand-muted leading-relaxed">
                {t("telegram.desc")}
              </p>

              <a
                href={botUrl}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold shadow-soft hover:bg-brand-primary/90 transition-colors"
              >
                {t("telegram.button")}
              </a>

              {showDebug && tgToken ? (
                <p className="mt-3 text-[11px] text-brand-muted break-all">
                  tg_link_token: <span className="text-white/90">{tgToken}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            {(statusLabel === "DECLINED" ||
              statusLabel === "CANCELED" ||
              statusLabel === "ERROR") && (
              <a
                href={`${pref}/#pricing`}
                className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold shadow-soft hover:bg-brand-primary/90 transition-colors"
              >
                {t("actions.tryAgain")}
              </a>
            )}

            <a
              href={`${pref}/#pricing`}
              className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              {t("actions.backToSite")}
            </a>

            {showDebug ? (
              <a
                href={`${pref}/pay/ameria/return?noRedirect=1`}
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-brand-muted hover:bg-white/5 transition-colors"
              >
                Debug return
              </a>
            ) : null}
          </div>

          {showDebug && !!paymentId ? (
            <p className="mt-6 text-xs text-brand-muted break-all">
              PaymentID:{" "}
              <span className="text-white font-semibold">{paymentId}</span>
            </p>
          ) : null}
        </div>

        {showDebug && resp ? (
          <details className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <summary className="cursor-pointer text-sm text-white/90 text-center">
              {t("labels.techDetails")}
            </summary>
            <pre className="mt-3 text-xs text-white/80 whitespace-pre-wrap">
              {JSON.stringify(resp, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    </main>
  );
}
