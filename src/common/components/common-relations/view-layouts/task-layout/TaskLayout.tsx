import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskListLayout } from './components/TaskListLayout'
import { SingleTaskStatistics } from './components/SingleTaskStatistics'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import type { Task, TaskReference } from '@/common/data/relations/types/taskTypes'
import { TaskDetailSheet } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { deriveSortableColumns } from '@/common/network/graphql/descriptorUtils'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from './utils/filterHelpers'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

/**
 * Task Statistics Data (Single Set)
 */
export interface TaskStatisticsData {
  totalTasks: { value: number }
  inProgress: { value: number }
  completed: { value: number }
  overdue: { value: number }
}

/**
 * Task View Configuration (Single-Tab Mode - Team Tasks Only)
 * Generic configuration for TaskLayout with domain-specific types
 * @template TTask - Task type extending Task (e.g., CustomerTask, InvestmentTask)
 * @template TQueryVariables - GraphQL query variables type
 */
export interface TaskViewConfig<TTask extends Task = Task, TQueryVariables = any> {
  fetchTasks: (variables: TQueryVariables) => Promise<{
    tasks?: TTask[]
    total?: number
  }>

  createColumns: () => ColumnDef<TTask>[]
  descriptors: Descriptor[]
  columnLabels?: Record<string, string>
  entityName: string

  baseFilterConfig: FilterConfiguration

  buildQueryVariables: (params: {
    pagination: { pageIndex: number; pageSize: number }
    searchTerm: string
    selectedFilters: Record<string, any>
    sorting: Array<{ id: string; desc: boolean }>
    userInfo?: any
  }) => TQueryVariables

  flowContexts: {
    entityContext: FlowContextName
    createContext: FlowContextName
    createContextData?: Record<string, any>
  }

  taskStatistics: {
    statistics: TaskStatisticsData
    isLoading: boolean
    error: Error | null
    refetch: () => void
  }

  rowActionsContextArray: FlowContextName[]
  buildRowActionsExternalContextData: (row: { original: TTask }) => Record<string, string>

  buildReferenceUrl?: (reference: TaskReference) => string

  onTaskClick?: (task: TTask) => void
}

/**
 * Task Layout Props
 * @template TTask - Task type extending Task (e.g., CustomerTask, InvestmentTask)
 * @template TQueryVariables - GraphQL query variables type
 */
export interface TaskLayoutProps<TTask extends Task = Task, TQueryVariables = any> {
  context: BusinessAppContextProps
  config: TaskViewConfig<TTask, TQueryVariables>
  dataTestId?: string
  initialFilters?: Record<string, any>
  hideFilters?: boolean
  customPrimaryAction?: React.ReactNode
}

/**
 * Generic Task Layout Component
 * Provides common task management functionality with domain-specific customization
 * @template TTask - Task type extending Task
 * @template TQueryVariables - GraphQL query variables type
 */
interface TaskRowActionsProps<TTask extends Task> {
  row: { original: TTask }
  config: TaskViewConfig<TTask, any>
  accessToken: string
}

const TaskRowActions = <TTask extends Task = Task>({ row, config, accessToken }: TaskRowActionsProps<TTask>) => (
  <AppActionMenu
    contextsArray={config.rowActionsContextArray}
    externalContextData={config.buildRowActionsExternalContextData(row)}
    prefixDataTestId="task-actions"
    accessToken={accessToken}
    emptyStateBehavior="enable"
    deferMainContextRequestsUntilClick
  >
    <Button variant="ghost" size="icon" data-testid={`task-actions-${row.original.id}`}>
      <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
        />
      </svg>
    </Button>
  </AppActionMenu>
)

