import { useEffect, useRef, type MutableRefObject } from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'
import type { DocumentLayoutPageRange } from '../../../types'
import { refreshPageMinHeight } from '@/components/tiptap-extensions/tiptap-custom-pagination/dom'
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

function resolvePaginationPresentationRoot(
  paginationRoot: HTMLElement | null,
  fallbackContainer: HTMLDivElement
): HTMLElement | null {
  if (!(paginationRoot instanceof HTMLElement)) {
    return null
  }

  const chromeRoot = paginationRoot.closest('[data-rm-pagination-chrome="true"]')
  if (chromeRoot instanceof HTMLElement && chromeRoot.parentElement instanceof HTMLElement) {
    return chromeRoot.parentElement
  }

  const proseMirrorRoot = paginationRoot.closest('.ProseMirror')
  if (proseMirrorRoot instanceof HTMLElement) {
    return proseMirrorRoot
  }

  return paginationRoot.parentElement instanceof HTMLElement ? paginationRoot.parentElement : fallbackContainer
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

function doesPageRangeCoverRange(
  containerRange: DocumentLayoutPageRange | null,
  requestedRange: DocumentLayoutPageRange
): boolean {
  if (!containerRange) {
    return false
  }

  return requestedRange.startPage >= containerRange.startPage && requestedRange.endPage <= containerRange.endPage
}

function createPageNumbersForRange(range: DocumentLayoutPageRange, totalPages: number): number[] {
  const pageNumbers: number[] = []
  const endPage = Math.min(totalPages, range.endPage)

  for (let pageNumber = Math.max(1, range.startPage); pageNumber <= endPage; pageNumber += 1) {
    pageNumbers.push(pageNumber)
  }

  return pageNumbers
}

function resolveEffectiveMountedState(
  viewportModel: Pick<DocumentLayoutViewportModel, 'activeRange' | 'mountedRange' | 'mountedPageNumbers' | 'totalPages'>
): {
  mountedRange: DocumentLayoutPageRange
  mountedPageNumbers: number[]
} {
  if (doesPageRangeCoverRange(viewportModel.mountedRange, viewportModel.activeRange)) {
    return {
      mountedRange: viewportModel.mountedRange ?? resolveMountedRange(viewportModel.activeRange),
      mountedPageNumbers: viewportModel.mountedPageNumbers
    }
  }

  const recoveredMountedRange = resolveMountedRange(viewportModel.activeRange)
  return {
    mountedRange: recoveredMountedRange,
    mountedPageNumbers: createPageNumbersForRange(recoveredMountedRange, viewportModel.totalPages)
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
      const presentationRoot = resolvePaginationPresentationRoot(paginationRoot, container)

      if (!viewportModel.isWindowed) {
        let didMutateBreakers = false
        pageBreakersRef.current.forEach(pageBreakEl => {
          if (hasParkedPageBreaker(pageBreakEl, parkedBreakersRef.current)) {
            didMutateBreakers = true
          }
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
            didMutateBreakers = true
          }
        } else {
          hydrationRequestKeyRef.current = null
        }

        if (didMutateBreakers && presentationRoot) {
          refreshPageMinHeight(presentationRoot)
        }

        return
      }

      const effectiveMountedState = resolveEffectiveMountedState(viewportModel)
      syncMountedRangeMetadata(paginationRoot, effectiveMountedState.mountedRange, viewportModel.totalPages)
      const mountedPages = new Set(effectiveMountedState.mountedPageNumbers)
      const desiredHydratedPages = resolveDesiredHydratedPageNumbers(mountedPages, viewportModel.totalPages)
      const pageNumbersToHydrate: number[] = []
      let didMutateBreakers = false

      pageBreakersRef.current.forEach((pageBreakEl, pageNumber) => {
        if (desiredHydratedPages.has(pageNumber)) {
          if (hasParkedPageBreaker(pageBreakEl, parkedBreakersRef.current)) {
            restorePageBreaker(pageBreakEl, parkedBreakersRef.current)
            didMutateBreakers = true
          } else if (isPlaceholderPageBreaker(pageBreakEl)) {
            pageNumbersToHydrate.push(pageNumber)
          }
          return
        }

        parkPageBreaker(pageBreakEl, parkedBreakersRef.current)
        didMutateBreakers = true
      })

      if (pageNumbersToHydrate.length > 0) {
        const requestKey = `${viewportModel.windowKey}:${pageNumbersToHydrate.join(',')}`
        if (hydrationRequestKeyRef.current !== requestKey) {
          hydrationRequestKeyRef.current = requestKey
          ;(
            editor?.commands as { hydratePageBreakShells?: (pageNumbers: number[]) => boolean } | undefined
          )?.hydratePageBreakShells?.(pageNumbersToHydrate)
          didMutateBreakers = true
        }
      } else {
        hydrationRequestKeyRef.current = null
      }

      if (didMutateBreakers && presentationRoot) {
        refreshPageMinHeight(presentationRoot)
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
