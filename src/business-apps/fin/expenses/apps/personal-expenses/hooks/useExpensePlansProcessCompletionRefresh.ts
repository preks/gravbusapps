import { useEffect } from 'react'
import { PROCESS_COMPLETION_EVENT_NAMES } from '@/business-apps/fin/expenses/common/constants/processCompletionEventNames'
import { DEFAULT_CURRENCY_REF } from '../utils/currencyUtils'

export interface UseExpensePlansProcessCompletionRefreshParams {
  fetchOverview: (
    filters: Record<string, unknown>,
    page: number,
    pageSize: number,
    sortField: string | null,
    sortOrder: 'ascend' | 'descend' | null,
    statsCurrency: string,
    options?: { force?: boolean }
  ) => void | Promise<void>
  memoizedFilters: Record<string, unknown>
  currentPage: number
  pageSize: number
  sortField: string | null
  sortOrder: 'ascend' | 'descend' | null
  accessToken: string | undefined
  employeeId: string | undefined
  explicitSelectedCurrencyRef: string | undefined
  suppressCurrencyAutoSelect: boolean
  setActiveWidget: (value: string | null) => void
  setTableRefreshTrigger: (updater: (prev: number) => number) => void
}

export function useExpensePlansProcessCompletionRefresh({
  fetchOverview,
  memoizedFilters,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  accessToken,
  employeeId,
  explicitSelectedCurrencyRef,
  suppressCurrencyAutoSelect,
  setActiveWidget,
  setTableRefreshTrigger
}: UseExpensePlansProcessCompletionRefreshParams): void {
  useEffect(() => {
    const handleProcessCompletion = (event: Event) => {
      try {
        const custom = event as CustomEvent<{ resolution?: string }>
        if (custom.detail?.resolution === 'success') {
          const canFetch = accessToken && employeeId && (explicitSelectedCurrencyRef || suppressCurrencyAutoSelect)

          if (canFetch) {
            const statsCurrency = explicitSelectedCurrencyRef || DEFAULT_CURRENCY_REF
            fetchOverview(memoizedFilters, currentPage, pageSize, sortField, sortOrder, statsCurrency, {
              force: true
            })
          }

          setActiveWidget(null)
          setTableRefreshTrigger(prev => prev + 1)
        }
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
    fetchOverview,
    memoizedFilters,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    accessToken,
    employeeId,
    explicitSelectedCurrencyRef,
    suppressCurrencyAutoSelect,
    setActiveWidget,
    setTableRefreshTrigger
  ])
}
