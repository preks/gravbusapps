import type { ChatMessage } from '../types/enterpriseAgent'

/** Payload shape persisted in compose_email step_completed / tool_result. */
export interface ComposeEmailOutcomePayload {
  status?: string
  message_id?: string | null
  subject?: string
  to?: Array<{ name?: string; address?: string }>
  error?: string
}

/**
 * Strip the backend's `<!--__envelope__:{json}-->\n` prefix that
 * `ToolResultEnvelope.to_tool_output` prepends to every action-card payload,
 * so the inner JSON can be parsed. Matches the Python regex in
 * prompt-manager/src/agents/deep/tools/result_envelope.py.
 */
const stripEnvelopeMarker = (raw: string): string => raw.replace(/^<!--__envelope__:.*?-->\n?/s, '').trim()

interface ActionCardEmailPayload {
  ui?: { kind?: string }
  card?: {
    title?: string
    status?: { code?: string; label?: string; variant?: string }
  }
  refs?: { message_id?: string; subject?: string }
}

/** Map action_card `status.code` to the legacy compose_email status string. */
const ACTION_CARD_STATUS_MAP: Record<string, string> = {
  COMPLETED: 'sent',
  PENDING: 'drafted',
  FAILED: 'error',
  CANCELLED: 'cancelled'
}

const fromActionCard = (obj: ActionCardEmailPayload): ComposeEmailOutcomePayload | null => {
  if (obj.ui?.kind !== 'action_card') return null
  const code = obj.card?.status?.code
  if (!code) return null
  const status = ACTION_CARD_STATUS_MAP[code] ?? code.toLowerCase()
  return {
    status,
    message_id: obj.refs?.message_id || null,
    subject: obj.card?.title ?? obj.refs?.subject
  }
}

export function parseComposeEmailToolResult(result: unknown): ComposeEmailOutcomePayload | null {
  if (!result) return null
  let obj: unknown = result
  if (typeof result === 'string') {
    const cleaned = stripEnvelopeMarker(result)
    if (!cleaned) return null
    try {
      obj = JSON.parse(cleaned)
    } catch {
      return null
    }
  }
  if (!obj || typeof obj !== 'object') return null
  // New shape: action_card envelope. Normalise to the legacy outcome payload.
  const fromCard = fromActionCard(obj as ActionCardEmailPayload)
  if (fromCard) return fromCard
  // Legacy / live shape: flat `{status, message_id, subject, to, error}`.
  const r = obj as ComposeEmailOutcomePayload
  if (typeof r.status !== 'string') return null
  return r
}

/**
 * After the user submits the composer, the backend appends `tool_result` with
 * `toolName === 'compose_email'`. Use this to show the composer as read-only + collapsed on reload.
 */
export function findComposeEmailOutcomeAfterMessage(
  messages: ChatMessage[],
  structuredInputMessageId: string
): ComposeEmailOutcomePayload | null {
  const idx = messages.findIndex(m => m.id === structuredInputMessageId)
  if (idx < 0) return null
  for (let i = idx + 1; i < messages.length; i++) {
    const m = messages[i]
    if (m.type !== 'tool_result') continue
    const content = m.content as { toolName?: string; result?: unknown }
    if (content.toolName !== 'compose_email') continue
    return parseComposeEmailToolResult(content.result)
  }
  return null
}

const COMPOSE_EMAIL_TOOL_NAMES = new Set(['compose_email', 'builtin.compose_email'])

function isComposeEmailHitlEntry(entry: Record<string, unknown>): boolean {
  if (entry.type === 'structured_input_request') {
    return entry.form_id === 'compose_email'
  }
  if (entry.type !== 'hitl_requested') return false
  const request = entry.request
  if (!request || typeof request !== 'object') return false
  const payload = (request as Record<string, unknown>).payload
  if (!payload || typeof payload !== 'object') return false
  return (payload as Record<string, unknown>).form_id === 'compose_email'
}

/**
 * Workforce runs expose the raw session trace (not chat messages). After the
 * operator submits the composer, prompt-manager appends a `step_completed`
 * row for `compose_email` with JSON `output`.
 */
export function findComposeEmailOutcomeInTrace(
  trace: readonly Record<string, unknown>[] | undefined
): ComposeEmailOutcomePayload | null {
  if (!trace || trace.length === 0) return null

  let sawComposeHitl = false
  for (const entry of trace) {
    if (isComposeEmailHitlEntry(entry)) {
      sawComposeHitl = true
      continue
    }
    if (!sawComposeHitl) continue
    if (entry.type !== 'step_completed') continue
    const name = typeof entry.name === 'string' ? entry.name : ''
    if (!COMPOSE_EMAIL_TOOL_NAMES.has(name)) continue
    const outcome = parseComposeEmailToolResult(entry.output ?? entry.result)
    if (outcome) return outcome
  }

  for (let i = trace.length - 1; i >= 0; i -= 1) {
    const entry = trace[i]
    if (entry.type !== 'step_completed') continue
    const name = typeof entry.name === 'string' ? entry.name : ''
    if (!COMPOSE_EMAIL_TOOL_NAMES.has(name)) continue
    const outcome = parseComposeEmailToolResult(entry.output ?? entry.result)
    if (outcome) return outcome
  }

  return null
}
