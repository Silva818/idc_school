// app/pay/success/page.tsx
"use client";

export default function PaySuccessPage() {
  return (
    <main className="relative min-h-screen w-full bg-[#050816]">
      {/* мягкие свечения как в твоих секциях */}
      <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-brand-blue/30 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-brand-primary/20 blur-[120px]" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-soft p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-brand-muted mb-3">
            <span className="inline-block h-2 aspect-square rounded-full bg-emerald-400" />
            <span>Оплата подтверждена</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
            Спасибо! Оплата прошла успешно ✅
          </h1>

          <p className="text-sm sm:text-base text-brand-muted leading-relaxed mb-6">
            Мы зафиксировали покупку и обновили статус в системе. Если ты покупал
            блок тренировок — можно возвращаться на сайт и продолжать путь.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 mb-6">
            <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
              Что дальше:
              <br />
              • Если у тебя уже есть доступ в приложение — просто продолжай тренировки.
              <br />
              • Если это первая покупка — мы свяжемся с тобой (или ты можешь написать нам в поддержку).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/#pricing"
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold shadow-soft hover:bg-brand-primary/90 transition-colors"
            >
              Вернуться на сайт
            </a>

            <a
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              На главную
            </a>
          </div>

          <p className="mt-6 text-[11px] sm:text-xs text-brand-muted/80">
            Если деньги списались, но доступ не появился — напиши в поддержку и
            приложи PaymentID из страницы возврата.
          </p>
        </div>
      </div>
    </main>
  );
}
