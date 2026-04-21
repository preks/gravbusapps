/**
 * Proper .docx (Office Open XML) export using JSZip.
 * Produces a real ZIP-based .docx that Word, LibreOffice, and mammoth can parse.
 */

import DOMPurify from 'dompurify'
import {
  analyzeImageWrapContour,
  convertWrapPolygonToWordCoordinates,
  resolveWordLikeImageLayout
} from '@/components/tiptap-extensions/tiptap-custom-image'
import {
  CUSTOM_IMAGE_TAG,
  getImageFigureAttributesFromElement,
  normalizeImageBorderColor,
  normalizeImageBorderDash,
  normalizeImageBorderWidthPt
} from '@/components/tiptap-extensions/tiptap-custom-image/styleUtils'
import {
  convertCropRatioToWordValue,
  hasImageCrop,
  normalizeImageCrop
} from '@/components/tiptap-extensions/tiptap-custom-image/cropUtils'
import { resolveImageDimensions } from '@/components/tiptap-extensions/tiptap-custom-image/sizeUtils'
import {
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_BORDER_DASH,
  DEFAULT_IMAGE_BORDER_WIDTH_PT,
  type ImageBorderDash
} from '@/components/tiptap-extensions/tiptap-custom-image/types'
import type { DocumentFormatting } from '../types'
import {
  getDocxPageSetupFromFormatting,
  getPagesConfigFromFormatting,
  getPrintStyleConfigFromFormatting
} from './pageLayoutUtils'
import { buildWordTocXmlFromElement } from './docxTocExportUtils'
import { DEFAULT_DOCUMENT_TOC_STYLES, type DocumentTocStyles, parseDocumentTocStyles } from './documentTocStyleUtils'
import { sanitizeHtmlForExport } from './exportUtils'
import { createJSZip } from './jsZipCompat'

