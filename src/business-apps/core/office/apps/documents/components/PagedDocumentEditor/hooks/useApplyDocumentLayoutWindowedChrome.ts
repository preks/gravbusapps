import { useEffect, useRef, type MutableRefObject } from 'react'
import { layoutPageNumberSlots } from '@/components/tiptap-extensions/tiptap-custom-pagination/pageNumberSlotLayout'
import type { DocumentLayoutPageRange } from '../../../types'
import {
  resolveFirstPageHeaderElement,
  resolvePageBreakElements,
  type DocumentLayoutNavigationState
} from '../documentLayoutService'
import type { DocumentLayoutViewportModel } from './useDocumentLayoutViewportModel'
import { resolveViewportMarkerRefreshRange } from './useApplyDocumentLayoutViewportMarkers'

interface UseApplyDocumentLayoutWindowedChromeParams {
  editorContainerRef: MutableRefObject<HTMLDivElement | null>
  layoutNavigationState: DocumentLayoutNavigationState
  viewportModel: DocumentLayoutViewportModel
}

interface ParkedChromeState {
  previousHeight: string | null
  contentNodes: Node[]
  slotNodes: Node[]
}

function getContentHost(region: HTMLElement) {
  return region.querySelector('.rm-page-header-content, .rm-page-footer-content') as HTMLElement | null
}

function getLayoutHost(region: HTMLElement) {
  return region.querySelector('.rm-page-region-layout') as HTMLElement | null
}

export function collectPageChromeRegions(
  pageBreakEls: HTMLElement[],
  firstPageHeader: HTMLElement | null = null
): Map<number, HTMLElement[]> {
  const pageChromeRegions = new Map<number, HTMLElement[]>()

  const addRegion = (pageNumber: number, region: HTMLElement) => {
    const existing = pageChromeRegions.get(pageNumber) ?? []
    if (!existing.includes(region)) {
      pageChromeRegions.set(pageNumber, [...existing, region])
    }
  }

  pageBreakEls.forEach(pageBreakEl => {
    const regions = pageBreakEl.querySelectorAll(
      '.rm-page-header-region[data-rm-page-number], .rm-page-footer-region[data-rm-page-number]'
    )

    regions.forEach(region => {
      if (!(region instanceof HTMLElement)) return
      const pageNumber = Number(region.dataset.rmPageNumber)
      if (!Number.isInteger(pageNumber) || pageNumber < 1) return
      addRegion(pageNumber, region)
    })
  })

  if (firstPageHeader) {
    addRegion(1, firstPageHeader)
  }

  return pageChromeRegions
}

function resolvePageBreakChromeStructureKey(pageBreakEls: HTMLElement[]) {
  return pageBreakEls
    .map(pageBreakEl => {
      const pageElement = pageBreakEl.querySelector('.page[data-rm-page-number]')
      const pageNumber = Number(pageElement instanceof HTMLElement ? (pageElement.dataset.rmPageNumber ?? '') : '')
      const breaker = pageBreakEl.querySelector('.breaker') as HTMLElement | null
      const regionCount = pageBreakEl.querySelectorAll(
        '.rm-page-header-region[data-rm-page-number], .rm-page-footer-region[data-rm-page-number]'
      ).length
      return `${Number.isInteger(pageNumber) ? pageNumber : 0}:${breaker?.dataset.rmBreakerMode ?? 'full'}:${regionCount}`
    })
    .join('|')
}

export function parkChromeRegion(region: HTMLElement, parkedRegions: WeakMap<HTMLElement, ParkedChromeState>) {
  if (region.dataset.rmOverlayActive === 'true') return
  if (parkedRegions.has(region)) return

  const contentHost = getContentHost(region)
  const layoutHost = getLayoutHost(region)
  if (!(contentHost instanceof HTMLElement) || !(layoutHost instanceof HTMLElement)) return

  const contentNodes = Array.from(contentHost.childNodes)
  const slotNodes = Array.from(layoutHost.querySelectorAll('[data-rm-page-number-slot="true"]'))
  const previousHeight = region.style.height || null
  const measuredHeight = region.offsetHeight

  parkedRegions.set(region, {
    previousHeight,
    contentNodes,
    slotNodes
  })

  if (measuredHeight > 0) {
    region.style.height = `${measuredHeight}px`
  }

  contentHost.replaceChildren()
  slotNodes.forEach(slot => slot.remove())
  region.dataset.layoutChromeMounted = 'false'
}

export function restoreChromeRegion(region: HTMLElement, parkedRegions: WeakMap<HTMLElement, ParkedChromeState>) {
  const parkedState = parkedRegions.get(region)
  if (!parkedState) return

  const contentHost = getContentHost(region)
  const layoutHost = getLayoutHost(region)
  if (!(contentHost instanceof HTMLElement) || !(layoutHost instanceof HTMLElement)) {
    parkedRegions.delete(region)
    return
  }

  if (contentHost.childNodes.length === 0 && parkedState.contentNodes.length > 0) {
    contentHost.append(...parkedState.contentNodes)
  }

  if (layoutHost.querySelector('[data-rm-page-number-slot="true"]') === null && parkedState.slotNodes.length > 0) {
    layoutHost.append(...parkedState.slotNodes)
  }

  if (parkedState.previousHeight === null) {
    region.style.removeProperty('height')
  } else {
    region.style.height = parkedState.previousHeight
  }

  delete region.dataset.layoutChromeMounted
  parkedRegions.delete(region)
  requestAnimationFrame(() => layoutPageNumberSlots(region))
}

