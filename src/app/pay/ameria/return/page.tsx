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

    // Если paymentId есть — сразу проверим реальный статус через Details
    if (paymentId) {
      setLoading(true);

      fetch("/api/payments/ameria/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      })
        .then(async (r) => {
          const json = await r.json();
          setDetails(json);
        })
        .catch((e: any) => {
          setDetails({ ok: false, error: e?.message ?? "Details request failed" });
        })
        .finally(() => setLoading(false));
    }
  }, []);

  // Пытаемся понять итог по details (это важнее чем query)
  const finalStatus = (() => {
    if (!details?.ok) return null;

    // Здесь мы не знаем точный формат статусов Ameria в ответе,
    // поэтому просто показываем details пользователю.
    // При желании можно распарсить details.details.PaymentState / ResponseCode и т.п.
    return "DETAILS_OK";
  })();

  return (
    <main style={{ padding: 24 }}>
      <h1>Результат оплаты</h1>

      {data?.status === "SUCCESS" && <p>✅ Платёж успешно завершён</p>}
      {data?.status === "FAILED" && <p>❌ Платёж не завершён</p>}
      {data?.status === "UNKNOWN" && <p>⚠️ Неизвестный статус (по URL)</p>}

      {!data?.paymentId && (
        <p style={{ marginTop: 12 }}>
          ⚠️ PaymentID не пришёл в URL и не найден в localStorage. Это нормально для некоторых сценариев.
          Попробуй вернуться назад и ещё раз начать оплату (чтобы paymentId сохранился),
          или открой return в той же вкладке, куда тебя вернул банк.
        </p>
      )}

      {data?.paymentId && (
        <p style={{ marginTop: 12 }}>
          PaymentID: <b>{data.paymentId}</b>
        </p>
      )}

      {loading && <p style={{ marginTop: 12 }}>Проверяем статус в Ameria…</p>}

      {details && (
        <>
          <h2 style={{ marginTop: 18 }}>GetPaymentDetails</h2>
          {!details.ok ? (
            <p>❌ Ошибка запроса details: {details.error ?? "unknown"}</p>
          ) : (
            <p>✅ Details получены (см. JSON ниже)</p>
          )}

          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(details, null, 2)}
          </pre>
        </>
      )}

      <h2 style={{ marginTop: 18 }}>Данные возврата</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}
