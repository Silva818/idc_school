import { NextResponse } from "next/server";

type TariffId = "online_test" | "short1" | "short12" | "long12" | "long36";
const allowedCurrencies = ["AMD", "EUR", "USD", "RUB"] as const;
type Currency = (typeof allowedCurrencies)[number];

const ameriaCurrency: Record<Currency, string> = {
  AMD: "051",
  EUR: "978",
  USD: "840",
  RUB: "643",
};

function parseCurrency(value: unknown): Currency | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if ((allowedCurrencies as readonly string[]).includes(normalized)) {
    return normalized as Currency;
  }
  return null;
}

function makeOrderId(): number {
  // в доке OrderID = integer :contentReference[oaicite:3]{index=3}
  return Math.floor(Date.now() / 1000);
}

export async function POST(req: Request) {
  try {
    const {
      tariffId,
      amount,
      currency: currencyRaw,
    }: { tariffId: TariffId; amount: number; currency: unknown } = await req.json();

    const currency = parseCurrency(currencyRaw);

    if (!tariffId || !amount) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }
    if (!currency) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    const base = process.env.AMERIA_VPOS_BASE!;
    const ClientID = process.env.AMERIA_CLIENT_ID!;
    const Username = process.env.AMERIA_USERNAME!;
    const Password = process.env.AMERIA_PASSWORD!;
    const appBase = process.env.APP_BASE_URL!;

    const orderId = makeOrderId();
    const backURL = `${appBase}/pay/ameria/return`; // куда вернёт банк после оплаты :contentReference[oaicite:4]{index=4}

    // InitPaymentRequest поля из дока 
    const body = {
      ClientID,
      Username,
      Password,
      Amount: Number(amount),
      OrderID: orderId,
      Description: `Training plan: ${tariffId}`,
      Currency: ameriaCurrency[currency],
      BackURL: backURL,
      Opaque: JSON.stringify({ tariffId, currency }), // "Additional data" :contentReference[oaicite:6]{index=6}
      // Timeout: 1200, // максимум 1200 сек, дефолт 1200 :contentReference[oaicite:7]{index=7}
    };

    const r = await fetch(`${base}/api/VPOS/InitPayment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await r.json();

    // InitPaymentResponse: ResponseCode успешный = 1 
    if (!r.ok || data?.ResponseCode !== 1 || !data?.PaymentID) {
      return NextResponse.json(
        { error: "InitPayment failed", details: data },
        { status: 502 }
      );
    }

    // редирект на форму оплаты: /Payments/Pay?id=@id&lang=@lang :contentReference[oaicite:9]{index=9}
    const payUrl = `${base}/Payments/Pay?id=${encodeURIComponent(
      data.PaymentID
    )}&lang=ru`;

    return NextResponse.json({
      payUrl,
      paymentId: data.PaymentID,
      orderId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
