import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { CampaignListLayout } from './CampaignListLayout'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import type {
  SalesCampaign,
  SalesCampaignQueryVariables
} from '@/business-apps/crm/campaigns/apps/campaign-management/components/campaign-list/types/SalesCampaignTypes'

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

export interface CampaignViewConfig {
  fetchCampaigns: (variables: SalesCampaignQueryVariables) => Promise<{
    campaigns?: SalesCampaign[]
    total?: number
  }>

  filterDataHook: (context: BusinessAppContextProps) => {
    types: Array<{ id: string; label: string }>
  }

  createColumns: () => ColumnDef<SalesCampaign>[]
  createSortableColumns: () => Array<{ id: string; label: string }>
  mapColumnToGraphQLField: (columnId: string) => string

  baseFilterConfig: FilterConfiguration

  buildQueryVariables: (params: {
    pagination: { pageIndex: number; pageSize: number }
    searchTerm: string
    selectedFilters: Record<string, any>
    sorting: Array<{ id: string; desc: boolean }>
    mapColumnToGraphQLField: (columnId: string) => string
  }) => SalesCampaignQueryVariables

  flowContexts: {
    entityContext: FlowContextName
    createContext: FlowContextName
  }

  buildRecordUrl: (id: string) => string

  renderStatistics: (props: { context: BusinessAppContextProps; onRefresh: () => void }) => React.ReactNode

  processCompletionEvents?: string[]

  renderRowActions?: (row: { original: SalesCampaign }, accessToken: string) => React.ReactNode
}

export interface CampaignLayoutProps {
  context: BusinessAppContextProps
  config: CampaignViewConfig
  dataTestId?: string
  initialFilters?: Record<string, any>
  hideFilters?: boolean
  hideStatistics?: boolean
  hideCreate?: boolean
  customPrimaryAction?: React.ReactNode
}

const ConfigCampaignLayout = (props: CampaignLayoutProps) => {
  const {
    context,
    config,
    dataTestId = 'campaign-view',
    initialFilters = {},
    hideFilters = false,
    hideStatistics = false,
    hideCreate = false,
    customPrimaryAction
  } = props
  const { accessToken } = context

  // List View State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'type',
    'startDate',
    'endDate',
    'status',
    'createdAt'
  ])

  // Data State
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Dynamic Filter Data
  const filterData = config.filterDataHook(context)
  const { types } = filterData

  // Dynamic Filter Configuration
  const dynamicFilterConfig = useMemo(() => {
    const filterConfig = { ...config.baseFilterConfig }

    updateFilterOptions(
      filterConfig,
      'campaign-filters',
      'types',
      types.map(t => ({ id: t.id, label: t.label }))
    )

    return filterConfig
  }, [types, config.baseFilterConfig])

  // Query Variables
  const queryVariables = useMemo(
    () =>
      config.buildQueryVariables({
        pagination,
        searchTerm,
        selectedFilters,
        sorting,
        mapColumnToGraphQLField: config.mapColumnToGraphQLField
      }),
    [pagination, searchTerm, selectedFilters, sorting, config]
  )

  // Load Data
  const loadData = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await config.fetchCampaigns(queryVariables)
        setCampaigns(result.campaigns || [])
        setTotalCount(result.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setIsLoading(false)
        setIsInitialLoad(false)
      }
    },
    [accessToken, config, queryVariables]
  )

  // Initial load
  useEffect(() => {
    if (!accessToken || !isInitialLoad) return
    loadData(true)
  }, [accessToken, isInitialLoad, loadData])

  // Reload data when filters/search/sort change (skip initial load)
  useEffect(() => {
    if (isInitialLoad || !accessToken) return
    loadData(false)
  }, [queryVariables, isInitialLoad, accessToken, loadData])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    loadData(false)
  }, [loadData])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  useEffect(() => {
    const events = config.processCompletionEvents || ['taskCompletion', 'campaignCompletion']
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

  const handleRowClick = useCallback(
    (campaign: SalesCampaign) => {
      const url = config.buildRecordUrl(campaign.id)
      navigateTo(url)
    },
    [config]
  )

  const handleRefreshStatistics = useCallback(() => {
    loadData(false)
  }, [loadData])

  // Columns
  const columns = useMemo(() => config.createColumns(), [config])
  const availableColumns = useMemo(
    () => [
      { id: 'name', label: 'Campaign' },
      { id: 'type', label: 'Type' },
      { id: 'startDate', label: 'Start Date' },
      { id: 'endDate', label: 'End Date' },
      { id: 'status', label: 'Status' },
      { id: 'createdAt', label: 'Created' }
    ],
    []
  )

  // Row actions
  const rowActions = useMemo(
    () =>
      config.renderRowActions ||
      ((row: { original: SalesCampaign }) => (
        <AppActionButton
          data-testid={`campaign-actions-${row.original.id}`}
          size="icon"
          contextsArray={[config.flowContexts.entityContext]}
          externalContextData={{ campaignId: row.original.id }}
          prefixDataTestId="campaign-actions"
          accessToken={accessToken}
          emptyStateBehavior="enable"
          deferMainContextRequestsUntilClick
          onClick={(e: any) => e.stopPropagation()}
        />
      )),
    [config, accessToken]
  )

  return (
    <div data-testid={dataTestId}>
      {/* Statistics */}
      {!hideStatistics && config.renderStatistics({ context, onRefresh: handleRefreshStatistics })}

      {/* DataDisplay */}
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('common:allCampaigns', 'All Campaigns'),
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('common:searchCampaigns', 'Search campaigns...')}
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
              accessToken={accessToken}
              data-testid="add-campaign-action"
              emptyStateBehavior="hide"
            >
              <Button size="sm" variant="default" data-testid="add-campaign-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('crm:campaign.addCampaign', 'Add Campaign')}
              </Button>
            </AppAction>
          ))
        }
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterCampaigns', 'Filter Campaigns')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterCampaignsDescription',
          'Apply filters to narrow down the campaign list'
        )}
      >
        <CampaignListLayout
          data={campaigns}
          loading={isLoading}
          error={error}
          totalCount={totalCount}
          columns={columns.filter(col => visibleColumns.includes(col.id as string))}
          sorting={sorting}
          onSortingChange={setSorting}
          pagination={pagination}
          onPaginationChange={setPagination}
          actions={rowActions}
          onRowClick={handleRowClick}
          dataTestId={`${dataTestId}-list`}
        />
      </DataDisplay>
    </div>
  )
}

export const CampaignLayout = ConfigCampaignLayout
export default CampaignLayout
