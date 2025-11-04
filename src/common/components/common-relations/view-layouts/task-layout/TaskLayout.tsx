import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, DataDisplay } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskListLayout } from './TaskListLayout'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DefaultTaskRowActions } from './TaskLayoutHelpers'

// Helper: Update filter options
const updateFilterOptions = (
  filterConfig: FilterConfiguration,
  groupId: string,
  filterId: string,
  options: Array<{ id: string; label: string }>
) => {
  if (options.length === 0) return

  const group = filterConfig.groups.find(g => g.id === groupId)
  if (!group) return

  const filter = group.filters.find(f => f.id === filterId)
  if (filter?.config && 'options' in filter.config) {
    filter.config.options = options
  }
}

export type TaskTabKey = 'my' | 'team'

export interface TaskViewConfig<TTask extends { id: string }, TQueryVariables> {
  fetchMyTasks: (variables: TQueryVariables) => Promise<{
    tasks?: TTask[]
    total?: number
  }>

  fetchTeamTasks: (variables: TQueryVariables) => Promise<{
    tasks?: TTask[]
    total?: number
  }>

  filterDataHook: (context: BusinessAppContextProps) => {
    types: Array<{ id: string; label: string }>
    statuses: Array<{ id: string; label: string }>
    priorities: Array<{ id: string; label: string }>
  }

  createColumns: () => ColumnDef<TTask>[]
  createSortableColumns: () => Array<{ id: string; label: string }>
  mapColumnToGraphQLField: (columnId: string) => string

  baseFilterConfig: FilterConfiguration

  buildQueryVariables: (params: {
    pagination: { pageIndex: number; pageSize: number }
    searchTerm: string
    selectedFilters: Record<string, any>
    sorting: Array<{ id: string; desc: boolean }>
    mapColumnToGraphQLField: (columnId: string) => string
    userInfo?: any
  }) => TQueryVariables

  flowContexts: {
    entityContext: FlowContextName
    createContext: FlowContextName
    createContextData?: Record<string, any>
  }

  renderStatistics: (props: {
    context: BusinessAppContextProps
    myTasksCount: number
    teamTasksCount: number
    onRefresh: () => void
  }) => React.ReactNode

  processCompletionEvents?: string[]

  renderRowActions?: (row: { original: TTask }, accessToken: string, section: TaskTabKey) => React.ReactNode

  onTaskClick?: (task: TTask) => void
}

export interface TaskLayoutProps<TTask extends { id: string } = any, TQueryVariables = any> {
  context: BusinessAppContextProps
  config: TaskViewConfig<TTask, TQueryVariables>
  dataTestId?: string
  initialFilters?: Record<string, any>
  hideFilters?: boolean
  hideStatistics?: boolean
  hideCreate?: boolean
  customPrimaryAction?: React.ReactNode
}

