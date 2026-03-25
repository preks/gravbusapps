/**
 * Advance Payments Table Component
 * Delegates filter state and body rendering to focused modules.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import advancePaymentDetailsTranslations from '@/business-apps/fin/expenses/common/_i18n'
import { useFilterData } from '../../../hooks/useFilterData'
import { getActiveStructureDepartmentOptions } from '../../../utils/departmentOptions'
import type { AdvancePaymentItem } from '../../../types'
import type { FetchPaymentsOptions } from '../../../hooks/useAdvancePayment'
import { useAdvancePaymentsFilterState } from './hooks/useAdvancePaymentsFilterState.ts'
import { buildAdvancePaymentFetchOptions } from './hooks/advancePaymentQueryBuilder'
import { useAdvancePaymentsTableUrlSearch } from './hooks/useAdvancePaymentsTableUrlSearch'
import AdvancePaymentsDataBody from './components/AdvancePaymentsDataBody'
import AdvancePaymentsDetailsSheet from './components/AdvancePaymentsDetailsSheet'
import { AdvancePaymentsDataDisplay } from './components/AdvancePaymentsDataDisplay'
import { AdvancePaymentReporterFilter } from './components/AdvancePaymentReporterFilter'

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
  isActive?: boolean
  payments: AdvancePaymentItem[]
  totalCount: number
  isLoading: boolean
  error: unknown
  fetchPayments: (options?: FetchPaymentsOptions) => Promise<void>
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
    searchReporters,
    searchStatuses,
    ...context
  } = props
  const { t } = useTranslation(translations)
  // Pre-register common advance payment details bundle so the details sidebar shows translated labels on first render
  useTranslation(advancePaymentDetailsTranslations)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedItem, setSelectedItem] = useState<AdvancePaymentItem | null>(null)
  const tableTopRef = useRef<HTMLDivElement | null>(null)
  const { organizationalUnits = [], currencies = [] } = useFilterData({ accessToken: context.accessToken }) || {}
  const departmentOptions = useMemo(
    () => getActiveStructureDepartmentOptions(organizationalUnits),
    [organizationalUnits]
  )

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
    currencies,
    departmentOptions,
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

  const handleTablePaginationChange = useCallback((pagination: { current: number; pageSize: number }) => {
    setCurrentPage(pagination.current)
    setPageSize(pagination.pageSize)
  }, [])

  const hasSearchFilter = searchText.trim() !== ''
  const hasAnyFilter = hasSearchFilter || hasActiveFilters

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="advance-payments-tab-container">
      <div className="gba:relative gba:w-full gba:h-full gba:-mx-6" data-testid="advance-payments-table-wrapper">
        <AdvancePaymentsDataDisplay
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
          enableLiveFiltering={false}
          filterSheetTitle={t('tab-advance-payments')}
          filterSheetDescription={t('advance-payment-search')}
          renderReporterFilter={reporterFilterProps => (
            <AdvancePaymentReporterFilter
              {...reporterFilterProps}
              reporterSearchText={reporterSearchText}
              setReporterSearchText={setReporterSearchText}
              showReporterDropdown={showReporterDropdown}
              setShowReporterDropdown={setShowReporterDropdown}
              reporterSearchResults={reporterSearchResults}
              reporterSearchLoading={reporterSearchLoading}
              t={t}
            />
          )}
        >
          <AdvancePaymentsDataBody
            accessToken={props.accessToken}
            t={t}
            payments={payments}
            isLoading={isLoading}
            error={error}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handleTablePaginationChange}
            tableTopRef={tableTopRef}
            hasActiveFilters={hasAnyFilter}
            onSelectItem={setSelectedItem}
          />
        </AdvancePaymentsDataDisplay>
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
