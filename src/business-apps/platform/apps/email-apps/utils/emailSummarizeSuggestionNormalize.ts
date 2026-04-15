/**
 * Tolerant normalization of AI suggestion payloads (older APIs, partial objects).
 */

import type { EmailSummarizeSuggestion, MessageSummaryResult, ThreadSummaryResult } from '../types'

function asObject(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null
  }
  return raw as Record<string, unknown>
}

function getTrimmedString(v: unknown): string | undefined {
  if (typeof v !== 'string') {
    return undefined
  }
  const trimmed = v.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function getFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const valueAsString = getTrimmedString(v)
  if (!valueAsString) return undefined
  const parsedValue = Number(valueAsString)
  return Number.isFinite(parsedValue) ? parsedValue : undefined
}

function getInteger(v: unknown): number | undefined {
  const parsed = getFiniteNumber(v)
  if (parsed === undefined || !Number.isInteger(parsed)) {
    return undefined
  }
  return parsed
}

function normalizeMetadata(raw: unknown): Record<string, string> | undefined {
  const objectValue = asObject(raw)
  if (!objectValue) return undefined

  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(objectValue)) {
    if (value === null || value === undefined) continue
    const stringValue = getTrimmedString(value)
    if (stringValue) {
      out[key] = stringValue
      continue
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = String(value)
    }
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function applyOptionalStringField(
  suggestion: EmailSummarizeSuggestion,
  key: keyof Pick<
    EmailSummarizeSuggestion,
    'details' | 'assignee' | 'dueAt' | 'startAt' | 'endAt' | 'integrationTarget'
  >,
  value: unknown
): void {
  const trimmedValue = getTrimmedString(value)
  if (trimmedValue) {
    suggestion[key] = trimmedValue
  }
}

/** Parse one suggestion object; returns null if not representable */
export function normalizeEmailSummarizeSuggestion(raw: unknown): EmailSummarizeSuggestion | null {
  const value = asObject(raw)
  if (!value) return null

  const title = getTrimmedString(value.title)
  if (!title) return null

  const type = getTrimmedString(value.type) ?? 'task'
  const suggestion: EmailSummarizeSuggestion = { type, title }

  applyOptionalStringField(suggestion, 'details', value.details)
  applyOptionalStringField(suggestion, 'assignee', value.assignee)
  applyOptionalStringField(suggestion, 'dueAt', value.dueAt)
  applyOptionalStringField(suggestion, 'startAt', value.startAt)
  applyOptionalStringField(suggestion, 'endAt', value.endAt)
  applyOptionalStringField(suggestion, 'integrationTarget', value.integrationTarget)

  const confidence = getFiniteNumber(value.confidence)
  if (confidence !== undefined) {
    suggestion.confidence = confidence
  }

  const evidence = getTrimmedString(value.evidence)
  if (evidence) {
    suggestion.evidence = evidence
  }

  const messageIndex = getInteger(value.messageIndex)
  if (messageIndex !== undefined) {
    suggestion.messageIndex = messageIndex
  }

  const metadata = normalizeMetadata(value.metadata)
  if (metadata) {
    suggestion.metadata = metadata
  }

  return suggestion
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
