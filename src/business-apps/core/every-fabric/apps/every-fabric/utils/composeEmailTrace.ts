import type { ChatMessage } from '../types/enterpriseAgent'

/** Payload shape persisted in compose_email step_completed / tool_result. */
export interface ComposeEmailOutcomePayload {
  status?: string
  message_id?: string | null
  subject?: string
  to?: Array<{ name?: string; address?: string }>
  error?: string
}

export function parseComposeEmailToolResult(result: unknown): ComposeEmailOutcomePayload | null {
  if (!result) return null
  let obj: unknown = result
  if (typeof result === 'string') {
    try {
      obj = JSON.parse(result)
    } catch {
      return null
    }
  }
  if (!obj || typeof obj !== 'object') return null
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
