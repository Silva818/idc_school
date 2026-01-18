// src/app/pay/ameria/return/route.ts
import { NextRequest, NextResponse } from "next/server";

const LOCALES = new Set(["en", "ru"]);

function parseLocaleFromQuery(req: NextRequest): "en" | "ru" | null {
  const sp = req.nextUrl.searchParams;

  const v = sp.get("locale") || sp.get("lang") || sp.get("language") || "";
  const norm = String(v).trim().toLowerCase();
  if (norm === "ru") return "ru";
  if (norm === "en") return "en";
  return null;
}

function parseLocaleFromOpaque(req: NextRequest): "en" | "ru" | null {
  const sp = req.nextUrl.searchParams;
  const raw = sp.get("opaque");
  if (!raw) return null;

  try {
    const obj = JSON.parse(raw);
    const v = String(obj?.locale ?? "").trim().toLowerCase();
    if (v === "ru") return "ru";
    if (v === "en") return "en";
    return null;
  } catch {
    return null;
  }
}

function parseLocaleFromCookie(req: NextRequest): "en" | "ru" | null {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && LOCALES.has(cookie)) return cookie as "en" | "ru";
  return null;
}

function parseLocaleFromAcceptLanguage(req: NextRequest): "en" | "ru" | null {
  const al = (req.headers.get("accept-language") || "").toLowerCase();
  if (al.includes("ru")) return "ru";
  if (al.includes("en")) return "en";
  return null;
}

function pickLocale(req: NextRequest): "en" | "ru" {
  return (
    parseLocaleFromQuery(req) ||
    parseLocaleFromOpaque(req) ||
    parseLocaleFromCookie(req) ||
    parseLocaleFromAcceptLanguage(req) ||
    "en"
  );
}

function prefix(locale: "en" | "ru") {
  return locale === "ru" ? "/ru" : "";
}

function normalizeResponseCode(v: string | null) {
  const s = String(v ?? "").trim();
  return s;
}

function isSuccess(code: string) {
  // Обычно "00" = approved. Иногда встречается "0000" — подстрахуемся.
  return code === "00" || code === "0000";
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const paymentId =
    sp.get("paymentID") ||
    sp.get("PaymentID") ||
    sp.get("paymentId") ||
    sp.get("id") ||
    "";

  const responseCodeRaw =
    sp.get("responseCode") ||
    sp.get("ResponseCode") ||
    sp.get("responsecode") ||
    sp.get("resposneCode") || // (как в доке с опечаткой)
    sp.get("ResposneCode") ||
    "";

  const orderId =
    sp.get("orderId") ||
    sp.get("OrderId") ||
    sp.get("orderID") ||
    sp.get("OrderID") ||
    "";

  const responseCode = normalizeResponseCode(responseCodeRaw);

  const locale = pickLocale(req);
  const base = `${req.nextUrl.origin}${prefix(locale)}`;

  // ✅ Логика:
  // - нет paymentId => pending
  // - есть paymentId и успех => success
  // - есть paymentId и НЕ успех => fail
  let targetPath = "/pay/success"; // единая страница статуса
if (!paymentId) targetPath = "/pay/pending";

  const target = new URL(`${base}${targetPath}`);

  if (paymentId) target.searchParams.set("paymentId", paymentId);
  if (responseCode) target.searchParams.set("responseCode", responseCode);
  if (orderId) target.searchParams.set("orderId", orderId);

  const res = NextResponse.redirect(target);
  res.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  console.log("🔙 Ameria return query:", Object.fromEntries(req.nextUrl.searchParams.entries()));

  return res;
  
}
