export function formatShareOfTotal(part: number, total: number): string {
  if (total <= 0 || !Number.isFinite(part) || !Number.isFinite(total)) {
    return '—'
  }
  return `${((100 * part) / total).toFixed(1)}%`
}

export function formatPercentOfPool(part: number, pool: number | null): string | null {
  if (pool == null || pool <= 0 || !Number.isFinite(part) || !Number.isFinite(pool)) {
    return null
  }
  return ((100 * part) / pool).toFixed(1)
}

export function formatPerformanceScoreValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '—'
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

/** Percentage points of the salary increase pool (e.g. 12.34); aligns with company budget distribute dialog. */
export function percentPointsOfPool(amount: number, pool: number): number | null {
  if (pool <= 0 || !Number.isFinite(amount) || !Number.isFinite(pool)) {
    return null
  }
  return Math.round((10000 * amount) / pool) / 100
}
