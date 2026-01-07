import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useCustomerTaskStatistics } from '@/common/data/customer/hooks/useCustomerTaskStatistics'
import { TaskLayout, type TaskViewConfig } from '@/common/components/common-relations/view-layouts/task-layout'
import { type CustomerTask, CUSTOMER_TASK_DESCRIPTORS } from '@/common/data/customer/types/customerTaskTypes'
import type { CustomerTaskQueryVariables } from '@/common/data/customer/queries/customerTaskQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { TaskReference } from '@/common/data/relations/types/taskTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  createTaskColumns,
  taskFilterConfig
} from '@/common/components/common-relations/view-layouts/task-layout/config'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

// Helper function to process reference type filter
const processReferenceTypeFilter = (selectedFilters: Record<string, any>, vars: CustomerTaskQueryVariables): void => {
  if (
    selectedFilters.referenceType &&
    Array.isArray(selectedFilters.referenceType) &&
    selectedFilters.referenceType.length > 0
  ) {
    vars.referenceTypes = selectedFilters.referenceType
  }
}

// Helper function to process date range filters
const processTaskDateRanges = (selectedFilters: Record<string, any>, vars: CustomerTaskQueryVariables): void => {
  const dateRangeKeys = ['createdAtRange', 'updatedAtRange', 'dueDateRange', 'startDateRange', 'endDateRange']

  for (const rangeKey of dateRangeKeys) {
    const rawValue = selectedFilters[rangeKey]

    const normalized = normalizeDateRange(rawValue)
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) (vars as any)[`${baseKey}From`] = normalized.from
      if (normalized.to) (vars as any)[`${baseKey}To`] = normalized.to
    }
  }
}

// Helper function to copy other filters
const copyTaskFilters = (
  selectedFilters: Record<string, any>,
  dateRangeKeys: string[],
  vars: CustomerTaskQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (
      key !== 'referenceType' &&
      !dateRangeKeys.includes(key) &&
      selectedFilters[key] !== undefined &&
      selectedFilters[key] !== null
    ) {
      vars[key as keyof CustomerTaskQueryVariables] = selectedFilters[key]
    }
  }
}

export type TaskViewProps = BusinessAppContextProps

export const TaskView: React.FC<TaskViewProps> = context => {
  const { fetchCustomerTasks } = useCustomerTasks(context)
  const taskStatistics = useCustomerTaskStatistics(context)

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

      createColumns: () => createTaskColumns() as any,
      descriptors: CUSTOMER_TASK_DESCRIPTORS,
      entityName: 'SalesTask',
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

        const dateRangeKeys = ['createdAtRange', 'updatedAtRange', 'dueDateRange', 'startDateRange', 'endDateRange']

        // Process reference type filter using helper
        processReferenceTypeFilter(params.selectedFilters, vars)

        // Process date range filters using helper
        processTaskDateRanges(params.selectedFilters, vars)

        // Copy all other filters using helper
        copyTaskFilters(params.selectedFilters, dateRangeKeys, vars)

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
    [context, fetchCustomerTasks, taskStatistics, buildReferenceUrl]
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
