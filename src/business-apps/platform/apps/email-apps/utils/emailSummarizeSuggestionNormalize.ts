/**
 * Tolerant normalization of AI suggestion payloads (older APIs, partial objects).
 */

import type { EmailSummarizeSuggestion, MessageSummaryResult, ThreadSummaryResult } from '../types'

function normalizeMetadata(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: Record<string, string> = {}
  for (const [key, v] of Object.entries(raw)) {
    if (v == null) continue
    if (typeof v === 'string') out[key] = v
    else if (typeof v === 'number' || typeof v === 'boolean') out[key] = String(v)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function toFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

/** Parse one suggestion object; returns null if not representable */
export function normalizeEmailSummarizeSuggestion(raw: unknown): EmailSummarizeSuggestion | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  if (!title) return null

  const typeRaw = o.type
  const type = typeof typeRaw === 'string' && typeRaw.trim() ? typeRaw.trim() : 'task'

  const integrationRaw = o.integrationTarget
  const integrationTarget =
    typeof integrationRaw === 'string' && integrationRaw.trim() ? integrationRaw.trim() : undefined

  const meta = normalizeMetadata(o.metadata)

  return {
    type,
    title,
    ...(typeof o.details === 'string' && o.details.trim() ? { details: o.details.trim() } : {}),
    ...(typeof o.assignee === 'string' && o.assignee.trim() ? { assignee: o.assignee.trim() } : {}),
    ...(typeof o.dueAt === 'string' && o.dueAt.trim() ? { dueAt: o.dueAt.trim() } : {}),
    ...(typeof o.startAt === 'string' && o.startAt.trim() ? { startAt: o.startAt.trim() } : {}),
    ...(typeof o.endAt === 'string' && o.endAt.trim() ? { endAt: o.endAt.trim() } : {}),
    ...(() => {
      const c = toFiniteNumber(o.confidence)
      return c !== undefined ? { confidence: c } : {}
    })(),
    ...(typeof o.evidence === 'string' && o.evidence.trim() ? { evidence: o.evidence.trim() } : {}),
    ...(() => {
      const mi = toFiniteNumber(o.messageIndex)
      return mi !== undefined && Number.isInteger(mi) ? { messageIndex: mi } : {}
    })(),
    ...(integrationTarget ? { integrationTarget } : {}),
    ...(meta ? { metadata: meta } : {})
  }
}

export function normalizeSuggestionsArray(raw: unknown): EmailSummarizeSuggestion[] {
  if (!Array.isArray(raw)) return []
  const out: EmailSummarizeSuggestion[] = []
  for (const item of raw) {
    const s = normalizeEmailSummarizeSuggestion(item)
    if (s) out.push(s)
  }
  return out
}

export function normalizeMessageSummaryResult(raw: unknown): MessageSummaryResult {
  if (!raw || typeof raw !== 'object') {
    return { summary: '', suggestions: [] }
  }
  const o = raw as Record<string, unknown>
  const summary = typeof o.summary === 'string' ? o.summary : ''
  return {
    summary,
    suggestions: normalizeSuggestionsArray(o.suggestions)
  }
}

export function normalizeThreadSummaryResultSuggestions(result: ThreadSummaryResult): ThreadSummaryResult {
  return {
    ...result,
    suggestions: normalizeSuggestionsArray(result.suggestions)
  }
}
