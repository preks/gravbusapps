/** Currency-style rounding (2 decimals). */
export function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Pool amount from % of baseline (same as company budget). */
export function amountFromPercent(percent: number, baseline: number): number {
  if (!Number.isFinite(baseline) || baseline <= 0) return 0
  return roundMoney2((baseline * percent) / 100)
}

/** Percent from annual amount vs baseline. */
export function percentFromAmount(amount: number, baseline: number): number {
  if (!Number.isFinite(baseline) || baseline <= 0) return 0
  return roundMoney2((amount / baseline) * 100)
}

/**
 * Matches DB / save: only one of amount or percent is non-zero
 * (same pattern as `buildCompanyBudgetChanges`).
 */
export function deriveExclusiveAmountPercent(amount: number, percent: number): { amount: number; percent: number } {
  if (Math.abs(percent) > 1e-9) {
    return { amount: 0, percent: roundMoney2(percent) }
  }
  return { amount: roundMoney2(amount), percent: 0 }
}
