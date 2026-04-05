/** Flat currency display until per-row currency is aggregated separately. */
export function formatFlatCurrencyAmount(value: number | null | undefined, currencyCode = 'EUR'): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

/** Portfolio-level P&L from summed market value minus summed cost basis. */
export function computePortfolioPerformanceFromSums(
  totalInvestmentAmount: number | null,
  investmentMarketValue: number | null
): { amount: number; percent: number | null } {
  const cost = totalInvestmentAmount ?? 0
  const amount = (investmentMarketValue ?? 0) - cost
  const percent = cost > 0 ? (amount / cost) * 100 : null
  return { amount, percent }
}
