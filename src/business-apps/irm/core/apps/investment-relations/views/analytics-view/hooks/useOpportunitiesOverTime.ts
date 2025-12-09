import {
  useGenericOpportunitiesOverTime,
  type TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesOverTime'

/**
 * IRM-specific wrapper for useGenericOpportunitiesOverTime
 */
export const useOpportunitiesOverTime = (accessToken: string, timeFilter: TimeFilter, selectedPipelineId?: string) => {
  return useGenericOpportunitiesOverTime(
    accessToken,
    {
      opportunityEntity: 'InvestmentOpportunity',
      wonStatusCode: 'WON',
      pipelineField: 'opportunityPipeline'
    },
    timeFilter,
    selectedPipelineId
  )
}

export type {
  OpportunityTimeSeriesData,
  TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesOverTime'
