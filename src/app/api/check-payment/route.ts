// app/api/check-payment/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

type PaymentStatus = "paid" | "pending" | "failed" | "void" | "refunded" | "unknown";

/* ---------------- DEBUG CONTROL ---------------- */

// включай в .env: PAY_DEBUG=1 (и выключай потом)
const PAY_DEBUG = process.env.PAY_DEBUG === "1";

function log(reqId: string, step: string, data?: Record<string, any>) {
  if (!PAY_DEBUG) return;
  const safe = data ? JSON.stringify(data) : "";
  // единый формат, чтобы удобно фильтровать в логах
  console.log(`[check-payment][${reqId}][${step}] ${safe}`);
}

// маскируем paymentId (UUID) — оставим 6 символов в начале и 6 в конце
function maskId(id: string) {
  const s = String(id || "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}

// обрезка больших текстов (например, ошибки Airtable)
function preview(text: string, n = 600) {
  const s = String(text ?? "");
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/* ---------------- AIRTABLE HELPERS (bot-style: filterByFormula) ---------------- */

function airtableEnv() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_PURCHASE_WEBSITE_TABLE;

  if (!apiKey || !baseId || !table) {
    return { ok: false as const, apiKey: "", baseId: "", table: "" };
  }
  return { ok: true as const, apiKey, baseId, table };
}

function escapeAirtableString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

type AirtableFindByPaymentIdResult =
  | { ok: true; recordId: string; foundCount: number }
  | {
      ok: false;
      reason: "env_missing" | "not_found" | "multiple_found" | "search_failed" | "bad_json" | "search_crashed";
      details?: any;
    };

async function airtableFindByPaymentId(reqId: string, paymentId: string): Promise<AirtableFindByPaymentIdResult> {
  const env = airtableEnv();
  if (!env.ok) {
    log(reqId, "airtable.env_missing");
    return { ok: false, reason: "env_missing" };
  }

  const pidEsc = escapeAirtableString(paymentId);
  const formula = `{paymentId}='${pidEsc}'`;

  const url =
    `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(env.table)}` +
    `?filterByFormula=${encodeURIComponent(formula)}`;

  log(reqId, "airtable.search.start", {
    baseId: env.baseId,
    table: env.table,
    formula,
  });

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.apiKey}` },
      cache: "no-store",
    });

    const text = await r.text();

    if (!r.ok) {
      log(reqId, "airtable.search.http_error", { status: r.status, bodyPreview: preview(text, 800) });
      return { ok: false, reason: "search_failed", details: { status: r.status, bodyPreview: preview(text, 800) } };
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      log(reqId, "airtable.search.bad_json", { bodyPreview: preview(text, 800) });
      return { ok: false, reason: "bad_json", details: { bodyPreview: preview(text, 800) } };
    }

    const records: any[] = Array.isArray(json?.records) ? json.records : [];
    log(reqId, "airtable.search.done", { foundCount: records.length });

    if (records.length === 0) return { ok: false, reason: "not_found" };
    if (records.length > 1) return { ok: false, reason: "multiple_found", details: { foundCount: records.length } };

    const recordId = records[0]?.id;
    if (!recordId) return { ok: false, reason: "bad_json" };

    return { ok: true, recordId: String(recordId), foundCount: 1 };
  } catch (e: any) {
    log(reqId, "airtable.search.crashed", { message: String(e?.message ?? e) });
    return { ok: false, reason: "search_crashed", details: { message: String(e?.message ?? e) } };
  }
}

async function airtablePatchRecord(reqId: string, recordId: string, fields: Record<string, any>) {
  const env = airtableEnv();
  if (!env.ok) {
    log(reqId, "airtable.env_missing_on_patch");
    return { ok: false as const, reason: "env_missing" as const };
  }

  const url = `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(env.table)}/${recordId}`;

  log(reqId, "airtable.patch.start", { recordId, fields });

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
      log(reqId, "airtable.patch.http_error", { status: r.status, bodyPreview: preview(text, 1200) });
      return { ok: false as const, reason: "patch_failed" as const, text: preview(text, 1200) };
    }

    log(reqId, "airtable.patch.done", { ok: true });
    return { ok: true as const };
  } catch (e: any) {
    log(reqId, "airtable.patch.crashed", { message: String(e?.message ?? e) });
    return { ok: false as const, reason: "patch_crashed" as const };
  }
}

/* ---------------- AMERIA ---------------- */

async function getAmeriaPaymentDetails(reqId: string, paymentId: string) {
  const base = process.env.AMERIA_VPOS_BASE?.replace(/\/+$/, "");
  const ClientID = process.env.AMERIA_CLIENT_ID;
  const Username = process.env.AMERIA_USERNAME;
  const Password = process.env.AMERIA_PASSWORD;

  if (!base || !ClientID || !Username || !Password) {
    log(reqId, "ameria.env_missing");
    throw new Error("Ameria env vars missing");
  }

  const url = `${base}/api/VPOS/GetPaymentDetails`;
  const body = { ClientID, Username, Password, PaymentID: paymentId };

  // не логируем пароль
  log(reqId, "ameria.request.start", {
    url,
    PaymentID: maskId(paymentId),
    ClientID,
    Username,
  });

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await r.text();
  log(reqId, "ameria.request.done", { ok: r.ok, status: r.status, bodyPreview: preview(text, 600) });

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
  const rc = String(details?.ResponseCode ?? "").trim();
  const paymentState = String(details?.PaymentState ?? "").trim();
  const ps = paymentState.toLowerCase();

  const osRaw = details?.OrderStatus;
  const orderStatus = osRaw === undefined || osRaw === null || osRaw === "" ? undefined : Number(osRaw);

  const reasonMessage = rc ? (RC_MESSAGE[rc] ?? "Отказ/ошибка со стороны банка") : undefined;

  if (ps === "payment_deposited" || orderStatus === 2 || rc === "00") {
    return { status: "paid", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }
  if (ps === "payment_declined" || orderStatus === 6) {
    return { status: "failed", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }
  if (ps === "payment_void" || orderStatus === 3) {
    return { status: "void", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }
  if (ps === "payment_refunded" || orderStatus === 4) {
    return { status: "refunded", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }
  if (ps === "payment_started" || orderStatus === 0) {
    return { status: "pending", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }
  if (ps === "payment_approved" || ps === "payment_autoauthorized" || orderStatus === 1 || orderStatus === 5) {
    return { status: "pending", reasonCode: rc || undefined, reasonMessage, paymentState, orderStatus };
  }
  if (rc && rc !== "00") {
    return { status: "failed", reasonCode: rc, reasonMessage, paymentState, orderStatus };
  }

  return { status: "unknown", paymentState, orderStatus };
}

/* ---------------- API ---------------- */

export async function POST(req: Request) {
  // корреляционный id для логов (один запрос = один reqId)
  const reqId = crypto.randomBytes(4).toString("hex");

  try {
    log(reqId, "request.hit");

    const body = await req.json().catch(() => ({}));
    const paymentId = String(body?.paymentId ?? "").trim();

    log(reqId, "request.body", { hasPaymentId: Boolean(paymentId), paymentId: maskId(paymentId) });

    if (!paymentId) {
      log(reqId, "request.bad", { reason: "paymentId required" });
      return NextResponse.json({ ok: false, error: "paymentId required" }, { status: 400 });
    }

    // 1) Ameria
    const details = await getAmeriaPaymentDetails(reqId, paymentId);
    const parsed = parseAmeriaStatus(details);
    log(reqId, "ameria.parsed", {
      status: parsed.status,
      paymentState: parsed.paymentState,
      orderStatus: parsed.orderStatus,
      reasonCode: parsed.reasonCode,
    });

    // 2) Airtable — только при paid
    let airtableUpdate: any = { ok: false, skipped: true };

    if (parsed.status === "paid") {
      log(reqId, "airtable.flow.start", { paymentId: maskId(paymentId) });

      const found = await airtableFindByPaymentId(reqId, paymentId);

      if (found.ok) {
        const patch = await airtablePatchRecord(reqId, found.recordId, { Status: "paid" });
        airtableUpdate = patch.ok
          ? { ok: true, skipped: false, recordId: found.recordId }
          : { ok: false, skipped: false, recordId: found.recordId, reason: patch.reason, details: (patch as any).text };

        log(reqId, "airtable.flow.done", airtableUpdate);
      } else {
        airtableUpdate = { ok: false, skipped: false, reason: found.reason, details: found.details ?? undefined };
        log(reqId, "airtable.flow.done", airtableUpdate);
      }
    } else {
      log(reqId, "airtable.skipped", { reason: `status=${parsed.status}` });
    }

    // 3) Safe subset для фронта
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

    log(reqId, "response.ok", { status: parsed.status, airtableOk: airtableUpdate?.ok });

    return NextResponse.json({
      ok: true,
      reqId, // очень полезно: можно показать на фронте/в деталях, чтобы искать логи по нему
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
    log(reqId, "response.error", { message: String(e?.message ?? e) });
    return NextResponse.json(
      { ok: false, error: "Server error", details: String(e?.message ?? e), reqId },
      { status: 500 }
    );
  }
}
