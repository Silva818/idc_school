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
  // GTM может загрузиться чуть позже — но dataLayer уже будет.
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  gtag("consent", "update", consent);
}

export default function CookieConsentBanner() {
  const t = useTranslations("cookie");
  const locale = useLocale(); // "en" | "ru" и т.п.

  const [isOpen, setIsOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  const [toggles, setToggles] = useState<ConsentState>({
    analytics: false,
    marketing: false,
  });

  // При первом заходе — если выбора нет, показываем баннер.
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

    // Если сохранено — применим ещё раз (на случай очистки cookies/перезагрузки)
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

  // Кнопка “изменить настройки” (можно вставить в privacy page тоже)
  function reopen() {
    setIsOpen(true);
    setIsCustomizeOpen(true);
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[9999] p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t("ariaLabel")}
    >
      <div className="mx-auto max-w-4xl rounded-2xl bg-black/90 backdrop-blur border border-white/10 shadow-xl p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-base md:text-lg font-semibold">
              {t("title")}
            </div>
            <div className="text-sm md:text-base text-white/80 leading-relaxed">
              {t("description")}
            </div>
          </div>

          <button
            onClick={rejectAll}
            className="shrink-0 rounded-xl px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 transition"
            aria-label={t("closeReject")}
            title={t("closeReject")}
          >
            ✕
          </button>
        </div>

        {!isCustomizeOpen ? (
          <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-center md:justify-end">
            <button
              onClick={() => {
                setIsCustomizeOpen(true);
              }}
              className="rounded-xl px-4 py-2 text-sm md:text-base bg-white/10 hover:bg-white/15 transition"
            >
              {t("customize")}
            </button>

            <button
              onClick={rejectAll}
              className="rounded-xl px-4 py-2 text-sm md:text-base bg-white/10 hover:bg-white/15 transition"
            >
              {t("rejectAll")}
            </button>

            <button
              onClick={acceptAll}
              className="rounded-xl px-4 py-2 text-sm md:text-base bg-white text-black hover:bg-white/90 transition font-semibold"
            >
              {t("acceptAll")}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{t("necessaryTitle")}</div>
                  <div className="text-sm text-white/70">
                    {t("necessaryDesc")}
                  </div>
                </div>
                <div className="text-sm text-white/60">{t("alwaysOn")}</div>
              </div>

              <div className="h-px bg-white/10" />

              <label className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{t("analyticsTitle")}</div>
                  <div className="text-sm text-white/70">
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
                <div>
                  <div className="font-semibold">{t("marketingTitle")}</div>
                  <div className="text-sm text-white/70">
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

            <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-end">
              <button
                onClick={rejectAll}
                className="rounded-xl px-4 py-2 text-sm md:text-base bg-white/10 hover:bg-white/15 transition"
              >
                {t("rejectAll")}
              </button>

              <button
                onClick={saveCustom}
                className="rounded-xl px-4 py-2 text-sm md:text-base bg-white text-black hover:bg-white/90 transition font-semibold"
              >
                {t("save")}
              </button>
            </div>

            <div className="text-xs text-white/50">
              {t("hint")}
            </div>
          </div>
        )}

        {/* Опционально: маленькая ссылка “изменить настройки” (можно перенести в footer/privacy) */}
        <div className="mt-3 text-xs text-white/50">
          {t("manageLater")}{" "}
          <button
            onClick={reopen}
            className="underline hover:text-white transition"
            type="button"
          >
            {t("openSettings")}
          </button>
        </div>
      </div>
    </div>
  );
}
