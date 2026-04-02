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

/** Min/max custom page edge in cm (portrait width/height). */
export const MIN_CUSTOM_PAGE_CM = 1
export const MAX_CUSTOM_PAGE_CM = 200

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

export type ResolvedDocumentPageLayout = Required<
  Pick<DocumentFormatting, 'pageSize' | 'orientation' | 'margins' | 'marginUnit' | 'pageColor' | 'pageless'>
> & {
  customPageWidthCm?: number
  customPageHeightCm?: number
}

/**
 * Resolves effective page layout from document formatting (fills defaults).
 */
export function resolvePageLayout(formatting?: DocumentFormatting | null): ResolvedDocumentPageLayout {
  const defaults = getDefaultPageLayout()
  if (!formatting) return defaults
  const margins = formatting.margins ?? defaults.margins
  const pageSize = formatting.pageSize ?? defaults.pageSize
  const base: ResolvedDocumentPageLayout = {
    pageSize,
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
  if (pageSize !== 'CUSTOM') {
    return base
  }
  return {
    ...base,
    customPageWidthCm: clampCustomPageDimensionCm(
      formatting.customPageWidthCm ?? PAGE_SIZE_LABELS.A4.widthCm,
      PAGE_SIZE_LABELS.A4.widthCm
    ),
    customPageHeightCm: clampCustomPageDimensionCm(
      formatting.customPageHeightCm ?? PAGE_SIZE_LABELS.A4.heightCm,
      PAGE_SIZE_LABELS.A4.heightCm
    )
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

  let pageWidth: number
  let pageHeight: number
  let formatName: string

  if (layout.pageSize === 'CUSTOM') {
    const wCm = layout.customPageWidthCm ?? PAGE_SIZE_LABELS.A4.widthCm
    const hCm = layout.customPageHeightCm ?? PAGE_SIZE_LABELS.A4.heightCm
    pageWidth = Math.round(wCm * CM_TO_PX)
    pageHeight = Math.round(hCm * CM_TO_PX)
    formatName = 'Custom'
  } else {
    const normalizedSizeId = normalizePageSizeId(layout.pageSize)
    const preset = PAGE_FORMATS[normalizedSizeId] ?? PAGE_FORMATS.A4
    pageWidth = preset.width
    pageHeight = preset.height
    formatName = preset.name
  }

  if (layout.orientation === 'landscape') {
    ;[pageWidth, pageHeight] = [pageHeight, pageWidth]
  }

  const marginTop = marginCmToPx(layout.margins.top)
  const marginBottom = marginCmToPx(layout.margins.bottom)
  const marginLeft = marginCmToPx(layout.margins.left)
  const marginRight = marginCmToPx(layout.margins.right)
  const pageFormat: PageFormat = {
    name: formatName,
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

function getCssPageSizeName(sizeId: Exclude<PageSizeId, 'CUSTOM'>): string {
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

  let pageSizeCss: string
  if (layout.pageSize === 'CUSTOM') {
    const wCm = layout.customPageWidthCm ?? PAGE_SIZE_LABELS.A4.widthCm
    const hCm = layout.customPageHeightCm ?? PAGE_SIZE_LABELS.A4.heightCm
    let cssW = wCm
    let cssH = hCm
    if (layout.orientation === 'landscape') {
      ;[cssW, cssH] = [cssH, cssW]
    }
    if (marginUnit === 'in') {
      pageSizeCss = `${formatPrintLength(cssW / 2.54, 'in')} ${formatPrintLength(cssH / 2.54, 'in')}`
    } else {
      pageSizeCss = `${formatPrintLength(cssW, 'cm')} ${formatPrintLength(cssH, 'cm')}`
    }
  } else {
    pageSizeCss = `${getCssPageSizeName(layout.pageSize)} ${layout.orientation}`
  }

  return {
    pageSizeCss,
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

/** Matches header/footer content that is only the page token or “page of total” (sidebar body preset), before managed slot. */
function isStandalonePageNumberTemplate(value: string | null | undefined): boolean {
  if (!value) return false
  const t = stripHtmlToText(value)
  return t === '{page}' || t === '{page} of {total}'
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

function normalizePageSizeId(sizeId: Exclude<PageSizeId, 'CUSTOM'>): keyof typeof PAGE_FORMATS {
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
  TABLOID: { labelKey: 'page-size-tabloid', widthCm: 27.9, heightCm: 43.2 },
  CUSTOM: { labelKey: 'page-size-custom', widthCm: 21, heightCm: 29.7 }
}

export function clampCustomPageDimensionCm(value: number, fallbackCm: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallbackCm
  return Math.min(MAX_CUSTOM_PAGE_CM, Math.max(MIN_CUSTOM_PAGE_CM, Math.round(value * 100) / 100))
}

/** Copy of formatting without custom page dimensions (for switching back to presets). */
export function omitCustomPageDimensions(formatting: DocumentFormatting): DocumentFormatting {
  const next: DocumentFormatting = { ...formatting }
  delete next.customPageWidthCm
  delete next.customPageHeightCm
  return next
}
