/**
 * Univer Data Adapter
 *
 * Converts between our spreadsheet format (SpreadsheetSheet, columns, rows)
 * and Univer's workbook/sheet/cell model for initial load and callbacks.
 */

import type { SpreadsheetSheet, SpreadsheetColumn, SpreadsheetMergeRange } from '../types/spreadsheet'
import { columnIndexToLetter } from '../core'
import { getViewerRowVisualIndex } from './spreadsheetPeerRowHydration'
import { readSpreadsheetRowCellValue } from './spreadsheetRowCellValue'
import { resolveBackendRowIdForViewerRow, isSpreadsheetBackendRowUuid } from './spreadsheetRowIdentity'
import { isPlaceholderColumnTitle } from './trackingColumns'
import { tryStructuredClone } from './tryStructuredClone'

/** Conversion context for mapping row/column indices to our rowId/columnId/name (used by collaboration and persist). */
export interface ConversionContext {
  columnIdToIndex: Map<string, number>
  columnIndexToId: Map<number, string>
  columnIndexToName: Map<number, string>
  rowIdToIndex: Map<string, number>
  rowIndexToId: Map<number, string>
  excelColToIndex: Map<string, number>
  indexToExcelCol: Map<number, string>
}

function indexToExcelColumn(index: number): string {
  return columnIndexToLetter(index)
}

/** Univer cell data (minimal shape for value) */
export interface UniverCellData {
  v?: string | number | boolean | null
  f?: string
  s?: unknown
  t?: number
  [key: string]: unknown
}

/** Univer sheet cellData: row index -> col index -> cell */
export type UniverSheetCellData = Record<number, Record<number, UniverCellData>>

/** Univer worksheet snapshot */
export interface UniverWorksheetData {
  id: string
  name: string
  hidden?: number
  cellData: UniverSheetCellData
  mergeData?: SpreadsheetMergeRange[]
  rowCount?: number
  columnCount?: number
  defaultColumnWidth?: number
  defaultRowHeight?: number
  columnData?: Record<number, { w?: number; hd?: number }>
  rowData?: Record<number, { h?: number; hd?: number }>
  rowHeader?: { width?: number; hidden?: number }
  columnHeader?: { height?: number; hidden?: number }
}

/** Univer workbook snapshot for createWorkbook() */
export interface UniverWorkbookSnapshot {
  id: string
  name: string
  sheetOrder: string[]
  appVersion?: string
  locale?: string
  styles?: Record<string, unknown>
  sheets: Record<string, UniverWorksheetData>
}

function toUniverBooleanNumber(value: unknown): 0 | 1 | undefined {
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number') return value !== 0 ? 1 : 0
  return undefined
}

function hexToRgb(hex: string, fallback: string): string {
  const cleaned = hex.replaceAll('#', '')
  if (cleaned.length === 6 || cleaned.length === 8) return `#${cleaned}`
  return fallback
}

/** Map our parsed style (from Excel import) to Univer inline style */
function toUniverInlineStyle(obj: Record<string, unknown>): Record<string, unknown> | undefined {
  const style: Record<string, unknown> = {}
  if (obj.bg && typeof obj.bg === 'string') {
    style.bg = { rgb: hexToRgb(obj.bg, obj.bg) }
  }
  if (obj.fc && typeof obj.fc === 'string') {
    style.cl = { rgb: hexToRgb(obj.fc, obj.fc) }
  }
  if (obj.bl) style.bl = 1
  if (obj.it) style.it = 1
  if (obj.ff && typeof obj.ff === 'string') style.ff = obj.ff
  if (typeof obj.fs === 'number') style.fs = obj.fs
  if (typeof obj.ht === 'number') style.ht = obj.ht + 1
  if (typeof obj.vt === 'number') style.vt = obj.vt + 1
  if (obj.tb === 2) style.tb = 2
  if (Object.keys(style).length === 0) return undefined
  return style
}

function normalizeColumnToken(value: string): string {
  return value.toLowerCase()
}

function getRowIdentityCandidates(row: Record<string, unknown>): string[] {
  return Array.from(
    new Set([row._id, row.id, row._rowUuid].map(value => (typeof value === 'string' ? value : '')).filter(Boolean))
  )
}

function isAvatarColumn(column: SpreadsheetColumn): boolean {
  const normalizedName = normalizeColumnToken(String(column.name || ''))
  const normalizedId = normalizeColumnToken(String(column.id || ''))
  return (
    normalizedName === '_recipient_avatar' ||
    normalizedId === '_recipient_avatar' ||
    normalizedName === 'recipient_avatar' ||
    normalizedId === 'recipient_avatar'
  )
}

function getInitials(value: string): string {
  const normalized = value.trim()
  if (!normalized) return 'U'
  const parts = normalized.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function buildAvatarPlaceholderUrl(row: Record<string, unknown>): string | null {
  const fromName = row._recipient_name ?? row.recipient_name
  const fromEmail = row._recipient_email ?? row.recipient_email
  const base =
    (typeof fromName === 'string' && fromName.trim()) || (typeof fromEmail === 'string' && fromEmail.trim()) || ''
  if (!base) return null
  const initials = getInitials(base)
  const params = new URLSearchParams({
    name: initials,
    size: '64',
    rounded: 'true',
    background: 'E5E7EB',
    color: '374151',
    format: 'png'
  })
  return `https://ui-avatars.com/api/?${params.toString()}`
}

function isLinkColumn(column: SpreadsheetColumn): boolean {
  const normalizedName = normalizeColumnToken(String(column.name || ''))
  const normalizedId = normalizeColumnToken(String(column.id || ''))
  return (
    normalizedName === '_copy_link' ||
    normalizedId === '_copy_link' ||
    normalizedName === 'copy_link' ||
    normalizedId === 'copy_link'
  )
}

function extractObjectValue(obj: Record<string, unknown>): string {
  if (typeof obj.v === 'string') return obj.v
  if (typeof obj.m === 'string') return obj.m
  if (typeof obj.url === 'string') return obj.url
  if (typeof obj.src === 'string') return obj.src
  return ''
}

function toFormulaCell(obj: Record<string, unknown>): UniverCellData | null {
  const cell: UniverCellData = {}
  if (obj.f && typeof obj.f === 'string') cell.f = obj.f.startsWith('=') ? obj.f : `=${obj.f}`
  const val = obj.v ?? obj.m
  if (typeof val === 'number' && !Number.isFinite(val)) {
    cell.v = null
  } else if (val !== undefined && val !== null) {
    cell.v = val
  } else if (obj.m !== undefined) cell.v = obj.m
  const univerStyle = toUniverInlineStyle(obj)
  if (univerStyle) cell.s = univerStyle
  return Object.keys(cell).length > 0 ? cell : null
}

function toImageUrl(raw: string): string {
  const trimmed = raw.trim()
  const isHttpImage = /^https?:\/\//i.test(trimmed)
  const isDataImage = /^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)
  const looksLikeRawBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) && trimmed.length > 100
  if (isHttpImage || isDataImage) return trimmed
  if (looksLikeRawBase64) return `data:image/jpeg;base64,${trimmed}`
  return ''
}

