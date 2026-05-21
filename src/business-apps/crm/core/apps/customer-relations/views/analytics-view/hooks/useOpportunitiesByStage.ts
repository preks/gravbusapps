import { useMemo } from 'react'
import { useGenericOpportunitiesByStage } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesByStage'

/**
 * CRM-specific wrapper for useGenericOpportunitiesByStage
 */
export const useOpportunitiesByStage = (accessToken: string, pipelineId?: string, activeOnly = false) => {
  const config = useMemo(
    () => ({
      opportunityEntity: 'Opportunity',
      opportunityAggregate: 'OpportunityAggregate',
      pipelineStageField: 'salesPipelineStage',
      pipelineStageRefField: 'salesPipelineStageRef',
      pipelineField: 'salesPipeline',
      statusFilterField: 'code' as const
    }),
    []
  )

  return useGenericOpportunitiesByStage(accessToken, config, pipelineId, activeOnly)
}

export type { StageItem } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesByStage'
