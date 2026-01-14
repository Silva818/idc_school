// src/app/pay/ameria/return/route.ts
import { NextRequest, NextResponse } from "next/server";

const LOCALES = new Set(["en", "ru"]);

function parseLocaleFromQuery(req: NextRequest): "en" | "ru" | null {
  const sp = req.nextUrl.searchParams;

  // поддержим несколько вариантов на всякий
  const v =
    sp.get("locale") ||
    sp.get("lang") ||
    sp.get("language") ||
    "";

  const norm = String(v).trim().toLowerCase();
  if (norm === "ru") return "ru";
  if (norm === "en") return "en";
  return null;
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

  // куда редиректим
  const target = paymentId
    ? new URL(`${base}/pay/success`)
    : new URL(`${base}/pay/pending`);

  if (paymentId) target.searchParams.set("paymentId", paymentId);
  if (responseCode) target.searchParams.set("responseCode", responseCode);
  if (orderId) target.searchParams.set("orderId", orderId);

  // ✅ важно: зафиксировать язык cookie'й, чтобы дальше success/pending точно знали язык
  const res = NextResponse.redirect(target);
  res.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 год
    sameSite: "lax",
  });

  return res;
}
