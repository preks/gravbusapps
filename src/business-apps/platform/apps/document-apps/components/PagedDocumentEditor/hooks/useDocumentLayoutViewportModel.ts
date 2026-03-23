import { useMemo } from 'react'
import type {
  DocumentLayoutPageBodyBounds,
  DocumentLayoutPagePositionRange,
  DocumentLayoutPageRange,
  DocumentLayoutSnapshot,
  DocumentLayoutSource
} from '../../../types'

export interface DocumentLayoutViewportModel {
  source: DocumentLayoutSource
  totalPages: number
  activeRange: DocumentLayoutPageRange
  activePageNumbers: number[]
  activePageCount: number
  mountedRange: DocumentLayoutPageRange | null
  mountedPageNumbers: number[]
  mountedPageCount: number
  mountedPageBodyBounds: DocumentLayoutPageBodyBounds[]
  activePageBodyBounds: DocumentLayoutPageBodyBounds[]
  pagePositionRanges?: DocumentLayoutPagePositionRange[]
  activePagePositionRanges?: DocumentLayoutPagePositionRange[]
  hasSparseFlow: boolean
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
    const mountedRange = layoutSnapshot.mountedRange
    const mountedPageNumbers = layoutSnapshot.pages.filter(page => page.isMounted).map(page => page.pageNumber)
    const mountedPageCount = mountedPageNumbers.length
    const mountedPageBodyBounds = layoutSnapshot.mountedPageBodyBounds
    const activePageBodyBounds = mountedPageBodyBounds.filter(
      bounds => bounds.pageNumber >= activeRange.startPage && bounds.pageNumber <= activeRange.endPage
    )
    const pagePositionRanges = layoutSnapshot.pagePositionRanges ?? []
    const activePagePositionRanges = pagePositionRanges.filter(
      range => range.pageNumber >= activeRange.startPage && range.pageNumber <= activeRange.endPage
    )
    const hasSparseFlow = layoutSnapshot.flow.some(flowEntry => !flowEntry.isMounted)
    const isWindowed = activeRange.startPage > 1 || activeRange.endPage < totalPages
    const containsCurrentPage = currentPage >= activeRange.startPage && currentPage <= activeRange.endPage
    const mountedRangeLabel = mountedRange ? `${mountedRange.startPage}-${mountedRange.endPage}` : 'none'
    const flowModeLabel = hasSparseFlow ? 'sparse' : 'full'

    return {
      source: layoutSnapshot.source,
      totalPages,
      activeRange,
      activePageNumbers,
      activePageCount,
      mountedRange,
      mountedPageNumbers,
      mountedPageCount,
      mountedPageBodyBounds,
      activePageBodyBounds,
      pagePositionRanges,
      activePagePositionRanges,
      hasSparseFlow,
      isWindowed,
      containsCurrentPage,
      rangeLabel: `${activeRange.startPage}-${activeRange.endPage}`,
      windowKey: `${layoutSnapshot.source}:${activeRange.startPage}-${activeRange.endPage}:${activePageCount}:${mountedRangeLabel}:${flowModeLabel}`
    }
  }, [
    currentPage,
    layoutSnapshot.activePages,
    layoutSnapshot.flow,
    layoutSnapshot.activeRange,
    layoutSnapshot.mountedRange,
    layoutSnapshot.mountedPageBodyBounds,
    layoutSnapshot.pagePositionRanges,
    layoutSnapshot.pageCount,
    layoutSnapshot.pages,
    layoutSnapshot.source
  ])
}
