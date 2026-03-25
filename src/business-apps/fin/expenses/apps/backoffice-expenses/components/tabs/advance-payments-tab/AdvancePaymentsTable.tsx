/**
 * Advance Payments Table Component
 * Delegates filter state and body rendering to focused modules.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useTranslation } from '@newwork/nw-design-system'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import translations from '../../../_i18n'
import advancePaymentDetailsTranslations from '@/business-apps/fin/expenses/common/_i18n'
import { useFilterData } from '../../../hooks/useFilterData'
import { getActiveStructureDepartmentOptions } from '../../../utils/departmentOptions'
import type { AdvancePaymentItem } from '../../../types'
import type { FetchPaymentsOptions } from '../../../hooks/useAdvancePayment'
import { useAdvancePaymentsFilterState } from './hooks/useAdvancePaymentsFilterState'
import { buildAdvancePaymentFetchOptions } from './hooks/advancePaymentQueryBuilder'
import AdvancePaymentsDataBody from './components/AdvancePaymentsDataBody'
import AdvancePaymentsDetailsSheet from './components/AdvancePaymentsDetailsSheet'

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

  const [searchText, setSearchText] = useState(search ?? '')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedItem, setSelectedItem] = useState<AdvancePaymentItem | null>(null)
  const tableTopRef = useRef<HTMLDivElement | null>(null)
  const { organizationalUnits = [], currencies = [] } = useFilterData({ accessToken: context.accessToken }) || {}
  const departmentOptions = useMemo(
    () => getActiveStructureDepartmentOptions(organizationalUnits),
    [organizationalUnits]
  )

  const debouncedSearchText = useDebounce(searchText, 300)
  const {
    queryFilterState,
    filterGroups,
    selectedFilters,
    filterLabelMap,
    handleFilterChange,
    handleSetFilter,
    hasActiveFilters
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

  useEffect(() => {
    const normalizedSearch = search ?? ''
    if (normalizedSearch !== searchText) {
      setSearchText(normalizedSearch)
      setCurrentPage(1)
    }
  }, [search, searchText])

  const handleSearchChange = useCallback(
    (value: string = '') => {
      setSearchText(value)
      setCurrentPage(1)
      onSearchChange?.(value)
    },
    [onSearchChange]
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
    <div className="gba:relative gba:w-full gba:h-full gba:-mx-6" data-testid="advance-payments-table-wrapper">
      <DataContainer
        contentBackground="white"
        dataControllerProps={{
          listTitle: t('tab-advance-payments'),
          listAmount: totalCount ? `${totalCount}` : undefined,
          search: searchText,
          setSearch: handleSearchChange,
          placeholder: t('advance-payment-search'),
          filter: totalCount === 0 && !isLoading ? [] : selectedFilters,
          setFilter: handleSetFilter as (filter: string[]) => void,
          filterLabelMap,
          actions: []
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
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
        }
      />
      <AdvancePaymentsDetailsSheet
        selectedItem={selectedItem}
        accessToken={props.accessToken}
        userInfo={props.userInfo}
        t={t}
        onClose={handleCloseDetails}
      />
    </div>
  )
}

export default AdvancePaymentsTable
