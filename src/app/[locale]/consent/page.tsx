import Link from "next/link";
import { getTranslations } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export default async function ConsentPage({ params }: Props) {
  const t = await getTranslations("legal.consent");

  const homeHref = params.locale === "ru" ? "/ru" : "/";

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

        <section className="rounded-3xl border border-white/10 bg-black/30 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 text-[13px] sm:text-sm leading-relaxed text-brand-muted space-y-4">
          <p className="font-semibold text-white">{t("heading")}</p>

          <p>
            {t("p1.prefix")}{" "}
            <a
              href={t("p1.siteHref")}
              target="_blank"
              rel="noreferrer"
              className="text-white underline decoration-dotted"
            >
              {t("p1.siteText")}
            </a>{" "}
            {t("p1.suffix")}
          </p>

          <p>{t("p2")}</p>

          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>{t("list.fullName")}</li>
            <li>{t("list.email")}</li>
            <li>{t("list.phone")}</li>
          </ul>

          <p>{t("p3")}</p>
          <p>{t("p4")}</p>
        </section>
      </div>
    </main>
  );
}
