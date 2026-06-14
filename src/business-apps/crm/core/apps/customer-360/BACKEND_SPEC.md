# Customer 360 — Backend Specification (Phase 13)

> Status: **specification only — no backend code in this round.**
> Audience: `platform-internal`. Owners: customer-service, custom-flow-engine, NewWork Connect (Fibu), prompt-manager.
>
> This document is the contract the Customer 360 **frontend already codes against**. The UI degrades gracefully (provisional/awaiting states) until each endpoint below ships, then swaps heuristics for real data with **no UI change**.

---

## 0. Architecture at a glance

```
                       ┌─────────────────────────────────────────────┐
                       │      Customer 360 (gravity-business-apps)    │
                       │  Home product  +  360° detail  +  AI agent   │
                       └───────────────┬───────────────┬─────────────┘
        per-customer detail            │               │  portfolio (book of business)
        useCustomer360 ────────────────┘               └──────────── useCustomerPortfolio
                       │                                               │
              GET …/getCustomer360                          GET …/customer-summary-list
                       │                                               │
       ┌───────────────┴───────────────────────────────────────────────┴───────────────┐
       │                          customer-service (aggregator)                          │
       │  fans out + normalizes into Customer360Snapshot / CustomerSummary[]             │
       └───┬───────────────┬───────────────────┬───────────────────┬────────────────────┘
           │               │                   │                   │
   custom-flow-engine   document-service   NewWork Connect       CRM core
  tickets/cases/        contracts          (Fibu) invoices/      accounts/
   reclamations          (CrmDocument)      transactions/balance  scoring/journal
```

The agent reaches the **same** aggregator via the `getCustomer360` provider tool (see `definitions/customer-360-tool.ts`) so the agent and UI are guaranteed to see identical data.

---

## 1. customer-service — the aggregation layer

`customer-service` owns two read endpoints (exposed through the `processes/customer-relations` gateway the agent tool already targets) plus the satisfaction + contract-type extensions.

### 1.1 `GET /customer-relations/getCustomer360` (single customer) — **already referenced by the agent tool**

Query params: `id` = account UUID (required). Customer 360 records are account-only.

Response: the normalized **`Customer360Snapshot`** (frozen contract in `data/types.ts`). All slices optional; arrays default to `[]`.

```jsonc
{
  "scores":        { "icpScore": 0, "aiScore": 0, "scoreLabel": "string" },
  "satisfaction":  { "csat": 0, "nps": 0, "lastSurveyDate": "ISO-8601" },
  "contracts":     [ { "id", "name", "status", "startDate", "endDate",
                       "documentId", "documentType", "mimeType", "fileSize",
                       "createdAt", "fileInfo": { "path", "fileMetadata": { "mimeType" } } } ],
  "tickets":       [ { "id", "title", "status", "priority", "createdAt" } ],
  "cases":         [ { "id", "title", "status", "type", "createdAt" } ],
  "reclamations":  [ { "id", "title", "status", "createdAt" } ],
  "invoices":      [ { "id", "number", "status", "amount", "currency", "issuedDate", "dueDate" } ],
  "balance":       { "openAmount": 0, "overdueAmount": 0, "lifetimeValue": 0, "currency": "EUR" },
  "transactions":  [ { "id", "description", "amount", "currency", "date", "direction": "debit|credit" } ],
  "journal":       [ { "id", "type", "title", "summary", "timestamp", "source" } ]
}
```

Aggregation responsibilities (fan-out, then normalize — never leak upstream shapes):

| Slice                               | Source                                   | Notes                            |
| ----------------------------------- | ---------------------------------------- | -------------------------------- |
| `scores`                            | CRM account scoring                      | passthrough                      |
| `satisfaction`                      | **§1.3 (new)**                           | CSAT/NPS store                   |
| `contracts`                         | document-service via **§1.4**            | filter `documentType = CONTRACT` |
| `tickets`/`cases`/`reclamations`    | custom-flow-engine via **§2**            | correlationId match              |
| `invoices`/`balance`/`transactions` | NewWork Connect via **§3**               | Fibu                             |
| `journal`                           | CRM activities/notes/tasks + flow events | merged, sorted desc              |

Errors: `400` (bad/missing params), `401` (no token), `404` (subject not found). Partial upstream failures must **not** fail the whole call — return the slices that resolved and omit the rest (UI renders partial).

