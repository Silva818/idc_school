import { NextResponse } from "next/server";
import crypto from "crypto";

type Currency = "RUB" | "AMD" | "EUR" | "USD";

/* ---------------- ROBOKASSA ---------------- */

function generateRoboPaymentLink(
  paymentId: number | string,
  sum: number,
  email: string
) {
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
  const backURL = `${appBase}/pay/ameria/return`;

  const body = {
    ClientID,
    Username,
    Password,
    Amount: params.amount,
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

/* ---------------- AIRTABLE ---------------- */

async function sendPurchaseToAirtable(fields: Record<string, any>) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_PURCHASE_WEBSITE_TABLE;

  console.log("🔎 Airtable ENV check:", {
    hasApiKey: Boolean(apiKey),
    baseId,
    table,
  });

  if (!apiKey || !baseId || !table) {
    console.warn("❌ Airtable env missing — skip log");
    return;
  }

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(
    table
  )}`;

  console.log("📡 Airtable POST url:", url);
  console.log("📦 Airtable payload:", fields);

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

    console.log("📬 Airtable response:", {
      ok: r.ok,
      status: r.status,
      body: text,
    });

    if (!r.ok) {
      console.error("❌ Airtable write failed");
    } else {
      console.log("✅ Airtable write success");
    }
  } catch (err) {
    console.error("💥 Airtable fetch crashed:", err);
  }
}

/* ---------------- TG TOKEN ---------------- */

function makeTelegramLinkToken() {
  return crypto.randomBytes(16).toString("hex");
}

/* ---------------- API ---------------- */

export async function POST(req: Request) {
  console.log("🔥 create-payment POST hit");

  try {
    const body = await req.json();
    console.log("📥 request body:", body);

    const {
      amount,
      currency,
      email,
      fullName,
      tariffId,
      tariffLabel,
      courseName,
    } = body as {
      amount: number;
      currency: Currency;
      email: string;
      fullName: string;
      tariffId: string;
      tariffLabel: string;
      courseName?: string;
    };

    if (!amount || !currency || !email || !fullName || !tariffId) {
      console.warn("⚠️ Missing fields:", {
        amount,
        currency,
        email,
        fullName,
        tariffId,
      });

      return NextResponse.json({ error: "Не хватает данных" }, { status: 400 });
    }

    const lessonsByTariff: Record<string, number> = {
      review: 1,
      month: 12,
      slow12: 12,
      long36: 36,
    };

    const lessons = lessonsByTariff[tariffId] ?? 1;

    // ✅ NEW: токен создаём сразу при создании оплаты и пишем в Airtable
    const tgToken = makeTelegramLinkToken();

    /* ---------- RUB ---------- */
    if (currency === "RUB") {
      const paymentId = Date.now();
      const paymentUrl = generateRoboPaymentLink(paymentId, amount, email);

      console.log("📝 preparing Airtable fields (RUB)", {
        email,
        fullName,
        amount,
        lessons,
        currency,
        tariffId,
      });

      await sendPurchaseToAirtable({
        email: email,
        FIO: fullName,
        Sum: amount,
        Lessons: lessons,
        id_payment: paymentId,
        Currency: currency,
        Tag: tariffId,
        Status: "created",
        tg_link_token: tgToken, // ✅ NEW
      });

      return NextResponse.json({ paymentUrl, paymentId, tgToken }); // ✅ NEW (удобно для фронта)
    }

    /* ---------- AMERIA ---------- */
    const descriptionByTariff: Record<string, string> = {
      review: "I Do Calisthenics - 1 lesson",
      month: "I Do Calisthenics - 12 lessons (4 weeks)",
      slow12: "I Do Calisthenics - 12 lessons (8 weeks)",
      long36: "I Do Calisthenics - 36 lessons",
    };

    const description =
      descriptionByTariff[tariffId] ?? `I Do Calisthenics - ${tariffId}`;

    const opaque = JSON.stringify({
      tariffId,
      email,
      currency,
    });

    console.log("🏦 Init Ameria payment:", {
      amount,
      currency,
      description,
      opaque,
    });

    const { paymentUrl, paymentId, orderId } = await initAmeriaPayment({
      amount,
      currency,
      description,
      opaque,
    });

    console.log("✅ Ameria init ok:", { paymentId, orderId, paymentUrl });

    console.log("📝 preparing Airtable fields (AMERIA)", {
      email,
      fullName,
      amount,
      lessons,
      currency,
      tariffId,
      paymentId,
      orderId,
    });

    await sendPurchaseToAirtable({
      email: email,
      FIO: fullName,
      Sum: amount,
      Lessons: lessons,
      id_payment: paymentId,
      Currency: currency,
      Tag: tariffId,
      Status: "created",
      tg_link_token: tgToken, // ✅ NEW
    });

    return NextResponse.json({ paymentUrl, paymentId, orderId, tgToken }); // ✅ NEW (удобно для фронта)
  } catch (e: any) {
    console.error("create-payment error:", e);
    return NextResponse.json(
      { error: "Server error", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
