/**
 * Small helpers for UTC date range handling in backoffice absences.
 */

/**
 * Converts YYYY-MM-DD start/end into UTC ISO strings covering that full day range.
 */
export const toUtcDayRangeISO = (
  startYmd?: string | null,
  endYmd?: string | null
): { startIso?: string; endIso?: string } => {
  let startIso: string | undefined
  let endIso: string | undefined
  if (startYmd) {
    const [y, m, d] = String(startYmd)
      .split('-')
      .map(n => parseInt(n, 10))
    startIso = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)).toISOString()
  }
  if (endYmd) {
    const [y, m, d] = String(endYmd)
      .split('-')
      .map(n => parseInt(n, 10))
    endIso = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 23, 59, 59, 999)).toISOString()
  }
  return { startIso, endIso }
}
