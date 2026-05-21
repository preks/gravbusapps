import { useMemo } from 'react'
import { useGenericOpportunitiesByStage } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesByStage'

/**
 * IRM-specific wrapper for useGenericOpportunitiesByStage
 */
export const useOpportunitiesByStage = (accessToken: string, pipelineId?: string, activeOnly = false) => {
  const config = useMemo(
    () => ({
      opportunityEntity: 'InvestmentOpportunity',
      opportunityAggregate: 'InvestmentOpportunityAggregate',
      pipelineStageField: 'opportunityPipelineStage',
      pipelineStageRefField: 'opportunityPipelineStageRef',
      pipelineField: 'opportunityPipeline',
      statusFilterField: 'type' as const
    }),
    []
  )

  return useGenericOpportunitiesByStage(accessToken, config, pipelineId, activeOnly)
}

export type { StageItem } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesByStage'
