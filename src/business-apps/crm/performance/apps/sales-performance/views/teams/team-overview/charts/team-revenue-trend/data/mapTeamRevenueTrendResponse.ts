import type { AnalyticsTimePeriod } from '../../../../../../utils/timePeriods'
import type { TeamRevenueTrendPoint } from '../types'

interface AggregateResponse {
  aggregate?: {
    sum?: {
      estimatedAmount?: number
    }
  }
}

export const mapTeamRevenueTrendResponse = (
  response: Record<string, unknown>,
  periods: AnalyticsTimePeriod[]
): TeamRevenueTrendPoint[] => {
  return periods.map((period, index) => ({
    periodLabel: period.label,
    startDate: period.start,
    endDate: period.end,
    revenue: (response[`period${index}`] as AggregateResponse | undefined)?.aggregate?.sum?.estimatedAmount ?? 0
  }))
}
