import { Editor, type Extension, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'
import {
  findSafeSplitRow,
  getTableRowCount,
  getTableRows,
  isHeaderRow
} from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationUtils'
import { resolveMergedSplitIndex } from '@/components/tiptap-extensions/tiptap-custom-tables/tablePaginationUtils'
import { PAGE_FORMATS, PAGE_SIZES, type PageSize } from './constants'
import type {
  BuiltInPageFormatName,
  HeaderFooterEditorType,
  PageFormat,
  PageFormatInput,
  PageNumberAlignment,
  PageNumberNumeralStyle,
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
  onDebug?: (info: PageCountDebugInfo) => void
}

export interface MeasuredHeaderFooterHeights {
  headerHeights: Map<number, number>
  footerHeights: Map<number, number>
}

export interface TableOverflowSplitCandidate {
  mode: 'split' | 'rebalance'
  tablePos: number
  splitRowIndex: number
  paginationSplitId: string | null
}

export interface MergeableTableFragmentsCandidate {
  firstTablePos: number
  secondTablePos: number
  paginationSplitId: string
}

function getTablePaginationSplitId(node: ProseMirrorNode) {
  return typeof node.attrs.paginationSplitId === 'string' && node.attrs.paginationSplitId.length > 0
    ? node.attrs.paginationSplitId
    : null
}

function getAdjacentPaginationTableFragment(
  doc: ProseMirrorNode,
  tablePos: number,
  direction: 'previous' | 'next',
  paginationSplitId: string
) {
  const $tablePos = doc.resolve(tablePos)
  const parent = $tablePos.node($tablePos.depth)
  const tableIndex = $tablePos.index($tablePos.depth)
  const adjacentIndex = direction === 'previous' ? tableIndex - 1 : tableIndex + 1

  if (adjacentIndex < 0 || adjacentIndex >= parent.childCount) {
    return null
  }

  let adjacentPos = $tablePos.start($tablePos.depth)
  for (let index = 0; index < adjacentIndex; index += 1) {
    adjacentPos += parent.child(index).nodeSize
  }

  const adjacentNode = parent.child(adjacentIndex)
  if (adjacentNode.type.name !== 'table' || getTablePaginationSplitId(adjacentNode) !== paginationSplitId) {
    return null
  }

  return {
    node: adjacentNode,
    pos: adjacentPos,
    rowCount: getTableRowCount(adjacentNode)
  }
}

export interface ResolvedPageNumberSlot {
  alignment: 'left' | 'center' | 'right'
  originalAlignment: PageNumberAlignment
  region: HeaderFooterEditorType
  oddPage: boolean
  text: string
}

export interface PageCountDebugInfo {
  reason: 'empty-doc' | 'existing-no-op' | 'add-pages' | 'keep-existing' | 'remove-pages' | 'initial-count'
  hasPaginationElement: boolean
  currentPageCount: number
  resultPageCount: number
  contentBottom: number | null
  selectionBottom: number
  measuredBottom: number
  pageContentHeight: number
  lastPageBreakBottom: number | null
  lastPageGap: number | null
  lowerBound: number | null
}

export const PAGE_COUNT_ADD_HYSTERESIS_PX = 1
export const PAGE_COUNT_REMOVE_HYSTERESIS_PX = 24
export const TABLE_SPLIT_OVERFLOW_HYSTERESIS_PX = 2
export const TABLE_SPLIT_RETURN_HYSTERESIS_PX = 10
export const TABLE_MERGE_SAFETY_MARGIN_PX = 12

interface PageCountGapResolution {
  reason: 'add-pages' | 'keep-existing' | 'remove-pages'
  resultPageCount: number
  lowerBound: number
}

export function resolvePageCountFromLastPageGap(options: {
  currentPageCount: number
  lastPageGap: number
  pageContentHeight: number
  pageFormatHeight: number
  pageGap: number
}): PageCountGapResolution {
  const { currentPageCount, lastPageGap, pageContentHeight, pageFormatHeight, pageGap } = options
  const lowerBound = -(pageFormatHeight - PAGE_COUNT_REMOVE_HYSTERESIS_PX)

  if (lastPageGap > PAGE_COUNT_ADD_HYSTERESIS_PX) {
    return {
      reason: 'add-pages',
      resultPageCount: currentPageCount + Math.ceil(lastPageGap / pageContentHeight),
      lowerBound
    }
  }

  if (lastPageGap < lowerBound) {
    const removePage = Math.floor(lastPageGap / (pageFormatHeight + pageGap))
    return {
      reason: 'remove-pages',
      resultPageCount: Math.max(1, currentPageCount + removePage),
      lowerBound
    }
  }

  return {
    reason: 'keep-existing',
    resultPageCount: currentPageCount,
    lowerBound
  }
}

interface TableRowEntry {
  node: ProseMirrorNode
  rowIndex: number
  rowPos: number
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

function escapeHtmlTextForHeaderFooter(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function toRomanNumeral(n: number): string {
  if (n < 1 || n > 3999) return String(n)
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
  const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  let result = ''
  let num = n
  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += symbols[i]
      num -= values[i]
    }
  }
  return result
}

function toAlphaNumeral(n: number, upper: boolean): string {
  if (n < 1) return String(n)
  let s = ''
  let x = n
  const base = upper ? 65 : 97
  while (x > 0) {
    x -= 1
    s = String.fromCharCode(base + (x % 26)) + s
    x = Math.floor(x / 26)
  }
  return s
}

export function formatPageNumeral(displayIndex: number, style: PageNumberNumeralStyle): string {
  const n = Math.max(1, Math.floor(displayIndex) || 1)
  switch (style) {
    case 'lowerRoman':
      return toRomanNumeral(n).toLowerCase()
    case 'upperRoman':
      return toRomanNumeral(n)
    case 'lowerAlpha':
      return toAlphaNumeral(n, false)
    case 'upperAlpha':
      return toAlphaNumeral(n, true)
    default:
      return String(n)
  }
}

export function physicalPageToDisplayedPage(physicalPage: number, startAt: number): number {
  const s = Math.max(1, Math.floor(startAt) || 1)
  return Math.max(1, physicalPage - 1 + s)
}

export function replaceTemplateTokens(
  template: string,
  physicalPage: number,
  total: number,
  documentTitle = '',
  numeral?: { style?: PageNumberNumeralStyle; startAt?: number }
): string {
  const safeTitle = escapeHtmlTextForHeaderFooter(documentTitle)
  const style = numeral?.style ?? 'decimal'
  const startAt = numeral?.startAt ?? 1
  const displayed = physicalPageToDisplayedPage(physicalPage, startAt)
  const pageStr = escapeHtmlTextForHeaderFooter(formatPageNumeral(displayed, style))
  return template
    .replace(/\{page\}/g, pageStr)
    .replace(/\{total\}/g, String(total))
    .replace(/\{title\}/g, safeTitle)
}

export function replaceTokensInJSONContent(
  content: JSONContent,
  physicalPage: number,
  total: number,
  documentTitle = '',
  numeral?: { style?: PageNumberNumeralStyle; startAt?: number }
): JSONContent {
  return walkAndReplaceStrings(cloneJSONValue(content), value =>
    replaceTemplateTokens(value, physicalPage, total, documentTitle, numeral)
  )
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

function pageNumeralFromOptions(options: PagesOptions) {
  return {
    style: options.pageNumberNumeralStyle ?? 'decimal',
    startAt: options.pageNumberStartAt ?? 1
  }
}

function resolvePageNumberSlotAlignment(
  alignment: PageNumberAlignment,
  oddPage: boolean
): ResolvedPageNumberSlot['alignment'] {
  switch (alignment) {
    case 'left':
      return 'left'
    case 'center':
      return 'center'
    case 'right':
      return 'right'
    case 'inside':
      return oddPage ? 'left' : 'right'
    case 'outside':
      return oddPage ? 'right' : 'left'
    default:
      return 'center'
  }
}

export function resolvePageNumberSlot(
  options: PagesOptions,
  region: HeaderFooterEditorType,
  page: number
): ResolvedPageNumberSlot | null {
  if (!options.pageNumberAlignment) return null
  const configuredRegion = options.pageNumberRegion ?? 'footer'
  if (configuredRegion !== region) return null
  if (options.pageNumberShowOnFirstPage === false && page === 1) return null

  const numeral = pageNumeralFromOptions(options)
  const displayed = physicalPageToDisplayedPage(page, numeral.startAt ?? 1)
  const oddPage = page % 2 !== 0

  return {
    alignment: resolvePageNumberSlotAlignment(options.pageNumberAlignment, oddPage),
    originalAlignment: options.pageNumberAlignment,
    region,
    oddPage,
    text: formatPageNumeral(displayed, numeral.style ?? 'decimal')
  }
}

export function buildRenderableContent(
  source: PagesHeaderFooterSource | undefined,
  page: number,
  total: number,
  extensions: Extension[],
  documentTitle: string,
  numeral?: { style?: PageNumberNumeralStyle; startAt?: number }
): StoredHeaderFooterContent {
  if (!source) return { html: '', json: null }

  const resolved = typeof source === 'function' ? source(page, total) : source
  if (typeof resolved === 'string') {
    return {
      html: replaceTemplateTokens(resolved, page, total, documentTitle, numeral),
      json: null
    }
  }

  const json = replaceTokensInJSONContent(resolved, page, total, documentTitle, numeral)
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
  const documentTitle = options.documentTitle ?? ''
  const numeral = pageNumeralFromOptions(options)
  const variant = resolveVariantForPage(page, options)
  const stored = getStoredVariantContent(storage, type, variant)

  if (stored.json) {
    const json = replaceTokensInJSONContent(stored.json, page, total, documentTitle, numeral)
    return {
      html: renderJSONContentToHTML(json, extensions),
      json
    }
  }

  if (stored.html !== null) {
    return {
      html: replaceTemplateTokens(stored.html, page, total, documentTitle, numeral),
      json: null
    }
  }

  return buildRenderableContent(
    getConfiguredVariantContent(options, type, variant),
    page,
    total,
    extensions,
    documentTitle,
    numeral
  )
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
  const headerReserved = Math.max(pageFormat.margins.top, storage.headerTopMargin + measuredHeaderHeight)
  const footerReserved = Math.max(pageFormat.margins.bottom, storage.footerBottomMargin + measuredFooterHeight)
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

function getHeaderMeasurementSelector(pageNumber: number): string {
  return `[data-rm-editor-type="header"][data-rm-page-number="${pageNumber}"] .rm-page-region-layout`
}

function getFooterMeasurementSelector(pageNumber: number): string {
  return `[data-rm-editor-type="footer"][data-rm-page-number="${pageNumber}"] .rm-page-region-layout`
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
      readMeasuredElementHeight(editorDom.querySelector(getHeaderMeasurementSelector(pageNumber)) as HTMLElement | null)
    )
    const footerHeight = clampFooterContentHeight(
      pageFormat,
      storage,
      readMeasuredElementHeight(editorDom.querySelector(getFooterMeasurementSelector(pageNumber)) as HTMLElement | null)
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
    element.classList.contains('rm-page-body-layer') ||
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

function getElementLayoutHeight(element: HTMLElement): number {
  const rectHeight = typeof element.getBoundingClientRect === 'function' ? element.getBoundingClientRect().height : 0
  const measuredContentHeight = readMeasuredElementHeight(element)
  let trailingEmptyLineHeight = 0

  if (measuredContentHeight <= 0 && element.matches('p') && element.querySelector('br.ProseMirror-trailingBreak')) {
    const computedStyle = globalThis.window !== undefined ? globalThis.window.getComputedStyle(element) : null
    const parsedLineHeight = Number.parseFloat(computedStyle?.lineHeight ?? '')
    const parsedFontSize = Number.parseFloat(computedStyle?.fontSize ?? '')

    if (Number.isFinite(parsedLineHeight)) {
      trailingEmptyLineHeight = parsedLineHeight
    } else if (Number.isFinite(parsedFontSize)) {
      trailingEmptyLineHeight = parsedFontSize * 1.2
    }
  }

  return Math.max(
    element.offsetHeight,
    element.clientHeight,
    element.scrollHeight,
    rectHeight,
    measuredContentHeight,
    trailingEmptyLineHeight
  )
}

function getElementTopInEditor(editorDom: HTMLElement, element: HTMLElement): number {
  const editorRect = editorDom.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  return elementRect.top - editorRect.top + editorDom.scrollTop
}

function getElementBottomInEditor(editorDom: HTMLElement, element: HTMLElement): number {
  const editorRect = editorDom.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  return elementRect.bottom - editorRect.top + editorDom.scrollTop
}

function getMeasuredElementBottomInEditor(editorDom: HTMLElement, element: HTMLElement): number {
  const layoutHeight = getElementLayoutHeight(element)
  return Math.max(
    getElementBottomInEditor(editorDom, element),
    getElementTopInEditor(editorDom, element) + layoutHeight
  )
}

function getBlockMeasurementElementAtPosition(view: EditorView, position: number): HTMLElement | null {
  try {
    const domAtPos = view.domAtPos(position)
    const baseNode =
      domAtPos.node.nodeType === Node.TEXT_NODE ? domAtPos.node.parentElement : (domAtPos.node as Element | null)

    if (!(baseNode instanceof HTMLElement) || !view.dom.contains(baseNode)) {
      return null
    }

    return baseNode.closest(
      'p, li, blockquote, pre, h1, h2, h3, h4, h5, h6, td, th, figure, figcaption'
    ) as HTMLElement | null
  } catch {
    return null
  }
}

function getPageBodyBandsForMeasurement(editorDom: HTMLElement) {
  const editorRect = editorDom.getBoundingClientRect()

  return Array.from(editorDom.querySelectorAll('.rm-page-body-layer[data-rm-page-number]'))
    .filter((element): element is HTMLElement => element instanceof HTMLElement)
    .map(element => {
      const rect = element.getBoundingClientRect()
      return {
        pageNumber: Number(element.dataset.rmPageNumber ?? '0'),
        top: rect.top - editorRect.top + editorDom.scrollTop,
        bottom: rect.bottom - editorRect.top + editorDom.scrollTop
      }
    })
    .filter(band => Number.isFinite(band.pageNumber) && band.pageNumber > 0 && band.bottom > band.top)
    .sort((left, right) => left.pageNumber - right.pageNumber)
}

function getPreviousContentElement(element: HTMLElement): HTMLElement | null {
  let previous = element.previousElementSibling

  while (previous) {
    if (!isPaginationMeasurementHelper(previous) && previous instanceof HTMLElement) {
      return previous
    }
    previous = previous.previousElementSibling
  }

  return null
}

function getTableMeasurementElement(element: HTMLElement): HTMLElement {
  if (!element.classList.contains('tableWrapper')) {
    return element
  }

  const tableElement = Array.from(element.children).find(child => child instanceof HTMLTableElement)
  return tableElement instanceof HTMLElement ? tableElement : element
}

function getRepeatedHeaderHeight(
  firstTableNode: ProseMirrorNode,
  secondTableNode: ProseMirrorNode,
  secondTableEl: HTMLElement
) {
  const firstRows = getTableRows(firstTableNode)
  const secondRows = getTableRows(secondTableNode)
  if (!isHeaderRow(firstRows[0]) || !isHeaderRow(secondRows[0])) {
    return 0
  }

  const secondHeaderRow = secondTableEl.querySelector('tr')
  return secondHeaderRow instanceof HTMLElement ? getElementLayoutHeight(secondHeaderRow) : 0
}

function getProjectedMergedTableBottom(
  view: EditorView,
  firstTableNode: ProseMirrorNode,
  firstTableEl: HTMLElement,
  secondTableNode: ProseMirrorNode,
  secondTableEl: HTMLElement
) {
  const firstMeasurementElement = getTableMeasurementElement(firstTableEl)
  const secondMeasurementElement = getTableMeasurementElement(secondTableEl)
  const firstBottom = getMeasuredElementBottomInEditor(view.dom, firstMeasurementElement)
  const secondTop = getElementTopInEditor(view.dom, secondMeasurementElement)
  const secondBottom = getMeasuredElementBottomInEditor(view.dom, secondMeasurementElement)
  const gapBetweenTables = Math.max(0, secondTop - firstBottom)
  const repeatedHeaderHeight = getRepeatedHeaderHeight(firstTableNode, secondTableNode, secondMeasurementElement)

  return secondBottom - gapBetweenTables - repeatedHeaderHeight
}

function getElementMarginTop(element: HTMLElement): number {
  if (globalThis.window === undefined) return 0

  const computedStyle = globalThis.window.getComputedStyle(element)
  const marginTop = Number.parseFloat(computedStyle.marginTop ?? '')

  return Number.isFinite(marginTop) ? marginTop : 0
}

function getElementMarginBottom(element: HTMLElement): number {
  if (globalThis.window === undefined) return 0

  const computedStyle = globalThis.window.getComputedStyle(element)
  const marginBottom = Number.parseFloat(computedStyle.marginBottom ?? '')

  return Number.isFinite(marginBottom) ? marginBottom : 0
}

function getCollapsedBlockGap(previousElement: HTMLElement, nextElement: HTMLElement): number {
  return Math.max(getElementMarginBottom(previousElement), getElementMarginTop(nextElement))
}

function getBandIndexForOffset(
  bodyBands: Array<{ pageNumber: number; top: number; bottom: number }>,
  offset: number,
  tolerance: number
) {
  let bandIndex = 0

  while (bandIndex < bodyBands.length - 1 && offset >= bodyBands[bandIndex].bottom - tolerance) {
    bandIndex += 1
  }

  return bandIndex
}

function isOffsetWithinBand(band: { top: number; bottom: number }, offset: number, tolerance: number) {
  return offset >= band.top - tolerance && offset <= band.bottom + tolerance
}

function getSplitIndexForPushedTable(
  view: EditorView,
  tableNode: ProseMirrorNode,
  tablePos: number,
  bodyBands: Array<{ pageNumber: number; top: number; bottom: number }>,
  tolerance: number,
  currentSplitRowCount: number | null
) {
  const tableDom = view.nodeDOM(tablePos)
  if (!(tableDom instanceof HTMLElement)) return null

  const tableMeasurementElement = getTableMeasurementElement(tableDom)
  const tableTop = getElementTopInEditor(view.dom, tableMeasurementElement)
  const tableBandIndex = getBandIndexForOffset(bodyBands, tableTop, tolerance)
  if (tableBandIndex <= 0 || tableBandIndex >= bodyBands.length) return null

  const currentBand = bodyBands[tableBandIndex]
  const previousBand = bodyBands[tableBandIndex - 1]
  if (!currentBand || !previousBand) return null

  const previousContentElement = getPreviousContentElement(tableDom)
  if (!(previousContentElement instanceof HTMLElement)) return null

  const previousContentBottom = getMeasuredElementBottomInEditor(view.dom, previousContentElement)
  if (!isOffsetWithinBand(previousBand, previousContentBottom, tolerance)) return null

  const availableTop = previousContentBottom + getCollapsedBlockGap(previousContentElement, tableMeasurementElement)
  const availableHeight = previousBand.bottom - availableTop
  if (availableHeight <= tolerance) return null

  const rowEntries = getTableRowEntries(tableNode, tablePos)
  if (rowEntries.length < 2) return null

  let splitIndex: number | null = null

  for (const rowEntry of rowEntries) {
    const rowDom = view.nodeDOM(rowEntry.rowPos)
    if (!(rowDom instanceof HTMLTableRowElement)) continue

    const rowBottom = getElementBottomInEditor(view.dom, rowDom)
    const rowHeight = Math.max(0, rowBottom - getElementTopInEditor(view.dom, rowDom))
    const consumedHeight = Math.max(0, rowBottom - tableTop)
    const spareSpace = availableHeight - consumedHeight

    if (rowHeight >= availableHeight - tolerance) continue

    if (consumedHeight <= availableHeight + tolerance) {
      if (currentSplitRowCount !== null && spareSpace < TABLE_SPLIT_RETURN_HYSTERESIS_PX) {
        break
      }
      splitIndex = rowEntry.rowIndex + 1
      break
    }
  }

  if (splitIndex === null || splitIndex >= rowEntries.length) return null

  return splitIndex
}

function getTableRowEntries(tableNode: ProseMirrorNode, tablePos: number): TableRowEntry[] {
  const rows: TableRowEntry[] = []

  tableNode.forEach((childNode, childOffset) => {
    if (!childNode.type || childNode.type.name === 'tableRow') {
      rows.push({
        node: childNode,
        rowIndex: rows.length,
        rowPos: tablePos + 1 + childOffset
      })
      return
    }

    if (childNode.type.name !== 'tableRowGroup') return

    const rowGroupPos = tablePos + 1 + childOffset
    childNode.forEach((rowNode, rowOffset) => {
      if (rowNode.type && rowNode.type.name !== 'tableRow') return

      rows.push({
        node: rowNode,
        rowIndex: rows.length,
        rowPos: rowGroupPos + 1 + rowOffset
      })
    })
  })

  return rows
}

function getTableColumnCount(tableNode: ProseMirrorNode) {
  const firstRow = getTableRows(tableNode)[0]
  if (!firstRow) return 1

  let columnCount = 0
  firstRow.forEach(cellNode => {
    columnCount += Math.max(1, Number(cellNode.attrs.colspan ?? 1))
  })

  return Math.max(1, columnCount)
}

export function findOverflowingTableSplit(view: EditorView): TableOverflowSplitCandidate | null {
  const bodyBands = getPageBodyBandsForMeasurement(view.dom)
  if (!bodyBands.length) return null

  const tolerance = 1
  const overflowThreshold = tolerance + TABLE_SPLIT_OVERFLOW_HYSTERESIS_PX
  let candidate: TableOverflowSplitCandidate | null = null
  const tables: Array<{ node: ProseMirrorNode; pos: number }> = []

  view.state.doc.descendants((node, pos) => {
    if (node.type.name === 'table') {
      tables.push({ node, pos })
      return false
    }

    return true
  })

  tables.forEach(({ node, pos }) => {
    const rowEntries = getTableRowEntries(node, pos)
    const columnCount = getTableColumnCount(node)
    const paginationSplitId = getTablePaginationSplitId(node)
    const previousFragment =
      paginationSplitId != null
        ? getAdjacentPaginationTableFragment(view.state.doc, pos, 'previous', paginationSplitId)
        : null
    const nextFragment =
      paginationSplitId != null
        ? getAdjacentPaginationTableFragment(view.state.doc, pos, 'next', paginationSplitId)
        : null

    if (rowEntries.length < 2 || columnCount < 1) {
      return
    }

    const pushedSplitIndex = getSplitIndexForPushedTable(
      view,
      node,
      pos,
      bodyBands,
      tolerance,
      previousFragment?.rowCount ?? null
    )

    if (pushedSplitIndex !== null) {
      const safeSplitIndex = findSafeSplitRow(node, pushedSplitIndex)

      if (safeSplitIndex >= 1 && safeSplitIndex < rowEntries.length) {
        candidate ??=
          previousFragment && paginationSplitId != null
            ? {
                mode: 'rebalance',
                tablePos: previousFragment.pos,
                splitRowIndex: resolveMergedSplitIndex(previousFragment.node, node, safeSplitIndex),
                paginationSplitId
              }
            : {
                mode: 'split',
                tablePos: pos,
                splitRowIndex: safeSplitIndex,
                paginationSplitId
              }
      }
      return
    }

    let currentBandIndex = 0

    for (const rowEntry of rowEntries) {
      const rowDom = view.nodeDOM(rowEntry.rowPos)
      if (!(rowDom instanceof HTMLTableRowElement)) continue

      const rowTop = getElementTopInEditor(view.dom, rowDom)
      const rowBottom = getElementBottomInEditor(view.dom, rowDom)
      const rowHeight = Math.max(0, rowBottom - rowTop)

      currentBandIndex = getBandIndexForOffset(bodyBands, rowTop, tolerance)

      const currentBand = bodyBands[currentBandIndex]
      if (!currentBand) continue
      const resolvedCurrentBandHeight = currentBand.bottom - currentBand.top

      if (rowHeight >= resolvedCurrentBandHeight - tolerance) continue
      if (rowBottom <= currentBand.bottom + overflowThreshold) continue
      if (rowEntry.rowIndex <= 0 || rowEntry.rowIndex >= rowEntries.length) continue

      const safeSplitIndex = findSafeSplitRow(node, rowEntry.rowIndex)

      if (safeSplitIndex < 1 || safeSplitIndex >= rowEntries.length) {
        break
      }

      candidate ??=
        nextFragment && paginationSplitId != null
          ? {
              mode: 'rebalance',
              tablePos: pos,
              splitRowIndex: safeSplitIndex,
              paginationSplitId
            }
          : {
              mode: 'split',
              tablePos: pos,
              splitRowIndex: safeSplitIndex,
              paginationSplitId
            }

      break
    }
  })

  return candidate
}

export function findMergeableTableFragments(view: EditorView): MergeableTableFragmentsCandidate | null {
  const bodyBands = getPageBodyBandsForMeasurement(view.dom)
  if (!bodyBands.length) return null

  const tolerance = 1
  let previousTable: {
    node: ProseMirrorNode
    pos: number
    paginationSplitId: string
    bandIndex: number
    tableDom: HTMLElement
  } | null = null
  let candidate: MergeableTableFragmentsCandidate | null = null

  view.state.doc.descendants((node, pos) => {
    if (candidate || node.type.name !== 'table') return !candidate

    const paginationSplitId =
      typeof node.attrs.paginationSplitId === 'string' && node.attrs.paginationSplitId.length > 0
        ? node.attrs.paginationSplitId
        : null

    if (!paginationSplitId) {
      previousTable = null
      return !candidate
    }

    const tableDom = view.nodeDOM(pos)
    if (!(tableDom instanceof HTMLElement)) {
      previousTable = null
      return !candidate
    }

    const tableMeasurementElement = getTableMeasurementElement(tableDom)
    const bandIndex = getBandIndexForOffset(
      bodyBands,
      getElementTopInEditor(view.dom, tableMeasurementElement),
      tolerance
    )
    const currentBand = bodyBands[bandIndex]
    const tableBottom = getMeasuredElementBottomInEditor(view.dom, tableMeasurementElement)

    if (!currentBand || tableBottom > currentBand.bottom - TABLE_MERGE_SAFETY_MARGIN_PX) {
      previousTable = {
        node,
        pos,
        paginationSplitId,
        bandIndex,
        tableDom
      }
      return !candidate
    }

    const prevTable = previousTable
    if (
      prevTable &&
      prevTable.paginationSplitId === paginationSplitId &&
      pos === prevTable.pos + prevTable.node.nodeSize &&
      bandIndex === prevTable.bandIndex
    ) {
      const projectedMergedBottom = getProjectedMergedTableBottom(
        view,
        prevTable.node,
        prevTable.tableDom,
        node,
        tableDom
      )
      if (projectedMergedBottom > currentBand.bottom - TABLE_MERGE_SAFETY_MARGIN_PX) {
        previousTable = {
          node,
          pos,
          paginationSplitId,
          bandIndex,
          tableDom
        }
        return !candidate
      }

      candidate = {
        firstTablePos: prevTable.pos,
        secondTablePos: pos,
        paginationSplitId
      }
      return !candidate
    }

    previousTable = {
      node,
      pos,
      paginationSplitId,
      bandIndex,
      tableDom
    }

    return !candidate
  })

  return candidate
}

export function findAdjacentPaginationTableFragments(doc: ProseMirrorNode): MergeableTableFragmentsCandidate | null {
  let previousTable: {
    node: ProseMirrorNode
    pos: number
    paginationSplitId: string
  } | null = null
  let candidate: MergeableTableFragmentsCandidate | null = null

  doc.descendants((node, pos) => {
    if (candidate || node.type.name !== 'table') return !candidate

    const paginationSplitId = getTablePaginationSplitId(node)
    if (!paginationSplitId) {
      previousTable = null
      return !candidate
    }

    const prevTable = previousTable
    if (
      prevTable &&
      prevTable.paginationSplitId === paginationSplitId &&
      pos === prevTable.pos + prevTable.node.nodeSize
    ) {
      candidate = {
        firstTablePos: prevTable.pos,
        secondTablePos: pos,
        paginationSplitId
      }
      return !candidate
    }

    previousTable = {
      node,
      pos,
      paginationSplitId
    }

    return !candidate
  })

  return candidate
}

export function getSelectionBottom(view: EditorView): number {
  const { from, to } = view.state.selection
  const positions = from === to ? [from] : [from, to]
  const editorRect = view.dom.getBoundingClientRect()
  let selectionBottom = 0

  for (const position of positions) {
    try {
      const coords = view.coordsAtPos(position)
      selectionBottom = Math.max(selectionBottom, coords.bottom - editorRect.top + view.dom.scrollTop)
    } catch {
      // Ignore positions that cannot be resolved while the DOM is updating.
    }

    const blockMeasurementElement = getBlockMeasurementElementAtPosition(view, position)
    if (blockMeasurementElement) {
      selectionBottom = Math.max(selectionBottom, getMeasuredElementBottomInEditor(view.dom, blockMeasurementElement))
    }
  }

  return selectionBottom
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
  if (isEffectivelyEmptyDocument(view.state.doc)) {
    layoutOptions.onDebug?.({
      reason: 'empty-doc',
      hasPaginationElement: false,
      currentPageCount: 0,
      resultPageCount: 1,
      contentBottom: null,
      selectionBottom: 0,
      measuredBottom: 0,
      pageContentHeight: getPageBodyHeightForCount(pageFormat, layoutOptions, 1),
      lastPageBreakBottom: null,
      lastPageGap: null,
      lowerBound: null
    })
    return 1
  }

  const editorDom = view.dom
  const paginationElement = editorDom.querySelector('[data-rm-pagination]')
  const currentPageCount = getExistingPageCount(view)
  const lastContentElement = getLastContentElement(editorDom)
  const selectionBottom = getSelectionBottom(view)
  const contentBottom = lastContentElement ? getMeasuredElementBottomInEditor(editorDom, lastContentElement) : null
  const measuredBottom = contentBottom === null ? selectionBottom : Math.max(contentBottom, selectionBottom)
  const pageContentHeight = getMinimumMeasuredBodyHeight(pageFormat, currentPageCount, layoutOptions)

  if (paginationElement) {
    const lastPageBreakRaw = paginationElement.lastElementChild?.querySelector('.breaker')
    const lastPageBreak = lastPageBreakRaw instanceof HTMLElement ? lastPageBreakRaw : null
    const canMeasurePagination = lastPageBreak !== null && (lastContentElement !== null || selectionBottom > 0)

    if (!canMeasurePagination) {
      const resultPageCount = Math.max(1, currentPageCount)
      layoutOptions.onDebug?.({
        reason: 'existing-no-op',
        hasPaginationElement: true,
        currentPageCount,
        resultPageCount,
        contentBottom,
        selectionBottom,
        measuredBottom,
        pageContentHeight,
        lastPageBreakBottom: lastPageBreak ? getMeasuredElementBottomInEditor(editorDom, lastPageBreak) : null,
        lastPageGap: null,
        lowerBound: null
      })
      return resultPageCount
    }

    const lastPageBreakBottom = getMeasuredElementBottomInEditor(editorDom, lastPageBreak)
    const lastPageGap = measuredBottom - lastPageBreakBottom

    const gapResolution = resolvePageCountFromLastPageGap({
      currentPageCount,
      lastPageGap,
      pageContentHeight,
      pageFormatHeight: pageFormat.height,
      pageGap
    })

    if (gapResolution.reason === 'add-pages') {
      layoutOptions.onDebug?.({
        reason: 'add-pages',
        hasPaginationElement: true,
        currentPageCount,
        resultPageCount: gapResolution.resultPageCount,
        contentBottom,
        selectionBottom,
        measuredBottom,
        pageContentHeight,
        lastPageBreakBottom,
        lastPageGap,
        lowerBound: gapResolution.lowerBound
      })
      return gapResolution.resultPageCount
    }

    if (gapResolution.reason === 'keep-existing') {
      layoutOptions.onDebug?.({
        reason: 'keep-existing',
        hasPaginationElement: true,
        currentPageCount,
        resultPageCount: currentPageCount,
        contentBottom,
        selectionBottom,
        measuredBottom,
        pageContentHeight,
        lastPageBreakBottom,
        lastPageGap,
        lowerBound: gapResolution.lowerBound
      })
      return currentPageCount
    }

    layoutOptions.onDebug?.({
      reason: 'remove-pages',
      hasPaginationElement: true,
      currentPageCount,
      resultPageCount: gapResolution.resultPageCount,
      contentBottom,
      selectionBottom,
      measuredBottom,
      pageContentHeight,
      lastPageBreakBottom,
      lastPageGap,
      lowerBound: gapResolution.lowerBound
    })
    return gapResolution.resultPageCount
  }

  if (!lastContentElement && selectionBottom <= 0) {
    layoutOptions.onDebug?.({
      reason: 'initial-count',
      hasPaginationElement: false,
      currentPageCount,
      resultPageCount: 1,
      contentBottom,
      selectionBottom,
      measuredBottom,
      pageContentHeight,
      lastPageBreakBottom: null,
      lastPageGap: null,
      lowerBound: null
    })
    return 1
  }

  const editorHeight = Math.max(measuredBottom, 1)
  const initialPageContentHeight = getPageBodyHeightForCount(pageFormat, layoutOptions, 1)
  const resultPageCount = Math.max(1, Math.ceil(editorHeight / Math.max(1, initialPageContentHeight)))
  layoutOptions.onDebug?.({
    reason: 'initial-count',
    hasPaginationElement: false,
    currentPageCount,
    resultPageCount,
    contentBottom,
    selectionBottom,
    measuredBottom,
    pageContentHeight: initialPageContentHeight,
    lastPageBreakBottom: null,
    lastPageGap: null,
    lowerBound: null
  })
  return resultPageCount
}
