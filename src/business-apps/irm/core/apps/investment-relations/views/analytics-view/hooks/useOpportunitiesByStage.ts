import { useMemo } from 'react'
import {
  useGenericOpportunitiesByStage,
  type StageItem
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesByStage'

/**
 * IRM-specific wrapper for useGenericOpportunitiesByStage
 */
const useOpportunitiesByStage = (accessToken: string, pipelineId?: string) => {
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

export { useOpportunitiesByStage, type StageItem }
