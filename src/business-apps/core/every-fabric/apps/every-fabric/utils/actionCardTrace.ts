/**
 * Parser for the generic `action_card` tool-result payload emitted by
 * the backend `prompt-manager/src/agents/deep/tools/action_card.py`
 * helper. Any tool that produces a real-world artifact (triggered
 * workflow, sent email, scheduled meeting, …) can emit this shape so
 * the chat UI renders it as a clickable card with a status badge and
 * a deep link — instead of pasting raw IDs into markdown.
 *
 * The envelope marker (<!--__envelope__:...-->) is stripped by the
 * backend before persistence (see prompt-manager `execution.py`), so
 * the FE only ever sees the bare JSON payload.
 */

export type ActionCardStatusVariant = 'pending' | 'running' | 'success' | 'destructive' | 'muted'

export interface ActionCardStatus {
  /** Backend status code (e.g. `RUNNING`, `COMPLETED`, `sent`). */
  code: string
  /** Human-friendly label shown in the badge. */
  label: string
  /** Visual variant the badge component renders. */
  variant: ActionCardStatusVariant
}

export interface ActionCardAction {
  label: string
  href: string
}

export interface ActionCardEntity {
  /** Discriminator: `service_workflow`, `email_message`, `task_notification`, ... */
  type: string
  id: string
}

export interface ActionCardBody {
  title: string
  subtitle?: string
  status: ActionCardStatus
  primaryAction: ActionCardAction
  secondaryActions?: ActionCardAction[]
  icon?: string
  entity: ActionCardEntity
  /**
   * If true (default), the renderer may refresh the badge by polling
   * the appropriate backend for this entity (e.g.
   * `GET /flows/{entity.id}` when `entity.type === 'service_workflow'`).
   */
  pollStatus?: boolean
}

export interface ActionCardPayload {
  ui: { kind: 'action_card'; version: number }
  card: ActionCardBody
  /**
   * Audit / debug references (workflow id, correlation id, template
   * id). Hidden in the card body by default; shown in a "Details"
   * disclosure for admins only.
   */
  refs?: Record<string, string>
  /**
   * Short prose the LLM may quote in its final answer. Must NOT
   * contain UUIDs.
   */
  agentSummary?: string
}

/** Cheap structural sanity check used by detectors. */
function looksLikeActionCard(obj: unknown): obj is ActionCardPayload {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  if (!o.ui || typeof o.ui !== 'object') return false
  const ui = o.ui as Record<string, unknown>
  if (ui.kind !== 'action_card') return false
  if (!o.card || typeof o.card !== 'object') return false
  const card = o.card as Record<string, unknown>
  if (typeof card.title !== 'string') return false
  if (!card.status || typeof card.status !== 'object') return false
  if (!card.primaryAction || typeof card.primaryAction !== 'object') return false
  if (!card.entity || typeof card.entity !== 'object') return false
  return true
}

const VALID_VARIANTS: ReadonlySet<ActionCardStatusVariant> = new Set([
  'pending',
  'running',
  'success',
  'destructive',
  'muted'
])

const FLOW_CODE_TO_VARIANT: Record<string, ActionCardStatusVariant> = {
  RUNNING: 'running',
  IN_PROGRESS: 'running',
  CLAIMED: 'running',
  PENDING: 'pending',
  SCHEDULED: 'pending',
  QUEUED: 'pending',
  PAUSED: 'pending',
  COMPLETED: 'success',
  FAILED: 'destructive',
  REJECTED: 'destructive',
  TIMED_OUT: 'destructive',
  CANCELED: 'muted',
  CANCELLED: 'muted',
  TERMINATED: 'muted',
  UNKNOWN: 'muted'
}

const FLOW_CODE_TO_LABEL: Record<string, string> = {
  RUNNING: 'In progress',
  IN_PROGRESS: 'In progress',
  CLAIMED: 'In progress',
  PENDING: 'Pending',
  SCHEDULED: 'Scheduled',
  QUEUED: 'Queued',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
  TIMED_OUT: 'Timed out',
  CANCELED: 'Cancelled',
  CANCELLED: 'Cancelled',
  TERMINATED: 'Terminated',
  UNKNOWN: 'Unknown'
}

