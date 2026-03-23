import { useMemo } from 'react'
import type { DocumentLayoutPageRange, DocumentLayoutSnapshot, DocumentLayoutSource } from '../../../types'

export interface DocumentLayoutViewportModel {
  source: DocumentLayoutSource
  totalPages: number
  activeRange: DocumentLayoutPageRange
  activePageNumbers: number[]
  activePageCount: number
  isWindowed: boolean
  containsCurrentPage: boolean
  rangeLabel: string
  windowKey: string
}

function createFallbackRange(totalPages: number): DocumentLayoutPageRange {
  return {
    startPage: 1,
    endPage: Math.max(1, totalPages)
  }
}

export function useDocumentLayoutViewportModel(
  layoutSnapshot: DocumentLayoutSnapshot,
  currentPage: number
): DocumentLayoutViewportModel {
  return useMemo(() => {
    const totalPages = Math.max(1, layoutSnapshot.pageCount)
    const activeRange = layoutSnapshot.activeRange ?? createFallbackRange(totalPages)
    const activePageNumbers = layoutSnapshot.activePages.map(page => page.pageNumber)
    const activePageCount = activePageNumbers.length
    const isWindowed = activeRange.startPage > 1 || activeRange.endPage < totalPages
    const containsCurrentPage = currentPage >= activeRange.startPage && currentPage <= activeRange.endPage

    return {
      source: layoutSnapshot.source,
      totalPages,
      activeRange,
      activePageNumbers,
      activePageCount,
      isWindowed,
      containsCurrentPage,
      rangeLabel: `${activeRange.startPage}-${activeRange.endPage}`,
      windowKey: `${layoutSnapshot.source}:${activeRange.startPage}-${activeRange.endPage}:${activePageCount}`
    }
  }, [
    currentPage,
    layoutSnapshot.activePages,
    layoutSnapshot.activeRange,
    layoutSnapshot.pageCount,
    layoutSnapshot.source
  ])
}
