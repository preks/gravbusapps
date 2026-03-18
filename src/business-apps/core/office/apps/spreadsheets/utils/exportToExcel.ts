/**
 * exportToExcel
 *
 * Converts a live Univer workbook snapshot into a properly formatted .xlsx file
 * using ExcelJS, preserving cell values, formulas, font styles, colors,
 * fills, borders, alignments, number formats, column widths, row heights, and merges.
 */

import ExcelJS from 'exceljs'

// ────────────────────────────────────────────────────────────────────────────
// Internal types mirroring the Univer snapshot shape
// ────────────────────────────────────────────────────────────────────────────

interface UniverBorderSide {
  s?: number // border style id (0=none, 1=thin, 2=hair, ...)
  cl?: { rgb?: string }
}

interface UniverStyle {
  bl?: number // bold
  it?: number // italic
  ul?: { s?: number } // underline
  st?: { s?: number } // strikethrough
  bg?: { rgb?: string } // background fill
  cl?: { rgb?: string } // font color
  fs?: number // font size
  ff?: string // font family
  ht?: number // horizontal align  1=left 2=center 3=right
  vt?: number // vertical align    1=top  2=middle 3=bottom
  tb?: number // text wrap         1=no   2=wrap
  n?: { pattern?: string } // number format
  bd?: {
    t?: UniverBorderSide
    b?: UniverBorderSide
    l?: UniverBorderSide
    r?: UniverBorderSide
  }
}

interface UniverCell {
  v?: string | number | boolean | null
  f?: string
  m?: string // display/formatted text
  s?: string | UniverStyle // style id or inline style
  t?: number
}

interface UniverMerge {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

interface UniverWorksheet {
  id?: string
  name?: string
  cellData?: Record<string, Record<string, UniverCell>>
  rowCount?: number
  columnCount?: number
  columnData?: Record<string, { w?: number; hd?: number }>
  rowData?: Record<string, { h?: number; hd?: number }>
  mergeData?: UniverMerge[]
}

interface UniverSnapshot {
  id?: string
  name?: string
  sheetOrder?: string[]
  sheets?: Record<string, UniverWorksheet>
  styles?: Record<string, UniverStyle>
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Normalise a 6-char hex to ARGB (full opacity). */
function toArgb(rgb: string | undefined): string | undefined {
  if (!rgb) return undefined
  const hex = rgb.replaceAll('#', '')
  if (hex.length === 6) return `FF${hex.toUpperCase()}`
  if (hex.length === 8) return hex.toUpperCase()
  return undefined
}

const H_ALIGN: Record<number, ExcelJS.Alignment['horizontal']> = {
  1: 'left',
  2: 'center',
  3: 'right'
}

const V_ALIGN: Record<number, ExcelJS.Alignment['vertical']> = {
  1: 'top',
  2: 'middle',
  3: 'bottom'
}

/**
 * Map a Univer border-style number to an ExcelJS border-style string.
 * Univer uses: 1=thin, 2=hair, 3=dotted, 4=dashed, 5=dashDot,
 *              6=dashDotDot, 7=slantDashDot, 8=medium, 9=mediumDashed,
 *              10=mediumDashDot, 11=mediumDashDotDot, 12=thick, 13=double
 */
function toBorderStyle(s: number | undefined): ExcelJS.BorderStyle | undefined {
  if (!s) return undefined
  const map: Record<number, ExcelJS.BorderStyle> = {
    1: 'thin',
    2: 'hair',
    3: 'dotted',
    4: 'dashed',
    5: 'dashDot',
    6: 'dashDotDot',
    7: 'slantDashDot',
    8: 'medium',
    9: 'mediumDashed',
    10: 'mediumDashDot',
    11: 'mediumDashDotDot',
    12: 'thick',
    13: 'double'
  }
  return map[s]
}

function buildFont(style: UniverStyle): ExcelJS.Font | undefined {
  const font: Partial<ExcelJS.Font> = {}
  if (style.bl) font.bold = true
  if (style.it) font.italic = true
  if (style.ul?.s) font.underline = true
  if (style.st?.s) font.strike = true
  if (style.fs) font.size = style.fs
  if (style.ff) font.name = style.ff
  const fgColor = toArgb(style.cl?.rgb)
  if (fgColor) font.color = { argb: fgColor }
  return Object.keys(font).length ? (font as ExcelJS.Font) : undefined
}

function buildAlignment(style: UniverStyle): ExcelJS.Alignment | undefined {
  const alignment: Partial<ExcelJS.Alignment> = {}
  if (style.ht !== undefined) alignment.horizontal = H_ALIGN[style.ht]
  if (style.vt !== undefined) alignment.vertical = V_ALIGN[style.vt]
  if (style.tb === 2) alignment.wrapText = true
  return Object.keys(alignment).length ? (alignment as ExcelJS.Alignment) : undefined
}

function buildBorderSide(side: UniverBorderSide | undefined): ExcelJS.Border | undefined {
  if (!side) return undefined
  const borderStyle = toBorderStyle(side.s)
  if (!borderStyle) return undefined

  const borderDef: Partial<ExcelJS.Border> = { style: borderStyle }
  const borderColor = toArgb(side.cl?.rgb)
  if (borderColor) borderDef.color = { argb: borderColor }
  return borderDef as ExcelJS.Border
}

function buildBorders(style: UniverStyle): ExcelJS.Borders | undefined {
  if (!style.bd) return undefined
  const border: Partial<ExcelJS.Borders> = {}
  const top = buildBorderSide(style.bd.t)
  if (top) border.top = top
  const bottom = buildBorderSide(style.bd.b)
  if (bottom) border.bottom = bottom
  const left = buildBorderSide(style.bd.l)
  if (left) border.left = left
  const right = buildBorderSide(style.bd.r)
  if (right) border.right = right
  return Object.keys(border).length ? (border as ExcelJS.Borders) : undefined
}

function applyStyle(cell: ExcelJS.Cell, style: UniverStyle | undefined): void {
  if (!style) return

  const font = buildFont(style)
  if (font) cell.font = font

  const bgArgb = toArgb(style.bg?.rgb)
  if (bgArgb) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgArgb }
    }
  }

  const alignment = buildAlignment(style)
  if (alignment) cell.alignment = alignment

  if (style.n?.pattern) cell.numFmt = style.n.pattern

  const borders = buildBorders(style)
  if (borders) cell.border = borders
}

