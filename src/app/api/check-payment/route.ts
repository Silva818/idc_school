// app/api/check-payment/route.ts
import { NextResponse } from "next/server";

/* ---------------- AIRTABLE HELPERS ---------------- */

async function airtableSearchByPaymentId(paymentId: string) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_PURCHASE_WEBSITE_TABLE;

  console.log("🔎 Airtable ENV check (search):", {
    hasApiKey: Boolean(apiKey),
    baseId,
    table,
  });

  if (!apiKey || !baseId || !table) {
    console.warn("❌ Airtable env missing — skip search");
    return { ok: false as const, reason: "env_missing" as const };
  }

  // ⚠️ paymentId у тебя лежит в колонке "paymentId"
  const filter = `{paymentId}='${paymentId}'`;

  const url =
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}` +
    `?filterByFormula=${encodeURIComponent(filter)}`;

  console.log("📡 Airtable SEARCH url:", url);

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    const text = await r.text();

    console.log("📬 Airtable SEARCH response:", {
      ok: r.ok,
      status: r.status,
      body: text,
    });

    if (!r.ok) {
      return { ok: false as const, reason: "search_failed" as const, text };
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false as const, reason: "search_bad_json" as const, text };
    }

    const record = json?.records?.[0];
    if (!record?.id) {
      console.warn("⚠️ Airtable record NOT FOUND by paymentId:", paymentId);
      return { ok: false as const, reason: "not_found" as const };
    }

    console.log("✅ Airtable record found:", { recordId: record.id });
    return { ok: true as const, recordId: record.id as string };
  } catch (err) {
    console.error("💥 Airtable SEARCH crashed:", err);
    return { ok: false as const, reason: "search_crashed" as const };
  }
}

async function airtablePatchRecord(recordId: string, fields: Record<string, any>) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_PURCHASE_WEBSITE_TABLE;

  console.log("🔎 Airtable ENV check (patch):", {
    hasApiKey: Boolean(apiKey),
    baseId,
    table,
  });

  if (!apiKey || !baseId || !table) {
    console.warn("❌ Airtable env missing — skip patch");
    return { ok: false as const, reason: "env_missing" as const };
  }

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(
    table
  )}/${recordId}`;

  console.log("📡 Airtable PATCH url:", url);
  console.log("📦 Airtable PATCH payload:", fields);

  try {
    const r = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
      cache: "no-store",
    });

    const text = await r.text();

    console.log("📬 Airtable PATCH response:", {
      ok: r.ok,
      status: r.status,
      body: text,
    });

    if (!r.ok) {
      return { ok: false as const, reason: "patch_failed" as const, text };
    }

    return { ok: true as const };
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

  console.log("🔎 Ameria ENV check:", {
    base,
    hasClientId: Boolean(ClientID),
    hasUsername: Boolean(Username),
    hasPassword: Boolean(Password),
  });

  if (!base || !ClientID || !Username || !Password) {
    throw new Error("Ameria env vars missing");
  }

  // ⚠️ Если в твоей доке endpoint другой — поменяй тут.
  const url = `${base}/api/VPOS/GetPaymentDetails`;

  const body = {
    ClientID,
    Username,
    Password,
    PaymentID: paymentId,
  };

  console.log("📡 Ameria GetPaymentDetails:", { url, body });

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await r.text();
  console.log("📬 Ameria response:", { ok: r.ok, status: r.status, body: text });

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



// ✅ Здесь мы делаем эвристику. После первого реального ответа Ameria
// ты пришлёшь мне JSON из логов — я подстрою 100% корректно под твои поля.
function isPaidAmeria(details: any): boolean {
    // если Ameria вернула неуспех на уровне API
    // (иногда ResponseCode может быть "00" внутри details)
    const d = details?.details ?? details;
  
    const state = String(d?.PaymentState ?? "").toLowerCase();
    const responseCode = String(d?.ResponseCode ?? "").trim();
    const orderStatus = String(d?.OrderStatus ?? "").trim();
  
    // Самый надёжный признак по твоему JSON:
    if (state === "payment_deposited") return true;
  
    // Часто тоже означает успех:
    if (responseCode === "00") return true;
  
    // В твоём примере orderStatus = "2" при успехе:
    if (orderStatus === "2") return true;
  
    return false;
  }
  
/* ---------------- API ---------------- */

export async function POST(req: Request) {
  console.log("🔥 check-payment POST hit");

  try {
    const body = await req.json().catch(() => ({}));
    console.log("📥 request body:", body);

    const paymentId = String(body?.paymentId ?? "").trim();
    if (!paymentId) {
      console.warn("⚠️ paymentId missing");
      return NextResponse.json({ error: "paymentId required" }, { status: 400 });
    }


    // 1) спросить Ameria
    const details = await getAmeriaPaymentDetails(paymentId);
    console.log("✅ Ameria details parsed:", details);

    const paid = isPaidAmeria(details);
    console.log("💡 isPaidAmeria:", paid);

    // 2) найти запись в Airtable по paymentId
    const found = await airtableSearchByPaymentId(paymentId);

    if (!found.ok) {
      // даже если Airtable не найден — всё равно вернём статус Ameria,
      // чтобы ты видел что оплата прошла, а проблема в Airtable-связке
      return NextResponse.json({
        ok: true,
        paid,
        airtable: found,
        ameria: details,
      });
    }

    // 3) обновить статус (и возвращать НОРМАЛЬНЫЙ ответ, что статус обновлён)
    if (paid) {
      const patch = await airtablePatchRecord(found.recordId, {
        Status: "paid",
        Paid_time: new Date().toISOString(), // ⚠️ если у тебя колонка называется иначе — поменяй
      });

      return NextResponse.json({
        ok: true,
        status: "paid",
        updated: patch,
        recordId: found.recordId,
      });
    } else {
      const patch = await airtablePatchRecord(found.recordId, {
        Status: "pending",
      });

      return NextResponse.json({
        ok: true,
        status: "pending",
        updated: patch,
        recordId: found.recordId,
        ameria: details,
      });
    }
  } catch (e: any) {
    console.error("check-payment error:", e);
    return NextResponse.json(
      { error: "Server error", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
