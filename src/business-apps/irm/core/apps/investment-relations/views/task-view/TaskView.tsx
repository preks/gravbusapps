import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentTasks } from '@/common/data/investment/hooks/useInvestmentTasks'
import { useInvestmentTaskFilters } from '@/common/data/investment/hooks/useInvestmentTaskFilters'
import { useInvestmentTaskStatistics } from '@/common/data/investment/hooks/useInvestmentTaskStatistics'
import { TaskLayout, type TaskViewConfig } from '@/common/components/common-relations/view-layouts/task-layout'
import type { InvestmentTask } from '@/common/data/investment/types/investmentTaskTypes'
import type { InvestmentTaskQueryVariables } from '@/common/data/investment/queries/investmentTaskQueries'
import type { TaskReference } from '@/common/data/relations/types/commonTaskTypes'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  createTaskColumns,
  createTaskSortableColumns,
  createTaskColumnToGraphQLMapping
} from '@/common/components/common-relations/view-layouts/task-layout/config'
import { taskFilterConfig } from '@/common/components/common-relations/view-layouts/task-layout/config'
import { applyTaskFilters } from '@/common/components/common-relations/view-layouts/task-layout/utils/queryHelpers'
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
      createSortableColumns: createTaskSortableColumns,

      // IRM uses default mapping (taskType, taskPriority, taskStatus)
      mapColumnToGraphQLField: createTaskColumnToGraphQLMapping(),

      baseFilterConfig: taskFilterConfig,

      buildQueryVariables: params => {
        const vars: InvestmentTaskQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        applyTaskFilters(vars, params.selectedFilters)

        if (params.sorting.length > 0) {
          vars.orderBy = [
            {
              field: params.mapColumnToGraphQLField(params.sorting[0].id) as any,
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