type ObjectRawResolution = { type: 'cell'; cell: UniverCellData } | { type: 'raw'; raw: unknown }

function isMediaOrLinkColumn(column: SpreadsheetColumn, avatarColumn: boolean, linkColumn: boolean): boolean {
  return column.type === 'image' || avatarColumn || column.type === 'url' || linkColumn
}

function resolveObjectRaw(
  raw: unknown,
  column: SpreadsheetColumn,
  avatarColumn: boolean,
  linkColumn: boolean
): ObjectRawResolution {
  if (Array.isArray(raw)) {
    return { type: 'cell', cell: { v: raw } }
  }

  const obj = raw as Record<string, unknown>
  const objectValue = extractObjectValue(obj)
  if (isMediaOrLinkColumn(column, avatarColumn, linkColumn) && objectValue) {
    return { type: 'raw', raw: objectValue }
  }

  return { type: 'cell', cell: toFormulaCell(obj) ?? (obj as UniverCellData) }
}

function toHyperlinkCell(raw: string, column: SpreadsheetColumn, linkColumn: boolean): UniverCellData | null {
  if (column.type !== 'url' && !linkColumn) {
    return null
  }
  if (!/^https?:\/\//i.test(raw)) {
    return null
  }
  const safeUrl = raw.replaceAll('"', '""')
  return { f: `=HYPERLINK("${safeUrl}","${getViewResponseLabel().replaceAll('"', '""')}")` }
}

function getViewResponseLabel(): string {
  const locale =
    (typeof document !== 'undefined' && document.documentElement.lang) || globalThis.navigator?.language || 'en-US'
  if (locale.startsWith('de')) return 'Antwort anzeigen'
  if (locale.startsWith('ro')) return 'Vezi răspunsul'
  return 'View Response'
}

function toImageCell(raw: string, column: SpreadsheetColumn, avatarColumn: boolean): UniverCellData | null {
  if (column.type !== 'image' && !avatarColumn) {
    return null
  }

  const imageUrl = toImageUrl(raw)
  if (!imageUrl) {
    return null
  }

  const safeUrl = imageUrl.replaceAll('"', '""')
  if (avatarColumn) {
    return { f: `=IMAGE("${safeUrl}", "", 3, 32, 32)` }
  }
  return { f: `=IMAGE("${safeUrl}")` }
}

function toUniverCellData(raw: unknown, column: SpreadsheetColumn): UniverCellData | null {
  if (raw === undefined || raw === null || raw === '') return null
  const avatarColumn = isAvatarColumn(column)
  const linkColumn = isLinkColumn(column)

  if (typeof raw === 'object') {
    const resolved = resolveObjectRaw(raw, column, avatarColumn, linkColumn)
    if (resolved.type === 'cell') {
      return resolved.cell
    }
    raw = resolved.raw
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    const hyperlinkCell = toHyperlinkCell(trimmed, column, linkColumn)
    if (hyperlinkCell) {
      return hyperlinkCell
    }

    const imageCell = toImageCell(trimmed, column, avatarColumn)
    if (imageCell) {
      return imageCell
    }
  }

  if (typeof raw === 'number' && !Number.isFinite(raw)) {
    return null
  }

  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return { v: raw }
  }
  return null
}

const DEFAULT_MIN_ROWS = 1000
const UNIVER_DEFAULT_COL_WIDTH = 73
const UNIVER_DEFAULT_ROW_HEIGHT = 23
const UNIVER_ROW_HEADER_WIDTH = 46
const UNIVER_COLUMN_HEADER_HEIGHT = 20
const AVATAR_COL_WIDTH = 40
const TRACKING_HEADER_WRAP_STYLE = { tb: 2, bl: 1 }

function buildRowCells(
  row: Record<string, unknown>,
  visibleColumns: SpreadsheetColumn[]
): Record<number, UniverCellData> {
  const rowCells: Record<number, UniverCellData> = {}
  const isTrackingHeaderRow = row._isTrackingHeader === true
  for (let colIndex = 0; colIndex < visibleColumns.length; colIndex++) {
    const col = visibleColumns[colIndex]
    const raw = readSpreadsheetRowCellValue(row, col)
    let cell = toUniverCellData(raw, col)
    if (!cell && isAvatarColumn(col)) {
      const placeholderUrl = buildAvatarPlaceholderUrl(row)
      if (placeholderUrl) {
        cell = toUniverCellData(placeholderUrl, col)
      }
    }
    if (!cell) continue
    if (isTrackingHeaderRow) {
      const existingStyle =
        cell.s && typeof cell.s === 'object' ? (cell.s as Record<string, unknown>) : ({} as Record<string, unknown>)
      cell.s = { ...existingStyle, ...TRACKING_HEADER_WRAP_STYLE }
    }
    rowCells[colIndex] = cell
  }
  return rowCells
}

function buildCellData(data: Record<string, unknown>[], visibleColumns: SpreadsheetColumn[]): UniverSheetCellData {
  const cellData: UniverSheetCellData = {}
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const rowCells = buildRowCells(data[rowIndex], visibleColumns)
    if (Object.keys(rowCells).length === 0) continue
    const targetRowIndex = getViewerRowVisualIndex(data[rowIndex], rowIndex)
    cellData[targetRowIndex] = rowCells
  }
  return cellData
}

