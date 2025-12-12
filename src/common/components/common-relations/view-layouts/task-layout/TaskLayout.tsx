import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskListLayout } from './components/TaskListLayout'
import { TaskStatisticsLayout } from './components/TaskStatisticsLayout'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import type { Task, TaskReference } from '@/common/data/relations/types/taskTypes'
import { TaskDetailSheet } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { deriveSortableColumns } from '@/common/network/graphql/descriptorUtils'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from './utils/filterHelpers'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

export type TaskTabKey = 'my' | 'team'

/**
 * Task View Configuration
 * Generic configuration for TaskLayout with domain-specific types
 * @template TTask - Task type extending Task (e.g., CustomerTask, InvestmentTask)
 * @template TQueryVariables - GraphQL query variables type
 */
export interface TaskViewConfig<TTask extends Task = Task, TQueryVariables = any> {
  fetchMyTasks: (variables: TQueryVariables) => Promise<{
    tasks?: TTask[]
    total?: number
  }>

  fetchTeamTasks: (variables: TQueryVariables) => Promise<{
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
    myTasksStatistics: {
      totalTasks: { value: number }
      inProgress: { value: number }
      completed: { value: number }
      overdue: { value: number }
    }
    teamTasksStatistics: {
      totalTasks: { value: number }
      inProgress: { value: number }
      completed: { value: number }
      overdue: { value: number }
    }
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

  // View State
  const [currentSection, setCurrentSection] = useState<TaskTabKey>('my')
  const [selectedTask, setSelectedTask] = useState<TTask | null>(null)

  // My Tasks State (independent)
  const [mySearchTerm, setMySearchTerm] = useState('')
  const [mySelectedFilters, setMySelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [mySorting, setMySorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [myPagination, setMyPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // Team Tasks State (independent)
  const [teamSearchTerm, setTeamSearchTerm] = useState('')
  const [teamSelectedFilters, setTeamSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [teamSorting, setTeamSorting] = useState<Array<{ id: string; desc: boolean }>>([
    { id: 'createdAt', desc: true }
  ])
  const [teamPagination, setTeamPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // Computed: Current section's state
  const searchTerm = currentSection === 'my' ? mySearchTerm : teamSearchTerm
  const selectedFilters = currentSection === 'my' ? mySelectedFilters : teamSelectedFilters
  const sorting = currentSection === 'my' ? mySorting : teamSorting
  const pagination = currentSection === 'my' ? myPagination : teamPagination

  // My Tasks Visibility (hide assignedTo column)
  const [myVisibleColumns, setMyVisibleColumns] = useState<string[]>([
    'name',
    'taskType',
    'taskPriority',
    'taskStatus',
    'reference',
    'dueDate',
    'createdAt'
  ])

  // Team Tasks Visibility (show assignedTo column)
  const [teamVisibleColumns, setTeamVisibleColumns] = useState<string[]>([
    'name',
    'assignedTo',
    'taskType',
    'taskPriority',
    'taskStatus',
    'reference',
    'dueDate',
    'createdAt'
  ])

  const visibleColumns = currentSection === 'my' ? myVisibleColumns : teamVisibleColumns
  const setVisibleColumns = currentSection === 'my' ? setMyVisibleColumns : setTeamVisibleColumns

  // My Tasks Data State
  const [myTasks, setMyTasks] = useState<TTask[]>([])
  const [myTotalCount, setMyTotalCount] = useState(0)
  const [myLoading, setMyLoading] = useState(true)
  const [myError, setMyError] = useState<string | null>(null)

  // Team Tasks Data State
  const [teamTasks, setTeamTasks] = useState<TTask[]>([])
  const [teamTotalCount, setTeamTotalCount] = useState(0)
  const [teamLoading, setTeamLoading] = useState(true)
  const [teamError, setTeamError] = useState<string | null>(null)

  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Use centralized filter groups hook
  const filterGroups = useFilterGroups(context, config.entityName, config.descriptors, { limit: 100 })

  // Dynamic Filter Configuration
  const dynamicFilterConfig = useMemo(() => {
    return buildDynamicFilterConfig(config.baseFilterConfig, config.descriptors, filterGroups)
  }, [config.baseFilterConfig, config.descriptors, filterGroups])

  // Query Variables
  const queryVariables = useMemo(
    () =>
      config.buildQueryVariables({
        pagination,
        searchTerm,
        selectedFilters,
        sorting,
        userInfo
      }),
    [pagination, searchTerm, selectedFilters, sorting, config, userInfo]
  )

  // Load My Tasks
  const loadMyTasks = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      if (showLoading) setMyLoading(true)
      setMyError(null)

      try {
        const result = await config.fetchMyTasks(queryVariables)
        setMyTasks(result.tasks || [])
        setMyTotalCount(result.total || 0)
      } catch (err) {
        setMyError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setMyLoading(false)
      }
    },
    [accessToken, config, queryVariables]
  )

  // Load Team Tasks
  const loadTeamTasks = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      if (showLoading) setTeamLoading(true)
      setTeamError(null)

      try {
        const result = await config.fetchTeamTasks(queryVariables)
        setTeamTasks(result.tasks || [])
        setTeamTotalCount(result.total || 0)
      } catch (err) {
        setTeamError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setTeamLoading(false)
      }
    },
    [accessToken, config, queryVariables]
  )

  // Initial parallel load: Load BOTH my and team tasks for badge counts
  useEffect(() => {
    if (!accessToken || !isInitialLoad) return

    const loadBothSections = async () => {
      await Promise.all([loadMyTasks(true), loadTeamTasks(true)])
      setIsInitialLoad(false)
    }

    loadBothSections()
  }, [accessToken, isInitialLoad, loadMyTasks, loadTeamTasks])

  // Reload data when filters/search/sort change (only for active section, skip initial load)
  useEffect(() => {
    if (isInitialLoad || !accessToken) return

    if (currentSection === 'my') {
      loadMyTasks(false)
    } else {
      loadTeamTasks(false)
    }
  }, [queryVariables, currentSection, isInitialLoad, accessToken, loadMyTasks, loadTeamTasks])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    loadMyTasks(false)
    loadTeamTasks(false)
    // Also refresh statistics when process completes
    config.taskStatistics?.refetch?.()
  }, [loadMyTasks, loadTeamTasks, config.taskStatistics?.refetch])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  // Event Handlers (section-aware)
  const handleSearch = useCallback(
    (value: string) => {
      if (currentSection === 'my') {
        setMySearchTerm(value)
        setMyPagination(prev => ({ ...prev, pageIndex: 0 }))
      } else {
        setTeamSearchTerm(value)
        setTeamPagination(prev => ({ ...prev, pageIndex: 0 }))
      }
    },
    [currentSection]
  )

