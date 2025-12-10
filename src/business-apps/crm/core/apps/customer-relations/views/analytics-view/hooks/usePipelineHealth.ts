// CRM-specific wrapper for shared generic pipeline health hook
import { useMemo } from 'react'
import { useGenericPipelineHealth } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericPipelineHealth'

export const usePipelineHealth = (accessToken: string, selectedPipelineId?: string) => {
  const config = useMemo(
    () => ({
      opportunityEntity: 'Opportunity',
      opportunityAggregate: 'OpportunityAggregate',
      pipelineField: 'salesPipeline',
      includeWinningChanceInQuery: true,
      includeStageFilter: true
    }),
    []
  )

  return useGenericPipelineHealth(accessToken, selectedPipelineId, config)
}
export type { PipelineHealthData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericPipelineHealth'
