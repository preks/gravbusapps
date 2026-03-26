import type { Editor as TiptapEditor } from '@tiptap/react'
import type {
  DocumentLayoutPageBodyBounds,
  DocumentLayoutPageChromeMetrics,
  DocumentLayoutInvalidationReason,
  DocumentLayoutFlowSnapshot,
  DocumentLayoutMeasurementRequest,
  DocumentLayoutPageRange,
  DocumentLayoutPageSnapshot,
  DocumentLayoutSource
} from '../../types'

export interface DocumentLayoutNavigationState {
  boundaryEls: HTMLElement[]
  activeRange: DocumentLayoutPageRange | null
  pageBreakEls: HTMLElement[]
  flowEls: HTMLElement[]
}

export interface DocumentLayoutMeasurement {
  pageCount: number
  pages: DocumentLayoutPageSnapshot[]
  flow: DocumentLayoutFlowSnapshot[]
  mountedRange: DocumentLayoutPageRange | null
  mountedPageBodyBounds: DocumentLayoutPageBodyBounds[]
  pageChromeMetrics: DocumentLayoutPageChromeMetrics[]
  activePages: DocumentLayoutPageSnapshot[]
  activeRange: DocumentLayoutPageRange | null
}

export interface ObserveDocumentLayoutParams {
  editor: TiptapEditor | null
  container: HTMLDivElement
  onInvalidated: (reason: DocumentLayoutInvalidationReason) => void
}

export interface DocumentLayoutService {
  readonly source: DocumentLayoutSource
  measureLayout: (
    container: HTMLDivElement,
    request: DocumentLayoutMeasurementRequest
  ) => {
    layout: DocumentLayoutMeasurement
    navigationState: DocumentLayoutNavigationState
  }
  resolveCurrentPage: (container: HTMLDivElement, navigationState: DocumentLayoutNavigationState) => number
  observeLayout: (params: ObserveDocumentLayoutParams) => () => void
}

export function resolveObservableLayoutRoot(
  editor: TiptapEditor | null,
  container: HTMLDivElement
): HTMLElement | null {
  try {
    const editorDom = editor?.view?.dom
    if (editorDom instanceof HTMLElement) {
      return editorDom
    }
  } catch {
    // Tiptap can expose the editor instance before view.dom is mounted.
  }

  const fallbackRoot = container.querySelector('.ProseMirror')
  return fallbackRoot instanceof HTMLElement ? fallbackRoot : null
}

export function createLinearPageList(pageCount: number): DocumentLayoutPageSnapshot[] {
  return Array.from({ length: pageCount }, (_, index) => ({
    pageNumber: index + 1,
    flowIndex: null,
    mountedIndex: null,
    isMounted: false
  }))
}

export function createPageRange(startPage: number, endPage: number): DocumentLayoutPageRange {
  return {
    startPage: Math.max(1, Math.min(startPage, endPage)),
    endPage: Math.max(1, Math.max(startPage, endPage))
  }
}

export function resolveActiveRange(
  pageCount: number,
  request: DocumentLayoutMeasurementRequest
): DocumentLayoutPageRange {
  if (!request.pageRange) {
    return createPageRange(1, pageCount)
  }

  return createPageRange(
    Math.min(request.pageRange.startPage, pageCount),
    Math.min(request.pageRange.endPage, pageCount)
  )
}

export function resolveActivePages(
  pages: DocumentLayoutPageSnapshot[],
  activeRange: DocumentLayoutPageRange
): DocumentLayoutPageSnapshot[] {
  return pages.filter(page => page.pageNumber >= activeRange.startPage && page.pageNumber <= activeRange.endPage)
}

export function resolvePaginationRootElement(container: HTMLDivElement): HTMLElement | null {
  const directChildPagination = Array.from(container.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.rmPagination === ''
  )
  if (directChildPagination) {
    return directChildPagination
  }

  const paginationChrome = Array.from(container.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.rmPaginationChrome === 'true'
  )
  if (!paginationChrome) {
    return null
  }

  return (
    Array.from(paginationChrome.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.rmPagination === ''
    ) ?? null
  )
}

