import { useGenericOpportunitiesOverTime } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesOverTime'

export type {
  OpportunityTimeSeriesData,
  TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesOverTime'

// Type imported locally for function signature
import type { TimeFilter } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesOverTime'

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
