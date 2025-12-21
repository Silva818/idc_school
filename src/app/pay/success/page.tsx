"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CheckPaymentResp =
  | {
      ok: true;
      paymentId?: string;
      status?: "paid" | "pending" | "failed" | "void" | "refunded" | "unknown";
      reasonCode?: string;
      reasonMessage?: string;
      paymentState?: string;
      orderStatus?: number;
      airtable?: any;
      ameria?: any;
    }
  | { ok?: boolean; error?: string; details?: string };

function isTerminalStatus(s: string) {
  return ["paid", "failed", "void", "refunded"].includes(s);
}

export default function PaySuccessPage() {
  const [paymentId, setPaymentId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [resp, setResp] = useState<CheckPaymentResp | null>(null);
  const [ticks, setTicks] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

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
    try {
      setLoading(true);

      const r = await fetch("/api/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: pid }),
        cache: "no-store",
      });

      const json = (await r.json().catch(() => ({}))) as CheckPaymentResp;
      setResp(json);

      const s = String((json as any)?.status ?? "").toLowerCase();

      // Если статус финальный — останавливаем polling
      if (isTerminalStatus(s)) {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }

      // noRedirect оставляем как debug-флажок (вдруг захочешь автопереходы потом)
      if (!noRedirect) {
        // сейчас мы НЕ редиректим никуда — всё показываем на одной странице
      }
    } catch (e: any) {
      setResp({ ok: false, error: e?.message ?? "check-payment failed" });
    } finally {
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

    localStorage.setItem("ameriaPaymentId", pid);

    // первая проверка сразу
    checkOnce(pid);

    // polling каждые 3 сек, пока не станет финальным
    timerRef.current = window.setInterval(() => {
      setTicks((t) => t + 1);
      checkOnce(pid);
    }, 3000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noRedirect]);

  const status = String((resp as any)?.status ?? "").toLowerCase();
  const reasonCode = String((resp as any)?.reasonCode ?? "").trim();
  const reasonMessage = String((resp as any)?.reasonMessage ?? "").trim();

  const title = (() => {
    if (status === "paid") return "Спасибо! Платёж принят";
    if (status === "pending") return "Платёж обрабатывается";
    if (status === "failed") return "Платёж не прошёл";
    if (status === "void") return "Платёж отменён";
    if (status === "refunded") return "Платёж возвращён";
    return "Оплата";
  })();

  return (
    <main className="min-h-[70vh] bg-[#050816]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-muted mb-3">
          Оплата
        </p>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          {title}
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
          ) : status === "paid" ? (
            <>
              <p className="text-white text-base sm:text-lg font-semibold">
                ✅ Платёж подтверждён
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Статус покупки обновлён. Если у тебя есть доступ/онбординг — можно переходить дальше.
              </p>
            </>
          ) : status === "pending" ? (
            <>
              <p className="text-white text-base sm:text-lg font-semibold">
                ⏳ Платёж в обработке
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Иногда банку нужно чуть больше времени. Мы проверяем статус автоматически.
              </p>
            </>
          ) : status === "failed" ? (
            <>
              <p className="text-white text-base sm:text-lg font-semibold">
                ❌ Платёж отклонён
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                {reasonMessage
                  ? `Причина: ${reasonMessage}${reasonCode ? ` (код ${reasonCode})` : ""}.`
                  : "Банк отклонил операцию. Попробуй ещё раз или используй другую карту."}
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Если деньги списались — напиши в поддержку, и мы проверим по PaymentID.
              </p>
            </>
          ) : status === "void" ? (
            <>
              <p className="text-white text-base sm:text-lg font-semibold">
                ⚠️ Платёж отменён
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Операция была отменена. Если хочешь — попробуй оплатить ещё раз.
              </p>
            </>
          ) : status === "refunded" ? (
            <>
              <p className="text-white text-base sm:text-lg font-semibold">
                ↩️ Платёж возвращён
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Похоже, по операции был выполнен возврат. Если есть вопросы — напиши в поддержку.
              </p>
            </>
          ) : resp && (resp as any)?.error ? (
            <>
              <p className="text-white text-base sm:text-lg font-semibold">
                ⚠️ Не удалось проверить платёж
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Если деньги списались — ничего страшного: обычно статус подтягивается чуть позже.
              </p>
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
              disabled={loading}
            >
              {loading ? "Проверяем…" : "Проверить ещё раз"}
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
            {isTerminalStatus(status) ? " (остановлено)" : ""}
          </p>
        </div>

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