export function resolveFirstPageHeaderElement(container: HTMLDivElement): HTMLElement | null {
  const directChildFirstPageHeader = Array.from(container.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.classList.contains('rm-first-page-header') &&
      child.dataset.rmPageNumber === '1'
  )
  if (directChildFirstPageHeader) {
    return directChildFirstPageHeader
  }

  const paginationChrome = Array.from(container.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.rmPaginationChrome === 'true'
  )
  if (!paginationChrome) {
    return null
  }

  return (
    Array.from(paginationChrome.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child.classList.contains('rm-first-page-header') &&
        child.dataset.rmPageNumber === '1'
    ) ?? null
  )
}

export function resolvePageBreakElementsFromPaginationRoot(paginationRoot: HTMLElement | null): HTMLElement[] {
  const pageEls = paginationRoot ? Array.from(paginationRoot.children) : []
  return pageEls
    .filter((el): el is HTMLElement => el instanceof HTMLElement)
    .filter(element => element.classList.contains('rm-page-break'))
}

export function resolvePaginationFlowElementsFromPaginationRoot(paginationRoot: HTMLElement | null): HTMLElement[] {
  const flowEls = paginationRoot ? Array.from(paginationRoot.children) : []
  return flowEls.filter((el): el is HTMLElement => el instanceof HTMLElement)
}

export function resolvePageBreakElements(container: HTMLDivElement): HTMLElement[] {
  return resolvePageBreakElementsFromPaginationRoot(resolvePaginationRootElement(container))
}

export function resolvePaginationFlowElements(container: HTMLDivElement): HTMLElement[] {
  return resolvePaginationFlowElementsFromPaginationRoot(resolvePaginationRootElement(container))
}

export function resolvePaginationTotalPages(container: HTMLDivElement): number {
  const paginationRoot = resolvePaginationRootElement(container)
  const pageBreakEls = resolvePageBreakElementsFromPaginationRoot(paginationRoot)
  return resolvePaginationTotalPagesFromPaginationRoot(paginationRoot, pageBreakEls)
}

export function resolvePaginationTotalPagesFromPaginationRoot(
  paginationRoot: HTMLElement | null,
  pageBreakEls = resolvePageBreakElementsFromPaginationRoot(paginationRoot)
): number {
  const explicitTotalPages = Number(paginationRoot?.dataset.rmTotalPages ?? '')
  if (Number.isInteger(explicitTotalPages) && explicitTotalPages > 0) {
    return explicitTotalPages
  }

  return Math.max(1, pageBreakEls.length)
}

function resolvePageNumberForPageBreak(pageBreakEl: HTMLElement): number | null {
  const explicitPageNumber = Number(pageBreakEl.dataset.rmPageNumber ?? '')
  if (Number.isInteger(explicitPageNumber) && explicitPageNumber > 0) {
    return explicitPageNumber
  }

  const pageEl = pageBreakEl.querySelector('.page[data-rm-page-number]')
  const pageNumber = Number(pageEl instanceof HTMLElement ? (pageEl.dataset.rmPageNumber ?? '') : '')
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null
}

function resolvePageBodyElementForPageBreak(pageBreakEl: HTMLElement): HTMLElement | null {
  const bodyLayer = pageBreakEl.querySelector('.rm-page-body-layer[data-rm-page-number]')
  if (bodyLayer instanceof HTMLElement) {
    return bodyLayer
  }

  const pageElement = pageBreakEl.querySelector('.page[data-rm-page-number]')
  return pageElement instanceof HTMLElement ? pageElement : null
}

