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
