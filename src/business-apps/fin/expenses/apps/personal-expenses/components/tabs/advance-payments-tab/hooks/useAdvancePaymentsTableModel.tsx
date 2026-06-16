import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { Button, useTranslation } from '@newwork/nw-design-system'
import personalTranslations from '../../../../_i18n'
import { message } from 'antd'
import { startProcess } from '@/common/utils/start-process'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useGetAdvancePayments, type AdvancePayment } from '../../../../hooks/useGetAdvancePayments'
import { useAdvancePaymentCurrencies } from '../../../../hooks/useAdvancePaymentCurrencies'
import { resolveSelectedCurrencyCode, applyCurrencyChange } from '../../../../utils/tableUtils'
import { useVisibleColumns } from '@/business-apps/fin/expenses/common/hooks/useSharedTabState'
import { CurrencyDropdown } from '../../../shared/TableSharedComponents'
import { createPersonalAdvancePaymentFilterConfig } from '../config/advancePaymentFilterConfig'
import {
  createAdvancePaymentAvailableColumns,
  advancePaymentDefaultVisibleColumnIds
} from '../config/advancePaymentAvailableColumns'
import { createAdvancePaymentSortableColumns } from '../config/advancePaymentSortableColumns'
import { createAdvancePaymentColumns } from '../table/columns/advancePaymentColumns'
import { AdvancePaymentRowActions } from '../table/components/AdvancePaymentRowActions'
import type { AdvancePaymentsDataBodyProps } from '../table/components/AdvancePaymentsDataBody'
import type { AdvancePaymentsTableProps } from '../types/advancePaymentsTable.types'
import { useAdvancePaymentsProcessCompletionRefresh } from './useAdvancePaymentsProcessCompletionRefresh'

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
  const currentCardCreatedAtRange = useMemo(() => props.cardCreatedAtRange ?? null, [props.cardCreatedAtRange])
  const filterLabelMap = useMemo(() => props.filterLabelMap || {}, [props.filterLabelMap])

  const debouncedStatusFilter = useDebounce(currentStatusFilter, 200)
  const debouncedAmountRange = useDebounce(currentAmountRange, 200)
  const debouncedAdvanceRange = useDebounce(currentAdvanceRange, 200)
  const debouncedCardCreatedAtRange = useDebounce(currentCardCreatedAtRange, 200)
  const debouncedSearchText = useDebounce(searchText, 200)

  const advancePaymentsFilterConfig = useMemo(
    () => createPersonalAdvancePaymentFilterConfig({ filterLabelMap, t: tPersonal }),
    [filterLabelMap, tPersonal]
  )

  const availableColumns = useMemo(() => createAdvancePaymentAvailableColumns(tPersonal), [tPersonal])
  const sortableColumns = useMemo(() => createAdvancePaymentSortableColumns(tPersonal), [tPersonal])

  const filtersObject = useMemo((): Record<string, unknown> => {
    const statusIds = currentStatusFilter.filter(
      s => !s.startsWith('currency:') && s !== 'amountRange' && s !== 'advanceRange' && s !== 'cardCreatedAtRange'
    )
    const obj: Record<string, unknown> = {}
    if (statusIds.length > 0) obj.statusIds = statusIds
    if (currentAmountRange && (currentAmountRange.min !== undefined || currentAmountRange.max !== undefined)) {
      obj.amount = { ...currentAmountRange }
    }
    if (currentAdvanceRange && (currentAdvanceRange.min !== undefined || currentAdvanceRange.max !== undefined)) {
      obj.advance = { ...currentAdvanceRange }
    }
    const cardPillLabel = filterLabelMap['cardCreatedAtRange']
    if (
      currentCardCreatedAtRange?.gte &&
      currentCardCreatedAtRange?.lte &&
      typeof cardPillLabel === 'string' &&
      cardPillLabel.trim() !== ''
    ) {
      obj.cardCreatedAtRange = cardPillLabel
    }
    return obj
  }, [currentStatusFilter, currentAmountRange, currentAdvanceRange, currentCardCreatedAtRange, filterLabelMap])

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      const amt = filters.amount as { min?: number; max?: number } | undefined
      const adv = filters.advance as { min?: number; max?: number } | undefined
      const hasAmount = amt && (amt.min !== undefined || amt.max !== undefined)
      const hasAdvance = adv && (adv.min !== undefined || adv.max !== undefined)
      const cardLabel = filters.cardCreatedAtRange
      const hasCardPill = typeof cardLabel === 'string' && cardLabel.trim() !== '' && props.cardCreatedAtRange?.gte

      if (!hasCardPill) {
        props.setCardCreatedAtRange?.(null)
      }

      const currencyTokens = (props.selectedFilters || []).filter(f => f.startsWith('currency:'))
      const rangeMarkers: string[] = []
      if (hasAmount) rangeMarkers.push('amountRange')
      if (hasAdvance) rangeMarkers.push('advanceRange')
      if (hasCardPill) rangeMarkers.push('cardCreatedAtRange')
      if (props.onFilterChange) {
        props.onFilterChange([...statusIds, ...currencyTokens, ...rangeMarkers])
      }
      props.setAmountRange?.(hasAmount ? (amt ?? null) : null)
      props.setAdvanceRange?.(hasAdvance ? (adv ?? null) : null)
      setCurrentPage(1)
    },
    [
      props.selectedFilters,
      props.onFilterChange,
      props.setAmountRange,
      props.setAdvanceRange,
      props.setCardCreatedAtRange,
      props.cardCreatedAtRange
    ]
  )

  const [rawVisibleColumns, setRawVisibleColumns] = useState<string[]>(() => [...advancePaymentDefaultVisibleColumnIds])
  const visibleColumnIds = useVisibleColumns(rawVisibleColumns, availableColumns)

  const selectedCurrencyCode = useMemo(
    () => resolveSelectedCurrencyCode(props.selectedFilters || [], currencyStats),
    [props.selectedFilters, currencyStats]
  )

  const handleCurrencyChange = useCallback(
    (code: string) => {
      props.setCardCreatedAtRange?.(null)
      if (props.onFilterChange) {
        applyCurrencyChange(code, props.selectedFilters || [], currencyStats, props.onFilterChange)
      }
      setCurrentPage(1)
    },
    [props.selectedFilters, currencyStats, props.onFilterChange, props.setCardCreatedAtRange]
  )

  const prevFilterSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    const signature = JSON.stringify({
      status: currentStatusFilter,
      amountRange: currentAmountRange,
      advanceRange: currentAdvanceRange,
      cardCreatedAtRange: currentCardCreatedAtRange,
      selectedFilters: props.selectedFilters || []
    })

    const previous = prevFilterSignatureRef.current
    if (previous !== null && previous !== signature) {
      setCurrentPage(1)
    }

    prevFilterSignatureRef.current = signature
  }, [currentStatusFilter, currentAmountRange, currentAdvanceRange, currentCardCreatedAtRange, props.selectedFilters])

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
      cardCreatedAtRange: debouncedCardCreatedAtRange,
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
      debouncedCardCreatedAtRange,
      sortField,
      sortOrder,
      selectedCurrencyRef
    ]
  )

  const employeeId = contextProps.userInfo?.employeeDetails?.employeeId

  useAdvancePaymentsProcessCompletionRefresh({
    fetchItems,
    fetchParams,
    accessToken: contextProps.accessToken,
    employeeId,
    isCurrencyReady,
    onProcessComplete: props.onProcessComplete
  })

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
        createdAtRange: fetchParams.cardCreatedAtRange,
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
      message.warning(tPersonal('personal-expenses-user-information-not-loaded'))
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
  }, [contextProps.userInfo?.employeeDetails?.employeeId, tPersonal])

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

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        (debouncedSearchText || '').trim() ||
          currentAmountRange?.min != null ||
          currentAmountRange?.max != null ||
          currentAdvanceRange?.min != null ||
          currentAdvanceRange?.max != null ||
          (currentCardCreatedAtRange?.gte && currentCardCreatedAtRange?.lte)
      ),
    [debouncedSearchText, currentAmountRange, currentAdvanceRange, currentCardCreatedAtRange]
  )

  const emptyMessage = hasActiveFilters
    ? tPersonal('table-empty-filtered')
    : tPersonal('personal-expenses-no-advance-payments-found')

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
    setSelectedExpensePlan(null)
    setSelectedExpenseRequest(null)
  }, [])

  const handleViewExpensePlanDetails = useCallback((record: AdvancePayment) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: record.expensePlan?.id ?? '',
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

  const columns = useMemo(() => createAdvancePaymentColumns(tPersonal), [tPersonal])

  const openGenerateDocument = useCallback((record: AdvancePayment) => {
    setGenerateDocRecord(record)
    setGenerateDocOpen(true)
  }, [])

  const rowActions = useCallback(
    (row: { original: AdvancePayment }) => (
      <AdvancePaymentRowActions
        record={row.original}
        accessToken={contextProps.accessToken}
        t={tPersonal}
        onViewDetails={handleSelectItem}
        onViewExpensePlanDetails={handleViewExpensePlanDetails}
        onViewExpenseRequestDetails={handleViewExpenseRequestDetails}
        onGenerateDocument={openGenerateDocument}
      />
    ),
    [
      contextProps.accessToken,
      tPersonal,
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
        {tPersonal('personal-expenses-add-button')}
      </Button>
    ),
    [handleAddAdvancePayment, tPersonal]
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
      sortableColumns,
      availableColumns,
      listSectionLabel: tPersonal('personal-expenses-advance-list-title'),
      searchPlaceholder: tPersonal('personal-expenses-search-advance-payments'),
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
    sortableColumns,
    availableColumns,
    tPersonal,
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
