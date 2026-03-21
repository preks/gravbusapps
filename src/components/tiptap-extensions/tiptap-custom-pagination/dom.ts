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

function isEmptyHeaderFooterHtml(html: string | null | undefined) {
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
      width: 0;
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
      z-index: 2;
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
    .rm-pages-root .rm-page-header-content table,
    .rm-pages-root .rm-page-footer-content table {
      width: 100%;
      max-width: 100%;
      margin: 0;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .rm-pages-root .rm-page-header-content td[data-cell-border-color],
    .rm-pages-root .rm-page-footer-content td[data-cell-border-color],
    .rm-pages-root .rm-page-header-content th[data-cell-border-color],
    .rm-pages-root .rm-page-footer-content th[data-cell-border-color] {
      border: 0;
      padding: 0;
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
    .rm-pages-root .rm-page-header-region[data-rm-overlay-active="true"]::after,
    .rm-pages-root .rm-first-page-header[data-rm-overlay-active="true"]::after,
    .rm-pages-root .rm-page-footer-region[data-rm-overlay-active="true"]::before {
      content: none;
    }
    .rm-pages-root .rm-page-header-region[data-rm-overlay-active="true"] .rm-page-header-content:not(.rm-page-overlay-editor),
    .rm-pages-root .rm-page-footer-region[data-rm-overlay-active="true"] .rm-page-footer-content:not(.rm-page-overlay-editor),
    .rm-pages-root .rm-first-page-header[data-rm-overlay-active="true"] .rm-page-header-content:not(.rm-page-overlay-editor) {
      visibility: hidden;
      pointer-events: none;
      user-select: none;
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
    }
    .rm-pages-root .rm-page-inline-editor .ProseMirror {
      outline: none;
      user-select: text;
      white-space: break-spaces;
      tab-size: 4;
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
  const paginationElement = targetNode.querySelector('[data-rm-pagination]')
  const lastPageBreak = paginationElement?.lastElementChild?.querySelector('.breaker') as HTMLElement | null
  if (!lastPageBreak) return

  const minHeight = lastPageBreak.offsetTop + lastPageBreak.offsetHeight
  targetNode.style.minHeight = `${minHeight + 2}px`
}

function blockInactiveRegion(event: Event, region: HTMLElement) {
  if (region.dataset.rmOverlayActive === 'true') return

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

  const pageNumberSlot = createPageNumberSlotElement(options, type, pageNumber)
  const hasVisibleRegionContent = !isEmptyHeaderFooterHtml(displayContent.html) || pageNumberSlot !== null
  region.dataset.rmHasVisibleContent = hasVisibleRegionContent ? 'true' : 'false'
  if (pageNumberSlot) {
    bodyLayout.dataset.rmPageNumberActive = 'true'
    bodyLayout.dataset.rmPageNumberAlign = pageNumberSlot.dataset.rmPageNumberAlign ?? 'center'
    bodyLayout.dataset.rmPageNumberRegion = type
    bodyLayout.dataset.rmPageNumberOdd = pageNumberSlot.dataset.rmPageNumberOdd ?? 'false'
  }
  bodyLayout.append(content)
  if (pageNumberSlot) {
    bodyLayout.append(pageNumberSlot)
  }
  inner.append(bodyLayout)
  region.appendChild(inner)
  requestAnimationFrame(() => layoutPageNumberSlots(region))

  region.addEventListener('mousedown', event => {
    blockInactiveRegion(event, region)
  })
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
  onOpenEditor?: (
    type: HeaderFooterEditorType,
    pageNumber: number,
    target: HTMLElement,
    clickPosition?: { clientX: number; clientY: number }
  ) => void
}): HTMLElement {
  const { pageNumber, totalPages, pageFormat, options, storage, extensions, onOpenEditor } = params

  const pageContainer = document.createElement('div')
  pageContainer.className = 'rm-page-break'

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
  pageContainer.append(page, breaker)

  return pageContainer
}

export function createPaginationWrapper(params: {
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
  const { totalPages, pageFormat, options, storage, extensions, onOpenEditor } = params
  const wrapper = document.createElement('div')
  wrapper.dataset.rmPagination = 'true'
  wrapper.id = 'pages'
  wrapper.className = 'rm-pages-wrapper'

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    wrapper.appendChild(
      createPageBreakElement({
        pageNumber,
        totalPages,
        pageFormat,
        options,
        storage,
        extensions,
        onOpenEditor
      })
    )
  }

  return wrapper
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
