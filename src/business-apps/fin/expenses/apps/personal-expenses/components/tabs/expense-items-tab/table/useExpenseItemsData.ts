import { useCallback, useEffect } from 'react'
import type { ExpenseFilter } from '../../../../hooks/useGetExpenseItems'
import type { TableSortOrder } from './expenseItemsTable.types'

interface UseExpenseItemsDataParams {
  initialized: boolean
  tableRefreshTrigger?: number
  debouncedSearch: string
  currentPage: number
  pageSize: number
  effectiveSortField: string
  effectiveSortOrder: Exclude<TableSortOrder, undefined>
  buildApiFilters: () => ExpenseFilter
  clearSelection: () => void
  fetchItems: (
    searchTerm?: string,
    page?: number,
    pageSize?: number,
    filter?: ExpenseFilter,
    sortField?: string | null,
    sortOrder?: 'ascend' | 'descend' | null,
    options?: { force?: boolean }
  ) => Promise<void>
}

export function useExpenseItemsData({
  initialized,
  tableRefreshTrigger,
  debouncedSearch,
  currentPage,
  pageSize,
  effectiveSortField,
  effectiveSortOrder,
  buildApiFilters,
  clearSelection,
  fetchItems
}: UseExpenseItemsDataParams) {
  useEffect(() => {
    if (!initialized) return
    const searchTerm = debouncedSearch?.trim() || '%'
    const apiFilters = buildApiFilters()
    fetchItems(searchTerm, currentPage, pageSize, apiFilters, effectiveSortField, effectiveSortOrder)
  }, [
    fetchItems,
    currentPage,
    pageSize,
    debouncedSearch,
    initialized,
    buildApiFilters,
    effectiveSortField,
    effectiveSortOrder
  ])

  useEffect(() => {
    if (!tableRefreshTrigger || tableRefreshTrigger <= 0) return
    const searchTerm = debouncedSearch?.trim() || '%'
    const apiFilters = buildApiFilters()
    fetchItems(searchTerm, currentPage, pageSize, apiFilters, effectiveSortField, effectiveSortOrder, { force: true })
    clearSelection()
  }, [
    tableRefreshTrigger,
    fetchItems,
    debouncedSearch,
    currentPage,
    pageSize,
    buildApiFilters,
    effectiveSortField,
    effectiveSortOrder,
    clearSelection
  ])

  const retryFetch = useCallback(() => {
    const searchTerm = debouncedSearch?.trim() || '%'
    const apiFilters = buildApiFilters()
    fetchItems(searchTerm, currentPage, pageSize, apiFilters, effectiveSortField, effectiveSortOrder)
  }, [fetchItems, debouncedSearch, buildApiFilters, currentPage, pageSize, effectiveSortField, effectiveSortOrder])

  return { retryFetch }
}
