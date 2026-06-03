import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Button, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { useTaskExport } from '@/common/components/common-relations/view-layouts/task-layout/hooks/useTaskExport'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { Task, TaskReference } from '@/common/data/relations/types/taskTypes'
import { TaskDetailSheet } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import { TaskListLayout } from '@/common/components/common-relations/view-layouts/task-layout/components/TaskListLayout'
import {
  TaskStatisticsCard,
  type TaskStatisticsData
} from '@/common/components/common-relations/view-layouts/task-layout/components/TaskStatisticsCard'
import { deriveSortableColumns, deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/task-layout/utils/filterHelpers'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

/**
 * My Tasks View Configuration
 * Generic configuration for My Tasks view in Personal Workspace
 */
export interface MyTasksViewConfig<TTask extends Task = Task, TQueryVariables = any> {
  fetchMyTasks: (variables: TQueryVariables) => Promise<{
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
}

export interface MyTasksViewProps<TTask extends Task = Task, TQueryVariables = any>
  extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  config: MyTasksViewConfig<TTask, TQueryVariables>
  dataTestId?: string
  initialFilters?: Record<string, any>
  onFilterChange?: (filters: Record<string, any>) => void
  initialSorting?: Array<{ id: string; desc: boolean }>
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  initialVisibleColumns?: string[]
  onVisibleColumnsChange?: (columns: string[]) => void
  hideFilters?: boolean
  enableExport?: boolean
  exportFilenamePrefix?: string
  docuSignEnabled?: boolean
}

/**
 * Task Row Actions Component
 */
interface TaskRowActionsProps<TTask extends Task> {
  row: { original: TTask }
  config: MyTasksViewConfig<TTask, any>
  accessToken: string
}

const TaskRowActions = <TTask extends Task = Task>({ row, config, accessToken }: TaskRowActionsProps<TTask>) => (
  <AppAction
    contexts={config.rowActionsContextArray.map(context => ({
      context,
      contextData: config.buildRowActionsExternalContextData(row)
    }))}
    variant="table-row"
    prefixDataTestId="task-actions"
    accessToken={accessToken}
    emptyState="enable"
    lazyLoad
    data-testid={`task-actions-${row.original.id}`}
  />
)

/**
 * Factory function to create row actions renderer
 * Extracted outside component to avoid nested component issues
 */
const createRowActionsRenderer = <TTask extends Task = Task>(
  config: MyTasksViewConfig<TTask, any>,
  accessToken: string
) => {
  return (row: { original: TTask }) => <TaskRowActions row={row} config={config} accessToken={accessToken} />
}

const getTaskExportTitle = (isExporting: boolean, totalCount: number, format: string): string => {
  if (isExporting) return 'Exporting…'
  if (totalCount === 0) return 'No data to export'
  return `Export ${totalCount} tasks as ${format}`
}

/**
 * Generic My Tasks View Component
 * Displays user's personal tasks with KPIs, filtering, sorting, and detail sheet
 */
function MyTasksViewComponent<TTask extends Task = Task, TQueryVariables = any>(
  props: Readonly<MyTasksViewProps<TTask, TQueryVariables>>
): React.ReactElement {
  const {
    config,
    accessToken,
    userInfo,
    dataTestId = 'my-tasks-view',
    initialFilters = {},
    onFilterChange,
    initialSorting,
    onSortingChange,
    initialVisibleColumns,
    onVisibleColumnsChange,
    hideFilters = false,
    enableExport = false,
    exportFilenamePrefix = 'my-tasks',
    docuSignEnabled = false
  } = props

  // View State — initialized from props (localStorage)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>(
    () => initialSorting ?? [{ id: 'createdAt', desc: true }]
  )
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => initialVisibleColumns ?? [])

  // Data State
  const [tasks, setTasks] = useState<TTask[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Detail Sheet State
  const [selectedTask, setSelectedTask] = useState<TTask | null>(null)

  // Store fetchMyTasks in ref to prevent unnecessary re-renders
  const fetchMyTasksRef = useRef(config.fetchMyTasks)
  useEffect(() => {
    fetchMyTasksRef.current = config.fetchMyTasks
  }, [config.fetchMyTasks])

  // Use centralized filter groups hook
  const filterGroups = useFilterGroups(
    { accessToken, userInfo } as BusinessAppContextProps,
    config.entityName,
    config.descriptors,
    { limit: 100 }
  )

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
    [pagination, searchTerm, selectedFilters, sorting, userInfo]
  )

  // Load Tasks
  const loadTasks = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await fetchMyTasksRef.current(queryVariables)
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

  // Store loadTasks in ref for useEffects
  const loadTasksRef = useRef(loadTasks)
  useEffect(() => {
    loadTasksRef.current = loadTasks
  }, [loadTasks])

  // Initial load
  useEffect(() => {
    if (!accessToken || !isInitialLoad) return
    loadTasksRef.current(true)
  }, [accessToken, isInitialLoad])

  // Reload data when filters/search/sort change (skip initial load)
  useEffect(() => {
    if (isInitialLoad || !accessToken) return
    loadTasksRef.current(false)
  }, [queryVariables, accessToken])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    loadTasksRef.current(false)
    config.taskStatistics?.refetch?.()
  }, [config.taskStatistics])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  // Event Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterUpdate = useCallback(
    (filters: Record<string, any>) => {
      setSelectedFilters(filters)
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
      onFilterChange?.(filters)
    },
    [onFilterChange]
  )

  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      setSorting(newSorting)
      onSortingChange?.(newSorting)
    },
    [onSortingChange]
  )

  const handleVisibleColumnsChange = useCallback(
    (newColumns: string[]) => {
      setVisibleColumns(newColumns)
      onVisibleColumnsChange?.(newColumns)
    },
    [onVisibleColumnsChange]
  )

  const handleTaskClick = useCallback((task: TTask) => {
    setSelectedTask(task)
  }, [])

  // Columns (filter out assignedTo for My Tasks)
  const allColumns = useMemo(() => config.createColumns(), [config])
  const columns = useMemo(() => allColumns.filter(col => col.id !== 'assignedTo'), [allColumns])
  const availableColumns = useMemo(() => deriveAvailableColumns(columns), [columns])
  const availableColumnIds = useMemo(() => availableColumns.map(col => col.id), [availableColumns])
  const sortableColumns = useMemo(
    () => deriveSortableColumns(config.descriptors, config.columnLabels, availableColumnIds),
    [config.descriptors, config.columnLabels, availableColumnIds]
  )

  // Initialize visible columns from defaults only when nothing is stored
  useEffect(() => {
    if (visibleColumns.length === 0 && availableColumns.length > 0 && !initialVisibleColumns) {
      setVisibleColumns(availableColumns.map(col => col.id))
    }
  }, [availableColumns, visibleColumns.length, initialVisibleColumns])

  // Row actions
  const rowActions = useMemo(() => createRowActionsRenderer(config, accessToken || ''), [config, accessToken])

  // Export hook — always called (hooks must not be conditional)
  const { isExporting, handleExportCsv, handleExportExcel } = useTaskExport({
    fetchTasks: config.fetchMyTasks as any,
    queryVariables,
    totalCount,
    filenamePrefix: exportFilenamePrefix
  })

  const exportButtons = useMemo(() => {
    if (!enableExport) return null
    return (
      <>
        <Button
          onClick={handleExportCsv}
          variant="outline"
          size="sm"
          disabled={isExporting || totalCount === 0}
          data-testid="my-tasks-export-csv-button"
          title={getTaskExportTitle(isExporting, totalCount, 'CSV')}
        >
          <DownloadIcon className="gba:mr-2" />
          {isExporting ? 'Exporting…' : 'CSV'}
        </Button>
        <Button
          onClick={handleExportExcel}
          variant="outline"
          size="sm"
          disabled={isExporting || totalCount === 0}
          data-testid="my-tasks-export-excel-button"
          title={getTaskExportTitle(isExporting, totalCount, 'Excel')}
        >
          <FileXlsIcon className="gba:mr-2" />
          {isExporting ? 'Exporting…' : 'Excel'}
        </Button>
      </>
    )
  }, [enableExport, isExporting, totalCount, handleExportCsv, handleExportExcel])

  return (
    <div data-testid={dataTestId} className="gba:space-y-6">
      {/* KPI Statistics */}
      <TaskStatisticsCard
        statistics={config.taskStatistics.statistics}
        isLoading={config.taskStatistics.isLoading}
        error={config.taskStatistics.error}
        onRetry={config.taskStatistics.refetch}
      />

      {/* Task List */}
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('common:myTasks', 'My Tasks'),
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="all"
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
          config.flowContexts.createContext ? (
            <AppAction
              contexts={[
                {
                  context: config.flowContexts.createContext,
                  contextData: config.flowContexts.createContextData || {}
                }
              ]}
              accessToken={accessToken || ''}
              data-testid="add-task-action"
              emptyState="hide"
            >
              <Button size="sm" variant="default" data-testid="add-task-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('common:addTask', 'Add Task')}
              </Button>
            </AppAction>
          ) : undefined
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
          dataTestId={`${dataTestId}-list`}
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
        businessAppContext={{ accessToken, userInfo } as BusinessAppContextProps}
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

export const MyTasksView = MyTasksViewComponent
export default MyTasksView
