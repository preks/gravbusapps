import { MyTasksViewConfig } from '@/common/components/common-relations/view-layouts/personal-workspace/components/tasks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerTasks } from '@/common/data/customer/hooks/useCustomerTasks'
import { useCustomerTaskStatistics } from '@/common/data/customer/hooks/useCustomerTaskStatistics'
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
// Note: referenceTypes filtering is not currently supported by CommonTaskQueryVariables
// This filter is disabled until backend support is added
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const processReferenceTypeFilter = (selectedFilters: Record<string, any>, vars: CustomerTaskQueryVariables): void => {
  // Commented out - referenceTypes not supported in query variables
  // if (
  //   selectedFilters.referenceType &&
  //   Array.isArray(selectedFilters.referenceType) &&
  //   selectedFilters.referenceType.length > 0
  // ) {
  //   vars.referenceTypes = selectedFilters.referenceType
  // }
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

/**
 * CRM My Tasks Configuration Builder
 * Creates the configuration for My Tasks view in CRM workspace
 *
 * @param context - Business app context
 * @param customerTasksHook - Hook result from useCustomerTasks
 * @param taskStatistics - Hook result from useCustomerTaskStatistics
 */
export const buildCrmMyTasksConfig = (
  context: BusinessAppContextProps,
  customerTasksHook: ReturnType<typeof useCustomerTasks>,
  taskStatistics: ReturnType<typeof useCustomerTaskStatistics>
): MyTasksViewConfig<CustomerTask, CustomerTaskQueryVariables> => {
  const { fetchCustomerTasks } = customerTasksHook

  return {
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

      // Process reference type filter
      processReferenceTypeFilter(params.selectedFilters, vars)

      // Process date range filters
      processTaskDateRanges(params.selectedFilters, vars)

      // Copy all other filters
      copyTaskFilters(params.selectedFilters, dateRangeKeys, vars)

      // Handle sorting
      if (params.sorting.length > 0) {
        vars.orderBy = [
          {
            field: params.sorting[0].id as any,
            direction: params.sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
          }
        ]
      } else {
        vars.orderBy = [{ field: 'dueDate' as any, direction: 'ASC_NULLS_LAST' }]
      }

      return vars
    },

    flowContexts: {
      entityContext: FlowContextName.customerTaskEntity,
      createContext: FlowContextName.customerTaskCreate
    },

    taskStatistics: {
      statistics: taskStatistics.myTasksStatistics,
      isLoading: taskStatistics.isLoading,
      error: taskStatistics.error,
      refetch: () => {
        void taskStatistics.refetch()
      }
    },

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
  }
}
