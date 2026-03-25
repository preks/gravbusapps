import type { Extension } from '@tiptap/core'
import type { HeaderFooterEditorType, PagesOptions, PagesStorage } from './types'
import {
  applyRootStyles,
  createFirstPageHeader,
  createPaginationWrapper,
  ensurePagesStyles,
  findPaginationPageBreakElement,
  hydratePageBreakElement,
  refreshHeaderFooterRegionDisplay,
  refreshPageMinHeight,
  resolvePaginationWindowRange,
  resolveWindowedPaginationRendererState
} from './dom'
import { getHeaderFooterExtensions, resolveViewportMountedPaginationRange } from './utils'

type FrameScheduler = (callback: FrameRequestCallback) => number
type FrameCanceler = (handle: number) => void

type WindowedPresentationParams = {
  editorDom: HTMLElement
  options: PagesOptions
  storage: PagesStorage
  shouldRunDeferredRefresh?: () => boolean
}

type WindowedRenderWrapperParams = {
  editorDom: HTMLElement
  options: PagesOptions
  storage: PagesStorage
  onOpenEditor?: (
    type: HeaderFooterEditorType,
    pageNumber: number,
    target: HTMLElement,
    clickPosition?: { clientX: number; clientY: number }
  ) => void
}

type WindowedHydrateParams = WindowedRenderWrapperParams &
  Pick<WindowedPresentationParams, 'shouldRunDeferredRefresh'> & {
    pageNumbers: number[]
  }

function resolvePresentationExtensions(options: PagesOptions): Extension[] {
  return getHeaderFooterExtensions(options.headerFooterExtensions)
}

function resolveTotalPages(storage: PagesStorage) {
  return Math.max(1, storage.pageCount, storage.getPageCount())
}

function resolveDirectChildPaginationElement(editorDom: HTMLElement) {
  for (let index = 0; index < editorDom.children.length; index += 1) {
    const child = editorDom.children.item(index)
    if (child instanceof HTMLElement && child.dataset.rmPagination !== undefined) {
      return child
    }
  }

  for (let index = 0; index < editorDom.children.length; index += 1) {
    const child = editorDom.children.item(index)
    if (!(child instanceof HTMLElement) || child.dataset.rmPaginationChrome !== 'true') {
      continue
    }

    for (let childIndex = 0; childIndex < child.children.length; childIndex += 1) {
      const nestedChild = child.children.item(childIndex)
      if (nestedChild instanceof HTMLElement && nestedChild.dataset.rmPagination !== undefined) {
        return nestedChild
      }
    }
  }

  return null
}

function resolveDirectChildFirstPageHeader(editorDom: HTMLElement) {
  for (let index = 0; index < editorDom.children.length; index += 1) {
    const child = editorDom.children.item(index)
    if (
      child instanceof HTMLElement &&
      child.classList.contains('rm-first-page-header') &&
      child.dataset.rmEditorType === 'header' &&
      child.dataset.rmPageNumber === '1'
    ) {
      return child
    }
  }

  for (let index = 0; index < editorDom.children.length; index += 1) {
    const child = editorDom.children.item(index)
    if (!(child instanceof HTMLElement) || child.dataset.rmPaginationChrome !== 'true') {
      continue
    }

    for (let childIndex = 0; childIndex < child.children.length; childIndex += 1) {
      const nestedChild = child.children.item(childIndex)
      if (
        nestedChild instanceof HTMLElement &&
        nestedChild.classList.contains('rm-first-page-header') &&
        nestedChild.dataset.rmEditorType === 'header' &&
        nestedChild.dataset.rmPageNumber === '1'
      ) {
        return nestedChild
      }
    }
  }

  return null
}

