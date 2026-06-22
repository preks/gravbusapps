# Platform Terminology Migration Plan

Confirmed migration plan after a fresh repo-wide scan of user-facing `.ftl`, `.ts`, and `.tsx` files.

Scope of this file:

1. show **where the shared platform bundle must be integrated**
2. show **where each shared platform term or alias must be applied**
3. show **which legacy wording must be deleted**

Out of scope here:

- comments
- tests
- product names such as `Flow Studio`, `Screen Builder`, `Enterprise Agent Studio`
- ambiguous generic strings such as bare `Create`

Key source of truth: `src/business-apps/_i18n/platform/*.ftl`

---

## Review outcome

The previous plan was incomplete in three ways:

1. it mixed **real replacements** with **keep-as-is product names**
2. it did not clearly separate **integrate / apply / delete**
3. it missed some confirmed user-facing files, especially in `every-fabric` and `content-record`

This file now lists only **confirmed UI places** that actually need the shared terminology layer.

---

## Action model

| Action        | Meaning                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| **Integrate** | Update local `_i18n/index.ts` so app FTL can reference shared platform terms and aliases |
| **Apply**     | Replace a legacy literal in local FTL or TSX with a shared term or alias                 |
| **Delete**    | Remove the old literal wording after the replacement is in place                         |
| **Keep**      | Do not replace because it is a product/app name or otherwise outside the approved scope  |

### Integration pattern

```typescript
import translations from '@/business-apps/_i18n'

import enUS from './en-US.ftl?raw'
import deDE from './de-DE.ftl?raw'
import roRO from './ro-RO.ftl?raw'

export default {
  'en-US': translations['en-US'] + '\n' + enUS,
  'de-DE': translations['de-DE'] + '\n' + deDE,
  'ro-RO': translations['ro-RO'] + '\n' + roRO
} as Record<string, string>
```

### Fluent usage rule

`src/business-apps/_i18n/platform/*.ftl` now uses:

- **Terms** as canonical source of truth, e.g. `-platform-ai-agent`
- **Attributes** for form variants, e.g. `.label`, `.inline`, `.label-plural`, `.inline-plural`
- **Alias messages** for stable direct usage from app code, e.g. `platform-ai-agent`, `platform-ai-agent-count`

Use this rule in app files:

| Context                                                             | Preferred usage                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| local `.ftl` needs a term inside a sentence                         | reference the **term attribute** directly, e.g. `{ -platform-ai-agent.inline }` |
| local `.ftl` needs a direct plural message without sentence wrapper | reference alias message, e.g. `{ platform-ai-agent-count }`                     |
| TSX needs a direct translation key via `t()`                        | use alias message, e.g. `t('platform-ai-agent-count', { count })`               |

### Default deletion rule

Keep local FTL keys. Change their **values**.

Example:

```ftl
# keep local key name, replace only the legacy wording
card-enterprise-agents-title = { platform-ai-agent-count }
```

So the default is:

- **delete legacy wording**
- **do not delete local keys**

---

## 1. Integrate shared platform bundle

### 1.1 Existing `_i18n/index.ts` files that must import `@/business-apps/_i18n`

| File                                                                    | Current state         | Action    |
| ----------------------------------------------------------------------- | --------------------- | --------- |
| `src/business-apps/platform/apps/newwork-main/_i18n/index.ts`           | standalone bundle     | Integrate |
| `src/business-apps/core/create/apps/create-workspace/_i18n/index.ts`    | standalone bundle     | Integrate |
| `src/business-apps/core/create/apps/flow-creator/_i18n/index.ts`        | standalone bundle     | Integrate |
| `src/business-apps/core/create/apps/prompt-manager/_i18n/index.ts`      | standalone bundle     | Integrate |
| `src/business-apps/platform/apps/chat/_i18n/index.ts`                   | standalone bundle     | Integrate |
| `src/common/components/ai-builder/_i18n/index.ts`                       | standalone bundle     | Integrate |
| `src/common/components/flow/flow-viewer/_i18n/index.ts`                 | standalone bundle     | Integrate |
| `src/business-apps/flow/common/components/flow-renderer/_i18n/index.ts` | standalone bundle     | Integrate |
| `src/business-apps/core/create/apps/newwork-connect/_i18n/index.ts`     | standalone bundle     | Integrate |
| `src/business-apps/core/content/records/content-record/_i18n/index.ts`  | merges old root shape | Integrate |
| `src/business-apps/flow/apps/success/_i18n/index.ts`                    | mixed locale aliases  | Integrate |