/**
 * Compute a visual variant from a raw backend status code. Used both
 * to backfill `status.variant` when the backend omitted it and to
 * refresh the badge during live polling.
 */
export function variantForStatusCode(code: string | undefined | null): ActionCardStatusVariant {
  if (!code) return 'pending'
  return FLOW_CODE_TO_VARIANT[code.toUpperCase()] ?? 'pending'
}

/** Human-friendly label fallback when the backend omits `status.label`. */
export function labelForStatusCode(code: string | undefined | null): string {
  if (!code) return 'Pending'
  return FLOW_CODE_TO_LABEL[code.toUpperCase()] ?? code
}

/**
 * Strip the `<!--__envelope__:...-->` marker the backend uses when it
 * wraps a payload in `ToolResultEnvelope`. The marker is supposed to
 * be removed before persistence, but we strip defensively in case an
 * older pipeline carries it through.
 */
function stripEnvelopeMarker(raw: string): string {
  const trimmed = raw.trimStart()
  if (trimmed.startsWith('<!--__envelope__:')) {
    const end = trimmed.indexOf('-->')
    if (end !== -1) return trimmed.slice(end + 3).trimStart()
  }
  return raw
}

/**
 * Attempt to parse a tool result into an `ActionCardPayload`. Returns
 * `null` when the result is not an action_card (e.g. a free-form
 * string, an unrelated JSON object, etc.) so the caller can fall back
 * to the default collapsible "Result" renderer.
 *
 * Accepts:
 *   - `string` — JSON-encoded payload (optionally still wrapped in the
 *     envelope marker as a defensive measure)
 *   - `object` — already-parsed payload (the common case after
 *     `parseToolOutput`)
 */
export function parseActionCardToolResult(result: unknown): ActionCardPayload | null {
  if (result == null) return null

  let candidate: unknown = result
  if (typeof result === 'string') {
    const cleaned = stripEnvelopeMarker(result).trim()
    if (!cleaned.startsWith('{')) return null
    try {
      candidate = JSON.parse(cleaned)
    } catch {
      return null
    }
  }

  if (!looksLikeActionCard(candidate)) return null

  // Normalize: backfill `variant` / `label` if the backend omitted
  // them, and clamp `pollStatus` to a real boolean.
  const card = candidate.card
  const status = card.status
  const code = typeof status.code === 'string' ? status.code : ''
  const variant: ActionCardStatusVariant = VALID_VARIANTS.has(status.variant)
    ? status.variant
    : variantForStatusCode(code)
  const label = typeof status.label === 'string' && status.label ? status.label : labelForStatusCode(code)

  return {
    ui: { kind: 'action_card', version: candidate.ui.version ?? 1 },
    card: {
      ...card,
      status: { code, label, variant },
      pollStatus: card.pollStatus !== false
    },
    refs: candidate.refs ?? {},
    agentSummary: candidate.agentSummary
  }
}

/**
 * Variant → Tailwind class fragment used by the FE badge. Co-located
 * here so other consumers (e.g. final-answer "Actions Taken" enrichment)
 * can render the same badge without duplicating the mapping.
 */
export const STATUS_BADGE_CLASS: Record<ActionCardStatusVariant, string> = {
  pending: 'gba:bg-muted gba:text-muted-foreground',
  running: 'gba:bg-blue-100 gba:text-blue-700 dark:gba:bg-blue-900/40 dark:gba:text-blue-200',
  success: 'gba:bg-green-100 gba:text-green-700 dark:gba:bg-green-900/40 dark:gba:text-green-200',
  destructive: 'gba:bg-red-100 gba:text-red-700 dark:gba:bg-red-900/40 dark:gba:text-red-200',
  muted: 'gba:bg-muted gba:text-muted-foreground'
}
