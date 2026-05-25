/**
 * Parser for the generic ``case_panel`` family of tool-result payloads
 * emitted by the backend ``prompt-manager/src/agents/deep/tools/case_panel.py``
 * helpers (``case_panel_open`` / ``case_panel_update`` / ``case_panel_close``).
 *
 * The tools are *event-only*: they have no side effects, no failure
 * modes, and their tool output is a ``ToolResultEnvelope``-wrapped JSON
 * payload — identical pattern to ``action_card``. The hook
 * ``useFabricCases`` consumes these envelopes from ``step_completed``
 * events in the session trace to drive the right-sidebar Case Panel.
 *
 * Three envelope shapes:
 *
 *   case.opened:
 *     { ui: { kind: 'case_opened', version: 1 },
 *       case_id, title, items[], subject?, skill_id?, ts? }
 *
 *   case.step_changed:
 *     { ui: { kind: 'case_step_changed', version: 1 },
 *       case_id, step_id, status, workflow_id?, action_card_ref?, message?, ts? }
 *
 *   case.closed:
 *     { ui: { kind: 'case_closed', version: 1 },
 *       case_id, outcome, summary?, ts? }
 *
 * In addition, ``newwork_trigger_flow`` carries an *implicit*
 * step_changed signal: when its returned ``action_card`` includes
 * ``refs.caseId`` + ``refs.caseStepId``, the FE treats that as an
 * in_progress transition with ``workflow_id = card.entity.id``. This
 * keeps the agent's prompt simple — one tool call, not two — while
 * still letting the panel light up live.
 */

import type { ActionCardPayload } from './actionCardTrace'

export type CaseStepStatus = 'pending' | 'in_progress' | 'done' | 'failed' | 'skipped'

export type CaseOutcome = 'completed' | 'cancelled' | 'failed' | 'partial'

export type CaseStepKind = 'agent' | 'human' | 'flow' | 'notification' | 'other'

export interface CaseSubject {
  kind: string
  label: string
  id?: string
}

export interface CasePanelItem {
  step_id: string
  label: string
  description?: string
  owner?: string
  due?: string
  kind?: CaseStepKind
  status?: CaseStepStatus
}

export interface CaseOpenedPayload {
  ui: { kind: 'case_opened'; version: number }
  case_id: string
  title: string
  items: CasePanelItem[]
  subject?: CaseSubject
  skill_id?: string
  ts?: string
}

export interface CaseStepChangedPayload {
  ui: { kind: 'case_step_changed'; version: number }
  case_id: string
  step_id: string
  status: CaseStepStatus
  workflow_id?: string
  action_card_ref?: string
  message?: string
  ts?: string
}

export interface CaseClosedPayload {
  ui: { kind: 'case_closed'; version: number }
  case_id: string
  outcome: CaseOutcome
  summary?: string
  ts?: string
}

export type CasePanelPayload = CaseOpenedPayload | CaseStepChangedPayload | CaseClosedPayload

/** Narrow `CasePanelPayload` — discriminator lives under `ui.kind`, not top-level. */
export function isCaseOpenedPayload(p: CasePanelPayload): p is CaseOpenedPayload {
  return p.ui.kind === 'case_opened'
}

export function isCaseStepChangedPayload(p: CasePanelPayload): p is CaseStepChangedPayload {
  return p.ui.kind === 'case_step_changed'
}

export function isCaseClosedPayload(p: CasePanelPayload): p is CaseClosedPayload {
  return p.ui.kind === 'case_closed'
}

const VALID_STEP_STATUSES: ReadonlySet<CaseStepStatus> = new Set([
  'pending',
  'in_progress',
  'done',
  'failed',
  'skipped'
])

const VALID_OUTCOMES: ReadonlySet<CaseOutcome> = new Set(['completed', 'cancelled', 'failed', 'partial'])

/**
 * Strip the `<!--__envelope__:...-->` marker the backend uses when it
 * wraps a payload in `ToolResultEnvelope`. The marker is supposed to
 * be removed before persistence; this is a defensive fallback.
 */
function stripEnvelopeMarker(raw: string): string {
  const trimmed = raw.trimStart()
  if (trimmed.startsWith('<!--__envelope__:')) {
    const end = trimmed.indexOf('-->')
    if (end !== -1) return trimmed.slice(end + 3).trimStart()
  }
  return raw
}

function looksLikeCasePayload(obj: unknown): obj is CasePanelPayload {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  if (!o.ui || typeof o.ui !== 'object') return false
  const ui = o.ui as Record<string, unknown>
  if (typeof ui.kind !== 'string') return false
  if (ui.kind !== 'case_opened' && ui.kind !== 'case_step_changed' && ui.kind !== 'case_closed') {
    return false
  }
  if (typeof o.case_id !== 'string' || !o.case_id) return false
  return true
}

