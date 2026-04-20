import type { Extension } from '@tiptap/core'
import type { HeaderFooterEditorType, PageFormat, PagesOptions, PagesStorage } from './types'
import { layoutPageNumberSlots } from './pageNumberSlotLayout'
import { ensurePagesStyles as ensureSharedPagesStyles } from './paginationStyles'
import {
  getHeaderFooterExtensions,
  getPageLayoutHeights,
  getPageSpacerHeight,
  isEmptyHeaderFooterHtml,
  resolveDefaultHeaderFooterMeasurement,
  resolveDisplayContent,
  resolvePageNumberSlot
} from './utils'

function normalizeHeaderFooterDisplayHtml(html: string) {
  const container = document.createElement('div')
  container.innerHTML = html

  for (const paragraph of Array.from(container.querySelectorAll('p'))) {
    if (paragraph.textContent?.length) continue
    if (paragraph.querySelector('img, table, hr, iframe, svg, video, audio, canvas, object, embed')) continue

    const displayBreak = document.createElement('br')
    displayBreak.dataset.rmDisplayEmptyLine = 'true'
    paragraph.replaceChildren(displayBreak)
  }

  return container.innerHTML
}

export function renderHeaderFooterDisplayContent(
  content: HTMLElement,
  html: string | null | undefined,
  placeholder: string
) {
  const isEmpty = isEmptyHeaderFooterHtml(html)
  content.innerHTML = ''
  content.dataset.rmEmpty = isEmpty ? 'true' : 'false'
  content.dataset.rmPlaceholder = placeholder

  if (isEmpty) {
    return
  }

  content.innerHTML = normalizeHeaderFooterDisplayHtml(html ?? '')
}

function createPageNumberSlotElement(
  options: PagesOptions,
  type: HeaderFooterEditorType,
  pageNumber: number
): HTMLElement | null {
  const slotState = resolvePageNumberSlot(options, type, pageNumber)
  if (!slotState) return null

  const slot = document.createElement('div')
  slot.className = 'rm-page-number-slot'
  slot.dataset.rmPageNumberSlot = 'true'
  slot.dataset.rmPageNumberAlign = slotState.alignment
  slot.dataset.rmPageNumberOdd = slotState.oddPage ? 'true' : 'false'
  slot.textContent = slotState.text
  slot.setAttribute('contenteditable', 'false')
  return slot
}

export type PaginationWindowRange = { startPage: number; endPage: number }

export type PageBreakerPlaceholderMetrics = {
  breakerHeight: number
  footerHeight: number
  nextHeaderHeight: number
}

export type PageShellState = 'hydrated' | 'placeholder'

export type WindowedPaginationRendererState = {
  activeRange: PaginationWindowRange | null
  mountedRange: PaginationWindowRange | null
  windowKey: string | null
  placeholderBreakerMetricsByPage: Map<number, PageBreakerPlaceholderMetrics>
}

function resolveMountedPageRange(
  totalPages: number,
  mountedRange: PaginationWindowRange | null | undefined,
  activeRange: PaginationWindowRange | null | undefined
): PaginationWindowRange {
  if (
    mountedRange &&
    mountedRange.startPage >= 1 &&
    mountedRange.endPage >= mountedRange.startPage &&
    mountedRange.startPage <= totalPages
  ) {
    return {
      startPage: mountedRange.startPage,
      endPage: Math.min(totalPages, mountedRange.endPage)
    }
  }

  if (!activeRange) {
    return {
      startPage: 1,
      endPage: totalPages
    }
  }

  return {
    startPage: Math.max(1, activeRange.startPage - 1),
    endPage: Math.min(totalPages, activeRange.endPage)
  }
}

function shouldRenderFullPageBreaker(pageNumber: number, activeRange: PaginationWindowRange | null | undefined) {
  if (!activeRange) return true
  return pageNumber >= activeRange.startPage && pageNumber <= activeRange.endPage
}

export function resolvePaginationWindowRange(editorDom: HTMLElement): PaginationWindowRange | null {
  const viewport = editorDom.closest('.document-editor-viewport') as HTMLElement | null
  if (!viewport) return null
  if (viewport.dataset.layoutWindowMode !== 'windowed') return null

  const startPage = Number(viewport.dataset.layoutWindowStart)
  const endPage = Number(viewport.dataset.layoutWindowEnd)
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage)) return null
  if (startPage < 1 || endPage < startPage) return null

  return { startPage, endPage }
}

export function resolvePaginationMountedRange(editorDom: HTMLElement): PaginationWindowRange | null {
  const viewport = editorDom.closest('.document-editor-viewport') as HTMLElement | null
  if (!viewport) return null

  const startPage = Number(viewport.dataset.layoutMountedStart)
  const endPage = Number(viewport.dataset.layoutMountedEnd)
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage)) return null
  if (startPage < 1 || endPage < startPage) return null

  return { startPage, endPage }
}

