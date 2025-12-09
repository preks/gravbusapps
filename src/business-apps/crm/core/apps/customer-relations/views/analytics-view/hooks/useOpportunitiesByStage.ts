import { useMemo } from 'react'
import {
  useGenericOpportunitiesByStage,
  type StageItem
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesByStage'

export type { StageItem }

/**
 * CRM-specific wrapper for useGenericOpportunitiesByStage
 */
export const useOpportunitiesByStage = (accessToken: string, pipelineId?: string) => {
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
