/**
 * Page layout utilities: presets, cm↔px conversion, and local Pages config from document formatting.
 */

import { PAGE_FORMATS } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import type { PageFormat } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import type {
  DocumentFormatting,
  DocumentPagesFormatting,
  PageNumberAlignment,
  PageNumberNumeralStyle,
  PageSizeId
} from '../types/document'

/** 96 DPI: 1 cm = 96/2.54 px */
export const CM_TO_PX = 96 / 2.54

/** Default margins in cm (1 inch). */
export const DEFAULT_MARGIN_CM = 2.54

export const DEFAULT_PAGE_COLOR = '#ffffff'

export interface PageLayoutPaginationConfig {
  pageFormat: PageFormat
  pageWidth: number
  pageHeight: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
}

export interface DocumentPrintStyleConfig {
  pageSizeCss: string
  pageMarginCss: string
  fontFamily: string
  fontSize: string
  lineHeight: string
  textColor: string
  pageColor: string
}

/**
 * Returns default layout (A4 portrait, 2.54 cm margins, white page, not pageless).
 */
export function getDefaultPageLayout(): Required<
  Pick<DocumentFormatting, 'pageSize' | 'orientation' | 'margins' | 'marginUnit' | 'pageColor' | 'pageless'>
> {
  return {
    pageSize: 'A4',
    orientation: 'portrait',
    marginUnit: 'cm',
    pageColor: DEFAULT_PAGE_COLOR,
    pageless: false,
    margins: {
      top: DEFAULT_MARGIN_CM,
      right: DEFAULT_MARGIN_CM,
      bottom: DEFAULT_MARGIN_CM,
      left: DEFAULT_MARGIN_CM
    }
  }
}

/**
 * Converts margin value from cm to px.
 */
export function marginCmToPx(cm: number): number {
  return Math.round(cm * CM_TO_PX)
}

/**
 * Converts margin value from px to cm.
 */
export function marginPxToCm(px: number): number {
  return Math.round((px / CM_TO_PX) * 100) / 100
}

/**
 * Resolves effective page layout from document formatting (fills defaults).
 */
export function resolvePageLayout(
  formatting?: DocumentFormatting | null
): Required<
  Pick<DocumentFormatting, 'pageSize' | 'orientation' | 'margins' | 'marginUnit' | 'pageColor' | 'pageless'>
> {
  const defaults = getDefaultPageLayout()
  if (!formatting) return defaults
  const margins = formatting.margins ?? defaults.margins
  return {
    pageSize: formatting.pageSize ?? defaults.pageSize,
    orientation: formatting.orientation ?? defaults.orientation,
    marginUnit: formatting.marginUnit ?? defaults.marginUnit,
    pageColor: formatting.pageColor ?? defaults.pageColor,
    pageless: formatting.pageless ?? defaults.pageless,
    margins: {
      top: margins.top ?? defaults.margins.top,
      right: margins.right ?? defaults.margins.right,
      bottom: margins.bottom ?? defaults.margins.bottom,
      left: margins.left ?? defaults.margins.left
    }
  }
}

/**
 * Returns PaginationPlus layout config (dimensions + margins in px) from document formatting,
 * or null if document is pageless.
 */
export function getPaginationConfigFromFormatting(
  formatting?: DocumentFormatting | null
): PageLayoutPaginationConfig | null {
  const layout = resolvePageLayout(formatting)
  if (layout.pageless) return null

  const normalizedSizeId = normalizePageSizeId(layout.pageSize)
  const preset = PAGE_FORMATS[normalizedSizeId] ?? PAGE_FORMATS.A4
  let pageWidth = preset.width
  let pageHeight = preset.height
  if (layout.orientation === 'landscape') {
    ;[pageWidth, pageHeight] = [pageHeight, pageWidth]
  }

  const marginTop = marginCmToPx(layout.margins.top)
  const marginBottom = marginCmToPx(layout.margins.bottom)
  const marginLeft = marginCmToPx(layout.margins.left)
  const marginRight = marginCmToPx(layout.margins.right)
  const pageFormat: PageFormat = {
    name: normalizedSizeId,
    width: pageWidth,
    height: pageHeight,
    margins: {
      top: marginTop,
      right: marginRight,
      bottom: marginBottom,
      left: marginLeft
    }
  }

  return {
    pageFormat,
    pageWidth,
    pageHeight,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight
  }
}