function normalizeMergeRange(range: unknown): SpreadsheetMergeRange | null {
  if (!range || typeof range !== 'object' || Array.isArray(range)) return null
  const record = range as Partial<SpreadsheetMergeRange>
  const startRow = Number(record.startRow)
  const endRow = Number(record.endRow)
  const startColumn = Number(record.startColumn)
  const endColumn = Number(record.endColumn)
  if (
    !Number.isFinite(startRow) ||
    !Number.isFinite(endRow) ||
    !Number.isFinite(startColumn) ||
    !Number.isFinite(endColumn)
  ) {
    return null
  }
  if (endRow < startRow || endColumn < startColumn) return null
  return {
    startRow: Math.max(0, Math.trunc(startRow)),
    endRow: Math.max(0, Math.trunc(endRow)),
    startColumn: Math.max(0, Math.trunc(startColumn)),
    endColumn: Math.max(0, Math.trunc(endColumn))
  }
}

function buildMergeCoveredCellSet(mergeData: unknown): Set<string> {
  const covered = new Set<string>()
  const ranges = Array.isArray(mergeData) ? mergeData : []
  for (const candidate of ranges) {
    const range = normalizeMergeRange(candidate)
    if (!range) continue
    for (let row = range.startRow; row <= range.endRow; row += 1) {
      for (let col = range.startColumn; col <= range.endColumn; col += 1) {
        if (row === range.startRow && col === range.startColumn) continue
        covered.add(`${row}:${col}`)
      }
    }
  }
  return covered
}

function stripMergeCoveredCellValues(cellData: UniverSheetCellData, mergeData: unknown): UniverSheetCellData {
  const covered = buildMergeCoveredCellSet(mergeData)
  if (covered.size === 0) return cellData
  for (const key of covered) {
    const [rowPart, colPart] = key.split(':')
    const rowIndex = Number(rowPart)
    const colIndex = Number(colPart)
    if (!Number.isFinite(rowIndex) || !Number.isFinite(colIndex)) continue
    const rowCells = cellData[rowIndex] ?? cellData[String(rowIndex) as unknown as number]
    if (!rowCells || typeof rowCells !== 'object') continue
    const cell = rowCells[colIndex] ?? rowCells[String(colIndex) as unknown as number]
    if (!cell) continue
    const formattingOnly = clearSnapshotCellValuePreservingFormatting(cell)
    if (formattingOnly) {
      rowCells[colIndex] = formattingOnly
    } else {
      delete rowCells[colIndex]
    }
    if (Object.keys(rowCells).length === 0) {
      delete cellData[rowIndex]
    }
  }
  return cellData
}

function buildColumnWidths(visibleColumns: SpreadsheetColumn[]): Record<number, { w?: number; hd?: number }> {
  const columnData: Record<number, { w?: number; hd?: number }> = {}
  for (let idx = 0; idx < visibleColumns.length; idx++) {
    const col = visibleColumns[idx]
    let w: number
    if (typeof col.width === 'number' && col.width > 0) w = col.width
    else if (isAvatarColumn(col)) w = AVATAR_COL_WIDTH
    else w = UNIVER_DEFAULT_COL_WIDTH
    columnData[idx] = { w }
  }
  return columnData
}

function buildRowHeights(data: Record<string, unknown>[]): Record<number, { h?: number; hd?: number }> {
  const rowData: Record<number, { h?: number; hd?: number }> = {}
  for (let idx = 0; idx < data.length; idx++) {
    const h = data[idx]._height
    if (typeof h === 'number' && h > 0) rowData[getViewerRowVisualIndex(data[idx], idx)] = { h }
  }
  return rowData
}

function getWorkbookRowCount(data: Record<string, unknown>[]): number {
  const maxVisualRowIndex = data.reduce((max, row, index) => Math.max(max, getViewerRowVisualIndex(row, index)), -1)
  return Math.max(maxVisualRowIndex + 1, data.length, DEFAULT_MIN_ROWS)
}

/**
 * Build Univer workbook snapshot from sheet, data, and columns.
 * Used to initialize Univer with our current sheet data.
 */
export function buildWorkbookSnapshot(
  sheet: SpreadsheetSheet,
  data: Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): UniverWorkbookSnapshot {
  const visibleColumns = columns.filter(c => c.isVisible !== false)
  const mergeData = Array.isArray(sheet.settings.mergeData) ? sheet.settings.mergeData : undefined
  const cellData = stripMergeCoveredCellValues(buildCellData(data, visibleColumns), mergeData)
  const columnData = buildColumnWidths(visibleColumns)
  const rowData = buildRowHeights(data)

  const worksheet: UniverWorksheetData = {
    id: sheet.id,
    name: sheet.name,
    hidden: sheet.hidden === true ? 1 : 0,
    cellData,
    mergeData,
    rowCount: getWorkbookRowCount(data),
    columnCount: Math.max(visibleColumns.length, 1),
    defaultColumnWidth: UNIVER_DEFAULT_COL_WIDTH,
    defaultRowHeight: UNIVER_DEFAULT_ROW_HEIGHT,
    columnData: Object.keys(columnData).length > 0 ? columnData : undefined,
    rowData: Object.keys(rowData).length > 0 ? rowData : undefined,
    rowHeader: { width: UNIVER_ROW_HEADER_WIDTH },
    columnHeader: { height: UNIVER_COLUMN_HEADER_HEIGHT }
  }

  return {
    id: `workbook-${sheet.id}`,
    name: sheet.name,
    sheetOrder: [sheet.id],
    appVersion: '0.15.0',
    locale: 'en-US',
    sheets: {
      [sheet.id]: worksheet
    }
  }
}

function cloneWorkbookSnapshotJson(workbookSnapshot: Record<string, unknown>): Record<string, unknown> {
  return tryStructuredClone(workbookSnapshot) ?? workbookSnapshot
}

