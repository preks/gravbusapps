/**
 * Bidirectional formatting: form shows human-friendly text; catalog `objectValue` uses JSON-style keys/values.
 */

function titleCaseWord(word: string): string {
  if (!word) return ''
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/** Canonical JSON key: lowercase snake_case (spaces → underscores, strip invalid chars). */
export function displayToJsonKey(s: string): string {
  return s.trim().replace(/\s+/g, '_').replace(/\W/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase()
}

/** Human-readable key for inputs (e.g. annual_revenue → Annual Revenue). */
export function jsonToDisplayKey(s: string): string {
  const t = s.trim()
  if (!t) return ''
  return t.split('_').filter(Boolean).map(titleCaseWord).join(' ')
}

/** Canonical string value: trimmed, lowercased per line (newlines preserved). */
export function displayToJsonValue(s: string): string {
  return s
    .trim()
    .split('\n')
    .map(line => line.trim().toLowerCase())
    .join('\n')
    .trim()
}

/** Human-readable string for inputs (title-case words per line). */
export function jsonToDisplayValue(s: string): string {
  const t = s.trim()
  if (!t) return ''
  return t
    .split('\n')
    .map(line => line.trim().split(/\s+/).filter(Boolean).map(titleCaseWord).join(' '))
    .join('\n')
    .trim()
}
