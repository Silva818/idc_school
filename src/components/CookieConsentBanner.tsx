"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type ConsentChoice = "all" | "necessary" | "custom";
type ConsentState = {
  analytics: boolean;
  marketing: boolean;
};

type GrantedDenied = "granted" | "denied";
type GtagConsent = {
  analytics_storage: GrantedDenied;
  ad_storage: GrantedDenied;
  ad_user_data: GrantedDenied;
  ad_personalization: GrantedDenied;
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

function gtagConsentUpdate(consent: GtagConsent) {
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
      setIsCustomizeOpen(false);
      return;
    }
  
    const analyticsGranted = !!saved.consent.analytics;
    const marketingGranted = !!saved.consent.marketing;
  
    const consent: GtagConsent = {
      analytics_storage: analyticsGranted ? "granted" : "denied",
      ad_storage: marketingGranted ? "granted" : "denied",
      ad_user_data: marketingGranted ? "granted" : "denied",
      ad_personalization: marketingGranted ? "granted" : "denied",
    };
  
    gtagConsentUpdate(consent);
  
    // баннер не показываем, т.к. уже есть выбор
    setIsOpen(false);
    setIsCustomizeOpen(false);
  }, [locale]);
  

  const consentFromToggles = useMemo<GtagConsent>(() => {
    const analyticsGranted = toggles.analytics;
    const marketingGranted = toggles.marketing;

    return {
      analytics_storage: analyticsGranted ? "granted" : "denied",
      ad_storage: marketingGranted ? "granted" : "denied",
      ad_user_data: marketingGranted ? "granted" : "denied",
      ad_personalization: marketingGranted ? "granted" : "denied",
    };
  }, [toggles.analytics, toggles.marketing]);

  function persist(choice: ConsentChoice, consent: ConsentState) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ choice, consent, ts: Date.now(), locale })
    );
  }

  function acceptAll() {
    const consentState: ConsentState = { analytics: true, marketing: true };
    persist("all", consentState);

    const consent: GtagConsent = {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    };

    gtagConsentUpdate(consent);
    setIsOpen(false);
  }

  function rejectAll() {
    const consentState: ConsentState = { analytics: false, marketing: false };
    persist("necessary", consentState);

    const consent: GtagConsent = {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    };

    gtagConsentUpdate(consent);
    setIsOpen(false);
  }

  function saveCustom() {
    persist("custom", toggles);
    gtagConsentUpdate(consentFromToggles);
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div key={locale} className="fixed inset-x-0 bottom-0 z-[9999] px-4 pb-4">
      {/* Горизонтальный bar */}
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/15 bg-brand-dark px-4 py-4 shadow-[0_-12px_40px_rgba(0,0,0,0.6)]">
        {!isCustomizeOpen ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Text */}
            <div className="max-w-2xl">
              <div className="text-[15px] font-semibold text-white">
                {t("title")}
              </div>
              <div className="mt-1 text-[13px] text-brand-muted leading-relaxed">
                {t("description")}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setIsCustomizeOpen(true)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-brand-muted hover:text-white hover:bg-white/10 transition"
              >
                {t("customize")}
              </button>

              <button
                onClick={rejectAll}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-brand-muted hover:text-white hover:bg-white/10 transition"
              >
                {t("rejectAll")}
              </button>

              <button
                onClick={acceptAll}
                className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary/90 transition"
              >
                {t("acceptAll")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {/* Necessary */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-white">
                  {t("necessaryTitle")}
                </div>
                <div className="mt-1 text-xs text-brand-muted">
                  {t("necessaryDesc")}
                </div>
                <div className="mt-2 text-xs text-brand-muted/70">
                  {t("alwaysOn")}
                </div>
              </div>

              {/* Analytics */}
              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {t("analyticsTitle")}
                  </div>
                  <div className="mt-1 text-xs text-brand-muted">
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

              {/* Marketing */}
              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {t("marketingTitle")}
                  </div>
                  <div className="mt-1 text-xs text-brand-muted">
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

            <div className="flex justify-end gap-2">
              <button
                onClick={rejectAll}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-brand-muted hover:text-white hover:bg-white/10 transition"
              >
                {t("rejectAll")}
              </button>

              <button
                onClick={saveCustom}
                className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-primary/90 transition"
              >
                {t("save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