function getWorksheetFromWorkbookSnapshot(
  workbookSnapshot: Record<string, unknown>,
  sheetId: string
): Record<string, unknown> | undefined {
  const sheets = workbookSnapshot.sheets as Record<string, Record<string, unknown>> | undefined
  if (!sheets || typeof sheets !== 'object') return undefined
  if (sheets[sheetId] != null) return sheets[sheetId] as Record<string, unknown>
  return Object.values(sheets).find(worksheet => String(worksheet?.id ?? '') === sheetId) as
    | Record<string, unknown>
    | undefined
}

/** Heuristic: how much formatting exists (workbook `styles` + per-cell `s` refs) for bootstrap fallback. */
export function workbookFormattingRichnessScore(snapshot: Record<string, unknown>, sheetId: string): number {
  if (!snapshot || typeof snapshot !== 'object') return 0
  const styles = snapshot.styles as Record<string, unknown> | undefined
  let score = 0
  if (styles && typeof styles === 'object') {
    score += Object.keys(styles).length
  }
  const worksheet = getWorksheetFromWorkbookSnapshot(snapshot, sheetId)
  if (!worksheet) return score
  const cellData = worksheet.cellData as UniverSheetCellData | undefined
  if (!cellData || typeof cellData !== 'object') return score
  for (const rowKey of Object.keys(cellData)) {
    const row = cellData[rowKey] ?? cellData[Number(rowKey)]
    if (!row || typeof row !== 'object') continue
    for (const colKey of Object.keys(row)) {
      const cell = (row as Record<string, UniverCellData | undefined>)[colKey]
      if (!cell || typeof cell !== 'object') continue
      if (cell.s != null && cell.s !== '') score += 1
    }
  }
  return score
}

/**
 * Copy Univer formatting (workbook `styles` + missing cell `s` refs) from an older snapshot into `into`.
 * Row-authoritative values in `into` are preserved; donor only fills style ids / style definitions.
 */
export function mergeWorkbookFormattingFromDonor(
  into: Record<string, unknown>,
  donor: Record<string, unknown>,
  sheetId: string
): Record<string, unknown> {
  const base = cloneWorkbookSnapshotJson(into)
  if (!donor || typeof donor !== 'object') return base

  const donorStyles = donor.styles as Record<string, unknown> | undefined
  const baseStyles = (base.styles as Record<string, unknown> | undefined) ?? {}
  if (donorStyles && typeof donorStyles === 'object') {
    base.styles = { ...donorStyles, ...baseStyles }
  }

  const baseWs = getWorksheetFromWorkbookSnapshot(base, sheetId)
  const donorWs = getWorksheetFromWorkbookSnapshot(donor as Record<string, unknown>, sheetId)
  if (!baseWs || !donorWs) return base

  const baseCd = (baseWs.cellData as UniverSheetCellData) ?? {}
  const donorCd = (donorWs.cellData as UniverSheetCellData) ?? {}

  for (const rowKey of Object.keys(baseCd)) {
    const ri = Number(rowKey)
    const baseRow = (baseCd[ri] ?? baseCd[rowKey]) as Record<number, UniverCellData> | undefined
    if (!baseRow || typeof baseRow !== 'object') continue
    const donorRow = (donorCd[ri] ?? donorCd[rowKey]) as Record<number, UniverCellData> | undefined
    if (!donorRow) continue

    for (const colKey of Object.keys(baseRow)) {
      const ci = Number(colKey)
      if (Number.isNaN(ci)) continue
      const bc = baseRow[ci]
      if (!bc || typeof bc !== 'object') continue
      if (bc.s != null && bc.s !== '') continue
      const dc = donorRow[ci]
      if (!dc || typeof dc !== 'object') continue
      if (dc.s == null || dc.s === '') continue
      baseRow[ci] = { ...bc, s: dc.s } as UniverCellData
    }
  }

  return base
}

const comparableUniverCellPayload = (cell: UniverCellData | undefined): string => {
  if (!cell || typeof cell !== 'object') return ''
  if ('v' in cell && cell.v !== undefined) {
    try {
      return `v:${JSON.stringify(cell.v)}`
    } catch {
      return `v:${String(cell.v)}`
    }
  }
  if ('f' in cell && typeof cell.f === 'string' && cell.f.length > 0) {
    return `f:${cell.f}`
  }
  return ''
}

/**
 * Returns true when persisted Univer cellData disagrees with row-authoritative values
 * derived from viewer rows (same rules as {@link buildWorkbookSnapshot}).
 */
export function workbookSnapshotMismatchesViewerRows(
  workbookSnapshot: Record<string, unknown> | null,
  sheetId: string,
  viewerRows: Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): boolean {
  if (!workbookSnapshot || typeof workbookSnapshot !== 'object') return false
  const worksheet = getWorksheetFromWorkbookSnapshot(workbookSnapshot, sheetId)
  if (!worksheet) return false
  const snapCellData = worksheet.cellData as UniverSheetCellData | undefined
  const visibleColumns = columns.filter(c => c.isVisible !== false)
  const authoritative = stripMergeCoveredCellValues(buildCellData(viewerRows, visibleColumns), worksheet.mergeData)
  const rowKeys = new Set<string>([...Object.keys(authoritative), ...Object.keys(snapCellData ?? {})])

  for (const rowKey of rowKeys) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex) || rowIndex < 0) continue
    const authRow = authoritative[rowIndex] ?? {}
    const snapRow = snapCellData?.[rowIndex] ?? snapCellData?.[String(rowIndex) as unknown as number] ?? {}

    for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
      const authCell = (authRow as Record<number, UniverCellData | undefined>)[colIndex]
      const snapCell = (snapRow as Record<number, UniverCellData | undefined>)[colIndex]
      const comparableAuth = comparableUniverCellPayload(authCell)
      const comparableSnapshot = comparableUniverCellPayload(snapCell)
      if (comparableAuth === comparableSnapshot) continue
      if (comparableAuth === '' && comparableSnapshot === '') continue

      return true
    }
  }
  return false
}

function shouldClearSnapshotCellValue(cell: UniverCellData | undefined): boolean {
  return comparableUniverCellPayload(cell) !== ''
}

