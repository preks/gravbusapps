import { useMemo } from 'react'
import {
  useGenericOpportunitiesByStage,
  type StageItem
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesByStage'

/**
 * CRM-specific wrapper for useGenericOpportunitiesByStage
 */
const useOpportunitiesByStage = (accessToken: string, pipelineId?: string) => {
  const config = useMemo(
    () => ({
      opportunityEntity: 'Opportunity',
      opportunityAggregate: 'OpportunityAggregate',
      pipelineStageField: 'salesPipelineStage',
      pipelineStageRefField: 'salesPipelineStageRef',
      pipelineField: 'salesPipeline'
    }),
    []
  )

  return useGenericOpportunitiesByStage(accessToken, config, pipelineId)
}

export { useOpportunitiesByStage, type StageItem }