export function resolveMountedPageBodyBounds(pageBreakEls: HTMLElement[]): DocumentLayoutPageBodyBounds[] {
  return pageBreakEls
    .map(pageBreakEl => {
      const pageNumber = resolvePageNumberForPageBreak(pageBreakEl)
      const bodyElement = resolvePageBodyElementForPageBreak(pageBreakEl)
      if (pageNumber === null || !(bodyElement instanceof HTMLElement)) {
        return null
      }

      const rect = bodyElement.getBoundingClientRect()
      if (![rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite)) {
        return null
      }

      return {
        pageNumber,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom
      }
    })
    .filter((bounds): bounds is DocumentLayoutPageBodyBounds => bounds !== null)
}

function readRegionHeight(region: Element | null): number {
  if (!(region instanceof HTMLElement)) {
    return 0
  }

  return Math.max(region.offsetHeight, region.getBoundingClientRect().height, 0)
}

export function resolveMountedPageChromeMetrics(
  pageBreakEls: HTMLElement[],
  firstPageHeader: HTMLElement | null = null
): DocumentLayoutPageChromeMetrics[] {
  const metricsByPageNumber = new Map<number, DocumentLayoutPageChromeMetrics>()

  const assignMetrics = (pageNumber: number, updates: Partial<DocumentLayoutPageChromeMetrics>) => {
    const current = metricsByPageNumber.get(pageNumber) ?? {
      pageNumber,
      headerHeight: 0,
      footerHeight: 0
    }
    metricsByPageNumber.set(pageNumber, {
      ...current,
      ...updates
    })
  }

  pageBreakEls.forEach(pageBreakEl => {
    const pageNumber = resolvePageNumberForPageBreak(pageBreakEl)
    if (pageNumber === null) {
      return
    }

    const headerRegion = pageBreakEl.querySelector(
      `.rm-page-header-region[data-rm-page-number="${pageNumber}"]`
    ) as HTMLElement | null
    const footerRegion = pageBreakEl.querySelector(
      `.rm-page-footer-region[data-rm-page-number="${pageNumber}"]`
    ) as HTMLElement | null

    assignMetrics(pageNumber, {
      headerHeight: readRegionHeight(headerRegion),
      footerHeight: readRegionHeight(footerRegion)
    })
  })

  if (firstPageHeader instanceof HTMLElement) {
    assignMetrics(1, {
      headerHeight: Math.max(readRegionHeight(firstPageHeader), metricsByPageNumber.get(1)?.headerHeight ?? 0)
    })
  }

  return Array.from(metricsByPageNumber.values()).sort((left, right) => left.pageNumber - right.pageNumber)
}

function resolveSpacerPageSegmentHeights(spacerEl: HTMLElement): number[] {
  return (spacerEl.dataset.rmPageSegmentHeights ?? '')
    .split(',')
    .map(value => Number.parseFloat(value))
    .filter(height => Number.isFinite(height) && height > 0)
}

function resolvePageRangeForSpacer(spacerEl: HTMLElement): DocumentLayoutPageRange | null {
  const startPage = Number(spacerEl.dataset.rmPageRangeStart ?? '')
  const endPage = Number(spacerEl.dataset.rmPageRangeEnd ?? '')
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage)) return null
  if (startPage < 1 || endPage < startPage) return null
  return { startPage, endPage }
}

function resolveCurrentPageFromSpacer(spacerEl: HTMLElement, viewportCenterY: number, fallbackPage: number): number {
  const pageRange = resolvePageRangeForSpacer(spacerEl)
  if (!pageRange) return fallbackPage

  const pageCount = pageRange.endPage - pageRange.startPage + 1
  if (pageCount <= 1) return pageRange.startPage

  const spacerRect = spacerEl.getBoundingClientRect()
  if (spacerRect.height <= 0) return pageRange.startPage

  const relativeOffset = Math.min(Math.max(viewportCenterY - spacerRect.top, 0), spacerRect.height - 1)
  const pageSegmentHeights = resolveSpacerPageSegmentHeights(spacerEl)
  if (pageSegmentHeights.length === pageCount) {
    let accumulatedHeight = 0
    for (let pageIndex = 0; pageIndex < pageSegmentHeights.length; pageIndex += 1) {
      accumulatedHeight += pageSegmentHeights[pageIndex] ?? 0
      if (relativeOffset < accumulatedHeight) {
        return pageRange.startPage + pageIndex
      }
    }

    return pageRange.endPage
  }

  const pageIndex = Math.min(pageCount - 1, Math.floor((relativeOffset / spacerRect.height) * pageCount))
  return pageRange.startPage + pageIndex
}

