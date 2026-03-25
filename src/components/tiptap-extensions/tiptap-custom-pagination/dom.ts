import type { Extension } from '@tiptap/core'
import type { HeaderFooterEditorType, PageFormat, PagesOptions, PagesStorage } from './types'
import { layoutPageNumberSlots } from './pageNumberSlotLayout'
import {
  getHeaderFooterExtensions,
  getPageLayoutHeights,
  getPageSpacerHeight,
  resolveDisplayContent,
  resolvePageNumberSlot
} from './utils'

const STYLE_ATTR = 'data-rm-pages-style'

export function isEmptyHeaderFooterHtml(html: string | null | undefined) {
  if (!html) return true

  const container = document.createElement('div')
  container.innerHTML = html
  if ((container.textContent ?? '').length > 0) return false

  return container.querySelector('img, table, hr, iframe, svg, video, audio, canvas, object, embed') === null
}

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

export type WindowedPaginationRendererState = {
  activeRange: PaginationWindowRange | null
  mountedRange: PaginationWindowRange | null
  windowKey: string | null
  placeholderBreakerMetricsByPage: Map<number, PageBreakerPlaceholderMetrics>
  spacerHeightsByRange: Map<string, number>
}

function createPageRangeKey(startPage: number, endPage: number) {
  return `${startPage}-${endPage}`
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
  return pageNumber >= activeRange.startPage - 1 && pageNumber <= activeRange.endPage
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

function resolvePageRangeSpacerHeights(editorDom: HTMLElement): Map<string, number> {
  const spacerHeights = new Map<string, number>()
  const paginationRoot = resolvePaginationRootElement(editorDom)
  if (!(paginationRoot instanceof HTMLElement)) {
    return spacerHeights
  }

  Array.from(paginationRoot.children).forEach(child => {
    if (!(child instanceof HTMLElement) || !child.classList.contains('rm-page-spacer')) {
      return
    }

    const startPage = Number(child.dataset.rmPageRangeStart ?? '')
    const endPage = Number(child.dataset.rmPageRangeEnd ?? '')
    if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage < startPage) {
      return
    }

    const dataHeight = Number.parseFloat(child.dataset.rmPageRangeHeight ?? '')
    const styleHeight = Number.parseFloat(child.style.height || '')
    let resolvedHeight = child.offsetHeight
    if (Number.isFinite(dataHeight) && dataHeight >= 0) {
      resolvedHeight = dataHeight
    } else if (Number.isFinite(styleHeight) && styleHeight >= 0) {
      resolvedHeight = styleHeight
    }
    if (!Number.isFinite(resolvedHeight) || resolvedHeight < 0) {
      return
    }

    spacerHeights.set(createPageRangeKey(startPage, endPage), resolvedHeight)
  })

  return spacerHeights
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
    placeholderBreakerMetricsByPage: resolvePageBreakerPlaceholderMetrics(editorDom),
    spacerHeightsByRange: resolvePageRangeSpacerHeights(editorDom)
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
  const currentLayout = getPageLayoutHeights(pageFormat, storage, options.headerHeight, options.footerHeight)
  if (pageNumber >= totalPages) {
    return currentLayout.footerReserved
  }

  const nextLayout = getPageLayoutHeights(pageFormat, storage, options.headerHeight, options.footerHeight)
  return currentLayout.footerReserved + storage.pageGap + nextLayout.headerReserved
}

function createPageRangeSpacer(params: {
  startPage: number
  endPage: number
  totalPages: number
  pageFormat: PageFormat
  options: PagesOptions
  storage: PagesStorage
  placeholderBreakerMetricsByPage: Map<number, PageBreakerPlaceholderMetrics>
  spacerHeightsByRange: Map<string, number>
}) {
  const {
    startPage,
    endPage,
    totalPages,
    pageFormat,
    options,
    storage,
    placeholderBreakerMetricsByPage,
    spacerHeightsByRange
  } = params
  const spacer = document.createElement('div')
  spacer.className = 'rm-page-spacer'
  spacer.dataset.rmPageRangeStart = String(startPage)
  spacer.dataset.rmPageRangeEnd = String(endPage)
  const pageSegmentHeights: number[] = []

  const preservedHeight = spacerHeightsByRange.get(createPageRangeKey(startPage, endPage))
  let totalHeight = Number.isFinite(preservedHeight) ? (preservedHeight ?? 0) : 0
  if (!Number.isFinite(totalHeight) || totalHeight <= 0) {
    totalHeight = 0
  }

  for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
    const pageHeight =
      getPageSpacerHeight(pageFormat, storage, pageNumber, options.headerHeight, options.footerHeight) +
      Math.max(
        0,
        placeholderBreakerMetricsByPage.get(pageNumber)?.breakerHeight ??
          resolveDefaultBreakerHeight({
            pageNumber,
            totalPages,
            pageFormat,
            options,
            storage
          })
      )
    pageSegmentHeights.push(pageHeight)

    if (!Number.isFinite(preservedHeight) || preservedHeight <= 0) {
      totalHeight += pageHeight
    }
  }

  if (totalHeight > 0) {
    spacer.style.height = `${totalHeight}px`
  }
  spacer.dataset.rmPageRangeHeight = String(Math.max(0, totalHeight))
  spacer.dataset.rmPageSegmentHeights = pageSegmentHeights.join(',')

  return spacer
}

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

