import { useTranslation } from '@newwork/nw-design-system'
import personalTranslations from '../../../../_i18n'
import React, { useState, useCallback, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useGetExpenseItems, ExpenseFilter, type ExpenseItem } from '../../../../hooks/useGetExpenseItems'
import { useExpenseCurrencies, type CurrencyStat } from '../../../../hooks/useExpenseCurrencies'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { createExpenseItemColumns } from './expenseItemColumns'
import { createExpenseItemSortableColumns } from '../config/expenseItemSortableColumns'
import { createExpenseItemAvailableColumns } from '../config/expenseItemAvailableColumns'
import { useExpenseItemsTableState } from './useExpenseItemsTableState'
import { useExpenseItemsData } from './useExpenseItemsData'
import { useExpenseItemsBulkActions } from './useExpenseItemsBulkActions'
import { useTableSetup } from '../../../../../../common/hooks/useTableSetup'
import { useEmptyMessage } from '../../../../../../common/hooks/useSharedTabState'
import { ExpenseItemsPrimaryAction, ExpenseItemsSecondaryActions } from './ExpenseItemsTableActions'
import { ExpenseItemsTableDisplay } from './ExpenseItemsTableDisplay'
import { ExpenseItemsTableErrorState } from './ExpenseItemsTableErrorState'
import { useExpenseItemRowActions } from './useExpenseItemRowActions'
import { useExpenseItemsTableFilters } from './useExpenseItemsTableFilters'
import { ExpenseItemsDetailsSheet } from './ExpenseItemsDetailsSheet'

export interface ExpenseItemsTableProps extends BusinessAppContextProps {
  onAddExpenseItem: () => void
  selectedFilters: string[]
  addFilter: (filterId: string) => void
  removeFilter: (filterId: string) => void
  clearFilters: () => void
  filterGroups: DataFilterGroup[]
  filterLabelMap: Record<string, string>
  getFilters: (filtersToApply?: string[]) => ExpenseFilter
  setFilters: (filters: string[]) => void
  availableStatuses: string[]
  amountRange?: { min?: number; max?: number } | null
  setAmountRange: (range: { min?: number; max?: number } | null) => void
  expenseDateRange?: [Date | null, Date | null] | null
  setExpenseDateRange: (range: [Date | null, Date | null] | null) => void
  tableRefreshTrigger?: number
  activeWidgetKey?: string
  currencyStats?: CurrencyStat[]
  currenciesInitialized?: boolean
}

const BASE_VISIBLE_COLUMN_IDS = ['selection', 'title', 'expenseDate', 'status', 'attachment', 'reimbursableAmount']