function resolveDirectChildPaginationChrome(editorDom: HTMLElement): HTMLElement | null {
  return (
    Array.from(editorDom.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.rmPaginationChrome === 'true'
    ) ?? null
  )
}

function resolvePaginationRootElement(editorDom: HTMLElement): HTMLElement | null {
  const directChildPagination = Array.from(editorDom.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.rmPagination === 'true'
  )
  if (directChildPagination) {
    return directChildPagination
  }

  const paginationChrome = resolveDirectChildPaginationChrome(editorDom)
  if (paginationChrome) {
    const nestedPagination = Array.from(paginationChrome.children).find(
      (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.rmPagination === 'true'
    )
    if (nestedPagination) {
      return nestedPagination
    }
  }

  return null
}

export function findPaginationPageBreakElement(editorDom: HTMLElement, pageNumber: number): HTMLElement | null {
  const paginationRoot = resolvePaginationRootElement(editorDom)
  const pageBreakEls = resolvePaginationPageBreakChildren(paginationRoot)
  const directIndexedRange = resolveDirectIndexedPaginationRange(paginationRoot, pageBreakEls, editorDom)

  if (directIndexedRange && pageNumber >= directIndexedRange.startPage && pageNumber <= directIndexedRange.endPage) {
    const pageBreak = pageBreakEls[pageNumber - directIndexedRange.startPage] ?? null
    if (pageBreak instanceof HTMLElement) {
      if (resolvePageBreakNumber(pageBreak) === pageNumber) {
        return pageBreak
      }
    }
  }

  return pageBreakEls.find(candidate => resolvePageBreakNumber(candidate) === pageNumber) ?? null
}

function resolvePaginationPageBreakChildren(paginationRoot: HTMLElement | null): HTMLElement[] {
  return Array.from(paginationRoot?.children ?? []).filter(
    (element): element is HTMLElement => element instanceof HTMLElement && element.classList.contains('rm-page-break')
  )
}

function resolveDirectIndexedPaginationRange(
  paginationRoot: HTMLElement | null,
  pageBreakEls: readonly HTMLElement[],
  editorDom: HTMLElement | null = null
): { startPage: number; endPage: number } | null {
  const totalPages = Number(paginationRoot?.dataset.rmTotalPages ?? '')
  if (Number.isInteger(totalPages) && totalPages > 0 && pageBreakEls.length === totalPages) {
    return {
      startPage: 1,
      endPage: totalPages
    }
  }

  const viewportMountedRange = editorDom ? resolvePaginationMountedRange(editorDom) : null
  if (viewportMountedRange && pageBreakEls.length > 0) {
    return {
      startPage: viewportMountedRange.startPage,
      endPage: Math.min(viewportMountedRange.endPage, viewportMountedRange.startPage + pageBreakEls.length - 1)
    }
  }

  const mountedStartPage = Number(paginationRoot?.dataset.rmMountedStartPage ?? '')
  const mountedEndPage = Number(paginationRoot?.dataset.rmMountedEndPage ?? '')
  if (
    Number.isInteger(mountedStartPage) &&
    Number.isInteger(mountedEndPage) &&
    mountedStartPage > 0 &&
    mountedEndPage >= mountedStartPage &&
    pageBreakEls.length === mountedEndPage - mountedStartPage + 1
  ) {
    return {
      startPage: mountedStartPage,
      endPage: mountedEndPage
    }
  }

  return null
}

function resolvePageBreakNumber(pageBreakEl: HTMLElement) {
  const pageBreakNumber = Number(pageBreakEl.dataset.rmPageNumber ?? '')
  if (Number.isInteger(pageBreakNumber) && pageBreakNumber > 0) {
    return pageBreakNumber
  }

  const page = pageBreakEl.querySelector('.page[data-rm-page-number]') as HTMLElement | null
  const pageNumber = Number(page?.dataset.rmPageNumber ?? '')
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null
}

export function resolvePageBreakShellState(pageBreakEl: HTMLElement): PageShellState {
  const explicitState = pageBreakEl.dataset.rmPageShellState
  if (explicitState === 'hydrated' || explicitState === 'placeholder') {
    return explicitState
  }

  const breaker = pageBreakEl.querySelector('.breaker') as HTMLElement | null
  return breaker?.dataset.rmBreakerMode === 'placeholder' ? 'placeholder' : 'hydrated'
}

export function isHydratedPageBreakShell(pageBreakEl: HTMLElement): boolean {
  return resolvePageBreakShellState(pageBreakEl) === 'hydrated'
}

function setPageBreakShellState(pageBreakEl: HTMLElement, shellState: PageShellState) {
  pageBreakEl.dataset.rmPageShellState = shellState
}

export function resolvePageBreakerPlaceholderMetrics(
  editorDom: HTMLElement
): Map<number, PageBreakerPlaceholderMetrics> {
  const placeholderMetrics = new Map<number, PageBreakerPlaceholderMetrics>()
  const paginationRoot = resolvePaginationRootElement(editorDom)
  const pageBreakEls = resolvePaginationPageBreakChildren(paginationRoot)
  const directIndexedRange = resolveDirectIndexedPaginationRange(paginationRoot, pageBreakEls, editorDom)

  pageBreakEls.forEach((pageBreakEl, index) => {
    const breaker = pageBreakEl.querySelector('.breaker') as HTMLElement | null
    const pageNumber =
      directIndexedRange === null ? resolvePageBreakNumber(pageBreakEl) : directIndexedRange.startPage + index
    if (pageNumber === null || pageNumber < 1 || !(breaker instanceof HTMLElement)) return

    const dataHeight = Number(breaker.dataset.rmBreakerPlaceholderHeight ?? '')
    const styleHeight = Number.parseFloat(breaker.style.height || '')
    let breakerHeight = breaker.offsetHeight
    if (Number.isFinite(dataHeight) && dataHeight >= 0) {
      breakerHeight = dataHeight
    } else if (Number.isFinite(styleHeight) && styleHeight >= 0) {
      breakerHeight = styleHeight
    }
    const footerDataHeight = Number(breaker.dataset.rmBreakerFooterHeight ?? '')
    const nextHeaderDataHeight = Number(breaker.dataset.rmBreakerNextHeaderHeight ?? '')
    const footer =
      Number.isFinite(footerDataHeight) && footerDataHeight >= 0
        ? null
        : ((pageBreakEl.querySelector(
            `[data-rm-editor-type="footer"][data-rm-page-number="${pageNumber}"]`
          ) as HTMLElement | null) ?? null)
    const nextHeader =
      Number.isFinite(nextHeaderDataHeight) && nextHeaderDataHeight >= 0
        ? null
        : ((pageBreakEl.querySelector(
            `[data-rm-editor-type="header"][data-rm-page-number="${pageNumber + 1}"]`
          ) as HTMLElement | null) ?? null)
    const footerHeight =
      Number.isFinite(footerDataHeight) && footerDataHeight >= 0 ? footerDataHeight : (footer?.offsetHeight ?? 0)
    const nextHeaderHeight =
      Number.isFinite(nextHeaderDataHeight) && nextHeaderDataHeight >= 0
        ? nextHeaderDataHeight
        : (nextHeader?.offsetHeight ?? 0)

    if (Number.isFinite(breakerHeight) && breakerHeight >= 0) {
      placeholderMetrics.set(pageNumber, {
        breakerHeight,
        footerHeight: Math.max(0, footerHeight),
        nextHeaderHeight: Math.max(0, nextHeaderHeight)
      })
    }
  })

  return placeholderMetrics
}

export function resolveWindowedPaginationRendererState(editorDom: HTMLElement): WindowedPaginationRendererState {
  const viewport = editorDom.closest('.document-editor-viewport') as HTMLElement | null
  return {
    activeRange: resolvePaginationWindowRange(editorDom),
    mountedRange: resolvePaginationMountedRange(editorDom),
    windowKey: viewport?.dataset.layoutWindowKey ?? null,
    placeholderBreakerMetricsByPage: resolvePageBreakerPlaceholderMetrics(editorDom)
  }
}

function createPlaceholderBreaker(params: { breakerHeight: number; footerHeight: number; nextHeaderHeight: number }) {
  const { breakerHeight, footerHeight, nextHeaderHeight } = params
  const breaker = document.createElement('div')
  breaker.className = 'breaker'
  breaker.dataset.rmBreakerMode = 'placeholder'
  breaker.dataset.rmBreakerPlaceholderHeight = String(Math.max(0, breakerHeight))
  breaker.dataset.rmBreakerFooterHeight = String(Math.max(0, footerHeight))
  breaker.dataset.rmBreakerNextHeaderHeight = String(Math.max(0, nextHeaderHeight))
  if (breakerHeight > 0) {
    breaker.style.height = `${breakerHeight}px`
  }
  return breaker
}

function resolveDefaultBreakerHeight(params: {
  pageNumber: number
  totalPages: number
  pageFormat: PageFormat
  options: PagesOptions
  storage: PagesStorage
}) {
  const { pageNumber, totalPages, pageFormat, options, storage } = params
  const currentHeaderHeight = resolveDefaultHeaderFooterMeasurement(storage, options, 'header', pageNumber, totalPages)
  const currentFooterHeight = resolveDefaultHeaderFooterMeasurement(storage, options, 'footer', pageNumber, totalPages)
  const currentLayout = getPageLayoutHeights(pageFormat, storage, currentHeaderHeight, currentFooterHeight)
  if (pageNumber >= totalPages) {
    return currentLayout.footerReserved
  }

  const nextHeaderHeight = resolveDefaultHeaderFooterMeasurement(storage, options, 'header', pageNumber + 1, totalPages)
  const nextFooterHeight = resolveDefaultHeaderFooterMeasurement(storage, options, 'footer', pageNumber + 1, totalPages)
  const nextLayout = getPageLayoutHeights(pageFormat, storage, nextHeaderHeight, nextFooterHeight)
  return currentLayout.footerReserved + storage.pageGap + nextLayout.headerReserved
}

function resolveDefaultPlaceholderBreakerMetrics(params: {
  pageNumber: number
  totalPages: number
  pageFormat: PageFormat
  options: PagesOptions
  storage: PagesStorage
}) {
  const { pageNumber, totalPages, pageFormat, options, storage } = params
  const currentHeaderHeight = resolveDefaultHeaderFooterMeasurement(storage, options, 'header', pageNumber, totalPages)
  const currentFooterHeight = resolveDefaultHeaderFooterMeasurement(storage, options, 'footer', pageNumber, totalPages)
  const currentLayout = getPageLayoutHeights(pageFormat, storage, currentHeaderHeight, currentFooterHeight)
  const nextLayout =
    pageNumber >= totalPages
      ? currentLayout
      : getPageLayoutHeights(
          pageFormat,
          storage,
          resolveDefaultHeaderFooterMeasurement(storage, options, 'header', pageNumber + 1, totalPages),
          resolveDefaultHeaderFooterMeasurement(storage, options, 'footer', pageNumber + 1, totalPages)
        )

  return {
    breakerHeight: resolveDefaultBreakerHeight(params),
    footerHeight: currentLayout.footerReserved,
    nextHeaderHeight: pageNumber >= totalPages ? 0 : nextLayout.headerReserved
  }
}

/**
 * Page N break footer is for page N; the header in the same breaker is for page N+1.
 * Physical page 1’s header is not here — it is a separate `.rm-first-page-header` (see `createFirstPageHeader`).
 */
function createFullPageBreaker(params: {
  pageNumber: number
  totalPages: number
  pageFormat: PageFormat
  options: PagesOptions
  storage: PagesStorage
  extensions: Extension[]
  onOpenEditor?: (
    type: HeaderFooterEditorType,
    pageNumber: number,
    target: HTMLElement,
    clickPosition?: { clientX: number; clientY: number }
  ) => void
}) {
  const { pageNumber, totalPages, pageFormat, options, storage, extensions, onOpenEditor } = params
  const breaker = document.createElement('div')
  breaker.className = 'breaker'

  const footer = createHeaderFooterRegion({
    type: 'footer',
    pageNumber,
    totalPages,
    pageFormat,
    options,
    storage,
    extensions,
    onOpenEditor
  })

  const pageGap = document.createElement('div')
  pageGap.className = 'rm-page-gap'
  pageGap.style.height = `${storage.pageGap}px`
  pageGap.addEventListener('mousedown', event => {
    event.preventDefault()
    event.stopPropagation()
  })

  const nextHeader = createHeaderFooterRegion({
    type: 'header',
    pageNumber: pageNumber + 1,
    totalPages,
    pageFormat,
    options,
    storage,
    extensions,
    onOpenEditor
  })

  breaker.append(footer, pageGap, nextHeader)
  return breaker
}

function syncPageNumberSlotLayout(
  layout: HTMLElement,
  options: PagesOptions,
  type: HeaderFooterEditorType,
  pageNumber: number
): HTMLElement | null {
  layout.querySelectorAll('[data-rm-page-number-slot="true"]').forEach(element => {
    element.remove()
  })

  const pageNumberSlot = createPageNumberSlotElement(options, type, pageNumber)
  if (pageNumberSlot) {
    layout.dataset.rmPageNumberActive = 'true'
    layout.dataset.rmPageNumberAlign = pageNumberSlot.dataset.rmPageNumberAlign ?? 'center'
    layout.dataset.rmPageNumberRegion = type
    layout.dataset.rmPageNumberOdd = pageNumberSlot.dataset.rmPageNumberOdd ?? 'false'
    layout.append(pageNumberSlot)
    return pageNumberSlot
  }

  delete layout.dataset.rmPageNumberActive
  delete layout.dataset.rmPageNumberAlign
  delete layout.dataset.rmPageNumberRegion
  delete layout.dataset.rmPageNumberOdd
  return null
}

export function refreshHeaderFooterRegionDisplay(params: {
  region: HTMLElement
  type: HeaderFooterEditorType
  pageNumber: number
  totalPages: number
  options: PagesOptions
  storage: PagesStorage
  extensions: Extension[]
}) {
  const { region, type, pageNumber, totalPages, options, storage, extensions } = params
  if (region.dataset.rmOverlayActive === 'true') return

  const contentSelector = type === 'header' ? '.rm-page-header-content' : '.rm-page-footer-content'
  const content = region.querySelector(contentSelector) as HTMLElement | null
  const layout = region.querySelector('.rm-page-region-layout') as HTMLElement | null
  if (!(content instanceof HTMLElement) || !(layout instanceof HTMLElement)) return

  const uiLabel =
    type === 'header' ? (options.uiLabels?.headerLabel ?? 'Header') : (options.uiLabels?.footerLabel ?? 'Footer')
  const displayContent = resolveDisplayContent(
    storage,
    options,
    type,
    pageNumber,
    totalPages,
    getHeaderFooterExtensions(extensions)
  )

  renderHeaderFooterDisplayContent(content, displayContent.html, uiLabel)
  const pageNumberSlot = syncPageNumberSlotLayout(layout, options, type, pageNumber)
  const hasVisibleRegionContent = !isEmptyHeaderFooterHtml(displayContent.html) || pageNumberSlot !== null
  region.dataset.rmHasVisibleContent = hasVisibleRegionContent ? 'true' : 'false'
  requestAnimationFrame(() => layoutPageNumberSlots(region))
}

function createPageImageOverlayLayer(params: {
  pageNumber: number
  pageBodyHeight: number
  layer: 'behind' | 'floating' | 'front'
}): HTMLElement {
  const overlayLayer = document.createElement('div')
  overlayLayer.className = 'rm-page-image-overlay-layer'
  overlayLayer.dataset.rmPageImageOverlay = 'true'
  overlayLayer.dataset.rmPageNumber = String(params.pageNumber)
  overlayLayer.dataset.rmImageLayer = params.layer
  overlayLayer.style.height = `var(--rm-page-body-${params.pageNumber}, ${params.pageBodyHeight}px)`
  overlayLayer.style.top = `calc(-1 * var(--rm-page-body-${params.pageNumber}, ${params.pageBodyHeight}px))`
  return overlayLayer
}

export function ensurePagesStyles(targetDocument: Document) {
  ensureSharedPagesStyles(targetDocument)
}

export function applyRootStyles(targetNode: HTMLElement, pageFormat: PageFormat, options: PagesOptions) {
  targetNode.classList.add('rm-pages-root')
  targetNode.style.width = `${pageFormat.width}px`
  targetNode.style.paddingLeft = `${pageFormat.margins.left}px`
  targetNode.style.paddingRight = `${pageFormat.margins.right}px`
  targetNode.style.border = `1px solid ${options.pageBreakBackground ?? '#f3f4f6'}`
  targetNode.style.setProperty('--rm-page-width', `${pageFormat.width}px`)
  targetNode.style.setProperty('--rm-page-margin-top', `${pageFormat.margins.top}px`)
  targetNode.style.setProperty('--rm-page-margin-bottom', `${pageFormat.margins.bottom}px`)
  targetNode.style.setProperty('--rm-page-margin-left', `${pageFormat.margins.left}px`)
  targetNode.style.setProperty('--rm-page-margin-right', `${pageFormat.margins.right}px`)
  targetNode.style.setProperty('--rm-page-height', `${pageFormat.height}px`)
  targetNode.style.setProperty('--rm-header-height', `${options.headerHeight}px`)
  targetNode.style.setProperty('--rm-footer-height', `${options.footerHeight}px`)
  targetNode.style.setProperty(
    '--rm-header-top-margin',
    `${options.headerTopMargin ?? Math.round(pageFormat.margins.top / 2)}px`
  )
  targetNode.style.setProperty(
    '--rm-footer-bottom-margin',
    `${options.footerBottomMargin ?? Math.round(pageFormat.margins.bottom / 2)}px`
  )
  targetNode.style.setProperty('--rm-page-break-background', options.pageBreakBackground ?? '#f3f4f6')
}

export function refreshPageMinHeight(targetNode: HTMLElement) {
  const apply = () => {
    const paginationElement = resolvePaginationRootElement(targetNode)
    const lastPaginationChild = paginationElement?.lastElementChild as HTMLElement | null
    if (!lastPaginationChild) return

    const pageBreak = lastPaginationChild.classList.contains('rm-page-break') ? lastPaginationChild : null
    const measuredTarget = pageBreak
      ? ((pageBreak.querySelector('.breaker') as HTMLElement | null) ?? lastPaginationChild)
      : lastPaginationChild

    // Walk the offsetParent chain to accumulate the total vertical offset from targetNode.
    // measuredTarget.offsetTop is relative to its offsetParent (e.g. .rm-page-break), not targetNode.
    let totalOffset = measuredTarget.offsetTop + measuredTarget.offsetHeight
    let currentParent: HTMLElement | null = measuredTarget.offsetParent as HTMLElement | null
    while (currentParent && currentParent !== targetNode) {
      totalOffset += currentParent.offsetTop
      currentParent = currentParent.offsetParent as HTMLElement | null
    }

    const candidates: number[] = [totalOffset]
    const rootRect = targetNode.getBoundingClientRect()
    const scrollTop = targetNode.scrollTop

    const pushRectBottomIfLaidOut = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect()
      if (rect.bottom <= rect.top) return
      candidates.push(rect.bottom - rootRect.top + scrollTop)
    }

    pushRectBottomIfLaidOut(measuredTarget)
    if (pageBreak instanceof HTMLElement) {
      const pageNumber = pageBreak.dataset.rmPageNumber
      if (pageNumber) {
        const footer = pageBreak.querySelector(
          `.rm-page-footer-region[data-rm-page-number="${pageNumber}"]`
        ) as HTMLElement | null
        if (footer) {
          pushRectBottomIfLaidOut(footer)
        }
      }
    }

    const minHeight = Math.max(...candidates)
    // Ceil subpixels; extra padding covers focus/caret reflow and border rounding so the paper
    // background still covers the last footer after layout settles.
    targetNode.style.minHeight = `${Math.ceil(minHeight) + 8}px`
  }

  apply()
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(apply)
  }
}