function escapeXml(text: string): string {
  return (text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface EmbeddedImage {
  rId: string
  fileName: string
  data: Uint8Array
  widthEmu: number
  heightEmu: number
}

interface DocxBuildContext {
  images: EmbeddedImage[]
  hyperlinks: { rId: string; url: string }[]
  nextImageId: number
  nextHyperlinkId: number
  partKey: string
  buildState: DocxBuildState
  typography: DocxTypographySettings
  fieldConfig?: DocxFieldConfig
}

interface DocxTypographySettings {
  fontFamily: string
  bodyFontHalfPoints: number
  bodyLineSpacing: number
  tableFontHalfPoints: number
  tableLineSpacing: number
}

interface DocxTocStyleSettings {
  styles: DocumentTocStyles
  showPageNumbers: boolean
  tabLeader: 'dot' | 'none'
}

interface DocxBuildState {
  nextDocPrId: number
}

interface DocxFieldConfig {
  documentTitle: string
  pageInstruction: string
  pageDisplayText: string
  totalDisplayText: string
}

type DocxJcValue = 'left' | 'center' | 'right' | 'both'
type DocxVAlignValue = 'top' | 'center' | 'bottom'
type DocxWidthType = 'pct' | 'dxa'
type DocxBorderTag = 'top' | 'right' | 'bottom' | 'left' | 'insideH' | 'insideV'

interface DocxWidthValue {
  type: DocxWidthType
  value: number
}

interface DocxBorderDefinition {
  value: string
  size: number
  color: string
}

interface DocxTableCellDefinition {
  element: HTMLElement | null
  columnIndex: number
  colspan: number
  rowspan: number
  isHeader: boolean
  isMergeContinuation: boolean
  textAlign: DocxJcValue | null
  verticalAlign: DocxVAlignValue | null
  backgroundColor: string | null
  textColor: string | null
  bold: boolean
  width: DocxWidthValue | null
  borders: Partial<Record<'top' | 'right' | 'bottom' | 'left', DocxBorderDefinition | null>>
}

interface DocxTableDefinition {
  width: DocxWidthValue
  alignment: DocxJcValue | null
  borders: Record<DocxBorderTag, DocxBorderDefinition>
  gridWidths: number[]
  useFixedLayout: boolean
  rows: DocxTableCellDefinition[][]
}

interface DocxActiveMerge {
  remainingRows: number
  gridSpan: number
  cell: DocxTableCellDefinition
}

interface DocxPageNumberSlot {
  alignment: 'left' | 'center' | 'right'
}

function newContext(
  typography: DocxTypographySettings,
  partKey: string,
  buildState: DocxBuildState,
  fieldConfig?: DocxFieldConfig
): DocxBuildContext {
  return {
    images: [],
    hyperlinks: [],
    nextImageId: 1,
    nextHyperlinkId: 1,
    partKey,
    buildState,
    typography,
    fieldConfig
  }
}

const PX_TO_EMU = 9525
const POINT_TO_OOXML_LINE_WIDTH = 12700
const DEFAULT_IMG_WIDTH = 400
const DEFAULT_IMG_HEIGHT = 300
const WRAP_POLYGON_COORDINATE_SPACE = 21600
const DEFAULT_DOCX_FONT_FAMILY = 'Times New Roman'
const DEFAULT_DOCX_FONT_SIZE_PX = 16
const DEFAULT_DOCX_LINE_HEIGHT = 1.15
const DOCX_SINGLE_LINE_SPACING = 240
const DOCX_TABLE_FONT_SIZE_PX = 14
const DOCX_TABLE_LINE_HEIGHT = 1.3
const DOCX_TABLE_CELL_PADDING_TOP_BOTTOM = 80
const DOCX_TABLE_CELL_PADDING_LEFT_RIGHT = 120
const DEFAULT_TABLE_BACKGROUND_COLOR_HEX = 'FFFFFF'
const DEFAULT_DOCX_TABLE_WIDTH: DocxWidthValue = { type: 'pct', value: 5000 }
const DEFAULT_DOCX_TABLE_BORDER: DocxBorderDefinition = {
  value: 'single',
  size: 4,
  color: '333333'
}
const DOCX_TABLE_THEME_PALETTES = {
  blue: { solid: '2563EB', soft: 'DBEAFE', softAlt: 'EFF6FF' },
  teal: { solid: '0F766E', soft: 'CCFBF1', softAlt: 'F0FDFA' },
  green: { solid: '15803D', soft: 'DCFCE7', softAlt: 'F0FDF4' },
  orange: { solid: 'C2410C', soft: 'FFEDD5', softAlt: 'FFF7ED' },
  purple: { solid: '7C3AED', soft: 'EDE9FE', softAlt: 'F5F3FF' },
  gray: { solid: '4B5563', soft: 'E5E7EB', softAlt: 'F3F4F6' }
} as const
const DOCX_IMAGE_DEFAULTS = {
  align: 'left' as const,
  wrapMode: 'inline' as const,
  anchorMode: 'inline' as const,
  display: 'inline' as const,
  distance: 0
}

function extractPrimaryWordFontFamily(fontFamily?: string): string {
  const primary = fontFamily
    ?.split(',')
    .map(part => part.trim().replace(/^['"]|['"]$/g, ''))
    .find(Boolean)

  return primary || DEFAULT_DOCX_FONT_FAMILY
}

function pxToHalfPoints(px: number): number {
  return Math.max(2, Math.round((px * 72 * 2) / 96))
}

function lineHeightToWordSpacing(lineHeight: number): number {
  return Math.max(DOCX_SINGLE_LINE_SPACING, Math.round(lineHeight * DOCX_SINGLE_LINE_SPACING))
}

function normalizeHexColor(value?: string | null): string | null {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hexMatch) {
    const normalized =
      hexMatch[1].length === 3
        ? hexMatch[1]
            .split('')
            .map(char => char + char)
            .join('')
        : hexMatch[1]
    return normalized.toUpperCase()
  }

  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i)
  if (!rgbMatch) {
    return null
  }

  const [red, green, blue] = rgbMatch[1]
    .split(',')
    .slice(0, 3)
    .map(channel => Number.parseInt(channel.trim(), 10))

  if ([red, green, blue].some(channel => Number.isNaN(channel) || channel < 0 || channel > 255)) {
    return null
  }

  return [red, green, blue].map(channel => channel.toString(16).padStart(2, '0').toUpperCase()).join('')
}

function parseCssLength(value?: string | null): { amount: number; unit: string } | null {
  if (!value) {
    return null
  }

  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|pt|%|cm|mm|in)?$/i)
  if (!match) {
    return null
  }

  const amount = Number.parseFloat(match[1])
  if (!Number.isFinite(amount)) {
    return null
  }

  return {
    amount,
    unit: (match[2] ?? 'px').toLowerCase()
  }
}

function cssLengthToTwips(value?: string | null): number | null {
  const parsed = parseCssLength(value)
  if (!parsed || parsed.unit === '%') {
    return null
  }

  switch (parsed.unit) {
    case 'pt':
      return Math.max(1, Math.round(parsed.amount * 20))
    case 'cm':
      return Math.max(1, Math.round((parsed.amount / 2.54) * 1440))
    case 'mm':
      return Math.max(1, Math.round((parsed.amount / 25.4) * 1440))
    case 'in':
      return Math.max(1, Math.round(parsed.amount * 1440))
    case 'px':
    default:
      return Math.max(1, Math.round((parsed.amount / 96) * 1440))
  }
}

function cssLengthToWordWidth(value?: string | null): DocxWidthValue | null {
  const parsed = parseCssLength(value)
  if (!parsed) {
    return null
  }

  if (parsed.unit === '%') {
    return {
      type: 'pct',
      value: Math.max(1, Math.round(parsed.amount * 50))
    }
  }

  const twips = cssLengthToTwips(value)
  if (twips == null) {
    return null
  }

  return {
    type: 'dxa',
    value: twips
  }
}

function cssLengthToBorderSize(value?: string | null): number | null {
  const parsed = parseCssLength(value)
  if (!parsed || parsed.unit === '%') {
    return null
  }

  const points =
    parsed.unit === 'pt'
      ? parsed.amount
      : parsed.unit === 'px'
        ? (parsed.amount * 72) / 96
        : parsed.unit === 'in'
          ? parsed.amount * 72
          : parsed.unit === 'cm'
            ? (parsed.amount * 72) / 2.54
            : (parsed.amount * 72) / 25.4

  return Math.max(2, Math.round(points * 8))
}

function mapTextAlignToWordValue(value?: string | null): DocxJcValue | null {
  switch (value?.trim().toLowerCase()) {
    case 'center':
      return 'center'
    case 'right':
    case 'end':
      return 'right'
    case 'justify':
      return 'both'
    case 'left':
    case 'start':
      return 'left'
    default:
      return null
  }
}

function mapVerticalAlignToWordValue(value?: string | null): DocxVAlignValue | null {
  switch (value?.trim().toLowerCase()) {
    case 'middle':
    case 'center':
      return 'center'
    case 'bottom':
      return 'bottom'
    case 'top':
      return 'top'
    default:
      return null
  }
}

function mapCssBorderStyleToWordValue(value?: string | null): string | null {
  switch (value?.trim().toLowerCase()) {
    case 'none':
      return 'nil'
    case 'dashed':
      return 'dashed'
    case 'dotted':
      return 'dotted'
    case 'double':
      return 'double'
    case 'solid':
      return 'single'
    default:
      return null
  }
}

function buildDocxBorderDefinition(params: {
  style?: string | null
  width?: string | null
  color?: string | null
  fallback?: DocxBorderDefinition | null
}): DocxBorderDefinition | null {
  const value = mapCssBorderStyleToWordValue(params.style)
  if (value === 'nil') {
    return { value: 'nil', size: 0, color: 'auto' }
  }

  const normalizedColor = normalizeHexColor(params.color)
  const size = cssLengthToBorderSize(params.width)
  if (value || normalizedColor || size != null) {
    return {
      value: value ?? params.fallback?.value ?? 'single',
      size: size ?? params.fallback?.size ?? DEFAULT_DOCX_TABLE_BORDER.size,
      color: normalizedColor ?? params.fallback?.color ?? DEFAULT_DOCX_TABLE_BORDER.color
    }
  }

  return params.fallback ?? null
}

function buildDocxBorderXml(
  tag: DocxBorderTag | 'right' | 'bottom' | 'left',
  border: DocxBorderDefinition | null
): string {
  if (!border) {
    return ''
  }

  if (border.value === 'nil') {
    return `<w:${tag} w:val="nil"/>`
  }

  return `<w:${tag} w:val="${border.value}" w:sz="${border.size}" w:space="0" w:color="${border.color}"/>`
}

function buildDefaultTableCellMarginXml(): string {
  return `<w:tcMar><w:top w:w="${DOCX_TABLE_CELL_PADDING_TOP_BOTTOM}" w:type="dxa"/><w:bottom w:w="${DOCX_TABLE_CELL_PADDING_TOP_BOTTOM}" w:type="dxa"/><w:left w:w="${DOCX_TABLE_CELL_PADDING_LEFT_RIGHT}" w:type="dxa"/><w:right w:w="${DOCX_TABLE_CELL_PADDING_LEFT_RIGHT}" w:type="dxa"/></w:tcMar>`
}

function readElementStyleValue(element: HTMLElement, dataAttr: string, styleValue?: string | null): string | null {
  return element.getAttribute(dataAttr) ?? styleValue ?? null
}

function getTableThemePalette(tableEl: HTMLElement) {
  const themeKey = (tableEl.getAttribute('data-table-theme') ?? 'blue').trim().toLowerCase()
  return DOCX_TABLE_THEME_PALETTES[themeKey as keyof typeof DOCX_TABLE_THEME_PALETTES] ?? DOCX_TABLE_THEME_PALETTES.blue
}

function getTableColumnCount(tableEl: HTMLElement): number {
  const htmlTable = tableEl as HTMLTableElement
  const rowSpanWidth = Array.from(htmlTable.rows ?? []).reduce((max, row) => {
    const width = Array.from(row.cells).reduce(
      (sum, cell) => sum + Math.max(1, Number(cell.getAttribute('colspan') ?? 1)),
      0
    )
    return Math.max(max, width)
  }, 0)

  const colGroupWidth = Array.from(tableEl.children).reduce((count, child) => {
    if (child.tagName.toLowerCase() !== 'colgroup') {
      return count
    }

    return Math.max(count, Array.from(child.children).filter(col => col.tagName.toLowerCase() === 'col').length)
  }, 0)

  return Math.max(rowSpanWidth, colGroupWidth)
}

function getTableGridWidths(tableEl: HTMLElement): number[] {
  const widths: number[] = []

  for (const child of Array.from(tableEl.children)) {
    if (child.tagName.toLowerCase() !== 'colgroup') {
      continue
    }

    for (const col of Array.from(child.children)) {
      if (col.tagName.toLowerCase() !== 'col') {
        continue
      }

      const width =
        cssLengthToTwips((col as HTMLElement).style.width) ??
        cssLengthToTwips((col as HTMLElement).style.minWidth) ??
        cssLengthToTwips((col as HTMLElement).getAttribute('width')) ??
        null

      if (width != null) {
        widths.push(width)
      }
    }
  }

  return widths
}

function getTablePreferredWidth(tableEl: HTMLElement): DocxWidthValue | null {
  return (
    cssLengthToWordWidth(tableEl.getAttribute('data-table-width')) ??
    cssLengthToWordWidth(tableEl.style.width) ??
    cssLengthToWordWidth(tableEl.style.minWidth) ??
    cssLengthToWordWidth(tableEl.getAttribute('width')) ??
    null
  )
}

function getTableWidthMode(tableEl: HTMLElement): string | null {
  const mode = tableEl.getAttribute('data-table-width-mode')?.trim().toLowerCase()
  return mode || null
}

function buildFallbackGridWidths(columnCount: number, tableWidth: DocxWidthValue): number[] {
  if (columnCount <= 0 || tableWidth.type !== 'dxa') {
    return []
  }

  const baseWidth = Math.floor(tableWidth.value / columnCount)
  const remainder = tableWidth.value - baseWidth * columnCount

  return Array.from({ length: columnCount }, (_, index) => baseWidth + (index < remainder ? 1 : 0))
}

function shouldPreferGridDrivenTableWidth(
  preferredWidth: DocxWidthValue | null,
  gridWidths: number[],
  widthMode: string | null
): boolean {
  if (gridWidths.length === 0 || widthMode === 'auto-fit-window') {
    return false
  }

  if (widthMode === 'auto-fit-content' || preferredWidth == null) {
    return true
  }

  return preferredWidth.type === 'pct' && preferredWidth.value === DEFAULT_DOCX_TABLE_WIDTH.value
}

function getThemeDrivenCellBackground(
  tableEl: HTMLElement,
  rowIndex: number,
  columnIndex: number,
  colspan: number,
  totalColumns: number,
  isHeader: boolean
): string | null {
  const palette = getTableThemePalette(tableEl)

  if (tableEl.getAttribute('data-table-style-header-row') === 'true' && rowIndex === 0) {
    return palette.solid
  }
  if (tableEl.getAttribute('data-table-style-first-column') === 'true' && columnIndex === 0) {
    return palette.soft
  }
  if (tableEl.getAttribute('data-table-style-last-column') === 'true' && columnIndex + colspan === totalColumns) {
    return palette.soft
  }
  if (tableEl.getAttribute('data-table-style-banded-rows') === 'true' && rowIndex % 2 === 1) {
    return palette.softAlt
  }
  if (tableEl.getAttribute('data-table-style-banded-columns') === 'true' && columnIndex % 2 === 1) {
    return palette.softAlt
  }

  return isHeader ? 'F0F0F0' : null
}

function getThemeDrivenCellTextColor(tableEl: HTMLElement, rowIndex: number): string | null {
  return tableEl.getAttribute('data-table-style-header-row') === 'true' && rowIndex === 0 ? 'FFFFFF' : null
}

function hasThemeDrivenTableStyling(tableEl: HTMLElement): boolean {
  return (
    tableEl.getAttribute('data-table-style-header-row') === 'true' ||
    tableEl.getAttribute('data-table-style-first-column') === 'true' ||
    tableEl.getAttribute('data-table-style-last-column') === 'true' ||
    tableEl.getAttribute('data-table-style-banded-rows') === 'true' ||
    tableEl.getAttribute('data-table-style-banded-columns') === 'true'
  )
}

function getThemeDrivenCellBold(
  tableEl: HTMLElement,
  rowIndex: number,
  columnIndex: number,
  colspan: number,
  totalColumns: number,
  isHeader: boolean
): boolean {
  return (
    isHeader ||
    (tableEl.getAttribute('data-table-style-header-row') === 'true' && rowIndex === 0) ||
    (tableEl.getAttribute('data-table-style-first-column') === 'true' && columnIndex === 0) ||
    (tableEl.getAttribute('data-table-style-last-column') === 'true' && columnIndex + colspan === totalColumns)
  )
}

function getTableCellWidth(
  cell: HTMLTableCellElement,
  columnIndex: number,
  colspan: number,
  gridWidths: number[]
): DocxWidthValue | null {
  const gridWidth = gridWidths.slice(columnIndex, columnIndex + colspan).reduce((sum, width) => sum + width, 0)
  if (gridWidth > 0) {
    return { type: 'dxa', value: gridWidth }
  }

  return cssLengthToWordWidth(cell.style.width || cell.getAttribute('width'))
}

function buildDocxTableDefinition(tableEl: HTMLElement): DocxTableDefinition {
  const tableBorderHidden = tableEl.getAttribute('data-table-border-hidden') === 'true'
  const rawTableBackgroundColor =
    normalizeHexColor(tableEl.getAttribute('data-table-background-color')) ??
    normalizeHexColor(tableEl.style.backgroundColor)
  const themeDrivenStylingEnabled = hasThemeDrivenTableStyling(tableEl)
  const tableBackgroundColor =
    rawTableBackgroundColor &&
    (!themeDrivenStylingEnabled || rawTableBackgroundColor !== DEFAULT_TABLE_BACKGROUND_COLOR_HEX)
      ? rawTableBackgroundColor
      : null
  const preferredTableWidth = getTablePreferredWidth(tableEl)
  const tableWidthMode = getTableWidthMode(tableEl)
  const detectedGridWidths = getTableGridWidths(tableEl)
  const totalColumns = Math.max(getTableColumnCount(tableEl), detectedGridWidths.length)
  const provisionalTableWidth = preferredTableWidth ?? DEFAULT_DOCX_TABLE_WIDTH
  const fallbackGridWidths =
    detectedGridWidths.length > 0 ? detectedGridWidths : buildFallbackGridWidths(totalColumns, provisionalTableWidth)
  const tableWidth = shouldPreferGridDrivenTableWidth(preferredTableWidth, fallbackGridWidths, tableWidthMode)
    ? { type: 'dxa' as const, value: fallbackGridWidths.reduce((sum, width) => sum + width, 0) }
    : provisionalTableWidth
  const useFixedLayout = fallbackGridWidths.length > 0
  const fallbackBorder = tableBorderHidden ? { value: 'nil', size: 0, color: 'auto' } : DEFAULT_DOCX_TABLE_BORDER
  const tableBorder =
    buildDocxBorderDefinition({
      style: readElementStyleValue(tableEl, 'data-table-border-style', tableEl.style.borderStyle),
      width: readElementStyleValue(tableEl, 'data-table-border-width', tableEl.style.borderWidth),
      color: readElementStyleValue(tableEl, 'data-table-border-color', tableEl.style.borderColor),
      fallback: fallbackBorder
    }) ?? fallbackBorder
  const borders: Record<DocxBorderTag, DocxBorderDefinition> = {
    top: tableBorder,
    right: tableBorder,
    bottom: tableBorder,
    left: tableBorder,
    insideH: tableBorder,
    insideV: tableBorder
  }
  const rows: DocxTableCellDefinition[][] = []
  const activeMerges: Array<DocxActiveMerge | null> = []
  const htmlTable = tableEl as HTMLTableElement

  Array.from(htmlTable.rows ?? []).forEach((row, rowIndex) => {
    const rowCells: DocxTableCellDefinition[] = []
    const sourceCells = Array.from(row.cells)
    const mergesCreatedThisRow = new Set<DocxActiveMerge>()
    let sourceIndex = 0
    let columnIndex = 0

    while (sourceIndex < sourceCells.length || activeMerges.slice(columnIndex).some(Boolean)) {
      const activeMerge = activeMerges[columnIndex]
      if (activeMerge) {
        if (columnIndex === 0 || activeMerges[columnIndex - 1] !== activeMerge) {
          rowCells.push({
            ...activeMerge.cell,
            element: null,
            isMergeContinuation: true,
            rowspan: 1,
            columnIndex
          } as DocxTableCellDefinition)
          columnIndex += activeMerge.gridSpan
          continue
        }

        columnIndex += 1
        continue
      }

      const cell = sourceCells[sourceIndex]
      if (!cell) {
        break
      }

      sourceIndex += 1

      const colspan = Math.max(1, Number(cell.getAttribute('colspan') ?? 1))
      const rowspan = Math.max(1, Number(cell.getAttribute('rowspan') ?? 1))
      const explicitBackground = normalizeHexColor(
        readElementStyleValue(cell, 'data-cell-background', cell.style.backgroundColor)
      )
      const textColor = normalizeHexColor(cell.style.color) ?? getThemeDrivenCellTextColor(tableEl, rowIndex)
      const fallbackThemeBackground = getThemeDrivenCellBackground(
        tableEl,
        rowIndex,
        columnIndex,
        colspan,
        totalColumns,
        cell.tagName.toLowerCase() === 'th'
      )
      const definition: DocxTableCellDefinition = {
        element: cell,
        columnIndex,
        colspan,
        rowspan,
        isHeader: cell.tagName.toLowerCase() === 'th',
        isMergeContinuation: false,
        textAlign:
          mapTextAlignToWordValue(readElementStyleValue(cell, 'data-cell-text-align', cell.style.textAlign)) ??
          mapTextAlignToWordValue(cell.getAttribute('align')),
        verticalAlign: mapVerticalAlignToWordValue(
          readElementStyleValue(cell, 'data-cell-vertical-align', cell.style.verticalAlign)
        ),
        backgroundColor: explicitBackground ?? tableBackgroundColor ?? fallbackThemeBackground,
        textColor,
        bold: getThemeDrivenCellBold(
          tableEl,
          rowIndex,
          columnIndex,
          colspan,
          totalColumns,
          cell.tagName.toLowerCase() === 'th'
        ),
        width: getTableCellWidth(cell, columnIndex, colspan, fallbackGridWidths),
        borders: {
          top: buildDocxBorderDefinition({
            style: readElementStyleValue(cell, 'data-cell-border-top-style', cell.style.borderTopStyle),
            width: readElementStyleValue(cell, 'data-cell-border-top-width', cell.style.borderTopWidth),
            color:
              readElementStyleValue(cell, 'data-cell-border-top-color', cell.style.borderTopColor) ??
              readElementStyleValue(cell, 'data-cell-border-color', cell.style.borderColor)
          }),
          right: buildDocxBorderDefinition({
            style: readElementStyleValue(cell, 'data-cell-border-right-style', cell.style.borderRightStyle),
            width: readElementStyleValue(cell, 'data-cell-border-right-width', cell.style.borderRightWidth),
            color:
              readElementStyleValue(cell, 'data-cell-border-right-color', cell.style.borderRightColor) ??
              readElementStyleValue(cell, 'data-cell-border-color', cell.style.borderColor)
          }),
          bottom: buildDocxBorderDefinition({
            style: readElementStyleValue(cell, 'data-cell-border-bottom-style', cell.style.borderBottomStyle),
            width: readElementStyleValue(cell, 'data-cell-border-bottom-width', cell.style.borderBottomWidth),
            color:
              readElementStyleValue(cell, 'data-cell-border-bottom-color', cell.style.borderBottomColor) ??
              readElementStyleValue(cell, 'data-cell-border-color', cell.style.borderColor)
          }),
          left: buildDocxBorderDefinition({
            style: readElementStyleValue(cell, 'data-cell-border-left-style', cell.style.borderLeftStyle),
            width: readElementStyleValue(cell, 'data-cell-border-left-width', cell.style.borderLeftWidth),
            color:
              readElementStyleValue(cell, 'data-cell-border-left-color', cell.style.borderLeftColor) ??
              readElementStyleValue(cell, 'data-cell-border-color', cell.style.borderColor)
          })
        }
      }

      rowCells.push(definition)

      if (rowspan > 1) {
        const merge: DocxActiveMerge = {
          remainingRows: rowspan - 1,
          gridSpan: colspan,
          cell: definition
        }
        mergesCreatedThisRow.add(merge)

        for (let spanIndex = 0; spanIndex < colspan; spanIndex += 1) {
          activeMerges[columnIndex + spanIndex] = merge
        }
      }

      columnIndex += colspan
    }

    const seenMerges = new Set<DocxActiveMerge>()
    for (let index = 0; index < activeMerges.length; index += 1) {
      const merge = activeMerges[index]
      if (!merge || seenMerges.has(merge)) {
        continue
      }
      if (mergesCreatedThisRow.has(merge)) {
        continue
      }

      seenMerges.add(merge)
      merge.remainingRows -= 1
      if (merge.remainingRows <= 0) {
        for (let clearIndex = 0; clearIndex < activeMerges.length; clearIndex += 1) {
          if (activeMerges[clearIndex] === merge) {
            activeMerges[clearIndex] = null
          }
        }
      }
    }

    rows.push(rowCells)
  })

  return {
    width: tableWidth,
    alignment:
      mapTextAlignToWordValue(tableEl.getAttribute('data-table-align')) ??
      mapTextAlignToWordValue(tableEl.getAttribute('align')),
    borders,
    gridWidths: fallbackGridWidths,
    useFixedLayout,
    rows
  }
}

function buildInlineStyleRunProps(element: HTMLElement): string {
  const props: string[] = []
  const color = normalizeHexColor(element.style.color)
  const backgroundColor = normalizeHexColor(element.style.backgroundColor)
  const fontFamily = extractPrimaryWordFontFamily(element.style.fontFamily)
  const fontSize = cssLengthToTwips(element.style.fontSize)

  if (color) {
    props.push(`<w:color w:val="${color}"/>`)
  }
  if (backgroundColor) {
    props.push(`<w:shd w:val="clear" w:fill="${backgroundColor}"/>`)
  }
  if (element.style.fontFamily) {
    props.push(`<w:rFonts w:ascii="${escapeXml(fontFamily)}" w:hAnsi="${escapeXml(fontFamily)}"/>`)
  }
  if (fontSize != null) {
    const halfPoints = Math.max(2, Math.round(fontSize / 10))
    props.push(`<w:sz w:val="${halfPoints}"/>`)
  }

  const fontWeight = element.style.fontWeight.trim().toLowerCase()
  const numericWeight = Number.parseInt(fontWeight, 10)
  if (fontWeight === 'bold' || (!Number.isNaN(numericWeight) && numericWeight >= 600)) {
    props.push('<w:b/>')
  }

  if (element.style.fontStyle.trim().toLowerCase() === 'italic') {
    props.push('<w:i/>')
  }

  const textDecoration = element.style.textDecoration.toLowerCase()
  if (textDecoration.includes('underline')) {
    props.push('<w:u w:val="single"/>')
  }
  if (textDecoration.includes('line-through')) {
    props.push('<w:strike/>')
  }

  return props.join('')
}

function buildFontRunProps(fontFamily: string, halfPoints: number): string {
  const escapedFamily = escapeXml(fontFamily)
  return `<w:rFonts w:ascii="${escapedFamily}" w:hAnsi="${escapedFamily}"/><w:sz w:val="${halfPoints}"/>`
}

function buildOptionalTocRunProps(style: DocumentTocStyles['entries']): string {
  const parts: string[] = []

  if (style.fontFamily) {
    const escapedFamily = escapeXml(style.fontFamily)
    parts.push(`<w:rFonts w:ascii="${escapedFamily}" w:hAnsi="${escapedFamily}"/>`)
  }
  if (style.fontSizePt !== null) {
    const halfPoints = pxToHalfPoints((style.fontSizePt * 96) / 72)
    parts.push(`<w:sz w:val="${halfPoints}"/>`)
    parts.push(`<w:szCs w:val="${halfPoints}"/>`)
  }
  if (style.bold) {
    parts.push('<w:b/>')
  }
  if (style.italic) {
    parts.push('<w:i/>')
  }
  if (style.color) {
    parts.push(`<w:color w:val="${escapeXml(style.color.replace('#', ''))}"/>`)
  }

  return parts.join('')
}

function resolveDocxTypographySettings(formatting?: DocumentFormatting | null): DocxTypographySettings {
  const printStyle = getPrintStyleConfigFromFormatting(formatting)
  const bodyFontPx = Number.parseFloat(printStyle.fontSize) || DEFAULT_DOCX_FONT_SIZE_PX
  const bodyLineHeight = Number.parseFloat(printStyle.lineHeight) || DEFAULT_DOCX_LINE_HEIGHT

  return {
    fontFamily: extractPrimaryWordFontFamily(printStyle.fontFamily),
    bodyFontHalfPoints: pxToHalfPoints(bodyFontPx),
    bodyLineSpacing: lineHeightToWordSpacing(bodyLineHeight),
    tableFontHalfPoints: pxToHalfPoints(DOCX_TABLE_FONT_SIZE_PX),
    tableLineSpacing: lineHeightToWordSpacing(DOCX_TABLE_LINE_HEIGHT)
  }
}

function buildTocTabsXml(settings: DocxTocStyleSettings): string {
  if (!settings.showPageNumbers) {
    return ''
  }

  const leader = settings.tabLeader === 'dot' ? ' w:leader="dot"' : ''
  return `<w:tabs><w:tab w:val="right"${leader} w:pos="9350"/></w:tabs>`
}

function buildTocParagraphStyleXml(styleId: string, level: number, settings: DocxTocStyleSettings): string {
  const leftIndent = Math.max(0, level - 1) * 360
  const indentXml = leftIndent > 0 ? `<w:ind w:left="${leftIndent}"/>` : ''
  const tabsXml = buildTocTabsXml(settings)
  const runProps = buildOptionalTocRunProps(settings.styles.entries)

  return `<w:style w:type="paragraph" w:styleId="${styleId}"><w:name w:val="${styleId}"/><w:basedOn w:val="Normal"/><w:pPr>${tabsXml}${indentXml}<w:spacing w:before="0" w:after="0" w:line="${settings.showPageNumbers ? '324' : '276'}" w:lineRule="auto"/></w:pPr><w:rPr>${runProps}</w:rPr></w:style>`
}

function buildTocHeadingStyleXml(settings: DocxTocStyleSettings): string {
  const runProps = buildOptionalTocRunProps(settings.styles.title)
  return `<w:style w:type="paragraph" w:styleId="TOCHeading"><w:name w:val="TOC Heading"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="120" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr>${runProps}</w:rPr></w:style>`
}

function resolveDocxTocStyleSettings(root: ParentNode): DocxTocStyleSettings {
  const firstToc = root.querySelector?.('[data-document-toc]')
  if (!(firstToc instanceof HTMLElement)) {
    return {
      styles: DEFAULT_DOCUMENT_TOC_STYLES,
      showPageNumbers: true,
      tabLeader: 'dot'
    }
  }

  return {
    styles: parseDocumentTocStyles(firstToc.getAttribute('data-toc-styles')),
    showPageNumbers: firstToc.getAttribute('data-toc-show-page-numbers') !== 'false',
    tabLeader: firstToc.getAttribute('data-toc-tab-leader') === 'none' ? 'none' : 'dot'
  }
}

function extractDataUrlParts(dataUrl: string): { mime: string; base64: string; ext: string } | null {
  const m = dataUrl.match(/^data:(image\/(\w+));base64,(.+)$/i)
  if (!m) return null
  return { mime: m[1], ext: m[2] === 'jpeg' ? 'jpg' : m[2], base64: m[3] }
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

function sanitizeDocxPartKey(partKey: string): string {
  const normalized = partKey
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return normalized || 'part'
}

function allocateDocPrId(ctx: DocxBuildContext): number {
  const nextId = ctx.buildState.nextDocPrId
  ctx.buildState.nextDocPrId += 1
  return nextId
}

function registerImage(ctx: DocxBuildContext, src: string, width: number, height: number): EmbeddedImage | null {
  const parts = extractDataUrlParts(src)
  if (!parts) return null
  const id = ctx.nextImageId++
  const img: EmbeddedImage = {
    rId: `rIdImg${id}`,
    fileName: `${sanitizeDocxPartKey(ctx.partKey)}-image${id}.${parts.ext}`,
    data: base64ToUint8Array(parts.base64),
    widthEmu: (width || DEFAULT_IMG_WIDTH) * PX_TO_EMU,
    heightEmu: (height || DEFAULT_IMG_HEIGHT) * PX_TO_EMU
  }
  ctx.images.push(img)
  return img
}

function registerHyperlink(ctx: DocxBuildContext, url: string): string {
  const id = ctx.nextHyperlinkId++
  const rId = `rIdLink${id}`
  ctx.hyperlinks.push({ rId, url })
  return rId
}

function pxToEmu(px: number): number {
  return Math.round(px * PX_TO_EMU)
}

function ptToOoxmlLineWidth(points: number): number {
  return Math.round(points * POINT_TO_OOXML_LINE_WIDTH)
}

function mapImageBorderDashToOoxml(dash: ImageBorderDash): string | null {
  switch (dash) {
    case 'dash':
      return 'dash'
    case 'dot':
      return 'dot'
    case 'dash-dot':
      return 'dashDot'
    case 'dash-dot-dot':
      return 'dashDotDot'
    case 'solid':
    default:
      return null
  }
}

function getPictureBorderXml(layout?: ReturnType<typeof getImageFigureAttributesFromElement>): string {
  if (!layout || !layout.borderVisible) {
    return ''
  }

  const borderColor =
    normalizeImageBorderColor(layout.borderColor, DEFAULT_IMAGE_BORDER_COLOR) ?? DEFAULT_IMAGE_BORDER_COLOR
  const borderWidthPt =
    normalizeImageBorderWidthPt(layout.borderWidthPt, DEFAULT_IMAGE_BORDER_WIDTH_PT) ?? DEFAULT_IMAGE_BORDER_WIDTH_PT
  const borderDash = normalizeImageBorderDash(layout.borderDash, DEFAULT_IMAGE_BORDER_DASH)
  const ooxmlDash = mapImageBorderDashToOoxml(borderDash)

  return [
    `<a:ln w="${ptToOoxmlLineWidth(borderWidthPt)}">`,
    `<a:solidFill><a:srgbClr val="${borderColor.slice(1)}"/></a:solidFill>`,
    ...(ooxmlDash ? [`<a:prstDash val="${ooxmlDash}"/>`] : []),
    '</a:ln>'
  ].join('')
}

function getWordRotationValue(rotation: number): string {
  return String(Math.round(rotation * 60000))
}

function getWrapText(layout: ReturnType<typeof resolveWordLikeImageLayout>): string {
  return layout.wrapTextSide ?? 'bothSides'
}

function getWrapPolygonXml(layout: ReturnType<typeof resolveWordLikeImageLayout>): string {
  const points = convertWrapPolygonToWordCoordinates(layout.wrapPolygon, WRAP_POLYGON_COORDINATE_SPACE)
  const start = points[0]
  if (!start) {
    return ''
  }

  return [
    '<wp:wrapPolygon edited="0">',
    `<wp:start x="${start.x}" y="${start.y}"/>`,
    ...points.slice(1).map(point => `<wp:lineTo x="${point.x}" y="${point.y}"/>`),
    '</wp:wrapPolygon>'
  ].join('')
}

function getWrapXml(layout: ReturnType<typeof resolveWordLikeImageLayout>): string {
  if (layout.wrapMode === 'top-bottom') {
    return '<wp:wrapTopAndBottom/>'
  }

  if (layout.wrapMode === 'behind' || layout.wrapMode === 'front') {
    return '<wp:wrapNone/>'
  }

  if (layout.wrapMode === 'tight' || layout.wrapMode === 'through') {
    const tagName = layout.wrapMode === 'tight' ? 'wrapTight' : 'wrapThrough'
    return `<wp:${tagName} wrapText="${getWrapText(layout)}">${getWrapPolygonXml(layout)}</wp:${tagName}>`
  }

  return `<wp:wrapSquare wrapText="${getWrapText(layout)}"/>`
}

function getHorizontalAlignmentXml(
  layout: ReturnType<typeof getImageFigureAttributesFromElement>,
  horizontalRef: string,
  offsetX: number,
  wordLayout?: ReturnType<typeof resolveWordLikeImageLayout>
): string {
  if (offsetX !== 0) {
    return `<wp:positionH relativeFrom="${horizontalRef}"><wp:posOffset>${offsetX}</wp:posOffset></wp:positionH>`
  }

  if (
    wordLayout &&
    wordLayout.wrapMode === 'square' &&
    (wordLayout.wrapTextSide === 'left' || wordLayout.wrapTextSide === 'right') &&
    wordLayout.floatingSide
  ) {
    return `<wp:positionH relativeFrom="${horizontalRef}"><wp:align>${wordLayout.floatingSide}</wp:align></wp:positionH>`
  }

  let align = 'left'
  if (layout.align === 'center') {
    align = 'center'
  } else if (layout.align === 'right') {
    align = 'right'
  }

  return `<wp:positionH relativeFrom="${horizontalRef}"><wp:align>${align}</wp:align></wp:positionH>`
}

async function loadImageForWrapContour(src: string): Promise<HTMLImageElement | null> {
  if (!src) {
    return null
  }

  return new Promise(resolve => {
    const image = new Image()
    const timeout = globalThis.setTimeout(() => resolve(null), 100)
    image.onload = () => {
      globalThis.clearTimeout(timeout)
      resolve(image)
    }
    image.onerror = () => {
      globalThis.clearTimeout(timeout)
      resolve(null)
    }
    image.src = src
  })
}

async function resolveDocxWordLayout(
  layout: ReturnType<typeof getImageFigureAttributesFromElement>,
  src: string
): Promise<ReturnType<typeof resolveWordLikeImageLayout>> {
  if (layout.wrapMode !== 'tight' && layout.wrapMode !== 'through') {
    return resolveWordLikeImageLayout(layout)
  }

  const image = await loadImageForWrapContour(src)
  const wrapContour = image ? analyzeImageWrapContour(image, layout) : null
  return resolveWordLikeImageLayout(layout, { wrapContour })
}

function getCropXml(layout?: ReturnType<typeof getImageFigureAttributesFromElement>) {
  if (!layout || !hasImageCrop(layout)) {
    return ''
  }

  const crop = normalizeImageCrop(layout)
  return `<a:srcRect l="${convertCropRatioToWordValue(crop.left)}" t="${convertCropRatioToWordValue(crop.top)}" r="${convertCropRatioToWordValue(
    crop.right
  )}" b="${convertCropRatioToWordValue(crop.bottom)}"/>`
}

function imageInlineDrawingXml(
  img: EmbeddedImage,
  docPrId: number,
  rotation: number,
  layout?: ReturnType<typeof getImageFigureAttributesFromElement>
): string {
  const pictureBorderXml = getPictureBorderXml(layout)

  return (
    `<w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${img.widthEmu}" cy="${img.heightEmu}"/>` +
    `<wp:docPr id="${docPrId}" name="${escapeXml(img.fileName)}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="0" name="${escapeXml(img.fileName)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${img.rId}"/>${getCropXml(layout)}<a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm rot="${getWordRotationValue(rotation)}"><a:off x="0" y="0"/><a:ext cx="${img.widthEmu}" cy="${img.heightEmu}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${pictureBorderXml}</pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
  )
}

function imageAnchorDrawingXml(
  img: EmbeddedImage,
  docPrId: number,
  layout: ReturnType<typeof getImageFigureAttributesFromElement>,
  wordLayout: ReturnType<typeof resolveWordLikeImageLayout>,
  rotation: number
): string {
  const distT = pxToEmu(layout.distanceTop ?? DOCX_IMAGE_DEFAULTS.distance)
  const distR = pxToEmu(layout.distanceRight ?? DOCX_IMAGE_DEFAULTS.distance)
  const distB = pxToEmu(layout.distanceBottom ?? DOCX_IMAGE_DEFAULTS.distance)
  const distL = pxToEmu(layout.distanceLeft ?? DOCX_IMAGE_DEFAULTS.distance)
  const offsetX = pxToEmu(layout.offsetX ?? 0)
  const offsetY = pxToEmu(layout.offsetY ?? 0)
  const relativeHeight = Math.max(0, Math.round((layout.zIndex ?? 1) * 1000))
  const allowOverlap = layout.allowOverlap ?? (layout.wrapMode === 'behind' || layout.wrapMode === 'front')
  const behindDoc = layout.wrapMode === 'behind'
  const horizontalRef = layout.anchorMode === 'fixed' ? 'page' : 'margin'
  const verticalRef = layout.anchorMode === 'fixed' ? 'page' : 'paragraph'
  const wrapXml = getWrapXml(wordLayout)
  const positionH = getHorizontalAlignmentXml(layout, horizontalRef, offsetX, wordLayout)
  const positionV = `<wp:positionV relativeFrom="${verticalRef}"><wp:posOffset>${offsetY}</wp:posOffset></wp:positionV>`
  const pictureBorderXml = getPictureBorderXml(layout)

  return (
    `<w:drawing>` +
    `<wp:anchor distT="${distT}" distB="${distB}" distL="${distL}" distR="${distR}" simplePos="0" relativeHeight="${relativeHeight}" behindDoc="${
      behindDoc ? 1 : 0
    }" locked="0" layoutInCell="1" allowOverlap="${allowOverlap ? 1 : 0}">` +
    `<wp:simplePos x="0" y="0"/>` +
    positionH +
    positionV +
    `<wp:extent cx="${img.widthEmu}" cy="${img.heightEmu}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    wrapXml +
    `<wp:docPr id="${docPrId}" name="${escapeXml(img.fileName)}"/>` +
    `<wp:cNvGraphicFramePr/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="0" name="${escapeXml(img.fileName)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${img.rId}"/>${getCropXml(layout)}<a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm rot="${getWordRotationValue(rotation)}"><a:off x="0" y="0"/><a:ext cx="${img.widthEmu}" cy="${img.heightEmu}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${pictureBorderXml}</pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic>` +
    `</wp:anchor></w:drawing>`
  )
}

function imageDrawingXml(
  img: EmbeddedImage,
  docPrId: number,
  layout?: ReturnType<typeof getImageFigureAttributesFromElement>,
  wordLayout?: ReturnType<typeof resolveWordLikeImageLayout>,
  rotation = 0
): string {
  return layout && layout.wrapMode !== 'inline'
    ? imageAnchorDrawingXml(img, docPrId, layout, wordLayout ?? resolveWordLikeImageLayout(layout), rotation)
    : imageInlineDrawingXml(img, docPrId, rotation, layout)
}

function wrapDrawingRun(drawingXml: string): string {
  return `<w:r>${drawingXml}</w:r>`
}

function getWordAlignmentValue(align: string | null | undefined): 'left' | 'center' | 'right' {
  if (align === 'center') return 'center'
  if (align === 'right') return 'right'
  return 'left'
}

async function convertFigure(el: HTMLElement, parts: string[], ctx: DocxBuildContext): Promise<void> {
  const imgEl = el.querySelector('img[src]')
  if (!imgEl) return

  const layout = getImageFigureAttributesFromElement(el, DOCX_IMAGE_DEFAULTS)
  const src = imgEl.getAttribute('src') || ''
  const wordLayout = await resolveDocxWordLayout(layout, src)
  const resolvedDimensions = resolveImageDimensions(layout)
  const width = resolvedDimensions.width ?? DEFAULT_IMG_WIDTH
  const height = resolvedDimensions.height ?? DEFAULT_IMG_HEIGHT
  const img = registerImage(ctx, src, width, height)
  if (!img) return
  const docPrId = allocateDocPrId(ctx)

  parts.push(
    `<w:p>${wrapDrawingRun(imageDrawingXml(img, docPrId, layout, wordLayout, resolvedDimensions.rotation))}</w:p>`
  )

  if (layout.caption?.trim()) {
    const jc = getWordAlignmentValue(layout.align)
    parts.push(
      `<w:p><w:pPr><w:jc w:val="${jc}"/><w:spacing w:before="0" w:after="120"/></w:pPr>${wrapRun(layout.caption.trim(), '<w:i/><w:color w:val="666666"/><w:sz w:val="18"/>')}</w:p>`
    )
  }
}

function buildRunInnerXml(text: string, props?: string): string {
  const rPr = props ? `<w:rPr>${props}</w:rPr>` : ''
  const textXml = text.length > 0 ? `<w:t xml:space="preserve">${escapeXml(text)}</w:t>` : ''
  return `${rPr}${textXml}`
}

function wrapRun(text: string, props?: string): string {
  return `<w:r>${buildRunInnerXml(text, props)}</w:r>`
}

function buildSimpleFieldXml(instruction: string, displayText: string, props?: string): string {
  return `<w:fldSimple w:instr="${escapeXml(instruction)}"><w:r>${buildRunInnerXml(displayText, props)}</w:r></w:fldSimple>`
}

const DOCX_FIELD_TOKEN_REGEX = /\{(page|total|title)\}/g

function wrapTextWithFieldTokens(text: string, ctx: DocxBuildContext, props?: string): string {
  if (!ctx.fieldConfig || !DOCX_FIELD_TOKEN_REGEX.test(text)) {
    DOCX_FIELD_TOKEN_REGEX.lastIndex = 0
    return wrapRun(text, props)
  }

  DOCX_FIELD_TOKEN_REGEX.lastIndex = 0
  let result = ''
  let cursor = 0
  let match = DOCX_FIELD_TOKEN_REGEX.exec(text)

  while (match) {
    const [token, tokenName] = match
    const start = match.index

    if (start > cursor) {
      result += wrapRun(text.slice(cursor, start), props)
    }

    switch (tokenName) {
      case 'page':
        result += buildSimpleFieldXml(ctx.fieldConfig.pageInstruction, ctx.fieldConfig.pageDisplayText, props)
        break
      case 'total':
        result += buildSimpleFieldXml('NUMPAGES', ctx.fieldConfig.totalDisplayText, props)
        break
      case 'title':
        result += wrapRun(ctx.fieldConfig.documentTitle, props)
        break
      default:
        result += wrapRun(token, props)
        break
    }

    cursor = start + token.length
    match = DOCX_FIELD_TOKEN_REGEX.exec(text)
  }

  if (cursor < text.length) {
    result += wrapRun(text.slice(cursor), props)
  }

  DOCX_FIELD_TOKEN_REGEX.lastIndex = 0
  return result
}

function convertInline(el: HTMLElement, ctx: DocxBuildContext, inheritProps?: string): string {
  let result = ''
  for (let i = 0; i < el.childNodes.length; i++) {
    const node = el.childNodes[i]
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (text) result += wrapTextWithFieldTokens(text, ctx, inheritProps)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as HTMLElement
      const tag = child.tagName.toLowerCase()
      const styledProps = `${inheritProps || ''}${buildInlineStyleRunProps(child)}`
      switch (tag) {
        case 'strong':
        case 'b':
          result += convertInline(child, ctx, `${styledProps}<w:b/>`)
          break
        case 'em':
        case 'i':
          result += convertInline(child, ctx, `${styledProps}<w:i/>`)
          break
        case 'u':
          result += convertInline(child, ctx, `${styledProps}<w:u w:val="single"/>`)
          break
        case 's':
        case 'del':
        case 'strike':
          result += convertInline(child, ctx, `${styledProps}<w:strike/>`)
          break
        case 'a': {
          const href = child.getAttribute('href') || ''
          if (href) {
            const rId = registerHyperlink(ctx, href)
            const linkProps = `${styledProps}<w:rStyle w:val="Hyperlink"/><w:color w:val="0066CC"/><w:u w:val="single"/>`
            result += `<w:hyperlink r:id="${rId}">${convertInline(child, ctx, linkProps)}</w:hyperlink>`
          } else {
            result += convertInline(child, ctx, styledProps)
          }
          break
        }
        case 'br':
          result += '<w:r><w:br/></w:r>'
          break
        case 'img': {
          const src = child.getAttribute('src') || ''
          const w = parseInt(child.getAttribute('width') || '0', 10) || DEFAULT_IMG_WIDTH
          const h = parseInt(child.getAttribute('height') || '0', 10) || DEFAULT_IMG_HEIGHT
          const img = registerImage(ctx, src, w, h)
          if (img) result += wrapDrawingRun(imageDrawingXml(img, allocateDocPrId(ctx)))
          break
        }
        case 'code':
          result += convertInline(
            child,
            ctx,
            `${styledProps}<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="20"/>`
          )
          break
        default:
          result += convertInline(child, ctx, styledProps)
          break
      }
    }
  }
  return result
}

