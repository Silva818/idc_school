// src/app/api/create-payment/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

type Currency = "RUB" | "AMD" | "EUR" | "USD";

function generateRoboPaymentLink(
  paymentId: number | string,
  sum: number,
  email: string
) {
  const shopId = process.env.ROBO_ID;
  const secretKey1 = process.env.ROBO_SECRET1;

  if (!shopId || !secretKey1) {
    throw new Error("ROBO_ID или ROBO_SECRET1 не заданы в .env");
  }

  const sumString = String(sum).replace(",", ".");

  const signature = crypto
    .createHash("md5")
    .update(`${shopId}:${sumString}:${paymentId}:${secretKey1}`)
    .digest("hex");

  return (
    `https://auth.robokassa.ru/Merchant/Index.aspx` +
    `?MerchantLogin=${shopId}` +
    `&OutSum=${encodeURIComponent(sumString)}` +
    `&InvId=${encodeURIComponent(String(paymentId))}` +
    `&SignatureValue=${signature}` +
    `&Email=${encodeURIComponent(email)}` +
    `&IsTest=0`
  );
}

const ameriaCurrency: Record<Exclude<Currency, "RUB">, string> = {
  AMD: "051",
  EUR: "978",
  USD: "840",
};



// const IS_AMERIA_TEST = process.env.AMERIA_TEST_MODE === "true";
// function makeOrderId(): number {
//   if (IS_AMERIA_TEST) {
//     return 4107001 + (Date.now() % 1000); // 4107001..4108000
//   }
//   return Math.floor(Date.now() / 1000);
// }


function makeOrderId(): number {
  /**
   * Формат:
   * - берём последние 9 цифр timestamp в мс
   * - добавляем 2 случайные цифры
   * Итог: 11 цифр, всегда уникально
   */
  const ms = Date.now(); // 13 цифр
  const random = Math.floor(Math.random() * 90) + 10; // 10–99
  return Number(String(ms).slice(-9) + String(random));
}


async function initAmeriaPayment(params: {
  amount: number;
  currency: Exclude<Currency, "RUB">;
  description: string;
  opaque?: string;
}) {
  const base = process.env.AMERIA_VPOS_BASE;
  const ClientID = process.env.AMERIA_CLIENT_ID;
  const Username = process.env.AMERIA_USERNAME;
  const Password = process.env.AMERIA_PASSWORD;
  const appBase = process.env.APP_BASE_URL;

  if (!base || !ClientID || !Username || !Password || !appBase) {
    throw new Error(
      "Не заданы AMERIA_VPOS_BASE / AMERIA_CLIENT_ID / AMERIA_USERNAME / AMERIA_PASSWORD / APP_BASE_URL"
    );
  }

  const orderId = makeOrderId();
  const backURL = `${appBase}/pay/ameria/return?orderId=${orderId}`;


  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Некорректная сумма amount");
  }

  const body = {
    ClientID,
    Username,
    Password,
    Amount: amount,
    OrderID: orderId,
    Description: params.description,
    Currency: ameriaCurrency[params.currency],
    BackURL: backURL,
    Opaque: params.opaque ?? "",
  };

  const r = await fetch(`${base}/api/VPOS/InitPayment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await r.json();

  if (!r.ok || data?.ResponseCode !== 1 || !data?.PaymentID) {
    throw new Error(`Ameria InitPayment failed: ${JSON.stringify(data)}`);
  }

  const paymentUrl = `${base}/Payments/Pay?id=${encodeURIComponent(
    data.PaymentID
  )}&lang=ru`;

  return { paymentUrl, paymentId: data.PaymentID, orderId };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      amount,
      currency,
      email,
      fullName,
      courseName,
      tariffId,
      tariffLabel,
    } = body as {
      amount: number;
      currency: Currency;
      email: string;
      fullName: string;
      courseName?: string;
      tariffId: string;
      tariffLabel: string;
    };

    if (
      !amount ||
      !email ||
      !fullName ||
      !tariffId ||
      !tariffLabel ||
      !currency
    ) {
      return NextResponse.json(
        { error: "Не хватает данных для оплаты" },
        { status: 400 }
      );
    }

    // 1) RUB -> Robokassa (если используешь)
    if (currency === "RUB") {
      const paymentId = Date.now();
      const paymentUrl = generateRoboPaymentLink(paymentId, amount, email);
      return NextResponse.json({ paymentUrl });
    }

    // 2) AMD/EUR/USD -> Ameria vPOS
    const description = tariffLabel || courseName || `Payment: ${tariffId}`;
    const opaque = JSON.stringify({
      tariffId,
      tariffLabel,
      email,
      fullName,
      currency,
    });

    // ✅ ВАЖНО: возвращаем paymentId (и orderId для отладки)
    const { paymentUrl, paymentId, orderId } = await initAmeriaPayment({
      amount,
      currency,
      description,
      opaque,
    });

    return NextResponse.json({ paymentUrl, paymentId, orderId });
  } catch (error: any) {
    console.error("Ошибка в create-payment:", error);
    return NextResponse.json(
      {
        error: "Ошибка на сервере при создании оплаты",
        details: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
}
