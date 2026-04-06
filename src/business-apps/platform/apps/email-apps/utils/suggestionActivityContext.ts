/**
 * Build AppAction contextData for “create from AI suggestion” flows (manual CRM activity pattern).
 *
 * Optional backend / contract (summarizer output): for Blink and flow_engine quick tasks, prefer
 * `metadata.assigneeUserId` (or `assignedUserId` / comma-separated `assigneeUserIds`) so the client
 * does not rely on directory search from free-text `assignee`. For richer Blink inbox links, emit
 * `metadata.entityType`, `entityId`, `entityName`, and a stable `entityDisplayUrl` (e.g. deep link
 * to this message in the email app) — see `parseAssigneeUserIdsFromMetadata` and quick-task entity
 * fields in `EmailSuggestionCreateAction`.
 */

import type { EmailSummarizeSuggestion, EmailMessage } from '../types'

export function buildSuggestionActivityContextData(
  suggestion: EmailSummarizeSuggestion,
  message: EmailMessage,
  noSubjectLabel: string,
  threadId?: string
): Record<string, unknown> {
  const meta =
    suggestion.metadata && Object.keys(suggestion.metadata).length > 0
      ? Object.entries(suggestion.metadata)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      : ''

  const descriptionParts = [suggestion.details, suggestion.evidence, meta].filter(
    (p): p is string => typeof p === 'string' && p.length > 0
  )

  return {
    title: suggestion.title || message.subject || noSubjectLabel,
    description:
      descriptionParts.length > 0 ? descriptionParts.join('\n\n') : message.textBody || message.snippet || '',
    occurredAt: message.date,
    emailActivityTypeHint: 'EMAIL',
    source: 'email',
    emailMessageId: message.id,
    ...(threadId ? { emailThreadId: threadId } : {})
  }
}

/** Minimum confidence (0–1) to show primary “Create” actions; omit shows CTAs when confidence missing */
export const SUGGESTION_CONFIDENCE_PRIMARY_THRESHOLD = 0.35

export function isSuggestionConfidentEnough(suggestion: EmailSummarizeSuggestion): boolean {
  if (suggestion.confidence === undefined || suggestion.confidence === null) return true
  if (!Number.isFinite(suggestion.confidence)) return true
  const c = suggestion.confidence > 1 ? suggestion.confidence / 100 : suggestion.confidence
  return c >= SUGGESTION_CONFIDENCE_PRIMARY_THRESHOLD
}
