import "server-only";

import {
  isSupabaseFeatureEnabled,
  readJsonSafe,
  supabaseRestRequest,
  supabaseRpc,
} from "@/lib/supabase/server";

type PurchaseStatus = "Created" | "Paid" | "Matched";

export type UpsertPurchaseCreatedInput = {
  source_channel?: string | null;
  email?: string | null;
  fi?: string | null;
  tgid?: string | null;
  gift_recipient?: string | null;
  tg_link_token?: string | null;
  created_time?: string | null;
  purchaseSum?: number;
  currency?: string | null;
  lessons?: number;
  price_per_lesson?: number;
  id_payment: string;
  course_name?: string | null;
  tag?: string | null;
  nickname?: string | null;
  phone?: string | null;
  locale?: string | null;
  tariff_label?: string | null;
  studio_slug?: string | null;
  slot_start_at?: string | null;
  format?: string | null;
};

type PurchaseLookupRow = {
  id: string;
  status: PurchaseStatus | string | null;
  id_payment: string;
};

function normalizePaymentId(raw: string) {
  return String(raw ?? "").trim().toUpperCase();
}

function terminalStatus(status: unknown) {
  const s = String(status ?? "").trim().toLowerCase();
  return s === "paid" || s === "matched";
}

async function queryPurchaseByPaymentId(idPayment: string) {
  const q = `purchases?select=id,status,id_payment&id_payment=eq.${encodeURIComponent(
    idPayment
  )}&limit=1`;
  const response = await supabaseRestRequest(q, { method: "GET" });
  const rows = (await readJsonSafe<PurchaseLookupRow[]>(response)) || [];
  if (!response.ok) {
    return {
      ok: false as const,
      reason: "lookup_failed" as const,
      status: response.status,
      rows,
    };
  }
  return { ok: true as const, row: rows[0] ?? null, rows };
}

async function getPurchaseByPaymentId(idPaymentRaw: string) {
  const canonical = normalizePaymentId(idPaymentRaw);
  const variants = Array.from(
    new Set([canonical, canonical.toLowerCase(), String(idPaymentRaw ?? "").trim()])
  ).filter(Boolean);

  for (const variant of variants) {
    const result = await queryPurchaseByPaymentId(variant);
    if (!result.ok) return result;
    if (result.row) return result;
  }

  return { ok: true as const, row: null };
}

export async function upsertPurchaseCreated(input: UpsertPurchaseCreatedInput) {
  const gate = isSupabaseFeatureEnabled("purchases");
  if (!gate.ok) {
    console.info("[supabase:purchases] upsert skip:", gate.reason);
    return { ok: false as const, skipped: gate.reason };
  }

  const idPayment = normalizePaymentId(input.id_payment ?? "");
  if (!idPayment) {
    console.warn("[supabase:purchases] upsert skip: empty id_payment");
    return { ok: false as const, skipped: "empty_id_payment" as const };
  }

  try {
    const found = await getPurchaseByPaymentId(idPayment);
    if (!found.ok) {
      console.warn("[supabase:purchases] lookup failed before upsert", {
        status: found.status,
      });
      return {
        ok: false as const,
        reason: "lookup_failed" as const,
        status: found.status,
      };
    }

    if (found.row && terminalStatus(found.row.status)) {
      console.info("[supabase:purchases] upsert skipped terminal status", {
        id_payment: idPayment,
        status: found.row.status,
      });
      return {
        ok: true as const,
        skipped: "terminal_status" as const,
        row: found.row,
      };
    }

    const payload = {
      source_channel: String(input.source_channel ?? "").trim() || "website",
      email: String(input.email ?? "").trim().toLowerCase() || null,
      fi: String(input.fi ?? "").trim() || null,
      tgid: String(input.tgid ?? "").trim() || null,
      gift_recipient: String(input.gift_recipient ?? "").trim() || null,
      tg_link_token: String(input.tg_link_token ?? "").trim() || null,
      created_time: input.created_time || new Date().toISOString(),
      sum: Number(input.purchaseSum ?? 0) || 0,
      currency: String(input.currency ?? "").trim().toUpperCase() || null,
      lessons: Number(input.lessons ?? 0) || 0,
      price_per_lesson: Number(input.price_per_lesson ?? 0) || 0,
      id_payment: idPayment,
      status: "Created" as PurchaseStatus,
      course_name: String(input.course_name ?? "").trim() || null,
      tag: String(input.tag ?? "").trim() || null,
      nickname: String(input.nickname ?? "").trim() || null,
      phone: String(input.phone ?? "").trim() || null,
      locale: String(input.locale ?? "").trim() || null,
      tariff_label: String(input.tariff_label ?? "").trim() || null,
      studio_slug: String(input.studio_slug ?? "").trim() || null,
      slot_start_at: String(input.slot_start_at ?? "").trim() || null,
      format: String(input.format ?? "").trim() || null,
    };

    const response = await supabaseRestRequest("purchases?on_conflict=id_payment", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    });
    const json = await readJsonSafe(response);

    if (!response.ok) {
      console.warn("[supabase:purchases] upsert failed", {
        status: response.status,
      });
      return {
        ok: false as const,
        reason: "upsert_failed" as const,
        status: response.status,
        data: json,
      };
    }

    return { ok: true as const, data: json };
  } catch (error) {
    console.warn("[supabase:purchases] upsert crashed", error);
    return { ok: false as const, reason: "upsert_crashed" as const };
  }
}

