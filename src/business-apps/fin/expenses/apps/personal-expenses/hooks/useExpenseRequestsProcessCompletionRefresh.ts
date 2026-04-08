import { useEffect } from 'react'
import { PROCESS_COMPLETION_EVENT_NAMES } from '@/business-apps/fin/expenses/common/constants/processCompletionEventNames'
import type { ExpenseRequestTableSortOrder } from '../components/tabs/expense-requests-tab/config/expenseRequestSortableColumns'
import { buildExpenseRequestFetchFilters } from '../components/tabs/expense-requests-tab/utils/buildExpenseRequestFetchFilters'
import type { ExpenseRequestWhereClause } from './useExpenseRequestFilters'

export interface UseExpenseRequestsProcessCompletionRefreshParams {
  fetchItems: (
    filters: ExpenseRequestWhereClause,
    page: number,
    pageSize: number,
    sortField: string,
    sortOrder: ExpenseRequestTableSortOrder,
    options?: { force?: boolean }
  ) => void | Promise<void>
  getFilters: () => ExpenseRequestWhereClause
  explicitSelectedCurrencyRef: string | undefined
  currentPage: number
  pageSize: number
  sortField: string
  sortOrder: ExpenseRequestTableSortOrder
  accessToken: string | undefined
  employeeId: string | undefined
  currenciesInitialized: boolean
  setTableRefreshTrigger: (updater: (prev: number) => number) => void
}

export function useExpenseRequestsProcessCompletionRefresh({
  fetchItems,
  getFilters,
  explicitSelectedCurrencyRef,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  accessToken,
  employeeId,
  currenciesInitialized,
  setTableRefreshTrigger
}: Readonly<UseExpenseRequestsProcessCompletionRefreshParams>): void {
  useEffect(() => {
    const handleProcessCompletion = (event: Event) => {
      try {
        const custom = event as CustomEvent<{ resolution?: string }>
        if (custom.detail?.resolution !== 'success') return

        if (currenciesInitialized && accessToken && employeeId) {
          const filters = buildExpenseRequestFetchFilters(getFilters, explicitSelectedCurrencyRef)
          fetchItems(filters, currentPage, pageSize, sortField, sortOrder, { force: true })
        }

        setTableRefreshTrigger(prev => prev + 1)
      } catch (err) {
        console.error('Error handling process completion:', err)
      }
    }

    PROCESS_COMPLETION_EVENT_NAMES.forEach(eventName => {
      globalThis.addEventListener(eventName, handleProcessCompletion)
    })

    return () => {
      PROCESS_COMPLETION_EVENT_NAMES.forEach(eventName => {
        globalThis.removeEventListener(eventName, handleProcessCompletion)
      })
    }
  }, [
    fetchItems,
    getFilters,
    explicitSelectedCurrencyRef,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    accessToken,
    employeeId,
    currenciesInitialized,
    setTableRefreshTrigger
  ])
}
