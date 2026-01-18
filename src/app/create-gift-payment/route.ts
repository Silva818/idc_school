import { NextResponse } from "next/server";
import crypto from "crypto";

type Currency = "RUB" | "AMD" | "EUR" | "USD";
type Locale = "en" | "ru";

/* ---------------- ROBOKASSA ---------------- */

function generateRoboPaymentLink(paymentId: number | string, sum: number, email: string) {
  const shopId = process.env.ROBO_ID;
  const secretKey1 = process.env.ROBO_SECRET1;

  if (!shopId || !secretKey1) {
    throw new Error("ROBO_ID или ROBO_SECRET1 не заданы");
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

/* ---------------- AMERIA ---------------- */

const ameriaCurrency: Record<Exclude<Currency, "RUB">, string> = {
  AMD: "051",
  EUR: "978",
  USD: "840",
};

function makeOrderId(): number {
  return 1000000 + (Date.now() % 9000000);
}

async function initAmeriaPayment(params: {
  amount: number;
  currency: Exclude<Currency, "RUB">;
  description: string;
  opaque?: string;
  locale: Locale;
}) {
  const base = process.env.AMERIA_VPOS_BASE?.replace(/\/+$/, "");
  const ClientID = process.env.AMERIA_CLIENT_ID;
  const Username = process.env.AMERIA_USERNAME;
  const Password = process.env.AMERIA_PASSWORD;
  const appBase = process.env.APP_BASE_URL?.replace(/\/+$/, "");

  if (!base || !ClientID || !Username || !Password || !appBase) {
    throw new Error("Ameria env vars missing");
  }

  const orderId = makeOrderId();

  // вернёмся на твой return-роут (как и для обычных оплат)
  const backURL = `${appBase}/pay/ameria/return?locale=${encodeURIComponent(params.locale)}`;

  const body = {
    ClientID,
    Username,
    Password,
    Amount: params.amount,
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

  const paymentUrl =
    `${base}/Payments/Pay?id=${encodeURIComponent(data.PaymentID)}` +
    `&lang=${encodeURIComponent(params.locale)}`;

  return { paymentUrl, paymentId: data.PaymentID, orderId };
}

/* ---------------- AIRTABLE ---------------- */

async function sendToAirtable(fields: Record<string, any>) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_PURCHASE_WEBSITE_TABLE;

  if (!apiKey || !baseId || !table) {
    console.warn("❌ Airtable env missing — skip log");
    return;
  }

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
      cache: "no-store",
    });

    const text = await r.text();

    if (!r.ok) {
      console.error("❌ Airtable write failed:", text);
    }
  } catch (err) {
    console.error("💥 Airtable fetch crashed:", err);
  }
}

/* ---------------- TG TOKEN ---------------- */

function makeTelegramLinkToken() {
  return crypto.randomBytes(16).toString("hex");
}

/* ---------------- VALIDATION ---------------- */

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function digitsOnly(v: string) {
  return String(v).replace(/\D/g, "");
}

function isLikelyValidPhone(nationalOrAny: string) {
  // базовая проверка как у тебя: 6+ цифр
  return digitsOnly(nationalOrAny).length >= 6;
}

/* ---------------- API ---------------- */

export async function POST(req: Request) {
  console.log("🎁 create-gift-payment POST hit");

  try {
    const body = await req.json().catch(() => ({}));

    const {
      amount,
      currency,
      locale,
      buyerName,
      buyerEmail,
      buyerPhone,
      recipientName,
    } = body as {
      amount: number;
      currency: Currency;
      locale?: Locale;
      buyerName: string;
      buyerEmail: string;
      buyerPhone: string;
      recipientName: string;
    };

    // fallback locale (как у тебя)
    const referer = req.headers.get("referer") || "";
    const inferredLocale: Locale = referer.includes("/ru") ? "ru" : "en";
    const safeLocale: Locale =
      locale === "ru" ? "ru" : locale === "en" ? "en" : inferredLocale;

    // минимальная валидация
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Некорректная сумма" }, { status: 400 });
    }
    if (!currency) {
      return NextResponse.json({ error: "Не указана валюта" }, { status: 400 });
    }
    if (!buyerName || !String(buyerName).trim()) {
      return NextResponse.json({ error: "Не указано имя" }, { status: 400 });
    }
    if (!buyerEmail || !isValidEmail(buyerEmail)) {
      return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
    }
    if (!buyerPhone || !isLikelyValidPhone(buyerPhone)) {
      return NextResponse.json({ error: "Некорректный телефон" }, { status: 400 });
    }
    if (!recipientName || !String(recipientName).trim()) {
      return NextResponse.json({ error: "Не указано имя получателя" }, { status: 400 });
    }

    const tgToken = makeTelegramLinkToken();

    // Airtable base fields (в одну таблицу)
    const airtableFieldsBase = {
      email: buyerEmail,
      FIO: buyerName,
      Phone: buyerPhone, // ⚠️ поле должно существовать в Airtable; если нет — убери эту строку
      Sum: Number(amount),
      Lessons: 0,
      Currency: currency,
      Tag: "gift",
      Status: "created",
      tg_link_token: tgToken,
      locale: safeLocale,

      GiftRecipient: recipientName, // ⚠️ поле должно существовать; если нет — убери или переименуй
    };

    /* ---------- RUB (ROBOKASSA) ---------- */
    if (currency === "RUB") {
      const paymentId = Date.now();
      const paymentUrl = generateRoboPaymentLink(paymentId, amount, buyerEmail);

      await sendToAirtable({
        ...airtableFieldsBase,
        id_payment: paymentId,
      });

      return NextResponse.json({ paymentUrl, paymentId, tgToken });
    }

    /* ---------- AMERIA ---------- */
    const description = `I Do Calisthenics - Gift Certificate`;

    // opaque: держим минимум
    const opaque = JSON.stringify({
      type: "gift",
      currency,
      locale: safeLocale,
      email: buyerEmail,
    });

    const { paymentUrl, paymentId, orderId } = await initAmeriaPayment({
      amount,
      currency: currency as Exclude<Currency, "RUB">,
      description,
      opaque,
      locale: safeLocale,
    });

    await sendToAirtable({
      ...airtableFieldsBase,
      id_payment: paymentId,
    });

    return NextResponse.json({ paymentUrl, paymentId, orderId, tgToken });
  } catch (e: any) {
    console.error("create-gift-payment error:", e);
    return NextResponse.json(
      { error: "Server error", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