### 1.2 Apps that currently have no usable local translation bundle for this work

These need a local `_i18n` bundle before the platform keys can be applied cleanly.

| App / area                                              | Current state                            | Action                                         |
| ------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| `src/business-apps/platform/apps/agent-mesh`            | no local `_i18n` bundle                  | Add local `_i18n/{en-US,de-DE,ro-RO,index.ts}` |
| `src/business-apps/platform/apps/newwork-business-apps` | no local `_i18n` bundle                  | Add local bundle                               |
| `src/business-apps/flow/apps/flow-hub`                  | no local `_i18n` bundle                  | Add local bundle                               |
| `src/business-apps/core/every-fabric/apps/every-fabric` | only partial `_i18n/en-US.ftl`, no index | Complete local bundle                          |

---

## 2. Apply shared keys

All `.ftl` rows below mean: change **all locale variants** (`en-US.ftl`, `de-DE.ftl`, `ro-RO.ftl`) for that same local key, unless the file currently exists only in one locale.

When the plan says:

- `alias` -> use `platform-*` or `platform-*-count`
- `term` -> use `-platform-*.<attribute>`

### 2.1 `platform-ai-agent-count`

Use for plural low-scope business or narrative wording where `Digital Employee(s)` is sufficient.

| File                                                                                                              | Local key / location                      | Replace legacy wording   | Apply shared layer                                                                        | Delete local key? |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- | ----------------- |
| `src/business-apps/platform/apps/newwork-main/_i18n/*.ftl`                                                        | `pillar-create-feature-enterprise-agents` | `Enterprise Agents`      | alias: `{ platform-ai-agent-count }`                                                      | No                |
| `src/business-apps/core/create/apps/newwork-connect/_i18n/*.ftl`                                                  | `connect-consumer-task-expert`            | `Enterprise Agents`      | alias: `{ platform-ai-agent-count }`                                                      | No                |
| `src/business-apps/core/every-fabric/apps/every-fabric/components/sidebar/SidebarHeader.tsx`                      | subtitle text                             | `Enterprise Agents`      | new local FTL wrapper with alias `{ platform-ai-agent-count }`                            | No                |
| `src/business-apps/core/every-fabric/apps/every-fabric/components/agent-mesh/meshLayers.ts`                       | `label: 'Enterprise Agents'`              | hardcoded literal        | new local FTL wrapper with alias `{ platform-ai-agent-count }`                            | No                |
| `src/business-apps/core/every-fabric/apps/every-fabric/components/chat/MessageBubble.tsx`                         | `NEWWORK Enterprise Agents`               | hardcoded literal        | new local FTL wrapper with alias `{ platform-ai-agent-count }`                            | No                |
| `src/business-apps/core/every-fabric/apps/every-fabric/components/chat/StreamingAnswerBubble.tsx`                 | `NEWWORK Enterprise Agents`               | hardcoded literal        | new local FTL wrapper with alias `{ platform-ai-agent-count }`                            | No                |
| `src/business-apps/core/every-fabric/apps/every-fabric/components/renderers/final-answer/FinalAnswerRenderer.tsx` | `NEWWORK Enterprise Agents`               | hardcoded literal        | new local FTL wrapper with alias `{ platform-ai-agent-count }`                            | No                |
| `src/business-apps/platform/apps/chat/_i18n/*.ftl`                                                                | `chat-createExpertsHint`                  | generic `agents` wording | wrapper sentence with alias `{ platform-ai-agent-count }`; keep `Enterprise Agent Studio` | No                |

### 2.2 `platform-ai-agent-product`

Use for large-scope, cross-product, admin, or system-level wording where precision matters and the explicit product term must remain visible.