function resolveSparseMountedRefreshPageNumbers(editorDom: HTMLElement, totalPages: number): number[] | null {
  const paginationElement = resolveDirectChildPaginationElement(editorDom)
  if (!(paginationElement instanceof HTMLElement)) {
    return null
  }

  const mountedPageBreakCount = Array.from(paginationElement.children).filter(
    child => child instanceof HTMLElement && child.classList.contains('rm-page-break')
  ).length
  const viewportMountedRange = resolveViewportMountedPaginationRange(editorDom)
  const mountedStartPage = viewportMountedRange?.startPage ?? Number(paginationElement.dataset.rmMountedStartPage ?? '')
  const mountedEndPage = viewportMountedRange?.endPage ?? Number(paginationElement.dataset.rmMountedEndPage ?? '')
  const mountedRangeLength =
    Number.isInteger(mountedStartPage) &&
    Number.isInteger(mountedEndPage) &&
    mountedStartPage > 0 &&
    mountedEndPage >= mountedStartPage
      ? mountedEndPage - mountedStartPage + 1
      : null

  if (
    mountedRangeLength === null ||
    (viewportMountedRange === null && mountedPageBreakCount !== mountedRangeLength) ||
    (mountedStartPage === 1 && mountedEndPage >= totalPages)
  ) {
    return null
  }

  const pageNumbers = mountedStartPage > 1 ? [1] : []
  const maxPageNumber = Math.min(totalPages, mountedEndPage + 1)
  for (let pageNumber = mountedStartPage; pageNumber <= maxPageNumber; pageNumber += 1) {
    pageNumbers.push(pageNumber)
  }

  return pageNumbers
}

function resolvePageBreakChromeRegions(pageBreak: HTMLElement) {
  const breaker =
    Array.from(pageBreak.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains('breaker')
    ) ??
    (pageBreak.querySelector('.breaker') as HTMLElement | null) ??
    null
  if (!breaker) {
    return []
  }

  const regions: HTMLElement[] = []
  for (let index = 0; index < breaker.children.length; index += 1) {
    const child = breaker.children.item(index)
    if (!(child instanceof HTMLElement)) {
      continue
    }

    const type = child.dataset.rmEditorType
    const pageNumber = Number(child.dataset.rmPageNumber ?? '')
    if ((type === 'header' || type === 'footer') && Number.isInteger(pageNumber) && pageNumber > 0) {
      regions.push(child)
    }
  }

  return regions
}

