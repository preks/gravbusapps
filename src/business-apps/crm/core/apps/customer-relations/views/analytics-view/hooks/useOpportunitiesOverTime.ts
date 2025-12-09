import {
  useGenericOpportunitiesOverTime,
  OpportunityTimeSeriesData,
  TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesOverTime'

export type { OpportunityTimeSeriesData, TimeFilter }

/**
 * CRM-specific wrapper for useGenericOpportunitiesOverTime
 */
export const useOpportunitiesOverTime = (accessToken: string, timeFilter: TimeFilter, selectedPipelineId?: string) => {
  return useGenericOpportunitiesOverTime(
    accessToken,
    {
      opportunityEntity: 'Opportunity',
      wonStatusCode: 'WON',
      pipelineField: 'salesPipeline'
    },
    timeFilter,
    selectedPipelineId
  )
}
