// IRM-specific wrapper for shared generic pipeline health hook
import { useMemo } from 'react'
import { useGenericPipelineHealth } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericPipelineHealth'

/**
 * IRM Pipeline Health hook - Uses shared generic implementation
 * Optimized with aggregates for consistency and performance
 */
const usePipelineHealth = (accessToken: string, selectedPipelineId?: string) => {
  const config = useMemo(
    () => ({
      opportunityEntity: 'InvestmentOpportunity',
      opportunityAggregate: 'InvestmentOpportunityAggregate',
      pipelineField: 'opportunityPipeline',
      includeWinningChanceInQuery: false, // IRM doesn't include winning chance in sample query
      includeStageFilter: false // IRM doesn't include stage filter
    }),
    []
  )

  return useGenericPipelineHealth(accessToken, selectedPipelineId, config)
}

export { usePipelineHealth }
export type { PipelineHealthData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericPipelineHealth'
