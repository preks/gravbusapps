export const DEFAULT_CURRENCY_REF = 'Currency:v1:EUR'

export const getSelectedCurrencyRef = (
  selectedFilters: string[],
  fallbackRef: string = DEFAULT_CURRENCY_REF
): string => {
  const token = selectedFilters.find(f => f.startsWith('currency:'))
  return token ? token.substring('currency:'.length) : fallbackRef
}

export const extractCurrencyCodeFromItems = (
  items: Array<{ currency?: { code?: string } }>,
  fallbackCode: string = 'EUR'
): string => {
  const code = items?.find(it => it?.currency?.code)?.currency?.code as string | undefined
  return code || fallbackCode
}

export interface CurrencyLikeRow {
  currencyRef?: string | null
  currency?: { code?: string | null } | null
}

export interface CurrencyStat {
  ref: string
  code: string
  count: number
}

export const aggregateCurrencyStats = (
  rows: CurrencyLikeRow[],
  options?: { fallbackRef?: string; fallbackCode?: string }
): CurrencyStat[] => {
  const fallbackRef = options?.fallbackRef || DEFAULT_CURRENCY_REF
  const fallbackCode = options?.fallbackCode || 'EUR'
  const counts = new Map<string, CurrencyStat>()
  rows.forEach(r => {
    const ref = r?.currencyRef || fallbackRef
    const code = r?.currency?.code || fallbackCode
    const existing = counts.get(ref) || { ref, code, count: 0 }
    existing.count += 1
    counts.set(ref, existing)
  })
  return Array.from(counts.values()).sort((a, b) => b.count - a.count)
}

export const pickMostUsedCurrencyRef = (stats: CurrencyStat[], fallbackRef: string = DEFAULT_CURRENCY_REF): string => {
  if (!stats || stats.length === 0) return fallbackRef
  return stats[0].ref || fallbackRef
}