### 1.2 `GET /customer-relations/customer-summary-list` (portfolio) — **NEW, powers Home**

Backs `useCustomerPortfolio` (cockpit, explorer, renewals, analytics). Returns a **lightweight** per-customer health summary for the whole book of business — NOT the full snapshot.

CRM customer portfolios are **account-only**. Contacts are contact people linked to accounts and must not be returned as portfolio customers. Only accounts with `prospective = false` are considered customers.

Query params:

| Param             | Type                                     | Default     | Notes                 |
| ----------------- | ---------------------------------------- | ----------- | --------------------- |
| `ownerEmployeeId` | UUID                                     | —           | scope to a rep's book |
| `search`          | string                                   | —           | name/company          |
| `limit`           | int (1–200)                              | 100         |                       |
| `offset`          | int                                      | 0           |                       |
| `sort`            | `attention\|health\|csat\|overdue\|name` | `attention` |                       |

Response:

```jsonc
{
  "items": [
    {
      "id": "uuid",
      "type": "account",
      "displayName": "Acme GmbH",
      "secondary": "acme.example", // industry/website
      "ownerEmployeeId": "uuid|null",
      "status": "active|churned",
      "summary": {
        "health": 0, // 0–100, server-computed
        "csat": 0,
        "aiScore": 0,
        "openTickets": 0,
        "openReclamations": 0,
        "overdueAmount": 0,
        "activeContracts": 0,
        "expiringContracts": 0, // ≤ 60 days to endDate
        "currency": "EUR"
      }
    }
  ],
  "total": 1234,
  "aggregates": {
    // optional, for cockpit KPIs without client math
    "needsAttention": 87,
    "unassigned": 12,
    "avgCsat": 74,
    "openTickets": 210,
    "overdueTotal": 51234.5,
    "currency": "EUR"
  }
}
```

**Performance:** this is a denormalized read model. It must be served from a **materialized summary table / cache** refreshed by domain events (ticket opened/closed, invoice overdue, contract expiring, survey submitted). Do **not** fan out per-row at request time for 100+ customers.

**Attention scoring parity:** the FE computes attention from `summary` via `data/portfolio/computeAttention.ts` (deterministic). The backend MAY also return a precomputed `attentionScore`/`reasons`; if so it MUST use the same weights so UI and BE agree. Until then the FE owns scoring.

> **Provisional fallback (today):** until §1.2 ships, `useCustomerPortfolio` derives a _provisional_ `health` from real CRM fields only (owner present) and flags `provisional: true`. No ticket/finance counts are invented. The cockpit and explorer disclose this via `home-provisional-note`.

### 1.3 Satisfaction store (CSAT / NPS) — **NEW**

- Persist survey responses linked to account id.
- Expose latest `csat` (0–100), `nps` (−100..100), `lastSurveyDate` for §1.1 and rolled-up `avgCsat` for §1.2.
- Source of truth for the `low-csat` attention reason (threshold: CSAT < 60).

### 1.4 Contract document type — **document-service extension**

- Add/confirm a `documentType = CONTRACT` classification on `CrmDocument` linked to account.
- Surface `documentType`, `mimeType`, `fileSize`, `createdAt`, and a `fileInfo { path, fileMetadata }` handle for preview/download.
- `expiringContracts` = contracts with `endDate` within 60 days and `status = active`.

### 1.5 Inbound triage feed — **NEW (powers Home → Inbound)**

`GET /customer-relations/inbound` → recently received emails/tickets auto-matched to a customer.

```jsonc
{
  "items": [
    {
      "id": "uuid",
      "channel": "email|ticket",
      "receivedAt": "ISO-8601",
      "subject": "string",
      "preview": "string",
      "matchedCustomer": { "type": "account", "id": "uuid", "displayName": "string", "confidence": 0.0 },
      "status": "new|triaged|replied"
    }
  ],
  "total": 0
}
```

Matching: resolve sender email → communication channel → contact → account. Return `confidence` so the UI can flag low-confidence matches for human confirmation. Until this ships, the Inbound view shows the triage concept + an on-demand agent draft action.

---

## 2. custom-flow-engine — tickets, cases, reclamations

### 2.1 Account-level correlation

