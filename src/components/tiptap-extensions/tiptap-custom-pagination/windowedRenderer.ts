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
import { getHeaderFooterExtensions } from './utils'

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
    const headerFooterRegions = Array.from(
      editorDom.querySelectorAll('[data-rm-editor-type][data-rm-page-number]')
    ).filter((element): element is HTMLElement => element instanceof HTMLElement)

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

    if (!activeRange) {
      clearDeferredRefresh()
      headerFooterRegions.forEach(refreshRegion)
      return
    }

    const activeRegions: HTMLElement[] = []
    const deferredRegions: HTMLElement[] = []

    headerFooterRegions.forEach(region => {
      const pageNumber = Number(region.dataset.rmPageNumber)
      if (Number.isInteger(pageNumber) && pageNumber >= activeRange.startPage && pageNumber <= activeRange.endPage) {
        activeRegions.push(region)
        return
      }

      deferredRegions.push(region)
    })

    activeRegions.forEach(refreshRegion)
    clearDeferredRefresh()
    if (deferredRegions.length === 0) return

    deferredRefreshFrame = scheduleFrame(() => {
      deferredRefreshFrame = null
      if (shouldRunDeferredRefresh && !shouldRunDeferredRefresh()) return
      deferredRegions.forEach(refreshRegion)
    })
  }

  return {
    refresh,
    destroy: clearDeferredRefresh
  }
}

export function renderWindowedPaginationWrapper(params: WindowedRenderWrapperParams) {
  return createPaginationWrapper({
    totalPages: resolveTotalPages(params.storage),
    pageFormat: params.storage.pageFormat,
    options: params.options,
    storage: params.storage,
    extensions: resolvePresentationExtensions(params.options),
    rendererState: resolveWindowedPaginationRendererState(params.editorDom),
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
  chromeRoot.append(renderWindowedPaginationWrapper(params), renderWindowedFirstPageHeader(params))
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
