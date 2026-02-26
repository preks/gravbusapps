/**
 * Shared value-to-string helpers for analytics tables and exports.
 * Avoids duplicated logic and ensures safe stringification (no '[object Object]').
 */

const NULLISH_PLACEHOLDER = '-'

/**
 * Converts any value to a display string. Uses JSON for objects to avoid '[object Object]'.
 */
export function toDisplayString(value: unknown): string {
  if (value === null || value === undefined) return NULLISH_PLACEHOLDER
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'symbol') return value.toString()
  if (value !== null && typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return NULLISH_PLACEHOLDER
    }
  }
  if (typeof value === 'object' && value !== null) return NULLISH_PLACEHOLDER
  return String(value)
}

/**
 * Formats a cell value for table display. Numbers are formatted with locale (e.g. 1,234.56).
 */
export function formatTableCell(value: unknown, locale: string): string {
  if (value === null || value === undefined) return NULLISH_PLACEHOLDER
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  return toDisplayString(value)
}

/** Matches YYYY-MM (e.g. 2024-01). */
const YYYY_MM_REGEX = /^\d{4}-\d{2}$/

/**
 * Formats a month string (YYYY-MM) for display like "Feb 2024".
 * Uses locale for month name. Returns the original string if not YYYY-MM.
 */
export function formatMonthPeriod(ym: string, locale: string): string {
  if (typeof ym !== 'string' || !YYYY_MM_REGEX.test(ym.trim())) return ym
  const date = new Date(ym.trim() + '-01')
  if (Number.isNaN(date.getTime())) return ym
  return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' })
}
