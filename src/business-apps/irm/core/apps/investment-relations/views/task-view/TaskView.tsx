import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentTasks } from '@/common/data/investment/hooks/useInvestmentTasks'
import { useInvestmentTaskFilters } from '@/common/data/investment/hooks/useInvestmentTaskFilters'
import { useInvestmentTaskStatistics } from '@/common/data/investment/hooks/useInvestmentTaskStatistics'
import { TaskLayout, type TaskViewConfig } from '@/common/components/common-relations/view-layouts/task-layout'
import type { InvestmentTask } from '@/common/data/investment/types/investmentTaskTypes'
import { INVESTMENT_TASK_DESCRIPTORS } from '@/common/data/investment/types/investmentTaskTypes'
import type { InvestmentTaskQueryVariables } from '@/common/data/investment/queries/investmentTaskQueries.new'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { TaskReference } from '@/common/data/relations/types/commonTaskTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { createTaskColumns } from '@/common/components/common-relations/view-layouts/task-layout/config'
import { taskFilterConfig } from '@/common/components/common-relations/view-layouts/task-layout/config'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

export type TaskViewProps = BusinessAppContextProps

export const TaskView: React.FC<TaskViewProps> = context => {
  const { fetchInvestmentTasks } = useInvestmentTasks(context)
  const taskStatistics = useInvestmentTaskStatistics(context)
  const taskFilters = useInvestmentTaskFilters(context)

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

      filterDataHook: () => taskFilters,

      createColumns: () => createTaskColumns() as any,
      descriptors: INVESTMENT_TASK_DESCRIPTORS,
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

        // Handle referenceType filter (no Descriptor - special case)
        if (
          params.selectedFilters.referenceType &&
          Array.isArray(params.selectedFilters.referenceType) &&
          params.selectedFilters.referenceType.length > 0
        ) {
          vars.referenceTypes = params.selectedFilters.referenceType
        }

        // Normalize date range filters
        const dateRangeKeys = ['createdAtRange', 'updatedAtRange', 'dueDateRange', 'startDateRange', 'endDateRange']
        dateRangeKeys.forEach(rangeKey => {
          const rawValue = params.selectedFilters[rangeKey]
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
        })

        // Copy all other filters directly (they now match Descriptor-Keys)
        Object.keys(params.selectedFilters).forEach(key => {
          if (
            key !== 'referenceType' &&
            !dateRangeKeys.includes(key) &&
            params.selectedFilters[key] !== undefined &&
            params.selectedFilters[key] !== null
          ) {
            vars[key as keyof InvestmentTaskQueryVariables] = params.selectedFilters[key]
            if (key === 'schedule') {
              console.log(`[TaskView] DEBUG - Copied schedule filter to vars:`, {
                key,
                value: params.selectedFilters[key],
                type: typeof params.selectedFilters[key],
                isArray: Array.isArray(params.selectedFilters[key])
              })
            }
          }
        })

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

      processCompletionEvents: [
        'com.newwork.process.taskCompletion',
        'com.newwork.process.completion',
        'com.newwork.process.continue',
        'com.newwork.process.processCompletion',
        'processCompletion',
        'taskCompletion',
        'taskCompleted'
      ],

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
    [context, fetchInvestmentTasks, taskStatistics, taskFilters, buildReferenceUrl]
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
