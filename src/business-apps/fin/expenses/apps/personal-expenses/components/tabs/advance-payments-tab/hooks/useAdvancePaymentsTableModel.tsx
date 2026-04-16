import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { Button, useTranslation } from '@newwork/nw-design-system'
import advancePaymentDetailsTranslations from '@/business-apps/fin/expenses/common/_i18n'
import personalTranslations from '../../../../_i18n'
import { message } from 'antd'
import { startProcess } from '@/common/utils/start-process'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useGetAdvancePayments, type AdvancePayment } from '../../../../hooks/useGetAdvancePayments'
import { useAdvancePaymentCurrencies } from '../../../../hooks/useAdvancePaymentCurrencies'
import { resolveSelectedCurrencyCode, applyCurrencyChange } from '../../../../utils/tableUtils'
import { useVisibleColumns } from '@/business-apps/fin/expenses/common/hooks/useSharedTabState'
import { CurrencyDropdown } from '../../../shared/TableSharedComponents'
import { createPersonalAdvancePaymentFilterConfig } from '../config/advancePaymentFilterConfig'
import {
  advancePaymentAvailableColumns,
  advancePaymentDefaultVisibleColumnIds
} from '../config/advancePaymentAvailableColumns'
import { createAdvancePaymentColumns } from '../table/columns/advancePaymentColumns'
import { AdvancePaymentRowActions } from '../table/components/AdvancePaymentRowActions'
import type { AdvancePaymentsDataBodyProps } from '../table/components/AdvancePaymentsDataBody'
import type { AdvancePaymentsTableProps } from '../types/advancePaymentsTable.types'

const DEFAULT_PAGE_SIZE = 20

export interface UseAdvancePaymentsTableModelResult {
  dataBodyProps: AdvancePaymentsDataBodyProps
  accessToken: string | undefined
  userInfo: AdvancePaymentsTableProps['userInfo']
  selectedItem: AdvancePayment | null
  handleCloseDetails: () => void
  selectedExpensePlan: unknown
  selectedExpenseRequest: unknown
  generateDocOpen: boolean
  generateDocRecord: AdvancePayment | null
  setGenerateDocOpen: (open: boolean) => void
  setGenerateDocRecord: (record: AdvancePayment | null) => void
}

