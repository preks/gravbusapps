import { useEffect, useRef, type MutableRefObject } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { DocumentLayoutPageRange } from '../../../types'
import { resolvePageBreakElements, type DocumentLayoutNavigationState } from '../documentLayoutService'
import type { DocumentLayoutViewportModel } from './useDocumentLayoutViewportModel'
import { resolveViewportMarkerRefreshRange } from './useApplyDocumentLayoutViewportMarkers'

interface UseApplyDocumentLayoutWindowedBreakersParams {
  editor: TiptapEditor | null
  editorContainerRef: MutableRefObject<HTMLDivElement | null>
  layoutNavigationState: DocumentLayoutNavigationState
  viewportModel: DocumentLayoutViewportModel
}

interface ParkedBreakerState {
  previousHeight: string | null
  childNodes: Node[]
}

function resolvePageNumberForPageBreak(pageBreakEl: HTMLElement): number | null {
  const page = pageBreakEl.querySelector('.page[data-rm-page-number]')
  const pageNumber = Number(page?.getAttribute('data-rm-page-number'))
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null
}

export function collectPageBreakers(pageBreakEls: HTMLElement[]): Map<number, HTMLElement> {
  const pageBreakers = new Map<number, HTMLElement>()

  pageBreakEls.forEach(pageBreakEl => {
    const pageNumber = resolvePageNumberForPageBreak(pageBreakEl)
    if (pageNumber === null) return
    pageBreakers.set(pageNumber, pageBreakEl)
  })

  return pageBreakers
}

export function shouldMountPageBreaker(pageNumber: number, activePages: Set<number>) {
  return activePages.has(pageNumber) || activePages.has(pageNumber + 1)
}

export function isPlaceholderPageBreaker(pageBreakEl: HTMLElement) {
  const breaker = pageBreakEl.querySelector('.breaker') as HTMLElement | null
  return breaker?.dataset.rmBreakerMode === 'placeholder'
}

function shouldVirtualizeWindowedBreakers(pageBreakEls: HTMLElement[], totalPages: number) {
  return pageBreakEls.length < Math.max(1, totalPages)
}

function resolveMountedRange(activeRange: DocumentLayoutPageRange) {
  return {
    startPage: Math.max(1, activeRange.startPage - 1),
    endPage: activeRange.endPage
  }
}

export function parkPageBreaker(pageBreakEl: HTMLElement, parkedBreakers: WeakMap<HTMLElement, ParkedBreakerState>) {
  const breaker = pageBreakEl.querySelector('.breaker') as HTMLElement | null
  if (!(breaker instanceof HTMLElement)) return
  if (breaker.querySelector('[data-rm-overlay-active="true"]')) return
  if (parkedBreakers.has(breaker)) return

  const childNodes = Array.from(breaker.childNodes)
  const previousHeight = breaker.style.height || null
  const measuredHeight = breaker.offsetHeight
  const pageNumber = resolvePageNumberForPageBreak(pageBreakEl)
  const footerRegion =
    pageNumber === null
      ? null
      : (breaker.querySelector(
          `[data-rm-editor-type="footer"][data-rm-page-number="${pageNumber}"]`
        ) as HTMLElement | null)
  const nextHeaderRegion =
    pageNumber === null
      ? null
      : (breaker.querySelector(
          `[data-rm-editor-type="header"][data-rm-page-number="${pageNumber + 1}"]`
        ) as HTMLElement | null)
  const footerHeight = footerRegion?.offsetHeight ?? 0
  const nextHeaderHeight = nextHeaderRegion?.offsetHeight ?? 0

  parkedBreakers.set(breaker, {
    previousHeight,
    childNodes
  })

  if (measuredHeight > 0) {
    breaker.style.height = `${measuredHeight}px`
  }

  breaker.replaceChildren()
  breaker.dataset.rmBreakerPlaceholderHeight = String(Math.max(0, measuredHeight))
  breaker.dataset.rmBreakerFooterHeight = String(Math.max(0, footerHeight))
  breaker.dataset.rmBreakerNextHeaderHeight = String(Math.max(0, nextHeaderHeight))
  breaker.dataset.layoutBreakerMounted = 'false'
}