| File                                                                                                           | Local key / location                        | Replace legacy wording          | Apply shared layer                                                       | Delete local key? |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------ | ----------------- |
| `src/business-apps/core/create/apps/create-workspace/_i18n/*.ftl`                                              | `card-enterprise-agents-title`              | `Enterprise Agents`             | term: `{ -platform-ai-agent-product.label-plural }`                      | No                |
| `src/business-apps/core/create/apps/create-workspace/_i18n/*.ftl`                                              | `card-enterprise-agents-description`        | `enterprise agents` in sentence | term: `{ -platform-ai-agent-product.inline-plural }`                     | No                |
| `src/business-apps/core/create/apps/create-workspace/_i18n/*.ftl`                                              | `hero-subtitle`                             | `enterprise agents` in sentence | term: `{ -platform-ai-agent-product.inline-plural }`                     | No                |
| `src/business-apps/core/create/apps/create-workspace/_i18n/*.ftl`                                              | `quickstart-example-agent`                  | `enterprise agent` in sentence  | term: `{ -platform-ai-agent-product.inline }`                            | No                |
| `src/business-apps/core/create/apps/create-workspace/_i18n/*.ftl`                                              | `connections-label-enterprise-agents`       | `Enterprise Agents`             | term: `{ -platform-ai-agent-product.label-plural }`                      | No                |
| `src/business-apps/core/create/apps/create-workspace/_i18n/*.ftl`                                              | `connections-products-list`                 | `Enterprise Agents`             | term: `{ -platform-ai-agent-product.label-plural }`                      | No                |
| `src/business-apps/core/create/apps/create-workspace/features/landing/components/ConnectionsVisualization.tsx` | `label: 'Enterprise Agents'`                | hardcoded literal               | use local FTL key above                                                  | No                |
| `src/business-apps/core/create/apps/flow-creator/_i18n/*.ftl`                                                  | `task-type-ai_task_expert`                  | `Enterprise Agent`              | alias: `{ platform-ai-agent-product }`                                   | No                |
| `src/business-apps/core/create/apps/flow-creator/_i18n/*.ftl`                                                  | `decision-ai-executor-taskexpert`           | `Enterprise Agent`              | alias: `{ platform-ai-agent-product }`                                   | No                |
| `src/business-apps/core/create/apps/flow-creator/_i18n/*.ftl`                                                  | `validation-decision-must-select-agent`     | `Enterprise Agent` in sentence  | term: `{ -platform-ai-agent-product.label }` or `.inline` by locale need | No                |
| `src/business-apps/core/create/apps/flow-creator/_i18n/*.ftl`                                                  | `validation-decision-unmapped-agent-params` | `Enterprise Agent` in sentence  | term: `{ -platform-ai-agent-product.label }` or `.inline` by locale need | No                |
| `src/business-apps/core/create/apps/flow-creator/_i18n/*.ftl`                                                  | `add-step-tip-advanced-mode`                | `Enterprise Agent` in sentence  | term: `{ -platform-ai-agent-product.label }` or `.inline` by locale need | No                |
| `src/business-apps/core/create/apps/flow-creator/_i18n/*.ftl`                                                  | `task-step-type-ai-task-expert-description` | `Enterprise Agent` in sentence  | term: `{ -platform-ai-agent-product.label }` or `.inline` by locale need | No                |
| `src/business-apps/core/create/apps/flow-creator/hooks/useFlowValidation.ts`                                   | two hardcoded validation strings            | `Enterprise Agent prompt`       | use local FTL keys above, not TSX literals                               | No                |
| `src/business-apps/core/create/apps/prompt-manager/_i18n/*.ftl`                                                | `new-task-expert`                           | `Enterprise Agent`              | term: `{ -platform-ai-agent-product.label }`                             | No                |
| `src/business-apps/core/create/apps/prompt-manager/_i18n/*.ftl`                                                | `empty-message`                             | `Enterprise Agent`              | term or alias depending final sentence shape                             | No                |
| `src/business-apps/core/create/apps/prompt-manager/_i18n/*.ftl`                                                | `create-task-expert`                        | `Enterprise Agent`              | term: `{ -platform-ai-agent-product.label }`                             | No                |
| `src/common/components/ai-builder/_i18n/*.ftl`                                                                 | `mesh-empty-create-new`                     | `Enterprise Agent`              | term: `{ -platform-ai-agent-product.label }` or `.inline`                | No                |
| `src/common/components/ai-builder/_i18n/*.ftl`                                                                 | `mesh-empty-build-cta`                      | `Enterprise Agent`              | term: `{ -platform-ai-agent-product.label }` or `.inline`                | No                |
| `src/common/components/flow/flow-viewer/_i18n/*.ftl`                                                           | `task-node-label-enterprise-agent`          | `Enterprise Agent`              | alias: `{ platform-ai-agent-product }`                                   | No                |
| `src/business-apps/flow/common/components/flow-renderer/_i18n/*.ftl`                                           | `step-badge-enterprise-agent`               | `Enterprise Agent`              | alias: `{ platform-ai-agent-product }`                                   | No                |
| `src/business-apps/core/content/records/content-record/_i18n/*.ftl`                                            | `policy_action_create_expert`               | `Enterprise Agent` in sentence  | term: `{ -platform-ai-agent-product.label }`                             | No                |
| `src/business-apps/core/content/records/content-record/_i18n/*.ftl`                                            | `policy_action_create_expert_short`         | `Enterprise Agent`              | term: `{ -platform-ai-agent-product.label }`                             | No                |
| `src/business-apps/core/content/records/content-record/_i18n/*.ftl`                                            | `policy_create_expert_dialog_title`         | `Enterprise Agent`              | term: `{ -platform-ai-agent-product.label }`                             | No                |
| `src/business-apps/core/content/records/content-record/_i18n/*.ftl`                                            | `policy_kpi_expert_executions`              | `Enterprise Agent Runs`         | term wrapper with `{ -platform-ai-agent-product.label }`                 | No                |
| `src/business-apps/core/every-fabric/apps/every-fabric/_i18n/en-US.ftl`                                        | `enterprise-agent-title`                    | `Enterprise Agent`              | alias: `{ platform-ai-agent-product }`                                   | No                |
| `src/business-apps/core/every-fabric/apps/every-fabric/components/skills/SkillsScreen.tsx`                     | page title                                  | `Enterprise Agent`              | new local FTL key with alias `{ platform-ai-agent-product }`             | No                |
| `src/business-apps/core/every-fabric/apps/every-fabric/components/agents/AgentsScreen.tsx`                     | built-ins description                       | `Enterprise Agent` in sentence  | term: `{ -platform-ai-agent-product.label }` or `.inline`                | No                |

