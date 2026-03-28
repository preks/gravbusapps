import { useMemo } from 'react'
import type {
  DocumentLayoutAnchorCollection,
  DocumentLayoutPageBodyBounds,
  DocumentLayoutPageChromeMetrics,
  DocumentLayoutPagePositionRange,
  DocumentLayoutPageRange,
  DocumentLayoutPageSpan,
  DocumentLayoutSnapshot,
  DocumentLayoutSource,
  DocumentLayoutTableFragmentSnapshot
} from '../../../types'
import { isDocumentVirtualWindowEnabled } from '../virtualWindowConfig'

export interface DocumentLayoutViewportModel {
  documentVersion: number
  layoutVersion: number
  source: DocumentLayoutSource
  totalPages: number
  activeRange: DocumentLayoutPageRange
  activePageNumbers: number[]
  activePageCount: number
  mountedRange: DocumentLayoutPageRange | null
  mountedPageNumbers: number[]
  mountedPageCount: number
  pageBounds: DocumentLayoutPageBodyBounds[]
  mountedPageBodyBounds: DocumentLayoutPageBodyBounds[]
  activePageBodyBounds: DocumentLayoutPageBodyBounds[]
  pageSpans: DocumentLayoutPageSpan[]
  retainedPageSpans: DocumentLayoutPageSpan[]
  pagePositionRanges?: DocumentLayoutPagePositionRange[]
  activePagePositionRanges?: DocumentLayoutPagePositionRange[]
  pageChromeMetrics: DocumentLayoutPageChromeMetrics[]
  anchors: DocumentLayoutAnchorCollection
  tableFragments: DocumentLayoutTableFragmentSnapshot[]
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
    const windowingEnabled = isDocumentVirtualWindowEnabled(totalPages)
    const activeRange = windowingEnabled
      ? (layoutSnapshot.activeRange ?? createFallbackRange(totalPages))
      : createFallbackRange(totalPages)
    const activePageNumbers = windowingEnabled
      ? layoutSnapshot.activePages.map(page => page.pageNumber)
      : Array.from({ length: totalPages }, (_unused, index) => index + 1)
    const activePageCount = activePageNumbers.length
    const mountedRange = windowingEnabled ? layoutSnapshot.mountedRange : createFallbackRange(totalPages)
    const mountedPageNumbers = windowingEnabled
      ? layoutSnapshot.pages.filter(page => page.isMounted).map(page => page.pageNumber)
      : Array.from({ length: totalPages }, (_unused, index) => index + 1)
    const mountedPageCount = mountedPageNumbers.length
    const pageBounds = layoutSnapshot.pageBounds
    const mountedPageBodyBounds = layoutSnapshot.mountedPageBodyBounds
    const activePageBodyBounds = mountedPageBodyBounds.filter(
      bounds => bounds.pageNumber >= activeRange.startPage && bounds.pageNumber <= activeRange.endPage
    )
    const pageSpans = layoutSnapshot.pageSpans
    const retainedPageSpans = layoutSnapshot.retainedPageSpans
    const pagePositionRanges = layoutSnapshot.pagePositionRanges ?? []
    const activePagePositionRanges = pagePositionRanges.filter(
      range => range.pageNumber >= activeRange.startPage && range.pageNumber <= activeRange.endPage
    )
    const pageChromeMetrics = layoutSnapshot.pageChromeMetrics
    const anchors = layoutSnapshot.anchors
    const tableFragments = layoutSnapshot.tableFragments
    const hasSparseFlow = layoutSnapshot.flow.some(flowEntry => !flowEntry.isMounted)
    const isWindowed = activeRange.startPage > 1 || activeRange.endPage < totalPages
    const containsCurrentPage = currentPage >= activeRange.startPage && currentPage <= activeRange.endPage
    const mountedRangeLabel = mountedRange ? `${mountedRange.startPage}-${mountedRange.endPage}` : 'none'
    const flowModeLabel = hasSparseFlow ? 'sparse' : 'full'

    return {
      documentVersion: layoutSnapshot.documentVersion,
      layoutVersion: layoutSnapshot.layoutVersion,
      source: layoutSnapshot.source,
      totalPages,
      activeRange,
      activePageNumbers,
      activePageCount,
      mountedRange,
      mountedPageNumbers,
      mountedPageCount,
      pageBounds,
      mountedPageBodyBounds,
      activePageBodyBounds,
      pageSpans,
      retainedPageSpans,
      pagePositionRanges,
      activePagePositionRanges,
      pageChromeMetrics,
      anchors,
      tableFragments,
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
    layoutSnapshot.anchors,
    layoutSnapshot.documentVersion,
    layoutSnapshot.layoutVersion,
    layoutSnapshot.mountedRange,
    layoutSnapshot.mountedPageBodyBounds,
    layoutSnapshot.pageBounds,
    layoutSnapshot.pageChromeMetrics,
    layoutSnapshot.pagePositionRanges,
    layoutSnapshot.pageSpans,
    layoutSnapshot.pageCount,
    layoutSnapshot.pages,
    layoutSnapshot.retainedPageSpans,
    layoutSnapshot.source,
    layoutSnapshot.tableFragments
  ])
}
