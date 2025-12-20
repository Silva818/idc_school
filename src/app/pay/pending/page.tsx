// app/pay/pending/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function PayPendingPage() {
  const [seconds, setSeconds] = useState(15);

  // маленький UX: подсказка, когда можно попробовать обновить
  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="relative min-h-screen w-full bg-[#050816]">
      <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-brand-blue/30 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-brand-primary/20 blur-[120px]" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 relative">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-soft p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-brand-muted mb-3">
            <span className="inline-block h-2 aspect-square rounded-full bg-brand-accent" />
            <span>Обработка платежа</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
            Платёж ещё подтверждается ⏳
          </h1>

          <p className="text-sm sm:text-base text-brand-muted leading-relaxed mb-6">
            Иногда банку нужно чуть больше времени, чтобы окончательно подтвердить
            операцию. Обычно это занимает до пары минут.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 mb-6">
            <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
              Что можно сделать:
              <br />
              • Подожди немного и обнови страницу возврата оплаты.
              <br />
              • Если прошло больше 5–10 минут — напиши в поддержку и приложи PaymentID.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/pay/ameria/return"
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold shadow-soft hover:bg-brand-primary/90 transition-colors"
            >
              Проверить снова {seconds > 0 ? `(${seconds})` : ""}
            </a>

            <a
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              На главную
            </a>
          </div>

          <p className="mt-6 text-[11px] sm:text-xs text-brand-muted/80">
            Если у тебя есть PaymentID — он отображается на странице возврата
            (return). Это ускорит поддержку.
          </p>
        </div>
      </div>
    </main>
  );
}
