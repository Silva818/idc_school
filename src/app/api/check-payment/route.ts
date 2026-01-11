// src/app/api/check-payment/route.ts
import { NextResponse } from "next/server";

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

async function airtableFindByPaymentId(paymentId: string) {
  const env = airtableEnv();
  if (!env.ok) return { ok: false as const, reason: "env_missing" as const };

  // В Airtable формула: {id_payment} = "xxxx"
  // ВАЖНО: id_payment должен быть реально таким названием поля в таблице
  const filter = `({id_payment} = "${paymentId}")`;
  const url = `${airtableBaseUrl(env)}?maxRecords=1&filterByFormula=${encodeURIComponent(
    filter
  )}`;

  try {
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
      },
      cache: "no-store",
    });

    const text = await r.text();

    if (!r.ok) {
      return {
        ok: false as const,
        reason: "find_failed" as const,
        status: r.status,
        text,
      };
    }

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false as const, reason: "find_bad_json" as const, text };
    }

    const rec = Array.isArray(json?.records) ? json.records[0] : null;
    return { ok: true as const, record: rec ?? null, raw: json };
  } catch (err) {
    console.error("💥 Airtable FIND crashed:", err);
    return { ok: false as const, reason: "find_crashed" as const };
  }
}

async function airtableUpdateRecord(recordId: string, fields: Record<string, any>) {
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
      // не критично
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
      // не критично
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

    // ✅ Правильно: обновляем существующую запись created → paid
    const found = await airtableFindByPaymentId(paymentId);

    if (found.ok && found.record?.id) {
      const upd = await airtableUpdateRecord(found.record.id, {
        Status: "paid",
      });

      return NextResponse.json({
        ...baseResponse,
        airtable: {
          action: "updated",
          found: true,
          recordId: found.record.id,
          result: upd,
        },
      });
    }

    // Если не нашли (или поиск упал) — создаём запись, чтобы не потерять оплату
    const create = await airtableCreateRecord({
      id_payment: paymentId,
      Status: "paid",
    });

    return NextResponse.json({
      ...baseResponse,
      airtable: {
        action: "created",
        found: false,
        find: found,
        result: create,
      },
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
