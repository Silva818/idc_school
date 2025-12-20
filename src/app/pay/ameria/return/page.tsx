"use client";

import { useEffect, useState } from "react";

type DetailsResp =
  | { ok: true; details: any }
  | { ok: false; details?: any; error?: string };

export default function AmeriaReturnPage() {
  const [data, setData] = useState<any>(null);
  const [details, setDetails] = useState<DetailsResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);

    const paymentId =
      sp.get("paymentID") ||
      sp.get("PaymentID") ||
      sp.get("paymentId") ||
      sp.get("id") ||
      localStorage.getItem("ameriaPaymentId");

    const responseCode =
      sp.get("responseCode") ||
      sp.get("ResponseCode") ||
      sp.get("responsecode") ||
      sp.get("resposneCode") ||
      sp.get("ResposneCode");

    const orderId =
      sp.get("orderId") ||
      sp.get("OrderId") ||
      sp.get("orderID") ||
      sp.get("OrderID");

    const status =
      responseCode === "00"
        ? "SUCCESS"
        : responseCode
        ? "FAILED"
        : "UNKNOWN";

    setData({
      status,
      paymentId: paymentId ?? null,
      responseCode: responseCode ?? null,
      orderId: orderId ?? null,
      rawQuery: Object.fromEntries(sp.entries()),
    });

    // Если paymentId есть — сразу дернем check-payment (он обновит Airtable)
    if (paymentId) {
      setLoading(true);

      fetch("/api/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
        cache: "no-store",
      })
        .then(async (r) => {
          const json = await r.json();
          setDetails(json);
        })
        .catch((e: any) => {
          setDetails({
            ok: false,
            error: e?.message ?? "Details request failed",
          });
        })
        .finally(() => setLoading(false));
    }
  }, []);

  // Нормальный финальный статус (по ответу check-payment), если он есть.
  // Если check-payment ещё не готов/упал — используем статус из URL.
  const finalStatus = (() => {
    if (!details) return null;

    if (!details.ok) return "ERROR";

    const s = String((details as any)?.status ?? "").toLowerCase();
    if (s === "paid") return "SUCCESS";
    if (s === "pending") return "PENDING";

    // на случай если API вернет {paid: true/false}
    const paidFlag = (details as any)?.paid;
    if (paidFlag === true) return "SUCCESS";
    if (paidFlag === false) return "PENDING";

    return "UNKNOWN";
  })();

  const showStatus = finalStatus ?? data?.status ?? "UNKNOWN";

  // Авто-редирект на "красивую" страницу (если она у тебя есть)
  // НЕ ломает текущую, потому что если страниц нет — просто выключи.
  useEffect(() => {
    if (!details || !details.ok) return;

    const s = String((details as any)?.status ?? "").toLowerCase();

    // ✅ РЕДИРЕКТ ВКЛЮЧЕН:
    if (s === "paid") window.location.href = "/pay/success";
    if (s === "pending") window.location.href = "/pay/pending";
  }, [details]);

  return (
    <main style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <h1>Результат оплаты</h1>

      {showStatus === "SUCCESS" && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            background: "#0b1220",
          }}
        >
          <p style={{ margin: 0, fontSize: 18 }}>✅ Платёж успешно завершён</p>
          <p style={{ marginTop: 8, opacity: 0.8 }}>
            Спасибо! Мы обновили статус покупки в системе.
          </p>
        </div>
      )}

      {showStatus === "PENDING" && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            background: "#0b1220",
          }}
        >
          <p style={{ margin: 0, fontSize: 18 }}>⏳ Платёж в обработке</p>
          <p style={{ marginTop: 8, opacity: 0.8 }}>
            Иногда банку нужно чуть больше времени. Обнови страницу через минуту.
          </p>
        </div>
      )}

      {showStatus === "FAILED" && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            background: "#0b1220",
          }}
        >
          <p style={{ margin: 0, fontSize: 18 }}>❌ Платёж не завершён</p>
          <p style={{ marginTop: 8, opacity: 0.8 }}>
            Если деньги списались — напиши в поддержку, мы разберёмся.
          </p>
        </div>
      )}

      {showStatus === "ERROR" && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            background: "#0b1220",
          }}
        >
          <p style={{ margin: 0, fontSize: 18 }}>⚠️ Не удалось проверить платёж</p>
          <p style={{ marginTop: 8, opacity: 0.8 }}>
            Проверь чуть позже или напиши в поддержку.
          </p>
        </div>
      )}

      {showStatus === "UNKNOWN" && (
        <p style={{ marginTop: 12 }}>⚠️ Неизвестный статус</p>
      )}

      {!data?.paymentId && (
        <p style={{ marginTop: 12 }}>
          ⚠️ PaymentID не пришёл в URL и не найден в localStorage. Это нормально
          для некоторых сценариев. Попробуй вернуться назад и ещё раз начать
          оплату (чтобы paymentId сохранился), или открой return в той же
          вкладке, куда тебя вернул банк.
        </p>
      )}

      {data?.paymentId && (
        <p style={{ marginTop: 12 }}>
          PaymentID: <b>{data.paymentId}</b>
        </p>
      )}

      {loading && <p style={{ marginTop: 12 }}>Проверяем статус в Ameria…</p>}

      {/* Оставляю твои блоки JSON — ничего не ломаем, просто прячем под details/summary */}
      {details && (
        <details style={{ marginTop: 18 }}>
          <summary style={{ cursor: "pointer" }}>
            Технические детали (GetPaymentDetails)
          </summary>

          {!details.ok ? (
            <p style={{ marginTop: 12 }}>
              ❌ Ошибка запроса check-payment: {details.error ?? "unknown"}
            </p>
          ) : (
            <p style={{ marginTop: 12 }}>✅ check-payment ответ получен</p>
          )}

          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(details, null, 2)}
          </pre>
        </details>
      )}

      <details style={{ marginTop: 18 }}>
        <summary style={{ cursor: "pointer" }}>Данные возврата (query)</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </main>
  );
}
