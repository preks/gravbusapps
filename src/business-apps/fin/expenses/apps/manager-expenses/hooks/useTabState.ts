import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { SortingState } from '@tanstack/react-table'

/**
 * One-time currency initialization from most-used currency.
 */
export function useCurrencyInit(
  mostUsedCurrency: string | null | undefined,
  setCurrency: (code: string) => void,
  currentCurrency?: string | null
) {
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (hasInitialized.current) return
    if (mostUsedCurrency && !currentCurrency) {
      setCurrency(mostUsedCurrency)
      hasInitialized.current = true
    }
  }, [mostUsedCurrency, currentCurrency, setCurrency])
}

/**
 * Resets page to 1 when filterSignature changes.
 */
export function useFilterSignatureReset(filterSignature: unknown, resetPage: () => void) {
  const prevRef = useRef<string | null>(null)
  useEffect(() => {
    const signature = JSON.stringify(filterSignature)
    if (prevRef.current !== null && prevRef.current !== signature) {
      resetPage()
    }
    prevRef.current = signature
  }, [filterSignature, resetPage])
}

/**
 * Converts internal sorting state to TanStack SortingState.
 */
export function useSortingState(sorting: { field: string | null; order: 'ASC' | 'DESC' | null }): SortingState {
  return useMemo(() => {
    if (!sorting.field || !sorting.order) return []
    return [{ id: sorting.field, desc: sorting.order === 'DESC' }]
  }, [sorting.field, sorting.order])
}

/**
 * Returns a memoized search handler that also resets pagination.
 */
export function useSearchHandler(setSearchTerm: (term: string) => void, setCurrentPage: (page: number) => void) {
  return useCallback(
    (search: string) => {
      setSearchTerm(search)
      setCurrentPage(1)
    },
    [setSearchTerm, setCurrentPage]
  )
}