export function restorePageBreaker(pageBreakEl: HTMLElement, parkedBreakers: WeakMap<HTMLElement, ParkedBreakerState>) {
  const breaker = pageBreakEl.querySelector('.breaker') as HTMLElement | null
  if (!(breaker instanceof HTMLElement)) return

  const parkedState = parkedBreakers.get(breaker)
  if (!parkedState) return

  if (breaker.childNodes.length === 0 && parkedState.childNodes.length > 0) {
    breaker.append(...parkedState.childNodes)
  }

  if (parkedState.previousHeight === null) {
    breaker.style.removeProperty('height')
  } else {
    breaker.style.height = parkedState.previousHeight
  }

  delete breaker.dataset.layoutBreakerMounted
  delete breaker.dataset.rmBreakerPlaceholderHeight
  delete breaker.dataset.rmBreakerFooterHeight
  delete breaker.dataset.rmBreakerNextHeaderHeight
  parkedBreakers.delete(breaker)
}

function resolvePagesToRefresh(
  previousActiveRange: DocumentLayoutPageRange | null,
  nextActiveRange: DocumentLayoutPageRange,
  refreshAll: boolean,
  pageBreakers: Map<number, HTMLElement>
) {
  const pageNumbersToRefresh = new Set<number>()

  if (refreshAll) {
    pageBreakers.forEach((_, pageNumber) => {
      pageNumbersToRefresh.add(pageNumber)
    })
    return pageNumbersToRefresh
  }

  const refreshRange = resolveViewportMarkerRefreshRange(previousActiveRange, nextActiveRange)
  if (!refreshRange) return pageNumbersToRefresh

  for (let pageNumber = Math.max(1, refreshRange.startPage - 1); pageNumber <= refreshRange.endPage; pageNumber += 1) {
    pageNumbersToRefresh.add(pageNumber)
  }

  return pageNumbersToRefresh
}

