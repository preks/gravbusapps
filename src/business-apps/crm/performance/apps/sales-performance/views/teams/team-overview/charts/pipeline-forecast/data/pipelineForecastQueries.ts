import { buildOpenOpportunityBaseWhere } from '../../shared/data/opportunityFilters'
import type { ForecastPeriod } from '../../shared/forecastPeriods'

export const buildTeamPipelineForecastQuery = (
  teamMemberIds: string[],
  periods: ForecastPeriod[],
  currencyCode?: string,
  pipelineId?: string
): string => {
  const baseWhere = buildOpenOpportunityBaseWhere(teamMemberIds, currencyCode, pipelineId)

  const forecastQueries = periods
    .map(
      (period, index) => `
    forecast${index}: OpportunityAggregate(
      where: {
        ${baseWhere}
        closeDate: { _gte: "${period.start}", _lt: "${period.end}" }
      }
    ) {
      aggregate {
        count
        sum { estimatedAmount }
      }
    }
  `
    )
    .join('\n')

  return `
    query GetTeamPipelineForecast {
      ${forecastQueries}
    }
  `
}