function blockInactiveRegion(event: Event, region: HTMLElement) {
  if (region.dataset.rmOverlayActive === 'true') return
  if (region.dataset.rmHasVisibleContent !== 'true') return

  event.preventDefault()
  event.stopPropagation()
}

export function createHeaderFooterRegion(params: {
  type: HeaderFooterEditorType
  pageNumber: number
  totalPages: number
  pageFormat: PageFormat
  options: PagesOptions
  storage: PagesStorage
  extensions: Extension[]
  onOpenEditor?: (
    type: HeaderFooterEditorType,
    pageNumber: number,
    target: HTMLElement,
    clickPosition?: { clientX: number; clientY: number }
  ) => void
  firstPage?: boolean
}): HTMLElement {
  const { type, pageNumber, totalPages, options, storage, extensions, onOpenEditor, firstPage } = params
  const uiLabels = {
    headerLabel: options.uiLabels?.headerLabel ?? 'Header',
    footerLabel: options.uiLabels?.footerLabel ?? 'Footer'
  }
  const displayContent = resolveDisplayContent(
    storage,
    options,
    type,
    pageNumber,
    totalPages,
    getHeaderFooterExtensions(extensions)
  )

  const region = document.createElement('div')
  if (type === 'header') {
    region.className = firstPage ? 'rm-first-page-header' : 'rm-page-header-region'
  } else {
    region.className = 'rm-page-footer-region'
  }
  region.dataset.rmPageNumber = String(pageNumber)
  region.dataset.rmEditorType = type
  region.dataset.rmEditable = 'true'
  region.setAttribute('contenteditable', 'false')
  region.style.setProperty(
    type === 'header' ? '--rm-header-divider-accent' : '--rm-footer-divider-accent',
    type === 'header'
      ? (options.headerAccentColor ?? options.accentColor ?? '#6366f1')
      : (options.footerAccentColor ?? options.accentColor ?? '#6366f1')
  )

  const inner = document.createElement('div')
  inner.className = type === 'header' ? 'rm-page-header' : 'rm-page-footer'
  inner.setAttribute('contenteditable', 'false')

  const content = document.createElement('div')
  content.className = type === 'header' ? 'rm-page-header-content' : 'rm-page-footer-content'
  content.dataset.rmPageNumberBody = 'true'
  content.setAttribute('contenteditable', 'false')
  renderHeaderFooterDisplayContent(
    content,
    displayContent.html,
    type === 'header' ? uiLabels.headerLabel : uiLabels.footerLabel
  )
  const bodyLayout = document.createElement('div')
  bodyLayout.className = 'rm-page-region-layout'
  bodyLayout.dataset.rmPageNumberLayout = 'true'
  bodyLayout.append(content)
  const pageNumberSlot = syncPageNumberSlotLayout(bodyLayout, options, type, pageNumber)
  const hasVisibleRegionContent = !isEmptyHeaderFooterHtml(displayContent.html) || pageNumberSlot !== null
  region.dataset.rmHasVisibleContent = hasVisibleRegionContent ? 'true' : 'false'
  inner.append(bodyLayout)
  region.appendChild(inner)
  requestAnimationFrame(() => layoutPageNumberSlots(region))

  region.addEventListener('selectstart', event => {
    blockInactiveRegion(event, region)
  })

  region.addEventListener('click', event => {
    if (event.detail !== 1) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    onOpenEditor?.(type, pageNumber, region, {
      clientX: event.clientX,
      clientY: event.clientY
    })
  })

  return region
}

