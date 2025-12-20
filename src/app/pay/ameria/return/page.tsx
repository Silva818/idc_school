// "use client";

// import { useEffect, useState } from "react";

// type DetailsResp =
//   | { ok: true; details: any }
//   | { ok: false; details?: any; error?: string };

// export default function AmeriaReturnPage() {
//   const [data, setData] = useState<any>(null);
//   const [details, setDetails] = useState<DetailsResp | null>(null);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const sp = new URLSearchParams(window.location.search);

//     const paymentId =
//       sp.get("paymentID") ||
//       sp.get("PaymentID") ||
//       sp.get("paymentId") ||
//       sp.get("id") ||
//       localStorage.getItem("ameriaPaymentId");

//     const responseCode =
//       sp.get("responseCode") ||
//       sp.get("ResponseCode") ||
//       sp.get("responsecode") ||
//       sp.get("resposneCode") ||
//       sp.get("ResposneCode");

//     const orderId =
//       sp.get("orderId") ||
//       sp.get("OrderId") ||
//       sp.get("orderID") ||
//       sp.get("OrderID");

//     const status =
//       responseCode === "00"
//         ? "SUCCESS"
//         : responseCode
//         ? "FAILED"
//         : "UNKNOWN";

//     setData({
//       status,
//       paymentId: paymentId ?? null,
//       responseCode: responseCode ?? null,
//       orderId: orderId ?? null,
//       rawQuery: Object.fromEntries(sp.entries()),
//     });

//     // Если paymentId есть — сразу дернем check-payment (он обновит Airtable)
//     if (paymentId) {
//       setLoading(true);

//       fetch("/api/check-payment", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ paymentId }),
//         cache: "no-store",
//       })
//         .then(async (r) => {
//           const json = await r.json();
//           setDetails(json);
//         })
//         .catch((e: any) => {
//           setDetails({
//             ok: false,
//             error: e?.message ?? "Details request failed",
//           });
//         })
//         .finally(() => setLoading(false));
//     }
//   }, []);

//   // Нормальный финальный статус (по ответу check-payment), если он есть.
//   // Если check-payment ещё не готов/упал — используем статус из URL.
//   const finalStatus = (() => {
//     if (!details) return null;

//     if (!details.ok) return "ERROR";

//     const s = String((details as any)?.status ?? "").toLowerCase();
//     if (s === "paid") return "SUCCESS";
//     if (s === "pending") return "PENDING";

//     // на случай если API вернет {paid: true/false}
//     const paidFlag = (details as any)?.paid;
//     if (paidFlag === true) return "SUCCESS";
//     if (paidFlag === false) return "PENDING";

//     return "UNKNOWN";
//   })();

//   const showStatus = finalStatus ?? data?.status ?? "UNKNOWN";

//   // Авто-редирект на "красивую" страницу (если она у тебя есть)
//   // НЕ ломает текущую, потому что если страниц нет — просто выключи.
//   useEffect(() => {
//     if (!details || !details.ok) return;

//     const s = String((details as any)?.status ?? "").toLowerCase();

//     // ✅ РЕДИРЕКТ ВКЛЮЧЕН:
//     if (s === "paid") window.location.href = "/pay/success";
//     if (s === "pending") window.location.href = "/pay/pending";
//   }, [details]);

//   return (
//     <main style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
//       <h1>Результат оплаты</h1>

//       {showStatus === "SUCCESS" && (
//         <div
//           style={{
//             marginTop: 12,
//             padding: 14,
//             borderRadius: 12,
//             background: "#0b1220",
//           }}
//         >
//           <p style={{ margin: 0, fontSize: 18 }}>✅ Платёж успешно завершён</p>
//           <p style={{ marginTop: 8, opacity: 0.8 }}>
//             Спасибо! Мы обновили статус покупки в системе.
//           </p>
//         </div>
//       )}

//       {showStatus === "PENDING" && (
//         <div
//           style={{
//             marginTop: 12,
//             padding: 14,
//             borderRadius: 12,
//             background: "#0b1220",
//           }}
//         >
//           <p style={{ margin: 0, fontSize: 18 }}>⏳ Платёж в обработке</p>
//           <p style={{ marginTop: 8, opacity: 0.8 }}>
//             Иногда банку нужно чуть больше времени. Обнови страницу через минуту.
//           </p>
//         </div>
//       )}

