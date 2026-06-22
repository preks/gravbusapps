# Platform Terminology Keys

Shared canonical terminology for NEWWORK platform UI copy. The source of truth lives in:

- `src/business-apps/_i18n/platform/en-US.ftl`
- `src/business-apps/_i18n/platform/de-DE.ftl`
- `src/business-apps/_i18n/platform/ro-RO.ftl`

These files merge into `src/business-apps/_i18n/index.ts`. App-local `_i18n/index.ts` files must merge that root bundle before they can reference platform terminology.

## Usage rules

- Use **Fluent terms** as the canonical source of truth.
- Use **term attributes** when a local `.ftl` needs label vs inline variants.
- Use **alias messages** for direct `t('platform-*')` usage from TSX.
- Keep product names such as `Flow Studio`, `Screen Builder`, and `Enterprise Agent Studio` out of the terminology layer.
- Do not rename stable public alias keys unless all consumers are migrated.

## Structure

### 1. Canonical terms

Each concept is modeled as a Fluent term:

```ftl
-platform-ai-agent =
    .label = Digital Employee
    .inline = digital employee
    .label-plural = Digital Employees
    .inline-plural = digital employees
```

### 2. Stable alias messages

Each concept also exposes stable message keys for direct consumption:

```ftl
platform-ai-agent = { -platform-ai-agent.label }
platform-ai-agent-inline = { -platform-ai-agent.inline }

platform-ai-agent-count = { $count ->
    [one] { -platform-ai-agent.label }
   *[other] { -platform-ai-agent.label-plural }
}

platform-ai-agent-inline-count = { $count ->
    [one] { -platform-ai-agent.inline }
   *[other] { -platform-ai-agent.inline-plural }
}
```

### 3. Claim messages

Reusable sentence-level copy stays as normal messages:

```ftl
platform-enabler-claim = Powered by { -platform-enabler.label }
```

## When to use term vs alias

| Context                       | Preferred usage                                                       |
| ----------------------------- | --------------------------------------------------------------------- |
| local `.ftl` sentence wrapper | use **term attributes** like `{ -platform-ai-agent.inline }`          |
| local `.ftl` plain label      | use alias like `{ platform-ai-agent }` or a term attribute            |
| TSX `t(...)` call             | use **alias messages** like `t('platform-ai-agent-count', { count })` |
| reusable full sentence        | use a normal message like `platform-enabler-claim`                    |

## Key catalog

### `-platform-type`

- **Purpose:** Main external platform category.
- **Alias messages:** `platform-type`, `platform-type-inline`, `platform-type-count`, `platform-type-inline-count`
- **Replaces:** `Enterprise AI platform`, `agent platform`, `AI assistant platform`
- **en-US:** `Digital Workforce Platform`
- **de-DE:** `Plattform für digitale Belegschaften`
- **ro-RO:** `Platformă pentru forța de muncă digitală`

### `-platform-enabler`

- **Purpose:** Enabling capability behind the platform type.
- **Alias messages:** `platform-enabler`, `platform-enabler-inline`, `platform-enabler-count`, `platform-enabler-inline-count`
- **Replaces:** standalone `Enterprise AI` umbrella wording
- **en-US / de-DE / ro-RO:** `Enterprise AI`

### `platform-enabler-claim`

- **Purpose:** Composed claim built from a wrapper phrase plus `-platform-enabler`
- **Pattern:** `Powered by { -platform-enabler.label }`

### `-platform-ai-agent-fleet`

- **Purpose:** Governed population of AI agents at enterprise level
- **Alias messages:** `platform-ai-agent-fleet`, `platform-ai-agent-fleet-inline`, `platform-ai-agent-fleet-count`, `platform-ai-agent-fleet-inline-count`
- **Replaces:** `Enterprise Agent Workforce`, narrative `Digital Workforce` at fleet level
- **en-US:** `Digital Workforce`
- **de-DE:** `Digitale Belegschaft`
- **ro-RO:** `Forță de muncă digitală`

### `-platform-ai-agent`

- **Purpose:** Low-scope business or narrative wording where the human-like metaphor is sufficient
- **Alias messages:** `platform-ai-agent`, `platform-ai-agent-inline`, `platform-ai-agent-count`, `platform-ai-agent-inline-count`
- **Replaces:** low-scope business/storytelling subset of `Enterprise Agent`, `Enterprise Agents`, generic `AI agent`
- **en-US:** `Digital Employee`
- **de-DE:** `Digitale Arbeitskraft`
- **ro-RO:** `Angajat digital`

### `-platform-ai-agent-product`

- **Purpose:** Large-scope, cross-product, admin, or system-level wording where the precise product label must stay explicit
- **Alias messages:** `platform-ai-agent-product`, `platform-ai-agent-product-inline`, `platform-ai-agent-product-count`, `platform-ai-agent-product-inline-count`
- **Replaces:** `Enterprise Agent`, `Enterprise Agents`, governance/admin `AI agent` copy when semantic precision matters
- **en-US:** `Enterprise Agent Worker`
- **de-DE:** `Enterprise-Agent-Worker`
- **ro-RO:** `Agent enterprise operațional`

### `-platform-ai-agent-network`

- **Purpose:** Execution/coordination layer
- **Alias messages:** `platform-ai-agent-network`, `platform-ai-agent-network-inline`, `platform-ai-agent-network-count`, `platform-ai-agent-network-inline-count`
- **Replaces:** `Agent Mesh`, `agent runtime`, `agent platform`, `agent mesh`
- **en-US / de-DE:** `Agent Operating System`
- **ro-RO:** `Sistem de operare pentru agenți`