function ConfigTaskLayout<TTask extends Task = Task, TQueryVariables = any>(
  props: TaskLayoutProps<TTask, TQueryVariables>
): React.ReactElement {
  const {
    context,
    config,
    dataTestId = 'task-view',
    initialFilters = {},
    hideFilters = false,
    customPrimaryAction
  } = props
  const { accessToken, userInfo } = context

  // View State (Single Tab - Team Tasks Only)
  const [selectedTask, setSelectedTask] = useState<TTask | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // Column Visibility (Team Tasks - show assignedTo column)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'assignedTo',
    'taskType',
    'taskPriority',
    'taskStatus',
    'reference',
    'dueDate',
    'createdAt'
  ])

  // Data State
  const [tasks, setTasks] = useState<TTask[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Use centralized filter groups hook
  const filterGroups = useFilterGroups(context, config.entityName, config.descriptors, { limit: 100 })

  // Dynamic Filter Configuration
  const dynamicFilterConfig = useMemo(() => {
    return buildDynamicFilterConfig(config.baseFilterConfig, config.descriptors, filterGroups)
  }, [config.baseFilterConfig, config.descriptors, filterGroups])

  // Query Variables
  // Build query variables from filter state
  // NOTE: Deliberately NOT including config.buildQueryVariables in deps - function is stable
  // We only want to rebuild when actual query params (pagination, filters, etc.) change
  const queryVariables = useMemo(
    () =>
      config.buildQueryVariables({
        pagination,
        searchTerm,
        selectedFilters,
        sorting,
        userInfo
      }),
    [pagination, searchTerm, selectedFilters, sorting, userInfo]
  )

  // Load Tasks
  // NOTE: Deliberately NOT including config.fetchTasks in deps - function is stable
  // We only want to recreate when accessToken or queryVariables actually change
  const loadTasks = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await config.fetchTasks(queryVariables)
        setTasks(result.tasks || [])
        setTotalCount(result.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setIsLoading(false)
        setIsInitialLoad(false)
      }
    },
    [accessToken, queryVariables]
  )

  // Initial load
  // NOTE: Deliberately NOT including loadTasks in deps - we only want initial load once when mounted
  useEffect(() => {
    if (!accessToken || !isInitialLoad) return
    loadTasks(true)
  }, [accessToken, isInitialLoad])

  // Reload data when filters/search/sort change (skip initial load)
  // NOTE: Deliberately NOT including loadTasks or isInitialLoad in deps
  // isInitialLoad is used as a guard but shouldn't trigger re-runs
  useEffect(() => {
    if (isInitialLoad || !accessToken) return
    loadTasks(false)
  }, [queryVariables, accessToken])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    loadTasks(false)
    // Also refresh statistics when process completes
    config.taskStatistics?.refetch?.()
  }, [loadTasks, config.taskStatistics])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  // Event Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterUpdate = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleTaskClick = useCallback(
    (task: TTask) => {
      // Open task detail sheet
      setSelectedTask(task)

      // Also call custom click handler if provided
      if (config.onTaskClick) {
        config.onTaskClick(task)
      }
    },
    [config]
  )

  // Columns (Team Tasks - include assignedTo column)
  const columns = useMemo(() => config.createColumns(), [config])

  const availableColumns = useMemo(
    () => [
      { id: 'name', label: 'Task' },
      { id: 'assignedTo', label: 'Assigned To' },
      { id: 'taskType', label: 'Type' },
      { id: 'taskPriority', label: 'Priority' },
      { id: 'taskStatus', label: 'Status' },
      { id: 'reference', label: 'Reference' },
      { id: 'dueDate', label: 'Due Date' },
      { id: 'createdBy', label: 'Created By' },
      { id: 'createdAt', label: 'Created' }
    ],
    []
  )

  // Row actions
  const rowActions = useMemo(
    () => (row: { original: TTask }) => <TaskRowActions row={row} config={config} accessToken={accessToken} />,
    [config, accessToken]
  )

  const sortableColumns = useMemo(() => {
    const availableColumnIds = availableColumns.map(col => col.id)
    return deriveSortableColumns(config.descriptors, config.columnLabels, availableColumnIds)
  }, [config.descriptors, config.columnLabels, availableColumns])

  return (
    <div data-testid={dataTestId}>
      {/* Statistics - Single set for Team Tasks */}
      {config.taskStatistics && (
        <SingleTaskStatistics
          statistics={config.taskStatistics.statistics}
          isLoading={config.taskStatistics.isLoading}
          error={config.taskStatistics.error}
          onRetry={() => {
            config.taskStatistics.refetch()
            loadTasks(false)
          }}
        />
      )}

      {/* DataDisplay - Single section for Team Tasks */}
      <DataDisplay
        titleSections={[
          {
            id: 'team',
            label: getTranslationFromI18nKeyAndLabel('common:teamTasks', 'Team Tasks'),
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="team"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('common:searchTasks', 'Search tasks...')}
        onSearchChange={handleSearch}
        filters={hideFilters ? undefined : selectedFilters}
        filterConfiguration={hideFilters ? undefined : dynamicFilterConfig}
        onFilterChange={hideFilters ? undefined : handleFilterUpdate}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={setSorting}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        primaryAction={
          customPrimaryAction ||
          (config.flowContexts.createContext ? (
            <AppAction
              contextsArray={[config.flowContexts.createContext]}
              externalContextData={config.flowContexts.createContextData}
              accessToken={accessToken}
              data-testid="add-task-action"
              emptyStateBehavior="hide"
            >
              <Button size="sm" variant="default" data-testid="add-task-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('common:addTask', 'Add Task')}
              </Button>
            </AppAction>
          ) : undefined)
        }
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterTasks', 'Filter Tasks')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterTasksDescription',
          'Apply filters to narrow down the task list'
        )}
      >
        <TaskListLayout<TTask>
          data={tasks}
          loading={isLoading}
          error={error}
          totalCount={totalCount}
          columns={columns.filter(col => visibleColumns.includes(col.id as string))}
          sorting={sorting}
          onSortingChange={setSorting}
          pagination={pagination}
          onPaginationChange={setPagination}
          actions={rowActions}
          onRowClick={handleTaskClick}
          dataTestId={`${dataTestId}-team`}
        />
      </DataDisplay>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask as any}
        open={!!selectedTask}
        onOpenChange={open => {
          if (!open) setSelectedTask(null)
        }}
        buildReferenceUrl={config.buildReferenceUrl}
        data-testid={`${dataTestId}-detail-sheet`}
        businessAppContext={context}
        accessToken={accessToken}
        flowContext={config.rowActionsContextArray?.[0]}
      />
    </div>
  )
}

export const TaskLayout = ConfigTaskLayout
export default TaskLayout
