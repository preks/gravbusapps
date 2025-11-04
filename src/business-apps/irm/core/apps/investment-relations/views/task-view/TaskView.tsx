import { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentTasks } from '@/common/data/investment/hooks/useInvestmentTasks'
import { useInvestmentTaskFilters } from '@/common/data/investment/hooks/useInvestmentTaskFilters'
import { useInvestmentTaskStatistics } from '@/common/data/investment/hooks/useInvestmentTaskStatistics'
import { TaskLayout, type TaskViewConfig } from '@/common/components/common-relations/view-layouts/task-layout'
import type { Task } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import type { InvestmentTaskQueryVariables } from '@/common/data/investment/queries/investmentTaskQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import {
  createTaskColumns,
  createTaskSortableColumns
} from '@/common/components/common-relations/view-layouts/task-layout/config'
import { taskFilterConfig } from '@/common/components/common-relations/view-layouts/task-layout/config'
import { TaskStatistics } from './components'
import {
  applyBasicFilters,
  applyDateFilter
} from '@/common/components/common-relations/view-layouts/task-layout/utils/queryHelpers'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
import { TaskDetailSheet } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

export type TaskViewProps = BusinessAppContextProps

export const TaskView: React.FC<TaskViewProps> = context => {
  const { fetchInvestmentTasks } = useInvestmentTasks(context)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

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

  const taskStatistics = useInvestmentTaskStatistics(context)
  const taskFilters = useInvestmentTaskFilters(context)

  const config: TaskViewConfig<Task, InvestmentTaskQueryVariables> = useMemo(
    () => ({
      fetchMyTasks: async (variables: InvestmentTaskQueryVariables) => {
        // For "my tasks", filter by current user's employee ID
        const employeeId = context.userInfo?.employeeDetails?.employeeId || context.userInfo?.id
        const myTasksVars: InvestmentTaskQueryVariables = {
          ...variables,
          assignedEmployeeIds: employeeId ? [employeeId] : []
        }
        const result = await fetchInvestmentTasks(myTasksVars)
        return {
          tasks: result.tasks || [],
          total: result.total || 0
        }
      },

      fetchTeamTasks: async (variables: InvestmentTaskQueryVariables) => {
        // For "team tasks", don't filter by employee - show all tasks
        const result = await fetchInvestmentTasks(variables)
        return {
          tasks: result.tasks || [],
          total: result.total || 0
        }
      },

      filterDataHook: () => taskFilters,

      createColumns: () => createTaskColumns() as any,
      createSortableColumns: createTaskSortableColumns,

      mapColumnToGraphQLField: (columnId: string): string => {
        const mapping: Record<string, string> = {
          name: 'name',
          dueDate: 'dueDate',
          createdAt: 'createdAt',
          updatedAt: 'updatedAt'
        }
        return mapping[columnId] || 'createdAt'
      },

      baseFilterConfig: taskFilterConfig,

      buildQueryVariables: (params: {
        pagination: { pageIndex: number; pageSize: number }
        searchTerm: string
        selectedFilters: Record<string, any>
        sorting: Array<{ id: string; desc: boolean }>
        mapColumnToGraphQLField: (columnId: string) => string
        userInfo?: any
      }) => {
        const vars: InvestmentTaskQueryVariables = {
          limit: params.pagination.pageSize,
          offset: params.pagination.pageIndex * params.pagination.pageSize,
          search: params.searchTerm.trim() || undefined
        }

        applyBasicFilters(vars, params.selectedFilters)
        applyDateFilter(vars, params.selectedFilters)

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

      renderStatistics: ({ onRefresh }) => {
        return (
          <TaskStatistics
            myTasksStatistics={taskStatistics.myTasksStatistics}
            teamTasksStatistics={taskStatistics.teamTasksStatistics}
            isLoading={taskStatistics.isLoading}
            error={taskStatistics.error}
            onRetry={onRefresh}
          />
        )
      },

      processCompletionEvents: [
        'com.newwork.process.taskCompletion',
        'com.newwork.process.completion',
        'com.newwork.process.continue',
        'com.newwork.process.processCompletion',
        'processCompletion',
        'taskCompletion',
        'taskCompleted'
      ],

      onTaskClick: (task: Task) => {
        setSelectedTask(task)
      }
    }),
    [context, fetchInvestmentTasks, taskStatistics, taskFilters]
  )

  return (
    <>
      <TaskLayout context={context} config={config} dataTestId="investment-task-view" />

      {/* Task Details Sheet */}
      <Sheet
        open={!!selectedTask}
        onOpenChange={open => {
          if (!open) setSelectedTask(null)
        }}
        title="Task Details"
      >
        <SheetContent className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
          <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
              {selectedTask?.name || 'Task Details'}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
            {selectedTask ? (
              <TaskDetailSheet
                task={selectedTask}
                buildReferenceUrl={buildReferenceUrl}
                data-testid="task-detail-sheet"
              />
            ) : (
              <div className="gba:p-4 gba:text-center gba:text-muted-foreground">No task selected</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default TaskView
