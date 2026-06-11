# Payment Hardening Operations

This document describes the operational safeguards required for idempotent payment processing.

## Airtable Automation Dedupe (Clients Top-Up)

Apply these rules in Airtable automations that write to `clients` or adjust balance:

1. Trigger only on status transition `created -> paid` in purchases table.
2. Before top-up, lookup by `id_payment` in destination table/log.
3. If the same `id_payment` already exists, skip top-up.
4. Store `id_payment` on every top-up row for deterministic dedupe.

Recommended guard formula:

- `AND({Status}='paid', {PreviousStatus}='created')`

If `PreviousStatus` is unavailable in automation context, keep a dedicated processing log keyed by `id_payment`.

## Reconcile Endpoint (Flag-Gated)

Endpoint: `POST /api/reconcile-payments`

Env flags:

- `RECONCILE_PAYMENTS_ENABLED=true`
- `RECONCILE_PAYMENTS_TOKEN=<secret>`

Request:

```json
{
  "paymentIds": ["PAYMENT_ID_1", "PAYMENT_ID_2"]
}
```

Headers:

- `Authorization: Bearer <RECONCILE_PAYMENTS_TOKEN>`

Behavior:

- Does not change checkout UX.
- Runs Supabase paid reconciliation for listed `paymentIds`.
- Returns per-payment result for incident response and manual recovery.
