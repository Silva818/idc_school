import "server-only";

type SupabaseFeature = "leads" | "purchases";

type SupabaseConfig = {
  enabled: boolean;
  url: string;
  serviceRoleKey: string;
  writeLeads: boolean;
  writePurchases: boolean;
};

function envBool(value: string | undefined, fallback = false) {
  if (value == null) return fallback;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    enabled: envBool(process.env.SUPABASE_ENABLED, false),
    url: String(process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, ""),
    serviceRoleKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
    writeLeads: envBool(process.env.SUPABASE_WRITE_LEADS, false),
    writePurchases: envBool(process.env.SUPABASE_WRITE_PURCHASES, false),
  };
}

export function isSupabaseFeatureEnabled(feature: SupabaseFeature) {
  const cfg = getSupabaseConfig();
  if (!cfg.enabled || !cfg.url || !cfg.serviceRoleKey) {
    return {
      ok: false as const,
      reason: "disabled_or_env_missing" as const,
      cfg,
    };
  }

  if (feature === "leads" && !cfg.writeLeads) {
    return { ok: false as const, reason: "write_leads_disabled" as const, cfg };
  }
  if (feature === "purchases" && !cfg.writePurchases) {
    return {
      ok: false as const,
      reason: "write_purchases_disabled" as const,
      cfg,
    };
  }

  return { ok: true as const, cfg };
}

export async function supabaseRestRequest(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !cfg.serviceRoleKey) {
    throw new Error("Supabase env missing");
  }

  const url = `${cfg.url}/rest/v1/${path.replace(/^\/+/, "")}`;

  const headers = new Headers(init?.headers ?? {});
  headers.set("apikey", cfg.serviceRoleKey);
  headers.set("Authorization", `Bearer ${cfg.serviceRoleKey}`);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export async function supabaseRpc(
  fnName: string,
  payload: Record<string, unknown>
): Promise<Response> {
  return supabaseRestRequest(`rpc/${fnName}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function readJsonSafe<T = unknown>(
  response: Response
): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
