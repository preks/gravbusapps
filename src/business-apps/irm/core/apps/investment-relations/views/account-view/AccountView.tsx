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
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useAccountFilterOptions } from './hooks/useAccountFilterOptions'
import type { InvestmentAccountQueryVariables } from '@/common/data/investment/queries/investmentAccountQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { AccountStatistics } from './components/AccountStatistics'
import {
  applyAccountFilters,
  createAccountColumnToGraphQLMapping
} from '@/common/components/common-relations/view-layouts/account-layout/utils/queryHelpers'

export type AccountViewProps = BusinessAppContextProps

export const AccountView: React.FC<AccountViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)
  const filterData = useAccountFilterOptions(context)

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

  // Column to GraphQL mapping (IRM uses standard naming - no overrides needed)
  const mapColumnToGraphQLField = useMemo(() => createAccountColumnToGraphQLMapping(), [])

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
    const vars: InvestmentAccountQueryVariables = {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: searchTerm.trim() || undefined
    }

    applyAccountFilters(vars, selectedFilters)

    if (sorting.length > 0) {
      const columnId = sorting[0].id
      const direction = sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
      const graphqlPath = mapColumnToGraphQLField(columnId)

      // Non-sortable computed fields
      if (!graphqlPath || columnId === 'location' || columnId === 'contactInfo') {
        vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
      }
      // Build nested orderBy for catalog/employee fields
      else if (columnId === 'industry') {
        vars.orderBy = [{ field: { industryClass: { value: direction as any } }, direction } as any]
      } else if (columnId === 'legalForm') {
        vars.orderBy = [{ field: { legalForm: { value: direction as any } }, direction } as any]
      } else if (columnId === 'companySize') {
        vars.orderBy = [{ field: { companySize: { value: direction as any } }, direction } as any]
      } else if (columnId === 'revenueBand') {
        vars.orderBy = [{ field: { accountAnnualRevenueBand: { value: direction as any } }, direction } as any]
      } else if (columnId === 'ownerEmployee') {
        vars.orderBy = [{ field: { ownerEmployee: { displayName: direction as any } }, direction } as any]
      } else {
        // Scalar fields
        vars.orderBy = [{ field: columnId as any, direction }]
      }
    } else {
      vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
    }

    return vars
  }, [pagination, searchTerm, selectedFilters, sorting, mapColumnToGraphQLField])

  // Load Data
  const loadData = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await fetchInvestmentAccounts(queryVariables)
        // Hook already maps to CommonAccount structure via toInvestmentAccount mapper
        setAccounts(result.InvestmentAccount || [])
        setTotalCount(result.InvestmentAccountAggregate?.aggregate?.count || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setIsLoading(false)
        setIsInitialLoad(false)
      }
    },
    [accessToken, fetchInvestmentAccounts, queryVariables]
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
    const events = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'accountCompletion',
      'accountCompleted'
    ]
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
    const url = buildPlatformUrl('/platform/irm/account-record', { accountId: account.id })
    navigateTo(url)
  }, [])

  // Row Actions
  const renderRowActions = useCallback(
    (row: { original: CommonAccount }) => (
      <AppActionMenu
        contextsArray={[FlowContextName.investmentAccountEntity]}
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
    return <AccountStatistics {...context} />
  }, [context])

  // Primary Action
  const primaryAction = useMemo(
    () => (
      <AppAction
        contextsArray={[FlowContextName.investmentAccountCreate]}
        accessToken={accessToken}
        data-testid="add-account-action"
        emptyStateBehavior="hide"
      >
        <Button size="sm" variant="default" data-testid="add-account-button" type="button">
          <Plus size={16} />
          {getTranslationFromI18nKeyAndLabel('irm:account.addAccount', 'Add Account')}
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
      dataTestId="investment-account-view"
    />
  )
}

export default AccountView
