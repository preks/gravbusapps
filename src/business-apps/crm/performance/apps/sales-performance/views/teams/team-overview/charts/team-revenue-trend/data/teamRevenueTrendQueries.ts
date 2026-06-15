import type { AnalyticsTimePeriod } from '../../../../../../utils/timePeriods'
import { buildWonOpportunityBaseWhere } from '../../shared/data/opportunityFilters'

export const buildTeamRevenueTrendQuery = (
  teamMemberIds: string[],
  periods: AnalyticsTimePeriod[],
  currencyCode?: string
): string => {
  const baseWhere = buildWonOpportunityBaseWhere(teamMemberIds, currencyCode)

  const periodQueries = periods
    .map(
      (period, index) => `
    period${index}: OpportunityAggregate(
      where: {
        ${baseWhere}
        closeDate: { _gte: "${period.start}", _lt: "${period.end}" }
      }
    ) {
      aggregate {
        sum { estimatedAmount }
      }
    }
  `
    )
    .join('\n')

  return `
    query GetTeamRevenueTrend {
      ${periodQueries}
    }
  `
}
