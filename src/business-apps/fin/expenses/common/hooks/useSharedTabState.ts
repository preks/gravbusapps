import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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

export function useSortingState(sorting: { field: string | null; order: 'ASC' | 'DESC' | null }): SortingState {
  return useMemo(() => {
    if (!sorting.field || !sorting.order) return []
    return [{ id: sorting.field, desc: sorting.order === 'DESC' }]
  }, [sorting.field, sorting.order])
}

export function useSearchHandler(setSearchTerm: (term: string) => void, setCurrentPage: (page: number) => void) {
  return useCallback(
    (search: string) => {
      setSearchTerm(search)
      setCurrentPage(1)
    },
    [setSearchTerm, setCurrentPage]
  )
}

export function useCurrencyChangeHandler(
  setCurrency: (code: string | null) => void,
  setCurrentPage: (page: number) => void
) {
  return useCallback(
    (code: string | null) => {
      setCurrency(code)
      setCurrentPage(1)
    },
    [setCurrency, setCurrentPage]
  )
}

export function useVisibleColumns(visibleColumns: string[], availableColumns: Array<{ id: string }>) {
  return useMemo(() => {
    if (visibleColumns.length > 0) return visibleColumns
    return availableColumns.map(c => c.id)
  }, [visibleColumns, availableColumns])
}

export function useEmptyMessage(hasActiveFilters: boolean, noDataI18nKey: string, noDataFallback: string) {
  return useMemo(
    () =>
      hasActiveFilters
        ? getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
            'No data available'
          )
        : getTranslationFromI18nKeyAndLabel(noDataI18nKey, noDataFallback),
    [hasActiveFilters, noDataI18nKey, noDataFallback]
  )
}
