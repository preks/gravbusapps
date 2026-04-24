// CRM-specific wrapper for shared generic pipeline health hook
import { useMemo } from 'react'
import {
  useGenericPipelineHealth,
  type PipelineHealthConfig
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericPipelineHealth'

export const usePipelineHealth = (accessToken: string, selectedPipelineId?: string) => {
  const config = useMemo<PipelineHealthConfig>(
    () => ({
      opportunityEntity: 'Opportunity',
      opportunityAggregate: 'OpportunityAggregate',
      pipelineField: 'salesPipeline',
      confidenceMetric: 'winningChance',
      includeStageFilter: true,
      statusFilterField: 'code'
    }),
    []
  )

  return useGenericPipelineHealth(accessToken, selectedPipelineId, config)
}
export type { PipelineHealthData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericPipelineHealth'
