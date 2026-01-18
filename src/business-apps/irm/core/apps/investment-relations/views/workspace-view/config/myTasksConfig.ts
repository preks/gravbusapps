import { MyTasksViewConfig } from '@/common/components/common-relations/view-layouts/personal-workspace/components/tasks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentTasks } from '@/common/data/investment/hooks/useInvestmentTasks'
import { useInvestmentTaskStatistics } from '@/common/data/investment/hooks/useInvestmentTaskStatistics'
import { type InvestmentTask, INVESTMENT_TASK_DESCRIPTORS } from '@/common/data/investment/types/investmentTaskTypes'
import type { InvestmentTaskQueryVariables } from '@/common/data/investment/queries/investmentTaskQueries'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { TaskReference } from '@/common/data/relations/types/taskTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  createTaskColumns,
  taskFilterConfig
} from '@/common/components/common-relations/view-layouts/task-layout/config'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

// Helper function to process reference type filter
const processInvestmentReferenceTypeFilter = (
  selectedFilters: Record<string, any>,
  vars: InvestmentTaskQueryVariables
): void => {
  if (
    selectedFilters.referenceType &&
    Array.isArray(selectedFilters.referenceType) &&
    selectedFilters.referenceType.length > 0
  ) {
    vars.referenceTypes = selectedFilters.referenceType
  }
}

// Helper function to process date range filters
const processInvestmentTaskDateRanges = (
  selectedFilters: Record<string, any>,
  vars: InvestmentTaskQueryVariables
): void => {
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
const copyInvestmentTaskFilters = (
  selectedFilters: Record<string, any>,
  dateRangeKeys: string[],
  vars: InvestmentTaskQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (
      key !== 'referenceType' &&
      !dateRangeKeys.includes(key) &&
      selectedFilters[key] !== undefined &&
      selectedFilters[key] !== null
    ) {
      vars[key as keyof InvestmentTaskQueryVariables] = selectedFilters[key]
    }
  }
}

// Build reference URLs for IRM context
const buildReferenceUrl = (reference: TaskReference): string => {
  switch (reference.type) {
    case 'lead':
      return buildPlatformUrl('/platform/irm/lead-record', { leadId: reference.id })
    case 'account':
      return buildPlatformUrl('/platform/irm/account-record', { accountId: reference.id })
    case 'contact':
      return buildPlatformUrl('/platform/irm/contact-record', { contactId: reference.id })
    case 'opportunity':
      return buildPlatformUrl('/platform/irm/opportunity-record', { opportunityId: reference.id })
    case 'investment':
      return buildPlatformUrl('/platform/irm/investment-record', { investmentId: reference.id })
    default:
      return ''
  }
}

/**
 * IRM My Tasks Configuration Builder
 * Creates the configuration for My Tasks view in IRM workspace
 */
export const buildIrmMyTasksConfig = (
  context: BusinessAppContextProps
): MyTasksViewConfig<InvestmentTask, InvestmentTaskQueryVariables> => {
  const { fetchInvestmentTasks } = useInvestmentTasks(context)
  const taskStatistics = useInvestmentTaskStatistics(context)

  return {
    fetchMyTasks: async (variables: InvestmentTaskQueryVariables) => {
      const employeeId = context.userInfo?.employeeDetails?.employeeId || context.userInfo?.id
      const result = await fetchInvestmentTasks({
        ...variables,
        assignedEmployeeIds: employeeId ? [employeeId] : []
      })
      return {
        tasks: result.tasks as any,
        total: result.total || 0
      }
    },

    createColumns: () => createTaskColumns() as any,
    descriptors: INVESTMENT_TASK_DESCRIPTORS,
    entityName: 'InvestmentTask',
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
      const vars: InvestmentTaskQueryVariables = {
        limit: params.pagination.pageSize,
        offset: params.pagination.pageIndex * params.pagination.pageSize,
        search: params.searchTerm.trim() || undefined
      }

      const dateRangeKeys = ['createdAtRange', 'updatedAtRange', 'dueDateRange', 'startDateRange', 'endDateRange']

      // Process reference type filter
      processInvestmentReferenceTypeFilter(params.selectedFilters, vars)

      // Process date range filters
      processInvestmentTaskDateRanges(params.selectedFilters, vars)

      // Copy all other filters
      copyInvestmentTaskFilters(params.selectedFilters, dateRangeKeys, vars)

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
      entityContext: FlowContextName.investmentTaskEntity,
      createContext: FlowContextName.investmentTaskCreate
    },

    taskStatistics: {
      statistics: taskStatistics.myTasksStatistics,
      isLoading: taskStatistics.isLoading,
      error: taskStatistics.error,
      refetch: () => {
        void taskStatistics.refetch()
      }
    },

    rowActionsContextArray: [FlowContextName.investmentTaskEntity],
    buildRowActionsExternalContextData: (row: { original: InvestmentTask }) => {
      const externalContextData: Record<string, string> = { taskId: row.original.id }

      // Add parent reference ID based on task reference type
      if (row.original.reference) {
        const refType = row.original.reference.type
        const refId = row.original.reference.id

        switch (refType) {
          case 'investment':
            externalContextData.investmentId = refId
            break
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
