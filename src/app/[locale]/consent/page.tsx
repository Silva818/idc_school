// src/app/[locale]/consent/page.tsx
import { getTranslations } from "next-intl/server";

type Props = {
  params: { locale: string };
};

export default async function ConsentPage({ params }: Props) {
  const t = await getTranslations({
    locale: params.locale,
    namespace: "legal.consent",
  });

  return (
    <main className="min-h-screen bg-brand-dark text-white p-6">
      <div className="space-y-3">
        <div className="text-sm text-white/70">
          DEBUG locale param: <b>{params.locale}</b>
        </div>
        <div className="text-sm text-white/70">
          DEBUG t(meta): <b>{t("meta")}</b>
        </div>
      </div>
    </main>
  );
}