export function createPageBreakElement(params: {
  pageNumber: number
  totalPages: number
  pageFormat: PageFormat
  options: PagesOptions
  storage: PagesStorage
  extensions: Extension[]
  hydratedRange?: PaginationWindowRange | null
  activeRange?: PaginationWindowRange | null
  placeholderBreakerMetrics?: PageBreakerPlaceholderMetrics | null
  onOpenEditor?: (
    type: HeaderFooterEditorType,
    pageNumber: number,
    target: HTMLElement,
    clickPosition?: { clientX: number; clientY: number }
  ) => void
}): HTMLElement {
  const {
    pageNumber,
    totalPages,
    pageFormat,
    options,
    storage,
    extensions,
    hydratedRange,
    activeRange,
    placeholderBreakerMetrics,
    onOpenEditor
  } = params

  const pageContainer = document.createElement('div')
  pageContainer.className = 'rm-page-break'
  pageContainer.dataset.rmPageNumber = String(pageNumber)
  const effectiveHydratedRange = hydratedRange ?? activeRange ?? null
  const shellState: PageShellState = shouldRenderFullPageBreaker(pageNumber, effectiveHydratedRange)
    ? 'hydrated'
    : 'placeholder'
  setPageBreakShellState(pageContainer, shellState)

  const page = document.createElement('div')
  page.className = 'page'
  page.dataset.rmPageNumber = String(pageNumber)
  const defaultHeaderHeight = resolveDefaultHeaderFooterMeasurement(storage, options, 'header', pageNumber, totalPages)
  const defaultFooterHeight = resolveDefaultHeaderFooterMeasurement(storage, options, 'footer', pageNumber, totalPages)
  page.style.setProperty(
    'margin-top',
    `var(--rm-page-content-${pageNumber}, ${getPageSpacerHeight(
      pageFormat,
      storage,
      pageNumber,
      defaultHeaderHeight,
      defaultFooterHeight
    )}px)`
  )

  const defaultBodyHeight = getPageLayoutHeights(
    pageFormat,
    storage,
    defaultHeaderHeight,
    defaultFooterHeight
  ).bodyHeight
  const pageBodyIntrinsicHeight = `var(--rm-page-body-${pageNumber}, ${defaultBodyHeight}px)`
  const bodyLayer = document.createElement('div')
  bodyLayer.className = 'rm-page-body-layer'
  bodyLayer.dataset.rmPageBody = 'true'
  bodyLayer.dataset.rmPageBodyPresentation = 'visible'
  bodyLayer.dataset.rmPageNumber = String(pageNumber)
  page.style.setProperty('--rm-page-body-intrinsic-height', pageBodyIntrinsicHeight)
  bodyLayer.style.setProperty('--rm-page-body-intrinsic-height', pageBodyIntrinsicHeight)
  bodyLayer.style.height = `var(--rm-page-body-${pageNumber}, ${defaultBodyHeight}px)`
  bodyLayer.style.top = `calc(-1 * var(--rm-page-body-${pageNumber}, ${defaultBodyHeight}px))`
  const behindImageLayer = createPageImageOverlayLayer({
    pageNumber,
    pageBodyHeight: defaultBodyHeight,
    layer: 'behind'
  })
  const floatingImageLayer = createPageImageOverlayLayer({
    pageNumber,
    pageBodyHeight: defaultBodyHeight,
    layer: 'floating'
  })
  const frontImageLayer = createPageImageOverlayLayer({
    pageNumber,
    pageBodyHeight: defaultBodyHeight,
    layer: 'front'
  })
  behindImageLayer.style.setProperty('--rm-page-body-intrinsic-height', pageBodyIntrinsicHeight)
  floatingImageLayer.style.setProperty('--rm-page-body-intrinsic-height', pageBodyIntrinsicHeight)
  frontImageLayer.style.setProperty('--rm-page-body-intrinsic-height', pageBodyIntrinsicHeight)
  page.append(behindImageLayer, bodyLayer, floatingImageLayer, frontImageLayer)

  const breaker =
    shellState === 'placeholder'
      ? createPlaceholderBreaker(
          placeholderBreakerMetrics ??
            resolveDefaultPlaceholderBreakerMetrics({
              pageNumber,
              totalPages,
              pageFormat,
              options,
              storage
            })
        )
      : createFullPageBreaker({
          pageNumber,
          totalPages,
          pageFormat,
          options,
          storage,
          extensions,
          onOpenEditor
        })
  pageContainer.append(page, breaker)

  return pageContainer
}

