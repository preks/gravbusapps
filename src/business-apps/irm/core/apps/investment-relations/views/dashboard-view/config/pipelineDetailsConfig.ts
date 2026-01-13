import { PipelineDetailsConfig } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/usePipelineDetailsData'

export const irmPipelineDetailsConfig: PipelineDetailsConfig = {
  opportunityTable: 'InvestmentOpportunity',
  opportunityAggregateTable: 'InvestmentOpportunityAggregate',
  activityAggregateTable: 'InvestmentActivityAggregate',
  activityCatalogName: 'InvestmentActivityType',
  pipelineFieldName: 'opportunityPipelineRef',
  stageFieldName: 'opportunityPipelineStageRef',
  usePipelineRelationship: true
}
