// src/i18n/request.ts
import {getRequestConfig} from "next-intl/server";

const locales = ["en", "ru"] as const;
type Locale = (typeof locales)[number];

export default getRequestConfig(async ({locale}) => {
  const safeLocale: Locale = locales.includes(locale as Locale) ? (locale as Locale) : "en";

  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default
  };
});
