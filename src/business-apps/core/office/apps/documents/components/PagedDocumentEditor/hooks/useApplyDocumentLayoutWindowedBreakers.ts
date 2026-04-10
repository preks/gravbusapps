import { useEffect, useRef, type MutableRefObject } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { DocumentLayoutPageRange } from '../../../types'
import { resolvePageBreakElements, type DocumentLayoutNavigationState } from '../documentLayoutService'
import type { DocumentLayoutViewportModel } from './useDocumentLayoutViewportModel'

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
  const pageNumber = Number(page instanceof HTMLElement ? (page.dataset.rmPageNumber ?? '') : '')
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null
}

function resolveBreakerElement(pageBreakEl: HTMLElement) {
  return pageBreakEl.querySelector('.breaker') as HTMLElement | null
}

function resolvePaginationRoot(container: HTMLDivElement): HTMLElement | null {
  const directChild = Array.from(container.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.rmPagination === 'true'
  )
  if (directChild) {
    return directChild
  }

  return (container.querySelector('[data-rm-pagination="true"]') as HTMLElement | null) ?? null
}

function hasParkedPageBreaker(pageBreakEl: HTMLElement, parkedBreakers: WeakMap<HTMLElement, ParkedBreakerState>) {
  const breaker = resolveBreakerElement(pageBreakEl)
  return breaker instanceof HTMLElement ? parkedBreakers.has(breaker) : false
}

function syncMountedRangeMetadata(
  paginationRoot: HTMLElement | null,
  mountedRange: DocumentLayoutPageRange | null,
  totalPages: number
) {
  if (!(paginationRoot instanceof HTMLElement)) return

  const normalizedRange = mountedRange ?? {
    startPage: 1,
    endPage: Math.max(1, totalPages)
  }

  paginationRoot.dataset.rmMountedStartPage = String(normalizedRange.startPage)
  paginationRoot.dataset.rmMountedEndPage = String(normalizedRange.endPage)
}

function resolveDesiredHydratedPageNumbers(mountedPages: Set<number>, totalPages: number) {
  const desiredHydratedPages = new Set<number>()

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    if (shouldMountPageBreaker(pageNumber, mountedPages)) {
      desiredHydratedPages.add(pageNumber)
    }
  }

  return desiredHydratedPages
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
  if (pageBreakEl.dataset.rmPageShellState === 'placeholder') {
    return true
  }

  const breaker = resolveBreakerElement(pageBreakEl)
  return breaker?.dataset.rmBreakerMode === 'placeholder'
}

function resolveMountedRange(activeRange: DocumentLayoutPageRange) {
  return {
    startPage: Math.max(1, activeRange.startPage - 1),
    endPage: activeRange.endPage
  }
}

export function parkPageBreaker(pageBreakEl: HTMLElement, parkedBreakers: WeakMap<HTMLElement, ParkedBreakerState>) {
  const breaker = resolveBreakerElement(pageBreakEl)
  if (!(breaker instanceof HTMLElement)) return
  if (breaker.querySelector('[data-rm-overlay-active="true"]')) return
  if (breaker.dataset.rmBreakerMode === 'placeholder') {
    pageBreakEl.dataset.rmPageShellState = 'placeholder'
    return
  }
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
  breaker.dataset.rmBreakerMode = 'placeholder'
  breaker.dataset.rmBreakerPlaceholderHeight = String(Math.max(0, measuredHeight))
  breaker.dataset.rmBreakerFooterHeight = String(Math.max(0, footerHeight))
  breaker.dataset.rmBreakerNextHeaderHeight = String(Math.max(0, nextHeaderHeight))
  breaker.dataset.layoutBreakerMounted = 'false'
  pageBreakEl.dataset.rmPageShellState = 'placeholder'
}

export function restorePageBreaker(pageBreakEl: HTMLElement, parkedBreakers: WeakMap<HTMLElement, ParkedBreakerState>) {
  const breaker = resolveBreakerElement(pageBreakEl)
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
  delete breaker.dataset.rmBreakerMode
  delete breaker.dataset.rmBreakerPlaceholderHeight
  delete breaker.dataset.rmBreakerFooterHeight
  delete breaker.dataset.rmBreakerNextHeaderHeight
  pageBreakEl.dataset.rmPageShellState = 'hydrated'
  parkedBreakers.delete(breaker)
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
  const hydrationRequestKeyRef = useRef<string | null>(null)

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
        hydrationRequestKeyRef.current = null
      }

      const paginationRoot = resolvePaginationRoot(container)

      if (!viewportModel.isWindowed) {
        pageBreakersRef.current.forEach(pageBreakEl => {
          restorePageBreaker(pageBreakEl, parkedBreakersRef.current)
        })
        syncMountedRangeMetadata(paginationRoot, null, viewportModel.totalPages)

        const placeholderPageNumbers = Array.from(pageBreakersRef.current.entries())
          .filter(([, pageBreakEl]) => isPlaceholderPageBreaker(pageBreakEl))
          .map(([pageNumber]) => pageNumber)

        if (placeholderPageNumbers.length > 0) {
          const requestKey = `full:${placeholderPageNumbers.join(',')}`
          if (hydrationRequestKeyRef.current !== requestKey) {
            hydrationRequestKeyRef.current = requestKey
            ;(
              editor?.commands as { hydratePageBreakShells?: (pageNumbers: number[]) => boolean } | undefined
            )?.hydratePageBreakShells?.(placeholderPageNumbers)
          }
        } else {
          hydrationRequestKeyRef.current = null
        }

        return
      }

      const desiredMountedRange = viewportModel.mountedRange ?? resolveMountedRange(viewportModel.activeRange)
      syncMountedRangeMetadata(paginationRoot, desiredMountedRange, viewportModel.totalPages)
      const mountedPages = new Set(viewportModel.mountedPageNumbers)
      const desiredHydratedPages = resolveDesiredHydratedPageNumbers(mountedPages, viewportModel.totalPages)
      const pageNumbersToHydrate: number[] = []

      pageBreakersRef.current.forEach((pageBreakEl, pageNumber) => {
        if (desiredHydratedPages.has(pageNumber)) {
          if (hasParkedPageBreaker(pageBreakEl, parkedBreakersRef.current)) {
            restorePageBreaker(pageBreakEl, parkedBreakersRef.current)
          } else if (isPlaceholderPageBreaker(pageBreakEl)) {
            pageNumbersToHydrate.push(pageNumber)
          }
          return
        }

        parkPageBreaker(pageBreakEl, parkedBreakersRef.current)
      })

      if (pageNumbersToHydrate.length > 0) {
        const requestKey = `${viewportModel.windowKey}:${pageNumbersToHydrate.join(',')}`
        if (hydrationRequestKeyRef.current !== requestKey) {
          hydrationRequestKeyRef.current = requestKey
          ;(
            editor?.commands as { hydratePageBreakShells?: (pageNumbers: number[]) => boolean } | undefined
          )?.hydratePageBreakShells?.(pageNumbersToHydrate)
        }
      } else {
        hydrationRequestKeyRef.current = null
      }
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
    viewportModel.isWindowed,
    viewportModel.mountedPageNumbers,
    viewportModel.mountedRange,
    viewportModel.totalPages,
    viewportModel.windowKey
  ])
}
