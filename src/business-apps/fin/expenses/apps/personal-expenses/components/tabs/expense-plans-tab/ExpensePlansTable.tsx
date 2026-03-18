import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { DataTable, DataDisplay, type FilterConfiguration } from '@newwork/nw-design-system'
import type { ColumnDef, CellContext } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpensePlan } from '../../../hooks/useGetExpensePlans'
import { getExpensePlanStatusDisplay } from '../../../utils'
import ExpensePlanDetails from './ExpensePlanDetails'
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails'
import { startProcess } from '@/common/utils/start-process'
import { Badge, Button } from '@newwork/nw-design-system'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { useExpensePlanFileService } from '../../../utils/expensePlanFileService'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatCurrencyDisplay } from '../../../utils'
import {
  formatDateRangeForChip,
  applyDateRangeFromFilter,
  resolveSelectedCurrencyCode,
  applyCurrencyChange,
  buildEmptyMessage
} from '../../../utils/tableUtils'
import {
  CurrencyDropdown,
  PrintPreviewDialog,
  DetailsSheet,
  RowActionsWrapper,
  RowActionsIcon
} from '../../shared/TableSharedComponents'

const DATA_TEST_ID_PREFIX = 'ExpensePlansTable'

export interface ExpensePlansTableProps extends BusinessAppContextProps {
  items: ExpensePlan[] | undefined
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  pageSize: number
  onTableChange: (pagination: any, filters: any, sorter: any) => void
  search: string
  onSearchChange: (search: string) => void
  selectedFilters: string[]
  setFilters: (filters: string[]) => void
  filterGroups: DataFilterGroup[]
  handleFilterChange: (filterId: string, selected: boolean) => void
  clearFilters: () => void
  filterLabelMap: Record<string, string>
  addFilter: (filterId: string, selected: boolean) => void
  removeFilter: (filterId: string) => void
  tableRefreshTrigger?: number
  // injected from tab: computed currency stats for building currency group and pills
  currencyStats?: Array<{ ref: string; code: string; count: number }>
  // Sorting state from parent
  sortField?: string
  sortOrder?: 'ascend' | 'descend' | null
  planDateRange?: [Date | null, Date | null] | null
  setPlanDateRange?: (range: [Date | null, Date | null] | null) => void
  startDateRange?: [Date | null, Date | null] | null
  setStartDateRange?: (range: [Date | null, Date | null] | null) => void
  endDateRange?: [Date | null, Date | null] | null
  setEndDateRange?: (range: [Date | null, Date | null] | null) => void
  effectiveDateRange?: [Date | null, Date | null] | null
  setEffectiveDateRange?: (range: [Date | null, Date | null] | null) => void
  onFiltersChange?: () => void
  availableStatuses?: string[]
}

function ExpensePlanCodeCell({ record }: Readonly<{ record: ExpensePlan }>) {
  return (
    <div className="gba:font-medium gba:text-sm gba:truncate" data-testid="expense-plan-code-cell">
      {record.code}
    </div>
  )
}

function ExpensePlanTitleCell({ record }: Readonly<{ record: ExpensePlan }>) {
  return (
    <div className="gba:font-medium gba:text-sm gba:truncate" data-testid="expense-plan-title-cell">
      {record.title}
    </div>
  )
}

function ExpensePlanDateCell({ dateValue, testId }: Readonly<{ dateValue: string | null; testId: string }>) {
  if (!dateValue) {
    return <span className="gba:text-sm gba:text-muted-foreground">N/A</span>
  }
  let formatted: string
  try {
    formatted = formatDate(dateValue, 'date.short') || 'N/A'
  } catch {
    formatted = 'N/A'
  }
  return (
    <div className="gba:text-sm gba:truncate" data-testid={testId}>
      {formatted}
    </div>
  )
}

function ExpensePlanStatusCell({ record }: Readonly<{ record: ExpensePlan }>) {
  const statusConfig = getExpensePlanStatusDisplay(record.status)
  return (
    <span className="gba:inline-block gba:whitespace-nowrap">
      <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-plan-status-cell">
        {statusConfig.label}
      </Badge>
    </span>
  )
}

function ExpensePlanReimbursableAmountCell({ record }: Readonly<{ record: ExpensePlan }>) {
  const amount = record.reimbursableAmount || 0
  return (
    <div
      className="gba:text-right gba:text-sm gba:font-mono gba:truncate"
      data-testid="expense-plan-reimbursable-amount-cell"
    >
      {formatCurrencyDisplay(amount, record.currency?.code)}
    </div>
  )
}