  const handleFilterUpdate = useCallback(
    (filters: Record<string, any>) => {
      if (currentSection === 'my') {
        setMySelectedFilters(filters)
        setMyPagination(prev => ({ ...prev, pageIndex: 0 }))
      } else {
        setTeamSelectedFilters(filters)
        setTeamPagination(prev => ({ ...prev, pageIndex: 0 }))
      }
    },
    [currentSection]
  )

  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      if (currentSection === 'my') {
        setMySorting(newSorting)
      } else {
        setTeamSorting(newSorting)
      }
    },
    [currentSection]
  )

  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      if (currentSection === 'my') {
        setMyPagination(newPagination)
      } else {
        setTeamPagination(newPagination)
      }
    },
    [currentSection]
  )

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

  const handleRefreshStatistics = useCallback(() => {
    loadMyTasks(false)
    loadTeamTasks(false)
  }, [loadMyTasks, loadTeamTasks])

  // Columns (filter assignedTo for my tasks)
  const allColumns = useMemo(() => config.createColumns(), [config])
  const columns = useMemo(
    () => (currentSection === 'my' ? allColumns.filter(col => col.id !== 'assignedTo') : allColumns),
    [allColumns, currentSection]
  )

  const availableColumns = useMemo(
    () =>
      currentSection === 'my'
        ? [
            { id: 'name', label: 'Task' },
            { id: 'taskType', label: 'Type' },
            { id: 'taskPriority', label: 'Priority' },
            { id: 'taskStatus', label: 'Status' },
            { id: 'reference', label: 'Reference' },
            { id: 'dueDate', label: 'Due Date' },
            { id: 'createdBy', label: 'Created By' },
            { id: 'createdAt', label: 'Created' }
          ]
        : [
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
    [currentSection]
  )

  // Row actions
  const rowActions = useMemo(
    () => (row: { original: TTask }) => <TaskRowActions row={row} config={config} accessToken={accessToken} />,
    [config, accessToken]
  )

  // Current section data
  const currentData = currentSection === 'my' ? myTasks : teamTasks
  const currentTotal = currentSection === 'my' ? myTotalCount : teamTotalCount
  const currentLoading = currentSection === 'my' ? myLoading : teamLoading
  const currentError = currentSection === 'my' ? myError : teamError

  return (
    <div data-testid={dataTestId}>
      {/* Statistics */}
      {config.taskStatistics && (
        <TaskStatisticsLayout
          myTasksStatistics={config.taskStatistics.myTasksStatistics}
          teamTasksStatistics={config.taskStatistics.teamTasksStatistics}
          isLoading={config.taskStatistics.isLoading}
          error={config.taskStatistics.error}
          onRetry={() => {
            config.taskStatistics.refetch()
            handleRefreshStatistics()
          }}
        />
      )}
      {/* DataDisplay with titleSections as Tabs gba:bg-white gba:px-6 gba:rounded-xl gba:border*/}
      <div className="">
        <DataDisplay
          titleSections={[
            {
              id: 'my',
              label: getTranslationFromI18nKeyAndLabel('common:myTasks', 'My Tasks'),
              metadata: {
                count: myTotalCount,
                isLoading: myLoading
              }
            },
            {
              id: 'team',
              label: getTranslationFromI18nKeyAndLabel('common:teamTasks', 'Team Tasks'),
              metadata: {
                count: teamTotalCount,
                isLoading: teamLoading
              }
            }
          ]}
          currentSection={currentSection}
          onSectionChange={value => setCurrentSection(value as TaskTabKey)}
          searchValue={searchTerm}
          searchPlaceholder={getTranslationFromI18nKeyAndLabel('common:searchTasks', 'Search tasks...')}
          onSearchChange={handleSearch}
          filters={hideFilters ? undefined : selectedFilters}
          filterConfiguration={hideFilters ? undefined : dynamicFilterConfig}
          onFilterChange={hideFilters ? undefined : handleFilterUpdate}
          sorting={sorting}
          sortableColumns={useMemo(() => {
            const availableColumnIds = availableColumns.map(col => col.id)
            return deriveSortableColumns(config.descriptors, config.columnLabels, availableColumnIds)
          }, [config.descriptors, config.columnLabels, availableColumns])}
          onSortingChange={handleSortingChange}
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
            data={currentData}
            loading={currentLoading}
            error={currentError}
            totalCount={currentTotal}
            columns={columns.filter(col => visibleColumns.includes(col.id as string))}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            actions={rowActions}
            onRowClick={handleTaskClick}
            dataTestId={`${dataTestId}-${currentSection}`}
          />
        </DataDisplay>
      </div>
      {/* Task Detail Sheet - integrated into layout */}
      <TaskDetailSheet
        task={selectedTask as any}
        open={!!selectedTask}
        onOpenChange={open => {
          if (!open) setSelectedTask(null)
        }}
        buildReferenceUrl={config.buildReferenceUrl}
        data-testid={`${dataTestId}-detail-sheet`}
        businessAppContext={context}
      />
    </div>
  )
}

export const TaskLayout = ConfigTaskLayout
export default TaskLayout
