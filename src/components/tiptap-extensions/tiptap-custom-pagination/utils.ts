import { Editor, type Extension, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import {
  applyImageWrapExclusions,
  resolveImageWrapExclusions,
  type PageWrapBand
} from '@/components/tiptap-extensions/tiptap-custom-image/wrapExclusionRuntime'
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
  documentBottom: number | null
  selectionBottom: number
  measuredBottom: number
  pageContentHeight: number
  lastPageBodyBottom: number | null
  lastPageGap: number | null
  lowerBound: number | null
}

export interface PageBodyMeasurementBand {
  pageNumber: number
  left: number
  right: number
  top: number
  bottom: number
  pageLeft: number
  pageRight: number
}

function sortPageBodyMeasurementBandsIfNeeded<T extends { pageNumber: number }>(bands: T[]): T[] {
  for (let index = 1; index < bands.length; index += 1) {
    const previousBand = bands[index - 1] as (T & { top?: number; left?: number }) | undefined
    const currentBand = bands[index] as T & { top?: number; left?: number }
    if (
      previousBand &&
      (previousBand.pageNumber > currentBand.pageNumber ||
        (previousBand.pageNumber === currentBand.pageNumber &&
          ((previousBand.top ?? 0) > (currentBand.top ?? 0) ||
            ((previousBand.top ?? 0) === (currentBand.top ?? 0) &&
              (previousBand.left ?? 0) > (currentBand.left ?? 0)))))
    ) {
      return [...bands].sort((left, right) => {
        if (left.pageNumber !== right.pageNumber) {
          return left.pageNumber - right.pageNumber
        }

        const topDelta = ((left as { top?: number }).top ?? 0) - ((right as { top?: number }).top ?? 0)
        if (topDelta !== 0) {
          return topDelta
        }

        return ((left as { left?: number }).left ?? 0) - ((right as { left?: number }).left ?? 0)
      })
    }
  }

  return bands
}

export const PAGE_COUNT_ADD_HYSTERESIS_PX = 1
export const PAGE_COUNT_REMOVE_HYSTERESIS_PX = 24
export const TABLE_SPLIT_OVERFLOW_HYSTERESIS_PX = 2
export const TABLE_SPLIT_RETURN_HYSTERESIS_PX = 10
export const TABLE_MERGE_SAFETY_MARGIN_PX = 12

const PAGINATION_DEBUG_FLAG = '__RM_PAGINATION_DEBUG'
let paginationDebugSequence = 0

export function logPaginationDebug(event: string, payload: unknown) {
  if (!(globalThis as typeof globalThis & { [PAGINATION_DEBUG_FLAG]?: boolean })[PAGINATION_DEBUG_FLAG]) {
    return
  }

  paginationDebugSequence += 1
  console.log(`[pagination:${paginationDebugSequence}] ${event}`, payload)
}

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
    s = String.fromCodePoint(base + (x % 26)) + s
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

function readRuntimeLayoutMetric(element: HTMLElement | null, key: string): number {
  const value = Number(element?.dataset[key] ?? '')
  return Number.isFinite(value) ? value : 0
}

function readRuntimeLayoutMode(element: HTMLElement | null, key: string): string {
  const value = element?.dataset[key]
  return typeof value === 'string' ? value : ''
}

function readMeasuredElementHeight(element: HTMLElement | null): number {
  if (!element) return 0
  if (readRuntimeLayoutMode(element, 'imageMeasurementMode') === 'overlay') {
    return 0
  }

  const runtimeLayoutHeight = readRuntimeLayoutMetric(element, 'imageLayoutHeight')
  if (runtimeLayoutHeight > 0) {
    return runtimeLayoutHeight
  }

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
  _pageNumber: number,
  headerHeight = 0,
  footerHeight = 0
): number {
  const { bodyHeight } = getPageLayoutHeights(pageFormat, storage, headerHeight, footerHeight)
  return bodyHeight
}

export function getPageContentHeight(pageFormat: PageFormat): number {
  return Math.max(1, pageFormat.height - pageFormat.margins.top - pageFormat.margins.bottom)
}

const REGION_LAYOUT_INDEX_THRESHOLD = 4
const PAGE_BREAK_INDEX_THRESHOLD = 4

function getHeaderMeasurementSelector(pageNumber: number): string {
  return `[data-rm-editor-type="header"][data-rm-page-number="${pageNumber}"] .rm-page-region-layout`
}

function getFooterMeasurementSelector(pageNumber: number): string {
  return `[data-rm-editor-type="footer"][data-rm-page-number="${pageNumber}"] .rm-page-region-layout`
}

export function resolveViewportMountedPaginationRange(
  editorDom: HTMLElement
): { startPage: number; endPage: number } | null {
  const viewport = editorDom.closest('.document-editor-viewport') as HTMLElement | null
  if (!viewport) {
    return null
  }

  const startPage = Number(viewport.dataset.layoutMountedStart ?? '')
  const endPage = Number(viewport.dataset.layoutMountedEnd ?? '')
  if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage < startPage) {
    return null
  }

  return { startPage, endPage }
}

