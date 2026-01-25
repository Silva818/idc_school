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
const prices = {
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
    EUR: { total: 252, per: 7 },
    USD: { total: 324, per: 9 },
    AMD: { total: 115200, per: 3200 }, // 36 тренировок
  },
} as const;

export type Currency = "EUR" | "USD" | "AMD";

function formatPrice(value: number, currency: Currency) {
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
          {/* 1. Тест силы — бесплатный, использует текущую модалку теста */}
          <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 px-5 py-6 sm:px-6 sm:py-7 backdrop-blur-sm shadow-soft">
            <div>
              <div className="inline-flex items-center gap-2 mb-3 text-[11px] uppercase tracking-[0.16em] text-brand-muted">
                <StepDot />
                <span>{t("cards.test.step")}</span>
              </div>

              <h3 className="text-[16px] sm:text-lg font-semibold mb-2">
                {t("cards.test.title")}
              </h3>

              <p className="text-[15px] font-semibold mb-1">
                {formatPrice(0, currency)}
              </p>

              <p className="text-[11px] text-brand-muted mb-4">
                {t("cards.test.free")}
              </p>

              <ul className="mb-4 space-y-1.5 text-[12px] sm:text-xs text-brand-muted">
                <li>• {t("cards.test.bullets.0")}</li>
                <li>• {t("cards.test.bullets.1")}</li>
                <li>• {t("cards.test.bullets.2")}</li>
              </ul>

              <p className="text-[13px] sm:text-sm text-brand-muted leading-relaxed">
                {t("cards.test.text")}
              </p>
            </div>

            <div className="mt-auto pt-4">
              <TestSignupButton
                label={t("cards.test.button")}
                buttonClassName="w-full rounded-full bg-brand-primary px-4 py-2.5 text-[13px] sm:text-sm font-semibold shadow-soft hover:bg-brand-primary/90 transition-colors"
                onClick={() => onOpenTestModal?.({ source: "pricing" })}

              />
            </div>
          </article>

          {/* 2. Разбор техники — платный тариф */}
          <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 px-5 py-6 sm:px-6 sm:py-7 backdrop-blur-sm shadow-soft">
            <div>
              <div className="inline-flex items-center gap-2 mb-3 text-[11px] uppercase tracking-[0.16em] text-brand-muted">
                <StepDot color="bg-brand-accent" />
                <span>{t("cards.review.badge")}</span>
              </div>

              <h3 className="text-[16px] sm:text-lg font-semibold mb-2">
                {t("cards.review.title")}
              </h3>

              <p className="text-[15px] font-semibold mb-1">
                {formatPrice(prices.review[currency].total, currency)}
              </p>

              <p className="text-[11px] text-brand-muted mb-4">
                {t("cards.review.note")}
              </p>

              <ul className="mb-4 space-y-1.5 text-[12px] sm:text-xs text-brand-muted">
                <li>• {t("cards.review.bullets.0")}</li>
                <li>• {t("cards.review.bullets.1")}</li>
                <li>• {t("cards.review.bullets.2")}</li>
                <li>• {t("cards.review.bullets.3")}</li>
              </ul>

              <p className="text-[13px] sm:text-sm text-brand-muted leading-relaxed">
                {t("cards.review.text")}
              </p>
            </div>

            <div className="mt-auto pt-4">
              <button
                className="w-full rounded-full border border-white/40 px-4 py-2.5 text-[13px] sm:text-sm font-semibold hover:bg-white/10 transition-colors"
                onClick={() => {
                  track("select_tariff", {
                    site_language,
                    tariff_id: "review",
                    tariff_label: t("cards.review.tariffLabel"),
                    currency,
                    value: prices.review[currency].total,
                  });
                  onOpenPurchaseModal?.({
                    tariffId: "review",
                    tariffLabel: t("cards.review.tariffLabel"),
                    amount: prices.review[currency].total,
                    currency,
                  });
                }}
              >
                {t("cards.review.button")}
              </button>
            </div>
          </article>

          {/* 3. 12 занятий — акцентный план */}
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
                  {formatPrice(prices.short12[currency].per, currency)}{" "}
                  {t("cards.short12.perLabel")}
                </p>

                <ul className="mb-4 space-y-1.5 text-[12px] sm:text-xs text-brand-muted">
                  <li>• {t("cards.short12.bullets.0")}</li>
                  <li>• {t("cards.short12.bullets.1")}</li>
                  <li>• {t("cards.short12.bullets.2")}</li>
                  <li>• {t("cards.short12.bullets.3")}</li>
                </ul>

                <p className="text-[13px] sm:text-sm text-brand-muted leading-relaxed">
                  {t("cards.short12.text")}
                </p>
              </div>

              <div className="mt-auto pt-4">
                <button
                  className="mt-3 w-full rounded-full border border-white/40 bg-transparent px-4 py-2.5 text-[13px] sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  onClick={() => {
                    track("select_tariff", {
                      site_language,
                      tariff_id: "short12",
                      tariff_label: t("cards.short12.tariffLabel"),
                      currency,
                      value: prices.short12[currency].total,
                    });
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

          {/* 4. Спокойный темп + длинный блок */}
          <article className="relative flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 px-5 py-6 sm:px-6 sm:py-7">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-brand-muted min-h-[32px]">
              <StepDot color="bg-brand-accent/80" />
              <span>{t("cards.bundle.badge")}</span>
            </div>

            {/* верхняя половина — 12 тренировок в спокойном темпе */}
            <div className="flex flex-1 flex-col justify-between pb-4 mb-4 border-b border-white/10">
              <div>
                <h3 className="text-[15px] sm:text-lg font-semibold mb-2">
                  {t("cards.bundle.long12.title")}
                </h3>

                <p className="text-[15px] font-semibold text-white">
                  {formatPrice(prices.long12[currency].total, currency)}
                </p>

                <p className="text-[11px] text-brand-muted mb-2">
                  {formatPrice(prices.long12[currency].per, currency)}{" "}
                  {t("cards.bundle.long12.perLabel")}
                </p>

                <p className="text-[12px] sm:text-xs text-brand-muted leading-relaxed">
                  {t("cards.bundle.long12.text")}
                </p>
              </div>

              <button
                className="mt-3 w-full rounded-full border border-white/40 bg-transparent px-4 py-2.5 text-[13px] sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                onClick={() => {
                  track("select_tariff", {
                    site_language,
                    tariff_id: "long12",
                    tariff_label: t("cards.bundle.long12.tariffLabel"),
                    currency,
                    value: prices.long12[currency].total,
                  });
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

            {/* нижняя половина — 36 тренировок */}
            <div className="flex flex-1 flex-col justify-between pt-2">
              <div>
                <h3 className="text-[15px] sm:text-base font-semibold mb-1 text-white">
                  {t("cards.bundle.long36.title")}
                </h3>

                <p className="text-[15px] font-semibold text-white">
                  {formatPrice(prices.long36[currency].total, currency)}
                </p>

                <p className="text-[11px] text-brand-muted mb-2">
                  {formatPrice(prices.long36[currency].per, currency)}{" "}
                  {t("cards.bundle.long36.perLabel")}
                </p>

                <p className="text-[12px] sm:text-xs text-brand-muted leading-relaxed">
                  {t("cards.bundle.long36.text")}
                </p>
              </div>

              <button
                className="mt-3 w-full rounded-full border border-white/40 bg-transparent px-4 py-2.5 text-[13px] sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                onClick={() => {
                  track("select_tariff", {
                    site_language,
                    tariff_id: "long36",
                    tariff_label: t("cards.bundle.long36.tariffLabel"),
                    currency,
                    value: prices.long36[currency].total,
                  });
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