function shouldVirtualizeWindowedChrome(pageBreakEls: HTMLElement[], totalPages: number) {
  return pageBreakEls.length < Math.max(1, totalPages)
}

function resolvePagesToRefresh(
  previousActiveRange: DocumentLayoutPageRange | null,
  nextActiveRange: DocumentLayoutPageRange,
  refreshAll: boolean,
  pageChromeRegions: Map<number, HTMLElement[]>
) {
  const pageNumbersToRefresh = new Set<number>()

  if (refreshAll) {
    pageChromeRegions.forEach((_, pageNumber) => {
      pageNumbersToRefresh.add(pageNumber)
    })
    return pageNumbersToRefresh
  }

  const refreshRange = resolveViewportMarkerRefreshRange(previousActiveRange, nextActiveRange)
  if (!refreshRange) return pageNumbersToRefresh

  for (let pageNumber = refreshRange.startPage; pageNumber <= refreshRange.endPage; pageNumber += 1) {
    pageNumbersToRefresh.add(pageNumber)
  }

  return pageNumbersToRefresh
}

export function useApplyDocumentLayoutWindowedChrome({
  editorContainerRef,
  layoutNavigationState,
  viewportModel
}: UseApplyDocumentLayoutWindowedChromeParams): void {
  const rafRef = useRef<number | null>(null)
  const pageChromeRegionsRef = useRef<Map<number, HTMLElement[]>>(new Map())
  const indexedPageBreakElsRef = useRef<HTMLElement[] | null>(null)
  const indexedPageBreakStructureKeyRef = useRef<string>('')
  const indexedFirstPageHeaderRef = useRef<HTMLElement | null>(null)
  const parkedRegionsRef = useRef<WeakMap<HTMLElement, ParkedChromeState>>(new WeakMap())
  const hasParkedRegionsRef = useRef(false)
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
      const pageBreakStructureKey = resolvePageBreakChromeStructureKey(pageBreakEls)
      const pageBreakStructureChanged = indexedPageBreakStructureKeyRef.current !== pageBreakStructureKey
      const firstPageHeader = resolveFirstPageHeaderElement(container)
      const pageChromeRegionsChanged =
        pageBreakElsChanged || pageBreakStructureChanged || indexedFirstPageHeaderRef.current !== firstPageHeader

      if (pageChromeRegionsChanged) {
        pageChromeRegionsRef.current = collectPageChromeRegions(
          pageBreakEls,
          firstPageHeader instanceof HTMLElement ? firstPageHeader : null
        )
        indexedPageBreakElsRef.current = pageBreakEls
        indexedPageBreakStructureKeyRef.current = pageBreakStructureKey
        indexedFirstPageHeaderRef.current = firstPageHeader instanceof HTMLElement ? firstPageHeader : null
      }

      const shouldVirtualizeChrome =
        viewportModel.isWindowed &&
        (viewportModel.hasSparseFlow || shouldVirtualizeWindowedChrome(pageBreakEls, viewportModel.totalPages))

      if (!shouldVirtualizeChrome) {
        if (hasParkedRegionsRef.current) {
          pageChromeRegionsRef.current.forEach(regions => {
            regions.forEach(region => restoreChromeRegion(region, parkedRegionsRef.current))
          })
          hasParkedRegionsRef.current = false
        }
        previousActiveRangeRef.current = viewportModel.activeRange
        previousWindowKeyRef.current = viewportModel.windowKey
        return
      }

      const refreshAll =
        pageChromeRegionsChanged ||
        previousActiveRangeRef.current === null ||
        previousWindowKeyRef.current !== viewportModel.windowKey
      const pageNumbersToRefresh = resolvePagesToRefresh(
        previousActiveRangeRef.current,
        viewportModel.activeRange,
        refreshAll,
        pageChromeRegionsRef.current
      )
      const activePages = new Set(viewportModel.activePageNumbers)
      let parkedAnyRegions = false

      pageNumbersToRefresh.forEach(pageNumber => {
        const regions = pageChromeRegionsRef.current.get(pageNumber)
        if (!regions) return

        regions.forEach(region => {
          if (activePages.has(pageNumber)) {
            restoreChromeRegion(region, parkedRegionsRef.current)
          } else {
            parkChromeRegion(region, parkedRegionsRef.current)
            parkedAnyRegions = true
          }
        })
      })

      if (parkedAnyRegions) {
        hasParkedRegionsRef.current = true
      }

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
    viewportModel.hasSparseFlow,
    viewportModel.isWindowed,
    viewportModel.mountedRange,
    viewportModel.totalPages,
    viewportModel.windowKey
  ])
}
