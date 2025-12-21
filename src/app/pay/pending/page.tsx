"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CheckPaymentResp =
  | { ok: true; status?: string; paid?: boolean; recordId?: string }
  | { ok?: boolean; error?: string; details?: string };

export default function PayPendingPage() {
  const [paymentId, setPaymentId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [resp, setResp] = useState<CheckPaymentResp | null>(null);
  const [ticks, setTicks] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  // NEW: чтобы не было параллельных запросов
  const inFlightRef = useRef<boolean>(false);

  // NEW: лимит попыток (например ~3 минуты при 3с интервале)
  const MAX_TICKS = 60;

  const noRedirect = useMemo(() => {
    if (typeof window === "undefined") return false;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("noRedirect") === "1";
  }, []);

  const readPaymentId = () => {
    const sp = new URLSearchParams(window.location.search);
    const pid =
      sp.get("paymentID") ||
      sp.get("PaymentID") ||
      sp.get("paymentId") ||
      sp.get("id") ||
      localStorage.getItem("ameriaPaymentId") ||
      "";
    return pid;
  };

  const checkOnce = async (pid: string) => {
    // NEW: не запускаем новый запрос, пока не завершился предыдущий
    if (inFlightRef.current) return;
    inFlightRef.current = true;

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

      if (!noRedirect) {
        if (["paid", "declined", "canceled", "refunded", "error"].includes(s)) {
          window.location.href = "/pay/success";
          return;
        }
      }
    } catch (e: any) {
      setResp({ ok: false, error: e?.message ?? "check-payment failed" });
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    const pid = readPaymentId();
    setPaymentId(pid);

    if (!pid) {
      setLoading(false);
      setResp({ ok: false, error: "paymentId не найден (ни в URL, ни в localStorage)" });
      return;
    }

    // на всякий случай фиксируем
    localStorage.setItem("ameriaPaymentId", pid);

    // первая проверка сразу
    checkOnce(pid);

    // затем polling
    timerRef.current = window.setInterval(() => {
      setTicks((t) => {
        const next = t + 1;

        // NEW: стопаемся по лимиту
        if (next >= MAX_TICKS) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          return next;
        }

        return next;
      });

      // NEW: после лимита больше не дергаем
      // (здесь используем текущее значение ticks "как есть" — ок для простого стопа)
      checkOnce(pid);
    }, 3000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noRedirect]);

  const statusLabel = (() => {
    const s = String((resp as any)?.status ?? "").toLowerCase();
    if (s === "paid") return "PAID";
    if (s === "pending") return "PENDING";
    if ((resp as any)?.paid === true) return "PAID";
    if ((resp as any)?.paid === false) return "PENDING";
    if (resp && (resp as any)?.error) return "ERROR";
    return "UNKNOWN";
  })();

  return (
    <main className="min-h-[70vh] bg-[#050816]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-muted mb-3">
          Оплата
        </p>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          Платёж обрабатывается
        </h1>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-soft px-5 py-6 sm:px-6 sm:py-7">
          {paymentId ? (
            <p className="text-xs sm:text-sm text-brand-muted">
              PaymentID: <span className="text-white font-semibold">{paymentId}</span>
            </p>
          ) : null}

          <div className="mt-4">
            {statusLabel === "PAID" ? (
              <>
                <p className="text-white text-base sm:text-lg font-semibold">
                  ✅ Платёж подтверждён
                </p>
                <p className="mt-2 text-sm text-brand-muted">
                  Сейчас перенаправим на страницу успеха.
                </p>
              </>
            ) : statusLabel === "ERROR" ? (
              <>
                <p className="text-white text-base sm:text-lg font-semibold">
                  ⚠️ Не удалось проверить платёж
                </p>
                <p className="mt-2 text-sm text-brand-muted">
                  Попробуй ещё раз через минуту. Если деньги списались — статус обычно
                  подтягивается чуть позже.
                </p>
              </>
            ) : (
              <>
                <p className="text-white text-base sm:text-lg font-semibold">
                  ⏳ Ждём подтверждение банка…
                </p>
                <p className="mt-2 text-sm text-brand-muted">
                  Мы автоматически проверяем статус каждые несколько секунд и обновляем покупку в Airtable.
                </p>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-brand-primary px-4 py-2 text-xs sm:text-sm font-semibold shadow-soft hover:bg-brand-primary/90 transition-colors"
              onClick={() => window.location.reload()}
              disabled={loading}
            >
              {loading ? "Проверяем…" : "Проверить сейчас"}
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

          <p className="mt-5 text-[11px] text-brand-muted/80">
            Автопроверка: {ticks} попыток
          </p>
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
