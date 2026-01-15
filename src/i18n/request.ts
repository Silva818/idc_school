// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";

const LOCALES = ["en", "ru"] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export default getRequestConfig(async ({ locale }) => {
  // locale может быть undefined — страхуемся
  const rawLocale = (locale ?? "en").toLowerCase();

  const safeLocale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  const messages =
    safeLocale === "ru"
      ? (await import("../messages/ru.json")).default
      : (await import("../messages/en.json")).default;

  return {
    locale: safeLocale,
    messages,
  };
});
