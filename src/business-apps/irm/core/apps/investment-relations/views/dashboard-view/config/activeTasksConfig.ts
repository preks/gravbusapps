import { ActiveTasksConfig } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/useActiveTasksData'

/**
 * IRM-specific configuration for active tasks
 * Maps to InvestmentTask GraphQL schema
 */
export const irmActiveTasksConfig: ActiveTasksConfig = {
  taskTable: 'InvestmentTask',
  taskAggregateTable: 'InvestmentTaskAggregate',
  statusField: 'taskStatus',
  priorityField: 'taskPriority',
  leadField: 'lead',
  opportunityField: 'opportunity',
  leadNameFields: 'firstName\n              lastName'
}
