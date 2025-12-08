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

/**
 * Generate time periods for analytics charts based on filter
 * Used for generating consistent date ranges across different analytics views
 */
export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface TimePeriod {
  start: string
  end: string
  label: string
}

export const generateTimePeriods = (filter: TimeFilter): TimePeriod[] => {
  const now = new Date()
  const periods: TimePeriod[] = []

  switch (filter) {
    case 'month': {
      // Last 30 days (daily)
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setDate(start.getDate() + 1)

        periods.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })
      }
      break
    }

    case 'quarter': {
      // Last 3 months (monthly aggregation)
      for (let i = 2; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = date.toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()
        const monthName = date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        })

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: monthName
        })
      }
      break
    }

    case 'sixMonths': {
      // Last 6 months (monthly aggregation)
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = date.toISOString()
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()
        const monthName = date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        })

        periods.push({
          start: monthStart,
          end: monthEnd,
          label: monthName
        })
      }
      break
    }

    case 'year': {
      // Last 12 months (monthly)
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

        periods.push({
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
          label: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        })
      }
      break
    }

    case 'historical': {
      // Last 5 years (yearly)
      const currentYear = now.getFullYear()
      for (let i = 4; i >= 0; i--) {
        const yearStart = new Date(currentYear - i, 0, 1)
        const yearEnd = new Date(currentYear - i + 1, 0, 1)

        periods.push({
          start: yearStart.toISOString(),
          end: yearEnd.toISOString(),
          label: yearStart.getFullYear().toString()
        })
      }
      break
    }

    default:
      return []
  }

  return periods
}
