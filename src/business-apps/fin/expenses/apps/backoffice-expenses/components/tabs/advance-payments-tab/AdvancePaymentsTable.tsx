/**
 * Advance Payments Table Component
 * Delegates filter state and body rendering to focused modules.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { type BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import advancePaymentDetailsTranslations from '@/business-apps/fin/expenses/common/_i18n'
import { useTableSetup } from '../../../../../common/hooks/useTableSetup'
import { useVisibleColumns } from '../../../common/hooks/useSharedTabState'
import { useFilterData } from '../../../hooks/useFilterData'
import { getActiveStructureDepartmentOptions } from '../../../utils/departmentOptions'
import type { AdvancePaymentItem } from '../../../types'
import type { OrderByClause, FetchPaymentsOptions } from '../../../hooks/useAdvancePayment'
import { useAdvancePaymentCurrency } from './hooks/useAdvancePaymentCurrency'
import { useAdvancePaymentsFilterState } from './hooks/useAdvancePaymentsFilterState'
import { buildAdvancePaymentFetchOptions } from './hooks/advancePaymentQueryBuilder'
import {
  createBackofficeAdvancePaymentAllDataColumns,
  createBackofficeAdvancePaymentSortableColumns
} from './config/backofficeAdvancePaymentSortableColumns'
import {
  buildAdvancePaymentOrderBy,
  DEFAULT_ADVANCE_PAYMENT_SORTING_STATE,
  DEFAULT_ADVANCE_PAYMENT_VISIBLE_COLUMNS,
  type AdvancePaymentVisibleColumnId
} from './hooks/advancePaymentTableSort'
import { useAdvancePaymentsTableUrlSearch } from './hooks/useAdvancePaymentsTableUrlSearch'
import { useBackofficeAdvancePaymentsTableDisplayModel } from './hooks/useBackofficeAdvancePaymentsTableDisplayModel'
import { BackofficeAdvancePaymentsTableDisplay } from './table/BackofficeAdvancePaymentsTableDisplay'
import AdvancePaymentsDetailsSheet from './components/AdvancePaymentsDetailsSheet'
import { AdvancePaymentsRowActions } from './components/AdvancePaymentsRowActions'
import { createBackofficeAdvancePaymentDataColumns } from './table/backofficeAdvancePaymentColumns'

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
  isActive?: boolean
  payments: AdvancePaymentItem[]
  totalCount: number
  isLoading: boolean
  error: unknown
  fetchPayments: (options?: FetchPaymentsOptions) => Promise<void>
  setOrderBy: (orderBy: OrderByClause) => void
  searchReporters: (searchTerm: string, options?: FetchPaymentsOptions) => Promise<string[]>
  searchStatuses: () => Promise<string[]>
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = props => {
  const {
    search,
    onSearchChange,
    payments,
    totalCount,
    isLoading,
    error,
    fetchPayments,
    setOrderBy,
    searchReporters,
    searchStatuses,
    ...context
  } = props
  const { t } = useTranslation(translations)
  // Pre-register common advance payment details bundle so the details sidebar shows translated labels on first render
  useTranslation(advancePaymentDetailsTranslations)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortingState, setSortingState] = useState<SortingState>(DEFAULT_ADVANCE_PAYMENT_SORTING_STATE)
  const [visibleColumns, setVisibleColumns] = useState<AdvancePaymentVisibleColumnId[]>(
    DEFAULT_ADVANCE_PAYMENT_VISIBLE_COLUMNS
  )
  const [selectedItem, setSelectedItem] = useState<AdvancePaymentItem | null>(null)
  const {
    organizationalUnits = [],
    currencies = [],
    mostUsedCurrency: mostUsedCurrencyRef
  } = useFilterData({ accessToken: context.accessToken }) || {}

  const departmentOptions = useMemo(
    () => getActiveStructureDepartmentOptions(organizationalUnits),
    [organizationalUnits]
  )

  const { selectedCurrencyCode, selectedCurrencyRef, currencySecondaryAction } = useAdvancePaymentCurrency({
    currencies,
    mostUsedCurrencyRef,
    setCurrentPage
  })

  const { searchText, debouncedSearchText, handleSearchChange } = useAdvancePaymentsTableUrlSearch({
    searchFromParent: search,
    onSearchChange
  })
  const { queryFilterState, filterConfiguration, filtersObject, handleFilterChangeFromDisplay, hasActiveFilters } =
    useAdvancePaymentsFilterState({
      t,
      searchStatuses,
      searchReporters,
      departmentOptions,
      currencyRef: selectedCurrencyRef,
      searchTerm: debouncedSearchText,
      setCurrentPage
    })

  useEffect(() => {
    const fetchOptions = buildAdvancePaymentFetchOptions({
      searchTerm: debouncedSearchText,
      page: currentPage,
      pageSize,
      filters: queryFilterState
    })

    fetchPayments(fetchOptions)
  }, [debouncedSearchText, currentPage, pageSize, queryFilterState, fetchPayments])

  const handleSearchChangeWithReset = useCallback(
    (value: string = '') => {
      setCurrentPage(1)
      handleSearchChange(value)
    },
    [handleSearchChange]
  )

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
  }, [])

  const allColumns = useMemo(() => createBackofficeAdvancePaymentDataColumns(t), [t])

  const sortableColumns = useMemo(() => createBackofficeAdvancePaymentSortableColumns(t), [t])
  const availableColumns = useMemo(() => createBackofficeAdvancePaymentAllDataColumns(t), [t])

  const columnsFilteredByVisibility = useVisibleColumns(visibleColumns, availableColumns)

  const { columns, pagination, handlePaginationChange } = useTableSetup(
    props,
    allColumns,
    columnsFilteredByVisibility,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize
  )

  const handleRowClick = useCallback((record: AdvancePaymentItem) => {
    setSelectedItem(record)
  }, [])

  const renderRowActions = useCallback(
    (row: { original: AdvancePaymentItem }) => (
      <AdvancePaymentsRowActions
        accessToken={props.accessToken}
        record={row.original}
        onSelectItem={setSelectedItem}
        t={t}
      />
    ),
    [props.accessToken, t]
  )

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      const sanitizedSorting = newSorting.slice(0, 1)
      const nextSortingState = sanitizedSorting.length > 0 ? sanitizedSorting : DEFAULT_ADVANCE_PAYMENT_SORTING_STATE
      const currentSorting = sortingState[0]
      const nextSorting = nextSortingState[0]

      if (currentSorting?.id === nextSorting?.id && currentSorting?.desc === nextSorting?.desc) {
        return
      }

      setSortingState(nextSortingState)
      setCurrentPage(1)
      setOrderBy(buildAdvancePaymentOrderBy(nextSortingState))
    },
    [setOrderBy, sortingState]
  )

  const hasSearchFilter = searchText.trim() !== ''
  const hasCurrencyFilter = selectedCurrencyCode !== null
  const hasAnyFilter = hasSearchFilter || hasActiveFilters || hasCurrencyFilter

  const listEmptyMessage = useMemo(
    () => (hasAnyFilter ? t('empty-no-data') : t('advance-payment-no-payments-yet')),
    [hasAnyFilter, t]
  )

  const handleVisibleColumnsChange = useCallback((nextVisibleColumns: string[]) => {
    setVisibleColumns(nextVisibleColumns as AdvancePaymentVisibleColumnId[])
  }, [])

  const displayProps = useBackofficeAdvancePaymentsTableDisplayModel({
    totalCount,
    isLoading,
    searchText,
    searchPlaceholder: t('advance-payment-search'),
    onSearchChange: handleSearchChangeWithReset,
    filtersObject,
    filterConfiguration,
    onFilterChange: handleFilterChangeFromDisplay,
    listSectionLabel: t('tab-advance-payments'),
    sortingState,
    onSortingChange: handleSortingChange,
    sortableColumns,
    availableColumns,
    visibleColumns: columnsFilteredByVisibility,
    onVisibleColumnsChange: handleVisibleColumnsChange,
    secondaryActions: currencySecondaryAction,
    filterSheetTitle: t('advance-payment-filter-sheet-title'),
    filterSheetDescription: t('advance-payment-filter-sheet-description'),
    payments,
    error,
    columns,
    pagination,
    onPaginationChange: handlePaginationChange,
    emptyMessage: listEmptyMessage,
    onRowClick: handleRowClick,
    renderRowActions
  })

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="advance-payments-tab-container">
      <div className="gba:relative gba:w-full gba:h-full gba:min-w-0" data-testid="advance-payments-table-wrapper">
        <BackofficeAdvancePaymentsTableDisplay {...displayProps} />
        <AdvancePaymentsDetailsSheet
          selectedItem={selectedItem}
          accessToken={props.accessToken}
          userInfo={props.userInfo}
          t={t}
          onClose={handleCloseDetails}
        />
      </div>
    </div>
  )
}

export default AdvancePaymentsTable
