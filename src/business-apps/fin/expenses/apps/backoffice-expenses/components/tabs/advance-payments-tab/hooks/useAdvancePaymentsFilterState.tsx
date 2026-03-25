import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { DataFilterGroup } from '@/components/data-filter/DataFilter'
import useCloseDropdownOnOutsideClick from '../../common/useCloseDropdownOnOutsideClick'
import { useBackofficeAsyncSearch } from '../../../../hooks/useBackofficeAsyncSearch'
import type { Currency } from '../../../../hooks/useFilterData'
import { getErrorMessage } from '../../../../utils/errorUtils'
import { getAdvancePaymentStatusDisplay, type TranslateFn } from '../../../../utils/utils'
import { buildStatusDisplayName } from '../../../../utils/sharedUtils'
import { getCurrencyLabel, getDepartmentLabel } from '../../common/backofficeFilterLabels'
import MinMaxNumberFilter from '../../common/MinMaxNumberFilter'
import DepartmentSelectFilter from '../../common/DepartmentSelectFilter'
import CurrencySelectFilter from '../../common/CurrencySelectFilter'
import {
  buildSelectedAdvancePaymentFilters,
  hasActiveAdvancePaymentFilters,
  type AdvancePaymentFilterState
} from './advancePaymentQueryBuilder'

interface DepartmentOption {
  id: string
  name: string
}

interface UseAdvancePaymentsFilterStateParams {
  t: TranslateFn
  searchStatuses: () => Promise<string[]>
  searchReporters: (searchTerm: string) => Promise<string[]>
  currencies: readonly Currency[]
  departmentOptions: DepartmentOption[]
  setCurrentPage: (page: number) => void
}

