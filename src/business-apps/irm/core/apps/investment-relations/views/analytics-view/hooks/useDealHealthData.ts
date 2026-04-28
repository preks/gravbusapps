/**
 * IRM-specific wrapper around the shared useDealHealthData hook.
 *
 * `InvestmentOpportunity` does not expose `winningChance`, so per-deal scoring
 * uses stage progress (from the IRM pipeline-stage catalog) plus a close-date
 * risk factor instead.
 */
import { useMemo } from 'react'
import {
  useDealHealthData as useSharedDealHealthData,
  type DealHealthConfig
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

export const useDealHealthData = (accessToken: string) => {
  const config = useMemo<DealHealthConfig>(
    () => ({
      entityName: 'InvestmentOpportunity',
      scoringStrategy: 'stageAndCloseDate',
      pipelineField: 'opportunityPipeline',
      stageField: 'opportunityPipelineStage',
      stagesCatalogIdentifier: 'InvestmentOpportunityPipelineStage',
      // InvestmentOpportunityStatus codes are tenant-specific; the canonical bucket
      // (OPEN/WON/LOST) lives in `type`.
      statusFilterField: 'type'
    }),
    []
  )
  return useSharedDealHealthData(accessToken, config)
}

export type {
  DealHealthData,
  DealHealthItem
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
