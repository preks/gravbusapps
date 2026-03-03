/**
 * Page layout utilities: presets, cm↔px conversion, and PaginationPlus config from document formatting.
 */

import { PAGE_SIZES } from 'tiptap-pagination-plus'
import type { DocumentFormatting, PageSizeId } from '../types/document'

/** 96 DPI: 1 cm = 96/2.54 px */
export const CM_TO_PX = 96 / 2.54

/** Default margins in cm (1 inch). */
export const DEFAULT_MARGIN_CM = 2.54

export const DEFAULT_PAGE_COLOR = '#ffffff'

export interface PageLayoutPaginationConfig {
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

  const sizeId: PageSizeId = layout.pageSize
  const preset = PAGE_SIZES[sizeId] ?? PAGE_SIZES.A4
  let pageWidth = preset.pageWidth
  let pageHeight = preset.pageHeight
  if (layout.orientation === 'landscape') {
    ;[pageWidth, pageHeight] = [pageHeight, pageWidth]
  }

  const marginTop = marginCmToPx(layout.margins.top)
  const marginBottom = marginCmToPx(layout.margins.bottom)
  const marginLeft = marginCmToPx(layout.margins.left)
  const marginRight = marginCmToPx(layout.margins.right)

  return {
    pageWidth,
    pageHeight,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight
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
