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

async function airtableSearchByFormula(formula: string) {
  const env = airtableEnv();
  if (!env.ok) {
    return { ok: false as const, reason: "env_missing" as const };
  }

  const url =
    `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(
      env.table
    )}` + `?filterByFormula=${encodeURIComponent(formula)}`;

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
      },
      cache: "no-store",
    });

    const text = await r.text();

    if (!r.ok) {
      return { ok: false as const, reason: "search_failed" as const, text };
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false as const, reason: "search_bad_json" as const, text };
    }

    const records = json?.records ?? [];
    if (!records.length) {
      return { ok: false as const, reason: "not_found" as const, formula };
    }
    if (records.length > 1) {
      return {
        ok: false as const,
        reason: "multiple_found" as const,
        formula,
        count: records.length,
        recordIds: records.map((x: any) => x.id),
      };
    }
    return { ok: true as const, recordId: records[0].id as string };
  } catch (err) {
    console.error("💥 Airtable SEARCH crashed:", err);
    return { ok: false as const, reason: "search_crashed" as const };
  }
}

async function airtableGetRecord(recordId: string) {
  const env = airtableEnv();
  if (!env.ok) {
    return { ok: false as const, reason: "env_missing" as const };
  }

  const url = `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(
    env.table
  )}/${recordId}`;

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
      },
      cache: "no-store",
    });

    const text = await r.text();

    if (!r.ok) {
      return { ok: false as const, reason: "get_failed" as const, text };
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false as const, reason: "get_bad_json" as const, text };
    }

    return { ok: true as const, record: json };
  } catch (err) {
    console.error("💥 Airtable GET crashed:", err);
    return { ok: false as const, reason: "get_crashed" as const };
  }
}

async function airtablePatchRecord(
  recordId: string,
  fields: Record<string, any>
) {
  const env = airtableEnv();
  if (!env.ok) {
    return { ok: false as const, reason: "env_missing" as const };
  }

  const url = `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(
    env.table
  )}/${recordId}`;

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
      return { ok: false as const, reason: "patch_failed" as const, text };
    }

    return { ok: true as const, text };
  } catch (err) {
    console.error("💥 Airtable PATCH crashed:", err);
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

  const body = {
    ClientID,
    Username,
    Password,
    PaymentID: paymentId,
  };

  // важно: не логируем username/password
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

/**
 * Классификация статуса для клиента (paid/pending/declined/canceled/refunded/error)
 */
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

  // SUCCESS
  if (responseCode === "00") {
    return { status: "paid", code: responseCode, paymentState, orderStatus };
  }
  if (paymentState.includes("deposited") || orderStatus === "2") {
    return { status: "paid", code: responseCode, paymentState, orderStatus };
  }

  // REFUND / VOID / DECLINE by PaymentState
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
      reason: details?.ResponseMessage || details?.RespCode || details?.ErrorMessage,
    };
  }

  // Если “started / not paid yet”
  if (paymentState.includes("started") || orderStatus === "0") {
    return { status: "pending", code: responseCode, paymentState, orderStatus };
  }

  // Если банк вернул не-00, но состояние неясно — считаем ошибкой/отказом
  return {
    status: "error",
    code: responseCode,
    paymentState,
    orderStatus,
    reason: details?.ResponseMessage || details?.RespCode || details?.ErrorMessage,
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

    // обсудили: простая проверка формата paymentId (чтобы не ломать формулу и резать мусор)
    if (!/^[A-Za-z0-9\-_.]{6,80}$/.test(paymentId)) {
      return NextResponse.json({ error: "invalid paymentId format" }, { status: 400 });
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

    // ВАЖНО: Airtable не трогаем, если оплата не успешна
    if (!paid) {
      return NextResponse.json(baseResponse);
    }

    const pid = String(paymentId).trim();

    // минимальная защита формулы Airtable (если вдруг попадётся апостроф)
    const pidForFormula = pid.replace(/'/g, "\\'");

    // Ищем запись по новому полю id_payment
    const formulas = [`{id_payment}='${pidForFormula}'`];

    let found: any = null;
    let multi: any = null;

    for (const f of formulas) {
      const r: any = await airtableSearchByFormula(f);

      if (r.ok) {
        found = { ...r, formula: f };
        break;
      }

      // обсудили: если нашли несколько — не патчим, отдаём ошибку
      if (r?.reason === "multiple_found") {
        multi = { ...r, formula: f };
        break;
      }

      console.warn("🔁 Search attempt failed:", r);
    }

    // обсудили: обработка multiple_found
    if (multi) {
      return NextResponse.json({
        ...baseResponse,
        airtable: {
          ok: false,
          reason: "multiple_found",
          count: multi.count,
          recordIds: multi.recordIds,
          matchedFormula: multi.formula,
        },
      });
    }

    if (!found?.ok) {
      console.warn("❌ Airtable record NOT FOUND by any formula");
      return NextResponse.json({
        ...baseResponse,
        airtable: { ok: false, reason: "not_found" },
      });
    }

    const before = await airtableGetRecord(found.recordId);
    if (before.ok) {
      // оставляем как было (ничего не меняем)
    } else {
      console.warn("⚠️ Could not GET record before patch:", before);
    }

    // PATCH только при успешной оплате
    const patchFields: Record<string, any> = { Status: "paid" };
    const patch = await airtablePatchRecord(found.recordId, patchFields);

    return NextResponse.json({
      ...baseResponse,
      recordId: found.recordId,
      matchedFormula: found.formula,
      updated: patch,
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
