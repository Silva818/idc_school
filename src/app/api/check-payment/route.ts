// src/app/api/check-payment/route.ts
import { NextResponse } from "next/server";
import { markPurchasePaidAndProcess } from "@/lib/supabase/purchases";

/* ---------------- TELEGRAM HELPERS ---------------- */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID_RAW = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_CHAT_ID = TELEGRAM_CHAT_ID_RAW ? Number(TELEGRAM_CHAT_ID_RAW) : NaN;


function escapeTgHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatPurchaseDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function currencySymbol(currencyRaw: string) {
  const c = String(currencyRaw || "").trim().toUpperCase();
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  if (c === "AMD") return "֏";
  return c || "";
}

function formatMoney(valueRaw: any, currencyRaw: string) {
  const n = Number(valueRaw);
  const value = Number.isFinite(n) ? n : 0;
  const symbol = currencySymbol(currencyRaw);
  const pretty = Number.isInteger(value)
    ? value.toLocaleString("ru-RU")
    : value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  return `${pretty}${symbol}`;
}

function normalizePhone(phoneRaw: string) {
  const src = String(phoneRaw || "").trim();
  const hasPlus = src.startsWith("+");
  const digits = src.replace(/\D/g, "");
  if (!digits) return "";
  return `${hasPlus ? "+" : "+"}${digits}`;
}

async function sendTelegramMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !Number.isFinite(TELEGRAM_CHAT_ID)) {
    console.warn("⚠️ Telegram config missing");
    return { ok: false as const, reason: "env_missing" as const };
  }

  const r = await fetch(
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

  if (!r.ok) {
    const msg = await r.text();
    console.error("Telegram error", msg);
    return { ok: false as const, reason: "send_failed" as const, msg };
  }

  return { ok: true as const };
}


/* ---------------- AIRTABLE HELPERS ---------------- */

function airtableEnv() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_PURCHASE_WEBSITE_TABLE;

  if (!apiKey || !baseId || !table) {
    return {
      ok: false as const,
      apiKey: "",
      baseId: "",
      table: "",
    };
  }

  return {
    ok: true as const,
    apiKey,
    baseId,
    table,
  };
}

function airtableBaseUrl(env: { baseId: string; table: string }) {
  return `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(
    env.table
  )}`;
}

/**
 * Airtable formula string escaping:
 * - В Airtable строки можно писать в двойных кавычках.
 * - Двойные кавычки внутри строки нужно экранировать обратным слэшем: \"
 */