function clearSnapshotCellValuePreservingFormatting(cell: UniverCellData): UniverCellData | undefined {
  if (!cell || typeof cell !== 'object' || Array.isArray(cell)) return undefined
  const next = { ...cell }
  delete next.v
  delete next.f
  delete next.m
  delete next.p
  delete next.ct
  delete next.si
  delete next.custom
  return Object.keys(next).length > 0 ? next : undefined
}

/**
 * Univer workbook snapshots are visual metadata during bootstrap. Strip scalar/formula/rich-text
 * payloads so cached snapshots cannot resurrect values that no longer exist in canonical rows.
 */
export function stripWorkbookSnapshotValuesPreservingFormatting(
  workbookSnapshot: Record<string, unknown>
): Record<string, unknown> {
  const cloned = cloneWorkbookSnapshotJson(workbookSnapshot)
  const sheets = cloned.sheets as Record<string, Record<string, unknown>> | undefined
  if (!sheets || typeof sheets !== 'object') return cloned

  for (const worksheet of Object.values(sheets)) {
    if (!worksheet || typeof worksheet !== 'object') continue
    const cellData = worksheet.cellData as UniverSheetCellData | undefined
    if (!cellData || typeof cellData !== 'object') continue

    for (const rowKey of Object.keys(cellData)) {
      const rowIndex = Number(rowKey)
      if (Number.isNaN(rowIndex)) continue
      const rowCells = (cellData[rowIndex] ?? cellData[rowKey as unknown as number]) as
        | Record<number, UniverCellData>
        | undefined
      if (!rowCells || typeof rowCells !== 'object') continue

      for (const colKey of Object.keys(rowCells)) {
        const colIndex = Number(colKey)
        if (Number.isNaN(colIndex)) continue
        const cell = rowCells[colIndex] ?? rowCells[colKey as unknown as number]
        const formattingOnly = clearSnapshotCellValuePreservingFormatting(cell)
        if (formattingOnly) {
          rowCells[colIndex] = formattingOnly
        } else {
          delete rowCells[colIndex]
        }
      }

      if (Object.keys(rowCells).length === 0) {
        delete cellData[rowIndex]
      }
    }
  }

  return cloned
}

/**
 * Deep-clones a workbook snapshot and overwrites worksheet cellData with row-authoritative
 * values from viewer rows (preserves merges, dimensions, and other snapshot-only state).
 */
export function mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(
  workbookSnapshot: Record<string, unknown>,
  sheetId: string,
  viewerRows: Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): Record<string, unknown> {
  const cloned = cloneWorkbookSnapshotJson(workbookSnapshot)
  const sheets = cloned.sheets as Record<string, Record<string, unknown>> | undefined
  if (!sheets || typeof sheets !== 'object') return cloned

  let worksheet: Record<string, unknown> | undefined = sheets[sheetId] as Record<string, unknown> | undefined
  if (!worksheet) {
    const syntheticSheet: SpreadsheetSheet = {
      id: sheetId,
      name: '',
      viewType: 'table',
      columns,
      views: [],
      data: [],
      settings: {}
    }
    const built = buildWorkbookSnapshot(syntheticSheet, viewerRows, columns)
    const created = built.sheets[sheetId]
    if (!created) return cloned
    sheets[sheetId] = created as Record<string, unknown>
    worksheet = sheets[sheetId] as Record<string, unknown>
  }
  if (!worksheet) return cloned

  const visibleColumns = columns.filter(c => c.isVisible !== false)
  const authoritative = stripMergeCoveredCellValues(buildCellData(viewerRows, visibleColumns), worksheet.mergeData)
  const priorCellData = (worksheet.cellData as UniverSheetCellData | undefined) ?? {}
  const nextCellData: UniverSheetCellData = { ...priorCellData }
  const rowKeys = new Set<string>([...Object.keys(authoritative), ...Object.keys(priorCellData)])

  for (const rowKey of rowKeys) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex) || rowIndex < 0) continue
    const authRow = authoritative[rowIndex] ?? {}
    const priorRow = (nextCellData[rowIndex] ?? {}) as Record<number, UniverCellData>
    const mergedRow: Record<number, UniverCellData> = { ...priorRow }

    for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
      const authCell = (authRow as Record<number, UniverCellData | undefined>)[colIndex]
      if (authCell) {
        const priorCell = mergedRow[colIndex]
        if (priorCell && typeof priorCell === 'object' && !Array.isArray(priorCell)) {
          mergedRow[colIndex] = {
            ...(priorCell as Record<string, unknown>),
            ...(authCell as object as Record<string, unknown>)
          } as UniverCellData
        } else {
          mergedRow[colIndex] = authCell
        }
        continue
      }

      const priorCell = mergedRow[colIndex]
      if (shouldClearSnapshotCellValue(priorCell)) {
        const styleOnlyCell = clearSnapshotCellValuePreservingFormatting(priorCell)
        if (styleOnlyCell) {
          mergedRow[colIndex] = styleOnlyCell
        } else {
          delete mergedRow[colIndex]
        }
      }
    }

    if (Object.keys(mergedRow).length > 0) {
      for (const existingColKey of Object.keys(mergedRow)) {
        const existingColIndex = Number(existingColKey)
        if (Number.isNaN(existingColIndex) || existingColIndex < visibleColumns.length) continue
        delete mergedRow[existingColIndex]
      }
    }

    if (Object.keys(mergedRow).length > 0) {
      nextCellData[rowIndex] = mergedRow
    } else {
      delete nextCellData[rowIndex]
    }
  }

  const priorRowCount =
    typeof (worksheet as { rowCount?: unknown }).rowCount === 'number' &&
    Number.isFinite((worksheet as { rowCount?: number }).rowCount)
      ? Math.trunc((worksheet as { rowCount: number }).rowCount)
      : 0

  worksheet.cellData = nextCellData
  worksheet.columnCount = Math.max(visibleColumns.length, 1)
  worksheet.rowCount = Math.max(viewerRows.length, priorRowCount, DEFAULT_MIN_ROWS)
  return cloned
}

