import { useEffect, useMemo, useState } from 'react'

export const DEPARTMENTS_PAGE_SIZE = 5

/**
 * Client-side pagination for department/org-unit rows (budget distribution preview list).
 */
export function useDepartmentPagination<T extends { id: string }>(items: readonly T[]) {
  const signature = useMemo(() => items.map(i => i.id).join('\u0001'), [items])
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
  }, [signature])

  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / DEPARTMENTS_PAGE_SIZE))
  const showPagination = total > DEPARTMENTS_PAGE_SIZE

  useEffect(() => {
    const maxIdx = Math.max(0, totalPages - 1)
    if (pageIndex > maxIdx) {
      setPageIndex(maxIdx)
    }
  }, [pageIndex, totalPages])

  const pagedItems = useMemo(() => {
    const start = pageIndex * DEPARTMENTS_PAGE_SIZE
    return items.slice(start, start + DEPARTMENTS_PAGE_SIZE)
  }, [items, pageIndex])

  return {
    pagedItems,
    pageIndex,
    setPageIndex,
    totalPages,
    showPagination,
    total
  }
}
