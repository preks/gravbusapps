import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AccountLayout } from '@/common/components/common-relations/view-layouts/account-layout'
import type { CommonAccount } from '@/common/data/relations/types/commonAccountTypes'
import {
  defaultAccountColumns,
  defaultAccountSortableColumns,
  defaultVisibleAccountColumns,
  defaultAvailableAccountColumns,
  defaultAccountFilterConfig
} from '@/common/components/common-relations/view-layouts/account-layout/config'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/utils/filterHelpers'
import { useCustomerAccounts } from '@/common/data/customer/hooks/useCustomerAccounts'
import { useCustomerAccountFilters } from '@/common/data/customer/hooks/useCustomerAccountFilters'
import type { CustomerAccountQueryVariables } from '@/common/data/customer/queries/customerAccountQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { AccountStatisticsWithTrend } from './components/AccountStatistics'
import { useAccountStatisticsWithTrend as useCustomerAccountStatistics } from '@/common/data/customer/hooks/useCustomerAccountStatistics'
import { applyBasicFilters, applyDateFilter, mapColumnToGraphQLField } from './utils/customerAccountQueryHelpers'

export type AccountViewProps = BusinessAppContextProps

export const AccountView: React.FC<AccountViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchCustomerAccounts } = useCustomerAccounts(context)
  const filterData = useCustomerAccountFilters(context)
  const accountStatistics = useCustomerAccountStatistics({ ...context, sourceApp: 'CRM' })

  // View State
  const [accounts, setAccounts] = useState<CommonAccount[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [hasLoadedFilters, setHasLoadedFilters] = useState(false)

  // Table State
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleAccountColumns)

  // Columns: Use default columns (can be extended here if needed)
  const columns = useMemo<ColumnDef<CommonAccount>[]>(() => {
    return defaultAccountColumns
  }, [])

  // Filter Configuration: Build dynamic config with filter options
  const filterConfig = useMemo(() => {
    return buildDynamicFilterConfig(defaultAccountFilterConfig, filterData)
  }, [
    filterData.owners,
    filterData.industries,
    filterData.legalForms,
    filterData.companySizes,
    filterData.revenueBands,
    filterData.countries
  ])

  // Query Variables
  const queryVariables = useMemo(() => {
    const vars: CustomerAccountQueryVariables = {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: searchTerm.trim() || undefined
    }

    applyBasicFilters(vars, selectedFilters)
    applyDateFilter(vars, selectedFilters)

    if (sorting.length > 0) {
      vars.orderBy = [
        {
          field: mapColumnToGraphQLField(sorting[0].id) as any,
          direction: sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
        }
      ]
    } else {
      vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
    }

    return vars
  }, [pagination, searchTerm, selectedFilters, sorting])

  // Load Data
  const loadData = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await fetchCustomerAccounts(queryVariables)
        // Hook already maps to CommonAccount structure
        setAccounts(result.accounts || [])
        setTotalCount(result.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setIsLoading(false)
        setIsInitialLoad(false)
      }
    },
    [accessToken, fetchCustomerAccounts, queryVariables]
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
    const events = ['taskCompletion', 'accountCompletion']
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
  }, [handleProcessComplete])

  // Event Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Prefetch filters on mount
  useEffect(() => {
    if (!hasLoadedFilters && filterData.prefetchFilters && accessToken) {
      filterData.prefetchFilters()
      setHasLoadedFilters(true)
    }
  }, [hasLoadedFilters, filterData, accessToken])

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleRowClick = useCallback((account: CommonAccount) => {
    const url = buildPlatformUrl('/platform/crm/account-record', { accountId: account.id })
    navigateTo(url)
  }, [])

  const handleRefresh = useCallback(() => {
    loadData(false)
  }, [loadData])

  // Row Actions
  const renderRowActions = useCallback(
    (row: { original: CommonAccount }) => (
      <AppActionMenu
        contextsArray={[FlowContextName.customerAccountEntity]}
        externalContextData={{ accountId: row.original.id }}
        prefixDataTestId="account-actions"
        accessToken={accessToken}
        emptyStateBehavior="enable"
        deferMainContextRequestsUntilClick
      >
        <Button variant="ghost" size="icon" data-testid={`account-actions-${row.original.id}`}>
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
    ),
    [accessToken]
  )

  // Statistics
  const renderStatistics = useCallback(() => {
    if (!accountStatistics.trendData) return null
    return (
      <AccountStatisticsWithTrend
        trendData={accountStatistics.trendData}
        isLoading={accountStatistics.isLoading}
        error={accountStatistics.error}
        onRetry={handleRefresh}
      />
    )
  }, [accountStatistics, handleRefresh])

  // Primary Action
  const primaryAction = useMemo(
    () => (
      <AppAction
        contextsArray={[FlowContextName.customerAccountCreate]}
        accessToken={accessToken}
        data-testid="add-account-action"
        emptyStateBehavior="hide"
      >
        <Button size="sm" variant="default" data-testid="add-account-button" type="button">
          <Plus size={16} />
          {getTranslationFromI18nKeyAndLabel('crm:account.addAccount', 'Add Account')}
        </Button>
      </AppAction>
    ),
    [accessToken]
  )

  return (
    <AccountLayout
      accounts={accounts}
      totalCount={totalCount}
      loading={isLoading}
      error={error}
      columns={columns}
      visibleColumns={visibleColumns}
      availableColumns={defaultAvailableAccountColumns}
      onVisibleColumnsChange={setVisibleColumns}
      searchTerm={searchTerm}
      onSearchChange={handleSearch}
      filterConfig={filterConfig}
      selectedFilters={selectedFilters}
      onFilterChange={handleFilterChange}
      sorting={sorting}
      onSortingChange={setSorting}
      sortableColumns={defaultAccountSortableColumns}
      pagination={pagination}
      onPaginationChange={setPagination}
      onRowClick={handleRowClick}
      renderRowActions={renderRowActions}
      renderStatistics={renderStatistics}
      primaryAction={primaryAction}
      dataTestId="customer-account-view"
    />
  )
}

export default AccountView