function resolveLeadingPageForFlowElement(flowEl: HTMLElement, fallbackPage = 1): number {
  if (flowEl.classList.contains('rm-page-break')) {
    return resolvePageNumberForPageBreak(flowEl) ?? fallbackPage
  }

  const pageRange = resolvePageRangeForSpacer(flowEl)
  if (pageRange) {
    return pageRange.startPage
  }

  return fallbackPage
}

function resolveTrailingPageForFlowElement(flowEl: HTMLElement, fallbackPage = 1): number {
  if (flowEl.classList.contains('rm-page-break')) {
    return resolvePageNumberForPageBreak(flowEl) ?? fallbackPage
  }

  const pageRange = resolvePageRangeForSpacer(flowEl)
  if (pageRange) {
    return pageRange.endPage
  }

  return fallbackPage
}

function createFlowIndexedPageList(
  pageCount: number,
  flowEls: HTMLElement[]
): {
  pages: DocumentLayoutPageSnapshot[]
  flow: DocumentLayoutFlowSnapshot[]
  mountedRange: DocumentLayoutPageRange | null
} {
  const pages = createLinearPageList(pageCount)
  const flow: DocumentLayoutFlowSnapshot[] = []
  let mountedIndex = 0
  let mountedStartPage: number | null = null
  let mountedEndPage: number | null = null

  const updateMountedRange = (pageNumber: number) => {
    mountedStartPage = mountedStartPage === null ? pageNumber : Math.min(mountedStartPage, pageNumber)
    mountedEndPage = mountedEndPage === null ? pageNumber : Math.max(mountedEndPage, pageNumber)
  }

  const assignSpacerPages = (startPage: number, endPage: number, flowIndex: number) => {
    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
      const pageIndex = pageNumber - 1
      const existingPage = pages[pageIndex]
      if (!existingPage || existingPage.isMounted || existingPage.flowIndex !== null) {
        continue
      }

      pages[pageIndex] = {
        ...existingPage,
        flowIndex
      }
    }
  }

  flowEls.forEach((flowEl, flowIndex) => {
    if (flowEl.classList.contains('rm-page-break')) {
      const pageNumber = resolvePageNumberForPageBreak(flowEl)
      if (pageNumber === null || pageNumber < 1 || pageNumber > pageCount) {
        return
      }

      flow.push({
        flowIndex,
        pageRange: createPageRange(pageNumber, pageNumber),
        kind: 'page-break',
        isMounted: true
      })
      pages[pageNumber - 1] = {
        pageNumber,
        flowIndex,
        mountedIndex,
        isMounted: true
      }
      mountedIndex += 1
      updateMountedRange(pageNumber)
      return
    }

    const pageRange = resolvePageRangeForSpacer(flowEl)
    if (!pageRange) {
      return
    }

    const clampedStartPage = Math.max(1, Math.min(pageRange.startPage, pageCount))
    const clampedEndPage = Math.max(clampedStartPage, Math.min(pageRange.endPage, pageCount))
    flow.push({
      flowIndex,
      pageRange: createPageRange(clampedStartPage, clampedEndPage),
      kind: 'spacer',
      isMounted: false
    })
    assignSpacerPages(clampedStartPage, clampedEndPage, flowIndex)
  })

  return {
    pages,
    flow,
    mountedRange:
      mountedStartPage === null || mountedEndPage === null ? null : createPageRange(mountedStartPage, mountedEndPage)
  }
}