export function useApplyDocumentLayoutWindowedBreakers({
  editor,
  editorContainerRef,
  layoutNavigationState,
  viewportModel
}: UseApplyDocumentLayoutWindowedBreakersParams): void {
  const rafRef = useRef<number | null>(null)
  const pageBreakersRef = useRef<Map<number, HTMLElement>>(new Map())
  const indexedPageBreakElsRef = useRef<HTMLElement[] | null>(null)
  const parkedBreakersRef = useRef<WeakMap<HTMLElement, ParkedBreakerState>>(new WeakMap())
  const hasParkedBreakersRef = useRef(false)
  const previousActiveRangeRef = useRef<DocumentLayoutPageRange | null>(null)
  const previousMountedRangeRef = useRef<DocumentLayoutPageRange | null>(null)
  const previousWindowKeyRef = useRef<string | null>(null)
  const hydrationRequestWindowKeyRef = useRef<string | null>(null)
  const mountedRangeRequestKeyRef = useRef<string | null>(null)

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

      if (pageBreakElsChanged) {
        pageBreakersRef.current = collectPageBreakers(pageBreakEls)
        indexedPageBreakElsRef.current = pageBreakEls
        hydrationRequestWindowKeyRef.current = null
      }

      const shouldVirtualizeBreakers =
        viewportModel.isWindowed &&
        (viewportModel.hasSparseFlow || shouldVirtualizeWindowedBreakers(pageBreakEls, viewportModel.totalPages))

      if (!shouldVirtualizeBreakers) {
        if (hasParkedBreakersRef.current) {
          pageBreakersRef.current.forEach(pageBreakEl => {
            restorePageBreaker(pageBreakEl, parkedBreakersRef.current)
          })
          hasParkedBreakersRef.current = false
        }
        hydrationRequestWindowKeyRef.current = null
        mountedRangeRequestKeyRef.current = null
        previousActiveRangeRef.current = viewportModel.activeRange
        previousMountedRangeRef.current = viewportModel.mountedRange
        previousWindowKeyRef.current = viewportModel.windowKey
        return
      }

      const desiredMountedRange = resolveMountedRange(viewportModel.activeRange)
      const desiredMountedRangeKey = `${desiredMountedRange.startPage}-${desiredMountedRange.endPage}`
      const mountedRangeChanged =
        viewportModel.mountedRange?.startPage !== desiredMountedRange.startPage ||
        viewportModel.mountedRange?.endPage !== desiredMountedRange.endPage
      if (mountedRangeChanged) {
        hydrationRequestWindowKeyRef.current = null
        if (mountedRangeRequestKeyRef.current !== desiredMountedRangeKey) {
          mountedRangeRequestKeyRef.current = desiredMountedRangeKey
          ;(editor?.commands as { refreshPages?: () => boolean } | undefined)?.refreshPages?.()
        }
        previousMountedRangeRef.current = viewportModel.mountedRange
        previousWindowKeyRef.current = viewportModel.windowKey
        return
      }

      if (mountedRangeRequestKeyRef.current === desiredMountedRangeKey) {
        mountedRangeRequestKeyRef.current = null
      }

      const mountedRangeStateChanged =
        previousMountedRangeRef.current?.startPage !== viewportModel.mountedRange?.startPage ||
        previousMountedRangeRef.current?.endPage !== viewportModel.mountedRange?.endPage
      const refreshAll =
        pageBreakElsChanged ||
        mountedRangeStateChanged ||
        previousActiveRangeRef.current === null ||
        previousWindowKeyRef.current !== viewportModel.windowKey
      const pageNumbersToRefresh = resolvePagesToRefresh(
        previousActiveRangeRef.current,
        viewportModel.activeRange,
        refreshAll,
        pageBreakersRef.current
      )
      const activePages = new Set(viewportModel.activePageNumbers)
      let needsHydrationRefresh = false
      let parkedAnyBreakers = false

      pageNumbersToRefresh.forEach(pageNumber => {
        const pageBreakEl = pageBreakersRef.current.get(pageNumber)
        if (!pageBreakEl) return

        if (shouldMountPageBreaker(pageNumber, activePages)) {
          if (isPlaceholderPageBreaker(pageBreakEl)) {
            needsHydrationRefresh = true
          }
          restorePageBreaker(pageBreakEl, parkedBreakersRef.current)
        } else {
          parkPageBreaker(pageBreakEl, parkedBreakersRef.current)
          parkedAnyBreakers = true
        }
      })

      if (parkedAnyBreakers) {
        hasParkedBreakersRef.current = true
      }

      if (needsHydrationRefresh) {
        if (hydrationRequestWindowKeyRef.current !== viewportModel.windowKey) {
          hydrationRequestWindowKeyRef.current = viewportModel.windowKey
          ;(
            editor?.commands as { hydratePageBreakShells?: (pageNumbers: number[]) => boolean } | undefined
          )?.hydratePageBreakShells?.(Array.from(pageNumbersToRefresh))
        }
      } else if (hydrationRequestWindowKeyRef.current === viewportModel.windowKey) {
        hydrationRequestWindowKeyRef.current = null
      }

      previousActiveRangeRef.current = viewportModel.activeRange
      previousMountedRangeRef.current = viewportModel.mountedRange
      previousWindowKeyRef.current = viewportModel.windowKey
    })

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [
    editor,
    editorContainerRef,
    layoutNavigationState.pageBreakEls,
    viewportModel.activePageNumbers,
    viewportModel.activeRange,
    viewportModel.hasSparseFlow,
    viewportModel.isWindowed,
    viewportModel.mountedRange,
    viewportModel.totalPages,
    viewportModel.windowKey
  ])
}
