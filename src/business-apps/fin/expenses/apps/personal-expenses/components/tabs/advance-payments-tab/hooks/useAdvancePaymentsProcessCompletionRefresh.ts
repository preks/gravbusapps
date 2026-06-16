import { useEffect } from 'react'
import { PROCESS_COMPLETION_EVENT_NAMES } from '@/business-apps/fin/expenses/common/constants/processCompletionEventNames'
import type { FetchItemsOptions } from '../../../../hooks/useGetAdvancePayments'

export interface UseAdvancePaymentsProcessCompletionRefreshParams {
  fetchItems: (options?: FetchItemsOptions) => Promise<void>
  fetchParams: {
    searchText: string
    currentPage: number
    pageSize: number
    currentStatusFilter: string[]
    currentAmountRange: { min?: number; max?: number } | null
    currentAdvanceRange: { min?: number; max?: number } | null
    cardCreatedAtRange: { gte: string; lte: string } | null
    sortField: string
    sortOrder: 'ascend' | 'descend' | undefined
    selectedCurrencyRef: string | undefined
  }
  accessToken: string | undefined
  employeeId: string | undefined
  isCurrencyReady: boolean
  onProcessComplete?: () => void
}

export function useAdvancePaymentsProcessCompletionRefresh({
  fetchItems,
  fetchParams,
  accessToken,
  employeeId,
  isCurrencyReady,
  onProcessComplete
}: Readonly<UseAdvancePaymentsProcessCompletionRefreshParams>): void {
  useEffect(() => {
    const handleProcessCompletion = (event: Event) => {
      try {
        const custom = event as CustomEvent<{ resolution?: string }>
        if (custom.detail?.resolution !== 'success') {
          return
        }

        if (isCurrencyReady && accessToken && employeeId) {
          fetchItems({
            searchTerm: fetchParams.searchText,
            page: fetchParams.currentPage,
            pageSize: fetchParams.pageSize,
            statusFilter: fetchParams.currentStatusFilter,
            amountRange: fetchParams.currentAmountRange,
            advanceRange: fetchParams.currentAdvanceRange,
            createdAtRange: fetchParams.cardCreatedAtRange,
            sortField: fetchParams.sortField,
            sortOrder: fetchParams.sortOrder,
            currencyRef: fetchParams.selectedCurrencyRef,
            force: true
          })
        }

        onProcessComplete?.()
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
  }, [fetchItems, fetchParams, accessToken, employeeId, isCurrencyReady, onProcessComplete])
}