/**
 * Attempt to parse a tool result (string or already-parsed object)
 * into a `CasePanelPayload`. Returns `null` when the result is not a
 * case_panel envelope.
 *
 * Accepts the same input shapes as `parseActionCardToolResult`:
 *   - `string` — JSON, optionally still wrapped in the envelope marker
 *   - `object` — already-parsed payload
 */
function parseJsonCandidate(result: unknown): unknown {
  if (typeof result !== 'string') return result
  const cleaned = stripEnvelopeMarker(result).trim()
  if (!cleaned.startsWith('{')) return null
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

function readString(r: Record<string, unknown>, key: string): string | undefined {
  return typeof r[key] === 'string' ? (r[key] as string) : undefined
}

function toOpenedItem(raw: unknown): CasePanelItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const step_id = readString(r, 'step_id')
  const label = readString(r, 'label')
  if (!step_id || !label) return null
  const status =
    typeof r.status === 'string' && VALID_STEP_STATUSES.has(r.status as CaseStepStatus)
      ? (r.status as CaseStepStatus)
      : 'pending'
  return {
    step_id,
    label,
    description: readString(r, 'description'),
    owner: readString(r, 'owner'),
    due: readString(r, 'due'),
    kind: typeof r.kind === 'string' ? (r.kind as CaseStepKind) : undefined,
    status
  }
}

function buildOpenedPayload(open: CaseOpenedPayload): CaseOpenedPayload | null {
  if (typeof open.title !== 'string' || !Array.isArray(open.items)) return null
  const items: CasePanelItem[] = []
  for (const raw of open.items) {
    const item = toOpenedItem(raw)
    if (item) items.push(item)
  }
  if (items.length === 0) return null
  return {
    ui: { kind: 'case_opened', version: open.ui.version ?? 1 },
    case_id: open.case_id,
    title: open.title,
    items,
    subject: open.subject,
    skill_id: open.skill_id,
    ts: open.ts
  }
}

function buildStepChangedPayload(upd: CaseStepChangedPayload): CaseStepChangedPayload | null {
  if (typeof upd.step_id !== 'string' || !upd.step_id) return null
  if (!VALID_STEP_STATUSES.has(upd.status)) return null
  return {
    ui: { kind: 'case_step_changed', version: upd.ui.version ?? 1 },
    case_id: upd.case_id,
    step_id: upd.step_id,
    status: upd.status,
    workflow_id: upd.workflow_id || undefined,
    action_card_ref: upd.action_card_ref || undefined,
    message: upd.message || undefined,
    ts: upd.ts
  }
}

function buildClosedPayload(closed: CaseClosedPayload): CaseClosedPayload | null {
  if (!VALID_OUTCOMES.has(closed.outcome)) return null
  return {
    ui: { kind: 'case_closed', version: closed.ui.version ?? 1 },
    case_id: closed.case_id,
    outcome: closed.outcome,
    summary: closed.summary || undefined,
    ts: closed.ts
  }
}

export function parseCasePanelToolResult(result: unknown): CasePanelPayload | null {
  if (result == null) return null
  const candidate = parseJsonCandidate(result)
  if (!looksLikeCasePayload(candidate)) return null

  // Per-variant sanity normalization. We never throw — invalid
  // envelopes (e.g. unknown status) silently fall back to `null` so
  // the caller can ignore the row instead of crashing the panel.
  switch (candidate.ui.kind) {
    case 'case_opened':
      return buildOpenedPayload(candidate as CaseOpenedPayload)
    case 'case_step_changed':
      return buildStepChangedPayload(candidate as CaseStepChangedPayload)
    case 'case_closed':
      return buildClosedPayload(candidate as CaseClosedPayload)
    default:
      return null
  }
}

/**
 * When an `action_card` carries `refs.caseId` + `refs.caseStepId`, it
 * is *implicitly* a case_step_changed signal: the matching row flips
 * to `in_progress` and we adopt `card.entity.id` as the workflow id
 * for live polling. Returns `null` for action_cards without case
 * cross-linking refs.
 */
export function deriveCaseStepFromActionCard(card: ActionCardPayload): CaseStepChangedPayload | null {
  const refs = card.refs ?? {}
  const caseId = refs.caseId || refs.case_id
  const stepId = refs.caseStepId || refs.case_step_id
  if (!caseId || !stepId) return null

  const workflowId = card.card.entity?.type === 'service_workflow' ? card.card.entity.id : undefined

  return {
    ui: { kind: 'case_step_changed', version: 1 },
    case_id: caseId,
    step_id: stepId,
    status: 'in_progress',
    workflow_id: workflowId,
    action_card_ref: refs.workflowId || refs.correlationId || undefined,
    message: card.agentSummary || card.card.title
  }
}
