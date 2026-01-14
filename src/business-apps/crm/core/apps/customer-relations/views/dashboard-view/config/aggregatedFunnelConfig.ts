import { AggregatedFunnelConfig } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/useAggregatedFunnelData'

/**
 * CRM-specific configuration for aggregated funnel
 * Maps to Opportunity GraphQL schema
 */
export const crmAggregatedFunnelConfig: AggregatedFunnelConfig = {
  opportunityTable: 'Opportunity',
  aggregateTable: 'OpportunityAggregate',
  pipelineFieldName: 'salesPipelineRef',
  stageFieldPath: 'salesPipelineStage',
  stageRefField: 'salesPipelineStageRef'
}
