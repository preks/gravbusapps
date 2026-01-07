import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Activity } from '@/common/data/relations/types/activityTypes'
import { ActivityListLayout } from './components/ActivityListLayout'

export interface ActivityViewConfig<TActivity extends Activity = Activity, TQueryVariables = any> {
  fetchActivities: (variables: TQueryVariables) => Promise<{
    activities?: TActivity[]
    total?: number
  }>

  createColumns: (config?: any) => ColumnDef<TActivity>[]

  baseFilterConfig: FilterConfiguration

  buildQueryVariables: (params: {
    pagination: { pageIndex: number; pageSize: number }
    searchTerm: string
    selectedFilters: Record<string, any>
    sorting: Array<{ id: string; desc: boolean }>
  }) => TQueryVariables

  sortableColumns: Array<{ id: string; label: string }>
  availableColumns: Array<{ id: string; label: string }>

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
  readonly hideFilters?: boolean
  readonly showOwnerEmployee?: boolean
  readonly secondaryActions?: React.ReactNode
}

function ConfigActivityLayout<TActivity extends Activity = Activity, TQueryVariables = any>(
  props: Readonly<ActivityLayoutProps<TActivity, TQueryVariables>>
): React.ReactElement {
  const {
    context,
    config,
    dataTestId = 'activity-view',
    initialFilters = {},
    hideFilters = false,
    showOwnerEmployee = false,
    secondaryActions
  } = props

  // View State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])

  // Data State
  const [activities, setActivities] = useState<TActivity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
  const loadActivities = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [context.accessToken, config, queryVariables])

  // Load activities on mount and when dependencies change
  useEffect(() => {
    loadActivities()
  }, [loadActivities])

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
    },
    [pagination.pageSize]
  )

  // Create columns with config
  const allColumns = useMemo(() => config.createColumns({ showOwnerEmployee }), [config, showOwnerEmployee])

  // Filter columns based on visibility
  const columns = useMemo(
    () => allColumns.filter(col => visibleColumns.includes(col.id as string)),
    [allColumns, visibleColumns]
  )

  return (
    <div data-testid={dataTestId} className="gba:flex gba:flex-col gba:gap-4">
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
        filterConfiguration={hideFilters ? undefined : config.baseFilterConfig}
        onFilterChange={hideFilters ? undefined : handleFilterChange}
        sorting={sorting}
        sortableColumns={config.sortableColumns}
        onSortingChange={setSorting}
        availableColumns={config.availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        secondaryActions={secondaryActions}
        toolbarDensity="default"
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
          onSortingChange={setSorting}
          onRowClick={config.onRowClick}
          onRetry={loadActivities}
          dataTestId={`${dataTestId}-list`}
        />
      </DataDisplay>
    </div>
  )
}

export const ActivityLayout = ConfigActivityLayout
export default ActivityLayout
