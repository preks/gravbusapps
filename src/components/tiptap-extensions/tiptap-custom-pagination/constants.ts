import type { BuiltInPageFormatName, PageFormat } from './types'

export interface PageSize {
  pageHeight: number
  pageWidth: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
}

function createPageFormat(
  name: string,
  width: number,
  height: number,
  top: number,
  right: number,
  bottom: number,
  left: number
): PageFormat {
  return {
    name,
    width,
    height,
    margins: { top, right, bottom, left }
  }
}

function createPageSize(format: PageFormat): PageSize {
  return {
    pageHeight: format.height,
    pageWidth: format.width,
    marginTop: format.margins.top,
    marginBottom: format.margins.bottom,
    marginLeft: format.margins.left,
    marginRight: format.margins.right
  }
}

export const PAGE_FORMATS: Record<BuiltInPageFormatName, PageFormat> = {
  A4: createPageFormat('A4', 794, 1123, 95, 76, 95, 76),
  A3: createPageFormat('A3', 1123, 1591, 95, 76, 95, 76),
  A5: createPageFormat('A5', 419, 794, 76, 57, 76, 57),
  Letter: createPageFormat('Letter', 818, 1060, 96, 96, 96, 96),
  Legal: createPageFormat('Legal', 818, 1404, 96, 96, 96, 96),
  Tabloid: createPageFormat('Tabloid', 1060, 1635, 96, 96, 96, 96)
}

export const PAGE_SIZES = {
  A4: createPageSize(PAGE_FORMATS.A4),
  A3: createPageSize(PAGE_FORMATS.A3),
  A5: createPageSize(PAGE_FORMATS.A5),
  LETTER: createPageSize(PAGE_FORMATS.Letter),
  LEGAL: createPageSize(PAGE_FORMATS.Legal),
  TABLOID: createPageSize(PAGE_FORMATS.Tabloid)
} as const
