import { Editor, type Extension, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import { PAGE_FORMATS, PAGE_SIZES, type PageSize } from './constants'
import type {
  BuiltInPageFormatName,
  HeaderFooterEditorType,
  PageFormat,
  PageFormatInput,
  PagesHeaderFooter,
  PagesHeaderFooterSource,
  PagesOptions,
  PagesStorage,
  PageVariantKey,
  StoredHeaderFooterContent
} from './types'

interface PageCountLayoutOptions {
  storage?: Pick<PagesStorage, 'headerTopMargin' | 'footerBottomMargin'>
  headerHeights?: Map<number, number>
  footerHeights?: Map<number, number>
  defaultHeaderHeight?: number
  defaultFooterHeight?: number
}

export interface MeasuredHeaderFooterHeights {
  headerHeights: Map<number, number>
  footerHeights: Map<number, number>
}

const PAGE_VARIANT_FIELDS = {
  header: {
    default: ['headerHTML', 'headerJSON'],
    firstPage: ['headerFirstPageHTML', 'headerFirstPageJSON'],
    odd: ['headerOddHTML', 'headerOddJSON'],
    even: ['headerEvenHTML', 'headerEvenJSON']
  },
  footer: {
    default: ['footerHTML', 'footerJSON'],
    firstPage: ['footerFirstPageHTML', 'footerFirstPageJSON'],
    odd: ['footerOddHTML', 'footerOddJSON'],
    even: ['footerEvenHTML', 'footerEvenJSON']
  }
} as const

export function normalizePageFormatName(name: string): BuiltInPageFormatName | null {
  switch (name) {
    case 'A4':
    case 'A3':
    case 'A5':
      return name
    case 'Letter':
    case 'LETTER':
      return 'Letter'
    case 'Legal':
    case 'LEGAL':
      return 'Legal'
    case 'Tabloid':
    case 'TABLOID':
      return 'Tabloid'
    default:
      return null
  }
}

export function resolvePageFormat(pageFormat: PageFormatInput): PageFormat {
  if (typeof pageFormat === 'string') {
    const normalized = normalizePageFormatName(pageFormat) ?? 'A4'
    return cloneJSONValue(PAGE_FORMATS[normalized])
  }

  return cloneJSONValue(pageFormat)
}

export function toLegacyPageSize(pageFormat: PageFormat): PageSize {
  return {
    pageHeight: pageFormat.height,
    pageWidth: pageFormat.width,
    marginTop: pageFormat.margins.top,
    marginBottom: pageFormat.margins.bottom,
    marginLeft: pageFormat.margins.left,
    marginRight: pageFormat.margins.right
  }
}

export function getLegacyPageSizes() {
  return PAGE_SIZES
}

export function getHeaderFooterExtensions(extensions?: Extension[]): Extension[] {
  return extensions?.length ? extensions : [StarterKit]
}

export function cloneJSONValue<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

export function replaceTemplateTokens(template: string, page: number, total: number): string {
  return template.replace(/\{page\}/g, String(page)).replace(/\{total\}/g, String(total))
}

export function replaceTokensInJSONContent(content: JSONContent, page: number, total: number): JSONContent {
  return walkAndReplaceStrings(cloneJSONValue(content), value => replaceTemplateTokens(value, page, total))
}

function walkAndReplaceStrings(value: unknown, replacer: (value: string) => string): any {
  if (typeof value === 'string') return replacer(value)
  if (Array.isArray(value)) return value.map(entry => walkAndReplaceStrings(entry, replacer))
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, walkAndReplaceStrings(entry, replacer)]))
}

export function resolveVariantForPage(pageNumber: number, options: PagesOptions): PageVariantKey {
  if (pageNumber === 1 && options.differentFirstPage) return 'firstPage'
  if (!options.differentOddEven) return 'default'
  return pageNumber % 2 === 0 ? 'even' : 'odd'
}

export function getConfiguredVariantContent(
  options: PagesOptions,
  type: HeaderFooterEditorType,
  variant: PageVariantKey
): PagesHeaderFooterSource | undefined {
  if (type === 'header') {
    if (variant === 'firstPage') return options.headerFirstPage
    if (variant === 'odd') return options.headerOdd
    if (variant === 'even') return options.headerEven
    return options.header
  }

  if (variant === 'firstPage') return options.footerFirstPage
  if (variant === 'odd') return options.footerOdd
  if (variant === 'even') return options.footerEven
  return options.footer
}

export function getStoredVariantContent(
  storage: PagesStorage,
  type: HeaderFooterEditorType,
  variant: PageVariantKey
): StoredHeaderFooterContent {
  const [htmlKey, jsonKey] = PAGE_VARIANT_FIELDS[type][variant]
  return {
    html: storage[htmlKey],
    json: storage[jsonKey]
  }
}