export function createPaginationWrapper(params: {
  totalPages: number
  pageFormat: PageFormat
  options: PagesOptions
  storage: PagesStorage
  extensions: Extension[]
  rendererState?: Pick<
    WindowedPaginationRendererState,
    'activeRange' | 'mountedRange' | 'windowKey' | 'placeholderBreakerMetricsByPage'
  > | null
  onOpenEditor?: (
    type: HeaderFooterEditorType,
    pageNumber: number,
    target: HTMLElement,
    clickPosition?: { clientX: number; clientY: number }
  ) => void
}): HTMLElement {
  const { totalPages, pageFormat, options, storage, extensions, rendererState, onOpenEditor } = params
  const wrapper = document.createElement('div')
  wrapper.dataset.rmPagination = 'true'
  wrapper.dataset.rmTotalPages = String(Math.max(1, totalPages))
  wrapper.id = 'pages'
  wrapper.className = 'rm-pages-wrapper'

  const mountedRange = resolveMountedPageRange(
    totalPages,
    rendererState?.activeRange ? rendererState.mountedRange : null,
    rendererState?.activeRange
  )
  wrapper.dataset.rmMountedStartPage = String(mountedRange.startPage)
  wrapper.dataset.rmMountedEndPage = String(mountedRange.endPage)

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const pageBreakElement = createPageBreakElement({
      pageNumber,
      totalPages,
      pageFormat,
      options,
      storage,
      extensions,
      hydratedRange: mountedRange,
      placeholderBreakerMetrics: rendererState?.placeholderBreakerMetricsByPage.get(pageNumber) ?? null,
      onOpenEditor
    })
    applyWindowAttributesToPageBreak(
      pageBreakElement,
      rendererState?.activeRange ?? null,
      rendererState?.windowKey ?? null
    )
    wrapper.appendChild(pageBreakElement)
  }

  return wrapper
}

