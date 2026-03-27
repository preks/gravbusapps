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
import { useTableSetup } from '../../../common/hooks/useTableSetup'
import { useVisibleColumns } from '../../../common/hooks/useSharedTabState'
import { useFilterData } from '../../../hooks/useFilterData'
import { getActiveStructureDepartmentOptions } from '../../../utils/departmentOptions'
import type { AdvancePaymentItem } from '../../../types'
import type { OrderByClause, FetchPaymentsOptions } from '../../../hooks/useAdvancePayment'
import { useAdvancePaymentCurrency } from './hooks/useAdvancePaymentCurrency'
import { useAdvancePaymentsFilterState } from './hooks/useAdvancePaymentsFilterState.ts'
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
import AdvancePaymentsDataBody from './components/AdvancePaymentsDataBody'
import AdvancePaymentsDetailsSheet from './components/AdvancePaymentsDetailsSheet'
import { BackofficeDataDisplay } from '../../../common/components/BackofficeDataDisplay'
import { BackofficeFilterSheet } from '../../../common/components/BackofficeFilterSheet'
import { ADVANCE_PAYMENT_REPORTER_FILTER_GROUP_ID } from './constants/advancePaymentReporterFilter'
import { AdvancePaymentReporterFilter } from './components/AdvancePaymentReporterFilter'
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
  searchReporters: (searchTerm: string) => Promise<string[]>
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
  const {
    queryFilterState,
    filterConfiguration,
    filtersObject,
    handleFilterChangeFromDisplay,
    hasActiveFilters,
    reporterSearchText,
    setReporterSearchText,
    showReporterDropdown,
    setShowReporterDropdown,
    reporterSearchResults,
    reporterSearchLoading
  } = useAdvancePaymentsFilterState({
    t,
    searchStatuses,
    searchReporters,
    departmentOptions,
    currencyRef: selectedCurrencyRef,
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

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="advance-payments-tab-container">
      <div className="gba:relative gba:w-full gba:h-full gba:-mx-6" data-testid="advance-payments-table-wrapper">
        <BackofficeDataDisplay
          titleSections={[
            {
              id: 'list',
              label: t('tab-advance-payments'),
              metadata: { count: totalCount, isLoading }
            }
          ]}
          currentSection="list"
          searchValue={searchText}
          searchPlaceholder={t('advance-payment-search')}
          onSearchChange={handleSearchChangeWithReset}
          filters={filtersObject}
          filterConfiguration={filterConfiguration}
          onFilterChange={handleFilterChangeFromDisplay}
          sorting={sortingState}
          sortableColumns={sortableColumns}
          onSortingChange={handleSortingChange}
          availableColumns={availableColumns}
          visibleColumns={columnsFilteredByVisibility}
          onVisibleColumnsChange={handleVisibleColumnsChange}
          secondaryActions={currencySecondaryAction}
          renderFilterSheet={(open, onOpenChange) => (
            <BackofficeFilterSheet
              open={open}
              onOpenChange={onOpenChange}
              configuration={filterConfiguration}
              values={filtersObject}
              onApply={handleFilterChangeFromDisplay}
              onChange={handleFilterChangeFromDisplay}
              title={t('advance-payment-filter-sheet-title')}
              description={t('advance-payment-filter-sheet-description')}
              customGroup={{
                groupId: ADVANCE_PAYMENT_REPORTER_FILTER_GROUP_ID,
                valueKey: 'reporterIds',
                render: renderProps => (
                  <AdvancePaymentReporterFilter
                    {...renderProps}
                    reporterSearchText={reporterSearchText}
                    setReporterSearchText={setReporterSearchText}
                    showReporterDropdown={showReporterDropdown}
                    setShowReporterDropdown={setShowReporterDropdown}
                    reporterSearchResults={reporterSearchResults}
                    reporterSearchLoading={reporterSearchLoading}
                    t={t}
                  />
                )
              }}
            />
          )}
        >
          <AdvancePaymentsDataBody
            payments={payments}
            isLoading={isLoading}
            error={error}
            totalCount={totalCount}
            columns={columns}
            sorting={sortingState}
            onSortingChange={handleSortingChange}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            emptyMessage={listEmptyMessage}
            onRowClick={handleRowClick}
            actions={renderRowActions}
          />
        </BackofficeDataDisplay>
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
