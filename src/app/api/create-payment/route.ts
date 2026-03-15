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

function makeOrderIdFromToken(tokenHex: string): number {
  // Детерминированно: один token -> один OrderID
  const h = crypto.createHash("sha256").update(tokenHex).digest();

  // Берём первые 4 байта => uint32
  const u32 = h.readUInt32BE(0); // 0..4294967295

  // Приводим к безопасному int32-диапазону шлюза (предположительно)
  const max = 2_000_000_000;
  const orderId = (u32 % max) + 1; // 1..2_000_000_000

  return orderId;
}


async function initAmeriaPayment(params: {
  orderId: number;
  amount: number;
  currency: Currency;
  description: string;
  opaque?: string;
  locale: Locale;
})


{
  const base = process.env.AMERIA_VPOS_BASE?.replace(/\/+$/, "");
  const ClientID = process.env.AMERIA_CLIENT_ID;
  const Username = process.env.AMERIA_USERNAME;
  const Password = process.env.AMERIA_PASSWORD;
  const appBase = process.env.APP_BASE_URL?.replace(/\/+$/, "");

  if (!base || !ClientID || !Username || !Password || !appBase) {
    throw new Error("Ameria env vars missing");
  }


  // ✅ ВАЖНО: возвращаемся с явным locale (банк этот параметр реально возвращает обратно)
  const backURL = `${appBase}/pay/ameria/return?locale=${encodeURIComponent(
    params.locale
  )}`;

  const body = {
    ClientID,
    Username,
    Password,
    Amount: params.amount,
    OrderID: params.orderId,      
    Description: params.description,
    Currency: ameriaCurrency[params.currency],
    BackURL: backURL,
    Opaque: params.opaque ?? "",
  Timeout: 1200,     // <= явно
  };

  const r = await fetch(`${base}/api/VPOS/InitPayment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await r.json();

  if (!r.ok || data?.ResponseCode !== 1 || !data?.PaymentID) {
    console.error("Ameria InitPayment failed", { httpOk: r.ok, responseCode: data?.ResponseCode });
    throw new Error("Ameria InitPayment failed");
  }
  

  // ✅ Если банк игнорирует lang — это не ломает; но на всякий оставим.
  const paymentUrl =
  `${base}/Payments/Pay?id=${encodeURIComponent(data.PaymentID)}` +
  `&lang=${encodeURIComponent(params.locale)}`;

  return { paymentUrl, paymentId: data.PaymentID, orderId: params.orderId };

}

/* ---------------- AIRTABLE ---------------- */

async function sendPurchaseToAirtable(fields: Record<string, any>) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_PURCHASE_WEBSITE_TABLE;


  if (!apiKey || !baseId || !table) {
    console.warn("❌ Airtable env missing — skip log");
    return;
  }

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(
    table
  )}`;

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
      console.error("❌ Airtable write failed");
    }
  } catch (err) {
    console.error("💥 Airtable fetch crashed:", err);
  }
}

/* ---------------- TG TOKEN ---------------- */

function makeTelegramLinkToken() {
  return crypto.randomBytes(16).toString("hex");
}

function normalizeEmail(emailRaw: string) {
  return String(emailRaw ?? "").trim().toLowerCase();
}

function normalizeTariffId(rawTariffId: string) {
  const v = String(rawTariffId ?? "").trim().toLowerCase();
  if (v === "review") return "online_test";
  if (v === "online-test") return "online_test";
  return v;
}

function courseCodeFromCourseName(courseNameRaw: string) {
  const v = String(courseNameRaw ?? "").trim().toLowerCase();
  if (v === "calisthenics_light") return "light";
  if (v === "calisthenics_classic") return "classic";
  if (v === "pullups") return "pullups";
  if (v === "handstand") return "handstand";
  if (v === "calisthenics_for_crossfit") return "crossfit";
  return "";
}

/* ---------------- API ---------------- */

export async function POST(req: Request) {

  try {
    const body = await req.json();

    const {
      amount,
      currency,
      email,
      fullName,
      phone,
      tariffId,
      tariffLabel,
      courseName,
      locale,
    } = body as {
      amount: number;
      currency: Currency;
      email: string;
      fullName: string;
      phone?: string;
      tariffId: string;
      tariffLabel: string;
      courseName?: string;
      locale?: Locale;
    };

    const normalizedEmail = normalizeEmail(email);
    const normalizedTariffId = normalizeTariffId(tariffId);

    // ✅ FIX: если вдруг фронт не прислал locale, страхуемся по referer
    const referer = req.headers.get("referer") || "";
    const inferredLocale: Locale = referer.includes("/ru") ? "ru" : "en";

    const safeLocale: Locale =
      locale === "ru" ? "ru" : locale === "en" ? "en" : inferredLocale;

    if (!amount || !currency || !normalizedEmail || !fullName || !normalizedTariffId || !phone) {
      console.warn("⚠️ Missing fields:", {
        amount,
        currency,
        email: normalizedEmail,
        fullName,
        phone,
        tariffId: normalizedTariffId,
      });

      return NextResponse.json({ error: "Не хватает данных" }, { status: 400 });
    }

    const lessonsByTariff: Record<string, number> = {
      online_test: 1,
      short1: 1,
      short12: 12,
      long12: 12,
      long36: 36,
    };

    const lessons = lessonsByTariff[normalizedTariffId] ?? 1;

    const tgToken = makeTelegramLinkToken();
    const orderId = makeOrderIdFromToken(tgToken);

    /* ---------- AMERIA ---------- */
    const descriptionByTariff: Record<string, string> = {
      online_test: "I Do Calisthenics - Strength test",
      short1: "I Do Calisthenics - 1 lesson",
      short12: "I Do Calisthenics - 12 lessons (4 weeks)",
      long12: "I Do Calisthenics - 12 lessons (8 weeks)",
      long36: "I Do Calisthenics - 36 lessons",
    };

    const description =
      descriptionByTariff[normalizedTariffId] ?? `I Do Calisthenics - ${normalizedTariffId}`;

    const opaque = JSON.stringify({
      tariffId: normalizedTariffId,
      email: normalizedEmail,
      currency,
      locale: safeLocale,
      courseName: courseName ?? "",
    });

    const currencyCode = String(currency).toLowerCase();
    const courseCode = courseCodeFromCourseName(courseName ?? "");
    const courseNameForAirtable = courseCode ? `ds_${currencyCode}_${courseCode}` : "";

    const { paymentUrl, paymentId } = await initAmeriaPayment({
      orderId,
      amount,
      currency: currency,
      description,
      opaque,
      locale: safeLocale,
    });
    

    await sendPurchaseToAirtable({
      email: normalizedEmail,
      FIO: fullName,
      Phone: String(phone).trim(),
      Sum: amount,
      Lessons: lessons,
      id_payment: paymentId,
      Currency: currency,
      Tag: normalizedTariffId,
      Status: "created",
      tg_link_token: tgToken,
      locale: safeLocale,
      course_name: courseNameForAirtable,
    });

    return NextResponse.json({ paymentUrl, paymentId, orderId, tgToken });
  } catch (e: any) {
    console.error("create-payment error:", e);
    return NextResponse.json(
      { error: "Server error"},
      { status: 500 }
    );
  }
}
