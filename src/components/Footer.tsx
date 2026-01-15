// src/components/Footer.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export function Footer() {
  const t = useTranslations("home.footer");
  const pathname = usePathname();

  // Если ты используешь схему: EN = /, RU = /ru
  const localePrefix = pathname.startsWith("/ru") ? "/ru" : "";

  const startYear = 2018;
  const currentYear = new Date().getFullYear();
  const yearLabel =
    startYear === currentYear ? currentYear : `${startYear}–${currentYear}`;

  return (
    <footer className="border-t border-white/5 bg-brand-dark/95">
      <div
        className="
          mx-auto max-w-container
          px-4 sm:px-6 lg:px-8
          py-8 sm:py-10
          flex flex-col gap-6
          sm:flex-row sm:items-center sm:justify-between
          text-[12px] sm:text-xs text-brand-muted
        "
      >
        {/* Левая часть — бренд и копирайт */}
        <div className="flex flex-col gap-1 text-center sm:text-left">
          <span className="font-medium text-white/90">I Do Calisthenics</span>
          <span className="text-[11px] text-brand-muted/80">
            {t("copyright", { yearLabel })}
          </span>
        </div>

        {/* Центр — ссылки на политики */}
        <nav
          className="
            flex flex-col items-center gap-3
            sm:flex-row sm:gap-4
            text-center
          "
        >
          <Link
            href={`${localePrefix}/offer`}
            className="hover:text-white transition-colors underline decoration-dotted underline-offset-2"
          >
            {t("offer")}
          </Link>
          <Link
            href={`${localePrefix}/consent`}
            className="hover:text-white transition-colors underline decoration-dotted underline-offset-2"
          >
            {t("consent")}
          </Link>
          <Link
            href={`${localePrefix}/privacy`}
            className="hover:text-white transition-colors underline decoration-dotted underline-offset-2"
          >
            {t("privacy")}
          </Link>
        </nav>

        {/* Правая часть — соцсети */}
        <div className="flex justify-center sm:justify-end">
          <a
            href="https://instagram.com/i_do_calisthenics"
            target="_blank"
            rel="noreferrer"
            className="
              inline-flex items-center gap-2
              rounded-full
              border border-white/10
              bg-white/5
              px-4 py-2
              text-xs font-medium
              hover:bg-white/10 hover:text-white
              transition-colors
            "
          >
            <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]">
              <span className="h-2.5 w-2.5 rounded-[6px] border border-white/80" />
              <span className="absolute top-0.5 right-0.5 h-1 w-1 rounded-full bg-white/90" />
            </span>
            <span>{t("instagram")}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
