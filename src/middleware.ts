import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["en", "ru"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false, // ✅ важно: не редиректим / -> /ru по браузеру
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
