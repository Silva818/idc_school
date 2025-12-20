// src/app/pay/ameria/return/page.tsx
export const dynamic = "force-dynamic";

export default function AmeriaReturnPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const responseCode =
    typeof searchParams.responseCode === "string"
      ? searchParams.responseCode
      : null;

  const paymentID =
    typeof searchParams.paymentID === "string"
      ? searchParams.paymentID
      : null;

  const isSuccess = responseCode === "00";

  return (
    <main style={{ padding: 24 }}>
      <h1>{isSuccess ? "Оплата прошла успешно 🎉" : "Платёж не завершён"}</h1>

      {isSuccess ? (
        <p>Спасибо! Мы получили оплату. Инструкции придут на email.</p>
      ) : (
        <p>
          Платёж не был завершён. Попробуйте ещё раз или напишите в поддержку.
        </p>
      )}

      {/* можно оставить paymentID для поддержки */}
      <p style={{ opacity: 0.7, marginTop: 16 }}>
        PaymentID: {paymentID ?? "—"}
      </p>
    </main>
  );
}