export function buildLayoutMeasurement(
  pageBreakEls: HTMLElement[],
  flowEls: HTMLElement[],
  request: DocumentLayoutMeasurementRequest,
  firstPageHeader: HTMLElement | null = null
): {
  layout: DocumentLayoutMeasurement
  navigationState: DocumentLayoutNavigationState
} {
  const paginationRoot = pageBreakEls[0]?.parentElement
  const resolvedPaginationRoot =
    paginationRoot instanceof HTMLDivElement && paginationRoot.dataset.rmPagination === '' ? paginationRoot : null
  const explicitTotalPages = Number(resolvedPaginationRoot?.dataset.rmTotalPages ?? '')
  const indexedPageNumbers = pageBreakEls
    .map(resolvePageNumberForPageBreak)
    .filter((pageNumber): pageNumber is number => pageNumber !== null)
  let pageCount = Math.max(1, pageBreakEls.length)
  if (Number.isInteger(explicitTotalPages) && explicitTotalPages > 0) {
    pageCount = explicitTotalPages
  } else if (indexedPageNumbers.length > 0) {
    pageCount = Math.max(...indexedPageNumbers)
  }
  const indexedLayout = createFlowIndexedPageList(pageCount, flowEls)
  const mountedPageBodyBounds = resolveMountedPageBodyBounds(pageBreakEls)
  const pageChromeMetrics = resolveMountedPageChromeMetrics(pageBreakEls, firstPageHeader)

  return {
    layout: {
      pageCount,
      pages: indexedLayout.pages,
      flow: indexedLayout.flow,
      mountedRange: indexedLayout.mountedRange,
      mountedPageBodyBounds,
      pageChromeMetrics,
      activePages: [],
      activeRange: null
    },
    navigationState: {
      activeRange: resolveActiveRange(pageCount, request),
      pageBreakEls,
      flowEls,
      boundaryEls: pageBreakEls
        .slice(0, -1)
        .map(el => el.querySelector('.breaker'))
        .filter((el): el is HTMLElement => el instanceof HTMLElement)
    }
  }
}

function measureLegacyDomPagination(
  container: HTMLDivElement,
  request: DocumentLayoutMeasurementRequest
): {
  layout: DocumentLayoutMeasurement
  navigationState: DocumentLayoutNavigationState
} {
  const paginationRoot = resolvePaginationRootElement(container)
  return buildLayoutMeasurement(
    resolvePageBreakElementsFromPaginationRoot(paginationRoot),
    resolvePaginationFlowElementsFromPaginationRoot(paginationRoot),
    request,
    resolveFirstPageHeaderElement(container)
  )
}

export function resolveCurrentPageFromLayoutNavigation(
  container: HTMLDivElement,
  navigationState: DocumentLayoutNavigationState
): number {
  const containerRect = container.getBoundingClientRect()
  const viewportCenterY = containerRect.top + containerRect.height / 2

  if (navigationState.flowEls.length > 0) {
    const firstFlowEl = navigationState.flowEls[0]
    if (firstFlowEl && viewportCenterY < firstFlowEl.getBoundingClientRect().top) {
      return resolveLeadingPageForFlowElement(firstFlowEl)
    }

    const lastFlowEl = navigationState.flowEls.at(-1)
    if (lastFlowEl) {
      const lastFlowRect = lastFlowEl.getBoundingClientRect()
      if (viewportCenterY > lastFlowRect.bottom) {
        return resolveTrailingPageForFlowElement(lastFlowEl)
      }
    }

    let low = 0
    let high = navigationState.flowEls.length - 1

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const flowEl = navigationState.flowEls[mid]
      const flowRect = flowEl.getBoundingClientRect()

      if (viewportCenterY < flowRect.top) {
        high = mid - 1
        continue
      }

      if (viewportCenterY > flowRect.bottom) {
        low = mid + 1
        continue
      }

      if (flowEl.classList.contains('rm-page-break')) {
        return resolveLeadingPageForFlowElement(flowEl)
      }

      return resolveCurrentPageFromSpacer(flowEl, viewportCenterY, resolveLeadingPageForFlowElement(flowEl))
    }

    if (low >= 0 && low < navigationState.flowEls.length) {
      return resolveLeadingPageForFlowElement(navigationState.flowEls[low])
    }

    if (high >= 0 && high < navigationState.flowEls.length) {
      return resolveTrailingPageForFlowElement(navigationState.flowEls[high])
    }

    return 1
  }

  if (navigationState.boundaryEls.length === 0) return 1

  let low = 0
  let high = navigationState.boundaryEls.length

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const boundaryTop = navigationState.boundaryEls[mid].getBoundingClientRect().top
    if (viewportCenterY >= boundaryTop) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  return Math.max(1, 1 + low)
}