### 2.3 `platform-ai-agent-network`

Use for `Agent Mesh`.

| File                                                                                                      | Local key / location      | Replace legacy wording                       | Apply shared layer                                                         | Delete local key? |
| --------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------- | -------------------------------------------------------------------------- | ----------------- |
| `src/business-apps/core/create/apps/prompt-manager/components/task-expert-builder/OverviewTab.tsx`        | `description`             | `Agent Mesh`                                 | move to local FTL wrapper with term `{ -platform-ai-agent-network.label }` | No                |
| `src/common/components/ai-builder/agent-mesh-preview/AgentMeshPreview.tsx`                                | multiple UI strings       | `Agent Mesh`                                 | new local FTL wrappers with term `{ -platform-ai-agent-network.label }`    | No                |
| `src/business-apps/platform/apps/agent-mesh/AgentMeshApp.tsx`                                             | `appLabel`, `title`       | `Agent Mesh`                                 | new local FTL key with alias `{ platform-ai-agent-network }`               | No                |
| `src/business-apps/platform/apps/agent-mesh/components/steering-console/SteeringChat.tsx`                 | heading                   | `Agent Mesh Console`                         | wrapper sentence with term `{ -platform-ai-agent-network.label }`          | No                |
| `src/business-apps/core/every-fabric/apps/every-fabric/components/agent-mesh/meshScopes.ts`               | scope titles              | `Company Agent Mesh`, `User Agent Mesh`, ... | wrapper titles with term `{ -platform-ai-agent-network.label }`            | No                |
| `src/business-apps/core/every-fabric/apps/every-fabric/components/trace-explorer/TraceExplorerScreen.tsx` | label                     | `Agent Mesh`                                 | new local FTL key with alias `{ platform-ai-agent-network }`               | No                |
| `src/business-apps/core/create/apps/ai-orchestrator/features/orchestrator/types/chat.ts`                  | `{ label: 'Agent Mesh' }` | `Agent Mesh`                                 | use translated label from local FTL / translation mapping                  | No                |