function airtableEscapeForDoubleQuotes(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function airtableFindByPaymentId(paymentIdRaw: string) {
  const env = airtableEnv();
  if (!env.ok) return { ok: false as const, reason: "env_missing" as const };

  const paymentId = airtableEscapeForDoubleQuotes(paymentIdRaw);

  // ✅ 1) Самый надёжный вариант: приводим поле к строке через конкатенацию
  // ({id_payment}&"") гарантирует string compare даже если поле number.
  const filter1 = `(LOWER({id_payment}&"") = "${paymentId}")`;

  // ✅ 2) На всякий случай — “прямое” сравнение (если поле точно строковое)
  const filter2 = `(LOWER({id_payment}) = "${paymentId}")`;

  const tryFetch = async (filterByFormula: string) => {
    const url = `${airtableBaseUrl(
      env
    )}?pageSize=1&maxRecords=1&filterByFormula=${encodeURIComponent(
      filterByFormula
    )}`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${env.apiKey}` },
      cache: "no-store",
    });

    const text = await r.text();
    if (!r.ok) {
      return {
        ok: false as const,
        reason: "find_failed" as const,
        status: r.status,
        text,
        filterByFormula,
      };
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        ok: false as const,
        reason: "find_bad_json" as const,
        text,
        filterByFormula,
      };
    }

    const rec = Array.isArray(json?.records) ? json.records[0] : null;
    return { ok: true as const, record: rec ?? null, raw: json, filterByFormula };
  };

  // Сначала пробуем string-coerce (на практике решает 90% кейсов)
  const a = await tryFetch(filter1);
  if (a.ok && a.record?.id) return a;

  // Потом пробуем прямое сравнение (вдруг поле реально текстовое)
  const b = await tryFetch(filter2);
  return b;
}

async function airtableUpdateRecord(
  recordId: string,
  fields: Record<string, any>
) {
  const env = airtableEnv();
  if (!env.ok) return { ok: false as const, reason: "env_missing" as const };

  const url = `${airtableBaseUrl(env)}/${encodeURIComponent(recordId)}`;

  try {
    const r = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
      cache: "no-store",
    });

    const text = await r.text();

    if (!r.ok) {
      return {
        ok: false as const,
        reason: "update_failed" as const,
        status: r.status,
        text,
      };
    }

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // ok
    }

    return { ok: true as const, record: json ?? text };
  } catch (err) {
    console.error("💥 Airtable UPDATE crashed:", err);
    return { ok: false as const, reason: "update_crashed" as const };
  }
}

async function airtableCreateRecord(fields: Record<string, any>) {
  const env = airtableEnv();
  if (!env.ok) return { ok: false as const, reason: "env_missing" as const };

  const url = airtableBaseUrl(env);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
      cache: "no-store",
    });

    const text = await r.text();

    if (!r.ok) {
      return {
        ok: false as const,
        reason: "create_failed" as const,
        status: r.status,
        text,
      };
    }

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // ok
    }

    return { ok: true as const, record: json ?? text };
  } catch (err) {
    console.error("💥 Airtable CREATE crashed:", err);
    return { ok: false as const, reason: "create_crashed" as const };
  }
}

/* ---------------- AMERIA ---------------- */

async function getAmeriaPaymentDetails(paymentId: string) {
  const base = process.env.AMERIA_VPOS_BASE?.replace(/\/+$/, "");
  const ClientID = process.env.AMERIA_CLIENT_ID;
  const Username = process.env.AMERIA_USERNAME;
  const Password = process.env.AMERIA_PASSWORD;

  if (!base || !ClientID || !Username || !Password) {
    throw new Error("Ameria env vars missing");
  }

  const url = `${base}/api/VPOS/GetPaymentDetails`;

  const body = {
    ClientID,
    Username,
    Password,
    PaymentID: paymentId,
  };

  console.log("📡 Ameria GetPaymentDetails:", { url, paymentId });

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await r.text();

  if (!r.ok) {
    throw new Error(`Ameria GetPaymentDetails http error: ${text}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Ameria GetPaymentDetails bad json: ${text}`);
  }

  return data;
}

function isPaidAmeria(details: any): boolean {
  const rc = String(details?.ResponseCode ?? "").trim();
  const state = String(details?.PaymentState ?? "").toLowerCase();
  const orderStatus = String(details?.OrderStatus ?? "").trim();

  if (rc === "00") return true;
  if (state.includes("deposited")) return true;
  if (orderStatus === "2") return true;

  return false;
}

function ameriaStatus(details: any): {
  status: "paid" | "pending" | "declined" | "canceled" | "refunded" | "error";
  reason?: string;
  code?: string;
  paymentState?: string;
  orderStatus?: string;
} {
  const responseCode = String(details?.ResponseCode ?? "").trim();
  const paymentState = String(details?.PaymentState ?? "").trim().toLowerCase();
  const orderStatus = String(details?.OrderStatus ?? "").trim();

  if (responseCode === "00") {
    return { status: "paid", code: responseCode, paymentState, orderStatus };
  }
  if (paymentState.includes("deposited") || orderStatus === "2") {
    return { status: "paid", code: responseCode, paymentState, orderStatus };
  }

  if (paymentState.includes("refunded")) {
    return { status: "refunded", code: responseCode, paymentState, orderStatus };
  }
  if (paymentState.includes("void")) {
    return { status: "canceled", code: responseCode, paymentState, orderStatus };
  }
  if (paymentState.includes("declined")) {
    return {
      status: "declined",
      code: responseCode,
      paymentState,
      orderStatus,
      reason:
        details?.ResponseMessage ||
        details?.RespCode ||
        details?.ErrorMessage,
    };
  }

  if (paymentState.includes("started") || orderStatus === "0") {
    return { status: "pending", code: responseCode, paymentState, orderStatus };
  }

  return {
    status: "error",
    code: responseCode,
    paymentState,
    orderStatus,
    reason:
      details?.ResponseMessage ||
      details?.RespCode ||
      details?.ErrorMessage,
  };
}

/* ---------------- API ---------------- */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const paymentId = String(body?.paymentId ?? "").trim();

    if (!paymentId) {
      console.warn("⚠️ paymentId missing");
      return NextResponse.json({ error: "paymentId required" }, { status: 400 });
    }

    if (!/^[A-Za-z0-9\-_.]{6,80}$/.test(paymentId)) {
      return NextResponse.json(
        { error: "invalid paymentId format" },
        { status: 400 }
      );
    }

    const details = await getAmeriaPaymentDetails(paymentId);
    const paid = isPaidAmeria(details);
    const bank = ameriaStatus(details);

    const baseResponse: any = {
      ok: true,
      paid,
      status: bank.status,
      bank,
    };

    // Airtable не трогаем, если оплата не успешна
    if (!paid) {
      return NextResponse.json(baseResponse);
    }

    // ✅ Обновляем существующую запись created → paid
    const found = await airtableFindByPaymentId(paymentId);

    if (found.ok && found.record?.id) {
      const fields = (found.record?.fields ?? {}) as any;
    
      const tgToken =
        String(fields?.tg_link_token ?? "").trim() || null;
    
      const prevStatus = String(fields?.Status ?? "").trim().toLowerCase();
    
      let upd:
        | Awaited<ReturnType<typeof airtableUpdateRecord>>
        | { ok: true; skipped: "already_paid" } = { ok: true, skipped: "already_paid" };

      if (prevStatus !== "paid") {
        upd = await airtableUpdateRecord(found.record.id, {
          Status: "paid",
          // Paid_time: new Date().toISOString(),
        });
      }

      const purchasePayload = {
        site_language: String(fields?.locale ?? "").trim() || undefined,
        product_type: String(fields?.product_type ?? "").trim() || undefined,
        tariff_label: String(fields?.tariff_label ?? "").trim() || undefined,
        currency: String(fields?.Currency ?? "").trim() || undefined,
        value: Number(fields?.Sum ?? 0) || 0,
        payment_id: paymentId,
      };
    
      // ✅ Уведомление в TG — только если раньше не было paid (чтобы не спамить)
      if (prevStatus !== "paid") {
        const courseName = String(fields?.course_name ?? "").trim();
        const tag = String(fields?.Tag ?? "").trim();
        const fio = String(fields?.FIO ?? "").trim();
        const email = String(fields?.email ?? "").trim().toLowerCase();
        const phone = normalizePhone(String(fields?.Phone ?? ""));
        const sum = Number(fields?.Sum ?? 0) || 0;
        const lessons = Math.max(0, Number(fields?.Lessons ?? 0) || 0);
        const currency = String(fields?.Currency ?? "").trim().toUpperCase();
        const perWorkout = lessons > 0 ? sum / lessons : 0;
        const dateStr = formatPurchaseDate(new Date());

        const phoneLine = phone
          ? `<b>Тел:</b> <a href="tel:${escapeTgHtml(phone)}">${escapeTgHtml(phone)}</a>`
          : `<b>Тел:</b> —`;

        const msg =
          `<b>✅ Новая покупка ${escapeTgHtml(courseName || "unknown_course")}</b>\n` +
          `${escapeTgHtml(tag || "unknown_tag")}\n` +
          `<b>Дата:</b> ${escapeTgHtml(dateStr)}\n` +
          `<b>Имя:</b> ${escapeTgHtml(fio || "—")}\n` +
          `${phoneLine}\n` +
          `<b>Email:</b> ${escapeTgHtml(email || "—")}\n` +
          `<b>Сумма:</b> ${escapeTgHtml(formatMoney(sum, currency))}\n` +
          `<b>Кол-во тренировок:</b> ${escapeTgHtml(String(lessons))}\n` +
          `<b>Стоимость за тренировку:</b> ${escapeTgHtml(
            lessons > 0 ? formatMoney(perWorkout, currency) : "—"
          )}\n` +
          `<b>PaymentID:</b> <code>${escapeTgHtml(paymentId)}</code>`;
    
        await sendTelegramMessage(msg);
      }

      const supabaseResult = await markPurchasePaidAndProcess(paymentId);
    
      return NextResponse.json({
        ...baseResponse,
        tgToken,
        purchasePayload,
        supabase: supabaseResult,
        airtable: {
          action: "updated",
          found: true,
          recordId: found.record.id,
          usedFilter: (found as any).filterByFormula,
          result: upd,
        },
      });
    }
    

    // Если не нашли — создаём запись, чтобы не потерять оплату (но теперь это должно быть редкостью)
    const create = await airtableCreateRecord({
      id_payment: paymentId,
      Status: "paid",
    });

    await sendTelegramMessage(
      `<b>✅ Оплата успешна (fallback)</b>\n<b>PaymentID:</b> <code>${escapeTgHtml(paymentId)}</code>\n<b>Airtable:</b> record created with paid`
    );

    const supabaseResult = await markPurchasePaidAndProcess(paymentId);
    

    return NextResponse.json({
      ...baseResponse,
      tgToken: null, // ✅ NEW: токена нет, потому что запись была создана fallback-ом
      purchasePayload: {
        transaction_id: paymentId,
        // остального нет, потому что запись только создали и в ней нет полей
      },
      airtable: {
        action: "created",
        found: false,
        find: found,
        result: create,
      },
      supabase: supabaseResult,
    });
  } catch (e: any) {
    console.error("check-payment error:", e);
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        error: "Server error",
        details: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}