export async function markPurchasePaidAndProcess(idPaymentRaw: string) {
  const gate = isSupabaseFeatureEnabled("purchases");
  if (!gate.ok) {
    console.info("[supabase:purchases] mark paid skip:", gate.reason);
    return { ok: false as const, skipped: gate.reason };
  }

  const idPayment = normalizePaymentId(idPaymentRaw ?? "");
  if (!idPayment) {
    return { ok: false as const, reason: "empty_id_payment" as const };
  }

  try {
    const found = await getPurchaseByPaymentId(idPayment);
    if (!found.ok) {
      console.warn("[supabase:purchases] lookup failed on mark paid", {
        status: found.status,
      });
      return {
        ok: false as const,
        reason: "lookup_failed" as const,
        status: found.status,
      };
    }
    if (!found.row) {
      console.warn("[supabase:purchases] purchase not found by id_payment", {
        id_payment: idPayment,
      });
      return {
        ok: false as const,
        reason: "purchase_not_found" as const,
        id_payment: idPayment,
      };
    }

    if (!terminalStatus(found.row.status)) {
      const patch = await supabaseRestRequest(
        `purchases?id=eq.${encodeURIComponent(found.row.id)}`,
        {
          method: "PATCH",
          headers: {
            Prefer: "return=representation",
          },
          body: JSON.stringify({ status: "Paid" as PurchaseStatus }),
        }
      );
      const patchJson = await readJsonSafe(patch);
      if (!patch.ok) {
        console.warn("[supabase:purchases] status update failed", {
          status: patch.status,
        });
        return {
          ok: false as const,
          reason: "status_update_failed" as const,
          status: patch.status,
          data: patchJson,
        };
      }
    }

    const rpc = await supabaseRpc("process_paid_purchase", {
      p_purchase_id: found.row.id,
    });
    const rpcJson = await readJsonSafe(rpc);
    if (!rpc.ok) {
      console.warn("[supabase:purchases] rpc failed", { status: rpc.status });
      return {
        ok: false as const,
        reason: "rpc_failed" as const,
        status: rpc.status,
        data: rpcJson,
      };
    }

    return { ok: true as const, purchase_id: found.row.id, data: rpcJson };
  } catch (error) {
    console.warn("[supabase:purchases] mark paid crashed", error);
    return {
      ok: false as const,
      reason: "mark_paid_crashed" as const,
      error: String((error as Error)?.message ?? error),
    };
  }
}