async function convertBlock(parent: Node, parts: string[], ctx: DocxBuildContext): Promise<void> {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) parts.push(`<w:p>${wrapRun(text)}</w:p>`)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()
      switch (tag) {
        case 'p':
          parts.push(`<w:p>${convertInline(el, ctx)}</w:p>`)
          break
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6': {
          const level = tag.charAt(1)
          parts.push(`<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr>${convertInline(el, ctx)}</w:p>`)
          break
        }
        case 'ul':
          convertList(el, parts, ctx, false, 0)
          break
        case 'ol':
          convertList(el, parts, ctx, true, 0)
          break
        case 'table':
          convertTable(el, parts, ctx)
          break
        case 'blockquote': {
          const bqPs = el.querySelectorAll('p')
          if (bqPs.length > 0) {
            bqPs.forEach(p => {
              parts.push(
                `<w:p><w:pPr><w:ind w:left="720"/></w:pPr>${convertInline(p as HTMLElement, ctx, '<w:i/><w:color w:val="555555"/>')}</w:p>`
              )
            })
          } else {
            parts.push(
              `<w:p><w:pPr><w:ind w:left="720"/></w:pPr>${convertInline(el, ctx, '<w:i/><w:color w:val="555555"/>')}</w:p>`
            )
          }
          break
        }
        case 'pre': {
          const codeEl = el.querySelector('code')
          const text = (codeEl || el).textContent || ''
          text.split('\n').forEach(line => {
            parts.push(
              `<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="E0E0E0"/><w:bottom w:val="single" w:sz="4" w:space="1" w:color="E0E0E0"/><w:left w:val="single" w:sz="4" w:space="4" w:color="E0E0E0"/><w:right w:val="single" w:sz="4" w:space="4" w:color="E0E0E0"/></w:pBdr><w:shd w:val="clear" w:fill="F5F5F5"/></w:pPr>${wrapRun(line, '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="20"/>')}</w:p>`
            )
          })
          break
        }
        case 'hr':
          parts.push(
            '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>'
          )
          break
        case 'br':
          parts.push('<w:p/>')
          break
        case 'div':
          if (el.hasAttribute('data-page-break')) {
            parts.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
          } else if (el.hasAttribute('data-document-toc')) {
            parts.push(...buildWordTocXmlFromElement(el))
          } else {
            await convertBlock(el, parts, ctx)
          }
          break
        case 'figure':
          if (el.getAttribute('data-node-type') === CUSTOM_IMAGE_TAG) {
            await convertFigure(el, parts, ctx)
          } else {
            await convertBlock(el, parts, ctx)
          }
          break
        default:
          if (el.textContent?.trim()) {
            parts.push(`<w:p>${convertInline(el, ctx)}</w:p>`)
          }
          break
      }
    }
  }
}

