"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Locale = "en" | "ru";

function stripLocalePrefix(pathname: string) {
  const stripped = pathname.replace(/^\/(en|ru)(?=\/|$)/, "");
  return stripped === "" ? "/" : stripped;
}

function buildPathForLocale(pathWithoutLocale: string, locale: Locale) {
  if (locale === "en") {
    return pathWithoutLocale === "/" ? "/" : pathWithoutLocale;
  }
  return pathWithoutLocale === "/" ? "/ru" : `/ru${pathWithoutLocale}`;
}

export function LanguageSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ✅ берём текущий язык из URL (это надёжнее всего)
  const activeLocale: Locale = pathname.startsWith("/ru") ? "ru" : "en";

  const pathWithoutLocale = stripLocalePrefix(pathname);
  const query = searchParams?.toString();
  const withQuery = (url: string) => (query ? `${url}?${query}` : url);

  const go = (nextLocale: Locale) => {
    // ставим cookie на год
    document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  
    const nextPath = buildPathForLocale(pathWithoutLocale, nextLocale);
    router.replace(withQuery(nextPath));
  };
  

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1">
      <button
        type="button"
        onClick={() => go("en")}
        className={`rounded-full px-3 py-1 text-sm transition-colors ${
          activeLocale === "en"
            ? "bg-white/15 text-white"
            : "text-white/70 hover:text-white"
        }`}
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => go("ru")}
        className={`rounded-full px-3 py-1 text-sm transition-colors ${
          activeLocale === "ru"
            ? "bg-white/15 text-white"
            : "text-white/70 hover:text-white"
        }`}
      >
        RU
      </button>
    </div>
  );
}