export function useAdvancePaymentsFilterState({
  t,
  searchStatuses,
  searchReporters,
  currencies,
  departmentOptions,
  setCurrentPage
}: UseAdvancePaymentsFilterStateParams) {
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [amountMinFilter, setAmountMinFilter] = useState('')
  const [amountMaxFilter, setAmountMaxFilter] = useState('')
  const [advanceMinFilter, setAdvanceMinFilter] = useState('')
  const [advanceMaxFilter, setAdvanceMaxFilter] = useState('')
  const [reporterFilter, setReporterFilter] = useState('')
  const [reporterSearchText, setReporterSearchText] = useState('')
  const [showReporterDropdown, setShowReporterDropdown] = useState(false)
  const [selectedReporters, setSelectedReporters] = useState<string[]>([])
  const [currencyRef, setCurrencyRef] = useState<string>('')
  const [departmentId, setDepartmentId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])

  const debouncedAmountMin = useDebounce(amountMinFilter, 500)
  const debouncedAmountMax = useDebounce(amountMaxFilter, 500)
  const debouncedAdvanceMin = useDebounce(advanceMinFilter, 500)
  const debouncedAdvanceMax = useDebounce(advanceMaxFilter, 500)
  const debouncedReporterSearchText = useDebounce(reporterSearchText, 300)

  const { results: reporterSearchResults, loading: reporterSearchLoading } = useBackofficeAsyncSearch<string>({
    query: debouncedReporterSearchText,
    searchFn: searchReporters,
    logContext: 'Error searching reporters:'
  })

  useEffect(() => {
    const loadAvailableStatuses = async () => {
      try {
        const statuses = await searchStatuses()
        setAvailableStatuses(statuses)
      } catch (error) {
        console.error('Error loading available statuses:', getErrorMessage(error))
      }
    }

    loadAvailableStatuses()
  }, [searchStatuses])

  useCloseDropdownOnOutsideClick({
    containerClassName: 'reporter-search-container',
    onOutsideClick: () => setShowReporterDropdown(false)
  })

  const resetPage = useCallback(() => {
    setCurrentPage(1)
  }, [setCurrentPage])

  const handleReporterClick = useCallback(
    (reporter: string) => {
      const newSelected = selectedReporters.includes(reporter)
        ? selectedReporters.filter(r => r !== reporter)
        : [...selectedReporters, reporter]
      setSelectedReporters(newSelected)
      setReporterFilter(newSelected.join(','))
      resetPage()
    },
    [resetPage, selectedReporters]
  )

  const getStatusDisplayName = useCallback(
    (status: string): string => buildStatusDisplayName(status, getAdvancePaymentStatusDisplay, t),
    [t]
  )

  const getDateRangeLabel = useCallback((): string => {
    const from = dateFrom ? dayjs(dateFrom).format('DD/MM/YYYY') : ''
    const to = dateTo ? dayjs(dateTo).format('DD/MM/YYYY') : ''
    if (from && to) return t('chip-date', { from, to })
    if (from) return t('chip-date-from', { from })
    if (to) return t('chip-date-to', { to })
    return t('chip-date-label')
  }, [dateFrom, dateTo, t])

  const renderReporterDropdownContent = useCallback(() => {
    if (reporterSearchLoading) {
      return (
        <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">{t('advance-payment-loading-reporters')}</div>
      )
    }

    if (reporterSearchResults.length === 0) {
      return <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">{t('advance-payment-no-reporters')}</div>
    }

    return reporterSearchResults.map(reporter => (
      <button
        key={reporter}
        className={`gba:w-full gba:text-left gba:p-2 gba:text-sm gba:hover:bg-muted gba:transition-colors ${
          selectedReporters.includes(reporter) ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:text-foreground'
        }`}
        onClick={() => handleReporterClick(reporter)}
        data-testid={`reporter-option-${reporter}`}
      >
        {reporter}
      </button>
    ))
  }, [handleReporterClick, reporterSearchLoading, reporterSearchResults, selectedReporters, t])

  const filterState = useMemo<AdvancePaymentFilterState>(
    () => ({
      statusFilter,
      reporterFilter,
      currencyRef,
      departmentId,
      dateFrom,
      dateTo,
      amountMinFilter,
      amountMaxFilter,
      advanceMinFilter,
      advanceMaxFilter
    }),
    [
      statusFilter,
      reporterFilter,
      currencyRef,
      departmentId,
      dateFrom,
      dateTo,
      amountMinFilter,
      amountMaxFilter,
      advanceMinFilter,
      advanceMaxFilter
    ]
  )

  const hasActiveFilters = useMemo(() => hasActiveAdvancePaymentFilters(filterState), [filterState])

  const filterGroups: DataFilterGroup[] = useMemo(
    () => [
      {
        id: 'status',
        title: t('filter-status'),
        type: 'checkbox',
        filters: availableStatuses.map(status => ({
          id: status,
          label: getStatusDisplayName(status),
          selected: statusFilter.includes(status)
        }))
      },
      {
        id: 'reporter',
        title: t('filter-employee'),
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
              placeholder={t('filter-search-employee')}
              data-testid="reporter-search-input"
            />
            {showReporterDropdown && reporterSearchText.trim() !== '' ? (
              <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:bg-background gba:border gba:border-input gba:rounded gba:max-h-40 gba:overflow-y-auto gba:z-10">
                {renderReporterDropdownContent()}
              </div>
            ) : null}
          </div>
        )
      },
      {
        id: 'currency',
        title: t('filter-currency'),
        type: 'custom',
        customComponent: (
          <CurrencySelectFilter
            currencyRef={currencyRef}
            onCurrencyChange={value => {
              setCurrencyRef(value)
              resetPage()
            }}
            currencies={currencies}
            testIdPrefix="advance-payments"
            t={t}
          />
        )
      },
      {
        id: 'department',
        title: t('filter-department'),
        type: 'custom',
        customComponent: (
          <DepartmentSelectFilter
            departmentId={departmentId}
            onDepartmentChange={value => {
              setDepartmentId(value)
              resetPage()
            }}
            departmentOptions={departmentOptions}
            testIdPrefix="advance-payments"
            t={t}
          />
        )
      },
      {
        id: 'dateRange',
        title: t('filter-date-range'),
        type: 'custom',
        customComponent: (
          <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{t('filter-from')}</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => {
                  setDateFrom(e.target.value)
                  resetPage()
                }}
                className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid="advance-payments-date-from-input"
              />
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{t('filter-to')}</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => {
                  setDateTo(e.target.value)
                  resetPage()
                }}
                className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid="advance-payments-date-to-input"
              />
            </div>
          </div>
        )
      },
      {
        id: 'amount',
        title: t('filter-amount'),
        type: 'custom',
        customComponent: (
          <MinMaxNumberFilter
            minValue={amountMinFilter}
            maxValue={amountMaxFilter}
            onMinChange={setAmountMinFilter}
            onMaxChange={setAmountMaxFilter}
            testIdPrefix="amount"
            onPageReset={resetPage}
          />
        )
      },
      {
        id: 'advance',
        title: t('filter-advance'),
        type: 'custom',
        customComponent: (
          <MinMaxNumberFilter
            minValue={advanceMinFilter}
            maxValue={advanceMaxFilter}
            onMinChange={setAdvanceMinFilter}
            onMaxChange={setAdvanceMaxFilter}
            testIdPrefix="advance"
            onPageReset={resetPage}
          />
        )
      }
    ],
    [
      amountMaxFilter,
      amountMinFilter,
      availableStatuses,
      currencies,
      currencyRef,
      dateFrom,
      dateTo,
      departmentId,
      departmentOptions,
      advanceMaxFilter,
      advanceMinFilter,
      getStatusDisplayName,
      renderReporterDropdownContent,
      reporterSearchText,
      resetPage,
      showReporterDropdown,
      statusFilter,
      t
    ]
  )

  const selectedFilters = useMemo(() => buildSelectedAdvancePaymentFilters(filterState), [filterState])

  const filterLabelMap = useMemo(
    () => ({
      ...statusFilter.reduce(
        (acc, status) => {
          acc[status] = getStatusDisplayName(status)
          return acc
        },
        {} as Record<string, string>
      ),
      reporter: `${t('advance-payment-reporter-label')} ${selectedReporters.join(', ')}`,
      currency: getCurrencyLabel(currencyRef, currencies),
      department: getDepartmentLabel(departmentId, departmentOptions),
      dateRange: getDateRangeLabel(),
      amount: `${t('advance-payment-amount-label')} ${amountMinFilter || '0'} - ${amountMaxFilter || '∞'}`,
      advance: `${t('advance-payment-advance-label')} ${advanceMinFilter || '0'} - ${advanceMaxFilter || '∞'}`
    }),
    [
      advanceMaxFilter,
      advanceMinFilter,
      amountMaxFilter,
      amountMinFilter,
      currencies,
      currencyRef,
      dateFrom,
      dateTo,
      departmentId,
      departmentOptions,
      getDateRangeLabel,
      getStatusDisplayName,
      selectedReporters,
      statusFilter,
      t
    ]
  )

  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      if (!availableStatuses.includes(filterId)) {
        return
      }

      const newStatusFilter = selected
        ? [...statusFilter, filterId]
        : statusFilter.filter(status => status !== filterId)
      setStatusFilter(newStatusFilter)
      resetPage()
    },
    [availableStatuses, resetPage, statusFilter]
  )

  const handleSetFilter = useCallback(
    (newFilters: string[]): void => {
      const isStatusFilter = (filter: string) => availableStatuses.includes(filter)

      const statusFilters = newFilters.filter(isStatusFilter)
      const hasReporter = newFilters.includes('reporter')
      const hasCurrency = newFilters.includes('currency')
      const hasDepartment = newFilters.includes('department')
      const hasDateRange = newFilters.includes('dateRange')
      const hasAmount = newFilters.includes('amount')
      const hasAdvance = newFilters.includes('advance')

      const statusToRemove = selectedFilters.filter(filter => isStatusFilter(filter) && !statusFilters.includes(filter))
      const statusToAdd = statusFilters.filter(filter => !selectedFilters.includes(filter))
      statusToRemove.forEach(filter => handleFilterChange(filter, false))
      statusToAdd.forEach(filter => handleFilterChange(filter, true))

      if (!hasReporter && reporterFilter) {
        setReporterFilter('')
        setSelectedReporters([])
      }
      if (!hasCurrency && currencyRef) {
        setCurrencyRef('')
      }
      if (!hasDepartment && departmentId) {
        setDepartmentId('')
      }
      if (!hasDateRange && (dateFrom || dateTo)) {
        setDateFrom('')
        setDateTo('')
      }
      if (!hasAmount && (amountMinFilter || amountMaxFilter)) {
        setAmountMinFilter('')
        setAmountMaxFilter('')
      }
      if (!hasAdvance && (advanceMinFilter || advanceMaxFilter)) {
        setAdvanceMinFilter('')
        setAdvanceMaxFilter('')
      }

      resetPage()
    },
    [
      availableStatuses,
      selectedFilters,
      handleFilterChange,
      reporterFilter,
      currencyRef,
      departmentId,
      dateFrom,
      dateTo,
      amountMinFilter,
      amountMaxFilter,
      advanceMinFilter,
      advanceMaxFilter,
      resetPage
    ]
  )

  const queryFilterState = useMemo<AdvancePaymentFilterState>(
    () => ({
      ...filterState,
      amountMinFilter: debouncedAmountMin,
      amountMaxFilter: debouncedAmountMax,
      advanceMinFilter: debouncedAdvanceMin,
      advanceMaxFilter: debouncedAdvanceMax
    }),
    [debouncedAdvanceMax, debouncedAdvanceMin, debouncedAmountMax, debouncedAmountMin, filterState]
  )

  return {
    filterState,
    queryFilterState,
    filterGroups,
    selectedFilters,
    filterLabelMap,
    handleFilterChange,
    handleSetFilter,
    hasActiveFilters
  }
}
