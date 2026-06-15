import type { AnalyticsTimePeriod } from '../../../../../../utils/timePeriods'
import { buildTeamOwnerOpportunityBaseWhere } from '../../shared/data/opportunityFilters'

export const buildOpportunityOutcomesQuery = (
  teamMemberIds: string[],
  periods: AnalyticsTimePeriod[],
  currencyCode?: string
): string => {
  const baseWhere = buildTeamOwnerOpportunityBaseWhere(teamMemberIds, currencyCode)

  const periodQueries = periods
    .map(
      (period, index) => `
    period${index}Won: OpportunityAggregate(
      where: {
        ${baseWhere}
        opportunityStatus: { code: { _eq: "WON" } }
        closeDate: { _gte: "${period.start}", _lt: "${period.end}" }
      }
    ) {
      aggregate {
        count
      }
    }

    period${index}Lost: OpportunityAggregate(
      where: {
        ${baseWhere}
        opportunityStatus: { code: { _eq: "LOST" } }
        closeDate: { _gte: "${period.start}", _lt: "${period.end}" }
      }
    ) {
      aggregate {
        count
      }
    }
  `
    )
    .join('\n')

  return `
    query GetOpportunityOutcomes {
      ${periodQueries}
    }
  `
}