### `-platform-domain-create`

- **Purpose:** Create domain terminology above concrete create apps
- **Alias messages:** `platform-domain-create`, `platform-domain-create-inline`, `platform-domain-create-count`, `platform-domain-create-inline-count`
- **Replaces:** category-level `Create`, `AI Builder`, `agent builder`
- **en-US:** `AI Development Platform`
- **de-DE:** `KI-Entwicklungsplattform`
- **ro-RO:** `Platformă de dezvoltare AI`

### `-platform-domain-business`

- **Purpose:** Business domain terminology above concrete business packs
- **Alias messages:** `platform-domain-business`, `platform-domain-business-inline`, `platform-domain-business-count`, `platform-domain-business-inline-count`
- **Replaces:** `Business Suite`, `Business+`, `domain apps`, generalized `Business Domains`
- **en-US:** `Business Capability Platform`
- **de-DE:** `Business-Capability-Plattform`
- **ro-RO:** `Platformă pentru capabilități de business`

### `-platform-domain-workplace`

- **Purpose:** Workplace domain terminology above personal productivity apps (replaces category-level `Every`, not product names such as `EveryAI`)
- **Alias messages:** `platform-domain-workplace`, `platform-domain-workplace-inline`, `platform-domain-workplace-count`, `platform-domain-workplace-inline-count`
- **Replaces:** category-level `Every`, generalized productivity pillar naming
- **en-US:** `Digital Workplace Platform`
- **de-DE:** `Digitale Workplace-Plattform`
- **ro-RO:** `Platformă digitală de lucru`

### `-platform-business-capability-pack`

- **Purpose:** Generic capability pack concept under the business domain
- **Alias messages:** `platform-business-capability-pack`, `platform-business-capability-pack-inline`, `platform-business-capability-pack-count`, `platform-business-capability-pack-inline-count`
- **Replaces:** `module bundle`, `solution package`, generalized `Value Packages`
- **en-US:** `Business Capability Pack`
- **de-DE:** `Business-Capability-Paket`
- **ro-RO:** `Pachet de capabilități de business`

### `-platform-value-pack`

- **Purpose:** NEWWORK-branded commercial term
- **Alias messages:** `platform-value-pack`, `platform-value-pack-inline`, `platform-value-pack-count`, `platform-value-pack-inline-count`
- **Replaces:** `Value Pack`, `Value Packs`, `Flow Value Packs`
- **en-US / de-DE / ro-RO:** `Value Pack`

### `-platform-credit`

- **Purpose:** Usage-control credit label
- **Alias messages:** `platform-credit`, `platform-credit-inline`, `platform-credit-count`, `platform-credit-inline-count`
- **Replaces:** raw `Credits` / `NEWWORK Credits`
- **en-US / de-DE / ro-RO:** `NEWWORK Credit`

## Claim keys

| Key                                            | Purpose                                                |
| ---------------------------------------------- | ------------------------------------------------------ |
| `platform-type-claim`                          | Full platform category sentence                        |
| `platform-differentiation-claim`               | Differentiation from generic agent frameworks          |
| `platform-ai-agent-network-claim`              | Agent network coordination sentence                    |
| `platform-transformation-claim`                | Systems-of-record to systems-of-intelligence narrative |
| `platform-knowledge-claim`                     | Operating Mind of the Enterprise phrase                |
| `platform-governance-claim`                    | Governed digital employee requirements                 |
| `platform-business-significance-pricing-claim` | Business-significance pricing narrative                |
| `platform-credit-claim`                        | Credits vs business-capability pricing narrative       |

## Fluent examples

```ftl
# Local FTL sentence wrapper
hero-subtitle = Build { -platform-ai-agent.inline-plural } and orchestrate work.

# Direct alias reuse
card-agent-title = { platform-ai-agent-count }

# TSX-friendly alias
agent-summary = { platform-ai-agent-count }

# Composed claim
footer-enabler = { platform-enabler-claim }
```

## Legacy mapping quick reference

| Legacy phrase                                          | Preferred platform entry                            |
| ------------------------------------------------------ | --------------------------------------------------- |
| Enterprise AI platform                                 | `-platform-type` / `platform-type`                  |
| Enterprise AI (umbrella)                               | `-platform-enabler` / `platform-enabler-claim`      |
| Enterprise Agent Workforce                             | `-platform-ai-agent-fleet`                          |
| low-scope `Enterprise Agent(s)` / narrative `AI agent` | `-platform-ai-agent` / alias count messages         |
| large-scope or cross-product `Enterprise Agent(s)`     | `-platform-ai-agent-product` / alias count messages |
| Agent Mesh / agent runtime                             | `-platform-ai-agent-network` / alias count messages |
| Create / AI Builder (category)                         | `-platform-domain-create`                           |
| Business Suite / domain apps                           | `-platform-domain-business`                         |
| Every pillar / personal productivity (category)        | `-platform-domain-workplace`                        |
| module bundle / solution package                       | `-platform-business-capability-pack`                |
| Value Pack                                             | `-platform-value-pack`                              |
| knowledge/context/intelligence layer narrative         | `platform-knowledge-claim`                          |
| Credits as core label                                  | `-platform-credit`                                  |