export function hydratePageBreakElement(params: {
  pageContainer: HTMLElement
  pageNumber: number
  totalPages: number
  pageFormat: PageFormat
  options: PagesOptions
  storage: PagesStorage
  extensions: Extension[]
  rendererState?: Pick<WindowedPaginationRendererState, 'activeRange' | 'windowKey'> | null
  onOpenEditor?: (
    type: HeaderFooterEditorType,
    pageNumber: number,
    target: HTMLElement,
    clickPosition?: { clientX: number; clientY: number }
  ) => void
}) {
  const breaker = params.pageContainer.querySelector('.breaker') as HTMLElement | null
  if (!(breaker instanceof HTMLElement)) return false
  if (breaker.dataset.rmBreakerMode !== 'placeholder') return false

  const nextBreaker = createFullPageBreaker({
    pageNumber: params.pageNumber,
    totalPages: params.totalPages,
    pageFormat: params.pageFormat,
    options: params.options,
    storage: params.storage,
    extensions: params.extensions,
    onOpenEditor: params.onOpenEditor
  })

  breaker.replaceWith(nextBreaker)
  setPageBreakShellState(params.pageContainer, 'hydrated')
  applyWindowAttributesToPageBreak(
    params.pageContainer,
    params.rendererState?.activeRange ?? null,
    params.rendererState?.windowKey ?? null
  )
  return true
}

