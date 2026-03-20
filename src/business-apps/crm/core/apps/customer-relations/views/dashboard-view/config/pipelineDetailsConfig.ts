import { PipelineDetailsConfig } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/usePipelineDetailsData'

export const crmPipelineDetailsConfig: PipelineDetailsConfig = {
  opportunityTable: 'Opportunity',
  opportunityAggregateTable: 'OpportunityAggregate',
  activityAggregateTable: 'SalesActivityAggregate',
  activityCatalogName: 'SalesActivityType',
  pipelineFieldName: 'salesPipelineRef',
  stageFieldName: 'salesPipelineStageRef',
  usePipelineRelationship: false
}
