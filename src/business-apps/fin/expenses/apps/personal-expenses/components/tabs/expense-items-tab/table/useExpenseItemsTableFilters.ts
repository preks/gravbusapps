import { useCallback, useMemo } from 'react'
import { resolveSelectedCurrencyCode, applyCurrencyChange } from '../../../../utils/tableUtils'
import { createExpenseItemFilterConfig } from '../config/expenseItemFilterConfig'
import {
  applyAmountRangeFromFilters,
  applyExpenseDateRangeFromFilters,
  buildExpenseItemsFiltersObject
} from '../config/expenseItemsDisplayFilters'
import type { ExpenseFilter } from '../../../../hooks/useGetExpenseItems'
import type { CurrencyStat } from '../../../../hooks/useExpenseCurrencies'

interface UseExpenseItemsTableFiltersParams {
  allSelectedFilters: string[]
  filterLabelMap: Record<string, string>
  availableStatuses: string[]
  expenseDateRange?: [Date | null, Date | null] | null
  amountRange?: { min?: number; max?: number } | null
  setFilters: (filters: string[]) => void
  setExpenseDateRange: (range: [Date | null, Date | null] | null) => void
  setAmountRange: (range: { min?: number; max?: number } | null) => void
  setCurrentPage: (page: number) => void
  currencyStats: CurrencyStat[]
  selectedCurrencyRef?: string
  getFilters: (filtersToApply?: string[]) => ExpenseFilter
}

export function useExpenseItemsTableFilters({
  allSelectedFilters,
  filterLabelMap,
  availableStatuses,
  expenseDateRange,
  amountRange,
  setFilters,
  setExpenseDateRange,
  setAmountRange,
  setCurrentPage,
  currencyStats,
  selectedCurrencyRef,
  getFilters
}: Readonly<UseExpenseItemsTableFiltersParams>) {
  const expenseItemsFilterConfig = useMemo(
    () =>
      createExpenseItemFilterConfig({
        filterLabelMap,
        availableStatuses
      }),
    [filterLabelMap, availableStatuses]
  )

  const filtersObject = useMemo(
    () => buildExpenseItemsFiltersObject(allSelectedFilters, expenseDateRange, amountRange, availableStatuses),
    [allSelectedFilters, expenseDateRange, amountRange, availableStatuses]
  )

  const selectedCurrencyCode = useMemo(
    () => resolveSelectedCurrencyCode(allSelectedFilters, currencyStats),
    [allSelectedFilters, currencyStats]
  )

  const availableCurrencyCodes = useMemo(() => [...new Set(currencyStats.map(cs => cs.code))], [currencyStats])

  const handleCurrencyChange = useCallback(
    (code: string | null) => {
      applyCurrencyChange(code ?? 'ALL', allSelectedFilters, currencyStats, setFilters)
      setCurrentPage(1)
    },
    [allSelectedFilters, currencyStats, setFilters, setCurrentPage]
  )

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, any>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      const currencyTokens = allSelectedFilters.filter(f => f.startsWith('currency:'))
      setFilters([...currencyTokens, ...statusIds])
      applyExpenseDateRangeFromFilters(filters.expenseDateRange, setExpenseDateRange)
      applyAmountRangeFromFilters(filters.amount as { min?: number; max?: number } | undefined, setAmountRange)
      setCurrentPage(1)
    },
    [allSelectedFilters, setFilters, setExpenseDateRange, setAmountRange, setCurrentPage]
  )

  const buildApiFilters = useCallback(() => {
    const apiFilters = { ...getFilters(allSelectedFilters) } as ExpenseFilter
    const hasCurrencyFilter = allSelectedFilters.some(f => f.startsWith('currency:'))
    if (hasCurrencyFilter && selectedCurrencyRef) {
      apiFilters.currencyRef = selectedCurrencyRef
    }
    return apiFilters
  }, [getFilters, selectedCurrencyRef, allSelectedFilters])

  return {
    expenseItemsFilterConfig,
    filtersObject,
    selectedCurrencyCode,
    availableCurrencyCodes,
    handleCurrencyChange,
    handleFilterChangeFromDisplay,
    buildApiFilters
  }
}
