// src/app/[locale]/pay/success/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type CheckPaymentResp =
  | { ok: true; status?: string; paid?: boolean; recordId?: string }
  | { ok?: boolean; error?: string; details?: string };

function useLocalePrefix() {
  const pathname = usePathname();
  return pathname.startsWith("/ru") ? "/ru" : "";
}

export default function PaySuccessPage() {
  const pref = useLocalePrefix();

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
      setResp({
        ok: false,
        error: "paymentId не найден (ни в URL, ни в localStorage)",
      });
      return;
    }

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

        // ✅ учитываем локаль
        if (!noRedirect && s === "pending") {
          window.location.href = `${pref}/pay/pending`;
          return;
        }
      } catch (e: any) {
        setResp({ ok: false, error: e?.message ?? "check-payment failed" });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [noRedirect, pref]);

  const statusLabel = (() => {
    const s = String((resp as any)?.status ?? "").toLowerCase();

    if (s === "paid") return "PAID";
    if (s === "pending") return "PENDING";
    if (s === "declined") return "DECLINED";
    if (s === "canceled") return "CANCELED";
    if (s === "refunded") return "REFUNDED";
    if (s === "error") return "ERROR";

    if ((resp as any)?.paid === true) return "PAID";
    if ((resp as any)?.paid === false) return "PENDING";

    return resp ? "UNKNOWN" : "LOADING";
  })();

  return (
    <main className="min-h-screen bg-[#050816] flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-soft px-6 py-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-muted mb-3">
            Оплата
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-white mb-6">
            {statusLabel === "PAID"
              ? "Спасибо! Платёж принят"
              : statusLabel === "PENDING"
              ? "Оплата в обработке"
              : statusLabel === "DECLINED"
              ? "Платёж отклонён"
              : statusLabel === "CANCELED"
              ? "Платёж отменён"
              : statusLabel === "REFUNDED"
              ? "Платёж возвращён"
              : statusLabel === "ERROR"
              ? "Ошибка платежа"
              : "Статус оплаты"}
          </h1>

          {loading ? (
            <>
              <p className="text-white text-base font-semibold">
                ⏳ Подтверждаем платёж…
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Мы проверяем статус в банке
              </p>
            </>
          ) : statusLabel === "PAID" ? (
            <>
              <p className="text-white text-base font-semibold">
                ✅ Платёж подтверждён
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Статус покупки успешно обновлён
              </p>
            </>
          ) : statusLabel === "PENDING" ? (
            <>
              <p className="text-white text-base font-semibold">
                ⏳ Платёж в обработке
              </p>
              <p className="mt-2 text-sm text-brand-muted">
                Банку нужно немного больше времени
              </p>
              <button
                className="mt-4 rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors w-full"
                onClick={() => (window.location.href = `${pref}/pay/pending`)}
              >
                Перейти на страницу ожидания
              </button>
            </>
          ) : (
            <>
              <p className="text-white text-base font-semibold">
                {statusLabel === "DECLINED"
                  ? "❌ Платёж отклонён"
                  : statusLabel === "CANCELED"
                  ? "🛑 Платёж отменён"
                  : statusLabel === "REFUNDED"
                  ? "💸 Платёж возвращён"
                  : statusLabel === "ERROR"
                  ? "⚠️ Ошибка при обработке платежа"
                  : "⚠️ Не удалось подтвердить"}
              </p>

              <p className="mt-2 text-sm text-brand-muted">
                {(() => {
                  const bank = (resp as any)?.bank;
                  const code = bank?.code ? `Код: ${bank.code}. ` : "";
                  const reason =
                    bank?.reason ||
                    (resp as any)?.details ||
                    (resp as any)?.error ||
                    "";

                  if (reason) return `${code}${reason}`;
                  return "Если деньги списались — статус может появиться позже.";
                })()}
              </p>
            </>
          )}

          {!!paymentId && (
            <p className="mt-6 text-xs text-brand-muted break-all">
              PaymentID:{" "}
              <span className="text-white font-semibold">{paymentId}</span>
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <button
              className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold shadow-soft hover:bg-brand-primary/90 transition-colors"
              onClick={() => window.location.reload()}
            >
              Проверить ещё раз
            </button>

            <a
              href={`${pref}/#pricing`}
              className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Вернуться на сайт
            </a>

            <a
              href="/pay/ameria/return?noRedirect=1"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-brand-muted hover:bg-white/5 transition-colors"
            >
              Debug return
            </a>
          </div>
        </div>

        {resp && (
          <details className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <summary className="cursor-pointer text-sm text-white/90 text-center">
              Технические детали
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