function convertList(
  listEl: HTMLElement,
  parts: string[],
  ctx: DocxBuildContext,
  ordered: boolean,
  level: number
): void {
  const numId = ordered ? '2' : '1'
  const items = listEl.querySelectorAll(':scope > li')
  items.forEach(li => {
    const pPr = `<w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>`
    const paragraphs = li.querySelectorAll(':scope > p')
    if (paragraphs.length > 0) {
      paragraphs.forEach((p, idx) => {
        parts.push(`<w:p>${idx === 0 ? pPr : ''}${convertInline(p as HTMLElement, ctx)}</w:p>`)
      })
    } else {
      const inlineContent = convertInline(li as HTMLElement, ctx)
      parts.push(`<w:p>${pPr}${inlineContent}</w:p>`)
    }
    const nestedUl = li.querySelectorAll(':scope > ul')
    nestedUl.forEach(nested => convertList(nested as HTMLElement, parts, ctx, false, level + 1))
    const nestedOl = li.querySelectorAll(':scope > ol')
    nestedOl.forEach(nested => convertList(nested as HTMLElement, parts, ctx, true, level + 1))
  })
}

function convertTable(tableEl: HTMLElement, parts: string[], ctx: DocxBuildContext): void {
  const table = buildDocxTableDefinition(tableEl)
  const borderXml =
    buildDocxBorderXml('top', table.borders.top) +
    buildDocxBorderXml('bottom', table.borders.bottom) +
    buildDocxBorderXml('left', table.borders.left) +
    buildDocxBorderXml('right', table.borders.right) +
    buildDocxBorderXml('insideH', table.borders.insideH) +
    buildDocxBorderXml('insideV', table.borders.insideV)
  const alignmentXml = table.alignment ? `<w:jc w:val="${table.alignment}"/>` : ''
  const layoutXml = table.useFixedLayout ? '<w:tblLayout w:type="fixed"/>' : ''
  const gridXml =
    table.gridWidths.length > 0
      ? `<w:tblGrid>${table.gridWidths.map(width => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>`
      : ''

  parts.push(
    `<w:tbl><w:tblPr><w:tblBorders>${borderXml}</w:tblBorders><w:tblW w:w="${table.width.value}" w:type="${table.width.type}"/>${layoutXml}${alignmentXml}</w:tblPr>${gridXml}`
  )
  table.rows.forEach(row => {
    parts.push('<w:tr>')
    row.forEach(cell => {
      const tcPrParts: string[] = []
      const pPrParts = [
        `<w:spacing w:before="0" w:after="0" w:line="${ctx.typography.tableLineSpacing}" w:lineRule="auto"/>`
      ]
      const rPropsParts = [buildFontRunProps(ctx.typography.fontFamily, ctx.typography.tableFontHalfPoints)]

      if (cell.backgroundColor) {
        tcPrParts.push(`<w:shd w:val="clear" w:fill="${cell.backgroundColor}"/>`)
      }
      if (cell.textAlign) {
        pPrParts.push(`<w:jc w:val="${cell.textAlign}"/>`)
      }
      if (cell.verticalAlign) {
        tcPrParts.push(`<w:vAlign w:val="${cell.verticalAlign}"/>`)
      }
      if (cell.colspan > 1) {
        tcPrParts.push(`<w:gridSpan w:val="${cell.colspan}"/>`)
      }
      if (cell.rowspan > 1 || cell.isMergeContinuation) {
        tcPrParts.push(cell.isMergeContinuation ? '<w:vMerge/>' : '<w:vMerge w:val="restart"/>')
      }
      if (cell.width) {
        tcPrParts.push(`<w:tcW w:w="${cell.width.value}" w:type="${cell.width.type}"/>`)
      }
      tcPrParts.push(buildDefaultTableCellMarginXml())

      const cellBorderXml = [
        buildDocxBorderXml('top', cell.borders.top ?? null),
        buildDocxBorderXml('right', cell.borders.right ?? null),
        buildDocxBorderXml('bottom', cell.borders.bottom ?? null),
        buildDocxBorderXml('left', cell.borders.left ?? null)
      ]
        .filter(Boolean)
        .join('')
      if (cellBorderXml) {
        tcPrParts.push(`<w:tcBorders>${cellBorderXml}</w:tcBorders>`)
      }

      if (cell.bold) {
        rPropsParts.push('<w:b/>')
      }
      if (cell.textColor) {
        rPropsParts.push(`<w:color w:val="${cell.textColor}"/>`)
      }

      const paragraphPropertiesXml = `<w:pPr>${pPrParts.join('')}</w:pPr>`
      const paragraphXml = cell.isMergeContinuation
        ? '<w:p/>'
        : buildTableCellParagraphsXml(cell.element ?? tableEl, ctx, paragraphPropertiesXml, rPropsParts.join(''))

      parts.push(`<w:tc><w:tcPr>${tcPrParts.join('')}</w:tcPr>${paragraphXml}</w:tc>`)
    })
    parts.push('</w:tr>')
  })
  parts.push('</w:tbl>')
}