function applyColumnMetadata(ws: ExcelJS.Worksheet, columnData: UniverWorksheet['columnData']): void {
  if (!columnData) return
  for (const [colIdxStr, colMeta] of Object.entries(columnData)) {
    const colIdx = Number(colIdxStr) + 1
    if (typeof colMeta.w === 'number' && colMeta.w > 0) ws.getColumn(colIdx).width = Math.max(colMeta.w / 7, 4)
    if (colMeta.hd) ws.getColumn(colIdx).hidden = true
  }
}

function applyRowMetadata(ws: ExcelJS.Worksheet, rowData: UniverWorksheet['rowData']): void {
  if (!rowData) return
  for (const [rowIdxStr, rowMeta] of Object.entries(rowData)) {
    const rowIdx = Number(rowIdxStr) + 1
    if (typeof rowMeta.h === 'number' && rowMeta.h > 0) ws.getRow(rowIdx).height = rowMeta.h
    if (rowMeta.hd) ws.getRow(rowIdx).hidden = true
  }
}

function toExcelCellValue(univerCell: UniverCell): ExcelJS.CellValue | undefined {
  if (univerCell.f) {
    const result = univerCell.v ?? ''
    return {
      formula: univerCell.f.startsWith('=') ? univerCell.f.slice(1) : univerCell.f,
      result: typeof result === 'number' ? result : String(result)
    }
  }
  if (univerCell.v !== undefined && univerCell.v !== null) return univerCell.v
  return undefined
}

function resolveCellStyle(univerCell: UniverCell, globalStyles: Record<string, UniverStyle>): UniverStyle | undefined {
  if (typeof univerCell.s === 'string') return globalStyles[univerCell.s]
  if (univerCell.s && typeof univerCell.s === 'object') return univerCell.s as UniverStyle
  return undefined
}

function applyCellDataToWorksheet(
  ws: ExcelJS.Worksheet,
  cellData: UniverWorksheet['cellData'],
  globalStyles: Record<string, UniverStyle>
): void {
  const safeCellData = cellData ?? {}
  for (const [rowIdxStr, rowCells] of Object.entries(safeCellData)) {
    const rowIdx = Number(rowIdxStr) + 1
    if (Number.isNaN(rowIdx) || !rowCells) continue

    for (const [colIdxStr, univerCell] of Object.entries(rowCells)) {
      const colIdx = Number(colIdxStr) + 1
      if (Number.isNaN(colIdx) || !univerCell) continue

      const cell = ws.getCell(rowIdx, colIdx)
      const value = toExcelCellValue(univerCell)
      if (value !== undefined) cell.value = value

      const style = resolveCellStyle(univerCell, globalStyles)
      applyStyle(cell, style)
    }
  }
}

function applyMerges(ws: ExcelJS.Worksheet, mergeData: UniverWorksheet['mergeData']): void {
  if (!Array.isArray(mergeData)) return
  for (const merge of mergeData) {
    try {
      ws.mergeCells(merge.startRow + 1, merge.startColumn + 1, merge.endRow + 1, merge.endColumn + 1)
    } catch {
      // ignore overlapping / invalid merge ranges
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Converts a Univer workbook snapshot to an xlsx Blob.
 *
 * @param snapshot  The raw workbook snapshot returned by `getWorkbookSnapshot()`.
 * @param filename  Base filename (without extension) for the worksheet tab names.
 */
export async function snapshotToXlsxBlob(snapshot: Record<string, unknown>, filename = 'spreadsheet'): Promise<Blob> {
  const wb = snapshot as unknown as UniverSnapshot
  const globalStyles = wb.styles ?? {}

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Newwork'
  workbook.created = new Date()

  const sheetOrder: string[] = Array.isArray(wb.sheetOrder) ? wb.sheetOrder : Object.keys(wb.sheets ?? {})

  for (const sheetId of sheetOrder) {
    const sheetData = wb.sheets?.[sheetId]
    if (!sheetData) continue

    const ws = workbook.addWorksheet(sheetData.name ?? filename)

    applyColumnMetadata(ws, sheetData.columnData)
    applyRowMetadata(ws, sheetData.rowData)
    applyCellDataToWorksheet(ws, sheetData.cellData, globalStyles)
    applyMerges(ws, sheetData.mergeData)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

/**
 * Trigger a browser download of the xlsx file built from a Univer snapshot.
 */
export async function exportSnapshotAsXlsx(snapshot: Record<string, unknown>, filename = 'spreadsheet'): Promise<void> {
  const blob = await snapshotToXlsxBlob(snapshot, filename)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