/**
 * Whether the persisted Univer snapshot's tracking-header row already shows the titles we derive from column config.
 * When this is false, Univer was bootstrapped from a stale snapshot and will ignore corrected row state until the grid remounts.
 */
export function snapshotTrackingHeaderMatchesColumnLabels(
  snapshot: Record<string, unknown>,
  sheetId: string,
  data: Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): boolean {
  const headerIdx = data.findIndex(r => r._isTrackingHeader === true)
  if (headerIdx < 0) return true

  const sheets = snapshot.sheets as Record<string, { cellData?: UniverSheetCellData }> | undefined
  const worksheet = sheets?.[sheetId]
  const cellData = worksheet?.cellData
  if (!cellData || typeof cellData !== 'object') return true

  const visibleColumns = columns.filter(c => c.isVisible !== false)
  const rowCells = cellData[headerIdx] ?? cellData[String(headerIdx)]
  if (!rowCells || typeof rowCells !== 'object') return false

  for (let colIndex = 0; colIndex < visibleColumns.length; colIndex++) {
    const col = visibleColumns[colIndex]
    const expected = (col.label?.trim() || col.name || '').trim()
    if (!expected) continue
    // Placeholder column titles: missing/empty header cells are OK (user cleared unused columns).
    if (isPlaceholderColumnTitle(expected)) {
      continue
    }

    const cell =
      (rowCells as Record<number, UniverCellData>)[colIndex] ??
      (rowCells as Record<string, UniverCellData>)[String(colIndex)]
    if (!cell || typeof cell !== 'object') {
      return false
    }
    const rawV = cell.v
    const rawM = cell.m as string | undefined
    let actual = ''
    if (rawV !== undefined && rawV !== null && rawV !== '') {
      actual = String(rawV).trim()
    } else if (rawM !== undefined && rawM !== null && rawM !== '') {
      actual = String(rawM).trim()
    }
    if (actual !== expected) return false
  }
  return true
}

export function countWorksheetsInUniverSnapshot(snapshot: unknown): number {
  if (!snapshot || typeof snapshot !== 'object') return 0
  const sheets = (snapshot as { sheets?: unknown }).sheets
  if (!sheets || typeof sheets !== 'object') return 0
  return Object.keys(sheets as Record<string, unknown>).length
}

function cloneUniverSnapshotSlice<T>(value: T): T {
  if (value == null) return value
  return tryStructuredClone(value) ?? value
}

export function normalizeWorkbookSnapshotToAppSheets(
  snapshot: Record<string, unknown>,
  appSheets: SpreadsheetSheet[]
): Record<string, unknown> {
  const rawSheets = snapshot.sheets as Record<string, UniverWorksheetData | Record<string, unknown>> | undefined
  if (!rawSheets || Object.keys(rawSheets).length === 0 || appSheets.length === 0) {
    return snapshot
  }

  const alreadyAligned = appSheets.every(sheet => {
    const worksheet = rawSheets[sheet.id]
    if (!worksheet || typeof worksheet !== 'object') return false
    const worksheetId = String((worksheet as { id?: unknown }).id ?? sheet.id)
    const worksheetName = String((worksheet as { name?: unknown }).name ?? sheet.name)
    return worksheetId === sheet.id && worksheetName === sheet.name
  })

  if (alreadyAligned) {
    return snapshot
  }

  const cloned = cloneWorkbookSnapshotJson(snapshot)
  const sourceSheets =
    (cloned.sheets as Record<string, UniverWorksheetData | Record<string, unknown>> | undefined) ?? {}
  if (Object.keys(sourceSheets).length === 0 || appSheets.length === 0) {
    return cloned
  }

  const usedSourceKeys = new Set<string>()
  const nextSheets: Record<string, Record<string, unknown>> = {}
  const sourceEntries = Object.entries(sourceSheets)

  const takeSourceEntry = (
    targetSheet: SpreadsheetSheet
  ): [string, UniverWorksheetData | Record<string, unknown>] | null => {
    const keyed = sourceSheets[targetSheet.id]
    if (keyed && !usedSourceKeys.has(targetSheet.id)) {
      return [targetSheet.id, keyed]
    }

    const byWorksheetId = sourceEntries.find(([sourceKey, worksheet]) => {
      if (usedSourceKeys.has(sourceKey) || !worksheet || typeof worksheet !== 'object') return false
      return String((worksheet as { id?: unknown }).id ?? '') === targetSheet.id
    })
    if (byWorksheetId) return byWorksheetId

    const targetName = String(targetSheet.name ?? '')
      .trim()
      .toLowerCase()
    if (targetName) {
      const byName = sourceEntries.find(([sourceKey, worksheet]) => {
        if (usedSourceKeys.has(sourceKey) || !worksheet || typeof worksheet !== 'object') return false
        return (
          String((worksheet as { name?: unknown }).name ?? '')
            .trim()
            .toLowerCase() === targetName
        )
      })
      if (byName) return byName
    }

    return null
  }

  for (const targetSheet of appSheets) {
    const matched = takeSourceEntry(targetSheet)
    if (!matched) continue
    const [sourceKey, worksheet] = matched
    usedSourceKeys.add(sourceKey)
    nextSheets[targetSheet.id] = {
      ...(cloneUniverSnapshotSlice(worksheet) as Record<string, unknown>),
      id: targetSheet.id,
      name: targetSheet.name
    }
  }

  if (Object.keys(nextSheets).length === 0) {
    return cloned
  }

  cloned.sheets = nextSheets
  cloned.sheetOrder = appSheets.filter(sheet => nextSheets[sheet.id] != null).map(sheet => sheet.id)
  return cloned
}

function pickWorksheetFromSingleSheetBootstrap(
  snapshot: Record<string, unknown>,
  preferSheetId: string
): UniverWorksheetData | null {
  const sheets = snapshot.sheets as Record<string, UniverWorksheetData> | undefined
  if (!sheets || Object.keys(sheets).length === 0) return null

  const keyedMatch = sheets[preferSheetId]
  if (keyedMatch) {
    return cloneUniverSnapshotSlice(keyedMatch)
  }

  const orderedSheetId = Array.isArray(snapshot.sheetOrder) ? String(snapshot.sheetOrder[0] ?? '') : ''
  if (orderedSheetId && orderedSheetId === preferSheetId && sheets[orderedSheetId]) {
    return cloneUniverSnapshotSlice(sheets[orderedSheetId])
  }

  const valueMatch = Object.values(sheets).find(
    worksheet => worksheet && typeof worksheet === 'object' && worksheet.id === preferSheetId
  )
  if (!valueMatch) return null
  return cloneUniverSnapshotSlice(valueMatch)
}

