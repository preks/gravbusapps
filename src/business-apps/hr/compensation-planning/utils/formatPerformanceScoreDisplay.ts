export function formatPerformanceScoreDisplay(value: number): string {
  if (!Number.isFinite(value)) {
    return ''
  }
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 10,
    minimumFractionDigits: 0,
    useGrouping: false
  }).format(value)
}