export function createLegacyDomPaginationLayoutService(): DocumentLayoutService {
  let cachedMeasurement: {
    layout: DocumentLayoutMeasurement
    navigationState: DocumentLayoutNavigationState
  } | null = null
  let cachedViewportWindow: {
    activeRange: DocumentLayoutPageRange
    activePages: DocumentLayoutPageSnapshot[]
  } | null = null

  return {
    source: 'legacy-dom-pagination',
    measureLayout(container, request) {
      if (request.scope === 'viewport' && cachedMeasurement) {
        const activeRange = resolveActiveRange(cachedMeasurement.layout.pageCount, request)
        const matchesCachedViewportWindow =
          cachedViewportWindow?.activeRange.startPage === activeRange.startPage &&
          cachedViewportWindow?.activeRange.endPage === activeRange.endPage
        const activePages = matchesCachedViewportWindow
          ? cachedViewportWindow.activePages
          : resolveActivePages(cachedMeasurement.layout.pages, activeRange)

        cachedViewportWindow = {
          activeRange,
          activePages
        }
        const mountedPageBodyBounds = resolveMountedPageBodyBounds(cachedMeasurement.navigationState.pageBreakEls)

        return {
          layout: {
            ...cachedMeasurement.layout,
            mountedPageBodyBounds,
            pageChromeMetrics: cachedMeasurement.layout.pageChromeMetrics,
            activeRange,
            activePages
          },
          navigationState: {
            ...cachedMeasurement.navigationState,
            activeRange
          }
        }
      }

      cachedMeasurement = measureLegacyDomPagination(container, request)
      cachedMeasurement.layout.activeRange = cachedMeasurement.navigationState.activeRange
      cachedMeasurement.layout.activePages = resolveActivePages(
        cachedMeasurement.layout.pages,
        cachedMeasurement.navigationState.activeRange
      )
      cachedMeasurement.layout.mountedPageBodyBounds = resolveMountedPageBodyBounds(
        cachedMeasurement.navigationState.pageBreakEls
      )
      cachedViewportWindow = {
        activeRange: cachedMeasurement.navigationState.activeRange,
        activePages: cachedMeasurement.layout.activePages
      }
      return cachedMeasurement
    },
    resolveCurrentPage(container, navigationState) {
      return resolveCurrentPageFromLayoutNavigation(container, navigationState)
    },
    observeLayout({ editor, container, onInvalidated }) {
      const onResize = () => {
        onInvalidated('viewport-resize')
      }

      globalThis.window.addEventListener('resize', onResize)

      const root = resolveObservableLayoutRoot(editor, container)

      if (!root) {
        return () => {
          globalThis.window.removeEventListener('resize', onResize)
        }
      }

      const observer = new MutationObserver(() => {
        onInvalidated('legacy-dom-structure')
      })

      observer.observe(root, {
        childList: true,
        subtree: false,
        attributes: false,
        characterData: false
      })

      return () => {
        observer.disconnect()
        globalThis.window.removeEventListener('resize', onResize)
      }
    }
  }
}
