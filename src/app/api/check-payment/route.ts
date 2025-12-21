// app/api/check-payment/route.ts
import { NextResponse } from "next/server";

type PaymentStatus = "paid" | "pending" | "failed" | "void" | "refunded" | "unknown";

/* ---------------- SAFE LOG ---------------- */

function devLog(...args: any[]) {
  if (process.env.NODE_ENV !== "production") console.log(...args);
}

/* ---------------- AIRTABLE HELPERS ---------------- */

function airtableEnv() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_PURCHASE_WEBSITE_TABLE;

  if (!apiKey || !baseId || !table) {
    return { ok: false as const, apiKey: "", baseId: "", table: "" };
  }
  return { ok: true as const, apiKey, baseId, table };
}

// Экранируем кавычки для Airtable formula
function escapeAirtableString(value: string) {
  // Airtable формулы: строки в '...'
  // экранируем обратный слэш и одинарные кавычки
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function airtableSearchByFormula(formula: string) {
  const env = airtableEnv();
  if (!env.ok) return { ok: false as const, reason: "env_missing" as const };

  const url =
    `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(env.table)}` +
    `?filterByFormula=${encodeURIComponent(formula)}`;

  devLog("📡 Airtable SEARCH:", { formula });

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.apiKey}` },
      cache: "no-store",
    });

    const text = await r.text();
    if (!r.ok) return { ok: false as const, reason: "search_failed" as const, text };

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false as const, reason: "search_bad_json" as const, text };
    }

    const record = json?.records?.[0];
    if (!record?.id) return { ok: false as const, reason: "not_found" as const, formula };

    return { ok: true as const, recordId: record.id as string };
  } catch {
    return { ok: false as const, reason: "search_crashed" as const };
  }
}

async function airtablePatchRecord(recordId: string, fields: Record<string, any>) {
  const env = airtableEnv();
  if (!env.ok) return { ok: false as const, reason: "env_missing" as const };

  const url = `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(env.table)}/${recordId}`;

  devLog("📡 Airtable PATCH:", { recordId, fields });

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
    if (!r.ok) return { ok: false as const, reason: "patch_failed" as const, text };

    return { ok: true as const };
  } catch {
    return { ok: false as const, reason: "patch_crashed" as const };
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
  const body = { ClientID, Username, Password, PaymentID: paymentId };

  // ВАЖНО: не логируем Password
  devLog("📡 Ameria GetPaymentDetails request:", { url, PaymentID: paymentId, ClientID, Username });

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await r.text();
  devLog("📬 Ameria response meta:", { ok: r.ok, status: r.status, bodyPreview: text.slice(0, 600) });

  if (!r.ok) throw new Error(`Ameria GetPaymentDetails http error: ${text}`);

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Ameria GetPaymentDetails bad json: ${text}`);
  }

  return data;
}

/* ---------------- STATUS PARSING ---------------- */

// Небольшая “витрина” популярных кодов. Можно расширять сколько угодно.
const RC_MESSAGE: Record<string, string> = {
  "00": "Одобрено",
  "0116": "Недостаточно средств на карте",
  "0101": "Карта просрочена",
  "0104": "Операция отклонена",
  "0208": "Карта заблокирована/утеряна",
  "0907": "Банк-эмитент временно недоступен",
  "0910": "Техническая ошибка банка",
};

function parseAmeriaStatus(details: any): {
  status: PaymentStatus;
  reasonCode?: string;
  reasonMessage?: string;
  paymentState?: string;
  orderStatus?: number;
} {
  const rc = String(details?.ResponseCode ?? "").trim(); // "00" = success
  const paymentState = String(details?.PaymentState ?? "").trim();
  const ps = paymentState.toLowerCase();

  const osRaw = details?.OrderStatus;
  const orderStatus =
    osRaw === undefined || osRaw === null || osRaw === ""
      ? undefined
      : Number(osRaw);

  const reasonMessage = rc ? (RC_MESSAGE[rc] ?? "Отказ/ошибка со стороны банка") : undefined;

  // Финальные успехи
  if (ps === "payment_deposited" || orderStatus === 2 || rc === "00") {
    return { status: "paid", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }

  // Финальные отказы/отмены/возвраты
  if (ps === "payment_declined" || orderStatus === 6) {
    return { status: "failed", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }
  if (ps === "payment_void" || orderStatus === 3) {
    return { status: "void", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }
  if (ps === "payment_refunded" || orderStatus === 4) {
    return { status: "refunded", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }

  // Ожидание
  if (ps === "payment_started" || orderStatus === 0) {
    return { status: "pending", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }
  if (ps === "payment_approved" || ps === "payment_autoauthorized" || orderStatus === 1 || orderStatus === 5) {
    return { status: "pending", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }

  // Если есть rc и он НЕ "00" — чаще это не “ждать”, а “failed”
  if (rc && rc !== "00") {
    return { status: "failed", reasonCode: rc, reasonMessage, paymentState, orderStatus };
  }

  return { status: "unknown", paymentState, orderStatus };
}

/* ---------------- API ---------------- */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const paymentId = String(body?.paymentId ?? "").trim();
    if (!paymentId) {
      return NextResponse.json({ ok: false, error: "paymentId required" }, { status: 400 });
    }

    // 1) Ameria
    const details = await getAmeriaPaymentDetails(paymentId);
    const parsed = parseAmeriaStatus(details);

    // 2) Airtable обновляем ТОЛЬКО при paid
    let airtableUpdate: any = { ok: false, skipped: true };

    if (parsed.status === "paid") {
      const pidEsc = escapeAirtableString(paymentId);
      const formula = `{paymentId}='${pidEsc}'`;

      const found = await airtableSearchByFormula(formula);

      if (found.ok) {
        const patch = await airtablePatchRecord(found.recordId, { Status: "paid" });
        airtableUpdate = { ok: patch.ok, recordId: found.recordId, reason: patch.ok ? undefined : patch.reason };
      } else {
        airtableUpdate = { ok: false, recordId: null, reason: found.reason };
      }
    }

    // 3) Safe subset для дебага на фронте
    const ameriaSafe = {
      PaymentID: details?.PaymentID ?? paymentId,
      ResponseCode: details?.ResponseCode,
      PaymentState: details?.PaymentState,
      OrderStatus: details?.OrderStatus,
      Amount: details?.Amount,
      ApprovedAmount: details?.ApprovedAmount,
      DepositedAmount: details?.DepositedAmount,
      DateTime: details?.DateTime,
      rrn: details?.rrn,
    };

    return NextResponse.json({
      ok: true,
      paymentId,
      status: parsed.status,
      reasonCode: parsed.reasonCode,
      reasonMessage: parsed.reasonMessage,
      paymentState: parsed.paymentState,
      orderStatus: parsed.orderStatus,
      airtable: airtableUpdate,
      ameria: ameriaSafe,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Server error", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
