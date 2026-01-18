// src/app/api/test-signup/route.ts
import { NextRequest } from "next/server";

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

  const { fullName, email, context } = await req.json();

  const text =
    `<b>📝 Новая заявка на тест силы</b>\n\n` +
    `👤 Имя: ${escapeTgHtml(fullName || "-")}\n` +
    `📧 Email: ${escapeTgHtml(email || "-")}\n` +
    (context ? `📌 Источник: ${escapeTgHtml(context)}\n` : "");

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

  return new Response("ok");
}
