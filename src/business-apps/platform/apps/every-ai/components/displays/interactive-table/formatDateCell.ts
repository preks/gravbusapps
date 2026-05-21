import { formatDate } from '@/common/utils/windowUtils'

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/

/** True when the timestamp is a date-only value stored as midnight (e.g. closeDate). */
function isDateOnlyMidnight(raw: string, date: Date): boolean {
  if (ISO_DATE_ONLY.test(raw.trim())) {
    return true
  }
  if (/T00:00:00(\.0+)?(Z)?$/i.test(raw.trim())) {
    return true
  }
  return date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0
}

function parseToDate(raw: string): Date | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

/**
 * Format GraphQL ISO date/datetime strings for table cells (e.g. closeDate, updatedAt).
 */
export function formatDateCell(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return '—'
  }

  const date = parseToDate(trimmed)
  if (!date) {
    return trimmed
  }

  const dateOnly = isDateOnlyMidnight(trimmed, date)
  const formatKey = dateOnly ? 'date.medium' : 'datetime.short'
  const formatted = formatDate(date, formatKey)
  if (formatted) {
    return formatted
  }

  const locale = undefined
  if (dateOnly) {
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
  }
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

export function sortKeyForDateCell(raw: string): number {
  const parsed = parseToDate(raw)
  return parsed ? parsed.getTime() : 0
}

export function isIsoDateLike(raw: unknown): boolean {
  if (typeof raw !== 'string') {
    return false
  }
  return ISO_DATE_ONLY.test(raw.trim()) || ISO_DATETIME.test(raw.trim())
}