export function resolveMountedPaginationPageNumbers(editorDom: HTMLElement): number[] {
  const paginationRoot = resolvePaginationElement(editorDom)
  const totalPages = Number(paginationRoot?.dataset.rmTotalPages ?? '')
  const viewportMountedRange = resolveViewportMountedPaginationRange(editorDom)
  const mountedStartPage = Number(paginationRoot?.dataset.rmMountedStartPage ?? '')
  const mountedEndPage = Number(paginationRoot?.dataset.rmMountedEndPage ?? '')

  if (viewportMountedRange) {
    const maxPageNumber =
      Number.isInteger(totalPages) && totalPages > 0
        ? Math.min(totalPages, viewportMountedRange.endPage + 1)
        : viewportMountedRange.endPage + 1
    const pageNumbers: number[] = []
    const shouldInspectFirstPageHeader = viewportMountedRange.startPage > 1

    if (shouldInspectFirstPageHeader) {
      const firstPageHeader = resolveFirstPageHeader(editorDom)
      const firstPageHeaderNumber = Number(firstPageHeader?.dataset.rmPageNumber ?? '')
      if (
        Number.isInteger(firstPageHeaderNumber) &&
        firstPageHeaderNumber > 0 &&
        firstPageHeaderNumber < viewportMountedRange.startPage
      ) {
        pageNumbers.push(firstPageHeaderNumber)
      }
    }

    for (let pageNumber = viewportMountedRange.startPage; pageNumber <= maxPageNumber; pageNumber += 1) {
      pageNumbers.push(pageNumber)
    }

    return pageNumbers
  }

  const hasMountedRangeMetadata =
    Number.isInteger(mountedStartPage) &&
    Number.isInteger(mountedEndPage) &&
    mountedStartPage > 0 &&
    mountedEndPage >= mountedStartPage

  if (hasMountedRangeMetadata) {
    const maxPageNumber =
      Number.isInteger(totalPages) && totalPages > 0 ? Math.min(totalPages, mountedEndPage + 1) : mountedEndPage + 1
    const pageNumbers: number[] = []
    const shouldInspectFirstPageHeader = mountedStartPage > 1

    if (shouldInspectFirstPageHeader) {
      const firstPageHeader = resolveFirstPageHeader(editorDom)
      const firstPageHeaderNumber = Number(firstPageHeader?.dataset.rmPageNumber ?? '')
      if (
        Number.isInteger(firstPageHeaderNumber) &&
        firstPageHeaderNumber > 0 &&
        firstPageHeaderNumber < mountedStartPage
      ) {
        pageNumbers.push(firstPageHeaderNumber)
      }
    }

    for (let pageNumber = mountedStartPage; pageNumber <= maxPageNumber; pageNumber += 1) {
      pageNumbers.push(pageNumber)
    }

    return pageNumbers
  }

  const pageNumbers = new Set<number>()

  Array.from(paginationRoot?.children ?? []).forEach(pageBreak => {
    if (!(pageBreak instanceof HTMLElement) || !pageBreak.classList.contains('rm-page-break')) return
    const pageNumber = resolvePageBreakNumber(pageBreak)
    if (pageNumber === null || pageNumber <= 0) return
    pageNumbers.add(pageNumber)
    pageNumbers.add(pageNumber + 1)
  })

  if (pageNumbers.size === 0) {
    editorDom.querySelectorAll('[data-rm-pagination] > .rm-page-break .page[data-rm-page-number]').forEach(element => {
      if (!(element instanceof HTMLElement)) return
      const pageNumber = Number(element.dataset.rmPageNumber ?? '')
      if (!Number.isInteger(pageNumber) || pageNumber <= 0) return
      pageNumbers.add(pageNumber)
      pageNumbers.add(pageNumber + 1)
    })
  }

  const firstPageHeader = resolveFirstPageHeader(editorDom)
  const firstPageHeaderNumber = Number(firstPageHeader?.dataset.rmPageNumber ?? '')
  if (Number.isInteger(firstPageHeaderNumber) && firstPageHeaderNumber > 0) {
    pageNumbers.add(firstPageHeaderNumber)
  }

  if (pageNumbers.size === 0) {
    pageNumbers.add(1)
  }

  return Array.from(pageNumbers).sort((left, right) => left - right)
}

function findPageBreakElement(
  editorDom: HTMLElement,
  pageNumber: number,
  pageBreaksByPage?: ReadonlyMap<number, HTMLElement> | null,
  paginationElement?: HTMLElement | null
) {
  if (pageBreaksByPage) {
    return pageBreaksByPage.get(pageNumber)
  }

  const mountedPaginationElement = paginationElement ?? resolvePaginationElement(editorDom)
  const directlyIndexedPageBreak = resolveDirectIndexedPageBreak(mountedPaginationElement, pageNumber, editorDom)
  if (directlyIndexedPageBreak) {
    return directlyIndexedPageBreak
  }

  return resolvePaginationPageBreakChildren(mountedPaginationElement).find(pageBreak => {
    if (!(pageBreak instanceof HTMLElement)) return false
    return resolvePageBreakNumber(pageBreak) === pageNumber
  })
}

function resolvePaginationPageBreakChildren(paginationElement: HTMLElement | null) {
  return Array.from(paginationElement?.children ?? []).filter(
    (element): element is HTMLElement => element instanceof HTMLElement && element.classList.contains('rm-page-break')
  )
}

function resolveDirectChildPaginationChrome(editorDom: HTMLElement) {
  return (
    Array.from(editorDom.children).find(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element.dataset.rmPaginationChrome === 'true'
    ) ?? null
  )
}

export function resolveDirectChildPaginationElement(editorDom: HTMLElement) {
  const directChildPaginationElement =
    Array.from(editorDom.children).find(
      (element): element is HTMLElement => element instanceof HTMLElement && element.dataset.rmPagination !== undefined
    ) ?? null
  if (directChildPaginationElement) {
    return directChildPaginationElement
  }

  const paginationChrome = resolveDirectChildPaginationChrome(editorDom)
  if (!paginationChrome) {
    return null
  }

  return (
    Array.from(paginationChrome.children).find(
      (element): element is HTMLElement => element instanceof HTMLElement && element.dataset.rmPagination !== undefined
    ) ?? null
  )
}

function resolveDirectChildFirstPageHeader(editorDom: HTMLElement) {
  const directChildFirstPageHeader =
    Array.from(editorDom.children).find(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        element.classList.contains('rm-first-page-header') &&
        element.dataset.rmEditorType === 'header' &&
        element.dataset.rmPageNumber === '1'
    ) ?? null
  if (directChildFirstPageHeader) {
    return directChildFirstPageHeader
  }

  const paginationChrome = resolveDirectChildPaginationChrome(editorDom)
  if (!paginationChrome) {
    return null
  }

  return (
    Array.from(paginationChrome.children).find(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        element.classList.contains('rm-first-page-header') &&
        element.dataset.rmEditorType === 'header' &&
        element.dataset.rmPageNumber === '1'
    ) ?? null
  )
}

