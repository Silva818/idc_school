// src/app/pay/ameria/return/page.tsx
export const dynamic = "force-dynamic";

export default async function AmeriaReturnPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const paymentID = typeof searchParams.paymentID === "string" ? searchParams.paymentID : null;

  return (
    <main style={{ padding: 24 }}>
      <h1>Результат оплаты</h1>
      {!paymentID ? (
        <p>Не найден paymentID в параметрах возврата.</p>
      ) : (
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify({ searchParams }, null, 2)}
        </pre>
      )}
    </main>
  );
}
