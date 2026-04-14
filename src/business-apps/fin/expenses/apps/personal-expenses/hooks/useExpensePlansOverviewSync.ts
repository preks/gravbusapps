import { useEffect, useRef } from 'react'
import { DEFAULT_CURRENCY_REF } from '../utils/currencyUtils'

export interface UseExpensePlansOverviewSyncParams {
  memoizedFilters: Record<string, unknown>
  currentPage: number
  setCurrentPage: (page: number | ((prev: number) => number)) => void
  pageSize: number
  sortField: string | null
  sortOrder: 'ascend' | 'descend' | null
  fetchOverview: (
    filters: Record<string, unknown>,
    page: number,
    pageSize: number,
    sortField: string | null,
    sortOrder: 'ascend' | 'descend' | null,
    statsCurrency: string,
    options?: { force?: boolean }
  ) => void | Promise<void>
  accessToken: string | undefined
  employeeId: string | undefined
  explicitSelectedCurrencyRef: string | undefined
  suppressCurrencyAutoSelect: boolean
}

export function useExpensePlansOverviewSync({
  memoizedFilters,
  currentPage,
  setCurrentPage,
  pageSize,
  sortField,
  sortOrder,
  fetchOverview,
  accessToken,
  employeeId,
  explicitSelectedCurrencyRef,
  suppressCurrencyAutoSelect
}: UseExpensePlansOverviewSyncParams): void {
  const lastFiltersKeyRef = useRef<string>('')

  useEffect(() => {
    const hasExplicitCurrency = !!explicitSelectedCurrencyRef
    const canFetch = !!accessToken && !!employeeId && (suppressCurrencyAutoSelect || hasExplicitCurrency)

    if (canFetch) {
      const statsCurrency = explicitSelectedCurrencyRef || DEFAULT_CURRENCY_REF
      const filtersKey = JSON.stringify(memoizedFilters)
      const filtersChanged = filtersKey !== lastFiltersKeyRef.current
      if (filtersChanged) {
        lastFiltersKeyRef.current = filtersKey
        setCurrentPage(1)
      }
      const pageToFetch = filtersChanged ? 1 : currentPage
      fetchOverview(memoizedFilters, pageToFetch, pageSize, sortField, sortOrder, statsCurrency)
    }
  }, [
    fetchOverview,
    currentPage,
    pageSize,
    memoizedFilters,
    sortField,
    sortOrder,
    accessToken,
    employeeId,
    explicitSelectedCurrencyRef,
    suppressCurrencyAutoSelect,
    setCurrentPage
  ])
}
