/**
 * Advance Payments Table Component
 * Displays a table of advance payments with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAdvancePayments } from '../../../hooks/useAdvancePayment'
import { useDebounce } from '@/common/hooks/useDebounce'

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Alert,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge
} from '@newwork/nw-design-system'
import { PiArrowUp, PiArrowDown } from 'react-icons/pi'
import ExpenseRequestPagination from '../expence-requests-tab/components/ExpenseRequestPagination'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'

import { getAdvancePaymentStatusDisplay } from '../../../utils/utils'
import AdvancePaymentDetails from './AdvancePaymentDetailsBackoffice'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrency } from '../../../utils/currencyUtils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { useFilterData, type OrganizationalUnit, type Currency } from '../../../hooks/useFilterData'

interface FilterData {
  organizationalUnits: OrganizationalUnit[]
  currencies: Currency[]
  mostUsedCurrency: string | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
  isActive?: boolean // ⚡ PERFORMANCE: Only fetch data when tab is active
  filterData?: FilterData // ⚡ PERFORMANCE: Accept shared filter data from parent
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = props => {
  const { search, onSearchChange, isActive = true, filterData: propsFilterData, ...context } = props

  const [searchText, setSearchText] = useState(search || '')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortKey, setSortKey] = useState<string>('createdAt')
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC')

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [amountMinFilter, setAmountMinFilter] = useState('')
  const [amountMaxFilter, setAmountMaxFilter] = useState('')
  const [advanceMinFilter, setAdvanceMinFilter] = useState('')
  const [advanceMaxFilter, setAdvanceMaxFilter] = useState('')
  const [reporterFilter, setReporterFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')

  // ⚡ PERFORMANCE: Use filter data from parent if provided, otherwise fetch locally
  const localFilterData = useFilterData({ accessToken: propsFilterData ? undefined : context.accessToken })
  const filterData = propsFilterData || localFilterData
  const { currencies } = filterData

  // Reporter search states
  const [reporterSearchText, setReporterSearchText] = useState('')
  const [showReporterDropdown, setShowReporterDropdown] = useState(false)
  const [reporterSearchResults, setReporterSearchResults] = useState<string[]>([])
  const [reporterSearchLoading, setReporterSearchLoading] = useState(false)
  const [selectedReporters, setSelectedReporters] = useState<string[]>([])

  // Helper to handle reporter selection (reduces nesting)
  const handleReporterSelection = useCallback(
    (reporter: string) => {
      let newSelected: string[]
      if (selectedReporters.includes(reporter)) {
        newSelected = selectedReporters.filter(r => r !== reporter)
      } else {
        newSelected = [...selectedReporters, reporter]
      }
      setSelectedReporters(newSelected)
      setReporterFilter(newSelected.join(','))
      setCurrentPage(1)
    },
    [selectedReporters]
  )

  // Helper to get reporter button className (avoids ternary in template)
  const getReporterButtonClassName = useCallback(
    (reporter: string): string => {
      const baseClasses = 'gba:w-full gba:text-left gba:p-2 gba:text-sm gba:hover:bg-accent gba:transition-colors'
      if (selectedReporters.includes(reporter)) {
        return `${baseClasses} gba:bg-accent gba:text-accent-foreground`
      }
      return `${baseClasses} gba:text-foreground`
    },
    [selectedReporters]
  )

  // Helper to render reporter dropdown content (eliminates nested ternary at L653)
  const renderReporterDropdown = useCallback(() => {
    if (reporterSearchLoading) {
      return (
        <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.loading_employees', 'Loading employees...')}
        </div>
      )
    }

    if (reporterSearchResults.length === 0) {
      return (
        <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.no_employees_found', 'No employees found')}
        </div>
      )
    }

    return reporterSearchResults.map(reporter => (
      <button
        key={reporter}
        className={getReporterButtonClassName(reporter)}
        onClick={() => handleReporterSelection(reporter)}
        data-testid={`reporter-option-${reporter}`}
      >
        {reporter}
      </button>
    ))
  }, [reporterSearchLoading, reporterSearchResults, getReporterButtonClassName, handleReporterSelection])

  // Status filter states
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])

  // Selection states
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [selectedActionType, setSelectedActionType] = useState<'advance-payment' | 'plan' | 'request'>(
    'advance-payment'
  )

  const { payments, totalCount, isLoading, error, fetchPayments, searchReporters, searchStatuses, setOrderBy } =
    useAdvancePayments({
      ...context,
      isActive // ⚡ PERFORMANCE: Only initialize loading state when tab is active
    })

  // Debounced values using useDebounce hook
  const debouncedSearchText = useDebounce(searchText, 300)
  const debouncedReporterSearchText = useDebounce(reporterSearchText, 300)

  // Navigation handler for plan details
  const handleNavigateToPlanDetails = useCallback((record: any) => {
    if (record.expensePlan?.id) {
      const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
        expensePlanId: record.expensePlan.id
      })
      navigateTo(url)
    }
  }, [])

  // Navigation handler for request details
  const handleNavigateToRequestDetails = useCallback((record: any) => {
    if (record.expensePlan?.expenseRequest?.[0]?.id) {
      const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
        expenseRequestId: record.expensePlan.expenseRequest[0].id
      })
      navigateTo(url)
    }
  }, [])

  // Handle debounced search for reporters
  useEffect(() => {
    const searchReportersDebounced = async () => {
      if (!debouncedReporterSearchText.trim()) {
        setReporterSearchResults([])
        return
      }

      setReporterSearchLoading(true)
      try {
        const results = await searchReporters(debouncedReporterSearchText)
        setReporterSearchResults(results)
      } catch (error) {
        console.error(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:advance_payment_table.error_searching_reporters',
            'Error searching reporters:'
          ),
          error
        )
        setReporterSearchResults([])
      } finally {
        setReporterSearchLoading(false)
      }
    }

    searchReportersDebounced()
  }, [debouncedReporterSearchText, searchReporters])

  // Handle debounced fetch payments - only when active
  useEffect(() => {
    if (isActive) {
      fetchPayments({
        searchTerm: debouncedSearchText,
        page: currentPage,
        pageSize: pageSize,
        status: statusFilter.length > 0 ? statusFilter.join(',') : undefined,
        amountMin: amountMinFilter,
        amountMax: amountMaxFilter,
        advanceMin: advanceMinFilter,
        advanceMax: advanceMaxFilter,
        reporter: reporterFilter,
        currencyRef: currencyFilter
      })
    }
  }, [
    debouncedSearchText,
    currentPage,
    pageSize,
    statusFilter,
    amountMinFilter,
    amountMaxFilter,
    advanceMinFilter,
    advanceMaxFilter,
    reporterFilter,
    currencyFilter,
    fetchPayments,
    isActive
  ])

  // Load available statuses from backend
  useEffect(() => {
    const loadAvailableStatuses = async () => {
      try {
        const statuses = await searchStatuses()
        setAvailableStatuses(statuses)
      } catch (error) {
        console.error('[Advance Payments] ❌ Error loading available statuses:', error)
      }
    }

    loadAvailableStatuses()
  }, [searchStatuses])

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchText) {
      setSearchText(search)
      setCurrentPage(1)
    }
  }, [search, searchText])

  // Handle search changes
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value)
      setCurrentPage(1)

      // Notify parent if callback exists
      if (onSearchChange) {
        onSearchChange(value)
      }
    },
    [onSearchChange]
  )

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.reporter-search-container')) {
        setShowReporterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
    setSelectedActionType('advance-payment')
  }, [])

  // Enhanced table change handler for sorting
  const handleEnhancedTableChange = (pagination: any, _filters: any, sorter: any) => {
    setCurrentPage(pagination.current)
    setPageSize(pagination.pageSize)
    if (sorter?.field && sorter?.order) {
      const direction: 'ASC' | 'DESC' = sorter.order === 'ascend' ? 'ASC' : 'DESC'
      setOrderBy([{ [sorter.field]: direction }])
      setSortKey(sorter.field)
      setSortDir(direction)
    }
  }

  const buildOrderBy = useCallback((key: string, dir: 'ASC' | 'DESC'): Array<Record<string, any>> => {
    switch (key) {
      case 'title':
        return [{ expensePlan: { title: dir } }]
      case 'reporter':
        // Mirror Expense Requests: firstName, lastName, then id for stability
        return [
          { expensePlan: { employee: { firstName: dir } } },
          { expensePlan: { employee: { lastName: dir } } },
          { id: dir }
        ]
      case 'orgUnit':
        return [{ expensePlan: { employee: { employeePosition: { organizationalUnit: { name: dir } } } } }]
      case 'costCenter':
        return [{ costCenter: { name: dir } }, { expensePlan: { costCenter: { name: dir } } }]
      case 'paymentMethod':
        return [{ paymentMethod: dir }]
      case 'planCode':
        return [{ expensePlan: { code: dir } }]
      case 'status':
        return [{ status: dir }]
      case 'planTotalAmount':
        return [{ expensePlan: { totalAmount: dir } }]
      case 'advanceAmount':
        return [{ amount: dir }]
      default:
        return [{ createdAt: 'DESC' }]
    }
  }, [])

  const toggleSort = useCallback(
    (columnKey: string) => {
      let nextDir: 'ASC' | 'DESC'
      if (sortKey === columnKey && sortDir === 'ASC') {
        nextDir = 'DESC'
      } else {
        nextDir = 'ASC'
      }
      const nextOrderBy = buildOrderBy(columnKey, nextDir)
      setOrderBy(nextOrderBy)
      setSortKey(columnKey)
      setSortDir(nextDir)
      setCurrentPage(1)
      // Refetch is triggered by orderBy change via hook dependency and by page reset
    },
    [buildOrderBy, setOrderBy, sortKey, sortDir]
  )

  // Helper to render sort icon (reduces nested ternary complexity)
  const renderSortIcon = useCallback(
    (columnKey: string) => {
      if (sortKey === columnKey) {
        return sortDir === 'ASC' ? (
          <PiArrowUp size={12} className="gba:ml-1" />
        ) : (
          <PiArrowDown size={12} className="gba:ml-1" />
        )
      }
      return <span className="gba:ml-1 gba:inline-block gba:w-[12px] gba:h-[12px]" />
    },
    [sortKey, sortDir]
  )

  // Helper to get details title based on action type (reduces nested ternary complexity)
  const getDetailsTitle = useCallback((item: any, actionType: string): string => {
    if (actionType === 'advance-payment') {
      return (
        item.title ||
        item.description ||
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:advance_payment_table.advance_payment_details',
          'Advance Payment Details'
        )
      )
    }
    if (actionType === 'plan') {
      return (
        item.expensePlan?.title ||
        getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.plan_details', 'Plan Details')
      )
    }
    return (
      item.expensePlan?.expenseRequest?.title ||
      getTranslationFromI18nKeyAndLabel('lowcoder:confirm_transfer_advance_payment.request_details', 'Request Details')
    )
  }, [])

  // Helper to get payment method display (reduces nested ternary complexity)
  const getPaymentMethodDisplay = useCallback((paymentMethod: string | null | undefined): string => {
    if (paymentMethod === 'DIRECT_DEPOSIT') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
        'Direct Deposit'
      )
    }
    if (paymentMethod) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
        'Cash Payment'
      )
    }
    return 'N/A'
  }, [])

  // Helper to build action buttons configuration (reduces complexity)
  const buildActionButtons = useCallback(
    (record: any, hasExpenseRequest: boolean) => {
      const baseActions = [
        {
          category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations', 'Navigations'),
          key: 'view-advance-payment-details',
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:advance_payment_table.view_advance_payment_details',
            'View Advance Payment Details'
          ),
          onClick: (e?: React.MouseEvent) => {
            e?.stopPropagation()
            setSelectedItem(record)
            setSelectedActionType('advance-payment')
          }
        },
        {
          category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations', 'Navigations'),
          key: 'view-plan-details',
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_plan_list.expense_plan_flows.view_plan_details',
            'View Plan Details'
          ),
          onClick: (e?: React.MouseEvent) => {
            e?.stopPropagation()
            handleNavigateToPlanDetails(record)
          }
        }
      ]

      if (hasExpenseRequest) {
        baseActions.push({
          category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations', 'Navigations'),
          key: 'view-request-details',
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
            'View Request Details'
          ),
          onClick: (e?: React.MouseEvent) => {
            e?.stopPropagation()
            handleNavigateToRequestDetails(record)
          }
        })
      }

      return baseActions
    },
    [handleNavigateToPlanDetails, handleNavigateToRequestDetails]
  )

  // Helper to render a single payment row (reduces complexity)
  const renderPaymentRow = useCallback(
    (record: any) => {
      const hasExpenseRequest =
        record.expensePlan &&
        Array.isArray(record.expensePlan.expenseRequest) &&
        record.expensePlan.expenseRequest.length > 0 &&
        record.expensePlan.expenseRequest[0]?.id

      const actionButtons = buildActionButtons(record, hasExpenseRequest)

      return (
        <TableRow
          key={record.id}
          data-testid={`advance-payment-row-${record.id}`}
          onClick={(event: React.MouseEvent<HTMLTableRowElement>) => {
            const target = event.target as HTMLElement
            const isActionButton = target.closest('[data-testid*="actions"]')
            if (!isActionButton) {
              setSelectedItem(record)
            }
          }}
          className="gba:cursor-pointer gba:hover:bg-gray-50"
        >
          <TableCell className="gba:py-4 gba:px-3">
            <div className="gba:flex gba:justify-start gba:gap-2">
              <AppActionButton
                data-testid={`advance-payment-actions-${record.id}`}
                size="icon"
                staticFlowData={actionButtons}
                prefixDataTestId="advance-payment-actions"
                accessToken={context.accessToken}
                emptyStateBehavior="enable"
                deferMainContextRequestsUntilClick
                onClick={e => e.stopPropagation()}
              />
            </div>
          </TableCell>
          <TableCell>
            <div
              className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
              title={record.employeeFullName || 'N/A'}
              data-testid="advance-payment-reporter-cell"
            >
              {record.employeeFullName || 'N/A'}
            </div>
          </TableCell>
          <TableCell>
            <div
              className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
              title={record.title || record.description || 'N/A'}
              data-testid="advance-payment-title-cell"
            >
              {record.title || record.description || 'N/A'}
            </div>
          </TableCell>
          <TableCell>
            <div
              className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
              title={record.expensePlan?.employee?.employeePosition?.organizationalUnit?.name || 'N/A'}
              data-testid="advance-payment-org-unit-cell"
            >
              {record.expensePlan?.employee?.employeePosition?.organizationalUnit?.name || 'N/A'}
            </div>
          </TableCell>
          <TableCell>
            <div
              className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
              title={record.costCenter?.name || 'N/A'}
              data-testid="advance-payment-cost-center-cell"
            >
              {record.costCenter?.name || 'N/A'}
            </div>
          </TableCell>
          <TableCell>
            <div
              className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
              title={record.expensePlan?.code || 'N/A'}
              data-testid="advance-payment-plan-id-cell"
            >
              {record.expensePlan?.code || 'N/A'}
            </div>
          </TableCell>
          <TableCell className="gba:py-4">
            <div className="gba:flex gba:items-center gba:justify-center" data-testid="advance-payment-status-cell">
              <Badge variant={getAdvancePaymentStatusDisplay(record.status || 'N/A').badgeVariant || 'outline'}>
                {getAdvancePaymentStatusDisplay(record.status || 'N/A').label}
              </Badge>
            </div>
          </TableCell>
          <TableCell className="gba:text-right">
            <span data-testid="advance-payment-amount-cell">
              {formatCurrency(
                record.expensePlan?.totalAmount ?? 0,
                record.currency?.code || record.expensePlan?.currency?.code || 'EUR'
              )}
            </span>
          </TableCell>
          <TableCell className="gba:text-right">
            <span data-testid="advance-payment-advance-cell">
              {formatCurrency(record.amount ?? 0, record.currency?.code || record.expensePlan?.currency?.code || 'EUR')}
            </span>
          </TableCell>
          <TableCell>
            <div
              className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap"
              data-testid="advance-payment-method-cell"
            >
              {getPaymentMethodDisplay(record.paymentMethod)}
            </div>
          </TableCell>
        </TableRow>
      )
    },
    [buildActionButtons, context.accessToken, getPaymentMethodDisplay]
  )

  // Helper to render loading/error/empty states
  const renderEmptyState = useCallback(() => {
    if (isLoading && !payments?.length) {
      return (
        <div className="gba:flex gba:justify-center gba:p-8">
          <Spinner />
        </div>
      )
    }

    if (error) {
      let errorMessage: string
      if (error instanceof Error) {
        errorMessage = error.message
      } else {
        errorMessage = String(error)
      }
      return <Alert variant="destructive">{errorMessage}</Alert>
    }

    if (!payments || payments.length === 0) {
      return (
        <div className="gba:p-8 gba:text-center gba:text-muted-foreground">
          <div>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:advance_payment_table.no_advance_payments_found',
              'No advance payments found matching the current filters. Clear all filters to see all payments.'
            )}
          </div>
        </div>
      )
    }

    return null
  }, [isLoading, error, payments])

  const renderDataBody = useCallback(() => {
    const emptyState = renderEmptyState()
    if (emptyState) return emptyState

    return (
      <div>
        <div className="gba:relative" data-testid="advance-payments-container">
          {isLoading && (
            <div className="gba:absolute gba:inset-0 gba:bg-background/50 gba:flex gba:items-center gba:justify-center gba:z-10">
              <Spinner />
            </div>
          )}
          <div className="gba:overflow-x-auto gba:max-w-full">
            <Table
              data-testid="advance-payments-data-table"
              className="gba:min-w-[1400px] gba:w-full gba:table-fixed gba:[&>thead>tr>th]:!text-left"
            >
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-muted">
                  <TableHead className="gba:w-[60px] gba:font-semibold gba:text-foreground gba:py-4 gba:px-3">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.employee_tabs.flows_button.actions',
                      'Actions'
                    )}
                  </TableHead>
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer"
                    onClick={() => toggleSort('reporter')}
                    data-testid="header-sort-reporter"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
                      {renderSortIcon('reporter')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[18%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer"
                    onClick={() => toggleSort('title')}
                    data-testid="header-sort-title"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:manager_expense_request_list.expense_table.title',
                        'Title'
                      )}
                      {renderSortIcon('title')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[15%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer"
                    onClick={() => toggleSort('orgUnit')}
                    data-testid="header-sort-orgunit"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_config_calculation_rule_list.expense_config_expense_assignement_modal.org_unit_label',
                        'Org Unit'
                      )}
                      {renderSortIcon('orgUnit')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer"
                    onClick={() => toggleSort('costCenter')}
                    data-testid="header-sort-costcenter"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_overview.side_bar.request_cost_center',
                        'Cost Center'
                      )}
                      {renderSortIcon('costCenter')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[10%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer"
                    onClick={() => toggleSort('planCode')}
                    data-testid="header-sort-planId"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_list_backoffice.plan_id', 'Plan Id')}
                      {renderSortIcon('planCode')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[14%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer"
                    onClick={() => toggleSort('status')}
                    data-testid="header-sort-status"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.expense_plan_table.status',
                        'Status'
                      )}
                      {renderSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer"
                    onClick={() => toggleSort('planTotalAmount')}
                    data-testid="header-sort-amount"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.expense_plan_table.amount',
                        'Amount'
                      )}
                      {renderSortIcon('planTotalAmount')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer"
                    onClick={() => toggleSort('advanceAmount')}
                    data-testid="header-sort-advance"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:manager_expense_request_list.expense_table.advance',
                        'Advance'
                      )}
                      {renderSortIcon('advanceAmount')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[12%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer"
                    onClick={() => toggleSort('paymentMethod')}
                    data-testid="header-sort-paymentmethod"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:create_expense_request.add_request_trip_details.payment_method',
                        'Payment Method'
                      )}
                      {renderSortIcon('paymentMethod')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{payments.map(renderPaymentRow)}</TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination - Backoffice shared component (matches Expense Requests) */}
        {totalCount > 0 && (
          <ExpenseRequestPagination
            currentPage={currentPage}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={(pagination: any) => handleEnhancedTableChange(pagination, {}, {})}
          />
        )}
      </div>
    )
  }, [
    payments,
    isLoading,
    error,
    totalCount,
    currentPage,
    pageSize,
    handleEnhancedTableChange,
    renderEmptyState,
    renderPaymentRow
  ])

  const renderAdvancePaymentDetails = useMemo(() => {
    if (!selectedItem) return null

    return <AdvancePaymentDetails payment={selectedItem} accessToken={props.accessToken} userInfo={props.userInfo} />
  }, [selectedItem, props.accessToken, props.userInfo, selectedActionType])

  // Filter groups for DataContainer
  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'status',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        type: 'checkbox',
        filters: availableStatuses.map(status => ({
          id: status,
          label: getAdvancePaymentStatusDisplay(status).label,
          selected: statusFilter.includes(status)
        }))
      },
      {
        id: 'reporter',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee'),
        type: 'custom',
        customComponent: (
          <div className="reporter-search-container gba:relative gba:p-2">
            <input
              type="text"
              value={reporterSearchText}
              onChange={e => {
                setReporterSearchText(e.target.value)
                setShowReporterDropdown(true)
              }}
              onFocus={() => setShowReporterDropdown(true)}
              className="gba:h-8 gba:w-full gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_list.search_employee_placeholder',
                'Search employee...'
              )}
              data-testid="reporter-search-input"
            />

            {/* Dropdown with search results */}
            {showReporterDropdown && reporterSearchText.trim() && (
              <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:bg-card gba:border gba:border-border gba:rounded gba:shadow-lg gba:max-h-40 gba:overflow-y-auto gba:z-10">
                {renderReporterDropdown()}
              </div>
            )}
          </div>
        )
      },
      {
        id: 'amount',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount'),
        type: 'custom',
        customComponent: (
          <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:w-8">Min</span>
              <input
                type="number"
                value={amountMinFilter}
                onChange={e => {
                  setAmountMinFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                placeholder="Min"
                data-testid="amount-min-filter-input"
              />
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:w-8">Max</span>
              <input
                type="number"
                value={amountMaxFilter}
                onChange={e => {
                  setAmountMaxFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                placeholder="Max"
                data-testid="amount-max-filter-input"
              />
            </div>
          </div>
        )
      },
      {
        id: 'advance',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expense_request_list.expense_table.advance',
          'Advance'
        ),
        type: 'custom',
        customComponent: (
          <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:w-8">Min</span>
              <input
                type="number"
                value={advanceMinFilter}
                onChange={e => {
                  setAdvanceMinFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                placeholder="Min"
                data-testid="advance-min-filter-input"
              />
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:w-8">Max</span>
              <input
                type="number"
                value={advanceMaxFilter}
                onChange={e => {
                  setAdvanceMaxFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                placeholder="Max"
                data-testid="advance-max-filter-input"
              />
            </div>
          </div>
        )
      },
      {
        id: 'currency',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.currency', 'Currency'),
        type: 'custom',
        customComponent: (
          <div className="gba:w-56">
            <Select
              onValueChange={val => {
                setCurrencyFilter(val || '')
                setCurrentPage(1)
              }}
              value={currencyFilter || undefined}
            >
              <SelectTrigger data-testid="advance-payments-currency-select" className="gba:border-border">
                <SelectValue
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.expense_request_filter.all_currencies',
                    'All Currencies'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {(currencies || []).map(c => (
                  <SelectItem
                    key={c.currencyRef}
                    value={c.currencyRef}
                    data-testid={`advance-payments-currency-option-${c.code}`}
                  >
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      }
    ]
  }, [
    availableStatuses,
    statusFilter,
    reporterSearchText,
    showReporterDropdown,
    reporterSearchLoading,
    reporterSearchResults,
    selectedReporters,
    amountMinFilter,
    amountMaxFilter,
    advanceMinFilter,
    advanceMaxFilter,
    currencies,
    currencyFilter
  ])

  // Helper to build selected filters array (avoids nested ternaries)
  const buildSelectedFilters = useCallback((): string[] => {
    const filters: string[] = []
    if (statusFilter.length > 0) filters.push('status')
    if (reporterFilter) filters.push('reporter')
    if (amountMinFilter || amountMaxFilter) filters.push('amount')
    if (advanceMinFilter || advanceMaxFilter) filters.push('advance')
    if (currencyFilter) filters.push('currency')
    return filters
  }, [
    statusFilter.length,
    reporterFilter,
    amountMinFilter,
    amountMaxFilter,
    advanceMinFilter,
    advanceMaxFilter,
    currencyFilter
  ])

  const selectedFilters: string[] = buildSelectedFilters()

  const getCurrencyLabel = (currencyRef: string): string => {
    const currency = currencies?.find(c => c.currencyRef === currencyRef)
    if (currency) return currency.code
    return currencyRef
  }

  // Helper to get status filter label (avoids nested ternary)
  const getStatusFilterLabel = useCallback((): string => {
    if (statusFilter.length > 0) {
      const statusLabels = statusFilter.map(status => getAdvancePaymentStatusDisplay(status).label).join(', ')
      return `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')}: ${statusLabels}`
    }
    return getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.status_all', 'Status: All')
  }, [statusFilter])

  // Helper to get currency filter label (avoids nested ternary)
  const getCurrencyFilterLabel = useCallback((): string => {
    const currencyLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.expense_request_filter.currency',
      'Currency'
    )
    if (currencyFilter) {
      return `${currencyLabel}: ${getCurrencyLabel(currencyFilter)}`
    }
    return `${currencyLabel}: ${getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_request_filter.all_currencies', 'All')}`
  }, [currencyFilter, currencies])

  const filterLabelMap: Record<string, string> = {
    status: getStatusFilterLabel(),
    reporter: `${getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}: ${selectedReporters.join(', ')}`,
    amount: `${getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.amount_label', 'Amount:')} ${amountMinFilter || '0'} - ${amountMaxFilter || '∞'}`,
    advance: `${getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.advance_label', 'Advance:')} ${advanceMinFilter || '0'} - ${advanceMaxFilter || '∞'}`,
    currency: getCurrencyFilterLabel()
  }

  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      // Check if this is a status filter (any of the available statuses)
      if (availableStatuses.includes(filterId)) {
        let newStatusFilter: string[]
        if (selected) {
          newStatusFilter = [...statusFilter, filterId]
        } else {
          newStatusFilter = statusFilter.filter(status => status !== filterId)
        }
        setStatusFilter(newStatusFilter)
        setCurrentPage(1)
      }
      // Currency filter is now handled by Select onValueChange, not here
    },
    [availableStatuses, statusFilter]
  )

  const setFilters = useCallback(() => {
    // Clear all filters
    setStatusFilter([])
    setReporterFilter('')
    setSelectedReporters([])
    setAmountMinFilter('')
    setAmountMaxFilter('')
    setAdvanceMinFilter('')
    setAdvanceMaxFilter('')
    setCurrencyFilter('')
    setCurrentPage(1)
  }, [])

  const listAmount = totalCount > 0 ? `${totalCount}` : undefined

  return (
    <div className="gba:-mx-6" data-testid="advance-payments-table-wrapper">
      <DataContainer
        contentBackground="white"
        dataControllerProps={{
          listTitle: getTranslationFromI18nKeyAndLabel(
            'lowcoder:backoffice_expense_landing_page.advance_title',
            'Advance Payments'
          ),
          listAmount,
          search: searchText,
          setSearch: handleSearchChange,
          placeholder: getTranslationFromI18nKeyAndLabel(
            'lowcoder:advance_payment_table.search_placeholder',
            'Search in Advance Payments'
          ),
          filter: selectedFilters,
          setFilter: setFilters,
          filterLabelMap: filterLabelMap,
          actions: []
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: handleFilterChange as (filterId: string, selected: boolean) => void
        }}
        dataBody={renderDataBody()}
        dataDetails={
          selectedItem
            ? {
                title: getDetailsTitle(selectedItem, selectedActionType),
                content: renderAdvancePaymentDetails,
                onClose: handleCloseDetails
              }
            : undefined
        }
        floatingDetails={true}
      />
    </div>
  )
}

export default AdvancePaymentsTable
