import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

const LOCALES = ["en", "ru"] as const;
type Locale = (typeof LOCALES)[number];

const OPERATOR_DETAILS: Record<Locale, string> = {
  en: [
    "9. OPERATOR DETAILS:",
    "Individual Entrepreneur Ambartsumyan Sirvard Sergeevna",
    "Registration number: 264.1489864",
    "Tax ID: 26913722",
    "Address: OneBusiness, 1 Yekmalyan St, Yerevan 0010, Armenia",
    "Mobile: +37494901718",
    "E-mail: silva.ambartsumian@outlook.com",
  ].join("\n"),
  ru: [
    "9. СВЕДЕНИЯ ОБ ОПЕРАТОРЕ:",
    "Индивидуальный предприниматель Амбарцумян Сирвард Сергеевна",
    "Регистрационный номер: 264.1489864",
    "ИНН: 26913722",
    "Адрес: OneBusiness, ул. Екмаляна 1, Ереван 0010, Армения",
    "Мобильный: +37494901718",
    "E-mail: silva.ambartsumian@outlook.com",
  ].join("\n"),
};

function withUpdatedOperatorDetails(contentRaw: string, locale: Locale) {
  const content = String(contentRaw ?? "").trimEnd();
  const cleaned = content.replace(/\n\n9\.[\s\S]*$/m, "");
  return `${cleaned}\n\n${OPERATOR_DETAILS[locale]}\n`;
}

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes((value as unknown) as Locale);
}

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

type RouteParams = { locale: string };
type PrivacyPageProps = { params: Promise<RouteParams> };

export default async function PrivacyPage(props: PrivacyPageProps) {
  const { locale } = await props.params;
  const raw = (locale ?? "en").toLowerCase();
  const safeLocale: Locale = isLocale(raw) ? (raw as Locale) : "en";

  const t = await getTranslations({
    locale: safeLocale,
    namespace: "legal.privacy",
  });

  const rawContent =
    safeLocale === "ru"
      ? await readFile(path.join(process.cwd(), "src/privacy-ru.md"), "utf8")
      : t("content");
  const content = withUpdatedOperatorDetails(rawContent, safeLocale);

  const homeHref = safeLocale === "ru" ? "/ru" : "/";

  return (
    <main className="min-h-screen bg-brand-dark text-white">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] sm:text-xs text-brand-muted/80 uppercase tracking-wide">
              {t("meta")}
            </p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {t("title")}
            </h1>
          </div>
          <Link
            href={homeHref}
            className="text-[11px] sm:text-xs text-brand-muted hover:text-white transition-colors underline underline-offset-4 decoration-dotted"
          >
            {t("backHome")}
          </Link>
        </header>

        <section className="rounded-3xl border border-white/10 bg-black/30 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 text-[13px] sm:text-sm leading-relaxed text-brand-muted">
          <div className="whitespace-pre-wrap">
            {content}
          </div>
        </section>
      </div>
    </main>
  );
}