export function applyWindowAttributesToPageBreak(
  pageBreakEl: HTMLElement,
  activeRange: PaginationWindowRange | null,
  windowKey: string | null
) {
  const resolveWindowPosition = (pageNumber: number) => {
    if (!activeRange) return 'inside'
    if (pageNumber < activeRange.startPage) return 'before'
    if (pageNumber > activeRange.endPage) return 'after'
    return 'inside'
  }

  const markerTargets = pageBreakEl.querySelectorAll<HTMLElement>(
    '.page[data-rm-page-number], .rm-page-body-layer[data-rm-page-number], .rm-page-image-overlay-layer[data-rm-page-number], .rm-page-header-region[data-rm-page-number], .rm-page-footer-region[data-rm-page-number]'
  )

  const pageBreakNumber = resolvePageBreakNumber(pageBreakEl)
  if (pageBreakNumber !== null && pageBreakNumber > 0) {
    const isActive =
      activeRange === null || (pageBreakNumber >= activeRange.startPage && pageBreakNumber <= activeRange.endPage)
    pageBreakEl.dataset.layoutWindowActive = isActive ? 'true' : 'false'
    pageBreakEl.dataset.layoutWindowPosition = resolveWindowPosition(pageBreakNumber)
    if (windowKey) {
      pageBreakEl.dataset.layoutWindowKey = windowKey
    } else {
      delete pageBreakEl.dataset.layoutWindowKey
    }
  }

  markerTargets.forEach(target => {
    const pageNumber = Number(target.dataset.rmPageNumber ?? '')
    if (!Number.isInteger(pageNumber) || pageNumber < 1) return
    const isActive = activeRange === null || (pageNumber >= activeRange.startPage && pageNumber <= activeRange.endPage)
    target.dataset.layoutWindowActive = isActive ? 'true' : 'false'
    target.dataset.layoutWindowPosition = resolveWindowPosition(pageNumber)
    if (windowKey) {
      target.dataset.layoutWindowKey = windowKey
    } else {
      delete target.dataset.layoutWindowKey
    }
  })
}

/**
 * Shell for page 1’s header (class `rm-first-page-header`). Always mounted next to `.rm-pages-wrapper`
 * via `renderWindowedPaginationChrome`, not inside the first `rm-page-break`. Content uses the
 * `default` or `firstPage` storage variant depending on `differentFirstPage`, not a different DOM shape.
 */
export function createFirstPageHeader(params: {
  totalPages: number
  pageFormat: PageFormat
  options: PagesOptions
  storage: PagesStorage
  extensions: Extension[]
  onOpenEditor?: (
    type: HeaderFooterEditorType,
    pageNumber: number,
    target: HTMLElement,
    clickPosition?: { clientX: number; clientY: number }
  ) => void
}): HTMLElement {
  return createHeaderFooterRegion({
    type: 'header',
    pageNumber: 1,
    totalPages: params.totalPages,
    pageFormat: params.pageFormat,
    options: params.options,
    storage: params.storage,
    extensions: params.extensions,
    onOpenEditor: params.onOpenEditor,
    firstPage: true
  })
}