export function isolateWorkbookSnapshotToSingleSheet(
  snapshot: Record<string, unknown>,
  preferSheetId: string,
  nextSheetName?: string
): Record<string, unknown> | null {
  const worksheet = pickWorksheetFromSingleSheetBootstrap(snapshot, preferSheetId)
  if (!worksheet) return null

  const isolated = cloneWorkbookSnapshotJson(snapshot)
  const nextWorksheet = cloneUniverSnapshotSlice(worksheet)
  nextWorksheet.id = preferSheetId
  if (nextSheetName) {
    nextWorksheet.name = nextSheetName
  }

  isolated.sheetOrder = [preferSheetId]
  isolated.sheets = { [preferSheetId]: nextWorksheet }
  if (nextSheetName) {
    isolated.name = nextSheetName
  }

  return isolated
}

export function buildMultiSheetWorkbookFromAppSheets(options: {
  appSheets: SpreadsheetSheet[]
  activeSheetId: string
  getRowsForSheet: (sheetId: string) => Record<string, unknown>[]
  singleWorksheetBootstrap?: Record<string, unknown> | null
  appId?: string
}): UniverWorkbookSnapshot {
  const { appSheets, activeSheetId, getRowsForSheet, singleWorksheetBootstrap, appId } = options
  const workbookId = appId ? `workbook-${appId}` : `workbook-${activeSheetId}`
  const activeSheet = appSheets.find(sheet => sheet.id === activeSheetId) ?? appSheets[0]
  const normalizedBootstrap =
    singleWorksheetBootstrap && typeof singleWorksheetBootstrap === 'object'
      ? normalizeWorkbookSnapshotToAppSheets(singleWorksheetBootstrap, appSheets)
      : singleWorksheetBootstrap
  const sheets: Record<string, UniverWorksheetData> = {}
  const sheetOrder: string[] = []

  for (const sheet of appSheets) {
    const visibleColumns = sheet.columns.filter(column => column.isVisible !== false)
    const sheetRows = getRowsForSheet(sheet.id)
    // If the bootstrap is actually a workbook-shaped blob (the common case now —
    // Univer snapshots are per-workbook, so even a "single sheet" bootstrap
    // typically carries every worksheet), pull out the matching worksheet for
    // THIS sheet so its cell styles / merges / number formats survive.
    const bootstrapWorksheet = normalizedBootstrap
      ? pickWorksheetFromSingleSheetBootstrap(normalizedBootstrap, sheet.id)
      : null

    const worksheet = bootstrapWorksheet ?? buildWorkbookSnapshot(sheet, sheetRows, sheet.columns).sheets[sheet.id]

    let nextWorksheet = cloneUniverSnapshotSlice(worksheet)
    nextWorksheet.id = sheet.id
    nextWorksheet.name = sheet.name
    nextWorksheet.hidden =
      sheet.hidden !== undefined ? (sheet.hidden ? 1 : 0) : (toUniverBooleanNumber(worksheet.hidden) ?? 0)
    if (bootstrapWorksheet) {
      const formattingWorkbook = stripWorkbookSnapshotValuesPreservingFormatting({
        id: workbookId,
        name: activeSheet?.name || sheet.name,
        sheetOrder: [sheet.id],
        sheets: { [sheet.id]: nextWorksheet }
      })
      const mergedWorkbook = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(
        formattingWorkbook,
        sheet.id,
        sheetRows,
        sheet.columns
      )
      nextWorksheet = cloneUniverSnapshotSlice(
        (mergedWorkbook as { sheets: Record<string, UniverWorksheetData> }).sheets[sheet.id]
      )
    }
    transformAvatarFormulasInSnapshot(
      {
        id: workbookId,
        name: activeSheet?.name || sheet.name,
        sheetOrder: [sheet.id],
        sheets: { [sheet.id]: nextWorksheet }
      },
      visibleColumns
    )
    sheets[sheet.id] = nextWorksheet
    sheetOrder.push(sheet.id)
  }

  // CRITICAL: Preserve the workbook-level `styles` registry. Univer stores style
  // definitions once at the workbook level and cells reference them via `s: "<id>"`.
  // Dropping `styles` here leaves every `s` ref orphaned after bootstrap, so cells
  // keep their style-id strings but Univer can no longer resolve them — the cell
  // renders unstyled and subsequent `getWorkbookSnapshot()` saves only capture
  // newly-added styles, permanently losing pre-existing formatting on reload.
  const preservedStyles: Record<string, unknown> = {}
  if (normalizedBootstrap && typeof normalizedBootstrap === 'object') {
    const srcStyles = (normalizedBootstrap as Record<string, unknown>).styles
    if (srcStyles && typeof srcStyles === 'object') {
      Object.assign(preservedStyles, srcStyles as Record<string, unknown>)
    }
  }

  return {
    id: workbookId,
    name: activeSheet?.name || 'Workbook',
    sheetOrder,
    appVersion: '0.15.0',
    locale: 'en-US',
    styles: preservedStyles,
    sheets
  }
}

/** Regex to match old 1-arg IMAGE formula for upgrade to sized version (allows optional spaces) */
const OLD_IMAGE_FORMULA = /^=IMAGE\s*\(\s*"((?:[^"]|"")*)"\s*\)$/

function upgradeImageFormula(cell: UniverCellData): void {
  const formula = cell.f
  if (typeof formula !== 'string') return
  const m = formula.match(OLD_IMAGE_FORMULA)
  if (m) {
    const url = m[1].replaceAll('""', '"')
    cell.f = `=IMAGE("${url.replaceAll('"', '""')}", "", 3, 32, 32)`
  }
}

