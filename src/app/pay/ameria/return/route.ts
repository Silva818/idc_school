// src/app/pay/ameria/return/route.ts
import { NextRequest, NextResponse } from "next/server";

const LOCALES = new Set(["en", "ru"]);

function parseLocaleFromReferer(req: NextRequest): "en" | "ru" | null {
  const ref = req.headers.get("referer") || "";
  try {
    const u = new URL(ref);
    if (u.pathname.startsWith("/ru")) return "ru";
    return "en";
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
    parseLocaleFromReferer(req) ||
    parseLocaleFromCookie(req) ||
    parseLocaleFromAcceptLanguage(req) ||
    "en"
  );
}

function prefix(locale: "en" | "ru") {
  return locale === "ru" ? "/ru" : "";
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const paymentId =
    sp.get("paymentID") ||
    sp.get("PaymentID") ||
    sp.get("paymentId") ||
    sp.get("id");

  const responseCode =
    sp.get("responseCode") ||
    sp.get("ResponseCode") ||
    sp.get("responsecode") ||
    sp.get("resposneCode") ||
    sp.get("ResposneCode");

  const orderId =
    sp.get("orderId") ||
    sp.get("OrderId") ||
    sp.get("orderID") ||
    sp.get("OrderID");

  const locale = pickLocale(req);
  const base = `${req.nextUrl.origin}${prefix(locale)}`;

  if (paymentId) {
    const url = new URL(`${base}/pay/success`);
    url.searchParams.set("paymentId", paymentId);
    if (responseCode) url.searchParams.set("responseCode", responseCode);
    if (orderId) url.searchParams.set("orderId", orderId);
    return NextResponse.redirect(url);
  }

  const pending = new URL(`${base}/pay/pending`);
  if (responseCode) pending.searchParams.set("responseCode", responseCode);
  if (orderId) pending.searchParams.set("orderId", orderId);
  return NextResponse.redirect(pending);
}
