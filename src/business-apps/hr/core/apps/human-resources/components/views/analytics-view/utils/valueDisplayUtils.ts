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
