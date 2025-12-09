import {
  useGenericOpportunitiesOverTime,
  type OpportunityTimeSeriesData,
  type TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesOverTime'

/**
 * CRM-specific wrapper for useGenericOpportunitiesOverTime
 */
const useOpportunitiesOverTime = (accessToken: string, timeFilter: TimeFilter, selectedPipelineId?: string) => {
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

export { useOpportunitiesOverTime, type OpportunityTimeSeriesData, type TimeFilter }