function resolvePaginationElement(editorDom: HTMLElement): HTMLElement | null {
  return resolveDirectChildPaginationElement(editorDom)
}

function resolveFirstPageHeader(editorDom: HTMLElement): HTMLElement | null {
  return resolveDirectChildFirstPageHeader(editorDom)
}

function resolveDirectChildRegionLayoutsByPage(
  editorDom: HTMLElement,
  editorType: 'header' | 'footer',
  pageNumbersToMeasure: ReadonlySet<number>,
  regionLayouts: Map<number, HTMLElement>
) {
  const collectFromContainer = (container: HTMLElement) => {
    Array.from(container.children).forEach(child => {
      if (!(child instanceof HTMLElement)) return

      const pageNumber = Number(child.dataset.rmPageNumber ?? '')
      if (
        child.dataset.rmEditorType !== editorType ||
        !Number.isInteger(pageNumber) ||
        pageNumber <= 0 ||
        !pageNumbersToMeasure.has(pageNumber) ||
        regionLayouts.has(pageNumber)
      ) {
        return
      }

      const regionLayout = child.querySelector('.rm-page-region-layout') as HTMLElement | null
      if (regionLayout) {
        regionLayouts.set(pageNumber, regionLayout)
      }
    })
  }

  collectFromContainer(editorDom)

  if (regionLayouts.size === pageNumbersToMeasure.size) {
    return
  }

  const paginationChrome = resolveDirectChildPaginationChrome(editorDom)
  if (paginationChrome) {
    collectFromContainer(paginationChrome)
  }
}

function resolveDirectIndexedPaginationRange(
  paginationElement: HTMLElement | null,
  editorDom: HTMLElement | null = null
) {
  if (!(paginationElement instanceof HTMLElement)) {
    return null
  }

  const pageBreakEls = resolvePaginationPageBreakChildren(paginationElement)
  const pageBreakCount = pageBreakEls.length
  const totalPages = Number(paginationElement.dataset.rmTotalPages ?? '')
  if (Number.isInteger(totalPages) && totalPages > 0 && pageBreakCount === totalPages) {
    return {
      startPage: 1,
      endPage: totalPages
    }
  }

  const viewportMountedRange = editorDom ? resolveViewportMountedPaginationRange(editorDom) : null
  if (viewportMountedRange && pageBreakCount > 0) {
    return {
      startPage: viewportMountedRange.startPage,
      endPage: Math.min(viewportMountedRange.endPage, viewportMountedRange.startPage + pageBreakCount - 1)
    }
  }

  const mountedStartPage = Number(paginationElement.dataset.rmMountedStartPage ?? '')
  const mountedEndPage = Number(paginationElement.dataset.rmMountedEndPage ?? '')
  const mountedRangeLength =
    Number.isInteger(mountedStartPage) &&
    Number.isInteger(mountedEndPage) &&
    mountedStartPage > 0 &&
    mountedEndPage >= mountedStartPage
      ? mountedEndPage - mountedStartPage + 1
      : null

  if (mountedRangeLength !== null && pageBreakCount === mountedRangeLength) {
    return {
      startPage: mountedStartPage,
      endPage: mountedEndPage
    }
  }

  return null
}

function resolveDirectIndexedPageBreak(
  paginationElement: HTMLElement | null,
  pageNumber: number,
  editorDom: HTMLElement | null = null
) {
  if (!(paginationElement instanceof HTMLElement) || pageNumber < 1) {
    return null
  }

  const directIndexedRange = resolveDirectIndexedPaginationRange(paginationElement, editorDom)
  if (!directIndexedRange || pageNumber < directIndexedRange.startPage || pageNumber > directIndexedRange.endPage) {
    return null
  }

  const pageBreak =
    resolvePaginationPageBreakChildren(paginationElement)[pageNumber - directIndexedRange.startPage] ?? null
  if (!(pageBreak instanceof HTMLElement)) {
    return null
  }

  return resolvePageBreakNumber(pageBreak) === pageNumber ? pageBreak : null
}

function resolvePageBreakBodyLayer(pageBreak: HTMLElement) {
  const bodyLayer = pageBreak.querySelector('.rm-page-body-layer') as HTMLElement | null
  const bodyLayerPageNumber = Number(bodyLayer?.dataset.rmPageNumber ?? '')
  return Number.isInteger(bodyLayerPageNumber) && bodyLayerPageNumber > 0 ? bodyLayer : null
}

function resolveDirectIndexedPageBodyLayer(
  paginationElement: HTMLElement | null,
  pageNumber: number,
  editorDom: HTMLElement | null = null
) {
  const pageBreak = resolveDirectIndexedPageBreak(paginationElement, pageNumber, editorDom)
  if (!(pageBreak instanceof HTMLElement)) {
    return null
  }

  const bodyLayer = resolvePageBreakBodyLayer(pageBreak)
  return Number(bodyLayer?.dataset.rmPageNumber ?? '') === pageNumber ? bodyLayer : null
}

function resolveFallbackPageBreakBodyLayer(paginationElement: HTMLElement | null, pageNumber: number) {
  for (const pageBreak of resolvePaginationPageBreakChildren(paginationElement)) {
    const bodyLayer = resolvePageBreakBodyLayer(pageBreak)
    if (Number(bodyLayer?.dataset.rmPageNumber ?? '') === pageNumber) {
      return bodyLayer
    }
  }

  return null
}

