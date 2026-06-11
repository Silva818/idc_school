// src/app/api/check-payment/route.ts
import { NextResponse } from "next/server";
import {
  markPurchasePaidAndProcess,
  upsertPurchaseCreated,
} from "@/lib/supabase/purchases";
import { readJsonSafe, supabaseRestRequest } from "@/lib/supabase/server";

const MAX_RECOVERY_RETRIES = 3;
const RECOVERY_COOLDOWN_MS = 60_000;

type RecoveryBudgetRow = {
  id_payment: string;
  recovery_retry_count: number | null;
  recovery_last_attempt_at: string | null;
  recovery_last_reason: string | null;
};

const localRecoveryBudget = new Map<
  string,
  { count: number; lastAttemptMs: number; lastReason: string }
>();

function logStage(
  stage: "airtable_update" | "telegram_send" | "supabase_mark_paid" | "recovery_budget",
  outcome: "ok" | "skip" | "error",
  data: Record<string, unknown>
) {
  const method = outcome === "error" ? "warn" : "info";
  console[method](`[check-payment:${stage}] ${outcome}`, data);
}

function normalizeIsoDateMs(isoRaw: string | null | undefined) {
  const t = Date.parse(String(isoRaw ?? ""));
  return Number.isFinite(t) ? t : 0;
}

async function getRecoveryBudgetSupabase(idPayment: string) {
  const response = await supabaseRestRequest(
    `payment_recovery_budget?select=id_payment,recovery_retry_count,recovery_last_attempt_at,recovery_last_reason&id_payment=eq.${encodeURIComponent(
      idPayment
    )}&limit=1`,
    { method: "GET" }
  );
  const rows = (await readJsonSafe<RecoveryBudgetRow[]>(response)) || [];
  if (!response.ok) {
    return { ok: false as const, status: response.status, rows };
  }
  return { ok: true as const, row: rows[0] ?? null };
}

async function upsertRecoveryBudgetSupabase(row: {
  id_payment: string;
  recovery_retry_count: number;
  recovery_last_attempt_at: string;
  recovery_last_reason: string;
}) {
  const response = await supabaseRestRequest(
    "payment_recovery_budget?on_conflict=id_payment",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(row),
    }
  );
  const data = await readJsonSafe(response);
  if (!response.ok) {
    return { ok: false as const, status: response.status, data };
  }
  return { ok: true as const, data };
}

function readLocalRecoveryBudget(idPayment: string) {
  return localRecoveryBudget.get(idPayment) ?? {
    count: 0,
    lastAttemptMs: 0,
    lastReason: "",
  };
}

function writeLocalRecoveryBudget(
  idPayment: string,
  count: number,
  reason: string,
  whenMs: number
) {
  localRecoveryBudget.set(idPayment, {
    count,
    lastAttemptMs: whenMs,
    lastReason: reason,
  });
}

async function getRecoveryBudget(idPayment: string) {
  try {
    const remote = await getRecoveryBudgetSupabase(idPayment);
    if (remote.ok) {
      const row = remote.row;
      return {
        source: "supabase" as const,
        count: Number(row?.recovery_retry_count ?? 0) || 0,
        lastAttemptMs: normalizeIsoDateMs(row?.recovery_last_attempt_at ?? null),
        lastReason: String(row?.recovery_last_reason ?? ""),
      };
    }
    logStage("recovery_budget", "error", {
      paymentId: idPayment,
      where: "get",
      source: "supabase",
      status: remote.status,
    });
  } catch (error) {
    logStage("recovery_budget", "error", {
      paymentId: idPayment,
      where: "get",
      source: "supabase",
      error: String((error as Error)?.message ?? error),
    });
  }
  return {
    source: "local" as const,
    ...readLocalRecoveryBudget(idPayment),
  };
}

async function bumpRecoveryBudget(idPayment: string, reason: string) {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const current = await getRecoveryBudget(idPayment);
  const nextCount = current.count + 1;

  writeLocalRecoveryBudget(idPayment, nextCount, reason, nowMs);

  try {
    const remote = await upsertRecoveryBudgetSupabase({
      id_payment: idPayment,
      recovery_retry_count: nextCount,
      recovery_last_attempt_at: nowIso,
      recovery_last_reason: reason,
    });
    if (!remote.ok) {
      logStage("recovery_budget", "error", {
        paymentId: idPayment,
        where: "upsert",
        source: "supabase",
        status: remote.status,
      });
    }
  } catch (error) {
    logStage("recovery_budget", "error", {
      paymentId: idPayment,
      where: "upsert",
      source: "supabase",
      error: String((error as Error)?.message ?? error),
    });
  }

  return { count: nextCount, lastAttemptMs: nowMs };
}

