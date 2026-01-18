import { AggregatedFunnelConfig } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/useAggregatedFunnelData'

/**
 * IRM-specific configuration for aggregated funnel
 * Maps to InvestmentOpportunity GraphQL schema
 */
export const irmAggregatedFunnelConfig: AggregatedFunnelConfig = {
  opportunityTable: 'InvestmentOpportunity',
  aggregateTable: 'InvestmentOpportunityAggregate',
  pipelineFieldName: 'opportunityPipelineRef',
  stageFieldPath: 'opportunityPipelineStage',
  stageRefField: 'opportunityPipelineStageRef'
}