function processAvatarCellsInRow(rowCells: Record<number, UniverCellData>, avatarColIndices: Set<number>): void {
  for (const colIdx of avatarColIndices) {
    const cell = rowCells[colIdx]
    if (cell?.f && typeof cell.f === 'string') upgradeImageFormula(cell)
  }
}

function processAvatarColumnConfig(sheetData: UniverWorksheetData, avatarColIndices: Set<number>): void {
  const columnData = sheetData.columnData
  if (columnData !== undefined && typeof columnData === 'object') {
    for (const colIdx of avatarColIndices) {
      const colConfig = columnData[colIdx]
      if (colConfig && typeof colConfig === 'object') colConfig.w = AVATAR_COL_WIDTH
      else columnData[colIdx] = { w: AVATAR_COL_WIDTH }
    }
  }
}

/**
 * Transform a loaded Univer snapshot to use small avatar images.
 * - Upgrades =IMAGE("url") to =IMAGE("url", "", 3, 32, 32) in avatar columns
 * - Ensures avatar column width is 40px
 * Call this before passing a bootstrap snapshot to Univer.
 */
export function transformAvatarFormulasInSnapshot(
  snapshot: Record<string, unknown>,
  columns: SpreadsheetColumn[]
): void {
  const sheets = snapshot?.sheets as Record<string, UniverWorksheetData> | undefined
  if (sheets === undefined) return

  const visibleColumns = columns.filter(c => c.isVisible !== false)
  const avatarColIndices = new Set(
    visibleColumns.map((col, idx) => (isAvatarColumn(col) ? idx : -1)).filter(i => i >= 0)
  )
  if (avatarColIndices.size === 0) return

  for (const sheetData of Object.values(sheets)) {
    const cellData = sheetData?.cellData
    if (cellData !== undefined) {
      for (const rowCells of Object.values(cellData) as Record<number, UniverCellData>[]) {
        if (typeof rowCells === 'object') processAvatarCellsInRow(rowCells, avatarColIndices)
      }
    }
    processAvatarColumnConfig(sheetData, avatarColIndices)
  }
}

/**
 * Create conversion context for mapping row/column indices to our rowId/columnId.
 * Used by UniverSheetGrid and collaboration for applyRemoteCellUpdate and operation mapping.
 * `rowIdToIndex` includes every known id alias (_id, id, _rowUuid) so inbound persisted rowIds resolve.
 */
export function createUniverConversionContext(
  columns: SpreadsheetColumn[],
  data: Record<string, unknown>[]
): ConversionContext {
  const visibleColumns = columns.filter(col => col.isVisible !== false)
  const columnIdToIndex = new Map<string, number>()
  const columnIndexToId = new Map<number, string>()
  const columnIndexToName = new Map<number, string>()
  const rowIdToIndex = new Map<string, number>()
  const rowIndexToId = new Map<number, string>()
  const excelColToIndex = new Map<string, number>()
  const indexToExcelCol = new Map<number, string>()
  visibleColumns.forEach((col, index) => {
    columnIdToIndex.set(col.id, index)
    columnIndexToId.set(index, col.id)
    columnIndexToName.set(index, col.name)
    const excelCol = indexToExcelColumn(index)
    excelColToIndex.set(excelCol, index)
    indexToExcelCol.set(index, excelCol)
  })
  data.forEach((row, index) => {
    const rowIndex = getViewerRowVisualIndex(row, index)
    const candidateRowIds = getRowIdentityCandidates(row)
    const backendRowId = resolveBackendRowIdForViewerRow(row, isSpreadsheetBackendRowUuid)
    const canonicalRowId = backendRowId ?? candidateRowIds[0] ?? `row_${index}`
    candidateRowIds.forEach(rowId => {
      rowIdToIndex.set(rowId, rowIndex)
    })
    rowIdToIndex.set(canonicalRowId, rowIndex)
    rowIndexToId.set(rowIndex, canonicalRowId)
  })
  return {
    columnIdToIndex,
    columnIndexToId,
    columnIndexToName,
    rowIdToIndex,
    rowIndexToId,
    excelColToIndex,
    indexToExcelCol
  }
}

export function overlaySparseRowIndexMappings(
  ctx: ConversionContext,
  sparseRowMappings: Array<{ rowIndex: number; rowId: string }>
): ConversionContext {
  sparseRowMappings.forEach(({ rowIndex, rowId }) => {
    if (!Number.isFinite(rowIndex) || rowIndex < 0 || !rowId) return
    ctx.rowIndexToId.set(rowIndex, rowId)
    ctx.rowIdToIndex.set(rowId, rowIndex)
  })
  return ctx
}

/**
 * Extract URL from =HYPERLINK("url","text") formula.
 */
export function extractUrlFromHyperlinkFormula(formula: string): string | null {
  if (!formula || typeof formula !== 'string') return null
  const trimmed = formula.trim()
  const match = trimmed.match(/^=?\s*HYPERLINK\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,/i)
  if (!match) return null
  const url = match[1].replace(/\\"/g, '"').trim()
  return /^https?:\/\//i.test(url) ? url : null
}

/**
 * Returns the URL for the cell at (row, col) if it is the link column and contains a valid URL.
 * Tries data first, then parses HYPERLINK formula from cell if provided.
 */
export function getHyperlinkUrlFromSelection(
  row: number,
  col: number,
  data: Record<string, unknown>[],
  columns: SpreadsheetColumn[],
  cellFormula?: string | null
): string | null {
  const visibleColumns = columns.filter(c => c.isVisible !== false)
  if (col < 0 || col >= visibleColumns.length || row < 0) return null
  const column = visibleColumns[col]
  if (row < data.length && isLinkColumn(column)) {
    const raw = readSpreadsheetRowCellValue(data[row], column)
    if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) return raw.trim()
    if (raw && typeof raw === 'object') {
      const url =
        (raw as Record<string, unknown>).url ??
        (raw as Record<string, unknown>).v ??
        (raw as Record<string, unknown>).src
      if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) return url.trim()
    }
  }
  if (cellFormula) {
    const fromFormula = extractUrlFromHyperlinkFormula(cellFormula)
    if (fromFormula) return fromFormula
  }
  return null
}