function buildTableCellParagraphsXml(
  cellEl: HTMLElement,
  ctx: DocxBuildContext,
  paragraphPropertiesXml: string,
  runPropertiesXml: string
): string {
  const directParagraphs = Array.from(cellEl.children).filter(child => child.tagName.toLowerCase() === 'p')

  if (directParagraphs.length === 0) {
    return `<w:p>${paragraphPropertiesXml}${convertInline(cellEl, ctx, runPropertiesXml)}</w:p>`
  }

  return directParagraphs
    .map(
      paragraph =>
        `<w:p>${paragraphPropertiesXml}${convertInline(paragraph as HTMLElement, ctx, runPropertiesXml)}</w:p>`
    )
    .join('')
}

type DocxHeaderFooterReferenceType = 'default' | 'first' | 'even'
type DocxHeaderFooterKind = 'header' | 'footer'

interface DocxHeaderFooterPart {
  kind: DocxHeaderFooterKind
  referenceType: DocxHeaderFooterReferenceType
  relationshipId: string
  targetPath: string
  zipPath: string
  relsZipPath: string
  xml: string
  ctx: DocxBuildContext
}

interface DocxHeaderFooterResult {
  parts: DocxHeaderFooterPart[]
  useDifferentFirstPage: boolean
  useEvenAndOddHeaders: boolean
  pgNumTypeXml: string
}

