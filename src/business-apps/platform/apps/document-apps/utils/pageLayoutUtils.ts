/**
 * Page layout utilities: presets, cm↔px conversion, and local Pages config from document formatting.
 */

import { PAGE_FORMATS } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import type { PageFormat } from '@/components/tiptap-extensions/tiptap-custom-pagination'
import type { DocumentFormatting, DocumentPagesFormatting, PageSizeId } from '../types/document'

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
}

export function getPagesConfigFromFormatting(formatting?: DocumentFormatting | null): DocumentPagesConfig {
  const pages = formatting?.pages ?? {}

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
    footerAccentColor: pages.footerAccentColor
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
    footerAccentColor: pages.footerAccentColor
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