### 2.4 `platform-value-pack` and `platform-business-capability-pack`

Use for `Value Pack(s)` and `Value Packages`.

| File                                                                                             | Local key / location            | Replace legacy wording | Apply shared layer                                                         | Delete local key? |
| ------------------------------------------------------------------------------------------------ | ------------------------------- | ---------------------- | -------------------------------------------------------------------------- | ----------------- |
| `src/business-apps/platform/apps/newwork-business-apps/NewworkBusinessApps.tsx`                  | `title: 'Value Packs'`          | `Value Packs`          | new local FTL key with alias `{ platform-value-pack-count }`               | No                |
| `src/business-apps/platform/apps/newwork-business-apps/components/BusinessAppsVisualization.tsx` | `label: 'Value Packs'`          | `Value Packs`          | new local FTL key with alias `{ platform-value-pack-count }`               | No                |
| `src/business-apps/platform/apps/newwork-business-apps/components/BusinessAppsVisualization.tsx` | `description: 'Value Packages'` | `Value Packages`       | new local FTL key with alias `{ platform-business-capability-pack-count }` | No                |
| `src/business-apps/flow/apps/flow-hub/FlowHub.tsx`                                               | section title                   | `Flow Value Packs`     | new local FTL wrapper using alias `{ platform-value-pack-count }`          | No                |
| `src/business-apps/flow/apps/flow-hub/FlowHub.tsx`                                               | button label                    | `Browse Value Packs`   | new local FTL wrapper using alias `{ platform-value-pack-count }`          | No                |
| `src/business-apps/flow/apps/flow-hub/FlowHub.tsx`                                               | KPI / card label                | `Value Packs`          | new local FTL key with alias `{ platform-value-pack-count }`               | No                |

### 2.5 `platform-enabler` and `platform-type`

Use only where the approved platform terminology clearly matches the current UI wording.

| File                                                                      | Local key / location | Replace legacy wording            | Apply shared layer                                                                   | Delete local key? |
| ------------------------------------------------------------------------- | -------------------- | --------------------------------- | ------------------------------------------------------------------------------------ | ----------------- |
| `src/business-apps/platform/apps/newwork-main/components/HeroSection.tsx` | hero title           | `THE ENTERPRISE AI`               | new local FTL wrapper with alias `{ platform-enabler }`                              | No                |
| `src/business-apps/platform/apps/newwork-main/NewworkMain.tsx`            | footer line          | `The Enterprise AI platform.`     | new local FTL wrapper with alias `{ platform-type }`                                 | No                |
| `src/business-apps/flow/apps/success/_i18n/*.ftl`                         | `hero-title`         | `Enterprise AI Operations Center` | review wrapper with term or alias from `platform-enabler`; no direct 1:1 replacement | No                |

---

## 3. Delete list

### 3.1 Local keys to delete

Default answer after the fresh scan: **none**.

Keep existing local keys and replace their values.

### 3.2 Legacy wording to delete from FTL values or TSX

| Legacy wording                                  | Delete from                                          | Replace with                                                                 |
| ----------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `Enterprise Agents`                             | local FTL values and hardcoded TSX in confirmed rows | alias `{ platform-ai-agent-count }` or term plural attribute                 |
| `Enterprise Agent`                              | local FTL values and hardcoded TSX in confirmed rows | alias `{ platform-ai-agent-product }` or term attribute                      |
| `Agent Mesh`                                    | local FTL values and hardcoded TSX in confirmed rows | alias `{ platform-ai-agent-network }` or term attribute                      |
| `Value Packs`, `Value Pack`, `Flow Value Packs` | hardcoded TSX in confirmed rows                      | alias `{ platform-value-pack }` / `{ platform-value-pack-count }`            |
| `Value Packages`                                | hardcoded TSX in confirmed rows                      | alias `{ platform-business-capability-pack-count }` or term plural attribute |
| `THE ENTERPRISE AI`                             | hardcoded hero title                                 | wrapper with alias `{ platform-enabler }`                                    |
| `The Enterprise AI platform.`                   | hardcoded footer line                                | wrapper with alias `{ platform-type }`                                       |

