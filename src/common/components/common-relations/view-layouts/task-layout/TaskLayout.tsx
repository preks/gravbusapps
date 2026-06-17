import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { useTaskExport } from './hooks/useTaskExport'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskListLayout } from './components/TaskListLayout'
import { SingleTaskStatistics } from './components/SingleTaskStatistics'
import type { TaskStatisticsData } from './components/TaskStatisticsCard'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import type { Task, TaskReference } from '@/common/data/relations/types/taskTypes'
import { TaskDetailSheet } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { deriveSortableColumns } from '@/common/network/graphql/descriptorUtils'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from './utils/filterHelpers'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
export type { TaskStatisticsData } from './components/TaskStatisticsCard'

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
    /** Column ids currently visible in the table; used to scope free-text search. */
    visibleColumns?: string[]
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
  enableExport?: boolean
  exportFilenamePrefix?: string
  /** Called whenever the user changes filters — use to persist filter state externally. */
  onFilterChange?: (filters: Record<string, any>) => void
  initialSorting?: Array<{ id: string; desc: boolean }>
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  initialVisibleColumns?: string[]
  onVisibleColumnsChange?: (columns: string[]) => void
  /** When true, DocuSign signing UI is shown in the task detail sheet (set by CRM/IRM parents from FeatureHub). */
  docuSignEnabled?: boolean
}

