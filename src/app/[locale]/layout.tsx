// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

const LOCALES = ["en", "ru"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export default async function LocaleLayout(props: any) {
  const children = props?.children;

  // Next может отдавать params как объект или как Promise — страхуемся
  const resolvedParams = await Promise.resolve(props?.params ?? {});
  const rawLocale = String(resolvedParams?.locale ?? "en").toLowerCase();

  const safeLocale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  setRequestLocale(safeLocale);
  const messages = await getMessages({ locale: safeLocale });

  return (
    <NextIntlClientProvider locale={safeLocale} messages={messages}>
      <Suspense fallback={null}>{children}</Suspense>
    </NextIntlClientProvider>
  );
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}
