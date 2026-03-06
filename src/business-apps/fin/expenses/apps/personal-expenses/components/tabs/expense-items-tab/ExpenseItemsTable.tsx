import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { useDebounce } from '@/common/hooks/useDebounce'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { DataTable } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { Button, Alert, Checkbox, Sheet, SheetContent, Badge } from '@newwork/nw-design-system'
import { FileTextIcon, ImageIcon } from '@phosphor-icons/react'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { useGetExpenseItems, ExpenseFilter, type ExpenseItem } from '../../../hooks/useGetExpenseItems'
import { useExpenseCurrencies } from '../../../hooks/useExpenseCurrencies'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getExpenseItemStatusDisplay } from '../../../utils'
import ExpenseItemDetails from './ExpenseItemDetails'
import { startProcess } from '@/common/utils/start-process'
import { notification } from 'antd'
import { formatCurrencyDisplay } from '../../../utils'
import { generateExpenseItemActions } from '../../../utils/expenseItemActions'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'

const DATA_TEST_ID_PREFIX = 'ExpenseItemsTable'

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
  tableRefreshTrigger?: number
  activeWidgetKey?: string
}

const ExpenseItemsTable: React.FC<ExpenseItemsTableProps> = React.memo(props => {
  const {
    onAddExpenseItem,
    selectedFilters,
    addFilter,
    removeFilter,
    clearFilters,
    filterGroups,
    filterLabelMap,
    getFilters,
    setFilters,
    ...contextProps
  } = props

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200) // 200ms debounce for responsive feel

  // Get all selected filters (including date range and amount range) - use props instead of hook
  const allSelectedFilters = selectedFilters
  const debouncedSelectedFilters = useDebounce(allSelectedFilters, 200) // 200ms debounce

  // Track if any filters are active to show conditional messages
  const hasActiveFilters = useMemo(() => {
    return debouncedSearch || allSelectedFilters.length > 0
  }, [debouncedSearch, allSelectedFilters])

  // Server-side sorting state - properly managed for server-side sorting
  const [sortField, setSortField] = useState<string>('expenseDate')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend')

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const savedPageBeforeSearchRef = useRef<number | null>(null)

  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseItems(contextProps, { autoFetch: false })

  const { currencyStats, selectedCurrencyRef, initialized } = useExpenseCurrencies(
    contextProps,
    allSelectedFilters,
    setFilters
  )

  const currencyLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    currencyStats.forEach(cs => {
      map[`currency:${cs.ref}`] = cs.code
    })
    return map
  }, [currencyStats])

  const combinedFilterLabelMap = useMemo(
    () => ({
      ...filterLabelMap,
      ...currencyLabelMap
    }),
    [filterLabelMap, currencyLabelMap]
  )

  // currency fetching now handled by useExpenseCurrencies

  const buildApiFilters = useCallback(() => {
    const apiFilters = { ...getFilters(debouncedSelectedFilters) } as ExpenseFilter

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
      apiFilters.status = ['PAID', 'CLOSED']
    } else if (props.activeWidgetKey === 'pending-reimbursement') {
      const start = new Date()
      start.setDate(1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      apiFilters.expenseDateStart = start.toISOString().split('T')[0]
      apiFilters.expenseDateEnd = end.toISOString().split('T')[0]
      apiFilters.status = ['PENDING']
    }

    return apiFilters
  }, [getFilters, debouncedSelectedFilters, selectedCurrencyRef, props.activeWidgetKey, allSelectedFilters])

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
        // Clearing search → restore saved page if available
        setCurrentPage(savedPageBeforeSearchRef.current || 1)
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

  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      if (filterId.startsWith('currency:')) {
        if (selected) {
          // Allow only a single currency at a time
          const nonCurrency = allSelectedFilters.filter(f => !f.startsWith('currency:'))
          setFilters([...nonCurrency, filterId])
        } else {
          removeFilter(filterId)
        }
      } else {
        if (selected) {
          addFilter(filterId)
        } else {
          removeFilter(filterId)
        }
      }
      setCurrentPage(1)
    },
    [addFilter, removeFilter, setFilters, allSelectedFilters]
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
    // setSelectedRowKeys([]);
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

  const sorting = useMemo(
    () => (sortOrder ? [{ id: sortField || 'expenseDate', desc: sortOrder === 'descend' }] : []),
    [sortField, sortOrder]
  )
  const handleSortingChange = useCallback((newSorting: Array<{ id: string; desc: boolean }>) => {
    const entry = newSorting[0]
    const field = entry?.id || 'expenseDate'
    const order = entry ? (entry.desc ? 'descend' : 'ascend') : undefined
    if (entry) {
      setSortField(field)
      setSortOrder(order)
    } else {
      setSortField('expenseDate')
      setSortOrder('descend')
    }
    setCurrentPage(1)
  }, [])
  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])
  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setCurrentPage(newPagination.pageIndex + 1)
    setPageSize(newPagination.pageSize)
  }, [])
  const emptyMessage = hasActiveFilters
    ? getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data available')
    : getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.no_expense_items_found',
        'No expense items found. Create your first expense item to get started.'
      )

  const columns = useMemo<ColumnDef<ExpenseItem>[]>(
    () => [
      {
        id: 'selection',
        size: 40,
        header: () => (
          <Checkbox
            checked={(items?.length ?? 0) > 0 && (items ?? []).every(item => selectedRowKeys.includes(item.id))}
            onCheckedChange={handleSelectAll}
            data-testid={`${DATA_TEST_ID_PREFIX}-select-all-checkbox`}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedRowKeys.includes(row.original.id)}
            onCheckedChange={checked => handleRowSelectionChange(row.original.id, checked as boolean)}
            onClick={e => e.stopPropagation()}
            data-testid={`${DATA_TEST_ID_PREFIX}-selection-checkbox-${row.original.id}`}
          />
        )
      },
      {
        id: 'title',
        accessorKey: 'title',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.expense_request_container.current_title_label',
          'Title'
        ),
        size: 200,
        cell: ({ row }) => (
          <div className="gba:font-medium gba:text-sm gba:truncate" data-testid="expense-title-cell">
            {row.original.title}
          </div>
        )
      },
      {
        id: 'expenseDate',
        accessorKey: 'expenseDate',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.date', 'Expense Date'),
        size: 120,
        cell: ({ row }) =>
          row.original.expenseDate ? (
            <div className="gba:text-sm gba:truncate" data-testid="expense-expense-date-cell">
              {(() => {
                try {
                  return formatDate(row.original.expenseDate!, 'date.long') || 'N/A'
                } catch {
                  return 'N/A'
                }
              })()}
            </div>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">N/A</span>
          )
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        size: 100,
        cell: ({ row }) => {
          const statusConf = getExpenseItemStatusDisplay(row.original.status)
          return (
            <Badge variant={statusConf.badgeVariant || 'outline'} data-testid="expense-status-cell">
              {statusConf.label}
            </Badge>
          )
        }
      },
      {
        id: 'attachment',
        accessorFn: (row: ExpenseItem) => row.expenseItemFile?.length ?? 0,
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.attachment', 'Attachment'),
        size: 80,
        cell: ({ row }) => (
          <div className="gba:flex gba:items-center gba:justify-center">
            {row.original.expenseItemFile && row.original.expenseItemFile.length > 0 ? (
              <FileTextIcon size={24} className="gba:text-blue-500" />
            ) : (
              <ImageIcon size={24} className="gba:text-gray-300" />
            )}
          </div>
        )
      },
      {
        id: 'reimbursableAmount',
        accessorKey: 'reimbursableAmount',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:approve_expense_request.reimbursable',
          'Reimbursable Amount'
        ),
        size: 140,
        meta: { align: 'right' as const },
        cell: ({ row }) => (
          <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate" data-testid="expense-amount-cell">
            {formatCurrencyDisplay(row.original.reimbursableAmount ?? 0, row.original.currency?.code)}
          </div>
        )
      }
    ],
    [selectedRowKeys, items?.length, handleSelectAll, handleRowSelectionChange]
  )

  const rowActions = useCallback(
    (row: { original: ExpenseItem }) => {
      const record = row.original
      return (
        <div className="gba:flex gba:justify-end gba:gap-2" onClick={e => e.stopPropagation()}>
          <AppActionButton
            data-testid={`${DATA_TEST_ID_PREFIX}-update-expense-item-button-${record.id}`}
            size="icon"
            staticFlowData={generateExpenseItemActions(
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
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-expense-item`}
            accessToken={contextProps.accessToken}
            emptyStateBehavior="enable"
            deferMainContextRequestsUntilClick
          />
        </div>
      )
    },
    [contextProps.userInfo?.employeeDetails?.employeeId, contextProps.accessToken, handleSelectItem]
  )

  // Show error state
  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
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
          data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.retry', 'Retry')}
        </Button>
      </div>
    )
  }

  return (
    <>
      <DataContainer
        dataControllerProps={{
          listTitle: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_list.flows_button.expense_items',
            'Expense Items'
          ),
          listAmount: totalCount ? `${totalCount}` : undefined,
          search: search,
          setSearch: handleSearchChange,
          placeholder:
            getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.job_search', 'Search') +
            '...',
          filter: allSelectedFilters,
          setFilter: (filters: string[]) => {
            // This is called by DataController's "Clear all filters" button or individual filter removal
            if (filters.length === 0) {
              // Clear all filters including amount range
              clearFilters()
              // Also clear the search state when clearing all filters
              handleSearchChange('')
            } else {
              // Handle individual filter removal - find which filters were removed and remove them
              const removedFilters = allSelectedFilters.filter(f => !filters.includes(f))
              removedFilters.forEach(filterId => removeFilter(filterId))
            }
          },
          filterLabelMap: combinedFilterLabelMap,
          addButton: {
            onClick: handleAddExpenseItem,
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule_details.calculation_allowance_setup_list.calculation_allowance_setup_modal.btn_add',
              'Add'
            ),
            'data-testid': 'add-expense-item-button'
          },
          actions: [
            ...(selectedRowKeys.length > 0
              ? [
                  <Button
                    key={`create-expense-request-${selectedRowKeys.join('|')}`}
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
                  </Button>,
                  <Button
                    key={`delete-selection-${selectedRowKeys.join('|')}`}
                    variant="destructive"
                    data-testid="delete-selection-btn"
                    onClick={() => handleDeleteSelection()}
                    className="gba:inline-flex gba:items-center gba:gap-2"
                  >
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_item_list.delete_selection',
                      'Delete Selection'
                    )}{' '}
                    ({selectedRowKeys.length})
                  </Button>
                ]
              : [])
          ]
        }}
        dataFilterProps={{
          filterGroups: useMemo(() => {
            const currencyGroup: DataFilterGroup | null =
              currencyStats.length > 0
                ? {
                    id: 'currency',
                    title: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
                      'Currency'
                    ),
                    filters: currencyStats.map(cs => ({
                      id: `currency:${cs.ref}`,
                      label: cs.code,
                      selected: allSelectedFilters.includes(`currency:${cs.ref}`)
                    }))
                  }
                : null
            return currencyGroup ? [currencyGroup, ...filterGroups] : filterGroups
          }, [currencyStats, filterGroups, allSelectedFilters]),
          onFilterChange: handleFilterChange as (filterId: string, selected: boolean) => void
        }}
        contentBackground="white"
        dataBody={
          <DataTable<ExpenseItem>
            data={items || []}
            columns={columns}
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
            data-testid={DATA_TEST_ID_PREFIX}
          />
        }
        addLeftPaddingWhenNoFilter={true}
      />

      {/* Sheet for details */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedItem?.title ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.expense_item_details',
                'Expense Item Details'
              )
            }
          >
            {selectedItem ? (
              <ExpenseItemDetails
                selectedItem={selectedItem}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            ) : null}
          </ExpenseDetailsShell>
        </SheetContent>
      </Sheet>
    </>
  )
})

export default ExpenseItemsTable
