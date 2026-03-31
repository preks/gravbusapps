import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'

export function rawDateRangeToNormalizable(rawDateRange: unknown): string | string[] | null | undefined {
  if (rawDateRange == null) return undefined
  const isObjectWithFromOrTo =
    typeof rawDateRange === 'object' && !Array.isArray(rawDateRange) && ('from' in rawDateRange || 'to' in rawDateRange)
  if (isObjectWithFromOrTo) {
    const obj = rawDateRange as { from?: unknown; to?: unknown }
    return [obj?.from, obj?.to].filter(Boolean).join(',')
  }
  if (typeof rawDateRange === 'string' || Array.isArray(rawDateRange)) return rawDateRange
  return undefined
}

export function applyExpenseDateRangeFromFilters(
  rawDateRange: unknown,
  setExpenseDateRange: (range: [Date | null, Date | null] | null) => void
): void {
  const isDisplayString =
    typeof rawDateRange === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(rawDateRange) && !rawDateRange.includes(',')
  if (isDisplayString) return
  const raw = rawDateRangeToNormalizable(rawDateRange)
  const normalized = normalizeDateRange(raw)
  if (normalized && (normalized.from || normalized.to)) {
    setExpenseDateRange([
      normalized.from ? new Date(normalized.from) : null,
      normalized.to ? new Date(normalized.to) : null
    ])
  } else {
    setExpenseDateRange(null)
  }
}

export function applyAmountRangeFromFilters(
  amt: { min?: number; max?: number } | undefined,
  setAmountRange: (range: { min?: number; max?: number } | null) => void
): void {
  if (amt && (amt.min !== undefined || amt.max !== undefined)) {
    setAmountRange({ min: amt.min, max: amt.max })
  } else {
    setAmountRange(null)
  }
}

export function buildExpenseItemsFiltersObject(
  allSelectedFilters: string[],
  expenseDateRange: [Date | null, Date | null] | null | undefined,
  amountRange: { min?: number; max?: number } | null | undefined,
  availableStatuses: string[]
): Record<string, unknown> {
  const statusIds = allSelectedFilters.filter(f => availableStatuses.map(s => s.toLowerCase()).includes(f))
  const obj: Record<string, unknown> = {}
  if (statusIds.length > 0) obj.statusIds = statusIds
  if (expenseDateRange?.[0] || expenseDateRange?.[1]) {
    const from = expenseDateRange[0]
    const to = expenseDateRange[1]
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
    const fmt = (d: Date | null | undefined) => (d ? d.toLocaleDateString('en-GB', opts) : '')
    obj.expenseDateRange = from && to ? `${fmt(from)} – ${fmt(to)}` : fmt(from) || fmt(to)
  }
  if (amountRange && (amountRange.min !== undefined || amountRange.max !== undefined)) {
    obj.amount = { ...amountRange }
  }
  return obj
}
