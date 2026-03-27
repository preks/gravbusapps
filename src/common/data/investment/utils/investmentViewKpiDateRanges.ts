/**
 * UTC calendar boundaries for Investment View KPIs (new this quarter / new this year).
 */

export interface UtcCalendarBoundaries {
  currentQuarterStart: string
  currentQuarterEndExclusive: string
  previousQuarterStart: string
  previousQuarterEndExclusive: string
  currentYearStart: string
  currentYearEndExclusive: string
  previousYearStart: string
  previousYearEndExclusive: string
}

/** @param now - Reference instant (defaults to now). Use for tests. */
export function getUtcCalendarBoundaries(now: Date = new Date()): UtcCalendarBoundaries {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const qStartMonth = Math.floor(m / 3) * 3

  const currentQuarterStart = new Date(Date.UTC(y, qStartMonth, 1, 0, 0, 0, 0))
  const nextQuarterStart = new Date(Date.UTC(y, qStartMonth + 3, 1, 0, 0, 0, 0))

  const prevQuarterStart = new Date(currentQuarterStart)
  prevQuarterStart.setUTCMonth(prevQuarterStart.getUTCMonth() - 3)

  const currentYearStart = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0))
  const nextYearStart = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0, 0))
  const previousYearStart = new Date(Date.UTC(y - 1, 0, 1, 0, 0, 0, 0))

  return {
    currentQuarterStart: currentQuarterStart.toISOString(),
    currentQuarterEndExclusive: nextQuarterStart.toISOString(),
    previousQuarterStart: prevQuarterStart.toISOString(),
    previousQuarterEndExclusive: currentQuarterStart.toISOString(),
    currentYearStart: currentYearStart.toISOString(),
    currentYearEndExclusive: nextYearStart.toISOString(),
    previousYearStart: previousYearStart.toISOString(),
    previousYearEndExclusive: currentYearStart.toISOString()
  }
}
