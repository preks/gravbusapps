import { useState, useMemo, useCallback, useEffect } from 'react'

const DEFAULT_PAGE_SIZE = 20

interface UseHubPaginationOptions<T> {
  /** The full array of filtered items to paginate. */
  items: T[]
  /** Number of items per page. Defaults to 20. */
  pageSize?: number
}

interface UseHubPaginationResult<T> {
  /** Items for the current page only. */
  paginatedItems: T[]
  /** Current 1-based page number. */
  currentPage: number
  /** Total number of pages. */
  totalPages: number
  /** Total number of items (items.length). */
  totalItems: number
  /** Navigate to a specific page (1-based). */
  goToPage: (page: number) => void
  /** Go to the next page. */
  nextPage: () => void
  /** Go to the previous page. */
  prevPage: () => void
  /** The page size in use. */
  pageSize: number
}

/**
 * Client-side pagination hook for hub list/grid views.
 *
 * Slices the provided items array according to the current page and page size.
 * Automatically resets to page 1 when the item count changes (e.g. section or
 * search filter changes).
 */
export function useHubPagination<T>({
  items,
  pageSize = DEFAULT_PAGE_SIZE
}: UseHubPaginationOptions<T>): UseHubPaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Reset to page 1 when the number of items changes (filter / section switch)
  useEffect(() => {
    setCurrentPage(1)
  }, [totalItems])

  // Clamp page if it exceeds totalPages (e.g. items removed)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, currentPage, pageSize])

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages))
      setCurrentPage(clamped)
    },
    [totalPages]
  )

  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }, [])

  return {
    paginatedItems,
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    nextPage,
    prevPage,
    pageSize
  }
}