//       {showStatus === "FAILED" && (
//         <div
//           style={{
//             marginTop: 12,
//             padding: 14,
//             borderRadius: 12,
//             background: "#0b1220",
//           }}
//         >
//           <p style={{ margin: 0, fontSize: 18 }}>❌ Платёж не завершён</p>
//           <p style={{ marginTop: 8, opacity: 0.8 }}>
//             Если деньги списались — напиши в поддержку, мы разберёмся.
//           </p>
//         </div>
//       )}

//       {showStatus === "ERROR" && (
//         <div
//           style={{
//             marginTop: 12,
//             padding: 14,
//             borderRadius: 12,
//             background: "#0b1220",
//           }}
//         >
//           <p style={{ margin: 0, fontSize: 18 }}>⚠️ Не удалось проверить платёж</p>
//           <p style={{ marginTop: 8, opacity: 0.8 }}>
//             Проверь чуть позже или напиши в поддержку.
//           </p>
//         </div>
//       )}

//       {showStatus === "UNKNOWN" && (
//         <p style={{ marginTop: 12 }}>⚠️ Неизвестный статус</p>
//       )}

//       {!data?.paymentId && (
//         <p style={{ marginTop: 12 }}>
//           ⚠️ PaymentID не пришёл в URL и не найден в localStorage. Это нормально
//           для некоторых сценариев. Попробуй вернуться назад и ещё раз начать
//           оплату (чтобы paymentId сохранился), или открой return в той же
//           вкладке, куда тебя вернул банк.
//         </p>
//       )}

//       {data?.paymentId && (
//         <p style={{ marginTop: 12 }}>
//           PaymentID: <b>{data.paymentId}</b>
//         </p>
//       )}

//       {loading && <p style={{ marginTop: 12 }}>Проверяем статус в Ameria…</p>}

//       {/* Оставляю твои блоки JSON — ничего не ломаем, просто прячем под details/summary */}
//       {details && (
//         <details style={{ marginTop: 18 }}>
//           <summary style={{ cursor: "pointer" }}>
//             Технические детали (GetPaymentDetails)
//           </summary>

//           {!details.ok ? (
//             <p style={{ marginTop: 12 }}>
//               ❌ Ошибка запроса check-payment: {details.error ?? "unknown"}
//             </p>
//           ) : (
//             <p style={{ marginTop: 12 }}>✅ check-payment ответ получен</p>
//           )}

//           <pre style={{ whiteSpace: "pre-wrap" }}>
//             {JSON.stringify(details, null, 2)}
//           </pre>
//         </details>
//       )}

//       <details style={{ marginTop: 18 }}>
//         <summary style={{ cursor: "pointer" }}>Данные возврата (query)</summary>
//         <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
//       </details>
//     </main>
//   );
// }


"use client";

import { useEffect, useMemo, useState } from "react";

type CheckPaymentResp =
  | { ok: true; status?: string; paid?: boolean; recordId?: string; updated?: any; ameria?: any; airtable?: any }
  | { ok: false; error?: string; details?: any };

