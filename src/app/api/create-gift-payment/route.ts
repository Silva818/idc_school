import { NextResponse } from "next/server";
import crypto from "crypto";

type Currency = "AMD" | "EUR" | "USD";
type Locale = "en" | "ru";


/* ---------------- AMERIA ---------------- */

const ameriaCurrency: Record<Currency, string> = {
  AMD: "051",
  EUR: "978",
  USD: "840",
};

/**
 * Делает OrderID:
 * - детерминированным (один tgToken -> один OrderID)
 * - коротким и "безопасным" (1..2_000_000_000), чтобы пройти типичные int32-ограничения шлюза
 */
function makeOrderIdFromToken(tokenHex: string): number {
  const h = crypto.createHash("sha256").update(tokenHex).digest();
  const u32 = h.readUInt32BE(0); // 0..4294967295
  const max = 2_000_000_000;
  return (u32 % max) + 1; // 1..2_000_000_000
}

async function initAmeriaPayment(params: {
  orderId: number;
  amount: number;
  currency: Currency;
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

  const backURL = `${appBase}/pay/ameria/return?locale=${encodeURIComponent(params.locale)}`;

  const body = {
    ClientID,
    Username,
    Password,
    Amount: params.amount,
    OrderID: params.orderId,
    Description: params.description,
    Currency: ameriaCurrency[params.currency],
    BackURL: backURL,
    // На старте лучше держать коротко/ASCII; JSON тоже ок, если шлюз не ругается.
    Opaque: params.opaque ?? "",
    Timeout: 1200,
  };

  const r = await fetch(`${base}/api/VPOS/InitPayment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await r.json();

  if (!r.ok || data?.ResponseCode !== 1 || !data?.PaymentID) {
    console.error("Ameria InitPayment failed", {
      httpOk: r.ok,
      responseCode: data?.ResponseCode,
    });
    throw new Error("Ameria InitPayment failed");
  }
  

  const paymentUrl =
    `${base}/Payments/Pay?id=${encodeURIComponent(data.PaymentID)}` +
    `&lang=${encodeURIComponent(params.locale)}`;

  return { paymentUrl, paymentId: data.PaymentID, orderId: params.orderId };
}

/* ---------------- AIRTABLE ---------------- */

async function sendToAirtable(fields: Record<string, any>) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_PURCHASE_WEBSITE_TABLE;

  if (!apiKey || !baseId || !table) return;
  

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


    if (!r.ok) {
      console.error("❌ Airtable write failed:", r.status);
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

function normalizeEmail(emailRaw: string) {
  return String(emailRaw ?? "").trim().toLowerCase();
}

function digitsOnly(v: string) {
  return String(v).replace(/\D/g, "");
}

function isLikelyValidPhone(nationalOrAny: string) {
  return digitsOnly(nationalOrAny).length >= 6;
}

/* ---------------- API ---------------- */

export async function POST(req: Request) {

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
    const normalizedBuyerEmail = normalizeEmail(buyerEmail);

    // fallback locale
    const referer = req.headers.get("referer") || "";
    const inferredLocale: Locale = referer.includes("/ru") ? "ru" : "en";
    const safeLocale: Locale = locale === "ru" ? "ru" : locale === "en" ? "en" : inferredLocale;

    // minimal validation
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Некорректная сумма" }, { status: 400 });
    }
    if (!buyerName || !String(buyerName).trim()) {
      return NextResponse.json({ error: "Не указано имя" }, { status: 400 });
    }
    if (!normalizedBuyerEmail || !isValidEmail(normalizedBuyerEmail)) {
      return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
    }
    if (!buyerPhone || !isLikelyValidPhone(buyerPhone)) {
      return NextResponse.json({ error: "Некорректный телефон" }, { status: 400 });
    }
    if (!recipientName || !String(recipientName).trim()) {
      return NextResponse.json({ error: "Не указано имя получателя" }, { status: 400 });
    }

    const tgToken = makeTelegramLinkToken();
    const orderId = makeOrderIdFromToken(tgToken);

    // Airtable base fields
    const airtableFieldsBase = {
      email: normalizedBuyerEmail,
      FIO: buyerName,
      Phone: buyerPhone, // поле должно существовать в Airtable
      Sum: Number(amount),
      Lessons: 0,
      Currency: currency,
      Tag: "gift_certificate",
      format: "ds",
      Status: "created",
      tg_link_token: tgToken,
      locale: safeLocale,
      GiftRecipient: recipientName, // поле должно существовать в Airtable
    };

    /* ---------- AMERIA ---------- */
    const description = `I Do Calisthenics - Gift Certificate`;

    // opaque: можно держать коротко, чтобы не ловить ошибки по Opaque
    const opaque = JSON.stringify({
      type: "gift",
      currency,
      locale: safeLocale,
      email: normalizedBuyerEmail,
    });

    const { paymentUrl, paymentId } = await initAmeriaPayment({
      orderId,
      amount,
      currency: currency,
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
      { error: "Server error"},
      { status: 500 }
    );
  }
}
