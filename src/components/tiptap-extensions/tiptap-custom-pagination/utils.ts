import { Editor, type Extension, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
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
  return template.replaceAll('{page}', String(page)).replaceAll('{total}', String(total))
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

export function getPageContentHeight(pageFormat: PageFormat): number {
  return Math.max(1, pageFormat.height - pageFormat.margins.top - pageFormat.margins.bottom)
}

export function getExistingPageCount(view: EditorView): number {
  const paginationElement = view.dom.querySelector('[data-rm-pagination]')
  return paginationElement ? paginationElement.children.length : 0
}

export function calculatePageCount(view: EditorView, pageFormat: PageFormat, pageGap: number): number {
  const editorDom = view.dom
  const pageContentHeight = getPageContentHeight(pageFormat)
  const paginationElement = editorDom.querySelector('[data-rm-pagination]')
  const currentPageCount = getExistingPageCount(view)

  if (paginationElement) {
    const lastElementOfEditor = editorDom.lastElementChild as HTMLElement | null
    const lastPageBreak = paginationElement.lastElementChild?.querySelector('.breaker') as HTMLElement | null

    if (lastElementOfEditor && lastPageBreak) {
      const lastElementRect = lastElementOfEditor.getBoundingClientRect()
      const lastPageBreakRect = lastPageBreak.getBoundingClientRect()
      const lastPageGap = lastElementRect.bottom - lastPageBreakRect.bottom

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

    return 1
  }

  const editorHeight = editorDom.scrollHeight
  return Math.max(1, Math.ceil(editorHeight / pageContentHeight))
}
