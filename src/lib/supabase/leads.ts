import "server-only";

import {
  isSupabaseFeatureEnabled,
  readJsonSafe,
  supabaseRestRequest,
} from "@/lib/supabase/server";

export type SupabaseLeadInput = {
  fio: string;
  tgid?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  studio?: string | null;
  product?: string | null;
  source?: string | null;
  raw_payload: unknown;
};

export async function createLeadInSupabase(input: SupabaseLeadInput) {
  const gate = isSupabaseFeatureEnabled("leads");
  if (!gate.ok) {
    console.info("[supabase:leads] skip:", gate.reason);
    return { ok: false as const, skipped: gate.reason };
  }

  const payload = {
    fio: String(input.fio ?? "").trim(),
    tgid: String(input.tgid ?? "").trim() || null,
    phone: String(input.phone ?? "").trim() || null,
    email: String(input.email ?? "").trim().toLowerCase() || null,
    city: String(input.city ?? "").trim() || null,
    studio: String(input.studio ?? "").trim() || null,
    product: String(input.product ?? "").trim() || null,
    source: String(input.source ?? "").trim() || null,
    raw_payload: input.raw_payload ?? {},
  };

  if (!payload.fio) {
    console.warn("[supabase:leads] skip: empty fio");
    return { ok: false as const, skipped: "empty_fio" as const };
  }

  try {
    const response = await supabaseRestRequest("leads_raw", {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });

    const json = await readJsonSafe(response);
    if (!response.ok) {
      console.warn("[supabase:leads] insert failed", {
        status: response.status,
      });
      return { ok: false as const, reason: "insert_failed" as const, data: json };
    }

    return { ok: true as const, data: json };
  } catch (error) {
    console.warn("[supabase:leads] insert crashed", error);
    return { ok: false as const, reason: "insert_crashed" as const };
  }
}
