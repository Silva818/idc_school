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
    <div
      key={locale}
      className="fixed inset-x-0 bottom-0 z-[9999] p-3 md:inset-auto md:bottom-6 md:right-6 md:p-0"
    >
      {/* Card — в стиле твоих блоков (Pricing) */}
      <div className="mx-auto w-full max-w-xl md:max-w-sm rounded-3xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm shadow-soft">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pr-2">
            <div className="text-[15px] sm:text-base font-semibold text-white">
              {t("title")}
            </div>
            <div className="mt-1 text-[13px] sm:text-sm text-brand-muted leading-relaxed">
              {t("description")}
            </div>
          </div>

          <button
            onClick={rejectAll}
            className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-brand-muted hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t("closeReject")}
            title={t("closeReject")}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {!isCustomizeOpen ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={openCustomize}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13px] sm:text-sm font-semibold text-brand-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                {t("customize")}
              </button>

              <button
                onClick={rejectAll}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13px] sm:text-sm font-semibold text-brand-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                {t("rejectAll")}
              </button>

              <button
                onClick={acceptAll}
                className="rounded-full bg-brand-primary px-4 py-2 text-[13px] sm:text-sm font-semibold text-white shadow-soft hover:bg-brand-primary/90 transition-colors"
              >
                {t("acceptAll")}
              </button>
            </div>

            <div className="text-[11px] text-brand-muted/80">
              {t("hint")}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] sm:text-sm font-semibold text-white">
                    {t("necessaryTitle")}
                  </div>
                  <div className="mt-0.5 text-[11px] sm:text-xs text-brand-muted leading-relaxed">
                    {t("necessaryDesc")}
                  </div>
                </div>
                <div className="text-[11px] text-brand-muted/80">
                  {t("alwaysOn")}
                </div>
              </div>

              <div className="my-3 h-px bg-white/10" />

              <label className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] sm:text-sm font-semibold text-white">
                    {t("analyticsTitle")}
                  </div>
                  <div className="mt-0.5 text-[11px] sm:text-xs text-brand-muted leading-relaxed">
                    {t("analyticsDesc")}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={toggles.analytics}
                  onChange={(e) =>
                    setToggles((s) => ({ ...s, analytics: e.target.checked }))
                  }
                  className="mt-1 h-5 w-5 accent-white"
                />
              </label>

              <div className="my-3 h-px bg-white/10" />

              <label className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] sm:text-sm font-semibold text-white">
                    {t("marketingTitle")}
                  </div>
                  <div className="mt-0.5 text-[11px] sm:text-xs text-brand-muted leading-relaxed">
                    {t("marketingDesc")}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={toggles.marketing}
                  onChange={(e) =>
                    setToggles((s) => ({ ...s, marketing: e.target.checked }))
                  }
                  className="mt-1 h-5 w-5 accent-white"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={rejectAll}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[13px] sm:text-sm font-semibold text-brand-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                {t("rejectAll")}
              </button>

              <button
                onClick={saveCustom}
                className="rounded-full bg-brand-primary px-4 py-2 text-[13px] sm:text-sm font-semibold text-white shadow-soft hover:bg-brand-primary/90 transition-colors"
              >
                {t("save")}
              </button>
            </div>

            <div className="text-[11px] text-brand-muted/80">
              {t("hint")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