const getTaskExportButtonTitle = (isExporting: boolean, totalCount: number, format: string): string => {
  if (isExporting) return 'Exporting…'
  if (totalCount === 0) return 'No data to export'
  return `Export ${totalCount} tasks as ${format}`
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
    customPrimaryAction,
    enableExport = false,
    exportFilenamePrefix = 'tasks',
    onFilterChange: onFilterChangeProp,
    initialSorting: initialSortingProp,
    onSortingChange: onSortingChangeProp,
    initialVisibleColumns: initialVisibleColumnsProp,
    onVisibleColumnsChange: onVisibleColumnsChangeProp,
    docuSignEnabled = false
  } = props
  const { accessToken, userInfo } = context

  // View State (Single Tab - Team Tasks Only)
  const [selectedTask, setSelectedTask] = useState<TTask | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Debounce the term that drives the query so typing fires a single request instead of one per
  // keystroke. Clearing the input (the X button) bypasses the debounce so results reset instantly.
  // The design system DataDisplay/DataToolbar already debounces search (300ms) before
  // firing onSearchChange, so we only normalize whitespace here (no extra debounce).
  const effectiveSearchTerm = searchTerm.trim() === '' ? '' : searchTerm
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>(
    () => initialSortingProp ?? [{ id: 'createdAt', desc: true }]
  )
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // Column Visibility (Team Tasks — restored from storage or defaults)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    () =>
      initialVisibleColumnsProp ?? [
        'name',
        'assignedTo',
        'taskType',
        'taskPriority',
        'taskStatus',
        'reference',
        'dueDate',
        'createdAt'
      ]
  )

  // Data State
  const [tasks, setTasks] = useState<TTask[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Monotonically increasing id used to discard stale responses: a slow request started earlier
  // must never overwrite the results of a newer one that already resolved.
  const latestRequestIdRef = useRef(0)
  // Track previous search/pagination/filters so reloads triggered by them show the loading
  // skeleton, while sort-only reloads keep the current rows visible.
  const previousSearchRef = useRef(effectiveSearchTerm)
  const previousPaginationRef = useRef(pagination)
  const previousFiltersRef = useRef(selectedFilters)

  // Use centralized filter groups hook
  const filterGroups = useFilterGroups(context, config.entityName, config.descriptors, { limit: 100 })

  // Dynamic Filter Configuration
  const dynamicFilterConfig = useMemo(() => {
    return buildDynamicFilterConfig(config.baseFilterConfig, config.descriptors, filterGroups)
  }, [config.baseFilterConfig, config.descriptors, filterGroups])

  // Scope search to the visible columns only while a search is active. Passing `undefined`
  // when there is no search term keeps the reference stable, so toggling column visibility
  // does not retrigger the query.
  const searchVisibleColumns = effectiveSearchTerm.trim() ? visibleColumns : undefined

  // Query Variables
  // Build query variables from filter state
  // NOTE: Deliberately NOT including config.buildQueryVariables in deps - function is stable
  // We only want to rebuild when actual query params (pagination, filters, etc.) change
  // NOTE: `userInfo` is deliberately NOT passed here. It is an unstable reference from the
  // platform context (often a new object per parent render); including it would rebuild
  // queryVariables and refetch on every render, racing with the search debounce. The task
  // query builders don't use it anyway. This mirrors the lead/account/contact layouts.
  const queryVariables = useMemo(
    () =>
      config.buildQueryVariables({
        pagination,
        searchTerm: effectiveSearchTerm,
        selectedFilters,
        sorting,
        visibleColumns: searchVisibleColumns
      }),
    [pagination, effectiveSearchTerm, searchVisibleColumns, selectedFilters, sorting]
  )

  // Load Tasks
  // NOTE: Deliberately NOT including config.fetchTasks in deps - function is stable
  // We only want to recreate when accessToken or queryVariables actually change
  const loadTasks = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      const requestId = latestRequestIdRef.current + 1
      latestRequestIdRef.current = requestId

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await config.fetchTasks(queryVariables)
        if (requestId !== latestRequestIdRef.current) return
        setTasks(result.tasks || [])
        setTotalCount(result.total || 0)
      } catch (err) {
        if (requestId !== latestRequestIdRef.current) return
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (requestId === latestRequestIdRef.current) {
          if (showLoading) setIsLoading(false)
          setIsInitialLoad(false)
        }
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

    const searchChanged = previousSearchRef.current !== effectiveSearchTerm
    const paginationChanged =
      previousPaginationRef.current.pageIndex !== pagination.pageIndex ||
      previousPaginationRef.current.pageSize !== pagination.pageSize
    const filtersChanged = previousFiltersRef.current !== selectedFilters

    previousSearchRef.current = effectiveSearchTerm
    previousPaginationRef.current = pagination
    previousFiltersRef.current = selectedFilters

    // Show the loading skeleton for search, pagination and filter changes; keep current rows
    // for sort-only reloads to avoid a jarring full re-render.
    loadTasks(searchChanged || paginationChanged || filtersChanged)
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
    setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterUpdate = useCallback(
    (filters: Record<string, any>) => {
      setSelectedFilters(filters)
      setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }))
      onFilterChangeProp?.(filters)
    },
    [onFilterChangeProp]
  )

  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      setSorting(newSorting)
      onSortingChangeProp?.(newSorting)
    },
    [onSortingChangeProp]
  )

  const handleVisibleColumnsChange = useCallback(
    (newColumns: string[]) => {
      setVisibleColumns(newColumns)
      onVisibleColumnsChangeProp?.(newColumns)
    },
    [onVisibleColumnsChangeProp]
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

  // Export hook — always called (hooks must not be conditional)
  const { isExporting, handleExportCsv, handleExportExcel } = useTaskExport({
    fetchTasks: config.fetchTasks as any,
    queryVariables,
    totalCount,
    filenamePrefix: exportFilenamePrefix
  })

  // Export buttons — only rendered when enableExport is true
  const exportButtons = useMemo(() => {
    if (!enableExport) return null
    const csvTitle = getTaskExportButtonTitle(isExporting, totalCount, 'CSV')
    const excelTitle = getTaskExportButtonTitle(isExporting, totalCount, 'Excel')
    return (
      <>
        <Button
          onClick={handleExportCsv}
          variant="outline"
          size="sm"
          disabled={isExporting || totalCount === 0}
          data-testid="task-export-csv-button"
          title={csvTitle}
        >
          <DownloadIcon className="gba:mr-2" />
          {isExporting ? 'Exporting…' : 'CSV'}
        </Button>
        <Button
          onClick={handleExportExcel}
          variant="outline"
          size="sm"
          disabled={isExporting || totalCount === 0}
          data-testid="task-export-excel-button"
          title={excelTitle}
        >
          <FileXlsIcon className="gba:mr-2" />
          {isExporting ? 'Exporting…' : 'Excel'}
        </Button>
      </>
    )
  }, [enableExport, isExporting, totalCount, handleExportCsv, handleExportExcel])

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
        onSortingChange={handleSortingChange}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={handleVisibleColumnsChange}
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
        secondaryActions={exportButtons}
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
          onSortingChange={handleSortingChange}
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
        assignedUserId={selectedTask?.taskAssignees?.[0]?.assignedUserId}
        currentUserId={userInfo?.id}
        flowContext={config.flowContexts.entityContext}
        docuSignEnabled={docuSignEnabled}
        onTaskCompleted={() => loadTasks(false)}
      />
    </div>
  )
}

export const TaskLayout = ConfigTaskLayout
export default TaskLayout
