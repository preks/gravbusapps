import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type CurrencyStat = { ref: string; code: string; count: number }

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

export function buildDefaultEmptyMessage(noDataKey: string, noDataDefault: string): string {
  return getTranslationFromI18nKeyAndLabel(noDataKey, noDataDefault)
}