export function createWindowedHeaderFooterChromeController(params?: {
  scheduleFrame?: FrameScheduler
  cancelScheduledFrame?: FrameCanceler
}) {
  const scheduleFrame = params?.scheduleFrame ?? (callback => requestAnimationFrame(callback))
  const cancelScheduledFrame = params?.cancelScheduledFrame ?? (handle => cancelAnimationFrame(handle))

  let deferredRefreshFrame: number | null = null

  const clearDeferredRefresh = () => {
    if (deferredRefreshFrame !== null) {
      cancelScheduledFrame(deferredRefreshFrame)
      deferredRefreshFrame = null
    }
  }

  const refresh = (refreshParams: {
    editorDom: HTMLElement
    options: PagesOptions
    storage: PagesStorage
    shouldRunDeferredRefresh?: () => boolean
  }) => {
    const { editorDom, options, storage, shouldRunDeferredRefresh } = refreshParams
    const totalPages = resolveTotalPages(storage)
    const extensions = resolvePresentationExtensions(options)
    const activeRange = resolvePaginationWindowRange(editorDom)
    const sparseMountedPageNumbers = resolveSparseMountedRefreshPageNumbers(editorDom, totalPages)

    const refreshRegion = (region: HTMLElement) => {
      const pageNumber = Number(region.dataset.rmPageNumber)
      const type = region.dataset.rmEditorType
      if (!Number.isInteger(pageNumber) || (type !== 'header' && type !== 'footer')) return

      refreshHeaderFooterRegionDisplay({
        region,
        type: type as HeaderFooterEditorType,
        pageNumber,
        totalPages,
        options,
        storage,
        extensions
      })
    }

    const getAllHeaderFooterRegions = () => {
      const regions: HTMLElement[] = []
      const firstPageHeader = resolveDirectChildFirstPageHeader(editorDom)
      if (firstPageHeader) {
        regions.push(firstPageHeader)
      }

      const paginationElement = resolveDirectChildPaginationElement(editorDom)
      if (paginationElement) {
        for (let index = 0; index < paginationElement.children.length; index += 1) {
          const child = paginationElement.children.item(index)
          if (!(child instanceof HTMLElement) || !child.classList.contains('rm-page-break')) {
            continue
          }

          regions.push(...resolvePageBreakChromeRegions(child))
        }
      }

      if (regions.length > 0) {
        return regions
      }

      return Array.from(editorDom.querySelectorAll('[data-rm-editor-type][data-rm-page-number]')).filter(
        (element): element is HTMLElement => element instanceof HTMLElement
      )
    }

    const getHeaderFooterRegionsForPage = (pageNumber: number) => {
      const regions: HTMLElement[] = []

      if (pageNumber === 1) {
        const firstPageHeader = editorDom.querySelector(
          '.rm-first-page-header[data-rm-page-number="1"][data-rm-editor-type="header"]'
        ) as HTMLElement | null
        if (firstPageHeader) {
          regions.push(firstPageHeader)
        }
      } else {
        const previousPageBreak = findPaginationPageBreakElement(editorDom, pageNumber - 1)
        const headerRegion = previousPageBreak?.querySelector(
          `.rm-page-header-region[data-rm-page-number="${pageNumber}"][data-rm-editor-type="header"]`
        ) as HTMLElement | null
        if (headerRegion) {
          regions.push(headerRegion)
        }
      }

      const currentPageBreak = findPaginationPageBreakElement(editorDom, pageNumber)
      const footerRegion = currentPageBreak?.querySelector(
        `.rm-page-footer-region[data-rm-page-number="${pageNumber}"][data-rm-editor-type="footer"]`
      ) as HTMLElement | null
      if (footerRegion) {
        regions.push(footerRegion)
      }

      if (regions.length > 0) {
        return regions
      }

      return Array.from(
        editorDom.querySelectorAll(`[data-rm-editor-type][data-rm-page-number="${pageNumber}"]`)
      ).filter((element): element is HTMLElement => element instanceof HTMLElement)
    }

    if (!activeRange) {
      clearDeferredRefresh()
      getAllHeaderFooterRegions().forEach(refreshRegion)
      return
    }

    clearDeferredRefresh()
    const pageNumbersToRefreshImmediately =
      sparseMountedPageNumbers ??
      Array.from(
        { length: activeRange.endPage - activeRange.startPage + 1 },
        (_, index) => activeRange.startPage + index
      )
    const refreshedPageNumbers = new Set(pageNumbersToRefreshImmediately)

    pageNumbersToRefreshImmediately.forEach(pageNumber => {
      getHeaderFooterRegionsForPage(pageNumber).forEach(refreshRegion)
    })

    if (activeRange.startPage <= 1 && activeRange.endPage >= totalPages) return

    deferredRefreshFrame = scheduleFrame(() => {
      deferredRefreshFrame = null
      if (shouldRunDeferredRefresh && !shouldRunDeferredRefresh()) return
      getAllHeaderFooterRegions().forEach(region => {
        const pageNumber = Number(region.dataset.rmPageNumber)
        if (Number.isInteger(pageNumber) && refreshedPageNumbers.has(pageNumber)) {
          return
        }

        refreshRegion(region)
      })
    })
  }

  return {
    refresh,
    destroy: clearDeferredRefresh
  }
}

export function renderWindowedPaginationWrapper(params: WindowedRenderWrapperParams) {
  const rendererState = resolveWindowedPaginationRendererState(params.editorDom)

  return createPaginationWrapper({
    totalPages: resolveTotalPages(params.storage),
    pageFormat: params.storage.pageFormat,
    options: params.options,
    storage: params.storage,
    extensions: resolvePresentationExtensions(params.options),
    rendererState: {
      activeRange: rendererState.activeRange,
      mountedRange: rendererState.mountedRange,
      windowKey: rendererState.windowKey,
      placeholderBreakerMetricsByPage: rendererState.placeholderBreakerMetricsByPage,
      spacerHeightsByRange: rendererState.spacerHeightsByRange
    },
    onOpenEditor: params.onOpenEditor
  })
}

