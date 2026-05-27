export function formatShareOfTotalSalary(part: number, total: number): string {
  if (total <= 0 || !Number.isFinite(part) || !Number.isFinite(total)) {
    return '—'
  }
  return `${((100 * part) / total).toFixed(1)}%`
}

/** Percent of the salary increase pool for this row’s preview allocation; null when the pool is missing or zero. */
export function formatPercentOfPool(part: number, pool: number | null): string | null {
  if (pool == null || pool <= 0 || !Number.isFinite(part) || !Number.isFinite(pool)) {
    return null
  }
  return ((100 * part) / pool).toFixed(1)
}

export function formatPerformanceScoreSum(value: number): string {
  if (!Number.isFinite(value)) {
    return '—'
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
