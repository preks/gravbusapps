import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { useActivityExport } from './hooks/useActivityExport'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { Activity, ActivityReference } from '@/common/data/relations/types/activityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { ActivityListLayout } from './components/ActivityListLayout'
import { ActivityStatisticsCard, type ActivityStatisticsData } from './components/ActivityStatisticsCard'
import { ActivityDetailSheet } from '@/common/components/common-relations/detail-sheets/activity-detail-sheet'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '../task-layout/utils/filterHelpers'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

export interface ActivityViewConfig<TActivity extends Activity = Activity, TQueryVariables = any> {
  fetchActivities: (variables: TQueryVariables) => Promise<{
    activities?: TActivity[]
    total?: number
  }>

  createColumns: (config?: any) => ColumnDef<TActivity>[]

  descriptors: Descriptor[]
  entityName: string

  baseFilterConfig: FilterConfiguration

  buildQueryVariables: (params: {
    pagination: { pageIndex: number; pageSize: number }
    searchTerm: string
    selectedFilters: Record<string, any>
    sorting: Array<{ id: string; desc: boolean }>
  }) => TQueryVariables

  sortableColumns: Array<{ id: string; label: string }>
  availableColumns: Array<{ id: string; label: string }>

  flowContexts: {
    entityContext: FlowContextName
    createContext: FlowContextName
    createContextData?: Record<string, any>
  }

  rowActionsContextArray?: FlowContextName[]
  buildRowActionsExternalContextData?: (row: { original: TActivity }) => Record<string, string>

  buildReferenceUrl?: (reference: ActivityReference) => string

  onRowClick?: (activity: TActivity) => void

  translations: {
    allActivities: { key: string; default: string }
    searchActivities: { key: string; default: string }
  }
}

export interface ActivityLayoutProps<TActivity extends Activity = Activity, TQueryVariables = any> {
  readonly context: BusinessAppContextProps
  readonly config: ActivityViewConfig<TActivity, TQueryVariables>
  readonly dataTestId?: string
  readonly initialFilters?: Record<string, any>
  readonly onFilterChange?: (filters: Record<string, any>) => void
  readonly initialSorting?: Array<{ id: string; desc: boolean }>
  readonly onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  readonly initialVisibleColumns?: string[]
  readonly onVisibleColumnsChange?: (columns: string[]) => void
  readonly hideFilters?: boolean
  readonly showOwnerEmployee?: boolean
  readonly secondaryActions?: React.ReactNode
  readonly enableExport?: boolean
  readonly exportFilenamePrefix?: string
  readonly kpiStatistics?: ActivityStatisticsData | null
  readonly kpiLoading?: boolean
  readonly kpiError?: Error | null
  readonly onKpiRetry?: () => void
}

const getExportButtonTitle = (isExporting: boolean, totalCount: number, format: string): string => {
  if (isExporting) return 'Exporting…'
  if (totalCount === 0) return 'No data to export'
  return `Export ${totalCount} activities as ${format}`
}

