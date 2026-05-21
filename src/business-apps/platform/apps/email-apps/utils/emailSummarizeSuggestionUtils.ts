import type { EmailSummarizeSuggestion } from '../types'

/** Sorted metadata key=value pairs for stable React keys */
export function serializeMetadataForStableKey(metadata: Record<string, string> | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) return ''
  return Object.keys(metadata)
    .sort((a, b) => a.localeCompare(b))
    .map(k => `${k}=${metadata[k]}`)
    .join('|')
}

export function hashString(str: string): number {
  let h = 0
  for (const char of str) {
    const codePoint = char.codePointAt(0) ?? 0
    h = Math.trunc(Math.imul(31, h) + codePoint)
  }
  return h
}

/** Stable React list item key from suggestion fields (no array index). */
export function stableEmailSuggestionKey(s: EmailSummarizeSuggestion): string {
  return [
    s.type,
    s.title,
    s.messageIndex ?? 'x',
    s.integrationTarget ?? '',
    serializeMetadataForStableKey(s.metadata),
    String(hashString(s.details ?? '')),
    String(hashString(s.evidence ?? '')),
    s.explicit === undefined ? '' : String(s.explicit),
    s.importantDates?.join('~') ?? '',
    s.openQuestions?.join('~') ?? '',
    s.dueAt ?? '',
    s.startAt ?? '',
    s.endAt ?? '',
    s.assignee ?? ''
  ].join('|')
}

export function stableKeyPointKey(point: string): string {
  return `kp-${hashString(point)}-${point.slice(0, 48)}`
}

/** Format model confidence for display (0–1 or percent). */
export function formatSuggestionConfidence(confidence: number): string {
  if (confidence > 0 && confidence <= 1) {
    return `${Math.round(confidence * 100)}%`
  }
  if (confidence > 1 && confidence <= 100) {
    return `${Math.round(confidence)}%`
  }
  return String(confidence)
}