function evaluateRecoveryBudget(budget: {
  count: number;
  lastAttemptMs: number;
}) {
  if (budget.count >= MAX_RECOVERY_RETRIES) {
    return { allowed: false as const, reason: "retry_cap_reached" as const };
  }
  if (
    budget.lastAttemptMs > 0 &&
    Date.now() - budget.lastAttemptMs < RECOVERY_COOLDOWN_MS
  ) {
    return { allowed: false as const, reason: "retry_cooldown" as const };
  }
  return { allowed: true as const };
}

/* ---------------- TELEGRAM HELPERS ---------------- */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID_RAW = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_CHAT_ID = TELEGRAM_CHAT_ID_RAW ? Number(TELEGRAM_CHAT_ID_RAW) : NaN;


function escapeTgHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatPurchaseDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function currencySymbol(currencyRaw: string) {
  const c = String(currencyRaw || "").trim().toUpperCase();
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  if (c === "AMD") return "֏";
  return c || "";
}

function formatMoney(valueRaw: any, currencyRaw: string) {
  const n = Number(valueRaw);
  const value = Number.isFinite(n) ? n : 0;
  const symbol = currencySymbol(currencyRaw);
  const pretty = Number.isInteger(value)
    ? value.toLocaleString("ru-RU")
    : value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  return `${pretty}${symbol}`;
}

function normalizePhone(phoneRaw: string) {
  const src = String(phoneRaw || "").trim();
  const hasPlus = src.startsWith("+");
  const digits = src.replace(/\D/g, "");
  if (!digits) return "";
  return `${hasPlus ? "+" : "+"}${digits}`;
}

async function sendTelegramMessage(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !Number.isFinite(TELEGRAM_CHAT_ID)) {
    console.warn("⚠️ Telegram config missing");
    return { ok: false as const, reason: "env_missing" as const };
  }

  const r = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      cache: "no-store",
    }
  );

  if (!r.ok) {
    const msg = await r.text();
    console.error("Telegram error", msg);
    return { ok: false as const, reason: "send_failed" as const, msg };
  }

  return { ok: true as const };
}


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

/**
 * Airtable formula string escaping:
 * - В Airtable строки можно писать в двойных кавычках.
 * - Двойные кавычки внутри строки нужно экранировать обратным слэшем: \"
 */
