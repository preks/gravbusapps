import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import useCloseDropdownOnOutsideClick from '../../common/useCloseDropdownOnOutsideClick'
import { useBackofficeAsyncSearch } from '../../../../hooks/useBackofficeAsyncSearch'
import type { Currency } from '../../../../hooks/useFilterData'
import { getErrorMessage } from '../../../../utils/errorUtils'
import type { TranslateFn } from '../../../../utils/utils'
import {
  applyAdvancePaymentDisplayFilters,
  buildAdvancePaymentFilterConfiguration,
  buildAdvancePaymentFiltersObject,
  buildReporterOptions
} from './advancePaymentDisplayFilterUtils'
import { hasActiveAdvancePaymentFilters, type AdvancePaymentFilterState } from './advancePaymentQueryBuilder'
import type { ReporterFilterRenderProps } from '../components/AdvancePaymentFilterSheet'

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

  const reporterOptions = useMemo(
    () => buildReporterOptions(selectedReporters, reporterSearchResults),
    [reporterSearchResults, selectedReporters]
  )

  const filterConfiguration = useMemo(
    () =>
      buildAdvancePaymentFilterConfiguration({
        t,
        availableStatuses,
        currencies,
        departmentOptions,
        reporterOptions
      }),
    [availableStatuses, currencies, departmentOptions, reporterOptions, t]
  )

  const filtersObject = useMemo(
    () =>
      buildAdvancePaymentFiltersObject({
        statusFilter,
        selectedReporters,
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
      selectedReporters,
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

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      applyAdvancePaymentDisplayFilters({
        filters,
        setStatusFilter,
        setSelectedReporters,
        setReporterFilter,
        setCurrencyRef,
        setDepartmentId,
        setDateFrom,
        setDateTo,
        setAmountMinFilter,
        setAmountMaxFilter,
        setAdvanceMinFilter,
        setAdvanceMaxFilter,
        setCurrentPage
      })
    },
    [setCurrentPage]
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

  const reporterFilterRenderProps = useMemo(
    () =>
      ({
        selectedReporterIds: selectedReporters,
        onSelectedReporterIdsChange: reporterIds => {
          setSelectedReporters(reporterIds)
          setReporterFilter(reporterIds.join(','))
          resetPage()
        }
      }) satisfies ReporterFilterRenderProps,
    [resetPage, selectedReporters]
  )

  return {
    filterState,
    queryFilterState,
    filterConfiguration,
    filtersObject,
    handleFilterChangeFromDisplay,
    reporterFilterRenderProps,
    hasActiveFilters,
    reporterSearchText,
    setReporterSearchText,
    showReporterDropdown,
    setShowReporterDropdown,
    reporterSearchResults,
    reporterSearchLoading,
    selectedReporters,
    setSelectedReporters,
    setReporterFilter
  }
}
