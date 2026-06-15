import type { PipelineForecastPoint } from '../types'
import type { ForecastPeriod } from '../../shared/forecastPeriods'

interface AggregateResponse {
  aggregate?: {
    count?: number
    sum?: {
      estimatedAmount?: number
    }
  }
}

export const mapPipelineForecastResponse = (
  response: Record<string, unknown>,
  periods: ForecastPeriod[]
): PipelineForecastPoint[] =>
  periods.map((period, index) => {
    const aggregate = (response[`forecast${index}`] as AggregateResponse | undefined)?.aggregate

    return {
      month: period.label,
      forecastedRevenue: aggregate?.sum?.estimatedAmount ?? 0,
      opportunityCount: aggregate?.count ?? 0
    }
  })