- Today flows correlate via `correlationId` in the form `entity:entityId` (e.g. `account:<uuid>`).
- Customer 360 queries account correlations only; tickets/cases linked to contacts should be rolled up to the owning account by the aggregation layer.
- `getCustomer360` queries the engine by `account:<id>` and returns matching flows.

### 2.2 Flow templates (process definitions)

| Template         | Maps to snapshot slice | Required tags/fields                                                 |
| ---------------- | ---------------------- | -------------------------------------------------------------------- |
| `service-ticket` | `tickets[]`            | `title`, `status`, `priority`, `createdAt`                           |
| `service-case`   | `cases[]`              | `title`, `status`, `type`, `createdAt`; container for multiple flows |
| `reclamation`    | `reclamations[]`       | `title`, `status`, `createdAt`; `type = RECLAMATION`                 |

- Status normalization to the open/closed sets in `utils/statusBadge.ts` (`open`/`in_progress` vs `resolved`/`closed`/`cancelled`).
- Tag every flow with `customer360 = true` and the `correlationId` so the aggregator and the agent's `newwork_list_flows` tool can find them.

### 2.3 Counts for the portfolio summary

- Emit domain events on ticket/reclamation open/close so §1.2's summary table can keep `openTickets`/`openReclamations` current without polling.

---

## 3. NewWork Connect (Fibu) — invoices, transactions, balance

`customer-service` calls NewWork Connect and normalizes into the snapshot slices.

| Endpoint (NewWork Connect)      | Normalizes to                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------- |
| invoices by customer            | `invoices[]` (`number`, `status`, `amount`, `currency`, `issuedDate`, `dueDate`) |
| ledger/transactions by customer | `transactions[]` (`amount`, `currency`, `date`, `direction`)                     |
| balance by customer             | `balance` (`openAmount`, `overdueAmount`, `lifetimeValue`, `currency`)           |

- `overdueAmount > 0` drives the `overdue-invoice` attention reason and the cockpit `overdue` KPI.
- A Fibu customer-id mapping (CRM account → Fibu debtor) is required; expose it in the summary refresh job.
- Until wired, the Transactions & Fibu detail tab and the cockpit `overdue` KPI show awaiting/`—` states.

---

## 4. prompt-manager — agent enablement

### 4.1 `getCustomer360` tool handler

- The provider tool + JSON schemas are **already defined** in `definitions/customer-360-tool.ts` and must stay in sync with `Customer360Snapshot`.
- The runtime handler GETs `processes/customer-relations/getCustomer360` (§1.1) with the caller's bearer token. **Never log the token or customer PII.**
- Ensure the tool is registered/enabled for the **Customer 360 Analyst** workforce agent and the EveryAI `customer_360` page context.

### 4.2 Portfolio triage context

- Home → Portfolio Agent sends a compact, PII-safe handoff (`home/views/agent/portfolioHandoff.ts`): portfolio counts + top at-risk rows as `type:id` + score + reason codes only (no names/free text).
- The agent loads per-customer depth on demand via `getCustomer360`.
- Recommended additional reachable tools already listed in `CUSTOMER_360_REACHABLE_TOOL_IDS` (flow trigger/list, document search/fetch, CRM create/update).

---

## 5. Security & compatibility checklist

- [ ] All endpoints require a valid bearer token; reject with `401` when missing (no token logging).
- [ ] Aggregator never leaks upstream raw shapes or PII beyond what each snapshot slice defines.
- [ ] Partial upstream failure ⇒ partial snapshot (omit failed slices), never a hard `500`.
- [ ] `customer-summary-list` served from a materialized/cached read model, refreshed by domain events.
- [ ] Additive, backwards-compatible JSON (tolerant reader on FE); new fields optional.
- [ ] Attention-score weights identical between FE `computeAttention.ts` and any BE precomputation.

---

## 6. Delivery order (suggested)

1. **§1.4 contract type** + **§2 flow templates/correlation** → unlocks real contracts/tickets/cases in the 360° detail.
2. **§1.1 getCustomer360** aggregator hardening → agent + detail fully live.
3. **§1.3 satisfaction** + **§3 Fibu** → CSAT + finances (real attention reasons).
4. **§1.2 customer-summary-list** (materialized) → Home cockpit/explorer drop the provisional flag.
5. **§1.5 inbound** → Inbound triage stream goes live.