function ConfigActivityLayout<TActivity extends Activity = Activity, TQueryVariables = any>(
  props: Readonly<ActivityLayoutProps<TActivity, TQueryVariables>>
): React.ReactElement {
  const {
    context,
    config,
    dataTestId = 'activity-view',
    initialFilters = {},
    onFilterChange,
    initialSorting,
    onSortingChange,
    initialVisibleColumns,
    onVisibleColumnsChange,
    hideFilters = false,
    showOwnerEmployee = false,
    secondaryActions,
    enableExport = false,
    exportFilenamePrefix = 'activities',
    kpiStatistics,
    kpiLoading = false,
    kpiError = null,
    onKpiRetry
  } = props

  // View State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>(
    () => initialSorting ?? [{ id: 'createdAt', desc: true }]
  )
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => initialVisibleColumns ?? [])
  const [selectedActivity, setSelectedActivity] = useState<TActivity | null>(null)

  // Data State
  const [activities, setActivities] = useState<TActivity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use centralized filter groups hook
  const filterGroups = useFilterGroups(context, config.entityName, config.descriptors, { limit: 100 })

  // Dynamic Filter Configuration
  const dynamicFilterConfig = useMemo(() => {
    return buildDynamicFilterConfig(config.baseFilterConfig, config.descriptors, filterGroups)
  }, [config.baseFilterConfig, config.descriptors, filterGroups])

  // Initialize visible columns
  useEffect(() => {
    if (visibleColumns.length === 0) {
      const defaultColumns = config.availableColumns.map(col => col.id)
      setVisibleColumns(defaultColumns)
    }
  }, [config.availableColumns, visibleColumns.length])

  // Query Variables
  const queryVariables = useMemo(
    () =>
      config.buildQueryVariables({
        pagination,
        searchTerm,
        selectedFilters,
        sorting
      }),
    [config, pagination, searchTerm, selectedFilters, sorting]
  )

  // Load Activities
  const loadActivities = useCallback(
    async (showLoading: boolean = true) => {
      if (!context.accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await config.fetchActivities(queryVariables)
        setActivities(result.activities || [])
        setTotalCount(result.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activities')
        setActivities([])
        setTotalCount(0)
      } finally {
        if (showLoading) setIsLoading(false)
      }
    },
    [context.accessToken, config, queryVariables]
  )

  // Load activities on mount and when dependencies change
  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    loadActivities(false)
    // Also refresh KPIs when process completes
    onKpiRetry?.()
  }, [loadActivities, onKpiRetry])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  // Handle search change
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value)
      setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
    },
    [pagination.pageSize]
  )

  // Handle filter change
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      setSelectedFilters(filters)
      setPagination({ pageIndex: 0, pageSize: pagination.pageSize })
      onFilterChange?.(filters)
    },
    [pagination.pageSize, onFilterChange]
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

  // Handle activity click
  const handleActivityClick = useCallback(
    (activity: TActivity) => {
      // Open activity detail sheet
      setSelectedActivity(activity)

      // Also call custom click handler if provided
      if (config.onRowClick) {
        config.onRowClick(activity)
      }
    },
    [config]
  )

  // Create columns with config
  const allColumns = useMemo(() => config.createColumns({ showOwnerEmployee }), [config, showOwnerEmployee])

  // Filter columns based on visibility
  const columns = useMemo(
    () => allColumns.filter(col => visibleColumns.includes(col.id as string)),
    [allColumns, visibleColumns]
  )

  // Row actions
  const rowActions = useMemo(
    () =>
      config.rowActionsContextArray && config.buildRowActionsExternalContextData
        ? (row: { original: TActivity }) => {
            const contextData = config.buildRowActionsExternalContextData!(row)
            return (
              <AppAction
                variant="table-row"
                contexts={config.rowActionsContextArray.map(ctx => ({ context: ctx, contextData }))}
                accessToken={context.accessToken}
                data-testid={`activity-${row.original.id}-actions`}
              />
            )
          }
        : undefined,
    [config, context.accessToken]
  )

  // Export hook — always called (hooks must not be conditional)
  const { isExporting, handleExportCsv, handleExportExcel } = useActivityExport({
    fetchActivities: config.fetchActivities as any,
    queryVariables,
    totalCount,
    filenamePrefix: exportFilenamePrefix
  })

  // Combine export buttons with any external secondaryActions
  const combinedSecondaryActions = useMemo(() => {
    if (!enableExport) return secondaryActions

    const csvTitle = getExportButtonTitle(isExporting, totalCount, 'CSV')
    const excelTitle = getExportButtonTitle(isExporting, totalCount, 'Excel')

    const exportButtons = (
      <>
        <Button
          onClick={handleExportCsv}
          variant="outline"
          size="sm"
          disabled={isExporting || totalCount === 0}
          data-testid="activity-export-csv-button"
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
          data-testid="activity-export-excel-button"
          title={excelTitle}
        >
          <FileXlsIcon className="gba:mr-2" />
          {isExporting ? 'Exporting…' : 'Excel'}
        </Button>
        {secondaryActions}
      </>
    )
    return exportButtons
  }, [enableExport, isExporting, totalCount, handleExportCsv, handleExportExcel, secondaryActions])

  return (
    <div data-testid={dataTestId} className="gba:flex gba:flex-col gba:gap-4">
      {kpiStatistics && (
        <ActivityStatisticsCard
          statistics={kpiStatistics}
          isLoading={kpiLoading}
          error={kpiError}
          onRetry={onKpiRetry}
        />
      )}

      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: config.translations.allActivities.default,
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={config.translations.searchActivities.default}
        onSearchChange={handleSearchChange}
        filters={hideFilters ? undefined : selectedFilters}
        filterConfiguration={hideFilters ? undefined : dynamicFilterConfig}
        onFilterChange={hideFilters ? undefined : handleFilterChange}
        sorting={sorting}
        sortableColumns={config.sortableColumns}
        onSortingChange={handleSortingChange}
        availableColumns={config.availableColumns}
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
              accessToken={context.accessToken}
              data-testid="add-activity-action"
              emptyState="hide"
            >
              <Button size="sm" variant="default" data-testid="add-activity-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('common:addActivity', 'Add Activity')}
              </Button>
            </AppAction>
          ) : undefined
        }
        secondaryActions={combinedSecondaryActions}
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterActivities', 'Filter Activities')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterActivitiesDescription',
          'Apply filters to narrow down the activity list'
        )}
      >
        <ActivityListLayout<TActivity>
          data={activities}
          columns={columns}
          loading={isLoading}
          error={error}
          totalCount={totalCount}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={setPagination}
          onSortingChange={handleSortingChange}
          onRowClick={handleActivityClick}
          actions={rowActions}
          onRetry={loadActivities}
          dataTestId={`${dataTestId}-list`}
        />
      </DataDisplay>

      {/* Activity Detail Sheet */}
      <ActivityDetailSheet
        activity={selectedActivity as any}
        open={!!selectedActivity}
        onOpenChange={(open: boolean) => {
          if (!open) setSelectedActivity(null)
        }}
        buildReferenceUrl={(entityType: string, entityId: string) => {
          if (config.buildReferenceUrl) {
            return config.buildReferenceUrl({ type: entityType as any, id: entityId, name: '' })
          }
          return ''
        }}
        businessAppContext={context}
        data-testid={`${dataTestId}-detail-sheet`}
        accessToken={context.accessToken}
        flowContext={config.rowActionsContextArray?.[0]}
      />
    </div>
  )
}

export const ActivityLayout = ConfigActivityLayout
export default ActivityLayout
