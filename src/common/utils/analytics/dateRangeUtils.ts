/**
 * Shared utility functions for analytics date range calculations
 * Used by both CRM and IRM analytics modules
 */

export interface DateRangeResult {
  startDate: Date
  endDate: Date
  label: string
}

/**
 * Calculate date range for different time filters
 */
export const getDateRange = (filter: string, customStart?: Date, customEnd?: Date): DateRangeResult => {
  const now = new Date()
  let startDate: Date
  let endDate: Date = now
  let label: string

  switch (filter) {
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
      label = 'Last 7 Days'
      break
    case 'quarter':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      label = 'Last Quarter'
      break
    case 'year':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      label = 'Last Year'
      break
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom date range requires start and end dates')
      }
      startDate = customStart
      endDate = customEnd
      label = 'Custom Range'
      break
    case 'month':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
      label = 'Last 30 Days'
  }

  return { startDate, endDate, label }
}

/**
 * Format date for GraphQL queries (ISO string)
 */
export const formatDateForQuery = (date: Date): string => {
  return date.toISOString()
}

/**
 * Calculate previous period for trend comparison
 */
export const getPreviousPeriod = (startDate: Date, endDate: Date): DateRangeResult => {
  const duration = endDate.getTime() - startDate.getTime()
  const previousEnd = new Date(startDate.getTime() - 1)
  const previousStart = new Date(previousEnd.getTime() - duration)

  return {
    startDate: previousStart,
    endDate: previousEnd,
    label: 'Previous Period'
  }
}

/**
 * Get date ranges for the last N months
 */
export const getLastNMonths = (n: number): DateRangeResult[] => {
  const now = new Date()
  const ranges: DateRangeResult[] = []

  for (let i = n - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)

    ranges.push({
      startDate: monthStart,
      endDate: monthEnd,
      label: monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    })
  }

  return ranges
}

/**
 * Calculate days between two dates
 */
export const daysBetween = (start: Date, end: Date): number => {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}