export function resolvePageBodyLayers(editorDom: HTMLElement): HTMLElement[] {
  const paginationElement = resolvePaginationElement(editorDom)
  const directIndexedRange = resolveDirectIndexedPaginationRange(paginationElement, editorDom)

  if (directIndexedRange) {
    const bodyLayers: HTMLElement[] = []

    for (let pageNumber = directIndexedRange.startPage; pageNumber <= directIndexedRange.endPage; pageNumber += 1) {
      const bodyLayer = resolveDirectIndexedPageBodyLayer(paginationElement, pageNumber, editorDom)
      if (!(bodyLayer instanceof HTMLElement)) {
        bodyLayers.length = 0
        break
      }

      bodyLayers.push(bodyLayer)
    }

    if (bodyLayers.length > 0) {
      return bodyLayers
    }
  }

  const pageBreakEls = resolvePaginationPageBreakChildren(paginationElement)
  if (pageBreakEls.length > 0) {
    const bodyLayers = pageBreakEls
      .map(pageBreak => resolvePageBreakBodyLayer(pageBreak))
      .filter((bodyLayer): bodyLayer is HTMLElement => bodyLayer instanceof HTMLElement)

    if (bodyLayers.length > 0) {
      return bodyLayers
    }
  }

  return Array.from(editorDom.querySelectorAll('.rm-page-body-layer[data-rm-page-number]')).filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  )
}

function readPlaceholderMeasurementValue(element: HTMLElement | null, key: string) {
  const value = Number(element?.dataset[key] ?? '')
  return Number.isFinite(value) && value >= 0 ? value : 0
}

function readHeaderPlaceholderHeight(
  editorDom: HTMLElement,
  pageNumber: number,
  pageBreaksByPage?: ReadonlyMap<number, HTMLElement> | null,
  paginationElement?: HTMLElement | null
) {
  if (pageNumber <= 1) return 0
  const pageBreak = findPageBreakElement(editorDom, pageNumber - 1, pageBreaksByPage, paginationElement)
  const breaker = pageBreak?.querySelector('.breaker') as HTMLElement | null
  return readPlaceholderMeasurementValue(breaker, 'rmBreakerNextHeaderHeight')
}

function readFooterPlaceholderHeight(
  editorDom: HTMLElement,
  pageNumber: number,
  pageBreaksByPage?: ReadonlyMap<number, HTMLElement> | null,
  paginationElement?: HTMLElement | null
) {
  const pageBreak = findPageBreakElement(editorDom, pageNumber, pageBreaksByPage, paginationElement)
  const breaker = pageBreak?.querySelector('.breaker') as HTMLElement | null
  return readPlaceholderMeasurementValue(breaker, 'rmBreakerFooterHeight')
}

function getLastMeasurableChild(root: HTMLElement): HTMLElement | null {
  return root.lastElementChild as HTMLElement | null
}

function readHeaderFooterRegionHeight(regionLayout: HTMLElement | null) {
  if (!regionLayout) return 0

  let measuredHeight = readMeasuredElementHeight(regionLayout)
  const contentRoot = regionLayout.querySelector('[data-rm-page-number-body="true"]') as HTMLElement | null
  if (!contentRoot) return measuredHeight

  measuredHeight = Math.max(measuredHeight, getElementLayoutHeight(contentRoot))

  const liveContentRoot = (contentRoot.querySelector('.ProseMirror') as HTMLElement | null) ?? contentRoot
  measuredHeight = Math.max(measuredHeight, getElementLayoutHeight(liveContentRoot))

  const lastBlock = getLastMeasurableChild(liveContentRoot)
  if (lastBlock) {
    measuredHeight = Math.max(measuredHeight, getMeasuredElementBottomInEditor(liveContentRoot, lastBlock))
  }

  return measuredHeight
}

function resolveRegionLayoutsByPage(
  editorDom: HTMLElement,
  editorType: 'header' | 'footer',
  pageNumbers: readonly number[]
) {
  const pageNumbersToMeasure = new Set(pageNumbers)
  const regionLayouts = new Map<number, HTMLElement>()
  const paginationElement = resolveDirectChildPaginationElement(editorDom)

  if (editorType === 'header' && pageNumbersToMeasure.has(1)) {
    const firstPageHeader = resolveDirectChildFirstPageHeader(editorDom)
    const firstPageHeaderLayout = firstPageHeader?.querySelector('.rm-page-region-layout') as HTMLElement | null
    if (firstPageHeaderLayout) {
      regionLayouts.set(1, firstPageHeaderLayout)
    }
  }

  resolvePaginationPageBreakChildren(paginationElement).forEach(pageBreak => {
    const pageBreakNumber = resolvePageBreakNumber(pageBreak)
    if (pageBreakNumber === null) return

    const targetPageNumber = editorType === 'footer' ? pageBreakNumber : pageBreakNumber + 1
    if (!pageNumbersToMeasure.has(targetPageNumber) || regionLayouts.has(targetPageNumber)) {
      return
    }

    const selector =
      editorType === 'footer'
        ? `.rm-page-footer-region[data-rm-page-number="${targetPageNumber}"][data-rm-editor-type="footer"]`
        : `.rm-page-header-region[data-rm-page-number="${targetPageNumber}"][data-rm-editor-type="header"]`
    const region = pageBreak.querySelector(selector) as HTMLElement | null
    const regionLayout = region?.querySelector('.rm-page-region-layout') as HTMLElement | null
    if (regionLayout) {
      regionLayouts.set(targetPageNumber, regionLayout)
    }
  })

  if (regionLayouts.size === pageNumbersToMeasure.size) {
    return regionLayouts
  }

  resolveDirectChildRegionLayoutsByPage(editorDom, editorType, pageNumbersToMeasure, regionLayouts)
  if (regionLayouts.size === pageNumbersToMeasure.size) {
    return regionLayouts
  }

  editorDom.querySelectorAll(`[data-rm-editor-type="${editorType}"][data-rm-page-number]`).forEach(region => {
    if (!(region instanceof HTMLElement)) return

    const pageNumber = Number(region.dataset.rmPageNumber ?? '')
    if (!Number.isInteger(pageNumber) || pageNumber <= 0 || !pageNumbersToMeasure.has(pageNumber)) {
      return
    }

    const regionLayout = region.querySelector('.rm-page-region-layout') as HTMLElement | null
    if (regionLayout) {
      regionLayouts.set(pageNumber, regionLayout)
    }
  })

  return regionLayouts
}