export default function AmeriaReturnPage() {
  const [data, setData] = useState<any>(null);
  const [details, setDetails] = useState<CheckPaymentResp | null>(null);
  const [loading, setLoading] = useState(false);

  const sp = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search);
  }, []);

  const noRedirect = useMemo(() => {
    if (!sp) return false;
    // ✅ Отключить редирект можно так: /pay/ameria/return?noRedirect=1
    return sp.get("noRedirect") === "1" || sp.get("debug") === "1";
  }, [sp]);

  useEffect(() => {
    if (!sp) return;

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
      noRedirect,
    });

    // Если paymentId есть — дернем check-payment (он обновит Airtable)
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
            error: e?.message ?? "check-payment request failed",
          });
        })
        .finally(() => setLoading(false));
    }
  }, [sp, noRedirect]);

  // Нормальный финальный статус (по ответу check-payment), если он есть.
  // Если check-payment ещё не готов/упал — используем статус из URL.
  const finalStatus = useMemo(() => {
    if (!details) return null;
    if (!(details as any)?.ok) return "ERROR";

    const s = String((details as any)?.status ?? "").toLowerCase();
    if (s === "paid") return "SUCCESS";
    if (s === "pending") return "PENDING";
    if (s === "failed") return "FAILED";

    const paidFlag = (details as any)?.paid;
    if (paidFlag === true) return "SUCCESS";
    if (paidFlag === false) return "PENDING";

    return "UNKNOWN";
  }, [details]);

  const showStatus = finalStatus ?? data?.status ?? "UNKNOWN";

  // ✅ Редирект ТОЛЬКО ПОСЛЕ того, как check-payment реально вернул статус
  useEffect(() => {
    if (noRedirect) return; // ✅ debug/ручной режим
    if (!details) return;
    if (!(details as any)?.ok) return;

    const s = String((details as any)?.status ?? "").toLowerCase();

    // Чтобы не было "мигания" — делаем микрозадержку
    const t = setTimeout(() => {
      if (s === "paid") window.location.replace("/pay/success");
      if (s === "pending") window.location.replace("/pay/pending");
      if (s === "failed") window.location.replace("/pay/pending"); // или сделай /pay/failed
    }, 400);

    return () => clearTimeout(t);
  }, [details, noRedirect]);

  return (
    <main className="min-h-[70vh] px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-6">
          Результат оплаты
        </h1>

        {showStatus === "SUCCESS" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 backdrop-blur-sm shadow-soft">
            <p className="text-lg sm:text-xl m-0">✅ Платёж успешно завершён</p>
            <p className="mt-2 text-sm text-brand-muted">
              Спасибо! Мы обновили статус покупки в системе.
            </p>
            {!noRedirect && (
              <p className="mt-3 text-xs text-brand-muted/80">
                Сейчас перенаправим на страницу успеха…
              </p>
            )}
          </div>
        )}

        {showStatus === "PENDING" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 backdrop-blur-sm shadow-soft">
            <p className="text-lg sm:text-xl m-0">⏳ Платёж в обработке</p>
            <p className="mt-2 text-sm text-brand-muted">
              Иногда банку нужно чуть больше времени. Можно обновить страницу через минуту.
            </p>
            {!noRedirect && (
              <p className="mt-3 text-xs text-brand-muted/80">
                Сейчас перенаправим на страницу ожидания…
              </p>
            )}
          </div>
        )}

        {showStatus === "FAILED" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 backdrop-blur-sm shadow-soft">
            <p className="text-lg sm:text-xl m-0">❌ Платёж не завершён</p>
            <p className="mt-2 text-sm text-brand-muted">
              Если деньги списались — напиши в поддержку, мы поможем разобраться.
            </p>
          </div>
        )}

        {showStatus === "ERROR" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 backdrop-blur-sm shadow-soft">
            <p className="text-lg sm:text-xl m-0">⚠️ Не удалось проверить платёж</p>
            <p className="mt-2 text-sm text-brand-muted">
              Попробуй обновить страницу или вернуться чуть позже.
            </p>
          </div>
        )}

        {showStatus === "UNKNOWN" && (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 backdrop-blur-sm shadow-soft">
            <p className="text-lg sm:text-xl m-0">⚠️ Неизвестный статус</p>
            <p className="mt-2 text-sm text-brand-muted">
              Проверяем информацию… Если ничего не меняется — открой «Технические детали».
            </p>
          </div>
        )}

        {data?.paymentId && (
          <p className="mt-6 text-sm text-brand-muted">
            PaymentID: <b className="text-white">{data.paymentId}</b>
          </p>
        )}

        {loading && (
          <p className="mt-3 text-sm text-brand-muted">
            Проверяем статус в Ameria…
          </p>
        )}

        {/* Debug: чтобы не ломать — оставляю */}
        {details && (
          <details className="mt-8 rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
            <summary className="cursor-pointer text-sm">
              Технические детали (check-payment)
            </summary>

            {!((details as any)?.ok) ? (
              <p className="mt-3 text-sm">
                ❌ Ошибка запроса check-payment: {(details as any)?.error ?? "unknown"}
              </p>
            ) : (
              <p className="mt-3 text-sm">✅ check-payment ответ получен</p>
            )}

            <pre className="mt-3 text-xs whitespace-pre-wrap">
              {JSON.stringify(details, null, 2)}
            </pre>
          </details>
        )}

        <details className="mt-4 rounded-2xl border border-white/10 bg-white/3 px-4 py-3">
          <summary className="cursor-pointer text-sm">Данные возврата (query)</summary>
          <pre className="mt-3 text-xs whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>

        {/* Быстрая подсказка для дебага */}
        <div className="mt-6 text-xs text-brand-muted/80">
          <p className="m-0">
            Для дебага открой эту страницу так:{" "}
            <code className="text-white">/pay/ameria/return?noRedirect=1</code>
            {" "}— тогда не будет автоматического редиректа.
          </p>
        </div>
      </div>
    </main>
  );
}