function formatPrintLength(value: number, unit: 'cm' | 'in'): string {
  const rounded = Math.round(value * 100) / 100
  return `${rounded}${unit}`
}

function getCssPageSizeName(sizeId: PageSizeId): string {
  switch (sizeId) {
    case 'LETTER':
      return 'letter'
    case 'LEGAL':
      return 'legal'
    case 'TABLOID':
      return 'tabloid'
    default:
      return sizeId.toLowerCase()
  }
}

export function getPrintStyleConfigFromFormatting(formatting?: DocumentFormatting | null): DocumentPrintStyleConfig {
  const layout = resolvePageLayout(formatting)
  const marginUnit = layout.marginUnit === 'in' ? 'in' : 'cm'

  return {
    pageSizeCss: `${getCssPageSizeName(layout.pageSize)} ${layout.orientation}`,
    pageMarginCss: [
      formatPrintLength(layout.margins.top, marginUnit),
      formatPrintLength(layout.margins.right, marginUnit),
      formatPrintLength(layout.margins.bottom, marginUnit),
      formatPrintLength(layout.margins.left, marginUnit)
    ].join(' '),
    fontFamily: formatting?.fontFamily?.trim() || "'Times New Roman', Georgia, serif",
    fontSize: typeof formatting?.fontSize === 'number' ? `${formatting.fontSize}px` : '16px',
    lineHeight: typeof formatting?.lineHeight === 'number' ? String(formatting.lineHeight) : '1.15',
    textColor: '#1a1a1a',
    pageColor: layout.pageColor ?? DEFAULT_PAGE_COLOR
  }
}

export interface DocumentPagesConfig {
  differentFirstPage: boolean
  differentOddEven: boolean
  header: string
  footer: string
  headerFirstPage?: string
  footerFirstPage?: string
  headerOdd?: string
  headerEven?: string
  footerOdd?: string
  footerEven?: string
  headerHeight?: number
  footerHeight?: number
  headerTopMargin?: number
  footerBottomMargin?: number
  accentColor?: string
  headerAccentColor?: string
  footerAccentColor?: string
  pageNumberNumeralStyle: PageNumberNumeralStyle
  pageNumberStartAt: number
  pageNumberAlignment?: PageNumberAlignment
  pageNumberRegion?: 'header' | 'footer'
  pageNumberShowOnFirstPage: boolean
}