function resolveRegionLayoutForPage(
  editorDom: HTMLElement,
  editorType: 'header' | 'footer',
  pageNumber: number,
  paginationElement: HTMLElement | null,
  firstPageHeader: HTMLElement | null
) {
  if (editorType === 'header' && pageNumber === 1) {
    const regionLayout = firstPageHeader?.querySelector('.rm-page-region-layout') as HTMLElement | null
    if (regionLayout) {
      return regionLayout
    }
  } else {
    const pageBreak = findPageBreakElement(
      editorDom,
      editorType === 'footer' ? pageNumber : pageNumber - 1,
      null,
      paginationElement
    )
    const selector =
      editorType === 'footer'
        ? `.rm-page-footer-region[data-rm-page-number="${pageNumber}"][data-rm-editor-type="footer"]`
        : `.rm-page-header-region[data-rm-page-number="${pageNumber}"][data-rm-editor-type="header"]`
    const region = pageBreak?.querySelector(selector) as HTMLElement | null
    const regionLayout = region?.querySelector('.rm-page-region-layout') as HTMLElement | null
    if (regionLayout) {
      return regionLayout
    }
  }

  const selector =
    editorType === 'header' ? getHeaderMeasurementSelector(pageNumber) : getFooterMeasurementSelector(pageNumber)
  return (editorDom.querySelector(selector) as HTMLElement | null) ?? null
}

function resolvePageBreaksByPage(editorDom: HTMLElement, pageNumbers: readonly number[]) {
  const pageNumbersToMeasure = new Set(pageNumbers)
  const pageBreaks = new Map<number, HTMLElement>()
  const paginationElement = resolvePaginationElement(editorDom)
  Array.from(pageNumbersToMeasure)
    .sort((left, right) => left - right)
    .forEach(pageNumber => {
      const directlyIndexedPageBreak = resolveDirectIndexedPageBreak(paginationElement, pageNumber, editorDom)
      if (!directlyIndexedPageBreak) {
        return
      }

      pageBreaks.set(pageNumber, directlyIndexedPageBreak)
      pageNumbersToMeasure.delete(pageNumber)
    })

  if (pageNumbersToMeasure.size === 0) {
    return pageBreaks
  }

  resolvePaginationPageBreakChildren(paginationElement).forEach(pageBreak => {
    if (!(pageBreak instanceof HTMLElement)) return

    const pageNumber = resolvePageBreakNumber(pageBreak)
    if (pageNumber === null || pageNumber <= 0 || !pageNumbersToMeasure.has(pageNumber)) {
      return
    }

    pageBreaks.set(pageNumber, pageBreak)
  })

  return pageBreaks
}

function resolvePageBreakNumber(pageBreak: HTMLElement) {
  const pageBreakNumber = Number(pageBreak.dataset.rmPageNumber ?? '')
  if (Number.isInteger(pageBreakNumber) && pageBreakNumber > 0) {
    return pageBreakNumber
  }

  const page = pageBreak.querySelector('.page[data-rm-page-number]') as HTMLElement | null
  const pageNumber = Number(page?.dataset.rmPageNumber ?? '')
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null
}

export function measureHeaderFooterContentHeights(
  editorDom: HTMLElement,
  totalPages: number,
  pageFormat: PageFormat,
  storage: Pick<PagesStorage, 'headerTopMargin' | 'footerBottomMargin'>,
  pageNumbers?: Iterable<number>
): MeasuredHeaderFooterHeights {
  const headerHeights = new Map<number, number>()
  const footerHeights = new Map<number, number>()
  const resolvedPageNumbers = (
    pageNumbers ? Array.from(new Set(pageNumbers)) : resolveMountedPaginationPageNumbers(editorDom)
  ).filter(pageNumber => Number.isInteger(pageNumber) && pageNumber > 0 && pageNumber <= totalPages)
  const shouldIndexRegionLayouts = resolvedPageNumbers.length > REGION_LAYOUT_INDEX_THRESHOLD
  const shouldIndexPageBreaks = resolvedPageNumbers.length > PAGE_BREAK_INDEX_THRESHOLD
  const headerRegionLayouts = shouldIndexRegionLayouts
    ? resolveRegionLayoutsByPage(editorDom, 'header', resolvedPageNumbers)
    : null
  const footerRegionLayouts = shouldIndexRegionLayouts
    ? resolveRegionLayoutsByPage(editorDom, 'footer', resolvedPageNumbers)
    : null
  let pageBreaksByPage: Map<number, HTMLElement> | null | undefined
  let paginationElement: HTMLElement | null | undefined
  let firstPageHeader: HTMLElement | null | undefined

  const resolveIndexedPageBreaks = () => {
    if (pageBreaksByPage !== undefined) {
      return pageBreaksByPage
    }

    pageBreaksByPage = shouldIndexPageBreaks ? resolvePageBreaksByPage(editorDom, resolvedPageNumbers) : null
    return pageBreaksByPage
  }

  const getResolvedPaginationElement = () => {
    if (paginationElement !== undefined) {
      return paginationElement
    }

    paginationElement = resolvePaginationElement(editorDom)
    return paginationElement
  }

  const getResolvedFirstPageHeader = () => {
    if (firstPageHeader !== undefined) {
      return firstPageHeader
    }

    firstPageHeader =
      resolveDirectChildFirstPageHeader(editorDom) ??
      (editorDom.querySelector(
        '.rm-first-page-header[data-rm-page-number="1"][data-rm-editor-type="header"]'
      ) as HTMLElement | null) ??
      null
    return firstPageHeader
  }

  resolvedPageNumbers.forEach(pageNumber => {
    const headerRegionLayout =
      headerRegionLayouts === null
        ? resolveRegionLayoutForPage(
            editorDom,
            'header',
            pageNumber,
            getResolvedPaginationElement(),
            getResolvedFirstPageHeader()
          )
        : (headerRegionLayouts.get(pageNumber) ?? null)
    const footerRegionLayout =
      footerRegionLayouts === null
        ? resolveRegionLayoutForPage(
            editorDom,
            'footer',
            pageNumber,
            getResolvedPaginationElement(),
            getResolvedFirstPageHeader()
          )
        : (footerRegionLayouts.get(pageNumber) ?? null)
    const headerHeight = clampHeaderContentHeight(
      pageFormat,
      storage,
      headerRegionLayout
        ? readHeaderFooterRegionHeight(headerRegionLayout)
        : readHeaderPlaceholderHeight(
            editorDom,
            pageNumber,
            resolveIndexedPageBreaks(),
            shouldIndexPageBreaks ? null : getResolvedPaginationElement()
          )
    )
    const footerHeight = clampFooterContentHeight(
      pageFormat,
      storage,
      footerRegionLayout
        ? readHeaderFooterRegionHeight(footerRegionLayout)
        : readFooterPlaceholderHeight(
            editorDom,
            pageNumber,
            resolveIndexedPageBreaks(),
            shouldIndexPageBreaks ? null : getResolvedPaginationElement()
          )
    )

    headerHeights.set(pageNumber, headerHeight)
    footerHeights.set(pageNumber, footerHeight)
  })

  return { headerHeights, footerHeights }
}

