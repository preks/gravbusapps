import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

// Use UTC to prevent timezone conversion (9999-12-31 UTC becoming 10000-01-01 in local time)
dayjs.extend(utc)

/**
 * Normalizes a date string to YYYY-MM-DD (date-only) format.
 * Handles common DateInput formats and backend ISO strings.
 */
const normalizeDateString = (dateStr: string): string => {
  const trimmed = dateStr.trim()

  // ISO-ish strings: always preserve the calendar date part (YYYY-MM-DD)
  // because these fields are date-only semantics across expense-settings.
  // This prevents timezone offsets (e.g. ...T22:00:00+00:00) from shifting
  // the displayed/edited date.
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  // DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('.')
    return `${year}-${month}-${day}`
  }

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/')
    return `${year}-${month}-${day}`
  }

  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('-')
    return `${year}-${month}-${day}`
  }

  // Fallback for ISO strings or other parseable formats
  // CRITICAL: Never use dayjs parsing for far-future dates like 9999-12-31
  // because it can overflow to 10000-01-01 in local timezone.
  // If we reach here, return the trimmed string as-is (safer than parsing)
  return trimmed
}

/**
 * Formats a date string for input fields (YYYY-MM-DD format)
 * Handles ISO strings, date-only strings, and undefined/null values
 * Uses UTC to prevent timezone-related date shifts
 *
 * @param dateStr - Date string in various formats or undefined
 * @returns Formatted date string (YYYY-MM-DD) or undefined
 */
export const formatDateForInput = (dateStr?: string): string | undefined => {
  if (!dateStr) return undefined
  const normalized = normalizeDateString(dateStr)
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined
}

/**
 * Formats a date string for display (DD.MM.YYYY format)
 * Single source of truth for date display formatting across all tabs
 * Uses UTC to prevent timezone-related date shifts
 *
 * @param dateString - Date string in various formats
 * @returns Formatted date string (DD.MM.YYYY) or empty string if invalid
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  const normalized = normalizeDateString(dateString)
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [yyyy, mm, dd] = normalized.split('-')
    return `${dd}.${mm}.${yyyy}`
  }

  // Fallback: If normalization fails, return empty string (safer than parsing)
  // NEVER use dayjs parsing here as it can cause 9999-12-31 -> 10000-01-01
  return ''
}

/**
 * Normalizes DateInput output into YYYY-MM-DD (date-only).
 * Handles:
 * - string (YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY, ISO)
 * - Date
 * - [string|null, string|null] (range pickers)
 */
export const normalizeDateInputValue = (value?: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined

  if (Array.isArray(value)) {
    return normalizeDateInputValue(value[0] ?? undefined)
  }

  if (value instanceof Date) {
    // Treat as a date-only selection: keep the local calendar date the user picked
    return dayjs(value).format('YYYY-MM-DD')
  }

  if (typeof value === 'string') {
    const normalized = normalizeDateString(value)
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined
  }

  // dayjs objects

  if (dayjs.isDayjs(value as any)) {
    return (value as any).format('YYYY-MM-DD')
  }

  return undefined
}

/**
 * Converts a DateInput value to ISO with start of day (00:00:00.000Z).
 * Use for activeFrom/validFrom.
 */
export const toISOStartOfDay = (value?: unknown): string | undefined => {
  const normalized = normalizeDateInputValue(value)
  if (!normalized) return undefined
  return dayjs.utc(normalized).startOf('day').toISOString()
}

/**
 * Converts a DateInput value to ISO with end of day (23:59:59.999Z).
 * Use for activeTo/validTo.
 */
export const toISOEndOfDay = (value?: unknown): string | undefined => {
  const normalized = normalizeDateInputValue(value)
  if (!normalized) return undefined
  return dayjs.utc(normalized).endOf('day').toISOString()
}