const ExpenseItemsTable: React.FC<ExpenseItemsTableProps> = React.memo(props => {
  const {
    onAddExpenseItem,
    selectedFilters,
    filterLabelMap,
    getFilters,
    setFilters,
    amountRange,
    setAmountRange,
    expenseDateRange,
    setExpenseDateRange,
    ...contextProps
  } = props

  const { t: tPersonal } = useTranslation(personalTranslations)
  const expenseDateLabel = tPersonal('expense-items-date-label')

  const allSelectedFilters = selectedFilters

  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseItems(contextProps, { autoFetch: false })
  const normalizedItems = items || []

  const {
    search,
    debouncedSearch,
    hasActiveFilters,
    currentPage,
    pageSize,
    visibleColumns,
    selectedRowKeys,
    sorting,
    effectiveSortField,
    effectiveSortOrder,
    setCurrentPage,
    setPageSize,
    setVisibleColumns,
    handleSearchChange,
    handleSortingChange,
    handleRowSelectionChange,
    handleSelectAll,
    clearSelection
  } = useExpenseItemsTableState({
    selectedFilters: allSelectedFilters,
    activeWidgetKey: props.activeWidgetKey,
    expenseDateRange,
    amountRange,
    initialVisibleColumnIds: BASE_VISIBLE_COLUMN_IDS,
    items: normalizedItems
  })

  const hookCurrencies = useExpenseCurrencies(
    contextProps,
    allSelectedFilters,
    props.currencyStats == null ? setFilters : undefined
  )
  const currencyStats = props.currencyStats ?? hookCurrencies.currencyStats
  const initialized = props.currenciesInitialized ?? hookCurrencies.initialized
  const selectedCurrencyRef = useMemo(() => {
    if (props.currencyStats != null) {
      const token = allSelectedFilters.find(f => f.startsWith('currency:'))
      return token ? token.substring('currency:'.length) : undefined
    }
    return hookCurrencies.selectedCurrencyRef
  }, [props.currencyStats, allSelectedFilters, hookCurrencies.selectedCurrencyRef])

  const {
    expenseItemsFilterConfig,
    filtersObject,
    selectedCurrencyCode,
    availableCurrencyCodes,
    handleCurrencyChange,
    handleFilterChangeFromDisplay,
    buildApiFilters
  } = useExpenseItemsTableFilters({
    allSelectedFilters,
    filterLabelMap,
    availableStatuses: props.availableStatuses || [],
    expenseDateRange,
    amountRange,
    setFilters,
    setExpenseDateRange,
    setAmountRange,
    setCurrentPage,
    currencyStats,
    selectedCurrencyRef,
    getFilters
  })

  const { retryFetch } = useExpenseItemsData({
    initialized,
    tableRefreshTrigger: props.tableRefreshTrigger,
    debouncedSearch,
    currentPage,
    pageSize,
    effectiveSortField,
    effectiveSortOrder,
    buildApiFilters,
    clearSelection,
    fetchItems
  })

  const [selectedItem, setSelectedItem] = useState<ExpenseItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleSelectItem = useCallback((item: ExpenseItem) => {
    setSelectedItem(item)
    setIsSheetOpen(true)
  }, [])

  const { handleCreateExpenseRequest, handleDeleteSelection } = useExpenseItemsBulkActions({
    selectedRowKeys,
    items: normalizedItems,
    userInfo: contextProps.userInfo
  })

  const emptyMessage = useEmptyMessage(
    hasActiveFilters,
    'lowcoder:personal_expenses.no_expense_items_found',
    'No expense items found. Create your first expense item to get started.'
  )

  const columns = useMemo<ColumnDef<ExpenseItem>[]>(
    () =>
      createExpenseItemColumns({
        items: normalizedItems,
        selectedRowKeys,
        onSelectAll: handleSelectAll,
        onRowSelectionChange: handleRowSelectionChange,
        expenseDateLabel
      }),
    [selectedRowKeys, normalizedItems, handleSelectAll, handleRowSelectionChange, expenseDateLabel]
  )
  const sortableColumns = useMemo(() => createExpenseItemSortableColumns(expenseDateLabel), [expenseDateLabel])
  const availableColumns = useMemo(() => createExpenseItemAvailableColumns(expenseDateLabel), [expenseDateLabel])
  const {
    columns: visibleTableColumns,
    pagination,
    handlePaginationChange
  } = useTableSetup<ExpenseItem>(props, columns, visibleColumns, currentPage, pageSize, setCurrentPage, setPageSize)

  const rowActions = useExpenseItemRowActions({
    employeeId: contextProps.userInfo?.employeeDetails?.employeeId || '',
    accessToken: contextProps.accessToken || '',
    onSelectItem: handleSelectItem
  })
  // Show error state (after all hooks so hook order is stable)
  if (error) {
    return <ExpenseItemsTableErrorState error={error} onRetry={retryFetch} />
  }

  return (
    <>
      <ExpenseItemsTableDisplay
        totalCount={totalCount}
        isLoading={isLoading}
        search={search}
        onSearchChange={handleSearchChange}
        filters={filtersObject}
        filterConfiguration={expenseItemsFilterConfig}
        onFilterChange={handleFilterChangeFromDisplay}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        sortableColumns={sortableColumns}
        availableColumns={availableColumns}
        primaryAction={<ExpenseItemsPrimaryAction onAddExpenseItem={onAddExpenseItem} />}
        secondaryActions={
          <ExpenseItemsSecondaryActions
            availableCurrencyCodes={availableCurrencyCodes}
            selectedCurrencyCode={selectedCurrencyCode}
            onCurrencyChange={handleCurrencyChange}
            selectedCount={selectedRowKeys.length}
            onCreateExpenseRequest={handleCreateExpenseRequest}
            onDeleteSelection={() => handleDeleteSelection()}
          />
        }
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        filterSheetTitle={tPersonal('filter-expense-items-title')}
        filterSheetDescription={tPersonal('filter-expense-items-description')}
        data={normalizedItems}
        columns={visibleTableColumns}
        error={error}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        emptyMessage={emptyMessage}
        actions={rowActions}
        onRowClick={handleSelectItem}
      />
      <ExpenseItemsDetailsSheet
        selectedItem={selectedItem}
        isOpen={isSheetOpen}
        onOpenChange={open => {
          setIsSheetOpen(open)
          if (!open) setSelectedItem(null)
        }}
        accessToken={props.accessToken}
        userInfo={props.userInfo}
      />
    </>
  )
})

export default ExpenseItemsTable
