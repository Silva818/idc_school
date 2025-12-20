// app/api/check-payment/route.ts
import { NextResponse } from "next/server";

/* ---------------- AIRTABLE HELPERS ---------------- */

function airtableEnv() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_PURCHASE_WEBSITE_TABLE;

  console.log("🔎 Airtable ENV check:", {
    hasApiKey: Boolean(apiKey),
    baseId,
    table,
  });

  if (!apiKey || !baseId || !table) {
    return { ok: false as const, apiKey: "", baseId: "", table: "" };
  }

  return { ok: true as const, apiKey, baseId, table };
}

async function airtableSearchByFormula(formula: string) {
  const env = airtableEnv();
  if (!env.ok) return { ok: false as const, reason: "env_missing" as const };

  const url =
    `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(env.table)}` +
    `?filterByFormula=${encodeURIComponent(formula)}`;

  console.log("📡 Airtable SEARCH url:", url);
  console.log("🧮 Airtable formula:", formula);

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.apiKey}` },
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
      console.warn("⚠️ Airtable record NOT FOUND by formula");
      return { ok: false as const, reason: "not_found" as const, formula };
    }

    console.log("✅ Airtable record found:", { recordId: record.id });
    return { ok: true as const, recordId: record.id as string };
  } catch (err) {
    console.error("💥 Airtable SEARCH crashed:", err);
    return { ok: false as const, reason: "search_crashed" as const };
  }
}

async function airtableGetRecord(recordId: string) {
  const env = airtableEnv();
  if (!env.ok) return { ok: false as const, reason: "env_missing" as const };

  const url = `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(
    env.table
  )}/${recordId}`;

  console.log("📡 Airtable GET record url:", url);

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.apiKey}` },
      cache: "no-store",
    });

    const text = await r.text();

    console.log("📬 Airtable GET record response:", {
      ok: r.ok,
      status: r.status,
      body: text,
    });

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

async function airtablePatchRecord(recordId: string, fields: Record<string, any>) {
  const env = airtableEnv();
  if (!env.ok) return { ok: false as const, reason: "env_missing" as const };

  const url = `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(
    env.table
  )}/${recordId}`;

  console.log("📡 Airtable PATCH url:", url);
  console.log("📦 Airtable PATCH payload:", fields);

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

    console.log("📬 Airtable PATCH response:", {
      ok: r.ok,
      status: r.status,
      body: text,
    });

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

  console.log("🔎 Ameria ENV check:", {
    base,
    hasClientId: Boolean(ClientID),
    hasUsername: Boolean(Username),
    hasPassword: Boolean(Password),
  });

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

function isPaidAmeria(details: any): boolean {
  // по твоему реальному JSON:
  // ResponseCode: "00" и PaymentState: "payment_deposited" и OrderStatus: "2"
  const rc = String(details?.ResponseCode ?? "").trim();
  const state = String(details?.PaymentState ?? "").toLowerCase();
  const orderStatus = String(details?.OrderStatus ?? "").trim();

  if (rc === "00") return true;
  if (state.includes("deposited")) return true;
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

    // 2) найти запись в Airtable (с fallback-стратегиями)
    // ВАЖНО: имя поля должно совпадать с Airtable колонкой
    const formulas = [
      `{paymentId}='${paymentId}'`,
      `{inv_id}='${paymentId}'`,
      `{PaymentID}='${paymentId}'`,
    ];

    let found: any = null;
    for (const f of formulas) {
      const r = await airtableSearchByFormula(f);
      if (r.ok) {
        found = { ...r, formula: f };
        break;
      } else {
        console.warn("🔁 Search attempt failed:", r);
      }
    }

    if (!found?.ok) {
      console.warn("❌ Airtable record NOT FOUND by any formula");
      return NextResponse.json({
        ok: true,
        paid,
        status: paid ? "paid" : "pending",
        airtable: { ok: false, reason: "not_found" },
        ameria: details,
      });
    }

    console.log("✅ Airtable matched formula:", found.formula);

    // 3) перед PATCH — прочитаем запись и покажем, какие там вообще поля
    const before = await airtableGetRecord(found.recordId);
    if (before.ok) {
      console.log("🧾 Airtable record BEFORE patch fields keys:", Object.keys(before.record?.fields ?? {}));
      console.log("🧾 Airtable record BEFORE patch fields:", before.record?.fields ?? {});
    } else {
      console.warn("⚠️ Could not GET record before patch:", before);
    }

    // 4) обновить статус
    const patchFields: Record<string, any> = paid
      ? { Status: "paid" }
      : { Status: "pending" };

    // Paid_time добавляем только если колонка есть — иначе Airtable вернёт 422.
    // Поэтому ставим мягко: если у тебя колонки нет — просто не добавляй её.
    // Хочешь — создай колонку Paid_time (date) и раскомментируй строку ниже.
    // if (paid) patchFields["Paid_time"] = new Date().toISOString();

    const patch = await airtablePatchRecord(found.recordId, patchFields);

    console.log("✅ Patch result:", patch);

    // 5) вернуть нормальный ответ
    return NextResponse.json({
      ok: true,
      paid,
      status: paid ? "paid" : "pending",
      recordId: found.recordId,
      matchedFormula: found.formula,
      updated: patch,
    });
  } catch (e: any) {
    console.error("check-payment error:", e);
    return NextResponse.json(
      { error: "Server error", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
