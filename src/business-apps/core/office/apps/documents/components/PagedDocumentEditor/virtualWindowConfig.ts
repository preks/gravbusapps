import type { DocumentLayoutPageRange } from '../../types'

export const DOCUMENT_VIRTUAL_WINDOW_PAGE_THRESHOLD = 5
export const DOCUMENT_VIRTUAL_WINDOW_RADIUS = 2
export const DOCUMENT_VIRTUAL_WINDOW_PAGE_COUNT = DOCUMENT_VIRTUAL_WINDOW_RADIUS * 2 + 1

function createPageRange(startPage: number, endPage: number): DocumentLayoutPageRange {
  return {
    startPage: Math.max(1, Math.min(startPage, endPage)),
    endPage: Math.max(1, Math.max(startPage, endPage))
  }
}

export function isDocumentVirtualWindowEnabled(pageCount: number): boolean {
  return pageCount > DOCUMENT_VIRTUAL_WINDOW_PAGE_THRESHOLD
}

export function resolveDocumentVirtualWindowRange(pageCount: number, targetPage: number): DocumentLayoutPageRange {
  if (!isDocumentVirtualWindowEnabled(pageCount)) {
    return createPageRange(1, pageCount)
  }

  const safePageCount = Math.max(1, pageCount)
  const safeTargetPage = Math.min(Math.max(1, targetPage), safePageCount)
  return createPageRange(
    Math.max(1, safeTargetPage - DOCUMENT_VIRTUAL_WINDOW_RADIUS),
    Math.min(safePageCount, safeTargetPage + DOCUMENT_VIRTUAL_WINDOW_RADIUS)
  )
}

export function shouldShiftDocumentVirtualWindow(
  activeRange: DocumentLayoutPageRange | null,
  targetPage: number,
  pageCount: number
): boolean {
  if (!isDocumentVirtualWindowEnabled(pageCount)) {
    return false
  }

  const nextRange = resolveDocumentVirtualWindowRange(pageCount, targetPage)
  if (!activeRange) {
    return true
  }

  return activeRange.startPage !== nextRange.startPage || activeRange.endPage !== nextRange.endPage
}