function resolveDocxPageNumberSlotAlignment(
  alignment: NonNullable<ReturnType<typeof getPagesConfigFromFormatting>['pageNumberAlignment']>,
  oddPage: boolean
): DocxPageNumberSlot['alignment'] {
  switch (alignment) {
    case 'left':
      return 'left'
    case 'right':
      return 'right'
    case 'inside':
      return oddPage ? 'left' : 'right'
    case 'outside':
      return oddPage ? 'right' : 'left'
    case 'center':
    default:
      return 'center'
  }
}

function resolveDocxPageNumberSlot(
  formatting?: DocumentFormatting | null,
  region?: DocxHeaderFooterKind,
  page = 1
): DocxPageNumberSlot | null {
  const pages = getPagesConfigFromFormatting(formatting)
  if (!pages.pageNumberAlignment) return null
  if ((pages.pageNumberRegion ?? 'footer') !== region) return null
  if (pages.pageNumberShowOnFirstPage === false && page === 1) return null

  return {
    alignment: resolveDocxPageNumberSlotAlignment(pages.pageNumberAlignment, page % 2 !== 0)
  }
}

function hasDocxFieldTokens(html: string): boolean {
  return /\{(?:page|total|title)\}/.test(html)
}

function mapPageNumberNumeralStyleToWordFormat(
  style: ReturnType<typeof getPagesConfigFromFormatting>['pageNumberNumeralStyle']
): string {
  switch (style) {
    case 'lowerRoman':
      return 'lowerRoman'
    case 'upperRoman':
      return 'upperRoman'
    case 'lowerAlpha':
      return 'lowerLetter'
    case 'upperAlpha':
      return 'upperLetter'
    default:
      return 'decimal'
  }
}

