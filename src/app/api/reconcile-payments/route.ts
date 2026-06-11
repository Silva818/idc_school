import { NextResponse } from "next/server";
import { markPurchasePaidAndProcess } from "@/lib/supabase/purchases";

function envEnabled() {
  const v = String(process.env.RECONCILE_PAYMENTS_ENABLED ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function isAuthorized(req: Request) {
  const expected = String(process.env.RECONCILE_PAYMENTS_TOKEN ?? "").trim();
  if (!expected) return false;
  const auth = String(req.headers.get("authorization") ?? "").trim();
  if (!auth.toLowerCase().startsWith("bearer ")) return false;
  const provided = auth.slice("bearer ".length).trim();
  return provided === expected;
}

function normalizePaymentId(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(req: Request) {
  if (!envEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const paymentIds = Array.isArray(body?.paymentIds)
    ? body.paymentIds.map(normalizePaymentId).filter(Boolean)
    : [];

  if (paymentIds.length === 0) {
    return NextResponse.json(
      { error: "paymentIds[] required" },
      { status: 400 }
    );
  }

  const results: Array<{ paymentId: string; result: unknown }> = [];
  for (const paymentId of paymentIds) {
    const result = await markPurchasePaidAndProcess(paymentId);
    results.push({ paymentId, result });
  }

  return NextResponse.json({
    ok: true,
    count: results.length,
    results,
  });
}