export function ensurePagesStyles(targetDocument: Document) {
  if (targetDocument.head.querySelector(`[${STYLE_ATTR}]`)) return

  const style = targetDocument.createElement('style')
  style.setAttribute(STYLE_ATTR, '')
  style.textContent = `
    .rm-pages-root {
      position: relative;
      box-sizing: border-box;
      background: #fff;
      overflow: visible;
    }
    .rm-pages-root .rm-page-break {
      position: relative;
    }
    .rm-pages-root .rm-page-spacer {
      position: relative;
      float: left;
      clear: both;
      width: 100%;
      height: 0;
    }
    .rm-pages-root .page {
      position: relative;
      float: left;
      clear: both;
      width: 0;
      height: 0;
      overflow: visible;
    }
    .rm-pages-root .rm-page-body-layer {
      position: absolute;
      left: calc(-1 * var(--rm-page-margin-left));
      width: calc(var(--rm-page-width) + var(--rm-page-margin-left) + var(--rm-page-margin-right));
      box-sizing: border-box;
      pointer-events: none;
      background: transparent;
      z-index: 1;
    }
    .rm-pages-root .breaker {
      position: relative;
      float: left;
      clear: both;
      width: calc(100% + var(--rm-page-margin-left) + var(--rm-page-margin-right));
      margin-left: calc(-1 * var(--rm-page-margin-left));
      margin-right: calc(-1 * var(--rm-page-margin-right));
      z-index: 2;
    }
    .rm-pages-root .rm-page-gap {
      position: relative;
      width: 100%;
      background: var(--rm-page-break-background);
      box-sizing: border-box;
    }
    .rm-pages-root .rm-page-break:last-child .rm-page-gap,
    .rm-pages-root .rm-page-break:last-child .rm-page-header-region {
      display: none;
    }
    .rm-pages-root .rm-page-header-region,
    .rm-pages-root .rm-page-footer-region,
    .rm-pages-root .rm-first-page-header {
      position: relative;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      background: inherit;
      color: #5f6368;
      user-select: none;
      -webkit-user-select: none;
    }
    .rm-pages-root .rm-first-page-header {
      width: calc(100% + var(--rm-page-margin-left) + var(--rm-page-margin-right));
      margin-left: calc(-1 * var(--rm-page-margin-left));
      margin-right: calc(-1 * var(--rm-page-margin-right));
      z-index: 1;
      pointer-events: none;
    }
    .rm-pages-root .rm-first-page-header > .rm-page-header {
      pointer-events: none;
    }
    .rm-pages-root .rm-first-page-header .rm-page-header-content,
    .rm-pages-root .rm-first-page-header .rm-page-number-slot {
      pointer-events: auto;
    }
    .rm-pages-root .rm-page-header,
    .rm-pages-root .rm-page-footer {
      position: relative;
      display: flex;
      flex-direction: column;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      background: inherit;
      color: #202124;
      font: inherit;
      padding-left: var(--rm-page-margin-left);
      padding-right: var(--rm-page-margin-right);
      padding-bottom: 0;
    }
    .rm-pages-root .rm-page-header {
      justify-content: flex-start;
      padding-top: var(--rm-header-top-margin);
      padding-bottom: 0;
    }
    .rm-pages-root .rm-page-footer {
      justify-content: flex-end;
      padding-top: 0;
      padding-bottom: var(--rm-footer-bottom-margin);
    }
    .rm-pages-root .rm-page-header-content,
    .rm-pages-root .rm-page-footer-content {
      width: 100%;
      min-height: 0;
      outline: none;
      word-break: break-word;
      white-space: break-spaces;
      tab-size: 4;
      overflow: hidden;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
    }
    .rm-pages-root .rm-page-header-content .tableWrapper,
    .rm-pages-root .rm-page-footer-content .tableWrapper {
      overflow: visible;
      max-width: 100%;
      margin: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    .rm-pages-root .rm-page-header-content table,
    .rm-pages-root .rm-page-footer-content table {
      max-width: 100%;
      margin: 0;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .rm-pages-root .rm-page-header-content td,
    .rm-pages-root .rm-page-footer-content td,
    .rm-pages-root .rm-page-header-content th,
    .rm-pages-root .rm-page-footer-content th {
      border: 1pt solid #333;
      padding: 4pt 6pt;
      text-align: start;
      vertical-align: top;
      font-size: 0.875rem;
      line-height: 1.3;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .rm-pages-root .rm-page-header-content th,
    .rm-pages-root .rm-page-footer-content th {
      background: #f5f5f5;
      font-weight: bold;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="blue"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="blue"] {
      --editor-table-theme-solid: #2563eb;
      --editor-table-theme-soft: #dbeafe;
      --editor-table-theme-soft-alt: #eff6ff;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="teal"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="teal"] {
      --editor-table-theme-solid: #0f766e;
      --editor-table-theme-soft: #ccfbf1;
      --editor-table-theme-soft-alt: #f0fdfa;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="green"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="green"] {
      --editor-table-theme-solid: #15803d;
      --editor-table-theme-soft: #dcfce7;
      --editor-table-theme-soft-alt: #f0fdf4;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="orange"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="orange"] {
      --editor-table-theme-solid: #c2410c;
      --editor-table-theme-soft: #ffedd5;
      --editor-table-theme-soft-alt: #fff7ed;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="purple"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="purple"] {
      --editor-table-theme-solid: #7c3aed;
      --editor-table-theme-soft: #ede9fe;
      --editor-table-theme-soft-alt: #f5f3ff;
    }
    .rm-pages-root .rm-page-header-content table[data-table-theme="gray"],
    .rm-pages-root .rm-page-footer-content table[data-table-theme="gray"] {
      --editor-table-theme-solid: #4b5563;
      --editor-table-theme-soft: #e5e7eb;
      --editor-table-theme-soft-alt: #f3f4f6;
    }
    .rm-pages-root .rm-page-header-content table[data-table-style-header-row="true"] > tbody > tr:first-child > td,
    .rm-pages-root .rm-page-header-content table[data-table-style-header-row="true"] > tbody > tr:first-child > th,
    .rm-pages-root .rm-page-footer-content table[data-table-style-header-row="true"] > tbody > tr:first-child > td,
    .rm-pages-root .rm-page-footer-content table[data-table-style-header-row="true"] > tbody > tr:first-child > th {
      background: var(--editor-table-theme-solid, #2563eb);
      color: #fff;
      border-color: var(--editor-table-theme-solid, #2563eb);
      font-weight: 600;
    }
    .rm-pages-root .rm-page-header-content table[data-table-style-first-column="true"] > tbody > tr > :first-child,
    .rm-pages-root .rm-page-footer-content table[data-table-style-first-column="true"] > tbody > tr > :first-child {
      background: var(--editor-table-theme-soft, #dbeafe);
      font-weight: 600;
    }
    .rm-pages-root .rm-page-header-content table[data-table-style-last-column="true"] > tbody > tr > :last-child,
    .rm-pages-root .rm-page-footer-content table[data-table-style-last-column="true"] > tbody > tr > :last-child {
      background: var(--editor-table-theme-soft, #dbeafe);
      font-weight: 600;
    }
    .rm-pages-root .rm-page-header-content table[data-table-style-banded-rows="true"] > tbody > tr:nth-child(even) > td,
    .rm-pages-root .rm-page-header-content table[data-table-style-banded-rows="true"] > tbody > tr:nth-child(even) > th,
    .rm-pages-root .rm-page-footer-content table[data-table-style-banded-rows="true"] > tbody > tr:nth-child(even) > td,
    .rm-pages-root .rm-page-footer-content table[data-table-style-banded-rows="true"] > tbody > tr:nth-child(even) > th {
      background: var(--editor-table-theme-soft-alt, #eff6ff);
    }
    .rm-pages-root .rm-page-header-content table[data-table-style-banded-columns="true"] > tbody > tr > :nth-child(even),
    .rm-pages-root .rm-page-footer-content table[data-table-style-banded-columns="true"] > tbody > tr > :nth-child(even) {
      background: var(--editor-table-theme-soft-alt, #eff6ff);
    }
    .rm-pages-root .rm-page-region-layout {
      position: relative;
      width: 100%;
      min-height: var(--rm-page-number-layout-min-height, 20px);
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-active="true"][data-rm-page-number-align="left"] .rm-page-header-content,
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-active="true"][data-rm-page-number-align="left"] .rm-page-footer-content {
      box-sizing: border-box;
      padding-left: 48px;
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-active="true"][data-rm-page-number-align="right"] .rm-page-header-content,
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-active="true"][data-rm-page-number-align="right"] .rm-page-footer-content {
      box-sizing: border-box;
      padding-right: 48px;
    }
    .rm-pages-root .rm-page-number-slot {
      position: absolute;
      top: 0;
      min-width: 24px;
      color: inherit;
      font: inherit;
      line-height: inherit;
      pointer-events: none;
      user-select: none;
      -webkit-user-select: none;
      white-space: nowrap;
    }
    .rm-pages-root .rm-page-header-region[data-rm-overlay-active="true"] .rm-page-number-slot,
    .rm-pages-root .rm-page-footer-region[data-rm-overlay-active="true"] .rm-page-number-slot,
    .rm-pages-root .rm-first-page-header[data-rm-overlay-active="true"] .rm-page-number-slot {
      z-index: 6;
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-align="left"] .rm-page-number-slot {
      left: 0;
      text-align: left;
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-align="right"] .rm-page-number-slot {
      right: 0;
      text-align: right;
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-align="center"] .rm-page-number-slot {
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-below="true"] .rm-page-number-slot {
      top: var(--rm-page-number-center-top, 20px);
    }
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-below="true"] .rm-page-header-content,
    .rm-pages-root .rm-page-region-layout[data-rm-page-number-below="true"] .rm-page-footer-content {
      padding-left: 0;
      padding-right: 0;
    }
    .rm-pages-root .rm-page-header-region[data-rm-editable="true"],
    .rm-pages-root .rm-page-footer-region[data-rm-editable="true"],
    .rm-pages-root .rm-first-page-header[data-rm-editable="true"] {
      cursor: text;
    }
    .rm-pages-root .rm-page-header-region[data-rm-editable="true"]:hover,
    .rm-pages-root .rm-page-footer-region[data-rm-editable="true"]:hover,
    .rm-pages-root .rm-first-page-header[data-rm-editable="true"]:hover {
      background: transparent;
    }
    .rm-pages-root .rm-page-header-region[data-rm-has-visible-content="true"]::after,
    .rm-pages-root .rm-first-page-header[data-rm-has-visible-content="true"]::after {
      content: '';
      position: absolute;
      left: var(--rm-page-margin-left);
      right: var(--rm-page-margin-right);
      bottom: 0;
      border-bottom: 1px solid var(--rm-header-divider-accent, #6366f1);
      pointer-events: none;
    }
    .rm-pages-root .rm-page-footer-region[data-rm-has-visible-content="true"]::before {
      content: '';
      position: absolute;
      left: var(--rm-page-margin-left);
      right: var(--rm-page-margin-right);
      top: 0;
      border-top: 1px solid var(--rm-footer-divider-accent, #6366f1);
      pointer-events: none;
    }
    .rm-pages-root .rm-page-header-region[data-rm-overlay-active="true"] .rm-page-header-content:not(.rm-page-overlay-editor):not(.rm-page-inline-editor),
    .rm-pages-root .rm-page-footer-region[data-rm-overlay-active="true"] .rm-page-footer-content:not(.rm-page-overlay-editor):not(.rm-page-inline-editor),
    .rm-pages-root .rm-first-page-header[data-rm-overlay-active="true"] .rm-page-header-content:not(.rm-page-overlay-editor):not(.rm-page-inline-editor) {
      visibility: hidden;
      pointer-events: none;
      user-select: none;
    }
    .rm-pages-root .rm-page-header-region[contenteditable="true"],
    .rm-pages-root .rm-page-footer-region[contenteditable="true"],
    .rm-pages-root .rm-first-page-header[contenteditable="true"],
    .rm-pages-root .rm-page-header[contenteditable="true"],
    .rm-pages-root .rm-page-footer[contenteditable="true"],
    .rm-pages-root .rm-page-header-content[contenteditable="true"],
    .rm-pages-root .rm-page-footer-content[contenteditable="true"],
    .rm-pages-root .rm-page-header-region[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-footer-region[contenteditable="true"]:focus,
    .rm-pages-root .rm-first-page-header[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-header[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-footer[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-header-content[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-footer-content[contenteditable="true"]:focus,
    .rm-pages-root .rm-page-header-region[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-page-footer-region[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-first-page-header[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-page-header[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-page-footer[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-page-header-content[contenteditable="true"]:focus-visible,
    .rm-pages-root .rm-page-footer-content[contenteditable="true"]:focus-visible {
      outline: none;
      box-shadow: none;
    }
    .rm-pages-root .rm-page-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      background: transparent;
      z-index: 5;
    }
    .rm-pages-root .rm-page-overlay[data-rm-overlay-type="header"] {
      border-bottom: 1px solid var(--rm-overlay-accent, #6366f1);
    }
    .rm-pages-root .rm-page-overlay[data-rm-overlay-type="footer"] {
      border-top: 1px solid var(--rm-overlay-accent, #6366f1);
    }
    .rm-pages-root .rm-page-overlay-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 0 8px;
      border-bottom: 1px solid rgba(95, 99, 104, 0.16);
    }
    .rm-pages-root .rm-page-overlay-label {
      font-size: 11px;
      line-height: 16px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #5f6368;
    }
    .rm-pages-root .rm-page-overlay-close {
      border: 0;
      background: transparent;
      color: var(--rm-overlay-accent, #1a73e8);
      font: inherit;
      font-size: 12px;
      line-height: 16px;
      font-weight: 500;
      padding: 4px 0;
      cursor: pointer;
    }
    .rm-pages-root .rm-page-overlay-close:hover {
      text-decoration: underline;
    }
    .rm-pages-root .rm-page-overlay-editor {
      flex: 1;
      min-height: 0;
      overflow: visible;
      box-sizing: border-box;
      border: 0;
      border-radius: 0;
      background: transparent;
      padding: 0;
      caret-color: var(--rm-overlay-accent, #6366f1);
      user-select: text;
    }
    .rm-pages-root .rm-page-overlay-editor.rm-page-header-content,
    .rm-pages-root .rm-page-overlay-editor.rm-page-footer-content {
      visibility: visible;
      pointer-events: auto;
      user-select: text;
      -webkit-user-select: text;
      overflow: visible;
    }
    .rm-pages-root .rm-page-overlay-editor .ProseMirror {
      min-height: 0;
      outline: none;
      user-select: text;
      white-space: break-spaces;
      tab-size: 4;
    }
    .rm-pages-root .rm-page-overlay-editor table {
      width: 100%;
      max-width: 100%;
      margin: 0;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .rm-pages-root .rm-page-overlay-editor td[data-cell-border-color],
    .rm-pages-root .rm-page-overlay-editor th[data-cell-border-color] {
      border-style: dashed;
      border-width: 1px;
      padding: 2px 6px;
    }
    .rm-pages-root .rm-page-inline-editor {
      width: 100%;
      box-sizing: border-box;
      background: transparent;
      caret-color: var(--rm-overlay-accent, #6366f1);
      user-select: text;
      -webkit-user-select: text;
      pointer-events: auto;
      overflow: visible;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror {
      width: 100%;
      min-height: 0;
      box-sizing: border-box;
      outline: none;
      user-select: text;
      white-space: break-spaces;
      tab-size: 4;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror p {
      min-height: 1em;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror .tableWrapper {
      overflow: visible;
      margin: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror table {
      max-width: 100%;
      margin: 0;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror .selectedCell:after {
      z-index: 2;
      position: absolute;
      content: "";
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      background: rgba(200, 200, 255, 0.4);
      pointer-events: none;
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror .column-resize-handle {
      position: absolute;
      right: -2px;
      top: 0;
      bottom: -2px;
      width: 4px;
      background-color: #adf;
      pointer-events: none;
    }
    .rm-pages-root .rm-page-overlay[data-rm-overlay-type="header"] .rm-page-overlay-editor .ProseMirror {
    }
    .rm-pages-root .rm-page-overlay[data-rm-overlay-type="footer"] .rm-page-overlay-editor .ProseMirror {
    }
  `
  targetDocument.head.appendChild(style)
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
  const paginationElement = resolvePaginationRootElement(targetNode)
  const lastPaginationChild = paginationElement?.lastElementChild as HTMLElement | null
  if (!lastPaginationChild) return

  const measuredTarget = lastPaginationChild.classList.contains('rm-page-break')
    ? ((lastPaginationChild.querySelector('.breaker') as HTMLElement | null) ?? lastPaginationChild)
    : lastPaginationChild
  const minHeight = measuredTarget.offsetTop + measuredTarget.offsetHeight
  targetNode.style.minHeight = `${minHeight + 2}px`
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

  region.addEventListener('dblclick', event => {
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
    activeRange,
    placeholderBreakerMetrics,
    onOpenEditor
  } = params

  const pageContainer = document.createElement('div')
  pageContainer.className = 'rm-page-break'
  pageContainer.dataset.rmPageNumber = String(pageNumber)

  const page = document.createElement('div')
  page.className = 'page'
  page.dataset.rmPageNumber = String(pageNumber)
  page.style.setProperty(
    'margin-top',
    `var(--rm-page-content-${pageNumber}, ${getPageSpacerHeight(
      pageFormat,
      storage,
      pageNumber,
      options.headerHeight,
      options.footerHeight
    )}px)`
  )

  const defaultBodyHeight = getPageLayoutHeights(
    pageFormat,
    storage,
    options.headerHeight,
    options.footerHeight
  ).bodyHeight
  const bodyLayer = document.createElement('div')
  bodyLayer.className = 'rm-page-body-layer'
  bodyLayer.dataset.rmPageBody = 'true'
  bodyLayer.dataset.rmPageNumber = String(pageNumber)
  bodyLayer.style.height = `var(--rm-page-body-${pageNumber}, ${defaultBodyHeight}px)`
  bodyLayer.style.top = `calc(-1 * var(--rm-page-body-${pageNumber}, ${defaultBodyHeight}px))`
  page.appendChild(bodyLayer)

  const breaker =
    !shouldRenderFullPageBreaker(pageNumber, activeRange) && placeholderBreakerMetrics != null
      ? createPlaceholderBreaker(placeholderBreakerMetrics)
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
    'activeRange' | 'mountedRange' | 'windowKey' | 'placeholderBreakerMetricsByPage' | 'spacerHeightsByRange'
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

  const mountedRange = resolveMountedPageRange(totalPages, rendererState?.mountedRange, rendererState?.activeRange)
  wrapper.dataset.rmMountedStartPage = String(mountedRange.startPage)
  wrapper.dataset.rmMountedEndPage = String(mountedRange.endPage)
  const shouldRenderSparseShells = mountedRange.startPage > 1 || mountedRange.endPage < totalPages

  if (shouldRenderSparseShells && mountedRange.startPage > 1) {
    wrapper.appendChild(
      createPageRangeSpacer({
        startPage: 1,
        endPage: mountedRange.startPage - 1,
        totalPages,
        pageFormat,
        options,
        storage,
        placeholderBreakerMetricsByPage: rendererState?.placeholderBreakerMetricsByPage ?? new Map(),
        spacerHeightsByRange: rendererState?.spacerHeightsByRange ?? new Map()
      })
    )
  }

  for (
    let pageNumber = shouldRenderSparseShells ? mountedRange.startPage : 1;
    pageNumber <= (shouldRenderSparseShells ? mountedRange.endPage : totalPages);
    pageNumber += 1
  ) {
    const pageBreakElement = createPageBreakElement({
      pageNumber,
      totalPages,
      pageFormat,
      options,
      storage,
      extensions,
      activeRange: mountedRange,
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

  if (shouldRenderSparseShells && mountedRange.endPage < totalPages) {
    wrapper.appendChild(
      createPageRangeSpacer({
        startPage: mountedRange.endPage + 1,
        endPage: totalPages,
        totalPages,
        pageFormat,
        options,
        storage,
        placeholderBreakerMetricsByPage: rendererState?.placeholderBreakerMetricsByPage ?? new Map(),
        spacerHeightsByRange: rendererState?.spacerHeightsByRange ?? new Map()
      })
    )
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

  const markerTargets = pageBreakEl.querySelectorAll(
    '.page[data-rm-page-number], .rm-page-body-layer[data-rm-page-number], .rm-page-header-region[data-rm-page-number], .rm-page-footer-region[data-rm-page-number]'
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
