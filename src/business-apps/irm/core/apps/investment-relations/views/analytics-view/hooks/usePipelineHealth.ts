// IRM-specific wrapper for shared generic pipeline health hook
import { useMemo } from 'react'
import {
  useGenericPipelineHealth,
  type PipelineHealthConfig
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericPipelineHealth'

/**
 * IRM Pipeline Health hook - Uses shared generic implementation
 *
 * IRM's `InvestmentOpportunity` does not have a `winningChance` field, so the
 * confidence component of the health score is computed from an all-time realized
 * win rate (won / (won + lost)). The bucket is decided purely by
 * `opportunityStatus.type` (status-only filter, no time windowing) so deals with
 * a null `closeDate` still count toward the ratio.
 */
export const usePipelineHealth = (accessToken: string, selectedPipelineId?: string) => {
  const config = useMemo<PipelineHealthConfig>(
    () => ({
      opportunityEntity: 'InvestmentOpportunity',
      opportunityAggregate: 'InvestmentOpportunityAggregate',
      pipelineField: 'opportunityPipeline',
      confidenceMetric: 'winRate',
      includeStageFilter: false,
      // InvestmentOpportunityStatus codes are tenant-specific; the canonical bucket
      // (OPEN/WON/LOST) lives in `type`.
      statusFilterField: 'type'
    }),
    []
  )

  return useGenericPipelineHealth(accessToken, selectedPipelineId, config)
}
export type { PipelineHealthData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericPipelineHealth'