function stripHtmlToText(value: string): string {
  return value
    .replace(/\u200B/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isStandalonePageNumberTemplate(value: string | null | undefined): boolean {
  if (!value) return false
  return stripHtmlToText(value) === '{page}'
}

export function sanitizeStandalonePageNumberTemplates(
  pages?: DocumentPagesFormatting | null
): DocumentPagesFormatting | undefined {
  const normalized = normalizeStoredPagesFormatting(pages ?? undefined)
  if (!normalized) return undefined
  if (!normalized.pageNumberRegion || !normalized.pageNumberAlignment) return normalized

  const sanitized: DocumentPagesFormatting = { ...normalized }
  const fields: Array<
    keyof Pick<
      DocumentPagesFormatting,
      | 'header'
      | 'footer'
      | 'headerFirstPage'
      | 'footerFirstPage'
      | 'headerOdd'
      | 'headerEven'
      | 'footerOdd'
      | 'footerEven'
    >
  > = ['header', 'footer', 'headerFirstPage', 'footerFirstPage', 'headerOdd', 'headerEven', 'footerOdd', 'footerEven']

  for (const field of fields) {
    if (isStandalonePageNumberTemplate(sanitized[field])) {
      sanitized[field] = null
    }
  }

  return sanitized
}

export function getPagesConfigFromFormatting(formatting?: DocumentFormatting | null): DocumentPagesConfig {
  const pages = sanitizeStandalonePageNumberTemplates(formatting?.pages) ?? {}

  return {
    differentFirstPage: pages.differentFirstPage ?? false,
    differentOddEven: pages.differentOddEven ?? false,
    header: pages.header ?? '',
    footer: pages.footer ?? '',
    headerFirstPage: pages.headerFirstPage ?? undefined,
    footerFirstPage: pages.footerFirstPage ?? undefined,
    headerOdd: pages.headerOdd ?? undefined,
    headerEven: pages.headerEven ?? undefined,
    footerOdd: pages.footerOdd ?? undefined,
    footerEven: pages.footerEven ?? undefined,
    headerHeight: pages.headerHeight,
    footerHeight: pages.footerHeight,
    headerTopMargin: pages.headerTopMargin,
    footerBottomMargin: pages.footerBottomMargin,
    accentColor: pages.accentColor,
    headerAccentColor: pages.headerAccentColor,
    footerAccentColor: pages.footerAccentColor,
    pageNumberNumeralStyle: pages.pageNumberNumeralStyle ?? 'decimal',
    pageNumberStartAt: pages.pageNumberStartAt ?? 1,
    pageNumberAlignment: pages.pageNumberAlignment,
    pageNumberRegion: pages.pageNumberRegion,
    pageNumberShowOnFirstPage: pages.pageNumberShowOnFirstPage ?? true
  }
}

export function normalizeStoredPagesFormatting(pages?: DocumentPagesFormatting): DocumentPagesFormatting | undefined {
  if (!pages) return undefined

  const normalized: DocumentPagesFormatting = {
    differentFirstPage: pages.differentFirstPage ?? false,
    differentOddEven: pages.differentOddEven ?? false,
    header: pages.header ?? null,
    footer: pages.footer ?? null,
    headerFirstPage: pages.headerFirstPage ?? null,
    footerFirstPage: pages.footerFirstPage ?? null,
    headerOdd: pages.headerOdd ?? null,
    headerEven: pages.headerEven ?? null,
    footerOdd: pages.footerOdd ?? null,
    footerEven: pages.footerEven ?? null,
    headerHeight: pages.headerHeight,
    footerHeight: pages.footerHeight,
    headerTopMargin: pages.headerTopMargin,
    footerBottomMargin: pages.footerBottomMargin,
    accentColor: pages.accentColor,
    headerAccentColor: pages.headerAccentColor,
    footerAccentColor: pages.footerAccentColor,
    pageNumberNumeralStyle: pages.pageNumberNumeralStyle ?? 'decimal',
    pageNumberStartAt: pages.pageNumberStartAt ?? 1,
    pageNumberAlignment: pages.pageNumberAlignment,
    pageNumberRegion: pages.pageNumberRegion,
    pageNumberShowOnFirstPage: pages.pageNumberShowOnFirstPage ?? true
  }

  return normalized
}

function normalizePageSizeId(sizeId: PageSizeId): keyof typeof PAGE_FORMATS {
  switch (sizeId) {
    case 'LETTER':
      return 'Letter'
    case 'LEGAL':
      return 'Legal'
    case 'TABLOID':
      return 'Tabloid'
    default:
      return sizeId
  }
}

/** Paper size labels with dimensions in cm (width x height for portrait). */
export const PAGE_SIZE_LABELS: Record<PageSizeId, { labelKey: string; widthCm: number; heightCm: number }> = {
  A4: { labelKey: 'page-size-a4', widthCm: 21, heightCm: 29.7 },
  A3: { labelKey: 'page-size-a3', widthCm: 29.7, heightCm: 42 },
  A5: { labelKey: 'page-size-a5', widthCm: 14.8, heightCm: 21 },
  LETTER: { labelKey: 'page-size-letter', widthCm: 21.6, heightCm: 27.9 },
  LEGAL: { labelKey: 'page-size-legal', widthCm: 21.6, heightCm: 35.6 },
  TABLOID: { labelKey: 'page-size-tabloid', widthCm: 27.9, heightCm: 43.2 }
}
