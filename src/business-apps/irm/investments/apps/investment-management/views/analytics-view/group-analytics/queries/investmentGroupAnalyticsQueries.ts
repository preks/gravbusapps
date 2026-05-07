import { useInvestmentGroupDistributionQueries } from './distributionQueries'
import { useInvestmentGroupPerformanceQueries } from './performanceQueries'
import { useInvestmentGroupTimelineQueries } from './timelineQueries'

export type {
  DistributionDimension,
  InvestmentGroupDistributionDatum,
  InvestmentGroupMonthlyTimelineDatum,
  InvestmentGroupParetoDatum,
  InvestmentGroupTimelineDatum,
  InvestmentGroupTypeTimelineResult,
  TimelineDateField,
  TopInvestmentDatum
} from './shared'
export { buildInvestmentGroupWhere } from './shared'

export const useInvestmentGroupAnalyticsQueries = (accessToken: string | undefined) => {
  const distributionQueries = useInvestmentGroupDistributionQueries(accessToken)
  const timelineQueries = useInvestmentGroupTimelineQueries(accessToken)
  const performanceQueries = useInvestmentGroupPerformanceQueries(accessToken)

  return {
    ...distributionQueries,
    ...timelineQueries,
    ...performanceQueries
  }
}
