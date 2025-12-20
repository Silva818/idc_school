"use client";

import { useEffect, useState } from "react";

export default function AmeriaReturnPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const fromQuery =
      sp.get("paymentID") || sp.get("PaymentID") || sp.get("id") || sp.get("paymentId");

    const fromStorage = sessionStorage.getItem("ameriaPaymentId");

    setData({
      query: Object.fromEntries(sp.entries()),
      paymentId: fromQuery || fromStorage || null,
    });
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Результат оплаты</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
