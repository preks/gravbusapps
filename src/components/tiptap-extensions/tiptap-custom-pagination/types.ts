import type { Editor, Extension, JSONContent } from '@tiptap/core'

export type PageNumber = number

export type BuiltInPageFormatName = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid'
export type LegacyPageFormatName = 'LETTER' | 'LEGAL' | 'TABLOID'
export type PageFormatName = BuiltInPageFormatName | LegacyPageFormatName

export interface PageFormatMargins {
  top: number
  right: number
  bottom: number
  left: number
}

export interface PageFormat {
  name: string
  width: number
  height: number
  margins: PageFormatMargins
}

export type PageFormatInput = BuiltInPageFormatName | LegacyPageFormatName | PageFormat

export type PagesHeaderFooter = string | JSONContent
export type PagesHeaderFooterSource = PagesHeaderFooter | ((page: number, total: number) => PagesHeaderFooter)

export type HeaderFooterEditorType = 'header' | 'footer'
export type PageVariantKey = 'default' | 'firstPage' | 'odd' | 'even'

export interface StoredHeaderFooterContent {
  html: string | null
  json: JSONContent | null
}

export interface OpenHeaderFooterEditorParams {
  pageNumber: number
}

export type PreventCloseCallback = (event: MouseEvent) => boolean

export interface ActivePagesEditorState {
  activeEditor: Editor | null
  activeEditorType: HeaderFooterEditorType | null
  activePageNumber: number | null
}

export interface PagesUiLabels {
  headerLabel: string
  footerLabel: string
  doubleClickHint: string
  doneLabel: string
}

export interface PagesOptionUpdates {
  pageFormat?: PageFormatInput
  header?: PagesHeaderFooterSource
  footer?: PagesHeaderFooterSource
  headerTopMargin?: number
  footerBottomMargin?: number
  differentFirstPage?: boolean
  headerFirstPage?: PagesHeaderFooterSource
  footerFirstPage?: PagesHeaderFooterSource
  differentOddEven?: boolean
  headerOdd?: PagesHeaderFooterSource
  headerEven?: PagesHeaderFooterSource
  footerOdd?: PagesHeaderFooterSource
  footerEven?: PagesHeaderFooterSource
  accentColor?: string
  headerAccentColor?: string
  footerAccentColor?: string
}

export interface PagesOptions {
  pageFormat: PageFormatInput
  headerHeight: number
  footerHeight: number
  pageGap: number
  pageBreakBackground?: string
  header: PagesHeaderFooterSource
  footer: PagesHeaderFooterSource
  headerTopMargin?: number
  footerBottomMargin?: number
  differentFirstPage: boolean
  headerFirstPage?: PagesHeaderFooterSource
  footerFirstPage?: PagesHeaderFooterSource
  differentOddEven: boolean
  headerOdd?: PagesHeaderFooterSource
  headerEven?: PagesHeaderFooterSource
  footerOdd?: PagesHeaderFooterSource
  footerEven?: PagesHeaderFooterSource
  headerFooterExtensions?: Extension[]
  onDblClickHeaderFooterPreventClose?: PreventCloseCallback
  onDblClickHeaderPreventClose?: PreventCloseCallback
  onDblClickFooterPreventClose?: PreventCloseCallback
  accentColor?: string
  headerAccentColor?: string
  footerAccentColor?: string
  onPageFormatChange?: (pageFormat: PageFormat) => void
  onActiveEditorChange?: (state: ActivePagesEditorState) => void
  uiLabels?: Partial<PagesUiLabels>
}

export interface PagesStorage {
  pageFormat: PageFormat
  pageCount: number
  headerHeight: number
  footerHeight: number
  pageGap: number
  pageBreakBackground?: string
  headerTopMargin: number
  footerBottomMargin: number
  differentFirstPage: boolean
  differentOddEven: boolean
  headerHTML: string | null
  headerJSON: JSONContent | null
  footerHTML: string | null
  footerJSON: JSONContent | null
  headerFirstPageHTML: string | null
  headerFirstPageJSON: JSONContent | null
  footerFirstPageHTML: string | null
  footerFirstPageJSON: JSONContent | null
  headerOddHTML: string | null
  headerOddJSON: JSONContent | null
  headerEvenHTML: string | null
  headerEvenJSON: JSONContent | null
  footerOddHTML: string | null
  footerOddJSON: JSONContent | null
  footerEvenHTML: string | null
  footerEvenJSON: JSONContent | null
  activeEditor: Editor | null
  activeEditorType: HeaderFooterEditorType | null
  activePageNumber: number | null
  getPageCount: () => number
}

export type PaginationPlusOptions = PagesOptions
export type PaginationPlusStorage = PagesStorage
