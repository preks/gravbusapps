import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTranslation, DataTable, DataDisplay, Button, Alert } from '@newwork/nw-design-system'
import personalTranslations from '../../../../_i18n'
import { useDebounce } from '@/common/hooks/useDebounce'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { AppAction } from '@/components/app-action'
import { useGetExpenseItems, ExpenseFilter, type ExpenseItem } from '../../../../hooks/useGetExpenseItems'
import { useExpenseCurrencies, type CurrencyStat } from '../../../../hooks/useExpenseCurrencies'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import ExpenseItemDetails from '../details/ExpenseItemDetails'
import { startProcess } from '@/common/utils/start-process'
import { notification } from 'antd'
import { generateExpenseItemActions } from '../../../../utils/expenseItemActions'
import {
  resolveSelectedCurrencyCode,
  applyCurrencyChange,
  buildFilteredEmptyMessage,
  buildDefaultEmptyMessage
} from '../../../../utils/tableUtils'
import {
  CurrencyDropdown,
  DetailsSheet,
  RowActionsWrapper,
  RowActionsIcon
} from '../../../shared/TableSharedComponents'
import { createExpenseItemFilterConfig } from '../config/expenseItemFilterConfig'
import { expenseItemSortableColumns } from '../config/expenseItemSortableColumns'
import { expenseItemAvailableColumns } from '../config/expenseItemAvailableColumns'
import {
  applyAmountRangeFromFilters,
  applyExpenseDateRangeFromFilters,
  buildExpenseItemsFiltersObject
} from '../config/expenseItemsDisplayFilters'
import { createExpenseItemColumns, EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX } from './expenseItemColumns'

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

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200) // 200ms debounce for responsive feel

  // Get all selected filters (including date range and amount range) - use props instead of hook
  const allSelectedFilters = selectedFilters

  // Track if any filters are active to show conditional messages
  const hasActiveFilters = useMemo(() => {
    return debouncedSearch || allSelectedFilters.length > 0
  }, [debouncedSearch, allSelectedFilters])

  // Stable signature for "effective filters" (selectedFilters + active widget) – used to reset pagination when filters change (opportunity-style; keeps card link)
  const filterSignature = useMemo(
    () => [...allSelectedFilters].sort((a, b) => a.localeCompare(b)).join('\0') + '\0' + (props.activeWidgetKey ?? ''),
    [allSelectedFilters, props.activeWidgetKey]
  )

  // Reset to page 1 when filters or active card change (same as opportunities: handleFilterUpdate resets page)
  useEffect(() => {
    setCurrentPage(1)
  }, [filterSignature])

  // Server-side sorting state - properly managed for server-side sorting
  const [sortField, setSortField] = useState<string>('expenseDate')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend')

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const savedPageBeforeSearchRef = useRef<number | null>(null)

  const baseVisibleColumnIds = useMemo(
    () => ['selection', 'title', 'expenseDate', 'status', 'attachment', 'reimbursableAmount'],
    []
  )
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...baseVisibleColumnIds])

  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseItems(contextProps, { autoFetch: false })

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

  const expenseItemsFilterConfig = useMemo(
    () =>
      createExpenseItemFilterConfig({
        filterLabelMap,
        availableStatuses: props.availableStatuses || []
      }),
    [filterLabelMap, props.availableStatuses]
  )

  const filtersObject = useMemo(
    () =>
      buildExpenseItemsFiltersObject(allSelectedFilters, expenseDateRange, amountRange, props.availableStatuses || []),
    [allSelectedFilters, expenseDateRange, amountRange, props.availableStatuses]
  )

  // Currency: derived from filters for toolbar dropdown (currency moved out of sidebar)
  const selectedCurrencyCode = useMemo(
    () => resolveSelectedCurrencyCode(allSelectedFilters, currencyStats),
    [allSelectedFilters, currencyStats]
  )

  const handleCurrencyChange = useCallback(
    (code: string) => {
      applyCurrencyChange(code, allSelectedFilters, currencyStats, setFilters)
      setCurrentPage(1)
    },
    [allSelectedFilters, currencyStats, setFilters]
  )

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, any>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      const currencyTokens = allSelectedFilters.filter(f => f.startsWith('currency:'))
      setFilters([...currencyTokens, ...statusIds])
      applyExpenseDateRangeFromFilters(filters.expenseDateRange, setExpenseDateRange)
      applyAmountRangeFromFilters(filters.amount as { min?: number; max?: number } | undefined, setAmountRange)
      setCurrentPage(1)
    },
    [allSelectedFilters, setFilters, setExpenseDateRange, setAmountRange]
  )

  const buildApiFilters = useCallback(() => {
    // Use allSelectedFilters (immediate) so that when a card is deactivated we fetch with correct filters right away instead of after debounce (avoids brief flash of wrong data)
    const apiFilters = { ...getFilters(allSelectedFilters) } as ExpenseFilter

    // Only apply currency filter if explicitly selected by user
    // Check if currency is in selected filters first, then use selectedCurrencyRef
    const hasCurrencyFilter = allSelectedFilters.some(f => f.startsWith('currency:'))
    if (hasCurrencyFilter && selectedCurrencyRef) {
      apiFilters.currencyRef = selectedCurrencyRef
    }

    // Apply widget-driven filters directly to API request
    if (props.activeWidgetKey === 'total-expenses') {
      const start = new Date()
      start.setDate(1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      apiFilters.expenseDateStart = start.toISOString().split('T')[0]
      apiFilters.expenseDateEnd = end.toISOString().split('T')[0]
      apiFilters.status = ['PAID']
    } else if (props.activeWidgetKey === 'pending-reimbursement') {
      const start = new Date()
      start.setDate(1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      apiFilters.expenseDateStart = start.toISOString().split('T')[0]
      apiFilters.expenseDateEnd = end.toISOString().split('T')[0]
      apiFilters.status = ['PENDING']
    }

    return apiFilters
  }, [getFilters, selectedCurrencyRef, props.activeWidgetKey, allSelectedFilters])

  useEffect(() => {
    if (!initialized) return
    const searchTerm = debouncedSearch?.trim() || '%'
    const apiFilters = buildApiFilters()
    fetchItems(searchTerm, currentPage, pageSize, apiFilters, sortField, sortOrder)
  }, [fetchItems, currentPage, pageSize, debouncedSearch, sortField, sortOrder, initialized, buildApiFilters])

  // Refresh data when tableRefreshTrigger changes (triggered from parent tab)
  useEffect(() => {
    if (props.tableRefreshTrigger && props.tableRefreshTrigger > 0) {
      const searchTerm = debouncedSearch?.trim() || '%'
      const apiFilters = buildApiFilters()
      // Force refresh to bypass cache and get fresh data after process completion
      fetchItems(searchTerm, currentPage, pageSize, apiFilters, sortField, sortOrder, { force: true })
      // Clear selection when table is refreshed (process finished)
      setSelectedRowKeys([])
    }
  }, [
    props.tableRefreshTrigger,
    fetchItems,
    debouncedSearch,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    buildApiFilters
  ])

  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleSearchChange = useCallback(
    (value: string) => {
      const trimmedNext = (value || '').trim()
      const trimmedPrev = (search || '').trim()
      setSearch(value)

      // Detect transitions to manage page restoration
      if (trimmedPrev === '' && trimmedNext !== '') {
        // Starting a new search → save current page and jump to page 1
        savedPageBeforeSearchRef.current = currentPage
        setCurrentPage(1)
        return
      }

      if (trimmedPrev !== '' && trimmedNext === '') {
        setCurrentPage(1)
        savedPageBeforeSearchRef.current = null
        return
      }

      // While typing within search mode, keep user on page 1 for fresh results
      if (trimmedNext !== '') {
        setCurrentPage(1)
      }
    },
    [search, currentPage]
  )

  const handleAddExpenseItem = useCallback(() => {
    onAddExpenseItem()
  }, [onAddExpenseItem])

  const handleSelectItem = useCallback((item: any) => {
    setSelectedItem(item)
    setIsSheetOpen(true)
  }, [])

  const handleRowSelectionChange = useCallback(
    (itemId: string, checked: boolean) => {
      setSelectedRowKeys(prev => {
        if (checked) {
          return [...prev, itemId]
        } else {
          return prev.filter(key => key !== itemId)
        }
      })
    },
    [selectedRowKeys]
  )

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRowKeys(items?.map(item => item.id) || [])
      } else {
        setSelectedRowKeys([])
      }
    },
    [selectedRowKeys, items]
  )

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
    setIsSheetOpen(false)
  }, [])
  // Handlers for the top buttons
  const handleCreateExpenseRequest = useCallback(() => {
    if (!selectedRowKeys.length) return
    const selectedItems = items?.filter((item: any) => selectedRowKeys.includes(item.id)) || []

    // Check if all items are in 'CREATED' status (normalize possible shapes)
    const allCreated = selectedItems.every((item: any) => {
      const rawStatus = (item?.status ?? '').toString().toUpperCase()
      return rawStatus === 'CREATED'
    })
    if (!allCreated) {
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.error_message_item',
        'An Expense Request can be started only with items in status DRAFT.'
      )
      notification.error({
        message: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.error_message_create_request',
          'Cannot Create Expense Request'
        ),
        description: errorMessage,
        placement: 'bottomRight',
        duration: 5,
        className: 'gba:error-toast'
      })
      return
    }

    // Check if all items have the same currency
    const currencies = selectedItems.map((item: any) => item.currency?.code || item.currencyId)
    const uniqueCurrencies = [...new Set(currencies)]
    if (uniqueCurrencies.length > 1) {
      const errorMessage = getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_item_list.multiple_currencies_error_text',
        'The selected expense items must have the same currency to proceed.'
      )
      notification.error({
        message: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.error_message_create_request',
          'Cannot Create Expense Request'
        ),
        description: errorMessage,
        placement: 'bottomRight',
        duration: 5,
        className: 'gba:error-toast'
      })
      return
    }

    const expenseItems = selectedItems.map((element: any) => ({
      itemId: element.id,
      currencyId: element.currencyRef
    }))
    const payload = {
      employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
      expenseItems
    }
    // Log payload for create button
    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseRequest',
      payload,
      builderType: 'NATIVE_SCREEN'
    })
  }, [selectedRowKeys, items, contextProps.userInfo])

  const handleDeleteSelection = useCallback(
    (ids?: string[]) => {
      const targetIds = ids || selectedRowKeys
      if (!targetIds.length) return
      const selectedItems = items?.filter((item: any) => targetIds.includes(item.id)) || []
      const allAllowed = selectedItems.every((item: any) => item.status === 'CREATED' || item.status === 'ASSIGNED')
      if (!allAllowed) {
        const errorMessage = getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.error_message_delete_selectiondiscard_error',
          'You can only discard items with status "Created" or "Assigned".'
        )
        notification.error({
          message: getTranslationFromI18nKeyAndLabel(
            'lowcoder:personal_expenses.delete_selection_error',
            'Cannot Delete Selection'
          ),
          description: errorMessage,
          placement: 'bottomRight',
          duration: 5,
          className: 'gba:error-toast'
        })
        return
      }
      const payload = {
        employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
        expenseItemsIds: targetIds
      }

      startProcess({
        domain: 'employee-expense',
        processName: 'discardExpenseItems',
        payload
      })
    },
    [selectedRowKeys, items, contextProps.userInfo]
  )

  const sorting = useMemo(() => {
    if (!sortOrder) return []
    return [{ id: sortField || 'expenseDate', desc: sortOrder === 'descend' }]
  }, [sortField, sortOrder])
  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      const entry = newSorting[0]
      const field = entry?.id || 'expenseDate'
      let orderFromTable: 'ascend' | 'descend' | undefined
      if (entry) {
        orderFromTable = entry.desc ? 'descend' : 'ascend'
      } else {
        orderFromTable = undefined
      }
      const isSameColumn = sortField === field
      let nextOrder: 'ascend' | 'descend'
      if (isSameColumn && orderFromTable != null && orderFromTable !== sortOrder) {
        nextOrder = orderFromTable
      } else if (isSameColumn) {
        nextOrder = sortOrder === 'descend' ? 'ascend' : 'descend'
      } else {
        nextOrder = 'ascend'
      }
      setSortField(field)
      setSortOrder(nextOrder)
      setCurrentPage(1)
    },
    [sortField, sortOrder]
  )
  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])
  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setCurrentPage(newPagination.pageIndex + 1)
    setPageSize(newPagination.pageSize)
  }, [])
  const emptyMessage = hasActiveFilters
    ? buildFilteredEmptyMessage()
    : buildDefaultEmptyMessage(
        'lowcoder:personal_expenses.no_expense_items_found',
        'No expense items found. Create your first expense item to get started.'
      )

  const columns = useMemo<ColumnDef<ExpenseItem>[]>(
    () =>
      createExpenseItemColumns({
        items,
        selectedRowKeys,
        onSelectAll: handleSelectAll,
        onRowSelectionChange: handleRowSelectionChange
      }),
    [selectedRowKeys, items, handleSelectAll, handleRowSelectionChange]
  )

  const rowActions = useCallback(
    (row: { original: ExpenseItem }) => {
      const record = row.original
      return (
        <RowActionsWrapper>
          <AppAction
            variant="table-row"
            customActions={generateExpenseItemActions(
              record,
              {
                employeeId: contextProps.userInfo?.employeeDetails?.employeeId || '',
                accessToken: contextProps.accessToken || ''
              },
              { includeDetails: true, includeAssignToRequest: true }
            ).map(action => {
              if (action.key === 'view-expense-item-details') {
                return {
                  ...action,
                  onClick: (e?: React.MouseEvent) => {
                    e?.stopPropagation()
                    handleSelectItem(record)
                  }
                }
              }
              return action
            })}
            prefixDataTestId={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-update-expense-item`}
            accessToken={contextProps.accessToken}
            data-testid={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-update-expense-item-button-${record.id}`}
          >
            <RowActionsIcon />
          </AppAction>
        </RowActionsWrapper>
      )
    },
    [contextProps.userInfo?.employeeDetails?.employeeId, contextProps.accessToken, handleSelectItem]
  )

  const primaryAction = useMemo(
    () => (
      <Button
        onClick={handleAddExpenseItem}
        size="sm"
        variant="default"
        data-testid="add-expense-item-button"
        type="button"
      >
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule_details.calculation_allowance_setup_list.calculation_allowance_setup_modal.btn_add',
          'Add'
        )}
      </Button>
    ),
    [handleAddExpenseItem]
  )

  const secondaryActions = useMemo(
    () => (
      <>
        {currencyStats.length > 0 && (
          <CurrencyDropdown
            currencyStats={currencyStats}
            selectedCurrencyCode={selectedCurrencyCode}
            onCurrencyChange={handleCurrencyChange}
            testIdPrefix="expense-items"
          />
        )}
        {selectedRowKeys.length > 0 && (
          <>
            <Button
              variant="default"
              data-testid="create-expense-request-btn"
              onClick={() => handleCreateExpenseRequest()}
              className="gba:inline-flex gba:items-center gba:gap-2"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_list.flows_button.create_expense_request',
                'Create Expense Request'
              )}{' '}
              ({selectedRowKeys.length})
            </Button>
            <Button
              variant="destructive"
              data-testid="delete-selection-btn"
              onClick={() => handleDeleteSelection()}
              className="gba:inline-flex gba:items-center gba:gap-2"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.delete_selection', 'Delete Selection')} (
              {selectedRowKeys.length})
            </Button>
          </>
        )}
      </>
    ),
    [
      currencyStats,
      selectedCurrencyCode,
      handleCurrencyChange,
      selectedRowKeys.length,
      handleCreateExpenseRequest,
      handleDeleteSelection
    ]
  )

  // Show error state (after all hooks so hook order is stable)
  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-error-state`}
      >
        <Alert variant="destructive" className="gba:mb-4">
          <div className="gba:text-lg gba:font-medium gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:personal_expenses.error_loading_expense_items',
              'Error Loading Expense Items'
            )}
          </div>
          <div className="gba:text-gray-600">{error}</div>
        </Alert>
        <Button
          variant="default"
          onClick={() => {
            const searchTerm = debouncedSearch?.trim() || '%'
            const apiFilters = buildApiFilters()
            fetchItems(searchTerm, currentPage, pageSize, apiFilters, sortField, sortOrder)
          }}
          data-testid={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-retry-button`}
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.retry', 'Retry')}
        </Button>
      </div>
    )
  }

  return (
    <>
      <DataDisplay
        titleSections={[
          {
            id: 'list',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_list.flows_button.expense_items',
              'Expense Items'
            ),
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="list"
        searchValue={search}
        searchPlaceholder={
          getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.job_search', 'Search') +
          '...'
        }
        onSearchChange={handleSearchChange}
        filters={filtersObject}
        filterConfiguration={expenseItemsFilterConfig}
        onFilterChange={handleFilterChangeFromDisplay}
        sorting={sorting}
        sortableColumns={expenseItemSortableColumns}
        onSortingChange={handleSortingChange}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        availableColumns={expenseItemAvailableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={tPersonal('filter-expense-items-title')}
        filterSheetDescription={tPersonal('filter-expense-items-description')}
      >
        <DataTable<ExpenseItem>
          data={items || []}
          columns={columns.filter(col =>
            visibleColumns.includes((col as ColumnDef<ExpenseItem> & { id?: string }).id ?? '')
          )}
          loading={isLoading}
          error={error || undefined}
          totalCount={totalCount}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          tableLayout="fixed"
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage={emptyMessage}
          actions={rowActions}
          onRowClick={handleSelectItem}
          data-testid={EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}
        />
      </DataDisplay>

      <DetailsSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        title={
          selectedItem?.title ||
          getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_item_details', 'Expense Item Details')
        }
        testId="expense-item-details-sheet"
      >
        {selectedItem ? (
          <ExpenseItemDetails
            selectedItem={selectedItem}
            onClose={handleCloseDetails}
            accessToken={props.accessToken}
            userInfo={props.userInfo}
          />
        ) : null}
      </DetailsSheet>
    </>
  )
})

export default ExpenseItemsTable