function mapPageNumberNumeralStyleToFieldInstruction(
  style: ReturnType<typeof getPagesConfigFromFormatting>['pageNumberNumeralStyle']
): string {
  switch (style) {
    case 'lowerRoman':
      return 'PAGE \\* roman'
    case 'upperRoman':
      return 'PAGE \\* ROMAN'
    case 'lowerAlpha':
      return 'PAGE \\* alphabetic'
    case 'upperAlpha':
      return 'PAGE \\* ALPHABETIC'
    default:
      return 'PAGE'
  }
}

function buildPgNumTypeXml(formatting?: DocumentFormatting | null): string {
  const pages = getPagesConfigFromFormatting(formatting)
  const attributes: string[] = []

  if (pages.pageNumberStartAt > 1) {
    attributes.push(`w:start="${pages.pageNumberStartAt}"`)
  }

  const numeralFormat = mapPageNumberNumeralStyleToWordFormat(pages.pageNumberNumeralStyle)
  if (numeralFormat !== 'decimal') {
    attributes.push(`w:fmt="${numeralFormat}"`)
  }

  if (attributes.length === 0) {
    return ''
  }

  return `<w:pgNumType ${attributes.join(' ')}/>`
}

function buildSettingsXml(useEvenAndOddHeaders: boolean): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
${useEvenAndOddHeaders ? '<w:evenAndOddHeaders/>' : ''}
</w:settings>`
}

function buildHeaderFooterPartXml(kind: DocxHeaderFooterKind, bodyXml: string): string {
  const rootTag = kind === 'header' ? 'w:hdr' : 'w:ftr'
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<${rootTag} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
${bodyXml}
</${rootTag}>`
}

function buildPageNumberSlotParagraph(slot: DocxPageNumberSlot, fieldConfig: DocxFieldConfig): string {
  return `<w:p><w:pPr><w:jc w:val="${slot.alignment}"/><w:spacing w:before="0" w:after="0"/></w:pPr>${buildSimpleFieldXml(fieldConfig.pageInstruction, fieldConfig.pageDisplayText)}</w:p>`
}

function resolveHeaderFooterHtmlForPage(
  kind: DocxHeaderFooterKind,
  formatting?: DocumentFormatting | null,
  page = 1
): string {
  const pages = getPagesConfigFromFormatting(formatting)

  if (page === 1 && pages.differentFirstPage) {
    return kind === 'header' ? (pages.headerFirstPage ?? '') : (pages.footerFirstPage ?? '')
  }

  if (pages.differentOddEven) {
    if (page % 2 === 0) {
      return kind === 'header' ? (pages.headerEven ?? '') : (pages.footerEven ?? '')
    }

    return kind === 'header' ? (pages.headerOdd ?? '') : (pages.footerOdd ?? '')
  }

  return kind === 'header' ? pages.header : pages.footer
}

function buildFieldConfig(
  title: string,
  formatting: DocumentFormatting | null | undefined,
  page: number
): DocxFieldConfig {
  const pages = getPagesConfigFromFormatting(formatting)

  return {
    documentTitle: title,
    pageInstruction: mapPageNumberNumeralStyleToFieldInstruction(pages.pageNumberNumeralStyle),
    pageDisplayText: String(Math.max(1, page - 1 + pages.pageNumberStartAt)),
    totalDisplayText: '1'
  }
}

async function buildHeaderFooterPart(params: {
  kind: DocxHeaderFooterKind
  referenceType: DocxHeaderFooterReferenceType
  page: number
  title: string
  html: string
  slot: DocxPageNumberSlot | null
  formatting?: DocumentFormatting | null
  typography: DocxTypographySettings
  buildState: DocxBuildState
  index: number
}): Promise<DocxHeaderFooterPart | null> {
  const { kind, referenceType, page, title, html, slot, formatting, typography, buildState, index } = params
  const safeHtml = sanitizeHtmlForExport(html, {
    preserveBlockSpacing: true,
    preserveTextStyles: true,
    preserveVisualStyles: true,
    allowDataUriInImg: true
  })
  const tempDiv = document.createElement('div')

  tempDiv.innerHTML =
    DOMPurify.sanitize(safeHtml, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
      ALLOW_DATA_ATTR: true
    }) || ''

  const requiresFieldConfig = slot !== null || hasDocxFieldTokens(html)
  const ctx = newContext(
    typography,
    `${kind}-${referenceType}-${index}`,
    buildState,
    requiresFieldConfig ? buildFieldConfig(title, formatting, page) : undefined
  )
  const bodyParts: string[] = []

  if (slot && ctx.fieldConfig) {
    bodyParts.push(buildPageNumberSlotParagraph(slot, ctx.fieldConfig))
  }

  await convertBlock(tempDiv, bodyParts, ctx)

  if (bodyParts.length === 0) {
    return null
  }

  const fileName = `${kind}${index}.xml`
  return {
    kind,
    referenceType,
    relationshipId: `rId${kind[0].toUpperCase()}${kind.slice(1)}${index}`,
    targetPath: fileName,
    zipPath: `word/${fileName}`,
    relsZipPath: `word/_rels/${fileName}.rels`,
    xml: buildHeaderFooterPartXml(kind, bodyParts.join('\n')),
    ctx
  }
}

