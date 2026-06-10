export const SUBMITTING_FORM_MESSAGE = 'Submitting form data...'
export const CLARIFICATION_RESPONSE_MESSAGE = 'Answers sent'
export const CLARIFICATION_CANCEL_MESSAGE = 'Questions skipped'

const NON_RESTORABLE_USER_DISPLAY_MESSAGES = new Set([
  SUBMITTING_FORM_MESSAGE,
  CLARIFICATION_RESPONSE_MESSAGE,
  CLARIFICATION_CANCEL_MESSAGE
])

type StructuredUserAction = 'form_submission' | 'clarification_response' | 'clarification_cancel' | (string & {})

interface StructuredUserPayload {
  action?: StructuredUserAction
  userMessage?: string
  uuid?: string
}

/**
 * Maps structured EveryAI user payloads (form submissions, clarification
 * responses, etc.) to the short label shown in the chat bubble.
 */
export function resolveUserMessageDisplayText(text: string): string {
  if (!text) return text

  try {
    const parsed = JSON.parse(text) as StructuredUserPayload
    if (!parsed || typeof parsed !== 'object') return text

    if (typeof parsed.userMessage === 'string' && parsed.userMessage.trim().length > 0) {
      return parsed.userMessage
    }

    if (parsed.action === 'form_submission') {
      return SUBMITTING_FORM_MESSAGE
    }

    if (parsed.action === 'clarification_response') {
      return CLARIFICATION_RESPONSE_MESSAGE
    }

    if (parsed.action === 'clarification_cancel') {
      return CLARIFICATION_CANCEL_MESSAGE
    }
  } catch {
    // Plain text message
  }

  return text
}

export function isNonRestorableUserDisplayMessage(text: string | null | undefined): boolean {
  if (!text) return false
  return NON_RESTORABLE_USER_DISPLAY_MESSAGES.has(text)
}
