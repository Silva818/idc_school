"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type ConsentChoice = "all" | "necessary" | "custom";
type ConsentState = {
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = "cookie_consent_v1";

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function gtagConsentUpdate(consent: {
  analytics_storage: "granted" | "denied";
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
}) {
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  gtag("consent", "update", consent);
}

export default function CookieConsentBanner() {
  const t = useTranslations("cookie");
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  const [toggles, setToggles] = useState<ConsentState>({
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const saved = safeParse<{
      choice: ConsentChoice;
      consent: ConsentState;
      ts: number;
      locale: string;
    }>(localStorage.getItem(STORAGE_KEY));

    if (!saved) {
      setIsOpen(true);
      return;
    }

    const analyticsGranted = !!saved.consent.analytics;
    const marketingGranted = !!saved.consent.marketing;

    gtagConsentUpdate({
      analytics_storage: analyticsGranted ? "granted" : "denied",
      ad_storage: marketingGranted ? "granted" : "denied",
      ad_user_data: marketingGranted ? "granted" : "denied",
      ad_personalization: marketingGranted ? "granted" : "denied",
    });
  }, []);

  const consentFromToggles = useMemo(() => {
    const analyticsGranted = toggles.analytics;
    const marketingGranted = toggles.marketing;
    return {
      analytics_storage: analyticsGranted ? "granted" : "denied",
      ad_storage: marketingGranted ? "granted" : "denied",
      ad_user_data: marketingGranted ? "granted" : "denied",
      ad_personalization: marketingGranted ? "granted" : "denied",
    } as const;
  }, [toggles.analytics, toggles.marketing]);

  function persist(choice: ConsentChoice, consent: ConsentState) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ choice, consent, ts: Date.now(), locale })
    );
  }

  function acceptAll() {
    const consent: ConsentState = { analytics: true, marketing: true };
    persist("all", consent);
    gtagConsentUpdate({
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
    setIsOpen(false);
    setIsCustomizeOpen(false);
  }

  function rejectAll() {
    const consent: ConsentState = { analytics: false, marketing: false };
    persist("necessary", consent);
    gtagConsentUpdate({
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    setIsOpen(false);
    setIsCustomizeOpen(false);
  }

  function saveCustom() {
    persist("custom", toggles);
    gtagConsentUpdate(consentFromToggles);
    setIsOpen(false);
    setIsCustomizeOpen(false);
  }

  function openCustomize() {
    setIsCustomizeOpen(true);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] p-3 md:inset-auto md:bottom-6 md:right-6 md:p-0">
      {/* Card */}
      <div className="mx-auto w-full max-w-xl md:max-w-sm rounded-2xl border border-white/10 bg-brand-dark/90 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-white">
              {t("title")}
            </div>
            <div className="mt-1 text-sm text-white/70 leading-relaxed">
              {t("description")}
            </div>
          </div>

          <button
            onClick={rejectAll}
            className="shrink-0 rounded-lg p-2 text-white/60 hover:text-white telling:bg-white/10 hover:bg-white/10 transition"
            aria-label={t("closeReject")}
            title={t("closeReject")}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {!isCustomizeOpen ? (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-end gap-2">
              {/* Customize icon button */}
              <button
                onClick={openCustomize}
                className="rounded-xl px-3 py-2 text-sm bg-white/5 hover:bg-white/10 text-white/80 transition"
                aria-label={t("customize")}
                title={t("customize")}
              >
                {t("customize")}
              </button>

              <button
                onClick={rejectAll}
                className="rounded-xl px-3 py-2 text-sm bg-white/5 hover:bg-white/10 text-white/80 transition"
              >
                {t("rejectAll")}
              </button>

              <button
                onClick={acceptAll}
                className="rounded-xl px-3 py-2 text-sm bg-white text-black hover:bg-white/90 transition font-semibold"
              >
                {t("acceptAll")}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t("necessaryTitle")}</div>
                  <div className="text-xs text-white/65">
                    {t("necessaryDesc")}
                  </div>
                </div>
                <div className="text-xs text-white/60">{t("alwaysOn")}</div>
              </div>

              <div className="h-px bg-white/10" />

              <label className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t("analyticsTitle")}</div>
                  <div className="text-xs text-white/65">
                    {t("analyticsDesc")}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={toggles.analytics}
                  onChange={(e) =>
                    setToggles((s) => ({ ...s, analytics: e.target.checked }))
                  }
                  className="h-5 w-5 accent-white"
                />
              </label>

              <div className="h-px bg-white/10" />

              <label className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t("marketingTitle")}</div>
                  <div className="text-xs text-white/65">
                    {t("marketingDesc")}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={toggles.marketing}
                  onChange={(e) =>
                    setToggles((s) => ({ ...s, marketing: e.target.checked }))
                  }
                  className="h-5 w-5 accent-white"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={rejectAll}
                className="rounded-xl px-3 py-2 text-sm bg-white/5 hover:bg-white/10 text-white/80 transition"
              >
                {t("rejectAll")}
              </button>

              <button
                onClick={saveCustom}
                className="rounded-xl px-3 py-2 text-sm bg-white text-black hover:bg-white/90 transition font-semibold"
              >
                {t("save")}
              </button>
            </div>

            <div className="text-[11px] text-white/50 leading-relaxed">
              {t("hint")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
