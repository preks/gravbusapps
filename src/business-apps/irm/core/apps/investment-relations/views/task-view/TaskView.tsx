import { useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentTasks } from '@/common/data/investment/hooks/useInvestmentTasks'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
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
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'

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

export type TaskViewProps = BusinessAppContextProps

export const TaskView: React.FC<TaskViewProps> = context => {
  const docuSignEnabled = useFeature<boolean>(Feature.IRM.DocuSign.Key) === true
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('irm:investment-task-preferences:v1')

  const investmentTasksHook = useInvestmentTasks(context)
  const { fetchInvestmentTasks } = investmentTasksHook
  const taskStatistics = useInvestmentTaskStatistics(context)

  // Build reference URLs for IRM context
  const buildReferenceUrl = useCallback((reference: TaskReference): string => {
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
  }, [])

  // Memoize fetchTasks wrapper separately to keep reference stable
  const fetchTasks = useCallback(
    async (variables: InvestmentTaskQueryVariables) => {
      const result = await fetchInvestmentTasks(variables)
      return {
        tasks: result.tasks as any,
        total: result.total || 0
      }
    },
    [fetchInvestmentTasks]
  )

  // Memoize buildQueryVariables separately to keep reference stable
  const buildQueryVariables = useCallback((params: any) => {
    const trimmedSearch = params.searchTerm.trim()
    const vars: InvestmentTaskQueryVariables = {
      limit: params.pagination.pageSize,
      offset: params.pagination.pageIndex * params.pagination.pageSize,
      search: trimmedSearch || undefined
    }

    // Scope free-text search to the visible table columns to keep the generated _or small.
    if (trimmedSearch && params.visibleColumns?.length) {
      vars.searchDescriptorKeys = params.visibleColumns
    }

    const dateRangeKeys = ['createdAtRange', 'updatedAtRange', 'dueDateRange', 'startDateRange', 'endDateRange']

    // Process reference type filter using helper
    processInvestmentReferenceTypeFilter(params.selectedFilters, vars)

    // Process date range filters using helper
    processInvestmentTaskDateRanges(params.selectedFilters, vars)

    // Copy all other filters using helper
    copyInvestmentTaskFilters(params.selectedFilters, dateRangeKeys, vars)

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
  }, [])

  const config: TaskViewConfig<InvestmentTask, InvestmentTaskQueryVariables> = useMemo(() => {
    return {
      fetchTasks,

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

      buildQueryVariables,

      flowContexts: {
        entityContext: FlowContextName.investmentTaskEntity,
        createContext: FlowContextName.investmentTaskCreate
      },

      taskStatistics: {
        statistics: taskStatistics.teamTasksStatistics,
        isLoading: taskStatistics.isLoading,
        error: taskStatistics.error,
        refetch: taskStatistics.refetch
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
  }, [fetchTasks, buildQueryVariables, taskStatistics, buildReferenceUrl])

  return (
    <TaskLayout<InvestmentTask, InvestmentTaskQueryVariables>
      context={context}
      config={config}
      dataTestId="investment-task-view"
      enableExport
      exportFilenamePrefix="irm-tasks"
      initialFilters={initialFilters}
      onFilterChange={saveFilters}
      initialSorting={initialSorting ?? undefined}
      onSortingChange={saveSorting}
      initialVisibleColumns={initialVisibleColumns ?? undefined}
      onVisibleColumnsChange={saveVisibleColumns}
      docuSignEnabled={docuSignEnabled}
    />
  )
}

export default TaskView
