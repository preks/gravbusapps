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
import { AccountListLayout } from './AccountListLayout'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DefaultAccountRowActions } from './AccountLayoutHelpers'

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

export interface AccountViewConfig<TAccount extends { id: string }, TQueryVariables> {
  contextType: 'customer' | 'investment'

  fetchAccounts: (variables: TQueryVariables) => Promise<{
    accounts?: TAccount[]
    total?: number
  }>

  filterDataHook: (context: BusinessAppContextProps) => {
    owners: Array<{ id: string; label: string }>
    industries?: Array<{ id: string; label: string }>
    legalForms?: Array<{ id: string; label: string }>
    companySizes?: Array<{ id: string; label: string }>
    revenueBands?: Array<{ id: string; label: string }>
    countries?: Array<{ id: string; label: string }>
    regions?: Array<{ id: string; label: string }>
    cities?: Array<{ id: string; label: string }>
  }

  createColumns: () => ColumnDef<TAccount>[]
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

  renderRowActions?: (row: { original: TAccount }, accessToken: string) => React.ReactNode
}

export interface AccountLayoutProps<TAccount extends { id: string } = any, TQueryVariables = any> {
  context: BusinessAppContextProps
  config: AccountViewConfig<TAccount, TQueryVariables>
  dataTestId?: string
  initialFilters?: Record<string, any>
  hideFilters?: boolean
  hideStatistics?: boolean
  hideCreate?: boolean
  customPrimaryAction?: React.ReactNode
}

const ConfigAccountLayout = <TAccount extends { id: string } = any, TQueryVariables = any>(
  props: AccountLayoutProps<TAccount, TQueryVariables>
) => {
  const {
    context,
    config,
    dataTestId = 'account-view',
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
    'email',
    'geographicPresence',
    'industryClass',
    'legalForm',
    'size',
    'ownerEmployee',
    'createdAt'
  ])

  // Data State
  const [accounts, setAccounts] = useState<TAccount[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Dynamic Filter Data
  const filterData = config.filterDataHook(context)
  const { owners, industries, legalForms, companySizes, revenueBands, countries, regions, cities } = filterData

  // Dynamic Filter Configuration
  const dynamicFilterConfig = useMemo(() => {
    const filterConfig = { ...config.baseFilterConfig }

    updateFilterOptions(
      filterConfig,
      'account-filters',
      'owners',
      owners.map(o => ({ id: o.id, label: o.label }))
    )

    if (industries && industries.length > 0) {
      updateFilterOptions(
        filterConfig,
        'account-filters',
        'industries',
        industries.map(i => ({ id: i.id, label: i.label }))
      )
    }

    if (legalForms && legalForms.length > 0) {
      updateFilterOptions(
        filterConfig,
        'account-filters',
        'legalForms',
        legalForms.map(l => ({ id: l.id, label: l.label }))
      )
    }

    if (companySizes && companySizes.length > 0) {
      updateFilterOptions(
        filterConfig,
        'account-filters',
        'companySizes',
        companySizes.map(c => ({ id: c.id, label: c.label }))
      )
    }

    if (revenueBands && revenueBands.length > 0) {
      updateFilterOptions(
        filterConfig,
        'account-filters',
        'revenueBands',
        revenueBands.map(r => ({ id: r.id, label: r.label }))
      )
    }

    // Geography filters
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
  }, [owners, industries, legalForms, companySizes, revenueBands, countries, regions, cities, config.baseFilterConfig])

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
        const result = await config.fetchAccounts(queryVariables)
        setAccounts(result.accounts || [])
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
    const events = config.processCompletionEvents || ['taskCompletion', 'accountCompletion']
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
    (account: TAccount) => {
      if (config.buildRecordUrl) {
        const url = config.buildRecordUrl(account.id)
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
      { id: 'name', label: 'Account' },
      { id: 'email', label: 'Contact Info' },
      { id: 'geographicPresence', label: 'Location' },
      { id: 'industryClass', label: 'Industry' },
      { id: 'legalForm', label: 'Legal Form' },
      { id: 'size', label: 'Size' },
      { id: 'revenue', label: 'Revenue' },
      { id: 'ownerEmployee', label: 'Owner' },
      { id: 'createdAt', label: 'Created' }
    ],
    []
  )

  // Row actions
  const rowActions = useMemo(
    () =>
      config.renderRowActions
        ? (row: { original: TAccount }) => config.renderRowActions!(row, accessToken)
        : (row: { original: TAccount }) => (
            <DefaultAccountRowActions
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
            label: getTranslationFromI18nKeyAndLabel('common:allAccounts', 'All Accounts'),
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('common:searchAccounts', 'Search accounts...')}
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
              data-testid="add-account-action"
              emptyStateBehavior="hide"
            >
              <Button size="sm" variant="default" data-testid="add-account-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('crm:account.addAccount', 'Add Account')}
              </Button>
            </AppAction>
          ))
        }
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterAccounts', 'Filter Accounts')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterAccountsDescription',
          'Apply filters to narrow down the account list'
        )}
      >
        <AccountListLayout<TAccount>
          data={accounts}
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

export const AccountLayout = ConfigAccountLayout
export default AccountLayout
