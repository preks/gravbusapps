import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { getErrorMessage } from '../../../../utils/errorUtils'
import type { TranslateFn } from '../../../../utils/utils'
import {
  buildAdvancePaymentFilterConfiguration,
  buildAdvancePaymentFiltersObject,
  buildReporterOptions
} from './advancePaymentDisplayFilterUtils'
import { applyAdvancePaymentDisplayFilters } from './advancePaymentDisplayFilterApply'
import { hasActiveAdvancePaymentFilters, type AdvancePaymentFilterState } from './advancePaymentQueryBuilder'

interface DepartmentOption {
  id: string
  name: string
}

interface AdvancePaymentReporterSearchOptions {
  searchTerm?: string
  status?: string
  amountMin?: string
  amountMax?: string
  advanceMin?: string
  advanceMax?: string
  currencyRef?: string
  departmentId?: string
  dateFrom?: string
  dateTo?: string
}

interface UseAdvancePaymentsFilterStateParams {
  t: TranslateFn
  searchStatuses: () => Promise<string[]>
  searchReporters: (searchTerm: string, options?: AdvancePaymentReporterSearchOptions) => Promise<string[]>
  departmentOptions: DepartmentOption[]
  currencyRef: string
  searchTerm: string
  setCurrentPage: (page: number) => void
}

export function useAdvancePaymentsFilterState({
  t,
  searchStatuses,
  searchReporters,
  departmentOptions,
  currencyRef,
  searchTerm,
  setCurrentPage
}: UseAdvancePaymentsFilterStateParams) {
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [amountMinFilter, setAmountMinFilter] = useState('')
  const [amountMaxFilter, setAmountMaxFilter] = useState('')
  const [advanceMinFilter, setAdvanceMinFilter] = useState('')
  const [advanceMaxFilter, setAdvanceMaxFilter] = useState('')
  const [reporterFilter, setReporterFilter] = useState('')
  const [selectedReporters, setSelectedReporters] = useState<string[]>([])
  const [departmentId, setDepartmentId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])
  const [availableReporters, setAvailableReporters] = useState<string[]>([])

  const debouncedAmountMin = useDebounce(amountMinFilter, 500)
  const debouncedAmountMax = useDebounce(amountMaxFilter, 500)
  const debouncedAdvanceMin = useDebounce(advanceMinFilter, 500)
  const debouncedAdvanceMax = useDebounce(advanceMaxFilter, 500)

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

  useEffect(() => {
    let isCancelled = false

    const loadAvailableReporters = async () => {
      try {
        const reporters = await searchReporters('', {
          searchTerm,
          status: statusFilter.join(','),
          amountMin: debouncedAmountMin,
          amountMax: debouncedAmountMax,
          advanceMin: debouncedAdvanceMin,
          advanceMax: debouncedAdvanceMax,
          currencyRef,
          departmentId,
          dateFrom,
          dateTo
        })
        if (!isCancelled) {
          setAvailableReporters(reporters)
        }
      } catch (error) {
        console.error('Error loading available reporters:', getErrorMessage(error))
      }
    }

    void loadAvailableReporters()

    return () => {
      isCancelled = true
    }
  }, [
    searchReporters,
    searchTerm,
    statusFilter,
    debouncedAmountMin,
    debouncedAmountMax,
    debouncedAdvanceMin,
    debouncedAdvanceMax,
    currencyRef,
    departmentId,
    dateFrom,
    dateTo
  ])

  const hasActiveFilters = useMemo(() => hasActiveAdvancePaymentFilters(filterState), [filterState])

  const reporterOptions = useMemo(
    () => buildReporterOptions(selectedReporters, availableReporters),
    [availableReporters, selectedReporters]
  )

  const filterConfiguration = useMemo(
    () =>
      buildAdvancePaymentFilterConfiguration({
        t,
        availableStatuses,
        departmentOptions,
        reporterOptions
      }),
    [availableStatuses, departmentOptions, reporterOptions, t]
  )

  const filtersObject = useMemo(
    () =>
      buildAdvancePaymentFiltersObject({
        statusFilter,
        selectedReporters,
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

  return {
    filterState,
    queryFilterState,
    filterConfiguration,
    filtersObject,
    handleFilterChangeFromDisplay,
    hasActiveFilters,
    selectedReporters,
    setSelectedReporters,
    setReporterFilter
  }
}
