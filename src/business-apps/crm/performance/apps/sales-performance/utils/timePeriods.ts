import type { TimeFilter } from '../types'

export interface AnalyticsTimePeriod {
  start: string
  end: string
  label: string
}

export const generateTimePeriods = (timeFilter: TimeFilter): AnalyticsTimePeriod[] => {
  const currentDate = new Date()
  const periods: AnalyticsTimePeriod[] = []

  switch (timeFilter) {
    case 'month':
      for (let i = 3; i >= 0; i -= 1) {
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - (i * 7 + 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)

        periods.push({
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          label: `Week ${4 - i}`
        })
      }
      break

    case 'quarter':
      for (let i = 2; i >= 0; i -= 1) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        periods.push({
          start: date.toISOString(),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString(),
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        })
      }
      break

    case 'year':
      for (let i = 11; i >= 0; i -= 1) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        periods.push({
          start: date.toISOString(),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString(),
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        })
      }
      break

    case 'historical': {
      const currentYear = currentDate.getFullYear()
      for (let i = 4; i >= 0; i -= 1) {
        const yearStart = new Date(currentYear - i, 0, 1)
        periods.push({
          start: yearStart.toISOString(),
          end: new Date(currentYear - i + 1, 0, 1).toISOString(),
          label: yearStart.getFullYear().toString()
        })
      }
      break
    }

    case 'sixMonths':
    default:
      for (let i = 5; i >= 0; i -= 1) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        periods.push({
          start: date.toISOString(),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString(),
          label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        })
      }
      break
  }

  return periods
}

export const TIME_FILTER_OPTIONS: Array<{ key: TimeFilter; label: string }> = [
  { key: 'month', label: 'Last Month' },
  { key: 'quarter', label: 'Last Quarter' },
  { key: 'sixMonths', label: 'Last 6 Months' },
  { key: 'year', label: 'Last Year' },
  { key: 'historical', label: 'Historical' }
]
