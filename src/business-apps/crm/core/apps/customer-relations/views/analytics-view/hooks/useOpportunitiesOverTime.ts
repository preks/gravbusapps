import {
  useGenericOpportunitiesOverTime,
  type TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesOverTime'

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

export type {
  OpportunityTimeSeriesData,
  TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesOverTime'
