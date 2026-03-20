import { ActiveTasksConfig } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/useActiveTasksData'

/**
 * CRM-specific configuration for active tasks
 * Maps to SalesTask GraphQL schema
 */
export const crmActiveTasksConfig: ActiveTasksConfig = {
  taskTable: 'SalesTask',
  taskAggregateTable: 'SalesTaskAggregate',
  statusField: 'status',
  priorityField: 'priority',
  leadField: 'lead',
  opportunityField: 'opportunity',
  leadNameFields: 'name'
}
