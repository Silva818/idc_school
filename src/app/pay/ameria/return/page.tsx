"use client";

import { useEffect } from "react";

export default function AmeriaReturnPage() {
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

    // Если платёж подтверждён по query (иногда Ameria возвращает responseCode=00),
    // всё равно уходим на success — там уже будет проверка/обновление Airtable.
    if (paymentId) {
      const url = new URL("/pay/success", window.location.origin);
      url.searchParams.set("paymentId", String(paymentId));
      if (responseCode) url.searchParams.set("responseCode", String(responseCode));
      if (orderId) url.searchParams.set("orderId", String(orderId));

      window.location.replace(url.toString());
      return;
    }

    // Если paymentId нет — уходим на pending (там можно дать кнопку "Проверить ещё раз")
    const pendingUrl = new URL("/pay/pending", window.location.origin);
    if (responseCode) pendingUrl.searchParams.set("responseCode", String(responseCode));
    if (orderId) pendingUrl.searchParams.set("orderId", String(orderId));

    window.location.replace(pendingUrl.toString());
  }, []);

  // Эта страница показывается долю секунды
  return (
    <main style={{ padding: 24, maxWidth: 860, margin: "0 auto" }}>
      <h1>Возвращаемся после оплаты…</h1>
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        Сейчас перенаправим на страницу результата.
      </p>
    </main>
  );
}