function getExistingPageCountFromPaginationElement(paginationElement: HTMLElement | null): number {
  if (!paginationElement) return 0

  const totalPages = Number(paginationElement.dataset.rmTotalPages ?? '')
  const mountedStartPage = Number(paginationElement.dataset.rmMountedStartPage ?? '')
  const mountedEndPage = Number(paginationElement.dataset.rmMountedEndPage ?? '')
  const mountsFullDocument =
    Number.isInteger(totalPages) && totalPages > 0 && mountedStartPage === 1 && mountedEndPage === totalPages

  if (mountsFullDocument) {
    return totalPages
  }

  return Array.from(paginationElement.children).filter(
    element => element instanceof HTMLElement && element.classList.contains('rm-page-break')
  ).length
}

export function getExistingPageCount(view: EditorView): number {
  const paginationElement = resolvePaginationElement(view.dom)
  return getExistingPageCountFromPaginationElement(paginationElement)
}

function isEffectivelyEmptyDocument(doc: ProseMirrorNode | undefined): boolean {
  if (!doc) return false

  if (doc.childCount !== 1) return false

  const firstChild = doc.firstChild
  if (!firstChild) return true

  return firstChild.type.name === 'paragraph' && firstChild.childCount === 0 && firstChild.textContent.trim() === ''
}

