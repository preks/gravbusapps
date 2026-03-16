import type { Extension } from '@tiptap/core'
import type { HeaderFooterEditorType, PageFormat, PagesOptions, PagesStorage } from './types'
import { getHeaderFooterExtensions, getPageContentHeight, resolveDisplayContent } from './utils'

const STYLE_ATTR = 'data-rm-pages-style'

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
    }
    .rm-pages-root .rm-page-header-region,
    .rm-pages-root .rm-first-page-header {
      min-height: var(--rm-page-margin-top);
    }
    .rm-pages-root .rm-page-footer-region {
      min-height: var(--rm-page-margin-bottom);
    }
    .rm-pages-root .rm-page-header,
    .rm-pages-root .rm-page-footer {
      position: relative;
      width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    .rm-pages-root .rm-page-header {
      min-height: var(--rm-header-height);
    }
    .rm-pages-root .rm-page-footer {
      min-height: var(--rm-footer-height);
    }
    .rm-pages-root .rm-page-header-content,
    .rm-pages-root .rm-page-footer-content {
      width: 100%;
      min-height: 100%;
      outline: none;
      word-break: break-word;
    }
    .rm-pages-root .rm-page-header-region[data-rm-editable="true"],
    .rm-pages-root .rm-page-footer-region[data-rm-editable="true"],
    .rm-pages-root .rm-first-page-header[data-rm-editable="true"] {
      cursor: text;
    }
    .rm-pages-root .rm-page-header-region[data-rm-editable="true"]:hover,
    .rm-pages-root .rm-page-footer-region[data-rm-editable="true"]:hover,
    .rm-pages-root .rm-first-page-header[data-rm-editable="true"]:hover {
      background: rgba(99, 102, 241, 0.06);
    }
    .rm-pages-root .rm-page-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.98);
      z-index: 5;
    }
    .rm-pages-root .rm-page-overlay-label {
      align-self: flex-start;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      line-height: 18px;
      color: #fff;
      background: var(--rm-overlay-accent, #6366f1);
    }
    .rm-pages-root .rm-page-overlay-editor {
      flex: 1;
      min-height: 0;
      overflow: auto;
      box-sizing: border-box;
      border: 2px solid var(--rm-overlay-accent, #6366f1);
      border-radius: 8px;
      background: #fff;
      padding: 8px;
      caret-color: var(--rm-overlay-accent, #6366f1);
    }
    .rm-pages-root .rm-page-overlay-editor .ProseMirror {
      min-height: 100%;
      outline: none;
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
  targetNode.style.setProperty('--rm-page-margin-top', `${pageFormat.margins.top}px`)
  targetNode.style.setProperty('--rm-page-margin-bottom', `${pageFormat.margins.bottom}px`)
  targetNode.style.setProperty('--rm-page-margin-left', `${pageFormat.margins.left}px`)
  targetNode.style.setProperty('--rm-page-margin-right', `${pageFormat.margins.right}px`)
  targetNode.style.setProperty('--rm-header-height', `${options.headerHeight}px`)
  targetNode.style.setProperty('--rm-footer-height', `${options.footerHeight}px`)
  targetNode.style.setProperty('--rm-page-break-background', options.pageBreakBackground ?? '#f3f4f6')
}

export function refreshPageMinHeight(targetNode: HTMLElement) {
  const paginationElement = targetNode.querySelector('[data-rm-pagination]')
  const lastPageBreak = paginationElement?.lastElementChild?.querySelector('.breaker') as HTMLElement | null
  if (!lastPageBreak) return

  const minHeight = lastPageBreak.offsetTop + lastPageBreak.offsetHeight
  targetNode.style.minHeight = `${minHeight + 2}px`
}

export function createHeaderFooterRegion(params: {
  type: HeaderFooterEditorType
  pageNumber: number
  totalPages: number
  pageFormat: PageFormat
  options: PagesOptions
  storage: PagesStorage
  extensions: Extension[]
  onOpenEditor?: (type: HeaderFooterEditorType, pageNumber: number, target: HTMLElement) => void
  firstPage?: boolean
}): HTMLElement {
  const { type, pageNumber, totalPages, pageFormat, options, storage, extensions, onOpenEditor, firstPage } = params
  const displayContent = resolveDisplayContent(
    storage,
    options,
    type,
    pageNumber,
    totalPages,
    getHeaderFooterExtensions(extensions)
  )

  const region = document.createElement('div')
  region.className =
    type === 'header' ? (firstPage ? 'rm-first-page-header' : 'rm-page-header-region') : 'rm-page-footer-region'
  region.dataset.rmPageNumber = String(pageNumber)
  region.dataset.rmEditorType = type
  region.dataset.rmEditable = 'true'
  region.style.height = type === 'header' ? `${pageFormat.margins.top}px` : `${pageFormat.margins.bottom}px`

  if (type === 'header') {
    region.style.paddingTop = `${storage.headerTopMargin}px`
  } else {
    region.style.display = 'flex'
    region.style.alignItems = 'flex-end'
    region.style.paddingBottom = `${storage.footerBottomMargin}px`
  }

  const inner = document.createElement('div')
  inner.className = type === 'header' ? 'rm-page-header' : 'rm-page-footer'
  inner.style.height = type === 'header' ? `${storage.headerHeight}px` : `${storage.footerHeight}px`

  const content = document.createElement('div')
  content.className = type === 'header' ? 'rm-page-header-content' : 'rm-page-footer-content'
  content.innerHTML = displayContent.html ?? ''

  inner.appendChild(content)
  region.appendChild(inner)

  region.addEventListener('dblclick', event => {
    event.preventDefault()
    event.stopPropagation()
    onOpenEditor?.(type, pageNumber, region)
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
  onOpenEditor?: (type: HeaderFooterEditorType, pageNumber: number, target: HTMLElement) => void
}): HTMLElement {
  const { pageNumber, totalPages, pageFormat, options, storage, extensions, onOpenEditor } = params

  const pageContainer = document.createElement('div')
  pageContainer.className = 'rm-page-break'

  const page = document.createElement('div')
  page.className = 'page'
  page.style.marginTop =
    pageNumber === 1 ? `${pageFormat.height - pageFormat.margins.bottom}px` : `${getPageContentHeight(pageFormat)}px`

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
  onOpenEditor?: (type: HeaderFooterEditorType, pageNumber: number, target: HTMLElement) => void
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
  onOpenEditor?: (type: HeaderFooterEditorType, pageNumber: number, target: HTMLElement) => void
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
