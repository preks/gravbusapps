import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentTasks } from '@/common/data/investment/hooks/useInvestmentTasks'
import { useInvestmentTaskStatistics } from '@/common/data/investment/hooks/useInvestmentTaskStatistics'
import { TaskLayout, type TaskViewConfig } from '@/common/components/common-relations/view-layouts/task-layout'
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
    console.log(`[TaskView] DEBUG - Processing ${rangeKey}:`, {
      raw: rawValue,
      type: typeof rawValue,
      isArray: Array.isArray(rawValue)
    })

    const normalized = normalizeDateRange(rawValue)
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) (vars as any)[`${baseKey}From`] = normalized.from
      if (normalized.to) (vars as any)[`${baseKey}To`] = normalized.to
      console.log(`[TaskView] DEBUG - Normalized ${rangeKey}:`, normalized)
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
      if (key === 'schedule') {
        console.log(`[TaskView] DEBUG - Copied schedule filter to vars:`, {
          key,
          value: selectedFilters[key],
          type: typeof selectedFilters[key],
          isArray: Array.isArray(selectedFilters[key])
        })
      }
    }
  }
}

export type TaskViewProps = BusinessAppContextProps

export const TaskView: React.FC<TaskViewProps> = context => {
  const { fetchInvestmentTasks } = useInvestmentTasks(context)
  const taskStatistics = useInvestmentTaskStatistics(context)

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

  const config: TaskViewConfig<InvestmentTask, InvestmentTaskQueryVariables> = useMemo(
    () => ({
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

      fetchTeamTasks: async (variables: InvestmentTaskQueryVariables) => {
        const result = await fetchInvestmentTasks(variables)
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
        // Debug: Log schedule and createdAt filters
        console.log('[TaskView] DEBUG - schedule filter:', {
          raw: params.selectedFilters.schedule,
          type: typeof params.selectedFilters.schedule,
          isArray: Array.isArray(params.selectedFilters.schedule),
          value: params.selectedFilters.schedule
        })
        console.log('[TaskView] DEBUG - createdAt filter:', {
          raw: params.selectedFilters.createdAtRange,
          type: typeof params.selectedFilters.createdAtRange,
          isArray: Array.isArray(params.selectedFilters.createdAtRange),
          value: params.selectedFilters.createdAtRange
        })

        const vars: InvestmentTaskQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        const dateRangeKeys = ['createdAtRange', 'updatedAtRange', 'dueDateRange', 'startDateRange', 'endDateRange']

        // Process reference type filter using helper
        processInvestmentReferenceTypeFilter(params.selectedFilters, vars)

        // Process date range filters using helper
        processInvestmentTaskDateRanges(params.selectedFilters, vars)

        // Copy all other filters using helper
        copyInvestmentTaskFilters(params.selectedFilters, dateRangeKeys, vars)

        // Debug: Log final vars before returning
        console.log('[TaskView] DEBUG - Final vars:', {
          schedule: (vars as any).schedule,
          createdAtFrom: (vars as any).createdAtFrom,
          createdAtTo: (vars as any).createdAtTo,
          createdAtRange: params.selectedFilters.createdAtRange
        })

        // Use column ID directly - buildOrderBy will use descriptors (INVESTMENT_TASK_DESCRIPTORS)
        // to resolve correct GraphQL paths (e.g., taskType.value, taskPriority.value, taskStatus.value)
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
        entityContext: FlowContextName.investmentTaskEntity,
        createContext: FlowContextName.investmentTaskCreate
      },

      taskStatistics,

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
    }),
    [context, fetchInvestmentTasks, taskStatistics, buildReferenceUrl]
  )

  return (
    <TaskLayout<InvestmentTask, InvestmentTaskQueryVariables>
      context={context}
      config={config}
      dataTestId="investment-task-view"
    />
  )
}

export default TaskView
