import type { EmailSummarizeSuggestion } from '../types'

export function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h
}

/** Stable React list item key from suggestion fields (no array index). */
export function stableEmailSuggestionKey(s: EmailSummarizeSuggestion): string {
  return [
    s.type,
    s.title,
    s.messageIndex ?? 'x',
    String(hashString(s.details ?? '')),
    String(hashString(s.evidence ?? '')),
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
