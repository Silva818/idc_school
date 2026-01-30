// src/components/Pricing.tsx
"use client";

import { useState } from "react";
import { TestSignupButton } from "@/components/TestSignupButton";
import { useTranslations } from "next-intl";
import { track } from "@/lib/track";
import { usePathname } from "next/navigation";


function StepDot({ color = "bg-emerald-400" }: { color?: string }) {
  return (
    <span className={`inline-block h-2 aspect-square rounded-full ${color}`} />
  );
}

// отдельные цены для AMD, EUR и USD
export const prices = {
  review: {
    EUR: { total: 11, per: 11 },
    USD: { total: 13, per: 13 },
    AMD: { total: 5500, per: 5500 }, // разовый формат
  },
  short12: {
    EUR: { total: 108, per: 9 },
    USD: { total: 132, per: 11 },
    AMD: { total: 48000, per: 4000 }, // 12 тренировок
  },
  long12: {
    EUR: { total: 120, per: 10 },
    USD: { total: 144, per: 12 },
    AMD: { total: 60000, per: 5000 }, // 12 тренировок в спокойном темпе
  },
  long36: {
    EUR: { total: 288, per: 8 },
    USD: { total: 360, per: 10 },
    AMD: { total: 126000, per: 3500 }, // 36 тренировок
  },
} as const;

export type Currency = "EUR" | "USD" | "AMD";

export function formatPrice(value: number, currency: Currency) {
  const suffixMap: Record<Currency, string> = {
    EUR: "€",
    USD: "$",
    AMD: "֏",
  };

  return `${value.toLocaleString("ru-RU")} ${suffixMap[currency]}`;
}

// то, что передаём вверх в модалку покупки
export type PurchaseOptions = {
  tariffId: "review" | "short12" | "long12" | "long36";
  tariffLabel: string;
  amount: number;
  currency: Currency;
};

export const PURCHASE_TARIFFS: Array<{
  id: PurchaseOptions["tariffId"];
  labelKey: string; // ключ в i18n для tariffLabel
  amountKey: keyof typeof prices; // откуда брать цену
}> = [
  { id: "review", labelKey: "cards.review.tariffLabel", amountKey: "review" },
  { id: "short12", labelKey: "cards.short12.tariffLabel", amountKey: "short12" },
  { id: "long12", labelKey: "cards.bundle.long12.tariffLabel", amountKey: "long12" },
  { id: "long36", labelKey: "cards.bundle.long36.tariffLabel", amountKey: "long36" },
];

type OpenStrengthTestOpts = {
  source?: "courses" | "pricing";
  course_name?: string;
};

type PricingProps = {
  onOpenTestModal?: (opts?: OpenStrengthTestOpts) => void;
  onOpenPurchaseModal?: (options: PurchaseOptions) => void;
  onOpenGiftModal?: () => void;
  onCurrencyChange?: (currency: Currency) => void;
};


