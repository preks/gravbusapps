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
import { isDocumentVirtualWindowEnabled, resolveDocumentVirtualWindowRange } from '../virtualWindowConfig'

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

const EMPTY_PAGE_POSITION_RANGES: DocumentLayoutPagePositionRange[] = []

function createFallbackRange(totalPages: number): DocumentLayoutPageRange {
  return {
    startPage: 1,
    endPage: Math.max(1, totalPages)
  }
}

function arePageRangesEqual(left: DocumentLayoutPageRange | null, right: DocumentLayoutPageRange | null): boolean {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  return left.startPage === right.startPage && left.endPage === right.endPage
}

function doesPageRangeCoverRange(
  containerRange: DocumentLayoutPageRange | null,
  requestedRange: DocumentLayoutPageRange | null
): boolean {
  if (!requestedRange) {
    return containerRange === null
  }

  if (!containerRange) {
    return false
  }

  return requestedRange.startPage >= containerRange.startPage && requestedRange.endPage <= containerRange.endPage
}

function isFullDocumentRange(range: DocumentLayoutPageRange | null, totalPages: number): boolean {
  return Boolean(range && range.startPage <= 1 && range.endPage >= totalPages)
}

function filterPageNumberEntriesForActiveRange<T extends { pageNumber: number }>(
  entries: T[],
  activeRange: DocumentLayoutPageRange
): T[] {
  if (entries.length === 0) {
    return entries
  }

  const firstPageNumber = entries[0]?.pageNumber ?? 1
  const lastPageNumber = entries[entries.length - 1]?.pageNumber ?? firstPageNumber
  if (firstPageNumber >= activeRange.startPage && lastPageNumber <= activeRange.endPage) {
    return entries
  }

  return entries.filter(entry => entry.pageNumber >= activeRange.startPage && entry.pageNumber <= activeRange.endPage)
}

function filterPageSnapshotsForActiveRange(
  pages: DocumentLayoutSnapshot['pages'],
  activeRange: DocumentLayoutPageRange
): DocumentLayoutSnapshot['activePages'] {
  return pages.filter(page => page.pageNumber >= activeRange.startPage && page.pageNumber <= activeRange.endPage)
}

export function useDocumentLayoutViewportModel(
  layoutSnapshot: DocumentLayoutSnapshot,
  currentPage: number
): DocumentLayoutViewportModel {
  return useMemo(() => {
    const totalPages = Math.max(1, layoutSnapshot.pageCount)
    const windowingEnabled = isDocumentVirtualWindowEnabled(totalPages)
    const hasSparseFlow = layoutSnapshot.flow.some(flowEntry => !flowEntry.isMounted)
    const fallbackRange = createFallbackRange(totalPages)
    const snapshotActiveRange = layoutSnapshot.activeRange
    const shouldRecoverWindowedActiveRange =
      windowingEnabled &&
      hasSparseFlow &&
      (!snapshotActiveRange ||
        isFullDocumentRange(snapshotActiveRange, totalPages) ||
        !doesPageRangeCoverRange(layoutSnapshot.mountedRange, snapshotActiveRange))
    const activeRange = windowingEnabled
      ? shouldRecoverWindowedActiveRange
        ? resolveDocumentVirtualWindowRange(totalPages, currentPage)
        : (snapshotActiveRange ?? fallbackRange)
      : fallbackRange
    const activePages =
      windowingEnabled && arePageRangesEqual(snapshotActiveRange, activeRange)
        ? layoutSnapshot.activePages
        : filterPageSnapshotsForActiveRange(layoutSnapshot.pages, activeRange)
    const activePageNumbers = windowingEnabled
      ? activePages.map(page => page.pageNumber)
      : Array.from({ length: totalPages }, (_unused, index) => index + 1)
    const activePageCount = activePageNumbers.length
    const mountedRange = windowingEnabled ? layoutSnapshot.mountedRange : fallbackRange
    const mountedPageNumbers = windowingEnabled
      ? layoutSnapshot.pages.filter(page => page.isMounted).map(page => page.pageNumber)
      : Array.from({ length: totalPages }, (_unused, index) => index + 1)
    const mountedPageCount = mountedPageNumbers.length
    const pageBounds = layoutSnapshot.pageBounds
    const mountedPageBodyBounds = layoutSnapshot.mountedPageBodyBounds
    const activePageBodyBounds = filterPageNumberEntriesForActiveRange(mountedPageBodyBounds, activeRange)
    const pageSpans = layoutSnapshot.pageSpans
    const retainedPageSpans = layoutSnapshot.retainedPageSpans
    const pagePositionRanges = layoutSnapshot.pagePositionRanges ?? EMPTY_PAGE_POSITION_RANGES
    const activePagePositionRanges = filterPageNumberEntriesForActiveRange(pagePositionRanges, activeRange)
    const pageChromeMetrics = layoutSnapshot.pageChromeMetrics
    const anchors = layoutSnapshot.anchors
    const tableFragments = layoutSnapshot.tableFragments
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
