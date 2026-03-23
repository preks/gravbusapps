import { useEffect, useRef, type MutableRefObject } from 'react'
import type { DocumentLayoutPageRange } from '../../../types'
import type { DocumentLayoutNavigationState } from '../documentLayoutService'
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
  const directPageNumber = element.getAttribute('data-rm-page-number')
  if (directPageNumber) {
    const parsed = Number(directPageNumber)
    return Number.isFinite(parsed) ? parsed : null
  }

  if (element.classList.contains('rm-page-break')) {
    const pageElement = element.querySelector('.page[data-rm-page-number]')
    const nestedPageNumber = pageElement?.getAttribute('data-rm-page-number')
    if (!nestedPageNumber) return null
    const parsed = Number(nestedPageNumber)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
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

  targets.forEach(target => {
    target.setAttribute('data-layout-window-active', isActive ? 'true' : 'false')
    target.setAttribute('data-layout-window-position', position)
    target.setAttribute('data-layout-window-key', viewportModel.windowKey)
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
          : Array.from(container.querySelectorAll('.rm-page-break')).filter(
              (element): element is HTMLElement => element instanceof HTMLElement
            )
      const pageBreakElsChanged = indexedPageBreakElsRef.current !== pageBreakEls

      if (pageBreakElsChanged) {
        const firstPageHeader = container.querySelector('.rm-first-page-header[data-rm-page-number="1"]')
        markerTargetsRef.current = collectViewportMarkerTargets(
          pageBreakEls,
          firstPageHeader instanceof HTMLElement ? firstPageHeader : null
        )
        indexedPageBreakElsRef.current = pageBreakEls
      }

      const shouldRefreshAllPages =
        pageBreakElsChanged ||
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
    viewportModel.activeRange,
    viewportModel.windowKey
  ])
}