function isPaginationMeasurementHelper(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false
  if (element.dataset.rmPagination !== undefined) return true

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

type PageBodyBandCoordinateSpace = 'viewport' | 'editor'

function resolveBandRectInCoordinateSpace(
  editorDom: HTMLElement,
  element: HTMLElement,
  coordinateSpace: PageBodyBandCoordinateSpace
): PageWrapBand {
  const rect = element.getBoundingClientRect()
  if (coordinateSpace === 'viewport') {
    return {
      pageNumber: Number(element.dataset.rmPageNumber ?? '0'),
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom
    }
  }

  const editorRect = editorDom.getBoundingClientRect()
  const scrollLeft = editorDom.scrollLeft ?? 0
  return {
    pageNumber: Number(element.dataset.rmPageNumber ?? '0'),
    left: rect.left - editorRect.left + scrollLeft,
    right: rect.right - editorRect.left + scrollLeft,
    top: rect.top - editorRect.top + editorDom.scrollTop,
    bottom: rect.bottom - editorRect.top + editorDom.scrollTop
  }
}

function resolveRawPageBodyBands(editorDom: HTMLElement, coordinateSpace: PageBodyBandCoordinateSpace): PageWrapBand[] {
  return resolvePageBodyLayers(editorDom)
    .map(element => resolveBandRectInCoordinateSpace(editorDom, element, coordinateSpace))
    .filter(band => Number.isFinite(band.pageNumber) && band.pageNumber > 0 && band.bottom > band.top)
}

export function resolvePageBodyWrapBands(
  editorDom: HTMLElement,
  coordinateSpace: PageBodyBandCoordinateSpace
): PageWrapBand[] {
  const rawBodyBands = resolveRawPageBodyBands(editorDom, coordinateSpace)
  if (rawBodyBands.length === 0) {
    return []
  }

  return applyImageWrapExclusions(
    rawBodyBands,
    resolveImageWrapExclusions(editorDom, rawBodyBands, {
      resolveRect: element => resolveBandRectInCoordinateSpace(editorDom, element, coordinateSpace)
    })
  )
}

function getMeasuredElementBottomInEditor(editorDom: HTMLElement, element: HTMLElement): number {
  if (readRuntimeLayoutMode(element, 'imageMeasurementMode') === 'overlay') {
    return getElementBottomInEditor(editorDom, element)
  }

  const layoutHeight = getElementLayoutHeight(element)
  const visualBottom = readRuntimeLayoutMetric(element, 'imageVisualBottom')
  return Math.max(
    getElementBottomInEditor(editorDom, element),
    getElementTopInEditor(editorDom, element) + (visualBottom > 0 ? visualBottom : layoutHeight)
  )
}

export function getPageBodyMeasurementBands(editorDom: HTMLElement): PageBodyMeasurementBand[] {
  const rawBodyBands = resolveRawPageBodyBands(editorDom, 'editor')
  const pageBoundsByNumber = new Map<number, { left: number; right: number }>()

  rawBodyBands.forEach(band => {
    pageBoundsByNumber.set(band.pageNumber, {
      left: band.left,
      right: band.right
    })
  })

  return sortPageBodyMeasurementBandsIfNeeded(
    resolvePageBodyWrapBands(editorDom, 'editor').map(band => {
      const pageBounds = pageBoundsByNumber.get(band.pageNumber)
      return {
        ...band,
        pageLeft: pageBounds?.left ?? band.left,
        pageRight: pageBounds?.right ?? band.right
      }
    })
  )
}

interface PageBodyMeasurementSummary {
  pageNumber: number
  top: number
  bottom: number
  physicalHeight: number
  effectiveContentHeight: number
}

function resolvePageBodyMeasurementSummary(
  bodyBands: PageBodyMeasurementBand[],
  pageNumber: number
): PageBodyMeasurementSummary | null {
  const pageBands = bodyBands.filter(band => band.pageNumber === pageNumber)
  if (pageBands.length === 0) {
    return null
  }

  const top = Math.min(...pageBands.map(band => band.top))
  const bottom = Math.max(...pageBands.map(band => band.bottom))
  const effectiveContentHeight = pageBands.reduce((total, band) => {
    const pageWidth = Math.max(1, band.pageRight - band.pageLeft)
    const bandWidth = Math.max(0, band.right - band.left)
    const bandHeight = Math.max(0, band.bottom - band.top)
    return total + bandHeight * (bandWidth / pageWidth)
  }, 0)

  return {
    pageNumber,
    top,
    bottom,
    physicalHeight: Math.max(1, bottom - top),
    effectiveContentHeight: Math.max(1, effectiveContentHeight)
  }
}

function resolvePageBodyMeasurementBand(
  editorDom: HTMLElement,
  pageNumber: number,
  paginationElement?: HTMLElement | null
): PageBodyMeasurementBand | null {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) return null

  const measurementBands = getPageBodyMeasurementBands(editorDom)
  const pageBands = measurementBands.filter(band => band.pageNumber === pageNumber)
  if (pageBands.length > 0) {
    return pageBands[pageBands.length - 1] ?? null
  }

  const resolvedPaginationElement = paginationElement ?? resolveDirectChildPaginationElement(editorDom) ?? null
  const bodyLayer =
    resolveDirectIndexedPageBodyLayer(resolvedPaginationElement, pageNumber, editorDom) ??
    resolveFallbackPageBreakBodyLayer(resolvedPaginationElement, pageNumber) ??
    (editorDom.querySelector(`.rm-page-body-layer[data-rm-page-number="${pageNumber}"]`) as HTMLElement | null) ??
    null
  if (!(bodyLayer instanceof HTMLElement)) return null

  const rect = resolveBandRectInCoordinateSpace(editorDom, bodyLayer, 'editor')
  if (rect.bottom <= rect.top) {
    return null
  }

  return {
    ...rect,
    pageLeft: rect.left,
    pageRight: rect.right
  }
}

