"use client";

import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/pagination";
import { useTranslations } from "next-intl";

type Testimonial = {
  id: string;
  name: string;
  tag?: string;
  text: string;
  source?: string;
  url?: string;
};

export function Testimonials() {
  const t = useTranslations("home.testimonials");
  const [swiper, setSwiper] = useState<SwiperType | null>(null);

  const testimonials = t.raw("list") as Testimonial[];

  return (
    <section
      id="reviews"
      className="py-16 sm:py-20 lg:py-24 border-t border-white/5 scroll-mt-24 md:scroll-mt-28"
    >
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div id="reviews-top" className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10 scroll-mt-24 md:scroll-mt-28">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-muted mb-3">
              {t("kicker")}
            </p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight mb-3">
              {t("title")}
            </h2>
            <p className="text-sm sm:text-base text-brand-muted">
              {t("desc")}
            </p>
          </div>

          <div className="text-xs sm:text-sm text-brand-muted/80">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{t("badge")}</span>
            </div>
          </div>
        </div>

        {/* ВАЖНО: без масок/градиентов по бокам */}
        <div className="relative">
          <Swiper
            modules={[Pagination]}
            spaceBetween={20}
            slidesPerView={1}
            pagination={{ clickable: true }}
            grabCursor
            onSwiper={(instance) => setSwiper(instance)}
            breakpoints={{
              640: { slidesPerView: 1.2, spaceBetween: 20 },
              768: { slidesPerView: 2, spaceBetween: 24 },
              1024: { slidesPerView: 3, spaceBetween: 24 },
            }}
            className="!pb-12 !overflow-visible"
          >
            {testimonials.map((review) => (
              <SwiperSlide key={review.id} className="h-auto">
                <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 px-5 py-5 sm:px-6 sm:py-6 backdrop-blur-sm shadow-soft">
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold">
                          {review.name}
                        </h3>
                        {review.tag && (
                          <p className="text-[11px] sm:text-xs text-brand-muted mt-0.5">
                            {review.tag}
                          </p>
                        )}
                      </div>

                      {review.source && review.url && (
                        <a
                          href={review.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-brand-muted hover:text-white transition-colors"
                        >
                          {review.source}
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-brand-muted leading-relaxed whitespace-pre-line">
                    {review.text}
                  </p>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
