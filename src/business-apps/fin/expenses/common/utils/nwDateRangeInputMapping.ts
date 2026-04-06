import type { DateRange } from './dateRangeFilterUtils'

export function formatLocalYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseLocalYmdToDate(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!match) return null
  const y = Number(match[1])
  const mo = Number(match[2])
  const d = Number(match[3])
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date
}

export function dateRangeToNwDateInputValue(
  dateRange: DateRange | null | undefined
): [string | null, string | null] | null {
  if (!dateRange) return null
  const [start, end] = dateRange
  if (!start && !end) return null
  return [start ? formatLocalYmd(start) : null, end ? formatLocalYmd(end) : null]
}

export function nwDateInputValueToDateRange(raw: string | [string | null, string | null] | null): DateRange {
  if (raw === null) return null
  if (typeof raw === 'string') return null
  const [startStr, endStr] = raw
  if (!startStr?.trim() && !endStr?.trim()) return null
  const startDate = startStr?.trim() ? parseLocalYmdToDate(startStr) : null
  const endDate = endStr?.trim() ? parseLocalYmdToDate(endStr) : null
  return [startDate, endDate]
}
