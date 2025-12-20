"use client";

import { useEffect, useMemo, useState } from "react";

type CheckPaymentResp =
  | { ok: true; status?: string; paid?: boolean; recordId?: string }
  | { ok?: boolean; error?: string; details?: string };

export default function PaySuccessPage() {
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<CheckPaymentResp | null>(null);
  const [paymentId, setPaymentId] = useState<string>("");

  const noRedirect = useMemo(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("noRedirect") === "1";
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);

    const pid =
      sp.get("paymentID") ||
      sp.get("PaymentID") ||
      sp.get("paymentId") ||
      sp.get("id") ||
      localStorage.getItem("ameriaPaymentId") ||
      "";

    setPaymentId(pid);

    if (!pid) {
      setLoading(false);
      setResp({ ok: false, error: "paymentId не найден (ни в URL, ни в localStorage)" });
      return;
    }

    // На всякий случай фиксируем в localStorage (если пришло из URL)
    localStorage.setItem("ameriaPaymentId", pid);

    const run = async () => {
      try {
        setLoading(true);

        const r = await fetch("/api/check-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: pid }),
          cache: "no-store",
        });

        const json = await r.json().catch(() => ({}));
        setResp(json);

        const s = String((json as any)?.status ?? "").toLowerCase();

        // Если Ameria еще не в deposited/paid — перекидываем на pending
        if (!noRedirect) {
          if (s === "pending") {
            window.location.href = "/pay/pending";
            return;
          }
        }
      } catch (e: any) {
        setResp({ ok: false, error: e?.message ?? "check-payment failed" });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [noRedirect]);

  const statusLabel = (() => {
    const s = String((resp as any)?.status ?? "").toLowerCase();
    if (s === "paid") return "PAID";
    if (s === "pending") return "PENDING";
    if ((resp as any)?.paid === true) return "PAID";
    if ((resp as any)?.paid === false) return "PENDING";
    return resp ? "UNKNOWN" : "LOADING";
  })();

  return (
    <main className="min-h-[70vh] bg-[#050816]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-muted mb-3">
          Оплата
        </p>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Спасибо! Платёж принят
        </h1>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-soft px-5 py-6 sm:px-6 sm:py-7">
          {loading ? (
            <>
              <p className="text-white text-base sm:text-lg font-semibold">
                ⏳ Подтверждаем платёж…
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Мы проверяем статус в банке и обновляем покупку в системе.
              </p>
            </>
          ) : statusLabel === "PAID" ? (
            <>
              <p className="text-white text-base sm:text-lg font-semibold">
                ✅ Платёж подтверждён
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Статус покупки обновлён. Если у тебя есть доступ/онбординг — можно переходить дальше.
              </p>
            </>
          ) : statusLabel === "PENDING" ? (
            <>
              <p className="text-white text-base sm:text-lg font-semibold">
                ⏳ Платёж в обработке
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Иногда банку нужно чуть больше времени. Мы проверим ещё раз.
              </p>
              <div className="mt-5">
                <button
                  className="rounded-full border border-white/40 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  onClick={() => window.location.href = "/pay/pending"}
                >
                  Перейти на страницу ожидания
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-white text-base sm:text-lg font-semibold">
                ⚠️ Не удалось подтвердить автоматически
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Если деньги списались — ничего страшного: обычно статус подтягивается чуть позже.
              </p>
            </>
          )}

          {!!paymentId && (
            <p className="mt-6 text-xs sm:text-sm text-brand-muted">
              PaymentID: <span className="text-white font-semibold">{paymentId}</span>
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-brand-primary px-4 py-2 text-xs sm:text-sm font-semibold shadow-soft hover:bg-brand-primary/90 transition-colors"
              onClick={() => window.location.reload()}
            >
              Проверить ещё раз
            </button>

            <a
              href="/#pricing"
              className="rounded-full border border-white/40 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Вернуться на сайт
            </a>

            <a
              href="/pay/ameria/return?noRedirect=1"
              className="rounded-full border border-white/20 px-4 py-2 text-xs sm:text-sm font-semibold text-brand-muted hover:bg-white/5 transition-colors"
            >
              Открыть debug return
            </a>
          </div>
        </div>

        {/* Тех. детали — оставляем для дебага */}
        {resp && (
          <details className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <summary className="cursor-pointer text-sm text-white/90">
              Технические детали (check-payment)
            </summary>
            <pre className="mt-3 text-xs text-white/80 whitespace-pre-wrap">
              {JSON.stringify(resp, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </main>
  );
}
