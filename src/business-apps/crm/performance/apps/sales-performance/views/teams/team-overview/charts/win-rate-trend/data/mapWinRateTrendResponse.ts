import type { AnalyticsTimePeriod } from '../../../../../../utils/timePeriods'
import { calculateWinRatePercent } from '../../shared/chartPeriodFormatting'
import type { WinRateTrendPoint } from '../types'

interface CountAggregateResponse {
  aggregate?: {
    count?: number
  }
}

export const mapWinRateTrendResponse = (
  response: Record<string, unknown>,
  periods: AnalyticsTimePeriod[]
): WinRateTrendPoint[] =>
  periods.map((period, index) => {
    const wonCount = (response[`period${index}Won`] as CountAggregateResponse | undefined)?.aggregate?.count ?? 0
    const closedCount = (response[`period${index}Closed`] as CountAggregateResponse | undefined)?.aggregate?.count ?? 0

    return {
      periodLabel: period.label,
      startDate: period.start,
      endDate: period.end,
      wonCount,
      closedCount,
      winRate: calculateWinRatePercent(wonCount, closedCount)
    }
  })
