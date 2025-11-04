import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, DataDisplay } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'
import { LeadListLayout } from './LeadListLayout'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DefaultLeadRowActions } from './LeadLayoutHelpers'

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

export interface LeadViewConfig<TLead extends { id: string }, TQueryVariables> {
  contextType: 'customer' | 'investment'

  fetchLeads: (variables: TQueryVariables) => Promise<{
    leads?: TLead[]
    total?: number
  }>

  filterDataHook: (context: BusinessAppContextProps) => {
    owners: Array<{ id: string; label: string }>
    statuses: Array<{ id: string; label: string }>
    ratings: Array<{ id: string; label: string }>
    sources: Array<{ id: string; label: string }>
    countries?: Array<{ id: string; label: string }>
    regions?: Array<{ id: string; label: string }>
    cities?: Array<{ id: string; label: string }>
  }

  createColumns: () => ColumnDef<TLead>[]
  createSortableColumns: () => Array<{ id: string; label: string }>
  mapColumnToGraphQLField: (columnId: string) => string

  baseFilterConfig: FilterConfiguration

  buildQueryVariables: (params: {
    pagination: { pageIndex: number; pageSize: number }
    searchTerm: string
    selectedFilters: Record<string, any>
    sorting: Array<{ id: string; desc: boolean }>
    mapColumnToGraphQLField: (columnId: string) => string
  }) => TQueryVariables

  flowContexts: {
    entityContext: FlowContextName
    createContext: FlowContextName
    createContextData?: Record<string, any>
  }

  buildRecordUrl?: (id: string) => string

  renderStatistics: (props: { context: BusinessAppContextProps; onRefresh: () => void }) => React.ReactNode

  processCompletionEvents?: string[]

  renderRowActions?: (row: { original: TLead }, accessToken: string) => React.ReactNode
}

export interface LeadLayoutProps<TLead extends { id: string } = any, TQueryVariables = any> {
  context: BusinessAppContextProps
  config: LeadViewConfig<TLead, TQueryVariables>
  dataTestId?: string
  initialFilters?: Record<string, any>
  hideFilters?: boolean
  hideStatistics?: boolean
  hideCreate?: boolean
  customPrimaryAction?: React.ReactNode
}

const ConfigLeadLayout = <TLead extends { id: string } = any, TQueryVariables = any>(
  props: LeadLayoutProps<TLead, TQueryVariables>
) => {
  const {
    context,
    config,
    dataTestId = 'lead-view',
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
    'firstName',
    'email',
    'locality',
    'leadStatus',
    'leadRating',
    'leadSource',
    'ownerEmployee',
    'createdAt'
  ])

  // Data State
  const [leads, setLeads] = useState<TLead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Dynamic Filter Data
  const filterData = config.filterDataHook(context)
  const { owners, statuses, ratings, sources, countries, regions, cities } = filterData

  // Dynamic Filter Configuration
  const dynamicFilterConfig = useMemo(() => {
    const filterConfig = { ...config.baseFilterConfig }

    updateFilterOptions(
      filterConfig,
      'status-group',
      'leadStatuses',
      statuses.map(s => ({ id: s.id, label: s.label }))
    )
    updateFilterOptions(
      filterConfig,
      'rating-group',
      'leadRatings',
      ratings.map(r => ({ id: r.id, label: r.label }))
    )
    updateFilterOptions(
      filterConfig,
      'source-group',
      'leadSources',
      sources.map(s => ({ id: s.id, label: s.label }))
    )
    updateFilterOptions(
      filterConfig,
      'owner-group',
      'owners',
      owners.map(o => ({ id: o.id, label: o.label }))
    )

    // Geography filters (if available)
    if (countries && countries.length > 0) {
      updateFilterOptions(
        filterConfig,
        'geography-group',
        'countries',
        countries.map(c => ({ id: c.id, label: c.label }))
      )
    }
    if (regions && regions.length > 0) {
      updateFilterOptions(
        filterConfig,
        'geography-group',
        'regions',
        regions.map(r => ({ id: r.id, label: r.label }))
      )
    }
    if (cities && cities.length > 0) {
      updateFilterOptions(
        filterConfig,
        'geography-group',
        'cities',
        cities.map(c => ({ id: c.id, label: c.label }))
      )
    }

    return filterConfig
  }, [owners, statuses, ratings, sources, countries, regions, cities, config.baseFilterConfig])

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
        const result = await config.fetchLeads(queryVariables)
        setLeads(result.leads || [])
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
    const events = config.processCompletionEvents || ['taskCompletion', 'leadCompletion']
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
    (lead: TLead) => {
      if (config.buildRecordUrl) {
        const url = config.buildRecordUrl(lead.id)
        navigateTo(url)
      }
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
      { id: 'firstName', label: 'Lead' },
      { id: 'email', label: 'Contact Info' },
      { id: 'locality', label: 'Address' },
      { id: 'leadStatus', label: 'Status' },
      { id: 'leadRating', label: 'Rating' },
      { id: 'leadSource', label: 'Source' },
      { id: 'ownerEmployee', label: 'Owner' },
      { id: 'createdAt', label: 'Created' }
    ],
    []
  )

  // Row actions
  const rowActions = useMemo(
    () =>
      config.renderRowActions
        ? (row: { original: TLead }) => config.renderRowActions!(row, accessToken)
        : (row: { original: TLead }) => (
            <DefaultLeadRowActions
              row={row}
              accessToken={accessToken}
              entityContext={config.flowContexts.entityContext}
            />
          ),
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
            label: getTranslationFromI18nKeyAndLabel('common:allLeads', 'All Leads'),
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('common:searchLeads', 'Search leads...')}
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
              data-testid="add-lead-action"
              emptyStateBehavior="hide"
            >
              <Button size="sm" variant="default" data-testid="add-lead-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('crm:lead.addLead', 'Add Lead')}
              </Button>
            </AppAction>
          ))
        }
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterLeads', 'Filter Leads')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterLeadsDescription',
          'Apply filters to narrow down the lead list'
        )}
      >
        <LeadListLayout<TLead>
          data={leads}
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

export const LeadLayout = ConfigLeadLayout
export default LeadLayout
