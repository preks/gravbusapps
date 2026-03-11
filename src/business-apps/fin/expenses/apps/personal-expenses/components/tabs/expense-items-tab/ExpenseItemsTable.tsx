import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { useDebounce } from '@/common/hooks/useDebounce'
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { DataTable, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Button,
  Alert,
  Checkbox,
  Sheet,
  SheetContent,
  Badge,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { FileTextIcon, ImageIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action'
import { useGetExpenseItems, ExpenseFilter, type ExpenseItem } from '../../../hooks/useGetExpenseItems'
import { useExpenseCurrencies, type CurrencyStat } from '../../../hooks/useExpenseCurrencies'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getExpenseItemStatusDisplay } from '../../../utils'
import ExpenseItemDetails from './ExpenseItemDetails'
import { startProcess } from '@/common/utils/start-process'
import { notification } from 'antd'
import { formatCurrencyDisplay } from '../../../utils'
import { generateExpenseItemActions } from '../../../utils/expenseItemActions'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'

const DATA_TEST_ID_PREFIX = 'ExpenseItemsTable'

function applyExpenseDateRangeFromFilters(
  rawDateRange: unknown,
  setExpenseDateRange: (range: [Date | null, Date | null] | null) => void
): void {
  const isDisplayString =
    typeof rawDateRange === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(rawDateRange) && !rawDateRange.includes(',')
  if (isDisplayString) return
  const obj = rawDateRange as { from?: unknown; to?: unknown } | null | undefined
  const raw: string | string[] | null | undefined =
    rawDateRange == null
      ? undefined
      : typeof rawDateRange === 'object' &&
          !Array.isArray(rawDateRange) &&
          ('from' in rawDateRange || 'to' in rawDateRange)
        ? [obj?.from, obj?.to].filter(Boolean).join(',')
        : typeof rawDateRange === 'string' || Array.isArray(rawDateRange)
          ? rawDateRange
          : undefined
  const normalized = normalizeDateRange(raw)
  if (normalized && (normalized.from || normalized.to)) {
    setExpenseDateRange([
      normalized.from ? new Date(normalized.from) : null,
      normalized.to ? new Date(normalized.to) : null
    ])
  } else {
    setExpenseDateRange(null)
  }
}

function applyAmountRangeFromFilters(
  amt: { min?: number; max?: number } | undefined,
  setAmountRange: (range: { min?: number; max?: number } | null) => void
): void {
  if (amt && (amt.min !== undefined || amt.max !== undefined)) {
    setAmountRange({ min: amt.min, max: amt.max })
  } else {
    setAmountRange(null)
  }
}

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

  // Opportunity-style: FilterConfiguration for DataDisplay filter sheet (currency moved to toolbar)
  const expenseItemsFilterConfig: FilterConfiguration = useMemo(() => {
    const statusOptions = (props.availableStatuses || []).map(s => ({
      id: s.toLowerCase(),
      label: filterLabelMap[s.toLowerCase()] || s
    }))
    const groups: FilterConfiguration['groups'] = []

    groups.push(
      {
        id: 'status-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.status', 'Status'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'statusIds',
            field: 'statusIds',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.status', 'Status'),
            type: 'multi-select',
            config: { options: statusOptions, showSearch: false }
          }
        ]
      },
      {
        id: 'expenseDate-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_date_range', 'Expense Date'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'expenseDateRange',
            field: 'expenseDateRange',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_date_range', 'Expense Date'),
            type: 'date',
            config: {
              dateType: 'date',
              mode: 'range',
              placeholder: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_plan_list.expense_plan_table.start_date',
                'Start date'
              ),
              placeholderEnd: getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_plan_list.expense_plan_table.end_date',
                'End date'
              ),
              showClearButton: true
            }
          }
        ]
      },
      {
        id: 'amount-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.amount_range', 'Amount Range'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'amount',
            field: 'amount',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.amount_range', 'Amount Range'),
            type: 'number',
            config: {
              mode: 'range',
              min: 0,
              max: 1000000,
              step: 100,
              placeholderMin: 'Min Amount',
              placeholderMax: 'Max Amount'
            }
          }
        ]
      }
    )

    return { id: 'expense-items-filters', name: 'Expense Items Filters', groups }
  }, [filterLabelMap, props.availableStatuses])

  // Opportunity-style: filters object for DataDisplay (from current state; keeps card link)
  // Use a display string for expenseDateRange so the filter chip shows "Jan 1, 2024 – Jan 31, 2024" instead of [object Object]
  const filtersObject = useMemo((): Record<string, unknown> => {
    const statusIds = allSelectedFilters.filter(f =>
      (props.availableStatuses || []).map(s => s.toLowerCase()).includes(f)
    )
    const obj: Record<string, unknown> = {}
    if (statusIds.length > 0) obj.statusIds = statusIds
    if (expenseDateRange?.[0] || expenseDateRange?.[1]) {
      const from = expenseDateRange[0]
      const to = expenseDateRange[1]
      const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
      const fmt = (d: Date | null | undefined) => (d ? d.toLocaleDateString('en-GB', opts) : '')
      obj.expenseDateRange = from && to ? `${fmt(from)} – ${fmt(to)}` : fmt(from) || fmt(to)
    }
    if (amountRange && (amountRange.min !== undefined || amountRange.max !== undefined)) {
      obj.amount = { ...amountRange }
    }
    return obj
  }, [allSelectedFilters, expenseDateRange, amountRange, props.availableStatuses])

  // Currency: derived from filters for toolbar dropdown (currency moved out of sidebar)
  const selectedCurrencyCode = useMemo(() => {
    const currencyFilter = allSelectedFilters.find(f => f.startsWith('currency:'))
    if (!currencyFilter) return 'ALL'
    const ref = currencyFilter.replace('currency:', '')
    return currencyStats.find(cs => cs.ref === ref)?.code ?? 'ALL'
  }, [allSelectedFilters, currencyStats])

  const handleCurrencyChange = useCallback(
    (code: string) => {
      if (code === 'ALL') {
        setFilters(allSelectedFilters.filter(f => !f.startsWith('currency:')))
      } else {
        const cs = currencyStats.find(c => c.code === code)
        if (cs) {
          setFilters([...allSelectedFilters.filter(f => !f.startsWith('currency:')), `currency:${cs.ref}`])
        }
      }
      setCurrentPage(1)
    },
    [allSelectedFilters, currencyStats, setFilters]
  )

  const availableColumnsForDisplay = useMemo(
    () => [
      {
        id: 'selection',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.column_selection', 'Selection')
      },
      {
        id: 'title',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.expense_request_container.current_title_label',
          'Title'
        )
      },
      {
        id: 'expenseDate',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.date', 'Expense Date')
      },
      {
        id: 'status',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')
      },
      {
        id: 'attachment',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.attachment', 'Attachment')
      },
      {
        id: 'reimbursableAmount',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.reimbursable', 'Reimbursable Amount')
      }
    ],
    []
  )

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, any>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      setFilters(statusIds)
      applyExpenseDateRangeFromFilters(filters.expenseDateRange, setExpenseDateRange)
      applyAmountRangeFromFilters(filters.amount as { min?: number; max?: number } | undefined, setAmountRange)
      setCurrentPage(1)
    },
    [setFilters, setExpenseDateRange, setAmountRange]
  )

  // Sortable columns for DataDisplay (opportunity-style)
  const sortableColumns = useMemo(
    () => [
      {
        id: 'title',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_request.expense_request_container.current_title_label',
          'Title'
        )
      },
      {
        id: 'expenseDate',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.date', 'Expense Date')
      },
      {
        id: 'status',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')
      },
      {
        id: 'reimbursableAmount',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.reimbursable', 'Reimbursable Amount')
      }
    ],
    []
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

  const sorting = useMemo(() => {
    if (!sortOrder) return []
    return [{ id: sortField || 'expenseDate', desc: sortOrder === 'descend' }]
  }, [sortField, sortOrder])
  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      const entry = newSorting[0]
      const field = entry?.id || 'expenseDate'
      let orderFromTable: 'ascend' | 'descend' | undefined
      if (!entry) orderFromTable = undefined
      else orderFromTable = entry.desc ? 'descend' : 'ascend'
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
            onCheckedChange={checked => handleRowSelectionChange(row.original.id, checked === true)}
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
        <div
          className="gba:flex gba:justify-end gba:gap-2"
          role="group"
          tabIndex={0}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
          }}
        >
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
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-expense-item`}
            accessToken={contextProps.accessToken}
            data-testid={`${DATA_TEST_ID_PREFIX}-update-expense-item-button-${record.id}`}
          >
            <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </AppAction>
        </div>
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
          <div className="gba:flex gba:items-center gba:gap-2">
            <Label className="gba:font-medium gba:shrink-0">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
                'Currency'
              )}
              :
            </Label>
            <Select value={selectedCurrencyCode} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="gba:w-[140px]" data-testid="expense-items-currency-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.all_currencies', 'All')}
                </SelectItem>
                {currencyStats.map(cs => (
                  <SelectItem key={cs.ref} value={cs.code}>
                    {cs.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        sortableColumns={sortableColumns}
        onSortingChange={handleSortingChange}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        availableColumns={availableColumnsForDisplay}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_list.flows_button.expense_items',
          'Filter Expense Items'
        )}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.filter_expense_items_description',
          'Apply filters to narrow down the expense items list.'
        )}
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
          data-testid={DATA_TEST_ID_PREFIX}
        />
      </DataDisplay>

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
