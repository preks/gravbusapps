import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Spinner,
  Alert,
  Button
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'
import { formatDate } from '@/common/data/investment'
import { formatCurrencyParts } from '@/common/utils/numberFormatter'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import type { InvestmentQueryVariables } from '@/common/data/investment/queries/investmentQueries'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Building2, Calendar, ChevronUp, ChevronDown, Plus } from 'lucide-react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ColumnConfig } from '@/components/dataController'
import { useInvestmentListController } from '../hooks/useInvestmentListController'
import { useLiquidFundInvestmentsFilters } from '../hooks/useLiquidFundInvestmentsFilters'
import { OwnerDisplay } from '@/business-apps/irm/core/apps/investment-relations/views/task-view/components/OwnerDisplay' // TODO: Extract to common
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type LiquidFundInvestmentsListProps = BusinessAppContextProps

const LiquidFundInvestmentsList: React.FC<LiquidFundInvestmentsListProps> = context => {
  const { accessToken } = context

  // Use the shared controller for URL sync and state management
  const {
    search,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    initialLoadDone,
    setSearch,
    handleSortingChange,
    handlePaginationChange,
    updateURLParams
  } = useInvestmentListController()

  // Use centralized filters hook
  const {
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
    filtersInitialized
  } = useLiquidFundInvestmentsFilters(context)

  // Sortable table header component (same behavior as other tabs)
  const SortableTableHead: React.FC<{
    children: React.ReactNode
    field: string
    currentSortField: string
    currentSortOrder: 'ASC' | 'DESC'
    onSort: (field: string, order: 'ASC' | 'DESC' | '') => void
    className?: string
  }> = ({ children, field, currentSortField, currentSortOrder, onSort, className }) => {
    const isSorted = currentSortField === field
    const nextOrder = isSorted ? (currentSortOrder === 'ASC' ? 'DESC' : '') : 'ASC'

    return (
      <TableHead
        className={`gba:cursor-pointer gba:select-none ${className || ''}`}
        onClick={() => onSort(field, nextOrder)}
      >
        <div className="gba:flex gba:items-center gba:gap-1">
          {children}
          {isSorted &&
            (currentSortOrder === 'ASC' ? (
              <ChevronUp className="gba:w-4 gba:h-4" />
            ) : (
              <ChevronDown className="gba:w-4 gba:h-4" />
            ))}
        </div>
      </TableHead>
    )
  }

  const renderAmount = (amount: number | undefined, currency?: string) => {
    if (typeof amount !== 'number') return <span className="gba:text-gray-400">-</span>
    const { number, symbol } = formatCurrencyParts(amount, {
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
    return (
      <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline">
        <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">{number}</span>
        <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">
          {symbol}
        </span>
      </div>
    )
  }

  // Define available columns with default visibility
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: 'investment', label: 'Investment', visible: true },
    { id: 'investmentType', label: 'Investment Type', visible: true },
    { id: 'fundType', label: 'Fund Type', visible: true },
    { id: 'owner', label: 'Owner', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'created', label: 'Created', visible: true },
    // Actions column must be LAST
    { id: 'actions', label: 'Actions', visible: true, disabled: true }
  ])

  // Get visible columns for passing to table
  const visibleColumns = columnConfig.filter(col => col.visible).map(col => col.id)

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => prev.map(col => (col.id === columnId ? { ...col, visible } : col)))
  }, [])

  // Filter groups based on visible columns - ONLY show filters for visible columns
  const visibleFilterGroups = useMemo(() => {
    // Map each visible column to its filter group for liquid fund
    const columnToFilterMap: Record<string, string> = {
      investmentType: 'investmentType', // Investment Type column → Investment Type filter
      status: 'investmentStatus', // Status column → Investment Status filter
      owner: 'owner', // Owner column → Owner filter
      created: 'creationDate' // Created column → Creation Date filter
    }

    // Only show filters for currently visible columns
    const visibleFilterIds = new Set<string>()

    visibleColumns.forEach(columnId => {
      const filterId = columnToFilterMap[columnId]
      if (filterId) {
        visibleFilterIds.add(filterId)
      }
    })

    // Return only filter groups that have visible columns
    return filterGroups.filter(group => visibleFilterIds.has(group.id))
  }, [filterGroups, visibleColumns])

  const { fetchInvestments } = useGetInvestments(context)

  // Extend Investment locally with the nested specialization we query
  type InvestmentWithLiquidFund = Investment & {
    liquidFundInvestment?: Array<{
      id: string
      bankName?: string
      bankAccountNumber?: string
      interestRate?: number
      earlyTerminationAllowed?: boolean
      investmentLiquidFundType?: {
        value: string
        code?: string
      }
    }>
  }

  const [investments, setInvestments] = useState<InvestmentWithLiquidFund[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queryVariables: InvestmentQueryVariables = useMemo(() => {
    const filters = getFilters()
    const v: InvestmentQueryVariables = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: search.trim() || undefined,
      // Use the safe orderBy mapper in the query; pass field as-is from headers
      orderBy: sortField
        ? [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }]
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }],
      ...filters
    }
    // Always filter by liquid fund investment types
    v.investmentGroupIds = ['InvestmentGroup:v1:LIQUID_FUND']
    return v
  }, [currentPage, pageSize, search, sortField, sortOrder, getFilters])

  const loadData = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchInvestments(queryVariables)
      const items: InvestmentWithLiquidFund[] = (result.Investment || []) as InvestmentWithLiquidFund[]
      setInvestments(items)
      setTotalCount(result.InvestmentAggregate?.aggregate?.count || items.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, fetchInvestments, queryVariables])

  // Trigger initial data loading when component mounts and filters are initialized
  useEffect(() => {
    if (!initialLoadDone.current && accessToken && filtersInitialized) {
      initialLoadDone.current = true
      loadData()
    }
  }, [accessToken, filtersInitialized, loadData])

  // Trigger search when search term changes
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      updateURLParams({ search, page: 1 })
      loadData()
    }
  }, [search, filtersInitialized, loadData, updateURLParams])
  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('LiquidFundInvestmentsList: Process completion event received:', event.type)

        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('LiquidFundInvestmentsList: Process completed successfully, refreshing liquid fund data')
          loadData()
          return
        }

        // Check for different event structures - specifically for liquid fund investments
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.investment || response?.liquidFundInvestment) {
          console.log('LiquidFundInvestmentsList: Liquid fund investment data detected, refreshing list')
          loadData()
          return
        }

        // Check for continue events with payload (investment creation/update)
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          console.log('LiquidFundInvestmentsList: Continue event with payload detected, refreshing data')
          loadData()
        }
      } catch (err) {
        console.error('Error handling process completion in LiquidFundInvestmentsList:', err)
      }
    }

    // Listen to multiple possible event names for investment updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion)
      })
    }
  }, [loadData])

  // Trigger reload when filters change
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      loadData()
    }
  }, [JSON.stringify(selectedFilters), filtersInitialized, loadData])

  // Trigger reload when sorting changes
  useEffect(() => {
    if (initialLoadDone.current) {
      loadData()
    }
  }, [sortField, sortOrder, loadData])

  // Trigger reload when pagination changes
  useEffect(() => {
    if (initialLoadDone.current) {
      loadData()
    }
  }, [currentPage, pageSize, loadData])

  // Adapter function for DataFilter component
  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      selected ? addFilter(filterId) : removeFilter(filterId)
    },
    [addFilter, removeFilter]
  )

  // Function for DataController setFilter requirement
  const handleSetFilter = useCallback(
    (filters: string[]) => {
      // This is called by DataController's "Clear all filters" button or individual filter removal
      if (filters.length === 0) {
        // Clear all filters
        clearAllFilters()
      } else {
        // Handle individual filter removal - find which filters were removed and remove them
        const removedFilters = selectedFilters.filter(f => !filters.includes(f))
        removedFilters.forEach(filterId => removeFilter(filterId))
      }
    },
    [clearAllFilters, selectedFilters, removeFilter]
  )

  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', {
      investmentId,
      fromView: 'investments',
      fromSubView: 'liquid-funds'
    })
    navigateTo(detailsUrl)
  }, [])

  if (isLoading && investments.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span>Error loading investments: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <DataContainer
      dataControllerProps={{
        search,
        setSearch,
        debounceDelay: 500,
        filter: selectedFilters,
        setFilter: handleSetFilter,
        filterLabelMap,
        listTitle: (
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span>
                {getTranslationFromI18nKeyAndLabel('investment:liquidFund.listTitle', 'Liquid Fund Investments')}
              </span>
              <span className="gba:text-gray-500">({totalCount})</span>
            </div>
          </div>
        ),
        actions: (
          <AppAction
            contextsArray={[FlowContextName.createInvestment]}
            externalContextData={{
              investmentGroup: 'InvestmentGroup:v1:LIQUID_FUND',
              fromView: 'investments',
              fromSubView: 'liquid-funds'
            }}
            accessToken={accessToken}
            data-testid="liquid-fund-investments-add-action"
            emptyStateBehavior="hide"
          >
            <Button
              size="sm"
              variant="default"
              data-testid="liquid-fund-investments-add-button"
              type="button"
              style={{ gap: 'var(--nw-spacing-xs)' }}
            >
              <Plus size={16} />
              {getTranslationFromI18nKeyAndLabel('investment:liquidFund.addLiquidFund', 'Add Liquid Fund')}
            </Button>
          </AppAction>
        ),
        columnVisibility: {
          columns: columnConfig,
          onColumnVisibilityChange: handleColumnVisibilityChange,
          'data-testid': 'liquid-fund-investments-column-visibility'
        }
      }}
      dataFilterProps={{
        filterGroups: visibleFilterGroups,
        onFilterChange: handleFilterChange
      }}
      dataBody={
        <div className="gba:bg-white gba:rounded-lg gba:border">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.includes('investment') && (
                  <SortableTableHead
                    field="name"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSortingChange}
                  >
                    {getTranslationFromI18nKeyAndLabel('investment:liquidFund.columns.investment', 'Investment')}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('investmentType') && (
                  <SortableTableHead
                    field="investmentType.value"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSortingChange}
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'investment:liquidFund.columns.investmentType',
                      'Investment Type'
                    )}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('fundType') && (
                  <TableHead>
                    {getTranslationFromI18nKeyAndLabel('investment:liquidFund.columns.fundType', 'Fund Type')}
                  </TableHead>
                )}
                {visibleColumns.includes('owner') && (
                  <SortableTableHead
                    field="ownerEmployee.displayName"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSortingChange}
                  >
                    {getTranslationFromI18nKeyAndLabel('investment:liquidFund.columns.owner', 'Owner')}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('status') && (
                  <SortableTableHead
                    field="investmentStatus.value"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSortingChange}
                  >
                    {getTranslationFromI18nKeyAndLabel('investment:liquidFund.columns.status', 'Status')}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('created') && (
                  <SortableTableHead
                    field="createdAt"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSortingChange}
                  >
                    {getTranslationFromI18nKeyAndLabel('investment:liquidFund.columns.created', 'Created')}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('actions') && <TableHead className="gba:w-[60px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map(inv => (
                <TableRow key={inv.id} className="gba:cursor-pointer" onClick={() => handleRowClick(inv.id)}>
                  {visibleColumns.includes('investment') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span className="gba:font-medium">{inv.name}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('investmentType') && (
                    <TableCell>
                      <Badge variant="secondary">{inv?.investmentType?.value || 'Liquid Fund'}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('fundType') && (
                    <TableCell>
                      {inv.liquidFundInvestment?.[0]?.investmentLiquidFundType?.value ? (
                        <Badge variant="default">{inv.liquidFundInvestment[0].investmentLiquidFundType.value}</Badge>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                  )}
                  {visibleColumns.includes('owner') && (
                    <TableCell>
                      <OwnerDisplay
                        ownerEmployee={inv.ownerEmployee}
                        entityId={inv.id}
                        testIdPrefix="liquid-fund-investment"
                      />
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell>
                      <Badge variant="secondary">{inv.investmentStatus?.value || 'Unknown'}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('created') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{formatDate(inv.acquisitionDate || (inv as any).createdAt)}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('actions') && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`liquid-fund-investment-update-button-${inv.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.investmentEntity]}
                          externalContextData={{ investmentId: inv.id }}
                          prefixDataTestId={`liquid-fund-investment-update`}
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick={true}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-4 gba:border-t"
            data-testid="liquid-fund-investments-pagination"
          >
            <div
              className="gba:text-sm gba:text-muted-foreground"
              data-testid="liquid-fund-investments-pagination-info"
            >
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                totalCount
              )} of ${totalCount} ${getTranslationFromI18nKeyAndLabel('investment:liquidFund.pagination.investments', 'investments')}`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('investment:liquidFund.pagination.rowsPerPage', 'Rows per page')}
                </p>
                <select
                  value={pageSize}
                  onChange={e => handlePaginationChange(1, Number(e.target.value))}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid="liquid-fund-investments-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div
                className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                data-testid="liquid-fund-investments-page-info"
              >
                {getTranslationFromI18nKeyAndLabel('investment:liquidFund.pagination.page', 'Page')} {currentPage} of{' '}
                {Math.ceil(totalCount / pageSize)}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaginationChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  data-testid="liquid-fund-investments-prev-page"
                >
                  {getTranslationFromI18nKeyAndLabel('investment:liquidFund.pagination.previous', 'Previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaginationChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="liquid-fund-investments-next-page"
                >
                  {getTranslationFromI18nKeyAndLabel('investment:liquidFund.pagination.next', 'Next')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  )
}

export default LiquidFundInvestmentsList
