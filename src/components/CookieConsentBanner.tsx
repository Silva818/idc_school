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

type SavedPayload = {
  choice: ConsentChoice;
  consent: ConsentState;
  ts: number;
  locale: string;
};

const STORAGE_KEY = "cookie_consent_v1";
const OPEN_EVENT = "cookie:open";

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readSaved(): SavedPayload | null {
  if (typeof window === "undefined") return null;
  return safeParse<SavedPayload>(localStorage.getItem(STORAGE_KEY));
}

function gtagConsentUpdate(consent: GtagConsent) {
  if (typeof window === "undefined") return;
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  gtag("consent", "update", consent);
}

function toGtagConsent(state: ConsentState): GtagConsent {
  const analyticsGranted = !!state.analytics;
  const marketingGranted = !!state.marketing;

  return {
    analytics_storage: analyticsGranted ? "granted" : "denied",
    ad_storage: marketingGranted ? "granted" : "denied",
    ad_user_data: marketingGranted ? "granted" : "denied",
    ad_personalization: marketingGranted ? "granted" : "denied",
  };
}

/**
 * ВАЖНО:
 * Когда страница загрузилась с denied, GA4 может НЕ отправить page_view.
 * После accept нужно вручную отправить событие, чтобы появился /collect.
 *
 * Мы пушим event в dataLayer — это самый совместимый способ с GTM.
 */
function firePageView() {
  if (typeof window === "undefined") return;
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({ event: "page_view" });
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

  // Применяем сохранённый выбор (если есть). Если нет — показываем баннер.
  useEffect(() => {
    const saved = readSaved();

    if (!saved) {
      setIsOpen(true);
      setIsCustomizeOpen(false);
      setToggles({ analytics: false, marketing: false }); // GDPR-safe default
      return;
    }

    // синхронизируем тогглы с сохранённым (для Customize)
    setToggles({
      analytics: !!saved.consent.analytics,
      marketing: !!saved.consent.marketing,
    });

    gtagConsentUpdate(toGtagConsent(saved.consent));

    setIsOpen(false);
    setIsCustomizeOpen(false);
  }, [locale]);

  // Возможность открыть баннер с любой точки сайта
  useEffect(() => {
    function onOpen(e: Event) {
      const ce = e as CustomEvent<{ tab?: "main" | "customize" }>;
      const tab = ce.detail?.tab ?? "main";

      const saved = readSaved();

      if (saved?.consent) {
        setToggles({
          analytics: !!saved.consent.analytics,
          marketing: !!saved.consent.marketing,
        });
      } else {
        // если ещё не выбирали — GDPR-safe дефолт
        setToggles({ analytics: false, marketing: false });
      }

      setIsOpen(true);
      setIsCustomizeOpen(tab === "customize");
    }

    window.addEventListener(OPEN_EVENT, onOpen as EventListener);
    return () => window.removeEventListener(OPEN_EVENT, onOpen as EventListener);
  }, []);

  const consentFromToggles = useMemo<GtagConsent>(() => {
    return toGtagConsent(toggles);
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
    gtagConsentUpdate(toGtagConsent(consentState));

    // 👇 ключевой момент: после grant шлём событие, чтобы GA4 сделал /collect
    firePageView();

    setIsOpen(false);
    setIsCustomizeOpen(false);
  }

  function rejectAll() {
    const consentState: ConsentState = { analytics: false, marketing: false };
    persist("necessary", consentState);
    gtagConsentUpdate(toGtagConsent(consentState));
    setIsOpen(false);
    setIsCustomizeOpen(false);
  }

  function saveCustom() {
    persist("custom", toggles);
    gtagConsentUpdate(consentFromToggles);

    // 👇 если в кастоме включили analytics — отправим page_view
    if (toggles.analytics) {
      firePageView();
    }

    setIsOpen(false);
    setIsCustomizeOpen(false);
  }

  function openCustomize() {
    // при открытии кастомизации — подтягиваем сохранённое, чтобы не было рассинхрона
    const saved = readSaved();
    if (saved?.consent) {
      setToggles({
        analytics: !!saved.consent.analytics,
        marketing: !!saved.consent.marketing,
      });
    } else {
      setToggles({ analytics: false, marketing: false });
    }
    setIsCustomizeOpen(true);
  }

  if (!isOpen) return null;

  return (
    <div
      key={locale}
      className="fixed inset-x-0 bottom-0 z-[9999] px-3 pb-3 sm:px-4 sm:pb-4"
    >
      {/* Горизонтальный bar */}
      <div
        className={[
          "mx-auto w-full max-w-6xl",
          "rounded-2xl border border-white/15 bg-brand-dark",
          "px-4 py-4",
          "shadow-[0_-12px_40px_rgba(0,0,0,0.6)]",
        ].join(" ")}
      >
        {!isCustomizeOpen ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Text */}
            <div className="min-w-0 max-w-2xl">
              <div className="text-[15px] font-semibold text-white">
                {t("title")}
              </div>
              <div className="mt-1 text-[13px] text-brand-muted leading-relaxed">
                {t("description")}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 md:justify-end shrink-0">
              <button
                onClick={openCustomize}
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

              {/* Close (как раньше: = reject) */}
              <button
                onClick={rejectAll}
                className="ml-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-brand-muted hover:text-white hover:bg-white/10 transition"
                aria-label={t("closeReject")}
                title={t("closeReject")}
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header row in customize */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-[15px] font-semibold text-white">
                {t("customize")}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCustomizeOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-brand-muted hover:text-white hover:bg-white/10 transition"
                >
                  {t("back")}
                </button>

                <button
                  onClick={rejectAll}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-brand-muted hover:text-white hover:bg-white/10 transition"
                  aria-label={t("closeReject")}
                  title={t("closeReject")}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content (limit height on mobile + scroll) */}
            <div className="grid gap-3 md:grid-cols-2 max-h-[55vh] overflow-auto pr-1">
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
                <div className="min-w-0">
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
                <div className="min-w-0">
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

            <div className="flex flex-wrap justify-end gap-2">
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

            <div className="text-[11px] text-brand-muted/80">{t("hint")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
