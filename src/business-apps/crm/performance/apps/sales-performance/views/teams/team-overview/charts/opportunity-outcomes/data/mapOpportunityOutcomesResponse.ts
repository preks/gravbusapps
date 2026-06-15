import type { AnalyticsTimePeriod } from '../../../../../../utils/timePeriods'
import type { OpportunityOutcomesPoint } from '../types'

interface CountAggregateResponse {
  aggregate?: {
    count?: number
  }
}

export const mapOpportunityOutcomesResponse = (
  response: Record<string, unknown>,
  periods: AnalyticsTimePeriod[]
): OpportunityOutcomesPoint[] =>
  periods.map((period, index) => ({
    periodLabel: period.label,
    startDate: period.start,
    endDate: period.end,
    wonCount: (response[`period${index}Won`] as CountAggregateResponse | undefined)?.aggregate?.count ?? 0,
    lostCount: (response[`period${index}Lost`] as CountAggregateResponse | undefined)?.aggregate?.count ?? 0
  }))
