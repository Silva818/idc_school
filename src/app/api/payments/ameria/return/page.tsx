"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function AmeriaReturnPage() {
  const sp = useSearchParams();
  const paymentID = sp.get("paymentID"); // банк присылает paymentID в query :contentReference[oaicite:9]{index=9}
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!paymentID) return;

    (async () => {
      const r = await fetch("/api/ameria/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: paymentID }),
      });
      const data = await r.json();
      setResult(data);
    })();
  }, [paymentID]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Результат оплаты</h1>
      {!paymentID ? (
        <p>Не найден paymentID в параметрах возврата.</p>
      ) : (
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(
            { query: Object.fromEntries(sp.entries()), result },
            null,
            2
          )}
        </pre>
      )}
    </main>
  );
}