export function setStoredVariantContent(
  storage: PagesStorage,
  type: HeaderFooterEditorType,
  variant: PageVariantKey,
  content: StoredHeaderFooterContent
) {
  const [htmlKey, jsonKey] = PAGE_VARIANT_FIELDS[type][variant]
  storage[htmlKey] = content.html
  storage[jsonKey] = content.json
}

export function buildRenderableContent(
  source: PagesHeaderFooterSource | undefined,
  page: number,
  total: number,
  extensions: Extension[]
): StoredHeaderFooterContent {
  if (!source) return { html: '', json: null }

  const resolved = typeof source === 'function' ? source(page, total) : source
  if (typeof resolved === 'string') {
    return {
      html: replaceTemplateTokens(resolved, page, total),
      json: null
    }
  }

  const json = replaceTokensInJSONContent(resolved, page, total)
  return {
    html: renderJSONContentToHTML(json, extensions),
    json
  }
}

export function resolveDisplayContent(
  storage: PagesStorage,
  options: PagesOptions,
  type: HeaderFooterEditorType,
  page: number,
  total: number,
  extensions: Extension[]
): StoredHeaderFooterContent {
  const variant = resolveVariantForPage(page, options)
  const stored = getStoredVariantContent(storage, type, variant)

  if (stored.json) {
    const json = replaceTokensInJSONContent(stored.json, page, total)
    return {
      html: renderJSONContentToHTML(json, extensions),
      json
    }
  }

  if (stored.html !== null) {
    return {
      html: replaceTemplateTokens(stored.html, page, total),
      json: null
    }
  }

  return buildRenderableContent(getConfiguredVariantContent(options, type, variant), page, total, extensions)
}

export function getInitialEditorContent(
  storage: PagesStorage,
  options: PagesOptions,
  type: HeaderFooterEditorType,
  page: number,
  total: number
): PagesHeaderFooter {
  const variant = resolveVariantForPage(page, options)
  const stored = getStoredVariantContent(storage, type, variant)

  if (stored.json) return cloneJSONValue(stored.json)
  if (stored.html !== null) return stored.html

  const configured = getConfiguredVariantContent(options, type, variant)
  const resolved = typeof configured === 'function' ? configured(page, total) : configured
  return resolved ?? ''
}

export function renderJSONContentToHTML(content: JSONContent, extensions: Extension[]): string {
  const element = document.createElement('div')
  const editor = new Editor({
    element,
    extensions: getHeaderFooterExtensions(extensions),
    content,
    editable: false
  })
  const html = editor.getHTML()
  editor.destroy()
  return html
}

export function createStorageFromOptions(options: PagesOptions): PagesStorage {
  const pageFormat = resolvePageFormat(options.pageFormat)

  return {
    pageFormat,
    pageCount: 1,
    headerHeight: options.headerHeight,
    footerHeight: options.footerHeight,
    pageGap: options.pageGap,
    pageBreakBackground: options.pageBreakBackground,
    headerTopMargin: options.headerTopMargin ?? Math.round(pageFormat.margins.top / 2),
    footerBottomMargin: options.footerBottomMargin ?? Math.round(pageFormat.margins.bottom / 2),
    differentFirstPage: options.differentFirstPage,
    differentOddEven: options.differentOddEven,
    headerHTML: null,
    headerJSON: null,
    footerHTML: null,
    footerJSON: null,
    headerFirstPageHTML: null,
    headerFirstPageJSON: null,
    footerFirstPageHTML: null,
    footerFirstPageJSON: null,
    headerOddHTML: null,
    headerOddJSON: null,
    headerEvenHTML: null,
    headerEvenJSON: null,
    footerOddHTML: null,
    footerOddJSON: null,
    footerEvenHTML: null,
    footerEvenJSON: null,
    activeEditor: null,
    activeEditorType: null,
    activePageNumber: null,
    getPageCount: () => 1
  }
}

export function syncStorageFromOptions(storage: PagesStorage, options: PagesOptions) {
  storage.pageFormat = resolvePageFormat(options.pageFormat)
  storage.headerHeight = options.headerHeight
  storage.footerHeight = options.footerHeight
  storage.pageGap = options.pageGap
  storage.pageBreakBackground = options.pageBreakBackground
  storage.headerTopMargin = options.headerTopMargin ?? Math.round(storage.pageFormat.margins.top / 2)
  storage.footerBottomMargin = options.footerBottomMargin ?? Math.round(storage.pageFormat.margins.bottom / 2)
  storage.differentFirstPage = options.differentFirstPage
  storage.differentOddEven = options.differentOddEven
}

function clampToNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function readMeasuredElementHeight(element: HTMLElement | null): number {
  if (!element) return 0

  let contentRectHeight = 0
  if (typeof document !== 'undefined' && typeof document.createRange === 'function') {
    const range = document.createRange()
    range.selectNodeContents(element)
    if (typeof range.getBoundingClientRect === 'function') {
      contentRectHeight = range.getBoundingClientRect().height
    }
  }

  const firstChild = element.firstElementChild as HTMLElement | null
  const lastChild = element.lastElementChild as HTMLElement | null
  const childrenRectHeight =
    firstChild && lastChild
      ? Math.max(0, lastChild.getBoundingClientRect().bottom - firstChild.getBoundingClientRect().top)
      : 0

  if (contentRectHeight > 0 || childrenRectHeight > 0) {
    return Math.max(contentRectHeight, childrenRectHeight)
  }

  return Math.max(element.scrollHeight, element.clientHeight, element.offsetHeight, 0)
}

function clampHeaderContentHeight(
  _pageFormat: PageFormat,
  _storage: Pick<PagesStorage, 'headerTopMargin' | 'footerBottomMargin'>,
  height: number
): number {
  return clampToNonNegative(height)
}

function clampFooterContentHeight(
  _pageFormat: PageFormat,
  _storage: Pick<PagesStorage, 'headerTopMargin' | 'footerBottomMargin'>,
  height: number
): number {
  return clampToNonNegative(height)
}

export function getPageLayoutHeights(
  pageFormat: PageFormat,
  storage: Pick<PagesStorage, 'headerTopMargin' | 'footerBottomMargin'>,
  headerHeight = 0,
  footerHeight = 0
) {
  const measuredHeaderHeight = clampHeaderContentHeight(pageFormat, storage, headerHeight)
  const measuredFooterHeight = clampFooterContentHeight(pageFormat, storage, footerHeight)
  const headerReserved = pageFormat.margins.top + storage.headerTopMargin + measuredHeaderHeight
  const footerReserved = pageFormat.margins.bottom + storage.footerBottomMargin + measuredFooterHeight
  const bodyHeight = Math.max(1, pageFormat.height - headerReserved - footerReserved)

  return {
    headerReserved,
    footerReserved,
    bodyHeight,
    measuredHeaderHeight,
    measuredFooterHeight
  }
}

export function getPageSpacerHeight(
  pageFormat: PageFormat,
  storage: Pick<PagesStorage, 'headerTopMargin' | 'footerBottomMargin'>,
  pageNumber: number,
  headerHeight = 0,
  footerHeight = 0
): number {
  const { headerReserved, bodyHeight } = getPageLayoutHeights(pageFormat, storage, headerHeight, footerHeight)
  return pageNumber === 1 ? headerReserved + bodyHeight : bodyHeight
}

export function getPageContentHeight(pageFormat: PageFormat): number {
  return Math.max(1, pageFormat.height - pageFormat.margins.top - pageFormat.margins.bottom)
}

function getHeaderContentSelector(pageNumber: number): string {
  return `[data-rm-editor-type="header"][data-rm-page-number="${pageNumber}"] .rm-page-header-content`
}

function getFooterContentSelector(pageNumber: number): string {
  return `[data-rm-editor-type="footer"][data-rm-page-number="${pageNumber}"] .rm-page-footer-content`
}

export function measureHeaderFooterContentHeights(
  editorDom: HTMLElement,
  totalPages: number,
  pageFormat: PageFormat,
  storage: Pick<PagesStorage, 'headerTopMargin' | 'footerBottomMargin'>
): MeasuredHeaderFooterHeights {
  const headerHeights = new Map<number, number>()
  const footerHeights = new Map<number, number>()

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const headerHeight = clampHeaderContentHeight(
      pageFormat,
      storage,
      readMeasuredElementHeight(editorDom.querySelector(getHeaderContentSelector(pageNumber)) as HTMLElement | null)
    )
    const footerHeight = clampFooterContentHeight(
      pageFormat,
      storage,
      readMeasuredElementHeight(editorDom.querySelector(getFooterContentSelector(pageNumber)) as HTMLElement | null)
    )

    headerHeights.set(pageNumber, headerHeight)
    footerHeights.set(pageNumber, footerHeight)
  }

  return { headerHeights, footerHeights }
}

export function getExistingPageCount(view: EditorView): number {
  const paginationElement = view.dom.querySelector('[data-rm-pagination]')
  return paginationElement ? paginationElement.children.length : 0
}