export function useAdvancePaymentsTableModel(props: AdvancePaymentsTableProps): UseAdvancePaymentsTableModelResult {
  useTranslation(advancePaymentDetailsTranslations)
  const { t: tPersonal } = useTranslation(personalTranslations)

  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  const { items, isLoading, error, totalCount, fetchItems } = useGetAdvancePayments(contextProps)
  const {
    currencyStats,
    selectedCurrencyRef,
    isReady: isCurrencyReady
  } = useAdvancePaymentCurrencies(contextProps, props.selectedFilters || [], props.onFilterChange)

  const [searchText, setSearchText] = useState<string>(props.search ?? '')
  const [selectedItem, setSelectedItem] = useState<AdvancePayment | null>(null)
  const [selectedExpensePlan, setSelectedExpensePlan] = useState<unknown>(null)
  const [selectedExpenseRequest, setSelectedExpenseRequest] = useState<unknown>(null)
  const [generateDocOpen, setGenerateDocOpen] = useState(false)
  const [generateDocRecord, setGenerateDocRecord] = useState<AdvancePayment | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const savedPageBeforeSearchRef = useRef<number | null>(null)
  const currentPageRef = useRef<number>(1)

  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend')

  const currentStatusFilter = useMemo(() => props.activeFilter || [], [props.activeFilter])
  const currentAmountRange = useMemo(() => props.amountRange || null, [props.amountRange])
  const currentAdvanceRange = useMemo(() => props.advanceRange || null, [props.advanceRange])
  const filterLabelMap = useMemo(() => props.filterLabelMap || {}, [props.filterLabelMap])

  const debouncedStatusFilter = useDebounce(currentStatusFilter, 200)
  const debouncedAmountRange = useDebounce(currentAmountRange, 200)
  const debouncedAdvanceRange = useDebounce(currentAdvanceRange, 200)
  const debouncedSearchText = useDebounce(searchText, 200)

  const advancePaymentsFilterConfig = useMemo(
    () => createPersonalAdvancePaymentFilterConfig({ filterLabelMap }),
    [filterLabelMap]
  )

  const filtersObject = useMemo((): Record<string, unknown> => {
    const statusIds = currentStatusFilter.filter(
      s => !s.startsWith('currency:') && s !== 'amountRange' && s !== 'advanceRange'
    )
    const obj: Record<string, unknown> = {}
    if (statusIds.length > 0) obj.statusIds = statusIds
    if (currentAmountRange && (currentAmountRange.min !== undefined || currentAmountRange.max !== undefined)) {
      obj.amount = { ...currentAmountRange }
    }
    if (currentAdvanceRange && (currentAdvanceRange.min !== undefined || currentAdvanceRange.max !== undefined)) {
      obj.advance = { ...currentAdvanceRange }
    }
    return obj
  }, [currentStatusFilter, currentAmountRange, currentAdvanceRange])

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      const amt = filters.amount as { min?: number; max?: number } | undefined
      const adv = filters.advance as { min?: number; max?: number } | undefined
      const hasAmount = amt && (amt.min !== undefined || amt.max !== undefined)
      const hasAdvance = adv && (adv.min !== undefined || adv.max !== undefined)
      const currencyTokens = (props.selectedFilters || []).filter(f => f.startsWith('currency:'))
      const rangeMarkers: string[] = []
      if (hasAmount) rangeMarkers.push('amountRange')
      if (hasAdvance) rangeMarkers.push('advanceRange')
      if (props.onFilterChange) {
        props.onFilterChange([...statusIds, ...currencyTokens, ...rangeMarkers])
      }
      props.setAmountRange?.(hasAmount ? (amt ?? null) : null)
      props.setAdvanceRange?.(hasAdvance ? (adv ?? null) : null)
      setCurrentPage(1)
    },
    [props.selectedFilters, props.onFilterChange, props.setAmountRange, props.setAdvanceRange]
  )

  const [rawVisibleColumns, setRawVisibleColumns] = useState<string[]>(() => [...advancePaymentDefaultVisibleColumnIds])
  const visibleColumnIds = useVisibleColumns(rawVisibleColumns, advancePaymentAvailableColumns)

  const selectedCurrencyCode = useMemo(
    () => resolveSelectedCurrencyCode(props.selectedFilters || [], currencyStats),
    [props.selectedFilters, currencyStats]
  )

  const handleCurrencyChange = useCallback(
    (code: string) => {
      if (props.onFilterChange) {
        applyCurrencyChange(code, props.selectedFilters || [], currencyStats, props.onFilterChange)
      }
      setCurrentPage(1)
    },
    [props.selectedFilters, currencyStats, props.onFilterChange]
  )

  const prevFilterSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    const signature = JSON.stringify({
      status: currentStatusFilter,
      amountRange: currentAmountRange,
      advanceRange: currentAdvanceRange,
      selectedFilters: props.selectedFilters || []
    })

    const previous = prevFilterSignatureRef.current
    if (previous !== null && previous !== signature) {
      setCurrentPage(1)
    }

    prevFilterSignatureRef.current = signature
  }, [currentStatusFilter, currentAmountRange, currentAdvanceRange, props.selectedFilters])

  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  const prevDebouncedSearchRef = useRef<string>('')

  useEffect(() => {
    const trimmedDebounced = (debouncedSearchText || '').trim()
    const trimmedPrev = (prevDebouncedSearchRef.current || '').trim()

    if (trimmedPrev === trimmedDebounced) {
      prevDebouncedSearchRef.current = debouncedSearchText
      return
    }

    if (trimmedPrev === '' && trimmedDebounced !== '') {
      savedPageBeforeSearchRef.current ??= currentPageRef.current
      setCurrentPage(1)
    } else if (trimmedPrev !== '' && trimmedDebounced === '') {
      setCurrentPage(1)
      savedPageBeforeSearchRef.current = null
    } else if (trimmedDebounced !== '' && trimmedPrev !== trimmedDebounced) {
      setCurrentPage(1)
    }

    prevDebouncedSearchRef.current = debouncedSearchText
  }, [debouncedSearchText])

  const fetchParams = useMemo(
    () => ({
      searchText: debouncedSearchText,
      currentPage,
      pageSize,
      currentStatusFilter: debouncedStatusFilter,
      currentAmountRange: debouncedAmountRange,
      currentAdvanceRange: debouncedAdvanceRange,
      sortField,
      sortOrder,
      selectedCurrencyRef
    }),
    [
      debouncedSearchText,
      currentPage,
      pageSize,
      debouncedStatusFilter,
      debouncedAmountRange,
      debouncedAdvanceRange,
      sortField,
      sortOrder,
      selectedCurrencyRef
    ]
  )

  useEffect(() => {
    if (props.search !== undefined && props.search !== searchText) {
      setSearchText(props.search)
    }
  }, [props.search, searchText])

  useEffect(() => {
    const hasAccessToken = !!contextProps.accessToken
    const hasEmployeeId = !!contextProps.userInfo?.employeeDetails?.employeeId
    if (hasAccessToken && hasEmployeeId && isCurrencyReady) {
      fetchItems({
        searchTerm: fetchParams.searchText,
        page: fetchParams.currentPage,
        pageSize: fetchParams.pageSize,
        statusFilter: fetchParams.currentStatusFilter,
        amountRange: fetchParams.currentAmountRange,
        advanceRange: fetchParams.currentAdvanceRange,
        sortField: fetchParams.sortField,
        sortOrder: fetchParams.sortOrder,
        currencyRef: fetchParams.selectedCurrencyRef
      })
    } else if (!hasAccessToken || !hasEmployeeId) {
      console.warn('Cannot fetch advance payments: Missing accessToken or employeeId')
    }
  }, [
    contextProps.accessToken,
    contextProps.userInfo?.employeeDetails?.employeeId,
    fetchItems,
    fetchParams,
    isCurrencyReady
  ])

  useEffect(() => {
    if (props.tableRefreshTrigger && props.tableRefreshTrigger > 0) {
      if (contextProps.accessToken && contextProps.userInfo?.employeeDetails?.employeeId) {
        fetchItems({
          searchTerm: fetchParams.searchText,
          page: fetchParams.currentPage,
          pageSize: fetchParams.pageSize,
          statusFilter: fetchParams.currentStatusFilter,
          amountRange: fetchParams.currentAmountRange,
          advanceRange: fetchParams.currentAdvanceRange,
          sortField: fetchParams.sortField,
          sortOrder: fetchParams.sortOrder,
          currencyRef: fetchParams.selectedCurrencyRef,
          force: true
        })
      }
    }
  }, [
    props.tableRefreshTrigger,
    contextProps.accessToken,
    contextProps.userInfo?.employeeDetails?.employeeId,
    fetchItems,
    fetchParams
  ])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value)
      if (props.onSearchChange) {
        props.onSearchChange(value)
      }
    },
    [props.onSearchChange]
  )

  const handleAddAdvancePayment = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
      message.warning('User information not loaded yet. Please wait a moment and try again.')
      return
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeAdvancePayment',
      payload: {
        employeeId
      },
      builderType: 'NATIVE_SCREEN'
    })
  }, [contextProps.userInfo?.employeeDetails?.employeeId])

  const handleSelectItem = useCallback((item: AdvancePayment) => {
    setSelectedItem(item)
  }, [])

  const sorting = useMemo(
    () => (sortOrder ? [{ id: sortField || 'createdAt', desc: sortOrder === 'descend' }] : []),
    [sortField, sortOrder]
  )

  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      const entry = newSorting[0]
      const field = entry?.id || 'createdAt'
      let order: 'ascend' | 'descend' = 'descend'
      if (entry) {
        order = entry.desc ? 'descend' : 'ascend'
      }
      if (field === sortField && order === sortOrder) return
      setSortField(field)
      setSortOrder(order)
      setCurrentPage(1)
    },
    [sortField, sortOrder]
  )

  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])

  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setCurrentPage(newPagination.pageIndex + 1)
    setPageSize(newPagination.pageSize)
  }, [])

  const emptyMessage = tPersonal('table-empty-filtered')

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
    setSelectedExpensePlan(null)
    setSelectedExpenseRequest(null)
  }, [])

  const handleViewExpensePlanDetails = useCallback((record: AdvancePayment) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: record.expensePlan && record.expensePlan.id ? record.expensePlan.id : '',
      referrer: '/platform/fin/expenses/personal-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }, [])

  const handleViewExpenseRequestDetails = useCallback((record: AdvancePayment) => {
    const firstRequestId = record.expensePlan?.expenseRequest?.[0]?.id ?? ''
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: firstRequestId,
      referrer: '/platform/fin/expenses/personal-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }, [])

  const columns = useMemo(() => createAdvancePaymentColumns(), [])

  const openGenerateDocument = useCallback((record: AdvancePayment) => {
    setGenerateDocRecord(record)
    setGenerateDocOpen(true)
  }, [])

  const rowActions = useCallback(
    (row: { original: AdvancePayment }) => (
      <AdvancePaymentRowActions
        record={row.original}
        accessToken={contextProps.accessToken}
        onViewDetails={handleSelectItem}
        onViewExpensePlanDetails={handleViewExpensePlanDetails}
        onViewExpenseRequestDetails={handleViewExpenseRequestDetails}
        onGenerateDocument={openGenerateDocument}
      />
    ),
    [
      contextProps.accessToken,
      handleSelectItem,
      handleViewExpensePlanDetails,
      handleViewExpenseRequestDetails,
      openGenerateDocument
    ]
  )

  const primaryAction = useMemo(
    () => (
      <Button
        onClick={handleAddAdvancePayment}
        size="sm"
        variant="default"
        data-testid="add-advance-payment-button"
        type="button"
      >
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule_details.calculation_allowance_code_list.calculation_allowance_code_modal.btn_add',
          'Add'
        )}
      </Button>
    ),
    [handleAddAdvancePayment]
  )

  const secondaryActions = useMemo(
    () =>
      currencyStats.length > 0 ? (
        <CurrencyDropdown
          currencyStats={currencyStats}
          selectedCurrencyCode={selectedCurrencyCode}
          onCurrencyChange={handleCurrencyChange}
          testIdPrefix="advance-payments"
        />
      ) : undefined,
    [currencyStats, selectedCurrencyCode, handleCurrencyChange]
  )

  const dataBodyProps = useMemo((): AdvancePaymentsDataBodyProps => {
    return {
      totalCount,
      isLoading,
      searchText,
      onSearchChange: handleSearchChange,
      filtersObject,
      advancePaymentsFilterConfig,
      onFilterChangeFromDisplay: handleFilterChangeFromDisplay,
      sorting,
      onSortingChange: handleSortingChange,
      primaryAction,
      secondaryActions,
      visibleColumns: visibleColumnIds,
      onVisibleColumnsChange: setRawVisibleColumns,
      filterSheetTitle: tPersonal('filter-advance-payments-title'),
      filterSheetDescription: tPersonal('filter-advance-payments-description'),
      items: items || [],
      columns,
      error: error || undefined,
      pagination,
      onPaginationChange: handlePaginationChange,
      emptyMessage,
      rowActions,
      onRowClick: handleSelectItem
    }
  }, [
    totalCount,
    isLoading,
    searchText,
    handleSearchChange,
    filtersObject,
    advancePaymentsFilterConfig,
    handleFilterChangeFromDisplay,
    sorting,
    handleSortingChange,
    primaryAction,
    secondaryActions,
    visibleColumnIds,
    tPersonal,
    items,
    columns,
    error,
    pagination,
    handlePaginationChange,
    emptyMessage,
    rowActions,
    handleSelectItem
  ])

  return {
    dataBodyProps,
    accessToken: contextProps.accessToken,
    userInfo: props.userInfo,
    selectedItem,
    handleCloseDetails,
    selectedExpensePlan,
    selectedExpenseRequest,
    generateDocOpen,
    generateDocRecord,
    setGenerateDocOpen,
    setGenerateDocRecord
  }
}
