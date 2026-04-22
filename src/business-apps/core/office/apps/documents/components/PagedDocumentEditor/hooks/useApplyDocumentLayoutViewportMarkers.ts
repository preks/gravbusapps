import { useEffect, useRef, type MutableRefObject } from 'react'
import type { DocumentLayoutPageRange } from '../../../types'
import {
  resolveFirstPageHeaderElement,
  resolvePageBreakElements,
  type DocumentLayoutNavigationState
} from '../documentLayoutService'
import type { DocumentLayoutViewportModel } from './useDocumentLayoutViewportModel'

interface UseApplyDocumentLayoutViewportMarkersParams {
  editorContainerRef: MutableRefObject<HTMLDivElement | null>
  layoutNavigationState: DocumentLayoutNavigationState
  viewportModel: DocumentLayoutViewportModel
}

function resolveWindowPosition(
  pageNumber: number,
  activeRange: DocumentLayoutPageRange
): 'before' | 'inside' | 'after' {
  if (pageNumber < activeRange.startPage) return 'before'
  if (pageNumber > activeRange.endPage) return 'after'
  return 'inside'
}

function resolvePageNumberForElement(element: Element): number | null {
  const directPageNumber = element instanceof HTMLElement ? element.dataset.rmPageNumber : null
  if (directPageNumber) {
    const parsed = Number(directPageNumber)
    return Number.isFinite(parsed) ? parsed : null
  }

  if (element.classList.contains('rm-page-break')) {
    const pageElement = element.querySelector('.page[data-rm-page-number]')
    const nestedPageNumber = pageElement instanceof HTMLElement ? pageElement.dataset.rmPageNumber : null
    if (!nestedPageNumber) return null
    const parsed = Number(nestedPageNumber)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function resolvePageBodyBounds(pageNumber: number, viewportModel: DocumentLayoutViewportModel) {
  const pageBounds = viewportModel.pageBounds ?? viewportModel.mountedPageBodyBounds ?? []
  return pageBounds.find(bounds => bounds.pageNumber === pageNumber) ?? null
}

function createMarkerTargetList(pageBreakEl: HTMLElement): HTMLElement[] {
  const targets = new Set<HTMLElement>()
  targets.add(pageBreakEl)

  const nestedTargets = pageBreakEl.querySelectorAll(
    '.page[data-rm-page-number], .rm-page-body-layer[data-rm-page-number], .rm-page-header-region[data-rm-page-number], .rm-page-footer-region[data-rm-page-number], .rm-first-page-header[data-rm-page-number]'
  )
  nestedTargets.forEach(target => {
    if (target instanceof HTMLElement) {
      targets.add(target)
    }
  })

  return Array.from(targets)
}

function resolvePageBreakMarkerStructureKey(pageBreakEls: HTMLElement[]) {
  return pageBreakEls
    .map(pageBreakEl => {
      const pageNumber = resolvePageNumberForElement(pageBreakEl) ?? 0
      const breaker = pageBreakEl.querySelector('.breaker') as HTMLElement | null
      const markerRegionCount = pageBreakEl.querySelectorAll(
        '.rm-page-header-region[data-rm-page-number], .rm-page-footer-region[data-rm-page-number]'
      ).length
      return `${pageNumber}:${breaker?.dataset.rmBreakerMode ?? 'full'}:${markerRegionCount}`
    })
    .join('|')
}

export function collectViewportMarkerTargets(
  pageBreakEls: HTMLElement[],
  firstPageHeader: HTMLElement | null = null
): Map<number, HTMLElement[]> {
  const markerTargets = new Map<number, HTMLElement[]>()

  pageBreakEls.forEach(pageBreakEl => {
    const pageNumber = resolvePageNumberForElement(pageBreakEl)
    if (pageNumber === null) return
    markerTargets.set(pageNumber, createMarkerTargetList(pageBreakEl))
  })

  if (firstPageHeader) {
    const existingTargets = markerTargets.get(1) ?? []
    markerTargets.set(
      1,
      existingTargets.includes(firstPageHeader) ? existingTargets : [...existingTargets, firstPageHeader]
    )
  }

  return markerTargets
}

export function resolveViewportMarkerRefreshRange(
  previousActiveRange: DocumentLayoutPageRange | null,
  nextActiveRange: DocumentLayoutPageRange
): DocumentLayoutPageRange | null {
  if (!previousActiveRange) return null
  if (
    previousActiveRange.startPage === nextActiveRange.startPage &&
    previousActiveRange.endPage === nextActiveRange.endPage
  ) {
    return null
  }

  return {
    startPage: Math.min(previousActiveRange.startPage, nextActiveRange.startPage),
    endPage: Math.max(previousActiveRange.endPage, nextActiveRange.endPage)
  }
}

export function applyViewportMarkerAttributes(
  targets: HTMLElement[],
  pageNumber: number,
  viewportModel: DocumentLayoutViewportModel
) {
  const isActive = viewportModel.activePageNumbers.includes(pageNumber)
  const position = resolveWindowPosition(pageNumber, viewportModel.activeRange)
  const bodyBounds = resolvePageBodyBounds(pageNumber, viewportModel)

  targets.forEach(target => {
    target.dataset.layoutWindowActive = isActive ? 'true' : 'false'
    target.dataset.layoutWindowPosition = position
    target.dataset.layoutWindowKey = viewportModel.windowKey
    if (bodyBounds) {
      target.dataset.layoutBodyTop = String(bodyBounds.top)
      target.dataset.layoutBodyBottom = String(bodyBounds.bottom)
      target.dataset.layoutBodyLeft = String(bodyBounds.left)
      target.dataset.layoutBodyRight = String(bodyBounds.right)
      return
    }

    delete target.dataset.layoutBodyTop
    delete target.dataset.layoutBodyBottom
    delete target.dataset.layoutBodyLeft
    delete target.dataset.layoutBodyRight
  })
}

export function useApplyDocumentLayoutViewportMarkers({
  editorContainerRef,
  layoutNavigationState,
  viewportModel
}: UseApplyDocumentLayoutViewportMarkersParams): void {
  const rafRef = useRef<number | null>(null)
  const markerTargetsRef = useRef<Map<number, HTMLElement[]>>(new Map())
  const indexedPageBreakElsRef = useRef<HTMLElement[] | null>(null)
  const indexedPageBreakStructureKeyRef = useRef<string>('')
  const indexedFirstPageHeaderRef = useRef<HTMLElement | null>(null)
  const previousActiveRangeRef = useRef<DocumentLayoutPageRange | null>(null)
  const previousWindowKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const container = editorContainerRef.current
    if (!container) return

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const pageBreakEls =
        layoutNavigationState.pageBreakEls.length > 0
          ? layoutNavigationState.pageBreakEls
          : resolvePageBreakElements(container)
      const pageBreakElsChanged = indexedPageBreakElsRef.current !== pageBreakEls
      const pageBreakStructureKey = resolvePageBreakMarkerStructureKey(pageBreakEls)
      const pageBreakStructureChanged = indexedPageBreakStructureKeyRef.current !== pageBreakStructureKey
      const firstPageHeader = resolveFirstPageHeaderElement(container)
      const markerTargetsChanged =
        pageBreakElsChanged || pageBreakStructureChanged || indexedFirstPageHeaderRef.current !== firstPageHeader

      if (markerTargetsChanged) {
        markerTargetsRef.current = collectViewportMarkerTargets(
          pageBreakEls,
          firstPageHeader instanceof HTMLElement ? firstPageHeader : null
        )
        indexedPageBreakElsRef.current = pageBreakEls
        indexedPageBreakStructureKeyRef.current = pageBreakStructureKey
        indexedFirstPageHeaderRef.current = firstPageHeader instanceof HTMLElement ? firstPageHeader : null
      }

      const shouldRefreshAllPages =
        markerTargetsChanged ||
        previousActiveRangeRef.current === null ||
        previousWindowKeyRef.current !== viewportModel.windowKey
      const refreshRange = shouldRefreshAllPages
        ? null
        : resolveViewportMarkerRefreshRange(previousActiveRangeRef.current, viewportModel.activeRange)
      const pageNumbersToRefresh = new Set<number>()

      if (shouldRefreshAllPages || !refreshRange) {
        markerTargetsRef.current.forEach((_, pageNumber) => {
          pageNumbersToRefresh.add(pageNumber)
        })
      } else {
        for (let pageNumber = refreshRange.startPage; pageNumber <= refreshRange.endPage; pageNumber += 1) {
          pageNumbersToRefresh.add(pageNumber)
        }
      }

      pageNumbersToRefresh.forEach(pageNumber => {
        const targets = markerTargetsRef.current.get(pageNumber)
        if (!targets) return
        applyViewportMarkerAttributes(targets, pageNumber, viewportModel)
      })

      previousActiveRangeRef.current = viewportModel.activeRange
      previousWindowKeyRef.current = viewportModel.windowKey
    })

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [
    editorContainerRef,
    layoutNavigationState.pageBreakEls,
    viewportModel.activePageNumbers,
    viewportModel.pageBounds,
    viewportModel.mountedPageBodyBounds,
    viewportModel.activeRange,
    viewportModel.hasSparseFlow,
    viewportModel.isWindowed,
    viewportModel.mountedRange,
    viewportModel.windowKey
  ])
}
