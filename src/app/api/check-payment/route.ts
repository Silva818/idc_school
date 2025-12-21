// app/api/check-payment/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

type PaymentStatus = "paid" | "pending" | "failed" | "void" | "refunded" | "unknown";

/* ---------------- DEBUG CONTROL ---------------- */

const PAY_DEBUG = process.env.PAY_DEBUG === "1";

function log(reqId: string, step: string, data?: Record<string, any>) {
  if (!PAY_DEBUG) return;
  const safe = data ? JSON.stringify(data) : "";
  console.log(`[check-payment][${reqId}][${step}] ${safe}`);
}

function maskId(id: string) {
  const s = String(id || "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}

function preview(text: string, n = 600) {
  const s = String(text ?? "");
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/* ---------------- AIRTABLE ---------------- */

function airtableEnv() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_PURCHASE_WEBSITE_TABLE;

  if (!apiKey || !baseId || !table) {
    return { ok: false as const };
  }
  return { ok: true as const, apiKey, baseId, table };
}

function escapeAirtableString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function airtableFindByPaymentId(reqId: string, id_payment: string) {
  const env = airtableEnv();
  if (!env.ok) {
    log(reqId, "airtable.env_missing");
    return { ok: false, reason: "env_missing" };
  }

  const pidEsc = escapeAirtableString(id_payment);
  const formula = `{id_payment}='${pidEsc}'`;

  const url =
    `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(env.table)}` +
    `?filterByFormula=${encodeURIComponent(formula)}`;

  log(reqId, "airtable.search.start", { formula });

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.apiKey}` },
      cache: "no-store",
    });

    const text = await r.text();

    if (!r.ok) {
      log(reqId, "airtable.search.http_error", { status: r.status, body: preview(text) });
      return { ok: false, reason: "search_failed" };
    }

    const json = JSON.parse(text);
    const records = json.records ?? [];

    log(reqId, "airtable.search.done", { foundCount: records.length });

    if (records.length === 0) return { ok: false, reason: "not_found" };
    if (records.length > 1) return { ok: false, reason: "multiple_found" };

    return { ok: true, recordId: records[0].id };
  } catch (e: any) {
    log(reqId, "airtable.search.crashed", { message: e?.message });
    return { ok: false, reason: "search_crashed" };
  }
}

async function airtablePatchRecord(reqId: string, recordId: string, fields: Record<string, any>) {
  const env = airtableEnv();
  if (!env.ok) return { ok: false };

  const url = `https://api.airtable.com/v0/${env.baseId}/${encodeURIComponent(env.table)}/${recordId}`;

  log(reqId, "airtable.patch.start", { recordId, fields });

  const r = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
    cache: "no-store",
  });

  if (!r.ok) {
    const text = await r.text();
    log(reqId, "airtable.patch.http_error", { status: r.status, body: preview(text) });
    return { ok: false };
  }

  log(reqId, "airtable.patch.done");
  return { ok: true };
}

/* ---------------- AMERIA ---------------- */

async function getAmeriaPaymentDetails(reqId: string, id_payment: string) {
  const base = process.env.AMERIA_VPOS_BASE?.replace(/\/+$/, "");
  const ClientID = process.env.AMERIA_CLIENT_ID;
  const Username = process.env.AMERIA_USERNAME;
  const Password = process.env.AMERIA_PASSWORD;

  if (!base || !ClientID || !Username || !Password) {
    throw new Error("Ameria env missing");
  }

  const r = await fetch(`${base}/api/VPOS/GetPaymentDetails`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ClientID, Username, Password, PaymentID: id_payment }),
    cache: "no-store",
  });

  const text = await r.text();
  log(reqId, "ameria.response", { preview: preview(text) });

  return JSON.parse(text);
}

/* ---------------- API ---------------- */

export async function POST(req: Request) {
  const reqId = crypto.randomBytes(4).toString("hex");

  try {
    const body = await req.json();
    const id_payment = String(body?.id_payment ?? "").trim();

    log(reqId, "request.body", { id_payment: maskId(id_payment) });

    if (!id_payment) {
      return NextResponse.json({ ok: false, error: "id_payment required" }, { status: 400 });
    }

    const details = await getAmeriaPaymentDetails(reqId, id_payment);
    const status =
      details?.PaymentState === "payment_deposited" || details?.ResponseCode === "00"
        ? "paid"
        : "pending";

    if (status === "paid") {
      const found = await airtableFindByPaymentId(reqId, id_payment);
      if (found.ok) {
        await airtablePatchRecord(reqId, found.recordId, { Status: "paid" });
      }
    }

    return NextResponse.json({ ok: true, id_payment, status });
  } catch (e: any) {
    log(reqId, "error", { message: e?.message });
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