const ConfigTaskLayout = <TTask extends { id: string } = any, TQueryVariables = any>(
  props: TaskLayoutProps<TTask, TQueryVariables>
) => {
  const {
    context,
    config,
    dataTestId = 'task-view',
    initialFilters = {},
    hideFilters = false,
    hideStatistics = false,
    hideCreate = false,
    customPrimaryAction
  } = props
  const { accessToken, userInfo } = context

  // View State
  const [currentSection, setCurrentSection] = useState<TaskTabKey>('my')

  // Shared State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // My Tasks Visibility (hide assignedTo column)
  const [myVisibleColumns, setMyVisibleColumns] = useState<string[]>([
    'name',
    'type',
    'priority',
    'status',
    'reference',
    'dueDate',
    'createdAt'
  ])

  // Team Tasks Visibility (show assignedTo column)
  const [teamVisibleColumns, setTeamVisibleColumns] = useState<string[]>([
    'name',
    'assignedTo',
    'type',
    'priority',
    'status',
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

  // Dynamic Filter Data
  const filterData = config.filterDataHook(context)
  const { types, statuses, priorities } = filterData

  // Dynamic Filter Configuration
  const dynamicFilterConfig = useMemo(() => {
    const filterConfig = { ...config.baseFilterConfig }

    updateFilterOptions(
      filterConfig,
      'status-group',
      'status',
      statuses.map(s => ({ id: s.id, label: s.label }))
    )
    updateFilterOptions(
      filterConfig,
      'priority-group',
      'priority',
      priorities.map(p => ({ id: p.id, label: p.label }))
    )
    updateFilterOptions(
      filterConfig,
      'type-group',
      'type',
      types.map(t => ({ id: t.id, label: t.label }))
    )

    return filterConfig
  }, [types, statuses, priorities, config.baseFilterConfig])

  // Query Variables
  const queryVariables = useMemo(
    () =>
      config.buildQueryVariables({
        pagination,
        searchTerm,
        selectedFilters,
        sorting,
        mapColumnToGraphQLField: config.mapColumnToGraphQLField,
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
  }, [loadMyTasks, loadTeamTasks])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  useEffect(() => {
    const events = config.processCompletionEvents || ['taskCompletion', 'com.newwork.process.taskCompletion']
    const handlers = events.map(eventName => {
      const handler = () => handleProcessComplete()
      globalThis.addEventListener(eventName, handler)
      return { eventName, handler }
    })

    return () => {
      for (const { eventName, handler } of handlers) {
        globalThis.removeEventListener(eventName, handler)
      }
    }
  }, [handleProcessComplete, config.processCompletionEvents])

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
      // Call custom click handler if provided (e.g. to open sheet)
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
            { id: 'type', label: 'Type' },
            { id: 'priority', label: 'Priority' },
            { id: 'status', label: 'Status' },
            { id: 'reference', label: 'Reference' },
            { id: 'dueDate', label: 'Due Date' },
            { id: 'createdBy', label: 'Created By' },
            { id: 'createdAt', label: 'Created' }
          ]
        : [
            { id: 'name', label: 'Task' },
            { id: 'assignedTo', label: 'Assigned To' },
            { id: 'type', label: 'Type' },
            { id: 'priority', label: 'Priority' },
            { id: 'status', label: 'Status' },
            { id: 'reference', label: 'Reference' },
            { id: 'dueDate', label: 'Due Date' },
            { id: 'createdBy', label: 'Created By' },
            { id: 'createdAt', label: 'Created' }
          ],
    [currentSection]
  )

  // Row actions
  const rowActions = useMemo(
    () =>
      config.renderRowActions
        ? (row: { original: TTask }) => config.renderRowActions!(row, accessToken, currentSection)
        : (row: { original: TTask }) => (
            <DefaultTaskRowActions
              row={row}
              accessToken={accessToken}
              entityContext={config.flowContexts.entityContext}
              section={currentSection}
            />
          ),
    [config, accessToken, currentSection]
  )

  // Current section data
  const currentData = currentSection === 'my' ? myTasks : teamTasks
  const currentTotal = currentSection === 'my' ? myTotalCount : teamTotalCount
  const currentLoading = currentSection === 'my' ? myLoading : teamLoading
  const currentError = currentSection === 'my' ? myError : teamError

  return (
    <div data-testid={dataTestId}>
      {/* Statistics */}
      {!hideStatistics &&
        config.renderStatistics({
          context,
          myTasksCount: myTotalCount,
          teamTasksCount: teamTotalCount,
          onRefresh: handleRefreshStatistics
        })}

      {/* DataDisplay with titleSections as Tabs */}
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
        sortableColumns={config.createSortableColumns()}
        onSortingChange={setSorting}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        primaryAction={
          customPrimaryAction ||
          (hideCreate ? undefined : (
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
          ))
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
          onSortingChange={setSorting}
          pagination={pagination}
          onPaginationChange={setPagination}
          actions={rowActions}
          onRowClick={handleTaskClick}
          dataTestId={`${dataTestId}-${currentSection}`}
        />
      </DataDisplay>
    </div>
  )
}

export const TaskLayout = ConfigTaskLayout
export default TaskLayout
