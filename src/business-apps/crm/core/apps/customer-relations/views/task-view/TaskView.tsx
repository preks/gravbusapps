import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useCustomerTaskFilters } from '@/common/data/customer/hooks/useCustomerTaskFilters'
import { useCustomerTaskStatistics } from '@/common/data/customer/hooks/useCustomerTaskStatistics'
import { TaskLayout, type TaskViewConfig } from '@/common/components/common-relations/view-layouts/task-layout'
import type { CustomerTask } from '@/common/data/customer/types/customerTaskTypes'
import { CUSTOMER_TASK_DESCRIPTORS } from '@/common/data/customer/types/customerTaskTypes'
import type { CustomerTaskQueryVariables } from '@/common/data/customer/queries/customerTaskQueries'
import type { TaskReference } from '@/common/data/relations/types/commonTaskTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { createTaskColumns } from '@/common/components/common-relations/view-layouts/task-layout/config'
import { taskFilterConfig } from '@/common/components/common-relations/view-layouts/task-layout/config'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

export type TaskViewProps = BusinessAppContextProps

export const TaskView: React.FC<TaskViewProps> = context => {
  const { fetchCustomerTasks } = useCustomerTasks(context)
  const taskStatistics = useCustomerTaskStatistics(context)
  const taskFilters = useCustomerTaskFilters(context)

  // Build reference URLs for CRM context
  const buildReferenceUrl = (reference: TaskReference): string => {
    switch (reference.type) {
      case 'lead':
        return buildPlatformUrl('/platform/crm/lead-record', { leadId: reference.id })
      case 'account':
        return buildPlatformUrl('/platform/crm/account-record', { accountId: reference.id })
      case 'contact':
        return buildPlatformUrl('/platform/crm/contact-record', { contactId: reference.id })
      case 'opportunity':
        return buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId: reference.id })
      default:
        return ''
    }
  }

  const config: TaskViewConfig<CustomerTask, CustomerTaskQueryVariables> = useMemo(
    () => ({
      fetchMyTasks: async (variables: CustomerTaskQueryVariables) => {
        const employeeId = context.userInfo?.employeeDetails?.employeeId || context.userInfo?.id
        const result = await fetchCustomerTasks({
          ...variables,
          assignedEmployeeIds: employeeId ? [employeeId] : []
        })
        return {
          tasks: result.tasks as any,
          total: result.total
        }
      },

      fetchTeamTasks: async (variables: CustomerTaskQueryVariables) => {
        const result = await fetchCustomerTasks(variables)
        return {
          tasks: result.tasks as any,
          total: result.total
        }
      },

      filterDataHook: () => taskFilters,

      createColumns: () => createTaskColumns() as any,
      descriptors: CUSTOMER_TASK_DESCRIPTORS,
      columnLabels: {
        name: 'Task',
        taskType: 'Type',
        taskPriority: 'Priority',
        taskStatus: 'Status',
        assignedTo: 'Assigned To',
        reference: 'Reference',
        dueDate: 'Due Date',
        createdAt: 'Created',
        createdBy: 'Created By'
      },

      baseFilterConfig: taskFilterConfig,

      buildQueryVariables: params => {
        const vars: CustomerTaskQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        // Copy filter values directly (Filter-IDs now match Descriptor-Keys)
        // Handle createdDateRange date filter splitting
        if (
          params.selectedFilters.createdDateRange &&
          Array.isArray(params.selectedFilters.createdDateRange) &&
          params.selectedFilters.createdDateRange.length === 2
        ) {
          const [start, end] = params.selectedFilters.createdDateRange
          if (start) vars.createdAtFrom = start
          if (end) vars.createdAtTo = end
        }

        // Handle dueDateRange date filter splitting
        if (
          params.selectedFilters.dueDateRange &&
          Array.isArray(params.selectedFilters.dueDateRange) &&
          params.selectedFilters.dueDateRange.length === 2
        ) {
          const [start, end] = params.selectedFilters.dueDateRange
          if (start) vars.dueDateFrom = start
          if (end) vars.dueDateTo = end
        }

        // Handle referenceType filter (no Descriptor - special case)
        if (
          params.selectedFilters.referenceType &&
          Array.isArray(params.selectedFilters.referenceType) &&
          params.selectedFilters.referenceType.length > 0
        ) {
          vars.referenceTypes = params.selectedFilters.referenceType
        }

        // Copy all other filters directly (they now match Descriptor-Keys)
        Object.keys(params.selectedFilters).forEach(key => {
          if (
            key !== 'createdDateRange' &&
            key !== 'dueDateRange' &&
            key !== 'referenceType' &&
            params.selectedFilters[key] !== undefined &&
            params.selectedFilters[key] !== null
          ) {
            vars[key as keyof CustomerTaskQueryVariables] = params.selectedFilters[key]
          }
        })

        // Use column ID directly - buildOrderBy will use descriptors (CUSTOMER_TASK_DESCRIPTORS)
        // to resolve correct GraphQL paths (e.g., type.value, priority.value, status.value)
        if (params.sorting.length > 0) {
          vars.orderBy = [
            {
              field: params.sorting[0].id as any,
              direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
            }
          ]
        } else {
          vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
        }

        return vars
      },

      flowContexts: {
        entityContext: FlowContextName.customerTaskEntity,
        createContext: FlowContextName.customerTaskCreate
      },

      taskStatistics,

      processCompletionEvents: ['taskCompletion', 'com.newwork.process.taskCompletion'],

      rowActionsContextArray: [FlowContextName.customerTaskEntity],
      buildRowActionsExternalContextData: (row: { original: CustomerTask }) => {
        const externalContextData: Record<string, string> = { taskId: row.original.id }

        // Add parent reference ID based on task reference type
        if (row.original.reference) {
          const refType = row.original.reference.type
          const refId = row.original.reference.id

          switch (refType) {
            case 'lead':
              externalContextData.leadId = refId
              break
            case 'account':
              externalContextData.accountId = refId
              break
            case 'contact':
              externalContextData.contactId = refId
              break
            case 'opportunity':
              externalContextData.opportunityId = refId
              break
          }
        }

        return externalContextData
      },

      buildReferenceUrl
    }),
    [context, fetchCustomerTasks, taskStatistics, taskFilters, buildReferenceUrl]
  )

  return (
    <TaskLayout<CustomerTask, CustomerTaskQueryVariables>
      context={context}
      config={config}
      dataTestId="customer-task-view"
    />
  )
}

export default TaskView