function isEffectivelyEmptyDocument(doc: ProseMirrorNode | undefined): boolean {
  if (!doc) return false

  if (doc.childCount !== 1) return false

  const firstChild = doc.firstChild
  if (!firstChild) return true

  return firstChild.type.name === 'paragraph' && firstChild.childCount === 0 && firstChild.textContent.trim() === ''
}

function isPaginationMeasurementHelper(element: Element): boolean {
  if (element.hasAttribute('data-rm-pagination')) return true

  if (!(element instanceof HTMLElement)) return false

  return (
    element.classList.contains('ProseMirror-widget') ||
    element.classList.contains('rm-first-page-header') ||
    element.classList.contains('rm-page-break') ||
    element.classList.contains('rm-page-spacer') ||
    element.classList.contains('breaker')
  )
}

function getLastContentElement(editorDom: HTMLElement): HTMLElement | null {
  let current = editorDom.lastElementChild

  while (current) {
    if (!isPaginationMeasurementHelper(current) && current instanceof HTMLElement) {
      return current
    }
    current = current.previousElementSibling
  }

  return null
}

function getElementBottom(element: HTMLElement): number {
  const layoutHeight = Math.max(element.offsetHeight, element.clientHeight, element.scrollHeight)
  return element.offsetTop + layoutHeight
}

function getPageBodyHeightForCount(
  pageFormat: PageFormat,
  layoutOptions: PageCountLayoutOptions,
  pageNumber: number
): number {
  const storage = layoutOptions.storage ?? { headerTopMargin: 0, footerBottomMargin: 0 }
  const headerHeight = layoutOptions.headerHeights?.get(pageNumber) ?? layoutOptions.defaultHeaderHeight ?? 0
  const footerHeight = layoutOptions.footerHeights?.get(pageNumber) ?? layoutOptions.defaultFooterHeight ?? 0

  return getPageLayoutHeights(pageFormat, storage, headerHeight, footerHeight).bodyHeight
}

function getMinimumMeasuredBodyHeight(
  pageFormat: PageFormat,
  currentPageCount: number,
  layoutOptions: PageCountLayoutOptions
): number {
  if (!currentPageCount) {
    return getPageBodyHeightForCount(pageFormat, layoutOptions, 1)
  }

  let minimumBodyHeight = Number.POSITIVE_INFINITY
  for (let pageNumber = 1; pageNumber <= currentPageCount; pageNumber += 1) {
    minimumBodyHeight = Math.min(minimumBodyHeight, getPageBodyHeightForCount(pageFormat, layoutOptions, pageNumber))
  }

  return Number.isFinite(minimumBodyHeight)
    ? Math.max(1, minimumBodyHeight)
    : getPageBodyHeightForCount(pageFormat, layoutOptions, 1)
}

export function calculatePageCount(
  view: EditorView,
  pageFormat: PageFormat,
  pageGap: number,
  layoutOptions: PageCountLayoutOptions = {}
): number {
  if (isEffectivelyEmptyDocument((view as EditorView & { state?: { doc?: ProseMirrorNode } }).state?.doc)) {
    return 1
  }

  const editorDom = view.dom
  const paginationElement = editorDom.querySelector('[data-rm-pagination]')
  const currentPageCount = getExistingPageCount(view)
  const lastContentElement = getLastContentElement(editorDom)
  const pageContentHeight = getMinimumMeasuredBodyHeight(pageFormat, currentPageCount, layoutOptions)

  if (paginationElement) {
    const lastPageBreak = paginationElement.lastElementChild?.querySelector('.breaker') as HTMLElement | null

    if (!lastContentElement || !lastPageBreak) {
      return Math.max(1, currentPageCount)
    }

    const lastPageGap = getElementBottom(lastContentElement) - getElementBottom(lastPageBreak)

    if (lastPageGap > 0) {
      return currentPageCount + Math.ceil(lastPageGap / pageContentHeight)
    }

    const lowerBound = -(pageFormat.height - 10)
    if (lastPageGap > lowerBound && lastPageGap < -10) return currentPageCount
    if (lastPageGap < lowerBound) {
      const removePage = Math.floor(lastPageGap / (pageFormat.height + pageGap))
      return Math.max(1, currentPageCount + removePage)
    }

    return Math.max(1, currentPageCount)
  }

  if (!lastContentElement) return 1

  const editorHeight = Math.max(getElementBottom(lastContentElement), 1)
  const initialPageContentHeight = getPageBodyHeightForCount(pageFormat, layoutOptions, 1)
  return Math.max(1, Math.ceil(editorHeight / Math.max(1, initialPageContentHeight)))
}
