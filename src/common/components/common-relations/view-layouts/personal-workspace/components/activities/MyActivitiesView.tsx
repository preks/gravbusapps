import React, { useState, useMemo, useCallback } from 'react'
import { Button, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ActivityListLayout } from '@/common/components/common-relations/view-layouts/activity-layout/components/ActivityListLayout'
import {
  ActivityStatisticsCard,
  type ActivityStatisticsData
} from '@/common/components/common-relations/view-layouts/activity-layout/components/ActivityStatisticsCard'
import { ActivityDetailSheet } from '@/common/components/common-relations/detail-sheets/activity-detail-sheet'
import type { Activity } from '@/common/data/relations/types/activityTypes'
import type { ColumnDef } from '@tanstack/react-table'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

export interface MyActivitiesViewConfig<TActivity extends Activity = Activity> {
  // Data fetching
  activities: TActivity[]
  totalCount: number
  isLoading: boolean
  error?: string | null

  // Pagination
  pagination: { pageIndex: number; pageSize: number }
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void

  // Sorting
  sorting: Array<{ id: string; desc: boolean }>
  onSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  sortableColumns?: Array<{ id: string; label: string }>

  // Columns
  columns: ColumnDef<TActivity>[]
  availableColumns?: Array<{ id: string; label: string }>
  visibleColumns?: string[]
  onVisibleColumnsChange?: (columns: string[]) => void

  // Search & Filters
  searchTerm?: string
  onSearchChange?: (value: string) => void
  selectedFilters?: Record<string, any>
  onFilterChange?: (filters: Record<string, any>) => void
  filterConfiguration?: FilterConfiguration

  // Actions
  onRetry?: () => void
  onRowClick?: (activity: TActivity) => void
  actions?: (row: { original: TActivity }) => React.ReactNode

  // Flow contexts for primary action
  createContext?: FlowContextName
  createContextData?: Record<string, any>

  // Row actions flow contexts
  rowActionsContextArray?: FlowContextName[]
  buildRowActionsExternalContextData?: (row: { original: TActivity }) => Record<string, string>

  // KPIs
  kpiStatistics?: ActivityStatisticsData | null
  kpiLoading?: boolean
  kpiError?: Error | null
  onKpiRetry?: () => void

  // Translations
  translations?: {
    title?: string
    searchPlaceholder?: string
  }
}

export interface MyActivitiesViewProps extends BusinessAppContextProps {
  config: MyActivitiesViewConfig<any>
  dataTestId?: string
}

/**
 * Generic My Activities View for Personal Workspace
 * Displays a list of user's recent activities with full DataDisplay features
 */
export const MyActivitiesView: React.FC<MyActivitiesViewProps> = ({
  config,
  accessToken,
  dataTestId = 'my-activities-view'
}) => {
  // Local state for columns visibility if not provided
  const [localVisibleColumns, setLocalVisibleColumns] = useState<string[]>([])

  // Detail Sheet State
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

  // Use provided or local state
  const visibleColumns = config.visibleColumns ?? localVisibleColumns
  const onVisibleColumnsChange = config.onVisibleColumnsChange ?? setLocalVisibleColumns

  // Initialize visible columns
  React.useEffect(() => {
    if (!config.visibleColumns && config.availableColumns && localVisibleColumns.length === 0) {
      setLocalVisibleColumns(config.availableColumns.map(col => col.id))
    }
  }, [config.availableColumns, config.visibleColumns, localVisibleColumns.length])

  // Extract callbacks from config to prevent unnecessary re-renders
  const { onRetry, onKpiRetry, onRowClick } = config

  // Process Completion Handler - refresh data when processes complete
  const handleProcessComplete = useCallback(() => {
    onRetry?.()
    onKpiRetry?.()
  }, [onRetry, onKpiRetry])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  // Activity Click Handler - open detail sheet
  const handleActivityClick = useCallback(
    (activity: Activity) => {
      setSelectedActivity(activity)
      // Also call custom click handler if provided
      onRowClick?.(activity)
    },
    [onRowClick]
  )

  // Filter columns based on visibility
  const displayColumns = useMemo(
    () => config.columns.filter(col => visibleColumns.includes(col.id as string)),
    [config.columns, visibleColumns]
  )

  // Row actions - only if contexts are provided
  const rowActions = useMemo(() => {
    if (config.rowActionsContextArray && config.buildRowActionsExternalContextData) {
      return (row: { original: any }) => {
        const contextData = config.buildRowActionsExternalContextData!(row)
        return (
          <AppAction
            variant="table-row"
            contexts={config.rowActionsContextArray.map(ctx => ({ context: ctx, contextData }))}
            prefixDataTestId="activity-actions"
            accessToken={accessToken}
            emptyState="enable"
            lazyLoad
          >
            <Button variant="ghost" size="icon" data-testid={`activity-actions-${row.original.id}`}>
              <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </Button>
          </AppAction>
        )
      }
    }

    return config.actions
  }, [config, accessToken])

  return (
    <div data-testid={dataTestId} className="gba:flex gba:flex-col gba:gap-4">
      {config.kpiStatistics && (
        <ActivityStatisticsCard
          statistics={config.kpiStatistics}
          isLoading={config.kpiLoading}
          error={config.kpiError}
          onRetry={config.onKpiRetry}
        />
      )}

      <DataDisplay
        titleSections={[
          {
            id: 'my-activities',
            label: config.translations?.title ?? 'My Activities',
            metadata: {
              count: config.totalCount,
              isLoading: config.isLoading
            }
          }
        ]}
        currentSection="my-activities"
        searchValue={config.searchTerm}
        searchPlaceholder={config.translations?.searchPlaceholder ?? 'Search activities...'}
        onSearchChange={config.onSearchChange}
        filters={config.selectedFilters}
        filterConfiguration={config.filterConfiguration}
        onFilterChange={config.onFilterChange}
        sorting={config.sorting}
        sortableColumns={config.sortableColumns}
        onSortingChange={config.onSortingChange}
        availableColumns={config.availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={onVisibleColumnsChange}
        primaryAction={
          config.createContext ? (
            <AppAction
              contexts={[
                {
                  context: config.createContext,
                  contextData: config.createContextData || {}
                }
              ]}
              accessToken={accessToken}
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
        toolbarDensity="default"
        enableLiveFiltering={config.onFilterChange !== undefined}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterActivities', 'Filter Activities')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterActivitiesDescription',
          'Apply filters to narrow down the activity list'
        )}
      >
        <ActivityListLayout
          data={config.activities}
          columns={displayColumns}
          loading={config.isLoading}
          error={config.error || null}
          totalCount={config.totalCount}
          pagination={config.pagination}
          sorting={config.sorting}
          onPaginationChange={config.onPaginationChange}
          onSortingChange={config.onSortingChange}
          onRowClick={handleActivityClick}
          actions={rowActions}
          onRetry={config.onRetry}
          dataTestId={`${dataTestId}-list`}
        />
      </DataDisplay>

      {/* Activity Detail Sheet */}
      <ActivityDetailSheet
        activity={selectedActivity as any}
        open={!!selectedActivity}
        onOpenChange={open => {
          if (!open) setSelectedActivity(null)
        }}
        data-testid={`${dataTestId}-detail-sheet`}
        accessToken={accessToken}
        flowContext={config.rowActionsContextArray?.[0]}
      />
    </div>
  )
}

export default MyActivitiesView
