import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type DateRange = [Date | null, Date | null] | null
export type DateRangeSetter = (range: DateRange) => void
export type CurrencyStat = { ref: string; code: string; count: number }

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
    ((raw as any).from != null || (raw as any).to != null)
      ? [(raw as any).from, (raw as any).to].filter(Boolean).join(',')
      : (raw as string)
  const normalized = normalizeDateRange(raw == null ? undefined : fromTo)
  if (normalized && (normalized.from || normalized.to)) {
    setter([normalized.from ? new Date(normalized.from) : null, normalized.to ? new Date(normalized.to) : null])
    return true
  }
  setter(null)
  return false
}

export function resolveSelectedCurrencyCode(
  selectedFilters: string[],
  currencyStats: Array<{ ref: string; code: string }>
): string {
  const token = selectedFilters.find(f => f.startsWith('currency:'))
  if (!token) return 'ALL'
  const ref = token.substring('currency:'.length)
  return currencyStats.find(cs => cs.ref === ref)?.code ?? 'ALL'
}

export function applyCurrencyChange(
  code: string,
  selectedFilters: string[],
  currencyStats: CurrencyStat[],
  setFilters: (filters: string[]) => void
): void {
  const withoutCurrency = selectedFilters.filter(f => !f.startsWith('currency:'))
  if (code === 'ALL') {
    setFilters(withoutCurrency)
  } else {
    const cs = currencyStats.find(c => c.code === code)
    if (cs) setFilters([...withoutCurrency, `currency:${cs.ref}`])
  }
}

export function buildEmptyMessage(hasActiveFilters: boolean, noDataKey: string, noDataDefault: string): string {
  return hasActiveFilters
    ? getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data available')
    : getTranslationFromI18nKeyAndLabel(noDataKey, noDataDefault)
}