export function renderWindowedFirstPageHeader(params: WindowedRenderWrapperParams) {
  return createFirstPageHeader({
    totalPages: resolveTotalPages(params.storage),
    pageFormat: params.storage.pageFormat,
    options: params.options,
    storage: params.storage,
    extensions: resolvePresentationExtensions(params.options),
    onOpenEditor: params.onOpenEditor
  })
}

export function renderWindowedPaginationChrome(params: WindowedRenderWrapperParams) {
  const chromeRoot = document.createElement('div')
  chromeRoot.dataset.rmPaginationChrome = 'true'
  chromeRoot.style.display = 'contents'
  chromeRoot.append(renderWindowedFirstPageHeader(params), renderWindowedPaginationWrapper(params))
  return chromeRoot
}

export function hydrateWindowedPageBreakShells(params: WindowedHydrateParams) {
  const totalPages = resolveTotalPages(params.storage)
  const normalizedPages = Array.from(
    new Set(
      params.pageNumbers.filter(
        pageNumber => Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages
      )
    )
  ).sort((left, right) => left - right)
  const rendererState = resolveWindowedPaginationRendererState(params.editorDom)

  let hydrated = false

  normalizedPages.forEach(pageNumber => {
    const pageBreakEl = findPaginationPageBreakElement(params.editorDom, pageNumber)
    if (!(pageBreakEl instanceof HTMLElement)) return

    const didHydrate = hydratePageBreakElement({
      pageContainer: pageBreakEl,
      pageNumber,
      totalPages,
      pageFormat: params.storage.pageFormat,
      options: params.options,
      storage: params.storage,
      extensions: resolvePresentationExtensions(params.options),
      rendererState,
      onOpenEditor: params.onOpenEditor
    })

    if (didHydrate) {
      hydrated = true
    }
  })

  if (hydrated) {
    refreshPageMinHeight(params.editorDom)
  }

  return hydrated
}

export function refreshWindowedLayoutBounds(editorDom: HTMLElement) {
  refreshPageMinHeight(editorDom)
}

export function syncWindowedRootPresentation(params: {
  editorDom: HTMLElement
  options: PagesOptions
  storage: PagesStorage
}) {
  ensurePagesStyles(params.editorDom.ownerDocument)
  applyRootStyles(params.editorDom, params.storage.pageFormat, params.options)
}

export function createWindowedPaginationRenderer(params?: {
  scheduleFrame?: FrameScheduler
  cancelScheduledFrame?: FrameCanceler
  resolveCurrentEditorDom?: () => HTMLElement | null
}) {
  const chromeController = createWindowedHeaderFooterChromeController(params)
  const createDeferredRefreshGuard = (editorDom: HTMLElement) => {
    if (!params?.resolveCurrentEditorDom) return undefined
    return () => params.resolveCurrentEditorDom?.() === editorDom
  }

  const refreshPresentation = (refreshParams: WindowedPresentationParams) => {
    chromeController.refresh(refreshParams)
    refreshWindowedLayoutBounds(refreshParams.editorDom)
  }

  const hydratePageBreakShells = (hydrateParams: WindowedHydrateParams) => {
    const hydrated = hydrateWindowedPageBreakShells(hydrateParams)
    if (!hydrated) return false

    chromeController.refresh({
      editorDom: hydrateParams.editorDom,
      options: hydrateParams.options,
      storage: hydrateParams.storage,
      shouldRunDeferredRefresh:
        hydrateParams.shouldRunDeferredRefresh ?? createDeferredRefreshGuard(hydrateParams.editorDom)
    })
    return true
  }

  const refreshPresentationWithGuard = (refreshParams: WindowedPresentationParams) => {
    refreshPresentation({
      ...refreshParams,
      shouldRunDeferredRefresh:
        refreshParams.shouldRunDeferredRefresh ?? createDeferredRefreshGuard(refreshParams.editorDom)
    })
  }

  return {
    renderChrome: renderWindowedPaginationChrome,
    syncRootPresentation: syncWindowedRootPresentation,
    refreshPresentation: refreshPresentationWithGuard,
    refreshLayoutBounds: refreshWindowedLayoutBounds,
    hydratePageBreakShells,
    destroy: chromeController.destroy
  }
}
