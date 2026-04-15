import { useEffect, useRef } from 'react'

export interface UseExpensePlansTabPaginationEffectsParams {
  selectedFilters: string[]
  debouncedSearch: string
  invalidateCache: () => void
  overviewTotalCount: number | undefined
  currentPage: number
  pageSize: number
  setCurrentPage: (page: number | ((prev: number) => number)) => void
}

export function useExpensePlansTabPaginationEffects({
  selectedFilters,
  debouncedSearch,
  invalidateCache,
  overviewTotalCount,
  currentPage,
  pageSize,
  setCurrentPage
}: UseExpensePlansTabPaginationEffectsParams): void {
  const prevSelectedFiltersRef = useRef<string | null>(null)
  const prevSearchRef = useRef<string>('')
  const prevTotalCountRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const currentFiltersKey = JSON.stringify(selectedFilters)
    const previousFiltersKey = prevSelectedFiltersRef.current

    if (previousFiltersKey !== null && previousFiltersKey !== currentFiltersKey) {
      setCurrentPage(1)
    }

    prevSelectedFiltersRef.current = currentFiltersKey
  }, [selectedFilters, setCurrentPage])

  useEffect(() => {
    const prevSearch = (prevSearchRef.current || '').trim()
    const currentSearch = (debouncedSearch || '').trim()

    if (prevSearch !== '' && currentSearch === '') {
      invalidateCache()
    }

    prevSearchRef.current = debouncedSearch || ''
  }, [debouncedSearch, invalidateCache])

  useEffect(() => {
    const totalCount = overviewTotalCount
    if (totalCount !== undefined && totalCount !== prevTotalCountRef.current && currentPage > 1) {
      const maxPages = Math.max(1, Math.ceil(totalCount / pageSize))
      if (currentPage > maxPages) {
        setCurrentPage(1)
      }
      prevTotalCountRef.current = totalCount
    } else if (totalCount !== undefined) {
      prevTotalCountRef.current = totalCount
    }
  }, [overviewTotalCount, currentPage, pageSize, setCurrentPage])
}
