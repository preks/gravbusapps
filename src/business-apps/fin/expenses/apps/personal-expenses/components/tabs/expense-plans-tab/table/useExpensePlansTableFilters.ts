import { useCallback, useMemo } from 'react'
import {
  applyDateRangeFromFilter,
  applyCurrencyChange,
  resolveSelectedCurrencyCode
} from '../../../../utils/tableUtils'
import type { CurrencyStat } from '../../../../utils/tableUtils'
import { createExpensePlanFilterConfig } from '../config/expensePlanFilterConfig'
import { buildExpensePlansFiltersObject } from '../config/expensePlansDisplayFilters'

export interface UseExpensePlansTableFiltersParams {
  selectedFilters: string[]
  filterLabelMap: Record<string, string>
  availableStatuses: string[]
  planDateRange?: [Date | null, Date | null] | null
  setPlanDateRange?: (range: [Date | null, Date | null] | null) => void
  effectiveDateRange?: [Date | null, Date | null] | null
  setEffectiveDateRange?: (range: [Date | null, Date | null] | null) => void
  startDateRange?: [Date | null, Date | null] | null
  setStartDateRange?: (range: [Date | null, Date | null] | null) => void
  endDateRange?: [Date | null, Date | null] | null
  setEndDateRange?: (range: [Date | null, Date | null] | null) => void
  setFilters: (filters: string[]) => void
  onFiltersChange?: () => void
  currencyStats: CurrencyStat[]
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
  setFilters,
  onFiltersChange,
  currencyStats
}: Readonly<UseExpensePlansTableFiltersParams>) {
  const filterConfiguration = useMemo(
    () =>
      createExpensePlanFilterConfig({
        statusOptions: availableStatuses,
        filterLabelMap
      }),
    [availableStatuses, filterLabelMap]
  )

  const filtersObject = useMemo(
    () =>
      buildExpensePlansFiltersObject(
        selectedFilters,
        planDateRange,
        effectiveDateRange,
        startDateRange,
        endDateRange,
        availableStatuses
      ),
    [selectedFilters, planDateRange, effectiveDateRange, startDateRange, endDateRange, availableStatuses]
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
      const preserved = selectedFilters.filter(f => f.startsWith('currency:'))
      setFilters([...preserved, ...statusIds, ...planTypeIds, ...topDestinationIds, ...dateRangeTokens])
      onFiltersChange?.()
    },
    [
      selectedFilters,
      setFilters,
      setPlanDateRange,
      setEffectiveDateRange,
      setStartDateRange,
      setEndDateRange,
      onFiltersChange
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