function airtableEscapeForDoubleQuotes(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function airtableFindByPaymentId(paymentIdRaw: string) {
  const env = airtableEnv();
  if (!env.ok) return { ok: false as const, reason: "env_missing" as const };

  const paymentIdExact = airtableEscapeForDoubleQuotes(
    String(paymentIdRaw ?? "").trim()
  );
  const paymentIdNorm = airtableEscapeForDoubleQuotes(
    String(paymentIdRaw ?? "")
      .trim()
      .toLowerCase()
  );

  // ✅ 1) Самый надёжный вариант: приводим поле к строке через конкатенацию
  // ({id_payment}&"") гарантирует string compare даже если поле number.
  const filter1 = `(LOWER({id_payment}&"") = "${paymentIdNorm}")`;

  // ✅ 2) На всякий случай — “прямое” сравнение (если поле точно строковое)
  const filter2 = `(LOWER({id_payment}) = "${paymentIdNorm}")`;
  const filter3 = `(({id_payment}&"") = "${paymentIdExact}")`;

  const tryFetch = async (filterByFormula: string) => {
    const url = `${airtableBaseUrl(
      env
    )}?pageSize=1&maxRecords=1&filterByFormula=${encodeURIComponent(
      filterByFormula
    )}`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${env.apiKey}` },
      cache: "no-store",
    });

    const text = await r.text();
    if (!r.ok) {
      return {
        ok: false as const,
        reason: "find_failed" as const,
        status: r.status,
        text,
        filterByFormula,
      };
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        ok: false as const,
        reason: "find_bad_json" as const,
        text,
        filterByFormula,
      };
    }

    const rec = Array.isArray(json?.records) ? json.records[0] : null;
    return { ok: true as const, record: rec ?? null, raw: json, filterByFormula };
  };

  // Сначала пробуем string-coerce (на практике решает 90% кейсов)
  const a = await tryFetch(filter1);
  if (a.ok && a.record?.id) return a;

  // Потом пробуем прямое сравнение (вдруг поле реально текстовое)
  const b = await tryFetch(filter2);
  if (b.ok && b.record?.id) return b;

  // И в конце — точное сравнение без LOWER
  const c = await tryFetch(filter3);
  return c;
}

async function airtableUpdateRecord(
  recordId: string,
  fields: Record<string, any>
) {
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
      // ok
    }

    return { ok: true as const, record: json ?? text };
  } catch (err) {
    console.error("💥 Airtable UPDATE crashed:", err);
    return { ok: false as const, reason: "update_crashed" as const };
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
    const paymentIdRaw = String(body?.paymentId ?? "");
    const paymentId = paymentIdRaw.trim().toUpperCase();
    const paymentIdNorm = paymentId.toLowerCase();

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
      diagnostics: {
        paymentIdRaw,
        paymentId,
        paymentIdNorm,
      },
    };

    // Airtable не трогаем, если оплата не успешна
    if (!paid) {
      logStage("airtable_update", "skip", {
        paymentId,
        reason: "not_paid_by_bank",
        bankStatus: bank.status,
      });
      return NextResponse.json(baseResponse);
    }

    // ✅ Обновляем существующую запись created → paid
    const found = await airtableFindByPaymentId(paymentId);
    logStage("airtable_update", found.ok ? "ok" : "error", {
      paymentId,
      stage: "find",
      result: found,
    });

    if (found.ok && found.record?.id) {
      const fields = (found.record?.fields ?? {}) as any;
    
      const tgToken =
        String(fields?.tg_link_token ?? "").trim() || null;
    
      const prevStatus = String(fields?.Status ?? "").trim().toLowerCase();
    
      let upd:
        | Awaited<ReturnType<typeof airtableUpdateRecord>>
        | { ok: true; skipped: "already_paid" } = { ok: true, skipped: "already_paid" };

      if (prevStatus !== "paid") {
        upd = await airtableUpdateRecord(found.record.id, {
          Status: "paid",
          // Paid_time: new Date().toISOString(),
        });
        logStage("airtable_update", upd.ok ? "ok" : "error", {
          paymentId,
          recordId: found.record.id,
          outcome: upd,
        });
      } else {
        logStage("airtable_update", "skip", {
          paymentId,
          recordId: found.record.id,
          reason: "already_paid",
        });
      }

      const purchasePayload = {
        site_language: String(fields?.locale ?? "").trim() || undefined,
        product_type: String(fields?.product_type ?? "").trim() || undefined,
        tariff_label: String(fields?.tariff_label ?? "").trim() || undefined,
        currency: String(fields?.Currency ?? "").trim() || undefined,
        value: Number(fields?.Sum ?? 0) || 0,
        payment_id: paymentId,
      };
    
      // ✅ Уведомление в TG — только если раньше не было paid (чтобы не спамить)
      if (prevStatus !== "paid") {
        const courseName = String(fields?.course_name ?? "").trim();
        const tag = String(fields?.Tag ?? "").trim();
        const fio = String(fields?.FIO ?? "").trim();
        const email = String(fields?.email ?? "").trim().toLowerCase();
        const phone = normalizePhone(String(fields?.Phone ?? ""));
        const sum = Number(fields?.Sum ?? 0) || 0;
        const lessons = Math.max(0, Number(fields?.Lessons ?? 0) || 0);
        const currency = String(fields?.Currency ?? "").trim().toUpperCase();
        const perWorkout = lessons > 0 ? sum / lessons : 0;
        const dateStr = formatPurchaseDate(new Date());

        const phoneLine = phone
          ? `<b>Тел:</b> <a href="tel:${escapeTgHtml(phone)}">${escapeTgHtml(phone)}</a>`
          : `<b>Тел:</b> —`;

        const msg =
          `<b>✅ Новая покупка ${escapeTgHtml(courseName || "unknown_course")}</b>\n` +
          `${escapeTgHtml(tag || "unknown_tag")}\n` +
          `<b>Дата:</b> ${escapeTgHtml(dateStr)}\n` +
          `<b>Имя:</b> ${escapeTgHtml(fio || "—")}\n` +
          `${phoneLine}\n` +
          `<b>Email:</b> ${escapeTgHtml(email || "—")}\n` +
          `<b>Сумма:</b> ${escapeTgHtml(formatMoney(sum, currency))}\n` +
          `<b>Кол-во тренировок:</b> ${escapeTgHtml(String(lessons))}\n` +
          `<b>Стоимость за тренировку:</b> ${escapeTgHtml(
            lessons > 0 ? formatMoney(perWorkout, currency) : "—"
          )}\n` +
          `<b>PaymentID:</b> <code>${escapeTgHtml(paymentId)}</code>`;
    
        const tgResult = await sendTelegramMessage(msg);
        logStage("telegram_send", tgResult.ok ? "ok" : "error", {
          paymentId,
          result: tgResult,
        });
      } else {
        logStage("telegram_send", "skip", {
          paymentId,
          reason: "already_paid",
        });
      }

      const supabaseResultInitial = await markPurchasePaidAndProcess(paymentId);
      logStage(
        "supabase_mark_paid",
        supabaseResultInitial?.ok ? "ok" : "error",
        {
          paymentId,
          stage: "initial",
          result: supabaseResultInitial,
        }
      );
      let supabaseResult: any = supabaseResultInitial;

      if (supabaseResultInitial?.reason === "purchase_not_found") {
        const budget = await getRecoveryBudget(paymentId);
        const budgetDecision = evaluateRecoveryBudget(budget);
        logStage(
          "recovery_budget",
          budgetDecision.allowed ? "ok" : "skip",
          {
            paymentId,
            source: budget.source,
            count: budget.count,
            lastAttemptMs: budget.lastAttemptMs,
            decision: budgetDecision,
          }
        );
        if (!budgetDecision.allowed) {
          supabaseResult = {
            ...supabaseResultInitial,
            recovery: {
              skipped: true,
              reason: "retry_blocked",
              blockedBy: budgetDecision.reason,
              budget: {
                maxRetries: MAX_RECOVERY_RETRIES,
                cooldownMs: RECOVERY_COOLDOWN_MS,
                currentCount: budget.count,
                lastAttemptAt:
                  budget.lastAttemptMs > 0
                    ? new Date(budget.lastAttemptMs).toISOString()
                    : null,
              },
            },
          };
        } else {
          const bumped = await bumpRecoveryBudget(
            paymentId,
            "purchase_not_found_recovery"
          );
        const sum = Number(fields?.Sum ?? 0) || 0;
        const lessons = Math.max(0, Number(fields?.Lessons ?? 0) || 0);
        const recoveryUpsert = await upsertPurchaseCreated({
          source_channel: "website",
          email: String(fields?.email ?? "").trim().toLowerCase() || null,
          fi: String(fields?.FIO ?? "").trim() || null,
          tgid: null,
          gift_recipient: String(fields?.GiftRecipient ?? "").trim() || null,
          tg_link_token: String(fields?.tg_link_token ?? "").trim() || null,
          purchaseSum: sum,
          currency: String(fields?.Currency ?? "").trim().toUpperCase() || null,
          lessons,
          price_per_lesson: lessons > 0 ? sum / lessons : 0,
          id_payment: paymentId,
          course_name: String(fields?.course_name ?? "").trim() || null,
          tag: String(fields?.Tag ?? "").trim() || null,
          nickname: null,
          phone: normalizePhone(String(fields?.Phone ?? "")) || null,
          locale: String(fields?.locale ?? "").trim() || null,
          tariff_label:
            String(fields?.tariff_label ?? "").trim() ||
            String(fields?.Tag ?? "").trim() ||
            null,
          studio_slug: null,
          slot_start_at: null,
          format: String(fields?.format ?? "").trim() || "ds",
        });
        logStage("supabase_mark_paid", recoveryUpsert?.ok ? "ok" : "error", {
          paymentId,
          stage: "recovery_upsert",
          result: recoveryUpsert,
        });
        const retryMarkPaid = await markPurchasePaidAndProcess(paymentId);
        logStage("supabase_mark_paid", retryMarkPaid?.ok ? "ok" : "error", {
          paymentId,
          stage: "retry",
          result: retryMarkPaid,
        });
        supabaseResult = {
          ...retryMarkPaid,
          recovery: {
            initial: supabaseResultInitial,
            upsert: recoveryUpsert,
            retry: retryMarkPaid,
            budget: {
              maxRetries: MAX_RECOVERY_RETRIES,
              cooldownMs: RECOVERY_COOLDOWN_MS,
              currentCount: bumped.count,
              lastAttemptAt: new Date(bumped.lastAttemptMs).toISOString(),
            },
          },
        };
        }
      }
    
      return NextResponse.json({
        ...baseResponse,
        tgToken,
        purchasePayload,
        supabase: supabaseResult,
        airtable: {
          action: "updated",
          found: true,
          recordId: found.record.id,
          usedFilter: (found as any).filterByFormula,
          result: upd,
        },
      });
    }
    

    logStage("airtable_update", "skip", {
      paymentId,
      stage: "find",
      reason: "record_not_found",
    });

    const supabaseResult = await markPurchasePaidAndProcess(paymentId);
    logStage("supabase_mark_paid", supabaseResult?.ok ? "ok" : "error", {
      paymentId,
      stage: "not_found_airtable_branch",
      result: supabaseResult,
    });
    console.warn("[check-payment] airtable record not found for paid payment", {
      paymentId,
      paymentIdNorm,
      bankStatus: bank.status,
      findResult: found,
    });

    return NextResponse.json({
      ...baseResponse,
      ok: false,
      reconcile: "needs_manual_reconcile",
      tgToken: null,
      purchasePayload: {
        transaction_id: paymentId,
      },
      airtable: {
        action: "not_found",
        found: false,
        find: found,
      },
      supabase: supabaseResult,
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
