import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'

export type DateRange = [Date | null, Date | null] | null
export type DateRangeSetter = (range: DateRange) => void

export function formatDateRangeForChip(range: DateRange | undefined): string | null {
  if (!range?.[0] && !range?.[1]) return null
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
  const fmt = (d: Date | null | undefined) => (d ? d.toLocaleDateString('en-GB', opts) : '')
  return range[0] && range[1] ? `${fmt(range[0])} – ${fmt(range[1])}` : fmt(range[0]) || fmt(range[1])
}

export function applyDateRangeFromFilter(raw: unknown, setter: DateRangeSetter | undefined): boolean {
  if (!setter) return false
  const isDisplayString = typeof raw === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(raw) && !raw.includes(',')
  if (isDisplayString) return false
  const fromTo =
    typeof raw === 'object' &&
    raw != null &&
    !Array.isArray(raw) &&
    ((raw as Record<string, unknown>).from != null || (raw as Record<string, unknown>).to != null)
      ? [(raw as Record<string, unknown>).from, (raw as Record<string, unknown>).to].filter(Boolean).join(',')
      : (raw as string)
  const normalized = normalizeDateRange(raw == null ? undefined : fromTo)
  if (normalized && (normalized.from || normalized.to)) {
    setter([normalized.from ? new Date(normalized.from) : null, normalized.to ? new Date(normalized.to) : null])
    return true
  }
  setter(null)
  return false
}
