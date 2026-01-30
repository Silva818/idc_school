// src/components/Courses.tsx
"use client";

import { TestSignupButton } from "@/components/TestSignupButton";
import { useTranslations } from "next-intl";

type OpenStrengthTestOpts = {
  source?: "courses" | "pricing";
  course_name?: string;
};

type CoursesProps = {
  onOpenTestModal?: (opts?: { source?: "courses" | "pricing"; course_name?: string }) => void;
  onChooseCourse?: (courseName: string) => void; // ✅ добавить
};

export function Courses({ onOpenTestModal, onChooseCourse }: CoursesProps) {
  const t = useTranslations("home.courses");

  return (
    <section
      id="courses"
      className="border-t border-black/5 bg-[#F5F7FB] text-brand-dark py-16 sm:py-20 lg:py-24 scroll-mt-24 md:scroll-mt-28"
    >
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Заголовок + бейдж */}
        <div id="courses-top" className="flex flex-col gap-4 mb-8 sm:mb-10 scroll-mt-24 md:scroll-mt-28">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white shadow-sm border border-black/5 px-3 py-1.5 text-xs sm:text-[13px] text-gray-600">
            <span className="h-2 w-2 rounded-full bg-brand-accent" />
            <span>{t("badge")}</span>
          </div>

          <div className="max-w-3xl">
            <h2 className="text-3xl sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-3">
              {t("title")}
            </h2>
            <p className="text-base sm:text-base text-gray-600 leading-relaxed">
              {t("desc")}
            </p>
          </div>
        </div>

        {/* Подпись про скролл */}
        <div className="flex items-center justify-between text-[12px] sm:text-xs text-gray-500 mb-3 sm:mb-4">
          <span>{t("scrollHint")}</span>
          <span className="hidden sm:inline">{t("scrollNote")}</span>
        </div>

        {/* Горизонтальный скролл с карточками */}
        <div className="mt-3">
          <div
            className="
              flex gap-4 sm:gap-6 lg:gap-8
              overflow-x-auto pt-3 pb-4 sm:pb-6
              -mx-1 px-1
              snap-x snap-mandatory
              [&::-webkit-scrollbar]:h-1.5
              [&::-webkit-scrollbar-thumb]:rounded-full
              [&::-webkit-scrollbar-thumb]:bg-black/10
            "
          >
            {/* 1. Calisthenics Light */}
            <article className="snap-start flex flex-col shrink-0 w-[86%] sm:w-[60%] lg:w-[40%] rounded-3xl bg-white border border-black/5 shadow-sm p-5 sm:p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-brand-primary/50">
              <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-black/10 px-3 py-1 text-gray-600">
                  <span className="h-2 w-2 rounded-full bg-brand-accent" />
                  {t("cards.light.badge")}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">
                {t("cards.light.title")}
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {t("cards.light.desc")}
              </p>

              <ul className="mb-4 space-y-1.5 text-sm text-gray-600">
                <li>• {t("cards.light.features.0")}</li>
                <li>• {t("cards.light.features.1")}</li>
                <li>• {t("cards.light.features.2")}</li>
              </ul>

              <div className="mt-auto pt-3">
                <TestSignupButton
                  label={t("chooseCourse")}
                  buttonClassName="w-full rounded-full bg-brand-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-primary/90"
                  onClick={() => onChooseCourse?.(t("cards.light.title"))}
                />
              </div>
            </article>

            {/* 2. Super Calisthenics */}
            <article className="snap-start flex flex-col shrink-0 w-[86%] sm:w-[60%] lg:w-[40%] rounded-3xl bg-white border border-black/5 shadow-sm p-5 sm:p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-brand-primary/50">
              <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-black/10 px-3 py-1 text-gray-600">
                  <span className="h-2 w-2 rounded-full bg-brand-blue" />
                  {t("cards.super.badge")}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">
                {t("cards.super.title")}
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {t("cards.super.desc")}
              </p>

              <ul className="mb-4 space-y-1.5 text-sm text-gray-600">
                <li>• {t("cards.super.features.0")}</li>
                <li>• {t("cards.super.features.1")}</li>
                <li>• {t("cards.super.features.2")}</li>
              </ul>

              <div className="mt-auto pt-3">
                <TestSignupButton
                  label={t("chooseCourse")}
                  buttonClassName="w-full rounded-full bg-brand-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-primary/90"
                  onClick={() => onChooseCourse?.(t("cards.super.title"))}
                />
              </div>
            </article>

            {/* 3. Подтягивания для девушек */}
            <article className="snap-start flex flex-col shrink-0 w-[86%] sm:w-[60%] lg:w-[40%] rounded-3xl bg-white border border-black/5 shadow-sm p-5 sm:p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-brand-primary/50">
              <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-black/10 px-3 py-1 text-gray-600">
                  <span className="h-2 w-2 rounded-full bg-brand-blue" />
                  {t("cards.pullupsGirls.badge")}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">
                {t("cards.pullupsGirls.title")}
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {t("cards.pullupsGirls.desc")}
              </p>

              <ul className="mb-4 space-y-1.5 text-sm text-gray-600">
                <li>• {t("cards.pullupsGirls.features.0")}</li>
                <li>• {t("cards.pullupsGirls.features.1")}</li>
                <li>• {t("cards.pullupsGirls.features.2")}</li>
              </ul>

              <div className="mt-auto pt-3">
                <TestSignupButton
                  label={t("chooseCourse")}
                  buttonClassName="w-full rounded-full bg-brand-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-primary/90"
                  onClick={() => onChooseCourse?.(t("cards.pullupsGirls.title"))}
                />
              </div>
            </article>

            {/* 4. Стойка на руках */}
            <article
              className="
                snap-start flex flex-col shrink-0
                w-[86%] sm:w-[60%] lg:w-[40%]
                rounded-3xl bg-white border border-black/5 shadow-sm
                p-5 sm:p-6
                transition-all duration-300 ease-out
                hover:-translate-y-1 hover:shadow-xl hover:border-brand-primary/50
              "
            >
              <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-black/10 px-3 py-1 text-gray-600">
                  <span className="h-2 w-2 rounded-full bg-brand-primary" />
                  {t("cards.handstand.badge")}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">
                {t("cards.handstand.title")}
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {t("cards.handstand.desc")}
              </p>

              <ul className="mb-4 space-y-1.5 text-sm text-gray-600">
                <li>• {t("cards.handstand.features.0")}</li>
                <li>• {t("cards.handstand.features.1")}</li>
                <li>• {t("cards.handstand.features.2")}</li>
              </ul>

              <div className="mt-auto pt-3">
                <TestSignupButton
                  label={t("chooseCourse")}
                  buttonClassName="w-full rounded-full bg-brand-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-primary/90"
                  onClick={() => onChooseCourse?.(t("cards.handstand.title"))}
                />
              </div>
            </article>

            {/* 5. Калистеника для кроссфитеров */}
            <article
              className="
                snap-start flex flex-col shrink-0
                w-[86%] sm:w-[60%] lg:w-[40%]
                rounded-3xl bg-white border border-black/5 shadow-sm
                p-5 sm:p-6
                transition-all duration-300 ease-out
                hover:-translate-y-1 hover:shadow-xl hover:border-brand-primary/50
              "
            >
              <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-black/10 px-3 py-1 text-gray-600">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {t("cards.crossfit.badge")}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">
                {t("cards.crossfit.title")}
              </h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {t("cards.crossfit.desc")}
              </p>

              <ul className="mb-4 space-y-1.5 text-sm text-gray-600">
                <li>• {t("cards.crossfit.features.0")}</li>
                <li>• {t("cards.crossfit.features.1")}</li>
                <li>• {t("cards.crossfit.features.2")}</li>
              </ul>

              <div className="mt-auto pt-3">
                <TestSignupButton
                  label={t("chooseCourse")}
                  buttonClassName="w-full rounded-full bg-brand-primary px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-primary/90"
                  onClick={() => onChooseCourse?.(t("cards.crossfit.title"))}
                />
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
