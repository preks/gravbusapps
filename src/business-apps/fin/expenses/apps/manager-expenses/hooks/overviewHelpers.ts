import { useMemo, useRef } from 'react'
import { standardizeCurrencyRef } from '../utils/currencyUtils'

/**
 * Shared currency ref memos used by all overview data hooks.
 */
export function useCurrencyRefs(primaryCurrency: string | null, mostUsedCurrency: string | null) {
  const currencyRef = useMemo(
    () => (primaryCurrency ? standardizeCurrencyRef(primaryCurrency) : undefined),
    [primaryCurrency]
  )

  const effectiveStatsCurrency = primaryCurrency ?? mostUsedCurrency ?? null
  const statsCurrencyRef = useMemo(
    () => (effectiveStatsCurrency ? standardizeCurrencyRef(effectiveStatsCurrency) : undefined),
    [effectiveStatsCurrency]
  )

  return { currencyRef, statsCurrencyRef }
}

/**
 * Shared pagination params memo.
 */
export function usePaginationParams(pageSize: number, currentPage: number, orderBy: unknown[]) {
  return useMemo(
    () => ({ limit: pageSize, offset: (currentPage - 1) * pageSize, orderBy }),
    [pageSize, currentPage, orderBy]
  )
}

/**
 * Generic stats memo with lastValidRef pattern used by all overview hooks.
 * `extractor` reads stats from overview data; returns null when data is absent.
 */
export function useStatsFromOverview<TStats, TData>(
  data: TData | undefined,
  extractor: (d: TData) => TStats,
  deps: React.DependencyList
): TStats | null {
  const lastValidRef = useRef<TStats | null>(null)

  return useMemo((): TStats | null => {
    if (!data) return lastValidRef.current
    const newStats = extractor(data)
    lastValidRef.current = newStats
    return newStats
  }, deps)
}

/**
 * Extracts loading and error state from an overview result.
 */
export function extractLoadingError(overview: { isLoading: boolean; data: unknown; error?: string | null }) {
  const loading = overview.isLoading && !overview.data
  const error = overview.error ? new Error(overview.error) : null
  return { loading, error }
}
