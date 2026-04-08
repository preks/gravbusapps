import { useEffect } from 'react'
import type { ExpenseRequestTableSortOrder } from '../config/expenseRequestSortableColumns'

export interface UseExpenseRequestsTabFetchEffectParams {
  currenciesInitialized: boolean
  accessToken: string | undefined
  employeeId: string | undefined
  fetchItems: (
    filters: unknown,
    page: number,
    pageSize: number,
    sortField: string,
    sortOrder: ExpenseRequestTableSortOrder
  ) => void | Promise<void>
  debouncedFilters: unknown
  currentPage: number
  pageSize: number
  sortField: string
  sortOrder: ExpenseRequestTableSortOrder
}

export function useExpenseRequestsTabFetchEffect({
  currenciesInitialized,
  accessToken,
  employeeId,
  fetchItems,
  debouncedFilters,
  currentPage,
  pageSize,
  sortField,
  sortOrder
}: Readonly<UseExpenseRequestsTabFetchEffectParams>): void {
  useEffect(() => {
    if (!currenciesInitialized) return
    if (accessToken && employeeId) {
      fetchItems(debouncedFilters, currentPage, pageSize, sortField, sortOrder)
    }
  }, [
    fetchItems,
    currentPage,
    pageSize,
    debouncedFilters,
    sortField,
    sortOrder,
    accessToken,
    employeeId,
    currenciesInitialized
  ])
}