function ExpensePlanPaidAdvanceCell({ record }: Readonly<{ record: ExpensePlan }>) {
  return (
    <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate" data-testid="expense-plan-paid-advance-cell">
      {record.advancePaymentPaidAmount && record.advancePaymentPaidAmount > 0 ? (
        formatCurrencyDisplay(record.advancePaymentPaidAmount, record.currency?.code)
      ) : (
        <span className="gba:text-muted-foreground">-</span>
      )}
    </div>
  )
}

function renderCodeCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanCodeCell record={info.row.original} />
}
function renderTitleCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanTitleCell record={info.row.original} />
}
function renderPlanDateCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanDateCell dateValue={info.row.original.planDate} testId="expense-plan-plan-date-cell" />
}
function renderStartDateCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanDateCell dateValue={info.row.original.startDate} testId="expense-plan-start-date-cell" />
}
function renderEndDateCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanDateCell dateValue={info.row.original.endDate} testId="expense-plan-end-date-cell" />
}
function renderStatusCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanStatusCell record={info.row.original} />
}
function renderReimbursableAmountCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanReimbursableAmountCell record={info.row.original} />
}
function renderPaidAdvanceCell(info: CellContext<ExpensePlan, unknown>) {
  return <ExpensePlanPaidAdvanceCell record={info.row.original} />
}

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = React.memo(props => {
  const {
    items: plans,
    isLoading,
    totalCount,
    currentPage,
    pageSize,
    onTableChange,
    search,
    selectedFilters,
    sortField,
    sortOrder,
    planDateRange,
    setPlanDateRange,
    startDateRange,
    setStartDateRange,
    endDateRange,
    setEndDateRange,
    effectiveDateRange,
    setEffectiveDateRange,
    onFiltersChange,
    availableStatuses = [],
    ...contextProps
  } = props

  // Column visibility (like Items tab)
  const baseVisibleColumnIds = useMemo(
    () => [
      'code',
      'title',
      'planDate',
      'startDate',
      'endDate',
      'status',
      'reimbursableAmount',
      'advancePaymentPaidAmount'
    ],
    []
  )
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...baseVisibleColumnIds])

  // FilterConfiguration for DataDisplay filter sheet (currency in toolbar)
  const expensePlansFilterConfig: FilterConfiguration = useMemo(() => {
    const statusOptions = availableStatuses.map(s => ({
      id: s,
      label: props.filterLabelMap?.[s] || s
    }))
    const planTypeOptions = [
      {
        id: 'planType:EXPENSES',
        label:
          props.filterLabelMap?.['planType:EXPENSES'] ||
          getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense')
      },
      {
        id: 'planType:TRIP',
        label:
          props.filterLabelMap?.['planType:TRIP'] ||
          getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')
      }
    ]
    const groups: FilterConfiguration['groups'] = [
      {
        id: 'effectiveDate-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'effectiveDateRange',
            field: 'effectiveDateRange',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date'),
            type: 'date',
            config: {
              dateType: 'date',
              mode: 'range',
              placeholder: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
              placeholderEnd: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date'),
              showClearButton: true
            }
          }
        ]
      },
      {
        id: 'planDate-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'planDateRange',
            field: 'planDateRange',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date'),
            type: 'date',
            config: {
              dateType: 'date',
              mode: 'range',
              placeholder: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
              placeholderEnd: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date'),
              showClearButton: true
            }
          }
        ]
      },
      {
        id: 'startDate-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'startDateRange',
            field: 'startDateRange',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date'),
            type: 'date',
            config: {
              dateType: 'date',
              mode: 'range',
              placeholder: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
              placeholderEnd: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date'),
              showClearButton: true
            }
          }
        ]
      },
      {
        id: 'endDate-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'endDateRange',
            field: 'endDateRange',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date'),
            type: 'date',
            config: {
              dateType: 'date',
              mode: 'range',
              placeholder: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
              placeholderEnd: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date'),
              showClearButton: true
            }
          }
        ]
      },
      {
        id: 'status-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'statusIds',
            field: 'statusIds',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_plan_table.status',
              'Status'
            ),
            type: 'multi-select',
            config: { options: statusOptions }
          }
        ]
      },
      {
        id: 'planType-group',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_type', 'Plan Type'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'planTypeIds',
            field: 'planTypeIds',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_type', 'Plan Type'),
            type: 'multi-select',
            config: { options: planTypeOptions }
          }
        ]
      }
    ]
    return { id: 'expense-plans-filters', name: 'Expense Plans Filters', groups }
  }, [availableStatuses, props.filterLabelMap])

  const filtersObject = useMemo((): Record<string, unknown> => {
    const statusIds = (selectedFilters || []).filter(f => availableStatuses.includes(f))
    const planTypeIds = (selectedFilters || []).filter(f => f.startsWith('planType:'))
    const obj: Record<string, unknown> = {}
    if (statusIds.length > 0) obj.statusIds = statusIds
    if (planTypeIds.length > 0) obj.planTypeIds = planTypeIds
    const planDateStr = formatDateRangeForChip(planDateRange)
    if (planDateStr) obj.planDateRange = planDateStr
    const effectiveDateStr = formatDateRangeForChip(effectiveDateRange)
    if (effectiveDateStr) obj.effectiveDateRange = effectiveDateStr
    const startDateStr = formatDateRangeForChip(startDateRange)
    if (startDateStr) obj.startDateRange = startDateStr
    const endDateStr = formatDateRangeForChip(endDateRange)
    if (endDateStr) obj.endDateRange = endDateStr
    return obj
  }, [selectedFilters, planDateRange, effectiveDateRange, startDateRange, endDateRange, availableStatuses])

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      const planTypeIds = (filters.planTypeIds as string[] | undefined) || []
      const dateRangeTokens: string[] = []
      if (applyDateRangeFromFilter(filters.planDateRange, setPlanDateRange)) dateRangeTokens.push('planDateRange')
      if (applyDateRangeFromFilter(filters.effectiveDateRange, setEffectiveDateRange))
        dateRangeTokens.push('effectiveDateRange')
      if (applyDateRangeFromFilter(filters.startDateRange, setStartDateRange)) dateRangeTokens.push('startDateRange')
      if (applyDateRangeFromFilter(filters.endDateRange, setEndDateRange)) dateRangeTokens.push('endDateRange')
      // Preserve currency and top-destination; the filter sheet only controls status, plan type, and date ranges
      const preserved = (props.selectedFilters || []).filter(
        f => f.startsWith('currency:') || f.startsWith('topDestination:')
      )
      props.setFilters([...preserved, ...statusIds, ...planTypeIds, ...dateRangeTokens])
      onFiltersChange?.()
    },
    [
      props.setFilters,
      props.selectedFilters,
      setPlanDateRange,
      setEffectiveDateRange,
      setStartDateRange,
      setEndDateRange,
      onFiltersChange
    ]
  )

  const sortableColumns = useMemo(
    () => [
      {
        id: 'code',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
          'Plan Number'
        )
      },
      {
        id: 'title',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title')
      },
      {
        id: 'planDate',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date')
      },
      {
        id: 'startDate',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_plan_list.expense_plan_table.start_date',
          'Start Date'
        )
      },
      {
        id: 'endDate',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date')
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

  const availableColumnsForDisplay = useMemo(
    () => [
      {
        id: 'code',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
          'Plan Number'
        )
      },
      {
        id: 'title',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title')
      },
      {
        id: 'planDate',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date')
      },
      {
        id: 'startDate',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_plan_list.expense_plan_table.start_date',
          'Start Date'
        )
      },
      {
        id: 'endDate',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date')
      },
      {
        id: 'status',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')
      },
      {
        id: 'reimbursableAmount',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.reimbursable', 'Reimbursable Amount')
      },
      {
        id: 'advancePaymentPaidAmount',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_plan_list.expense_plan_table.paid_advance',
          'Paid Advance'
        )
      }
    ],
    []
  )

  // Preserve page index across search clear (search is controlled by parent via props)
  const savedPageBeforeSearchRef = useRef<number | null>(null)
  const prevSearchRef = useRef<string>('')
  const hasActiveFilters = useMemo(() => {
    const trimmedSearch = (search || '').trim()
    const nonCurrencyFilters = (selectedFilters || []).filter(f => !f.startsWith('currency:'))
    return trimmedSearch !== '' || nonCurrencyFilters.length > 0
  }, [search, selectedFilters])

  // Server-side sorting state - managed by parent component
  // Remove local sorting state as it should be managed by parent

  const [selectedItem, setSelectedItem] = useState<ExpensePlan | null>(null)
  const [selectedExpenseRequest, setSelectedExpenseRequest] = useState<any>(null)
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false)
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('')
  const [printLoading, setPrintLoading] = useState<boolean>(false)

  // Use the file service hook
  const { printExpensePlan, isMounted } = useExpensePlanFileService(props)

  const handleSelectItem = useCallback((item: ExpensePlan) => {
    setSelectedItem(item)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
    setSelectedExpenseRequest(null)
  }, [])

  const handlePrintPlan = useCallback(
    async (record: ExpensePlan) => {
      setPrintLoading(true)
      setPrintModalOpen(true)

      try {
        const result = await printExpensePlan(record)

        if (result.success && result.pdfUrl && isMounted.current) {
          setPrintPdfUrl(result.pdfUrl)
        } else if (!result.success) {
          console.error('Error printing plan:', result.error)
        }
      } catch (error) {
        console.error('Error fetching print PDF:', error)
      } finally {
        if (isMounted.current) {
          setPrintLoading(false)
        }
      }
    },
    [printExpensePlan, isMounted]
  )

  const handleAddExpensePlan = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
      // TODO: Replace with nw-design-system toast when available
      console.warn('User information not loaded yet. Please wait a moment and try again.')
      return
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpensePlan',
      payload: {
        employeeId: employeeId
      },
      builderType: 'NATIVE_SCREEN'
    })
  }, [contextProps.userInfo])

  const handleViewExpenseRequestDetails = useCallback((record: ExpensePlan) => {
    const requestId = (record as any)?.expenseRequest?.[0]?.id
    if (!requestId) {
      console.warn('No related expense request found on expense plan record.')
      return
    }
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: requestId,
      referrer: '/platform/fin/expenses/personal-expenses?tab=expense-plans'
    })
    navigateTo(url)
  }, [])

  const handleViewExpensePlanDetails = useCallback((record: ExpensePlan) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: record.id,
      referrer: '/platform/fin/expenses/personal-expenses?tab=expense-plans'
    })
    navigateTo(url)
  }, [])

  const sorting = useMemo(() => {
    if (!sortOrder) return []
    return [{ id: sortField || 'planDate', desc: sortOrder === 'descend' }]
  }, [sortField, sortOrder])
  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      if (!onTableChange) return
      const entry = newSorting[0]
      if (!entry) {
        onTableChange({ current: 1, pageSize }, {}, { field: sortField || 'planDate', order: undefined })
        return
      }
      const isSameColumn = entry.id === sortField
      const incomingOrder = entry.desc ? 'descend' : 'ascend'
      if (isSameColumn && sortOrder === 'descend' && incomingOrder === 'ascend') {
        onTableChange({ current: 1, pageSize }, {}, { field: entry.id, order: undefined })
      } else {
        onTableChange({ current: 1, pageSize }, {}, { field: entry.id, order: incomingOrder })
      }
    },
    [onTableChange, pageSize, sortField, sortOrder]
  )
  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])
  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      if (!onTableChange) return
      onTableChange({ current: newPagination.pageIndex + 1, pageSize: newPagination.pageSize }, {}, {})
    },
    [onTableChange]
  )
  const emptyMessage = buildEmptyMessage(
    hasActiveFilters,
    'lowcoder:personal_expenses.no_plan_data',
    'No expense plans found. Create your first expense plan to get started.'
  )

  const selectedCurrencyCode = useMemo(
    () => resolveSelectedCurrencyCode(selectedFilters || [], props.currencyStats || []),
    [selectedFilters, props.currencyStats]
  )

  const handleCurrencyChange = useCallback(
    (code: string) => {
      applyCurrencyChange(code, selectedFilters || [], props.currencyStats || [], props.setFilters)
    },
    [selectedFilters, props.currencyStats, props.setFilters]
  )

  const secondaryActions = useMemo(
    () =>
      props.currencyStats?.length ? (
        <CurrencyDropdown
          currencyStats={props.currencyStats}
          selectedCurrencyCode={selectedCurrencyCode}
          onCurrencyChange={handleCurrencyChange}
          testIdPrefix="expense-plans"
        />
      ) : undefined,
    [props.currencyStats, selectedCurrencyCode, handleCurrencyChange]
  )

  const columns = useMemo<ColumnDef<ExpensePlan>[]>(
    () => [
      {
        id: 'code',
        accessorKey: 'code',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
          'Plan Number'
        ),
        size: 120,
        cell: renderCodeCell
      },
      {
        id: 'title',
        accessorKey: 'title',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title'),
        size: 200,
        cell: renderTitleCell
      },
      {
        id: 'planDate',
        accessorKey: 'planDate',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date'),
        size: 110,
        cell: renderPlanDateCell
      },
      {
        id: 'startDate',
        accessorKey: 'startDate',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_plan_list.expense_plan_table.start_date',
          'Start Date'
        ),
        size: 110,
        cell: renderStartDateCell
      },
      {
        id: 'endDate',
        accessorKey: 'endDate',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date'),
        size: 110,
        cell: renderEndDateCell
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        size: 180,
        minSize: 160,
        maxSize: 280,
        cell: renderStatusCell
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
        cell: renderReimbursableAmountCell
      },
      {
        id: 'advancePaymentPaidAmount',
        accessorKey: 'advancePaymentPaidAmount',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_plan_list.expense_plan_table.paid_advance',
          'Paid Advance'
        ),
        size: 120,
        meta: { align: 'right' as const },
        cell: renderPaidAdvanceCell
      }
    ],
    []
  )

  const rowActions = useCallback(
    (row: { original: ExpensePlan }) => {
      const record = row.original
      return (
        <RowActionsWrapper>
          <AppAction
            variant="table-row"
            customActions={[
              ...(record.status === 'CREATED' || record.status === 'REJECTED'
                ? [
                    {
                      category: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_list.flows_button.actions',
                        'Actions'
                      ),
                      key: 'update-plan',
                      label: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_plan_list.expense_plan_flows.update_plan',
                        'Update Plan'
                      ),
                      onClick: () => {
                        startProcess({
                          domain: 'employee-expense',
                          processName: 'changeExpensePlan',
                          payload: {
                            employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                            expensePlanId: record.id
                          },
                          builderType: 'NATIVE_SCREEN'
                        })
                      }
                    }
                  ]
                : []),
              ...((record.status === 'APPROVED' || record.status === 'CLOSED') && record.employeeDocument?.file?.trim()
                ? [
                    {
                      category: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_list.flows_button.actions',
                        'Actions'
                      ),
                      key: 'print',
                      label: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_plan_list.expense_plan_flows.print',
                        'Print'
                      ),
                      onClick: () => handlePrintPlan(record)
                    }
                  ]
                : []),
              ...(record.status === 'APPROVED'
                ? [
                    {
                      category: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_list.flows_button.actions',
                        'Actions'
                      ),
                      key: 'request-advance',
                      label: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:add_items_to_plan.add_trip_info_to_plan.skip_advance_payment_label',
                        'Request Advance Payment'
                      ),
                      onClick: () => {
                        startProcess({
                          domain: 'employee-expense',
                          processName: 'changeAdvancePayment',
                          payload: {
                            employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                            expensePlan: record.id
                          },
                          builderType: 'NATIVE_SCREEN'
                        })
                      }
                    }
                  ]
                : []),
              ...(record.status === 'APPROVED'
                ? [
                    {
                      category: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_list.flows_button.actions',
                        'Actions'
                      ),
                      key: 'create-expense-request',
                      label: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_list.flows_button.create_expense_request',
                        'Create Expense Request'
                      ),
                      onClick: () => {
                        startProcess({
                          domain: 'employee-expense',
                          processName: 'changeExpenseRequest',
                          payload: {
                            employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                            expensePlanId: record.id
                          },
                          builderType: 'NATIVE_SCREEN'
                        })
                      }
                    }
                  ]
                : []),
              {
                category: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_list.flows_button.navigations',
                  'Navigations'
                ),
                key: 'view-plan-details',
                label: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_plan_list.expense_plan_flows.view_plan_details_btn',
                  'View Plan Details'
                ),
                onClick: (e?: React.MouseEvent) => {
                  e?.stopPropagation()
                  handleViewExpensePlanDetails(record)
                }
              },
              ...(record.expenseRequest &&
              (record.expenseRequest as unknown as any[]).length > 0 &&
              (record.expenseRequest as unknown as any[])[0].id != null
                ? [
                    {
                      category: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_list.flows_button.navigations',
                        'Navigations'
                      ),
                      key: 'view-request-details',
                      label: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
                        'View Request Details'
                      ),
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation()
                        handleViewExpenseRequestDetails(record)
                      }
                    }
                  ]
                : [])
            ]}
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-expense-plan`}
            accessToken={contextProps.accessToken}
            data-testid={`${DATA_TEST_ID_PREFIX}-update-expense-plan-button-${record.id}`}
          >
            <RowActionsIcon />
          </AppAction>
        </RowActionsWrapper>
      )
    },
    [
      contextProps.userInfo?.employeeDetails?.employeeId,
      contextProps.accessToken,
      handlePrintPlan,
      handleViewExpensePlanDetails,
      handleViewExpenseRequestDetails
    ]
  )

  useEffect(() => {
    if (props.tableRefreshTrigger && props.tableRefreshTrigger > 0 && onTableChange) {
      // Trigger a table refresh by calling onTableChange with current pagination & current sort
      const pagination = {
        current: currentPage,
        pageSize
      }
      const sorter = sortField ? { field: sortField, order: sortOrder } : {}
      onTableChange(pagination, {}, sorter)
    }
  }, [props.tableRefreshTrigger, currentPage, pageSize, sortField, sortOrder, onTableChange])

  // Watch search prop transitions to manage page restore when cleared
  useEffect(() => {
    const prev = (prevSearchRef.current || '').trim()
    const next = (props.search || '').trim()
    if (prev === '' && next !== '') {
      savedPageBeforeSearchRef.current = currentPage
      onTableChange({ current: 1, pageSize, total: totalCount }, {}, {})
    } else if (prev !== '' && next === '') {
      onTableChange({ current: 1, pageSize, total: totalCount }, {}, {})
      savedPageBeforeSearchRef.current = null
    }
    prevSearchRef.current = props.search || ''
  }, [props.search, onTableChange, currentPage, pageSize, totalCount])

  const primaryAction = useMemo(
    () => (
      <Button
        onClick={handleAddExpensePlan}
        data-testid="add-expense-plan-button"
        className="gba:inline-flex gba:items-center gba:gap-2"
      >
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule_details.calculation_allowance_period_list.calculation_allowance_period_modal.btn_add',
          'Add'
        )}
      </Button>
    ),
    [handleAddExpensePlan]
  )

  return (
    <div>
      <DataDisplay
        titleSections={[
          {
            id: 'list',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.title', 'My Expense Plans'),
            metadata: { count: totalCount, isLoading }
          }
        ]}
        currentSection="list"
        searchValue={search ?? ''}
        searchPlaceholder={
          getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.job_search', 'Search') +
          '...'
        }
        onSearchChange={props.onSearchChange}
        filters={filtersObject}
        filterConfiguration={expensePlansFilterConfig}
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
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.title', 'Filter Expense Plans')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.filter_expense_plans_description',
          'Apply filters to narrow down the expense plans list.'
        )}
      >
        <DataTable<ExpensePlan>
          data={plans || []}
          columns={columns.filter(col =>
            visibleColumns.includes((col as ColumnDef<ExpensePlan> & { id?: string }).id ?? '')
          )}
          loading={isLoading}
          error={props.error || undefined}
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

      <DetailsSheet
        open={!!selectedItem}
        onOpenChange={open => !open && handleCloseDetails()}
        title={
          selectedItem?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_plan.expense_subtitle_details',
            'Expense Plan Details'
          )
        }
        testId="expense-plan-details-sheet"
      >
        {selectedItem ? (
          <ExpensePlanDetails
            selectedItem={selectedItem}
            onClose={handleCloseDetails}
            accessToken={props.accessToken}
            userInfo={props.userInfo}
          />
        ) : null}
      </DetailsSheet>

      <DetailsSheet
        open={!!selectedExpenseRequest}
        onOpenChange={open => !open && handleCloseDetails()}
        title={
          selectedExpenseRequest?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
            'Expense Request Details'
          )
        }
        testId="expense-request-details-sheet"
      >
        {selectedExpenseRequest ? (
          <ExpenseRequestDetails
            selectedItem={selectedExpenseRequest}
            onClose={handleCloseDetails}
            accessToken={props.accessToken}
            userInfo={props.userInfo}
          />
        ) : null}
      </DetailsSheet>

      <PrintPreviewDialog
        open={printModalOpen}
        onOpenChange={open => {
          if (!open) {
            setPrintModalOpen(false)
            setPrintPdfUrl('')
          }
        }}
        title={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.print_expense_plan', 'Print Expense Plan')}
        loading={printLoading}
        pdfUrl={printPdfUrl}
        testIdPrefix="print-plan"
      />
    </div>
  )
})

export default ExpensePlansTable