### 3.3 Confirmed keep-as-is strings

These were found during the scan but should **not** be replaced in this terminology migration.

| String / area                                        | Why it stays                         |
| ---------------------------------------------------- | ------------------------------------ |
| `Enterprise Agent Studio`                            | product/app name                     |
| `Flow Studio`                                        | product/app name                     |
| `Screen Builder`                                     | product/app name                     |
| `AI Builder` when used as app title or section title | product/app name                     |
| comments and tests                                   | not user-facing migration scope      |
| ambiguous generic `Create` hits                      | not specific to platform terminology |

Files that keep `Enterprise Agent Studio` unchanged:

- `src/business-apps/core/create/apps/prompt-manager/_i18n/*.ftl`
- `src/business-apps/platform/apps/chat/_i18n/*.ftl`
- `src/business-apps/core/documents/apps/document-creator/_i18n/*.ftl`
- `src/business-apps/ai/apps/document-reviewer/_i18n/*.ftl`
- `src/business-apps/core/every-fabric/apps/every-fabric/components/agents/CreateAgentModal.tsx`

---

## 4. Platform keys actually needed in confirmed current UI

| Platform key                         | Confirmed current use                               |
| ------------------------------------ | --------------------------------------------------- |
| `-platform-ai-agent`                 | yes                                                 |
| `-platform-ai-agent-product`         | yes                                                 |
| `-platform-ai-agent-network`         | yes                                                 |
| `-platform-value-pack`               | yes                                                 |
| `-platform-business-capability-pack` | yes                                                 |
| `-platform-enabler`                  | yes                                                 |
| `-platform-type`                     | yes                                                 |
| alias messages `platform-*`          | yes, for direct TSX usage and simple label wiring   |
| `-platform-domain-create`            | not confidently needed in confirmed current UI scan |
| `-platform-domain-business`          | not confidently needed in confirmed current UI scan |
| `-platform-ai-agent-fleet`           | no confirmed current UI hit                         |
| `-platform-credit`                   | no confirmed current UI hit                         |
| claim aliases beyond current scope   | no confirmed current UI hit                         |

This means the actual first migration should be smaller than the earlier draft.

---

## 5. Verification after implementation

| Check                                      | Expected result                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| integrate files updated                    | all files in section 1.1 merge `@/business-apps/_i18n`                                                                 |
| apps without local bundle handled          | all files in section 1.2 have a usable local translation bundle                                                        |
| no stray legacy wording in confirmed scope | confirmed files no longer contain raw `Enterprise Agent(s)`, `Agent Mesh`, `Value Packs`, `The Enterprise AI platform` |
| shared layer shape preserved               | apps use term attributes in local FTL and alias messages for direct TSX usage                                          |
| no accidental overreach                    | product names `Flow Studio`, `Screen Builder`, `Enterprise Agent Studio` remain unchanged                              |

Suggested grep after implementation:

```text
rg "Enterprise Agents|Enterprise Agent|Agent Mesh|Value Packs|Flow Value Packs|The Enterprise AI platform|THE ENTERPRISE AI" src --glob "*.{ftl,ts,tsx}"
```

Manual review rule:

- ignore comments
- ignore tests
- ignore approved product-name cases listed above

---

## 6. Implementation order

| Order | Scope                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------- |
| 1     | integrate files from section 1.1                                                                      |
| 2     | add missing local bundles from section 1.2                                                            |
| 3     | apply `platform-ai-agent-count` and `platform-ai-agent-product`                                       |
| 4     | apply `platform-ai-agent-network`                                                                     |
| 5     | apply `platform-value-pack`, `platform-business-capability-pack`, `platform-enabler`, `platform-type` |

---

## 7. Not in this plan

- editing `.cursor/plans/terminology-i18n-plan_203aef38.plan.md`
- replacing comments or tests
- replacing ambiguous generic `Create` strings
- broad renaming of app/product names
