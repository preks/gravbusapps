import { useMemo } from 'react'
import {
  useGenericOpportunitiesByStage,
  type StageItem
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesByStage'

export type { StageItem }

/**
 * IRM-specific wrapper for useGenericOpportunitiesByStage
 */
export const useOpportunitiesByStage = (accessToken: string, pipelineId?: string) => {
  const config = useMemo(
    () => ({
      opportunityEntity: 'InvestmentOpportunity',
      opportunityAggregate: 'InvestmentOpportunityAggregate',
      pipelineStageField: 'opportunityPipelineStage',
      pipelineStageRefField: 'opportunityPipelineStageRef',
      pipelineField: 'opportunityPipeline'
    }),
    []
  )

  return useGenericOpportunitiesByStage(accessToken, config, pipelineId)
}
