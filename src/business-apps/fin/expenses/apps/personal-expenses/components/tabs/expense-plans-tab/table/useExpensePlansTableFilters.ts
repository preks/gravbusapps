import { useCallback, useMemo } from 'react'
import {
  applyDateRangeFromFilter,
  applyCurrencyChange,
  resolveSelectedCurrencyCode
} from '../../../../utils/tableUtils'
import {
  applyAmountRangeFromFilters,
  isAmountRangeFilterActive,
  type ExpenseAmountRangeValue
} from '@/business-apps/fin/expenses/common/utils/amountRangeFilterUtils'
import type { CurrencyStat } from '../../../../utils/tableUtils'
import { createExpensePlanFilterConfig } from '../config/expensePlanFilterConfig'
import { buildExpensePlansFiltersObject } from '../config/expensePlansDisplayFilters'

export interface UseExpensePlansTableFiltersParams {
  selectedFilters: string[]
  filterLabelMap: Record<string, string>
  availableStatuses: string[]
  t: (key: string) => string
  planDateRange?: [Date | null, Date | null] | null
  setPlanDateRange?: (range: [Date | null, Date | null] | null) => void
  effectiveDateRange?: [Date | null, Date | null] | null
  setEffectiveDateRange?: (range: [Date | null, Date | null] | null) => void
  startDateRange?: [Date | null, Date | null] | null
  setStartDateRange?: (range: [Date | null, Date | null] | null) => void
  endDateRange?: [Date | null, Date | null] | null
  setEndDateRange?: (range: [Date | null, Date | null] | null) => void
  reimbursableAmountRange?: ExpenseAmountRangeValue
  setReimbursableAmountRange?: (range: ExpenseAmountRangeValue) => void
  paidAdvanceAmountRange?: ExpenseAmountRangeValue
  setPaidAdvanceAmountRange?: (range: ExpenseAmountRangeValue) => void
  setFilters: (filters: string[]) => void
  onFiltersChange?: () => void
  currencyStats: CurrencyStat[]
  widgetTopDestinationFilterTokens?: string[]
}

export function useExpensePlansTableFilters({
  selectedFilters,
  filterLabelMap,
  availableStatuses,
  planDateRange,
  setPlanDateRange,
  effectiveDateRange,
  setEffectiveDateRange,
  startDateRange,
  setStartDateRange,
  endDateRange,
  setEndDateRange,
  reimbursableAmountRange,
  setReimbursableAmountRange,
  paidAdvanceAmountRange,
  setPaidAdvanceAmountRange,
  setFilters,
  onFiltersChange,
  currencyStats,
  widgetTopDestinationFilterTokens = [],
  t
}: Readonly<UseExpensePlansTableFiltersParams>) {
  const filterConfiguration = useMemo(
    () =>
      createExpensePlanFilterConfig({
        statusOptions: availableStatuses,
        filterLabelMap,
        t
      }),
    [availableStatuses, filterLabelMap, t]
  )

  const filtersObject = useMemo(
    () =>
      buildExpensePlansFiltersObject(
        selectedFilters,
        planDateRange,
        effectiveDateRange,
        startDateRange,
        endDateRange,
        availableStatuses,
        reimbursableAmountRange ?? null,
        paidAdvanceAmountRange ?? null
      ),
    [
      selectedFilters,
      planDateRange,
      effectiveDateRange,
      startDateRange,
      endDateRange,
      availableStatuses,
      reimbursableAmountRange,
      paidAdvanceAmountRange
    ]
  )

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      const planTypeIds = (filters.planTypeIds as string[] | undefined) || []
      const topDestinationIds = (filters.topDestinationIds as string[] | undefined) || []
      const dateRangeTokens: string[] = []
      if (setPlanDateRange && applyDateRangeFromFilter(filters.planDateRange, setPlanDateRange)) {
        dateRangeTokens.push('planDateRange')
      }
      if (setEffectiveDateRange && applyDateRangeFromFilter(filters.effectiveDateRange, setEffectiveDateRange)) {
        dateRangeTokens.push('effectiveDateRange')
      }
      if (setStartDateRange && applyDateRangeFromFilter(filters.startDateRange, setStartDateRange)) {
        dateRangeTokens.push('startDateRange')
      }
      if (setEndDateRange && applyDateRangeFromFilter(filters.endDateRange, setEndDateRange)) {
        dateRangeTokens.push('endDateRange')
      }
      const amountTokens: string[] = []
      if (setReimbursableAmountRange) {
        applyAmountRangeFromFilters(
          filters.reimbursableAmount as { min?: number; max?: number } | undefined,
          setReimbursableAmountRange
        )
        if (isAmountRangeFilterActive(filters.reimbursableAmount)) {
          amountTokens.push('reimbursableAmountRange')
        }
      }
      if (setPaidAdvanceAmountRange) {
        applyAmountRangeFromFilters(
          filters.paidAdvance as { min?: number; max?: number } | undefined,
          setPaidAdvanceAmountRange
        )
        if (isAmountRangeFilterActive(filters.paidAdvance)) {
          amountTokens.push('paidAdvanceAmountRange')
        }
      }
      const preserved = selectedFilters.filter(f => f.startsWith('currency:'))
      setFilters([
        ...preserved,
        ...statusIds,
        ...planTypeIds,
        ...topDestinationIds,
        ...dateRangeTokens,
        ...amountTokens
      ])
      onFiltersChange?.()
    },
    [
      selectedFilters,
      setFilters,
      setPlanDateRange,
      setEffectiveDateRange,
      setStartDateRange,
      setEndDateRange,
      setReimbursableAmountRange,
      setPaidAdvanceAmountRange,
      onFiltersChange,
      widgetTopDestinationFilterTokens
    ]
  )

  const selectedCurrencyCode = useMemo(
    () => resolveSelectedCurrencyCode(selectedFilters, currencyStats),
    [selectedFilters, currencyStats]
  )

  const handleCurrencyChange = useCallback(
    (code: string) => {
      applyCurrencyChange(code, selectedFilters, currencyStats, setFilters)
    },
    [selectedFilters, currencyStats, setFilters]
  )

  return {
    filterConfiguration,
    filtersObject,
    handleFilterChangeFromDisplay,
    selectedCurrencyCode,
    handleCurrencyChange
  }
}
