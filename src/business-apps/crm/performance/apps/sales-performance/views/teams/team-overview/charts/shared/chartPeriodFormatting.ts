import type { TimeFilter } from '../../../../../types'

interface TrendPeriodPoint {
  periodLabel: string
  startDate: string
}

export const formatTrendPeriodAxisLabel = (
  value: string,
  timeFilter: TimeFilter,
  points: TrendPeriodPoint[]
): string => {
  if (timeFilter === 'historical') {
    return value
  }

  const point = points.find(item => item.periodLabel === value)
  if (!point) {
    return value
  }

  const date = new Date(point.startDate)

  if (timeFilter === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export const calculateWinRatePercent = (wonCount: number, closedCount: number): number => {
  if (closedCount <= 0) {
    return 0
  }

  return (wonCount / closedCount) * 100
}