function getBlockMeasurementElementAtPosition(view: EditorView, position: number): HTMLElement | null {
  try {
    const domAtPos = view.domAtPos(position)
    const baseNode =
      domAtPos.node.nodeType === Node.TEXT_NODE ? domAtPos.node.parentElement : (domAtPos.node as Element | null)

    if (!(baseNode instanceof HTMLElement) || !view.dom.contains(baseNode)) {
      return null
    }

    const imageLayoutAnchor = baseNode.closest('[data-image-layout-height]')
    if (imageLayoutAnchor instanceof HTMLElement) {
      return imageLayoutAnchor
    }

    return baseNode.closest(
      'p, li, blockquote, pre, h1, h2, h3, h4, h5, h6, td, th, figure, figcaption'
    ) as HTMLElement | null
  } catch {
    return null
  }
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

export function getDocumentContentBottom(view: EditorView): number {
  const editorRect = view.dom.getBoundingClientRect()
  const documentEnd = view.state.doc.content.size
  const positions = Array.from(new Set([documentEnd, Math.max(0, documentEnd - 1)]))
  let documentBottom = 0

  for (const position of positions) {
    try {
      const coords = view.coordsAtPos(position)
      documentBottom = Math.max(documentBottom, coords.bottom - editorRect.top + view.dom.scrollTop)
    } catch {
      // Ignore positions that cannot be resolved while the DOM is updating.
    }

    const blockMeasurementElement = getBlockMeasurementElementAtPosition(view, position)
    if (blockMeasurementElement) {
      documentBottom = Math.max(documentBottom, getMeasuredElementBottomInEditor(view.dom, blockMeasurementElement))
    }
  }

  return documentBottom
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
  const emitDebug = (info: PageCountDebugInfo) => {
    layoutOptions.onDebug?.(info)
    logPaginationDebug('calculate-page-count', info)
  }

  if (isEffectivelyEmptyDocument(view.state.doc)) {
    emitDebug({
      reason: 'empty-doc',
      hasPaginationElement: false,
      currentPageCount: 0,
      resultPageCount: 1,
      contentBottom: null,
      documentBottom: null,
      selectionBottom: 0,
      measuredBottom: 0,
      pageContentHeight: getPageBodyHeightForCount(pageFormat, layoutOptions, 1),
      lastPageBodyBottom: null,
      lastPageGap: null,
      lowerBound: null
    })
    return 1
  }

  const editorDom = view.dom
  const paginationElement = resolvePaginationElement(editorDom)
  const currentPageCount = getExistingPageCountFromPaginationElement(paginationElement)
  const lastContentElement = getLastContentElement(editorDom)
  const lastContentBottom = lastContentElement ? getMeasuredElementBottomInEditor(editorDom, lastContentElement) : null
  const documentBottom =
    lastContentBottom === null
      ? (() => {
          const measuredDocumentBottom = getDocumentContentBottom(view)
          return measuredDocumentBottom > 0 ? measuredDocumentBottom : null
        })()
      : null
  const contentBottomCandidates = [lastContentBottom, documentBottom].filter((value): value is number => value !== null)
  const contentBottom = contentBottomCandidates.length > 0 ? Math.max(...contentBottomCandidates) : null
  const selectionIsRange = view.state.selection.from !== view.state.selection.to
  const selectionIsImageNode =
    (view.state.selection instanceof NodeSelection ||
      ('node' in view.state.selection && view.state.selection.node != null)) &&
    (view.state.selection as NodeSelection).node.type.name === 'image'
  const selectionBottom =
    selectionIsRange || selectionIsImageNode || contentBottom === null ? getSelectionBottom(view) : 0
  let measuredBottom = selectionBottom
  if (contentBottom !== null) {
    measuredBottom = selectionIsRange ? Math.max(contentBottom, selectionBottom) : contentBottom
  }
  const pageBodyBands = getPageBodyMeasurementBands(editorDom)
  const fallbackLastBand = pageBodyBands[pageBodyBands.length - 1] ?? null
  const resolvedCurrentPageBand = resolvePageBodyMeasurementBand(editorDom, currentPageCount, paginationElement)
  const lastPageMeasurement =
    resolvePageBodyMeasurementSummary(pageBodyBands, currentPageCount) ??
    (resolvedCurrentPageBand
      ? {
          pageNumber: currentPageCount,
          top: resolvedCurrentPageBand.top,
          bottom: resolvedCurrentPageBand.bottom,
          physicalHeight: Math.max(1, resolvedCurrentPageBand.bottom - resolvedCurrentPageBand.top),
          effectiveContentHeight: Math.max(1, resolvedCurrentPageBand.bottom - resolvedCurrentPageBand.top)
        }
      : null) ??
    (fallbackLastBand
      ? {
          pageNumber: fallbackLastBand.pageNumber,
          top: fallbackLastBand.top,
          bottom: fallbackLastBand.bottom,
          physicalHeight: Math.max(1, fallbackLastBand.bottom - fallbackLastBand.top),
          effectiveContentHeight: Math.max(1, fallbackLastBand.bottom - fallbackLastBand.top)
        }
      : null)
  const pageContentHeight =
    lastPageMeasurement === null
      ? getMinimumMeasuredBodyHeight(pageFormat, currentPageCount, layoutOptions)
      : lastPageMeasurement.effectiveContentHeight

  if (paginationElement) {
    const canMeasurePagination = lastPageMeasurement !== null && (contentBottom !== null || selectionBottom > 0)

    if (!canMeasurePagination) {
      const resultPageCount = Math.max(1, currentPageCount)
      emitDebug({
        reason: 'existing-no-op',
        hasPaginationElement: true,
        currentPageCount,
        resultPageCount,
        contentBottom,
        documentBottom,
        selectionBottom,
        measuredBottom,
        pageContentHeight,
        lastPageBodyBottom: lastPageMeasurement?.bottom ?? null,
        lastPageGap: null,
        lowerBound: null
      })
      return resultPageCount
    }

    const lastPageGap = measuredBottom - lastPageMeasurement.bottom

    const gapResolution = resolvePageCountFromLastPageGap({
      currentPageCount,
      lastPageGap,
      pageContentHeight,
      pageFormatHeight: pageFormat.height,
      pageGap
    })

    if (gapResolution.reason === 'add-pages') {
      emitDebug({
        reason: 'add-pages',
        hasPaginationElement: true,
        currentPageCount,
        resultPageCount: gapResolution.resultPageCount,
        contentBottom,
        documentBottom,
        selectionBottom,
        measuredBottom,
        pageContentHeight,
        lastPageBodyBottom: lastPageMeasurement.bottom,
        lastPageGap,
        lowerBound: gapResolution.lowerBound
      })
      return gapResolution.resultPageCount
    }

    if (gapResolution.reason === 'keep-existing') {
      emitDebug({
        reason: 'keep-existing',
        hasPaginationElement: true,
        currentPageCount,
        resultPageCount: currentPageCount,
        contentBottom,
        documentBottom,
        selectionBottom,
        measuredBottom,
        pageContentHeight,
        lastPageBodyBottom: lastPageMeasurement.bottom,
        lastPageGap,
        lowerBound: gapResolution.lowerBound
      })
      return currentPageCount
    }

    emitDebug({
      reason: 'remove-pages',
      hasPaginationElement: true,
      currentPageCount,
      resultPageCount: gapResolution.resultPageCount,
      contentBottom,
      documentBottom,
      selectionBottom,
      measuredBottom,
      pageContentHeight,
      lastPageBodyBottom: lastPageMeasurement.bottom,
      lastPageGap,
      lowerBound: gapResolution.lowerBound
    })
    return gapResolution.resultPageCount
  }

  if (contentBottom === null && selectionBottom <= 0) {
    emitDebug({
      reason: 'initial-count',
      hasPaginationElement: false,
      currentPageCount,
      resultPageCount: 1,
      contentBottom,
      documentBottom,
      selectionBottom,
      measuredBottom,
      pageContentHeight,
      lastPageBodyBottom: null,
      lastPageGap: null,
      lowerBound: null
    })
    return 1
  }

  const editorHeight = Math.max(measuredBottom, 1)
  const initialPageContentHeight = getPageBodyHeightForCount(pageFormat, layoutOptions, 1)
  const resultPageCount = Math.max(1, Math.ceil(editorHeight / Math.max(1, initialPageContentHeight)))
  emitDebug({
    reason: 'initial-count',
    hasPaginationElement: false,
    currentPageCount,
    resultPageCount,
    contentBottom,
    documentBottom,
    selectionBottom,
    measuredBottom,
    pageContentHeight: initialPageContentHeight,
    lastPageBodyBottom: null,
    lastPageGap: null,
    lowerBound: null
  })
  return resultPageCount
}