async function buildHeaderFooterParts(
  title: string,
  formatting: DocumentFormatting | null | undefined,
  typography: DocxTypographySettings,
  buildState: DocxBuildState
): Promise<DocxHeaderFooterResult> {
  const pages = getPagesConfigFromFormatting(formatting)
  const hasManagedPageNumbers = Boolean(pages.pageNumberRegion && pages.pageNumberAlignment)
  const useEvenAndOddHeaders =
    pages.differentOddEven || (hasManagedPageNumbers && ['inside', 'outside'].includes(pages.pageNumberAlignment ?? ''))
  const useDifferentFirstPage =
    pages.differentFirstPage || (hasManagedPageNumbers && pages.pageNumberShowOnFirstPage === false)
  const representativeDefaultPage = useEvenAndOddHeaders
    ? useDifferentFirstPage
      ? 3
      : 1
    : useDifferentFirstPage
      ? 2
      : 1
  const parts: DocxHeaderFooterPart[] = []
  let headerIndex = 1
  let footerIndex = 1
  let usesPageNumberFields = false

  for (const kind of ['header', 'footer'] as const) {
    const partCandidates: Array<{ referenceType: DocxHeaderFooterReferenceType; page: number }> = []

    if (useDifferentFirstPage) {
      partCandidates.push({ referenceType: 'first', page: 1 })
    }

    partCandidates.push({ referenceType: 'default', page: representativeDefaultPage })

    if (useEvenAndOddHeaders) {
      partCandidates.push({ referenceType: 'even', page: 2 })
    }

    for (const candidate of partCandidates) {
      const html = resolveHeaderFooterHtmlForPage(kind, formatting, candidate.page)
      const slot = resolveDocxPageNumberSlot(formatting, kind, candidate.page)
      if (slot || hasDocxFieldTokens(html)) {
        usesPageNumberFields = true
      }

      const part = await buildHeaderFooterPart({
        kind,
        referenceType: candidate.referenceType,
        page: candidate.page,
        title,
        html,
        slot,
        formatting,
        typography,
        buildState,
        index: kind === 'header' ? headerIndex : footerIndex
      })

      if (kind === 'header') {
        headerIndex += 1
      } else {
        footerIndex += 1
      }

      if (part) {
        parts.push(part)
      }
    }
  }

  return {
    parts,
    useDifferentFirstPage,
    useEvenAndOddHeaders,
    pgNumTypeXml: usesPageNumberFields ? buildPgNumTypeXml(formatting) : ''
  }
}

function buildDocumentXml(
  bodyXml: string,
  formatting?: DocumentFormatting | null,
  headerFooterResult?: DocxHeaderFooterResult
): string {
  const pageSetup = getDocxPageSetupFromFormatting(formatting)
  const pageSizeXml =
    pageSetup.orientation === 'landscape'
      ? `<w:pgSz w:w="${pageSetup.pageWidthTwips}" w:h="${pageSetup.pageHeightTwips}" w:orient="landscape"/>`
      : `<w:pgSz w:w="${pageSetup.pageWidthTwips}" w:h="${pageSetup.pageHeightTwips}"/>`
  const pageMarginXml = `<w:pgMar w:top="${pageSetup.marginTopTwips}" w:right="${pageSetup.marginRightTwips}" w:bottom="${pageSetup.marginBottomTwips}" w:left="${pageSetup.marginLeftTwips}" w:header="${pageSetup.headerDistanceTwips}" w:footer="${pageSetup.footerDistanceTwips}" w:gutter="0"/>`
  const headerFooterRefsXml =
    headerFooterResult?.parts
      .map(part => `<w:${part.kind}Reference w:type="${part.referenceType}" r:id="${part.relationshipId}"/>`)
      .join('') ?? ''
  const titlePageXml = headerFooterResult?.useDifferentFirstPage ? '<w:titlePg/>' : ''
  const pgNumTypeXml = headerFooterResult?.pgNumTypeXml ?? ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml">
<w:body>
${bodyXml}
<w:sectPr>${headerFooterRefsXml}${titlePageXml}${pgNumTypeXml}${pageSizeXml}${pageMarginXml}</w:sectPr>
</w:body>
</w:document>`
}

function buildNumberingXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u2022"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u25E6"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`
}

function buildStylesXml(formatting?: DocumentFormatting | null, tocSettings?: DocxTocStyleSettings): string {
  const typography = resolveDocxTypographySettings(formatting)
  const bodyFontProps = buildFontRunProps(typography.fontFamily, typography.bodyFontHalfPoints)
  const h1FontProps = buildFontRunProps(typography.fontFamily, 48)
  const h2FontProps = buildFontRunProps(typography.fontFamily, 36)
  const h3FontProps = buildFontRunProps(typography.fontFamily, 27)
  const h4FontProps = buildFontRunProps(typography.fontFamily, 24)
  const resolvedTocSettings = tocSettings ?? {
    styles: DEFAULT_DOCUMENT_TOC_STYLES,
    showPageNumbers: true,
    tabLeader: 'dot'
  }
  const tocStylesXml = [
    buildTocHeadingStyleXml(resolvedTocSettings),
    buildTocParagraphStyleXml('TOC1', 1, resolvedTocSettings),
    buildTocParagraphStyleXml('TOC2', 2, resolvedTocSettings),
    buildTocParagraphStyleXml('TOC3', 3, resolvedTocSettings),
    buildTocParagraphStyleXml('TOC4', 4, resolvedTocSettings),
    buildTocParagraphStyleXml('TOC5', 5, resolvedTocSettings),
    buildTocParagraphStyleXml('TOC6', 6, resolvedTocSettings)
  ].join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="0" w:line="${typography.bodyLineSpacing}" w:lineRule="auto"/></w:pPr><w:rPr>${bodyFontProps}</w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:spacing w:before="0" w:after="320" w:line="288" w:lineRule="auto"/></w:pPr><w:rPr>${h1FontProps}<w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="400" w:after="240" w:line="312" w:lineRule="auto"/></w:pPr><w:rPr>${h2FontProps}<w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:spacing w:before="320" w:after="200" w:line="336" w:lineRule="auto"/></w:pPr><w:rPr>${h3FontProps}<w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:pPr><w:spacing w:before="280" w:after="160" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr>${h4FontProps}<w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading5"><w:name w:val="heading 5"/><w:pPr><w:spacing w:before="280" w:after="160" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr>${h4FontProps}<w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading6"><w:name w:val="heading 6"/><w:pPr><w:spacing w:before="280" w:after="160" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr>${h4FontProps}<w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:ind w:left="720"/><w:spacing w:before="0" w:after="0" w:line="${typography.bodyLineSpacing}" w:lineRule="auto"/></w:pPr><w:rPr>${bodyFontProps}</w:rPr></w:style>
${tocStylesXml}
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0066CC"/><w:u w:val="single"/></w:rPr></w:style>
</w:styles>`
}

function buildRelsXml(ctx: DocxBuildContext, fixedRelationships: string[] = []): string {
  const imageRels = ctx.images
    .map(
      img =>
        `<Relationship Id="${img.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${img.fileName}"/>`
    )
    .join('\n')
  const linkRels = ctx.hyperlinks
    .map(
      lnk =>
        `<Relationship Id="${lnk.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(lnk.url)}" TargetMode="External"/>`
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${fixedRelationships.join('\n')}
${imageRels}
${linkRels}
</Relationships>`
}

function buildContentTypesXml(
  contexts: readonly DocxBuildContext[],
  headerFooterParts: readonly DocxHeaderFooterPart[]
): string {
  const exts = new Set(contexts.flatMap(ctx => ctx.images.map(img => img.fileName.split('.').pop()!)))
  const extTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml'
  }
  const defaults = Array.from(exts)
    .map(ext => `<Default Extension="${ext}" ContentType="${extTypes[ext] || 'application/octet-stream'}"/>`)
    .join('\n')
  const partOverrides = headerFooterParts
    .map(part => {
      const contentType =
        part.kind === 'header'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml'

      return `<Override PartName="/${part.zipPath}" ContentType="${contentType}"/>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${defaults}
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
${partOverrides}
</Types>`
}

/**
 * Build a proper .docx (Office Open XML) Blob from sanitized HTML content.
 */
export async function buildDocxBlob(
  title: string,
  htmlContent: string,
  formatting?: DocumentFormatting | null
): Promise<Blob> {
  const typography = resolveDocxTypographySettings(formatting)
  const buildState: DocxBuildState = { nextDocPrId: 1 }
  const safeHtml = sanitizeHtmlForExport(htmlContent, {
    preserveBlockSpacing: true,
    preserveTextStyles: true,
    preserveVisualStyles: true,
    allowDataUriInImg: true
  })
  const ctx = newContext(typography, 'body', buildState)

  const tempDiv = document.createElement('div')
  // CWE-79: use a recognized sanitizer directly at the sink for SAST tools.
  tempDiv.innerHTML =
    DOMPurify.sanitize(safeHtml, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
      ALLOW_DATA_ATTR: true
    }) || ''
  const bodyParts: string[] = []
  await convertBlock(tempDiv, bodyParts, ctx)
  if (bodyParts.length === 0) bodyParts.push('<w:p/>')
  const tocSettings = resolveDocxTocStyleSettings(tempDiv)
  const headerFooterResult = await buildHeaderFooterParts(title, formatting, typography, buildState)
  const allContexts = [ctx, ...headerFooterResult.parts.map(part => part.ctx)]
  const documentRelationships = [
    '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
    ...headerFooterResult.parts.map(
      part =>
        `<Relationship Id="${part.relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${part.kind}" Target="${part.targetPath}"/>`
    )
  ]

  const zip = createJSZip()
  zip.file('[Content_Types].xml', buildContentTypesXml(allContexts, headerFooterResult.parts))
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  )
  zip.file('word/document.xml', buildDocumentXml(bodyParts.join('\n'), formatting, headerFooterResult))
  zip.file('word/styles.xml', buildStylesXml(formatting, tocSettings))
  zip.file('word/numbering.xml', buildNumberingXml())
  zip.file('word/settings.xml', buildSettingsXml(headerFooterResult.useEvenAndOddHeaders))
  zip.file('word/_rels/document.xml.rels', buildRelsXml(ctx, documentRelationships))

  headerFooterResult.parts.forEach(part => {
    zip.file(part.zipPath, part.xml)
    if (part.ctx.images.length > 0 || part.ctx.hyperlinks.length > 0) {
      zip.file(part.relsZipPath, buildRelsXml(part.ctx))
    }
  })

  allContexts.forEach(partCtx => {
    for (const img of partCtx.images) {
      zip.file(`word/media/${img.fileName}`, img.data)
    }
  })

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
}

/**
 * Sanitize filename for download.
 */
export function sanitizeDocxFilename(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 200) || 'document'
  )
}
