// src/app/api/test-signup/route.ts
import { NextRequest } from "next/server";
import { createLeadInSupabase } from "@/lib/supabase/leads";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function escapeTgHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return new Response("Telegram config is missing", { status: 500 });
  }

  const requestBody = await req.json();
  const { fullName, email, phone, context, courseName, city, studio, tgid } =
    (requestBody ?? {}) as Record<string, unknown>;
  const fullNameStr = String(fullName ?? "").trim();
  const emailStr = String(email ?? "").trim();
  const contextStr = String(context ?? "").trim();

  const text =
    `<b>📝 Новая заявка на тест силы</b>\n\n` +
    `👤 Имя: ${escapeTgHtml(fullNameStr || "-")}\n` +
    `📧 Email: ${escapeTgHtml(emailStr || "-")}\n` +
    (contextStr ? `📌 Источник: ${escapeTgHtml(contextStr)}\n` : "");

  const tgRes = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    }
  );

  if (!tgRes.ok) {
    const msg = await tgRes.text();
    console.error("Telegram error", msg);
    return new Response("Telegram error", { status: 500 });
  }

  await createLeadInSupabase({
    fio: String(fullName ?? "").trim(),
    tgid: String(tgid ?? "").trim() || undefined,
    email: String(email ?? "").trim().toLowerCase(),
    phone: String(phone ?? "").trim() || undefined,
    city: String(city ?? "").trim() || undefined,
    studio: String(studio ?? "").trim() || undefined,
    product: String(courseName ?? "").trim() || undefined,
    source: String(context ?? "").trim() || "website_test_signup",
    raw_payload: requestBody ?? {},
  });

  return new Response("ok");
}
