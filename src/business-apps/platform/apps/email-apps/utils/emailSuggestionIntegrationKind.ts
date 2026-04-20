/**
 * Maps summarizer integrationTarget values to UI/create flows.
 */

import type { EmailSummarizeIntegrationTarget, EmailSummarizeSuggestion } from '../types'

export type EmailSuggestionIntegrationKind = 'quickTask' | 'crm' | 'calendarStub'

export function normalizeSuggestionIntegrationTarget(raw: string | undefined): string {
  return (raw || 'generic').trim().toLowerCase().replace(/-/g, '_')
}

export function resolveSuggestionIntegrationKind(
  integrationTarget: EmailSummarizeIntegrationTarget | undefined
): EmailSuggestionIntegrationKind {
  const t = normalizeSuggestionIntegrationTarget(typeof integrationTarget === 'string' ? integrationTarget : undefined)
  if (t === 'blink' || t === 'flow_engine') return 'quickTask'
  if (t === 'calendar') return 'calendarStub'
  return 'crm'
}

/** User IDs accepted from suggestion.metadata when the backend resolves assignees (see suggestionActivityContext backend-contract note). */
export function parseAssigneeUserIdsFromMetadata(metadata: EmailSummarizeSuggestion['metadata']): string[] {
  if (!metadata || typeof metadata !== 'object') return []
  const out: string[] = []
  const add = (raw: string | undefined) => {
    const s = (raw || '').trim()
    if (!s) return
    out.push(s)
  }
  add(metadata.assigneeUserId)
  add(metadata.assignedUserId)
  const multi = metadata.assigneeUserIds
  if (multi && typeof multi === 'string') {
    for (const part of multi.split(',')) add(part)
  }
  return [...new Set(out)]
}