export function Pricing({
  onOpenTestModal,
  onOpenPurchaseModal,
  onOpenGiftModal,
  onCurrencyChange,
}: PricingProps) {
  const t = useTranslations("home.pricing");
  const tHome = useTranslations("home");
  const pathname = usePathname();
  const site_language: "en" | "ru" = pathname.startsWith("/ru") ? "ru" : "en";

  const [currency, setCurrency] = useState<Currency>("EUR");

  const isEUR = currency === "EUR";
  const isUSD = currency === "USD";
  const isAMD = currency === "AMD";

  const switchHint = t(`switchHint.${currency}`);

  return (
    <section
      id="pricing"
      className="py-16 sm:py-20 lg:py-24 scroll-mt-24 md:scroll-mt-28 border-t border-white/5"
    >
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Заголовок + переключатель валюты */}
        <div className="mb-10 sm:mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.2em] text-brand-muted mb-3">
              {t("kicker")}
            </p>

            <h2 className="text-[26px] sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-3 leading-tight">
              {t("title")}
            </h2>

            <p className="mt-2 max-w-2xl text-[14px] sm:text-base text-brand-muted leading-relaxed">
              {t("desc")}
            </p>
          </div>

          {/* Переключатель валюты */}
          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <div className="flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-[0.16em] text-brand-muted/80">
                {t("currencyLabel")}
              </span>

              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setCurrency("EUR");
                    onCurrencyChange?.("EUR");
                  }}
                  className={[
                    "px-3 py-1.5 rounded-full transition-colors",
                    isEUR ? "bg-white text-brand-dark" : "text-brand-muted",
                  ].join(" ")}
                >
                  € EUR
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrency("USD");
                    onCurrencyChange?.("USD");
                  }}
                  className={[
                    "px-3 py-1.5 rounded-full transition-colors",
                    isUSD ? "bg-white text-brand-dark" : "text-brand-muted",
                  ].join(" ")}
                >
                  $ USD
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrency("AMD");
                    onCurrencyChange?.("AMD");
                  }}
                  className={[
                    "px-3 py-1.5 rounded-full transition-colors",
                    "hidden", // ← СКРЫВАЕМ AMD
                    isAMD ? "bg-white text-brand-dark" : "text-brand-muted",
                  ].join(" ")}
                >
                  ֏ AMD
                </button>
              </div>
            </div>

            <p className="text-[11px] sm:text-xs text-brand-muted/80">
              {switchHint}
            </p>
          </div>
        </div>

        {/* Две аккуратные колонки с текстом над карточками */}
        <div className="mb-8 sm:mb-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[13px] sm:text-sm text-brand-muted">
          <span>{t("noteLeft")}</span>
          <span className="text-brand-muted/80">{t("noteRight")}</span>
        </div>

        {/* Сетка тарифов */}
        <div className="grid gap-6 lg:gap-8 md:grid-cols-2 xl:grid-cols-4 items-stretch">
          {/* 0. 1 тренировка — разовый платёж */}
          <article className="relative flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 px-5 py-6 sm:px-6 sm:py-7 backdrop-blur-sm">
            <div className="relative flex h-full flex-col">
              <div>
                <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-brand-muted min-h-[32px]">
                  <StepDot color="bg-emerald-400" />
                  <span>{t("cards.short1.badge")}</span>
                </div>

                <h3 className="text-[16px] sm:text-lg font-semibold mb-2">
                  {t("cards.short1.title")}
                </h3>

                <p className="text-[15px] font-semibold mb-1">
                  {formatPrice(prices.review[currency].total, currency)}
                </p>

                <p className="text-[11px] text-brand-muted mb-4">
                  {tHome("modals.purchase.oneTimeNote")}
                </p>

                <ul className="mb-4 space-y-1.5 text-[13px] sm:text-sm text-brand-muted">
                  {(t.raw("cards.short1.bullets") as string[]).map((b, i) => (
                    <li key={i}>• {b}</li>
                  ))}
                </ul>
                <p className="text-[12px] sm:text-xs text-brand-muted leading-relaxed">{t("cards.short1.text")}</p>
              </div>

              <div className="mt-auto pt-4">
                <button
                  className="mt-3 w-full rounded-full border border-white/40 bg-transparent px-4 py-2.5 text-[13px] sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  onClick={() => {
                    onOpenPurchaseModal?.({
                      tariffId: "review",
                      tariffLabel: t("cards.short1.tariffLabel"),
                      amount: prices.review[currency].total,
                      currency,
                    });
                    track("pricing_card_click", {
                      site_language,
                      card: "one_session",
                      currency,
                    });
                  }}
                >
                  {t("cards.short1.button")}
                </button>
              </div>
            </div>
          </article>
          {/* 1. 12 занятий — акцентный план */}
          <article className="relative flex h-full flex-col rounded-3xl border border-brand-primary/40 bg-brand-primary/5 px-5 py-6 sm:px-6 sm:py-7 backdrop-blur-sm shadow-[0_0_40px_rgba(216,22,150,0.35)] overflow-hidden">
            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-brand-primary/60 opacity-40" />

            <div className="relative flex h-full flex-col">
              <div>
                <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-brand-muted min-h-[32px]">
                  <StepDot color="bg-brand-primary" />
                  <span>{t("cards.short12.badge")}</span>
                </div>

                <h3 className="text-[16px] sm:text-lg font-semibold mb-2">
                  {t("cards.short12.title")}
                </h3>

                <p className="text-[15px] font-semibold mb-1">
                  {formatPrice(prices.short12[currency].total, currency)}
                </p>
                <p className="text-[11px] text-brand-muted mb-4">
                  {t("cards.short12.perLabel")}
                </p>

                <ul className="mb-4 space-y-1.5 text-[13px] sm:text-sm text-brand-muted">
                  {(t.raw("cards.short12.bullets") as string[]).map((b, i) => (
                    <li key={i}>• {b}</li>
                  ))}
                </ul>

                <p className="text-[13px] sm:text-sm text-brand-muted leading-relaxed">
                  {t("cards.short12.text")}
                </p>
              </div>

              <div className="mt-auto pt-4">
                <button
                  className="mt-3 w-full rounded-full border border-white/40 bg-transparent px-4 py-2.5 text-[13px] sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  onClick={() => {
                    onOpenPurchaseModal?.({
                      tariffId: "short12",
                      tariffLabel: t("cards.short12.tariffLabel"),
                      amount: prices.short12[currency].total,
                      currency,
                    });
                  }}
                >
                  {t("cards.short12.button")}
                </button>
              </div>
            </div>
          </article>

          {/* 2. 12 тренировок — спокойный темп (отдельная карточка) */}
          <article className="relative flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 px-5 py-6 sm:px-6 sm:py-7">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-brand-muted min-h-[32px]">
                <StepDot color="bg-brand-accent/80" />
                <span>{t("cards.bundle.badge")}</span>
              </div>
              <h3 className="text-[16px] sm:text-lg font-semibold mb-2">
                {t("cards.bundle.long12.title")}
              </h3>
              <p className="text-[15px] font-semibold text-white mb-1">
                {formatPrice(prices.long12[currency].total, currency)}
              </p>
              <p className="text-[11px] text-brand-muted mb-4">
                {t("cards.bundle.long12.perLabel")}
              </p>
              <ul className="mb-4 space-y-1.5 text-[13px] sm:text-sm text-brand-muted">
                {(t.raw("cards.bundle.long12.bullets") as string[]).map((b, i) => (
                  <li key={i}>• {b}</li>
                ))}
              </ul>
              <p className="text-[12px] sm:text-xs text-brand-muted leading-relaxed">{t("cards.bundle.long12.text")}</p>
            </div>
            <div className="mt-auto pt-4">
              <button
                className="w-full rounded-full border border-white/40 bg-transparent px-4 py-2.5 text-[13px] sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                onClick={() => {
                  onOpenPurchaseModal?.({
                    tariffId: "long12",
                    tariffLabel: t("cards.bundle.long12.tariffLabel"),
                    amount: prices.long12[currency].total,
                    currency,
                  });
                }}
              >
                {t("cards.bundle.long12.button")}
              </button>
            </div>
          </article>

          {/* 3. 36 тренировок — отдельная карточка */}
          <article className="relative flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 px-5 py-6 sm:px-6 sm:py-7">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-brand-muted min-h-[32px]">
                <StepDot color="bg-brand-accent/80" />
                <span>{t("cards.bundle.badge")}</span>
              </div>
              <h3 className="text-[16px] sm:text-lg font-semibold mb-1 text-white">
                {t("cards.bundle.long36.title")}
              </h3>
              <p className="text-[15px] font-semibold text-white mb-1">
                {formatPrice(prices.long36[currency].total, currency)}
              </p>
              <p className="text-[11px] text-brand-muted mb-4">
                {t("cards.bundle.long36.perLabel")}
              </p>
              <ul className="mb-4 space-y-1.5 text-[13px] sm:text-sm text-brand-muted">
                {(t.raw("cards.bundle.long36.bullets") as string[]).map((b, i) => (
                  <li key={i}>• {b}</li>
                ))}
              </ul>
              <p className="text-[12px] sm:text-xs text-brand-muted leading-relaxed">{t("cards.bundle.long36.text")}</p>
            </div>
            <div className="mt-auto pt-4">
              <button
                className="w-full rounded-full border border-white/40 bg-transparent px-4 py-2.5 text-[13px] sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                onClick={() => {
                  onOpenPurchaseModal?.({
                    tariffId: "long36",
                    tariffLabel: t("cards.bundle.long36.tariffLabel"),
                    amount: prices.long36[currency].total,
                    currency,
                  });
                }}
              >
                {t("cards.bundle.long36.button")}
              </button>
            </div>
          </article>
        </div>
        <p className="mt-6 text-center text-[12px] sm:text-sm text-brand-muted">
          {t("belowNote")}
        </p>

        {/* ✅ NEW: маленькая ссылка под блоком */}
        {onOpenGiftModal ? (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={onOpenGiftModal}
              className="text-sm text-brand-muted underline decoration-dotted hover:text-white transition-colors"
            >
              {t("gift.link")}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
