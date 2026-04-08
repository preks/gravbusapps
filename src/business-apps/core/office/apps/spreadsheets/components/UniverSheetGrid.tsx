/**
 * UniverSheetGrid Component
 *
 * Wrapper that integrates Univer with our spreadsheet system.
 * Replaces FortuneSheetGrid; same props and ref contract for TableView and collaboration.
 */

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useState
} from 'react'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import { useTranslation } from '@newwork/nw-design-system'
import spreadsheetTranslations from '../_i18n'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../types/spreadsheet'
import type {
  DocumentParticipant,
  DocumentOperation
} from '../../../../../platform/apps/shared/services/CollaborationClient'
import {
  buildWorkbookSnapshot,
  createUniverConversionContext,
  getHyperlinkUrlFromSelection,
  transformAvatarFormulasInSnapshot,
  type ConversionContext,
  type UniverWorkbookSnapshot
} from '../utils/univerAdapter'

// Match Univer's standard defaults for consistent cursor sizing before snapshot is read
const CURSOR_OVERLAY_ROW_HEIGHT_PX = 23
const CURSOR_OVERLAY_COL_WIDTH_PX = 73
const CURSOR_OVERLAY_HEADER_HEIGHT_PX = 28
const CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX = 48
const UNIVER_COMMAND_TYPE_MUTATION = 2
const REMOTE_ECHO_SUPPRESSION_TTL_MS = 800
const GERMAN_NUMFMT_LOCALE = 'de_DE'
/** Same grid pattern as context-menu injection (`tryInjectViaGridContainer`): inner list lives in `univer-grid` + `gap-1`. */
const NUMFMT_GRID_ROW_SELECTOR = ':scope > div.univer-flex.univer-h-7'
/** Preview lives in the second span (`sheets-numfmt-ui` `Qn` / `MoreNumfmtType`); label stays in the first span. */
const NUMFMT_ROW_PREVIEW_SPAN_SELECTOR = ':scope > span.univer-text-xs'
const NUMFMT_MENU_ITEM_ROW_SELECTOR = 'div.univer-flex.univer-h-7'

/**
 * Univer locale overlay for German (the library ships no de-DE bundle).
 * Only the `sheet.numfmt.*` keys are needed for the number-format dropdown menu.
 */
const UNIVER_NUMFMT_DE_LOCALE = {
  sheet: {
    numfmt: {
      title: 'Zahlenformat',
      numfmtType: 'Formattypen',
      cancel: 'Abbrechen',
      confirm: 'Bestätigen',
      general: 'Allgemein',
      accounting: 'Buchhaltung',
      text: 'Text',
      number: 'Zahl',
      percent: 'Prozentsatz',
      scientific: 'Wissenschaftlich',
      currency: 'Währung',
      date: 'Datum',
      time: 'Uhrzeit',
      thousandthPercentile: 'Tausendertrennzeichen',
      preview: 'Vorschau',
      dateTime: 'Datum und Uhrzeit',
      decimalLength: 'Dezimalstellen',
      currencyType: 'Währungssymbol',
      moreFmt: 'Formate',
      financialValue: 'Finanzieller Wert',
      roundingCurrency: 'Währung gerundet',
      timeDuration: 'Zeitdauer',
      currencyDes:
        'Das Währungsformat wird für allgemeine Geldbeträge verwendet. Das Buchhaltungsformat richtet Dezimalstellen und Währungssymbole in einer Spalte aus.',
      accountingDes:
        'Das Buchhaltungsformat richtet eine Spalte von Werten an Währungssymbolen und Dezimalstellen aus.',
      dateType: 'Datumstyp',
      dateDes: 'Das Datumsformat stellt Datums- und Zeitreihenwerte als Datumswerte dar.',
      negType: 'Negativer Zahlentyp',
      generalDes: 'Das Standardformat enthält kein bestimmtes Zahlenformat.',
      thousandthPercentileDes:
        'Das Prozentformat wird zur Darstellung gewöhnlicher Zahlen verwendet. Währungs- und Buchhaltungsformate bieten spezialisierte Formate für Geldwertberechnungen.',
      addDecimal: 'Dezimalstellen erhöhen',
      subtractDecimal: 'Dezimalstellen verringern',
      customFormat: 'Benutzerdefiniertes Format',
      customFormatDes: 'Benutzerdefinierte Zahlenformate basierend auf vorhandenen Formaten erstellen.'
    }
  }
}

/**
 * Anchors that identify the number-format dropdown (not the cell context menu).
 * Indexed by app locale so the grid finder works regardless of Univer's UI language.
 */
const NUMFMT_MENU_GRID_ANCHOR_LABELS_BY_LOCALE: Record<string, string[]> = {
  'en-US': ['General', 'Formats', 'Currency', 'Date and time'],
  'de-DE': ['Allgemein', 'Formate', 'Währung', 'Datum und Uhrzeit']
}
const NUMFMT_MENU_GRID_ANCHOR_LABELS_DEFAULT = NUMFMT_MENU_GRID_ANCHOR_LABELS_BY_LOCALE['en-US']

/**
 * German-formatted preview values keyed by the label text visible in the menu.
 * Indexed by app locale because the label language changes with the Univer locale.
 */
const GERMAN_NUMFMT_PREVIEW_BY_LABEL_BY_LOCALE: Record<string, Record<string, string>> = {
  'en-US': {
    Percentage: '122000,00%',
    Scientific: '1,22E+03',
    Accounting: '1.220,00 EUR',
    'Financial value': '1.220,00',
    Currency: '1.220,00 EUR',
    'Rounding up the currency': '1.220 EUR',
    Date: '04.05.1903',
    Time: '00:00:00',
    'Date and time': '04.05.1903 00:00'
  },
  'de-DE': {
    Prozentsatz: '122000,00%',
    Wissenschaftlich: '1,22E+03',
    Buchhaltung: '1.220,00 EUR',
    'Finanzieller Wert': '1.220,00',
    Währung: '1.220,00 EUR',
    'Währung gerundet': '1.220 EUR',
    Datum: '04.05.1903',
    Uhrzeit: '00:00:00',
    'Datum und Uhrzeit': '04.05.1903 00:00'
  }
}

const GERMAN_NUMFMT_PATTERN_BY_LABEL_BY_LOCALE: Record<string, Record<string, string>> = {
  'en-US': {
    Accounting: '#,##0.00 "EUR"',
    'Financial value': '#,##0.00',
    Currency: '#,##0.00 "EUR"',
    'Rounding up the currency': '#,##0 "EUR"',
    Date: 'dd.mm.yyyy',
    Time: 'hh:mm:ss',
    'Date and time': 'dd.mm.yyyy hh:mm'
  },
  'de-DE': {
    Buchhaltung: '#,##0.00 "EUR"',
    'Finanzieller Wert': '#,##0.00',
    Währung: '#,##0.00 "EUR"',
    'Währung gerundet': '#,##0 "EUR"',
    Datum: 'dd.mm.yyyy',
    Uhrzeit: 'hh:mm:ss',
    'Datum und Uhrzeit': 'dd.mm.yyyy hh:mm'
  }
}

/** Module-level active locale so static helpers (MutationObserver callbacks) can pick it up. */
let activeAppLocale = 'en-US'

function getNumfmtPreviewMap(): Record<string, string> {
  return GERMAN_NUMFMT_PREVIEW_BY_LABEL_BY_LOCALE[activeAppLocale] ?? GERMAN_NUMFMT_PREVIEW_BY_LABEL_BY_LOCALE['en-US']
}

function getNumfmtPatternMap(): Record<string, string> {
  return GERMAN_NUMFMT_PATTERN_BY_LABEL_BY_LOCALE[activeAppLocale] ?? GERMAN_NUMFMT_PATTERN_BY_LABEL_BY_LOCALE['en-US']
}

function getNumfmtAnchorLabels(): string[] {
  return NUMFMT_MENU_GRID_ANCHOR_LABELS_BY_LOCALE[activeAppLocale] ?? NUMFMT_MENU_GRID_ANCHOR_LABELS_DEFAULT
}

type UniverFontConfig = {
  value: string
  label: string
  category?: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting'
}

const UNIVER_FONT_CANDIDATES: UniverFontConfig[] = [
  { value: 'Arial', label: 'fontFamily.arial', category: 'sans-serif' },
  { value: 'Times New Roman', label: 'fontFamily.times-new-roman', category: 'serif' },
  { value: 'Tahoma', label: 'fontFamily.tahoma', category: 'sans-serif' },
  { value: 'Verdana', label: 'fontFamily.verdana', category: 'sans-serif' },
  { value: 'Microsoft YaHei', label: 'fontFamily.microsoft-yahei', category: 'sans-serif' },
  { value: 'SimSun', label: 'fontFamily.simsun', category: 'serif' },
  { value: 'SimHei', label: 'fontFamily.simhei', category: 'sans-serif' },
  { value: 'Kaiti', label: 'fontFamily.kaiti', category: 'serif' },
  { value: 'FangSong', label: 'fontFamily.fangsong', category: 'serif' },
  { value: 'NSimSun', label: 'fontFamily.nsimsun', category: 'serif' },
  { value: 'STXinwei', label: 'fontFamily.stxinwei', category: 'serif' },
  { value: 'STXingkai', label: 'fontFamily.stxingkai', category: 'serif' },
  { value: 'STLiti', label: 'fontFamily.stliti', category: 'serif' }
]

const UNIVER_FONT_FALLBACK_LIST: UniverFontConfig[] = UNIVER_FONT_CANDIDATES.filter(
  font =>
    font.value === 'Arial' || font.value === 'Times New Roman' || font.value === 'Tahoma' || font.value === 'Verdana'
)

function getSupportedUniverFonts(): UniverFontConfig[] {
  if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.check !== 'function') {
    return UNIVER_FONT_FALLBACK_LIST
  }

  const supported = UNIVER_FONT_CANDIDATES.filter(font => {
    return document.fonts.check(`12px "${font.value}"`) || document.fonts.check(`12px ${font.value}`)
  })

  return supported.length > 0 ? supported : UNIVER_FONT_FALLBACK_LIST
}

type RemoteEchoSuppressionEntry = {
  expiresAt: number
  signature: string
}

function normalizeValueForEchoSignature(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('=')) return { f: trimmed }
    return value
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const obj = value as Record<string, unknown>
  if (typeof obj.f === 'string') {
    const trimmed = obj.f.trim()
    return { f: trimmed.startsWith('=') ? trimmed : `=${trimmed}` }
  }
  if (obj.v !== undefined) return obj.v
  if (obj.m !== undefined) return obj.m
  return value
}

function toEchoSignature(value: unknown): string {
  const normalized = normalizeValueForEchoSignature(value)
  if (normalized === undefined) return 'u:'
  if (normalized === null) return 'n:'
  if (typeof normalized === 'string') return `s:${normalized}`
  if (typeof normalized === 'number') return `d:${normalized}`
  if (typeof normalized === 'boolean') return `b:${normalized ? 1 : 0}`
  try {
    return `j:${JSON.stringify(normalized)}`
  } catch {
    return `x:${String(normalized)}`
  }
}

function remoteEchoKey(row: number, col: number): string {
  return `${row}:${col}`
}

// Prioritizes the cellRef (A1 notation) for cursor position, falling back to raw row:/col: entries.
// A1 references represent the sender's exact visual cell position and don't suffer from
// row-index drift between the data array and Univer grid.
function parseCursorPath(path?: string[]): { row: number; col: number } | null {
  if (!path || path.length === 0) return null

  const cellRefEntry = path.find(item => item.startsWith('cellRef:'))
  if (cellRefEntry) {
    const parsed = parseA1Reference(cellRefEntry.slice(8))
    if (parsed) return parsed
  }

  const colEntry = path.find(item => item.startsWith('col:'))
  if (!colEntry) return null
  const col = Number(colEntry.slice(4))
  if (!Number.isFinite(col) || col < 0) return null

  const rowEntry = path.find(item => item.startsWith('row:'))
  if (!rowEntry) return null
  const row = Number(rowEntry.slice(4))
  if (!Number.isFinite(row) || row < 0) return null
  return { row, col }
}

function parseA1Reference(cellRef: string): { row: number; col: number } | null {
  const normalized = cellRef.trim().toUpperCase()
  const singleCellMatch = /^([A-Z]+)(\d+)$/.exec(normalized)
  if (!singleCellMatch) return null
  const [, columnLetters, rowStr] = singleCellMatch
  const row = Number(rowStr) - 1
  if (!Number.isFinite(row) || row < 0) return null
  let col = 0
  for (let i = 0; i < columnLetters.length; i++) {
    col = col * 26 + (columnLetters.charCodeAt(i) - 64)
  }
  return { row, col: col - 1 }
}

type SheetRangeShape = { startRow: number; endRow: number; startColumn: number; endColumn: number }
type SheetCellMatrix = Record<number, Record<number, unknown>>
type SheetCellBounds = { min: number; max: number }

function normalizeCellMatrix(value: unknown): SheetCellMatrix | undefined {
  return value && typeof value === 'object' ? (value as SheetCellMatrix) : undefined
}

function readWorksheetCellValue(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  row: number,
  col: number
): unknown {
  const cellRange = worksheet?.getRange?.(row, col)
  return (
    (cellRange as { getValue?: () => unknown })?.getValue?.() ??
    (cellRange as { getCellData?: () => { v?: unknown } })?.getCellData?.()?.v
  )
}

function getNumericMatrixKeys(value: SheetCellMatrix): number[] {
  return Object.keys(value)
    .map(k => Number(k))
    .filter(n => !Number.isNaN(n))
}

function getColumnKeysFromMatrix(value: SheetCellMatrix): number[] {
  const colKeys: number[] = []
  for (const rowKey of Object.keys(value)) {
    const rowCells = value[Number(rowKey)]
    if (!rowCells || typeof rowCells !== 'object') continue
    colKeys.push(...getNumericMatrixKeys(rowCells as SheetCellMatrix))
  }
  return colKeys
}

function getBounds(values: number[]): SheetCellBounds {
  if (values.length === 0) return { min: 0, max: 0 }
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  }
}

function resolveAxisOffset(bounds: SheetCellBounds, rangeStart: number, rangeEnd: number): number {
  const looksAbsolute = bounds.min >= rangeStart && bounds.max <= rangeEnd
  const looksRelative = bounds.min >= 0 && bounds.max <= rangeEnd - rangeStart
  return !looksAbsolute && looksRelative ? rangeStart : 0
}

function deriveCellMatrixFromRanges(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  ranges: SheetRangeShape[],
  maxCells = 10000
): SheetCellMatrix | undefined {
  const derived: SheetCellMatrix = {}
  let visited = 0

  const limitReached = () => visited > maxCells
  const addCellValue = (row: number, col: number) => {
    visited += 1
    if (limitReached()) return
    const value = readWorksheetCellValue(worksheet, row, col)
    if (value === undefined) return
    if (!derived[row]) derived[row] = {}
    derived[row][col] = value
  }

  for (const range of ranges) {
    for (let r = range.startRow; r <= range.endRow && !limitReached(); r++) {
      for (let c = range.startColumn; c <= range.endColumn && !limitReached(); c++) {
        addCellValue(r, c)
      }
    }
    if (limitReached()) {
      break
    }
  }
  return Object.keys(derived).length > 0 ? derived : undefined
}

function resolveCellOffsets(
  range: SheetRangeShape | undefined,
  cellValue: SheetCellMatrix
): { rowOffset: number; colOffset: number } {
  if (!range) return { rowOffset: 0, colOffset: 0 }

  const rowBounds = getBounds(getNumericMatrixKeys(cellValue))
  const colBounds = getBounds(getColumnKeysFromMatrix(cellValue))

  return {
    rowOffset: resolveAxisOffset(rowBounds, range.startRow, range.endRow),
    colOffset: resolveAxisOffset(colBounds, range.startColumn, range.endColumn)
  }
}

function getNewRowIndices(cellValue: SheetCellMatrix, ctx: ConversionContext, rowOffset: number): number[] {
  return Object.keys(cellValue)
    .map(k => Number(k))
    .filter(ri => !Number.isNaN(ri) && ctx.rowIndexToId.get(ri + rowOffset) === undefined)
    .sort((a, b) => a - b)
}

function buildNewRowsFromCellMatrix(params: {
  newRowIndices: number[]
  cellValue: SheetCellMatrix
  ctx: ConversionContext
  colOffset: number
  rowOffset: number
  getClientRowId: (globalRowIndex: number) => string
}): Record<string, unknown>[] {
  const { newRowIndices, cellValue, ctx, colOffset, rowOffset, getClientRowId } = params
  return newRowIndices.map(rowIndex => {
    const rowCells = cellValue[rowIndex]
    const globalRowIndex = rowIndex + rowOffset
    const row: Record<string, unknown> = { _id: getClientRowId(globalRowIndex) }
    if (!rowCells || typeof rowCells !== 'object') return row

    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      const columnName =
        ctx.columnIndexToName.get(colIndex + colOffset) ?? ctx.columnIndexToId.get(colIndex + colOffset)
      if (columnName === undefined) continue
      const cell = rowCells[colIndex]
      row[columnName] = cell ?? { v: '' }
    }
    return row
  })
}

/**
 * Extract changed cells from a Univer value-change event.
 *
 * Returns univerRow/univerCol alongside the logical rowId/columnName. The Univer grid indices
 * are the sender's actual visual position and get transmitted as an A1 cellRef in the collaboration
 * operation. The receiver uses this cellRef to update the correct Univer cell, avoiding a bug where
 * data-array-index-based resolution wrote to the wrong row after row additions/deletions caused
 * the data array and Univer grid to drift out of sync.
 */
function collectChangedCells(params: {
  cellValue: SheetCellMatrix
  ctx: ConversionContext
  rowOffset: number
  colOffset: number
  shouldSuppress?: (rowIndex: number, colIndex: number, value: unknown) => boolean
}): Array<{ rowId: string; columnName: string; value: unknown; univerRow: number; univerCol: number }> {
  const { cellValue, ctx, rowOffset, colOffset, shouldSuppress } = params
  const changedCells: Array<{
    rowId: string
    columnName: string
    value: unknown
    univerRow: number
    univerCol: number
  }> = []
  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    const globalRowIndex = rowIndex + rowOffset
    const rowId = ctx.rowIndexToId.get(globalRowIndex)
    if (rowId === undefined) continue

    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      const globalColIndex = colIndex + colOffset
      const columnName = ctx.columnIndexToName.get(globalColIndex) ?? ctx.columnIndexToId.get(globalColIndex)
      if (columnName === undefined) continue
      const cell = rowCells[colIndex]
      if (shouldSuppress?.(globalRowIndex, globalColIndex, cell) === true) continue
      changedCells.push({
        rowId,
        columnName,
        value: cell ?? { v: '' },
        univerRow: globalRowIndex,
        univerCol: globalColIndex
      })
    }
  }
  return changedCells
}

export interface UniverSheetGridProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  initialSnapshot?: Record<string, unknown> | null
  snapshotSeed?: string
  workbookRemountKey?: string
  multiSheetWorkbookMode?: boolean
  onActiveWorksheetChange?: (sheetId: string, sheetName: string) => void
  columns: SpreadsheetColumn[]
  isReadOnly: boolean
  onCellChange: (rowId: string, columnId: string, value: unknown) => void
  onCellsChange?: (cells: Array<{ rowId: string; columnName: string; value: unknown }>) => void
  onSnapshotRequested?: () => Promise<void> | void
  onDataChange: (data: Record<string, unknown>[]) => void
  onOpenCommentRequest?: () => void
  commentedCells?: Array<{
    cellReference: string
    content: string
    createdByName?: string
    createdByAvatar?: string
    createdAt?: string
  }>
  onColumnAdd?: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => void
  onFormulaEvaluated?: (rowId: string, columnId: string, result: unknown) => void
  participants?: DocumentParticipant[]
  onOperationEmit?: (operation: DocumentOperation) => void
  onCursorEmit?: (position: { path: string[] }) => void
  collaborationEnabled?: boolean
  onDimensionsChange?: (payload: CellDimensionsPayload) => void
  height?: string | number
  width?: string | number
}

export interface CellDimensionsPayload {
  sheetId: string
  defaultColWidth: number
  defaultRowHeight: number
  columnData: Record<string | number, { w?: number }>
  rowData: Record<string | number, { h?: number }>
  rowHeaderWidth: number
  columnHeaderHeight: number
  zoomRatio: number
}

export interface UniverSheetGridHandle {
  applyRemoteCellUpdate: (rowIndex: number, colIndex: number, value: unknown, rowId?: string) => void
  getWorkbookSnapshot: () => Record<string, unknown> | null
  getVisibleRangeValues: (rowCount: number, colCount: number) => Record<number, Record<number, unknown>> | null
  applyRemoteDimensions: (payload: CellDimensionsPayload) => void
  getActiveCellReference: () => string | null
}

function toA1Reference(row: number, col: number): string {
  if (row < 0 || col < 0) return ''
  let column = col
  let letters = ''
  while (column >= 0) {
    letters = String.fromCharCode((column % 26) + 65) + letters
    column = Math.floor(column / 26) - 1
  }
  return `${letters}${row + 1}`
}

function formatCommentTime(value?: string): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString()
}

function getInitials(name?: string): string {
  const n = (name || '').trim()
  if (!n) return 'U'
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || 'U'
}

const COMMENT_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'

const CONTEXT_MENU_ANCHOR_LABELS = ['Copy Special', 'Paste Special', 'Clear', 'Insert', 'Delete', 'Freeze', 'Protect']

/** True for inputs the browser should handle (copy/paste) outside the grid container. */
function isDomTextEditingTarget(target: unknown): boolean {
  if (!(target instanceof Element)) return false
  const el = target
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((el as HTMLElement).isContentEditable) return true
  const role = el.getAttribute('role')
  if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true
  return Boolean(el.closest('[contenteditable="true"]'))
}

function distanceToRect(x: number, y: number, rect: DOMRect): number {
  const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0
  const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0
  return Math.hypot(dx, dy)
}

function getOrCreateClientRowId(globalRowIndex: number, idMap: Map<number, string>): string {
  let clientRowId = idMap.get(globalRowIndex)
  if (clientRowId) return clientRowId
  try {
    clientRowId = `client_${crypto.randomUUID()}`
  } catch {
    clientRowId = `client_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
  idMap.set(globalRowIndex, clientRowId)
  return clientRowId
}

interface SnapshotDimensions {
  defaultColWidth: number
  defaultRowHeight: number
  columnData: Record<string | number, { w?: number }>
  rowData: Record<string | number, { h?: number }>
  rowHeaderWidth: number
  columnHeaderHeight: number
  zoomRatio: number
}

function areDimensionMapsEqual(
  a: Record<string | number, { w?: number; h?: number }>,
  b: Record<string | number, { w?: number; h?: number }>,
  key: 'w' | 'h'
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const entryKey of aKeys) {
    if (!(entryKey in b)) return false
    const aValue = a[entryKey]?.[key]
    const bValue = b[entryKey]?.[key]
    if ((aValue ?? null) !== (bValue ?? null)) return false
  }
  return true
}

function areSnapshotDimensionsEqual(a: SnapshotDimensions | null, b: SnapshotDimensions | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.defaultColWidth === b.defaultColWidth &&
    a.defaultRowHeight === b.defaultRowHeight &&
    a.rowHeaderWidth === b.rowHeaderWidth &&
    a.columnHeaderHeight === b.columnHeaderHeight &&
    a.zoomRatio === b.zoomRatio &&
    areDimensionMapsEqual(a.columnData, b.columnData, 'w') &&
    areDimensionMapsEqual(a.rowData, b.rowData, 'h')
  )
}

function extractDimensionsFromSnapshot(snap: Record<string, unknown>): SnapshotDimensions | null {
  const sheetOrder = snap?.sheetOrder as string[] | undefined
  const sheets = snap?.sheets as Record<string, Record<string, unknown>> | undefined
  const firstSheetId = sheetOrder?.[0]
  let sheetSnap: Record<string, unknown> | undefined
  if (firstSheetId && sheets) {
    sheetSnap = sheets[firstSheetId]
  } else if (sheets) {
    sheetSnap = Object.values(sheets)[0]
  }
  if (!sheetSnap) return null
  const rawCol = sheetSnap.columnData as Record<string | number, { w?: number }> | undefined
  const rawRow = sheetSnap.rowData as Record<string | number, { h?: number }> | undefined
  const rowHeader = sheetSnap.rowHeader as { width?: number } | undefined
  const columnHeader = sheetSnap.columnHeader as { height?: number } | undefined
  const zoomRatio = (sheetSnap.zoomRatio as number | undefined) ?? 1
  return {
    defaultColWidth: (sheetSnap.defaultColumnWidth as number | undefined) ?? CURSOR_OVERLAY_COL_WIDTH_PX,
    defaultRowHeight: (sheetSnap.defaultRowHeight as number | undefined) ?? CURSOR_OVERLAY_ROW_HEIGHT_PX,
    columnData: rawCol ?? {},
    rowData: rawRow ?? {},
    rowHeaderWidth: rowHeader?.width ?? CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX,
    columnHeaderHeight: columnHeader?.height ?? CURSOR_OVERLAY_HEADER_HEIGHT_PX,
    zoomRatio
  }
}

function extractActiveRangePosition(workbook: unknown): { row: number; col: number } | null {
  const activeRange =
    (workbook as { getActiveRange?: () => unknown } | null | undefined)?.getActiveRange?.() ??
    (workbook as { getActiveSheet?: () => { getActiveRange?: () => unknown } } | null | undefined)
      ?.getActiveSheet?.()
      ?.getActiveRange?.()
  if (!activeRange) return null
  const rangeRecord = activeRange as {
    getRow?: () => number
    getColumn?: () => number
    getRange?: () => { startRow?: number; startColumn?: number }
    startRow?: number
    startColumn?: number
    row?: number
    column?: number
  }
  const nestedRange = rangeRecord.getRange?.()
  const row = rangeRecord.getRow?.() ?? nestedRange?.startRow ?? rangeRecord.startRow ?? rangeRecord.row
  const col = rangeRecord.getColumn?.() ?? nestedRange?.startColumn ?? rangeRecord.startColumn ?? rangeRecord.column
  if (typeof row !== 'number' || typeof col !== 'number') return null
  return { row, col }
}

function extractSelectionFromEvent(event: unknown): { row: number; col: number } | null {
  const eventRecord = (event ?? {}) as {
    selections?: Array<{
      range?: { startRow?: number; startColumn?: number; row?: number; column?: number }
      primary?: { actualRow?: number; actualColumn?: number; startRow?: number; startColumn?: number }
    }>
    range?: {
      startRow?: number
      startColumn?: number
      row?: number
      column?: number
      actualRow?: number
      actualColumn?: number
    }
    params?: {
      selections?: Array<{
        range?: { startRow?: number; startColumn?: number; row?: number; column?: number }
        primary?: { actualRow?: number; actualColumn?: number; startRow?: number; startColumn?: number }
      }>
      range?: {
        startRow?: number
        startColumn?: number
        row?: number
        column?: number
        actualRow?: number
        actualColumn?: number
      }
    }
    primary?: { actualRow?: number; actualColumn?: number; startRow?: number; startColumn?: number }
  }
  const selection =
    eventRecord.selections?.[0]?.range ??
    eventRecord.range ??
    eventRecord.params?.selections?.[0]?.range ??
    eventRecord.params?.range
  const primary =
    eventRecord.selections?.[0]?.primary ?? eventRecord.primary ?? eventRecord.params?.selections?.[0]?.primary
  const startRow = primary?.actualRow ?? primary?.startRow ?? selection?.startRow ?? selection?.row
  const startColumn = primary?.actualColumn ?? primary?.startColumn ?? selection?.startColumn ?? selection?.column
  if (typeof startRow !== 'number' || typeof startColumn !== 'number') return null
  return { row: startRow, col: startColumn }
}

function areCursorRectsEqual(
  a: Record<string, { top: number; left: number; width: number; height: number }>,
  b: Record<string, { top: number; left: number; width: number; height: number }>
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    const ra = a[key]
    const rb = b[key]
    if (!rb) return false
    if (
      Math.abs(ra.top - rb.top) > 0.5 ||
      Math.abs(ra.left - rb.left) > 0.5 ||
      Math.abs(ra.width - rb.width) > 0.5 ||
      Math.abs(ra.height - rb.height) > 0.5
    ) {
      return false
    }
  }
  return true
}

function createContextMenuItem(
  template: HTMLElement,
  markerAttr: string,
  className: string,
  label: string,
  onClick: () => void
): HTMLElement {
  const item = template.cloneNode(true) as HTMLElement
  item.setAttribute(markerAttr, 'true')
  item.classList.add(className)
  item.querySelectorAll('[aria-haspopup="true"]').forEach(node => node.removeAttribute('aria-haspopup'))
  item.innerHTML = ''
  item.classList.remove('univer-justify-between')
  item.classList.add('univer-flex', 'univer-items-center', 'univer-gap-3', 'univer-justify-start', 'univer-text-sm')
  item.style.justifyContent = 'flex-start'
  const iconWrap = document.createElement('span')
  iconWrap.className =
    'univer-text-base univer-flex univer-flex-shrink-0 univer-items-center univer-justify-center univer-h-6 univer-min-w-6'
  iconWrap.style.color = 'var(--univer-primary-600, #2563eb)'
  iconWrap.innerHTML = COMMENT_ICON_SVG
  const labelEl = document.createElement('span')
  labelEl.className =
    'univer-flex-1 univer-min-w-0 univer-max-w-full univer-break-words univer-text-left univer-text-sm univer-leading-4'
  labelEl.textContent = label
  labelEl.style.whiteSpace = 'nowrap'
  labelEl.style.wordBreak = 'normal'
  labelEl.style.overflowWrap = 'normal'
  labelEl.style.fontFamily = 'inherit'
  labelEl.style.fontSize = 'inherit'
  labelEl.style.fontWeight = 'inherit'
  item.appendChild(iconWrap)
  item.appendChild(labelEl)
  item.style.whiteSpace = 'nowrap'
  item.style.wordBreak = 'normal'
  item.style.overflowWrap = 'normal'
  item.addEventListener('click', onClick)
  return item
}

function tryInjectViaMenuGroupList(markerAttr: string, createItem: (template: HTMLElement) => HTMLElement): boolean {
  const listSelectors = '.univer-menu-item-group-list, .rc-menu-item-group-list, [class*="menu-item-group-list"]'
  const univerLists = Array.from(document.querySelectorAll<HTMLElement>(listSelectors)).filter(
    list => !list.querySelector(`[${markerAttr}]`)
  )
  for (const list of univerLists) {
    const items = list.querySelectorAll<HTMLElement>('.univer-menu-item, li, [role="menuitem"]')
    const firstItem = items[0]
    if (!firstItem) continue
    const listText = (list.textContent || '').toLowerCase()
    if (!CONTEXT_MENU_ANCHOR_LABELS.some(lbl => listText.includes(lbl.toLowerCase()))) continue
    const item = createItem(firstItem)
    if (document.querySelector(`[${markerAttr}]`)) return true
    list.prepend(item)
    return true
  }
  return false
}

function findGridInsertParent(grid: HTMLElement): HTMLElement {
  const firstChild = grid.firstElementChild as HTMLElement | null
  if (!firstChild) return grid
  const firstText = (firstChild.textContent || '').toLowerCase()
  const firstIsIconRow =
    firstText.includes('copy') && !firstText.includes('copy special') && !firstText.includes('insert')
  if (!firstIsIconRow) return grid
  for (let sib = firstChild.nextElementSibling; sib; sib = sib.nextElementSibling) {
    const sibText = ((sib as HTMLElement).textContent || '').toLowerCase()
    if (CONTEXT_MENU_ANCHOR_LABELS.some(lbl => sibText.includes(lbl.toLowerCase()))) {
      return sib as HTMLElement
    }
  }
  return grid
}

function tryInjectViaGridContainer(markerAttr: string, createItem: (template: HTMLElement) => HTMLElement): boolean {
  const gridContainers = Array.from(
    document.querySelectorAll<HTMLElement>('[class*="univer-grid"][class*="univer-gap-1"]')
  ).filter(el => {
    if (el.querySelector(`[${markerAttr}]`)) return false
    const gridText = (el.textContent || '').toLowerCase()
    if (!CONTEXT_MENU_ANCHOR_LABELS.some(lbl => gridText.includes(lbl.toLowerCase()))) return false
    if (gridText.includes('copy') && !gridText.includes('copy special') && !gridText.includes('insert')) return false
    const childGrids = el.querySelectorAll<HTMLElement>('[class*="univer-grid"][class*="univer-gap-1"]')
    for (const child of childGrids) {
      if (child === el) continue
      const childText = (child.textContent || '').toLowerCase()
      if (CONTEXT_MENU_ANCHOR_LABELS.some(lbl => childText.includes(lbl.toLowerCase()))) return false
    }
    return true
  })
  for (const grid of gridContainers) {
    const insertParent = findGridInsertParent(grid)
    const template = insertParent.querySelector<HTMLElement>(
      'button, [role="button"], .univer-menu-item, [class*="menu-item"]'
    )
    if (!template) continue
    if (document.querySelector(`[${markerAttr}]`)) return true
    const item = createItem(template)
    insertParent.prepend(item)
    return true
  }
  return false
}

function findMenuItemCandidate(el: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = el
  for (let d = 0; d < 6 && current; d++) {
    const cls = (current.getAttribute('class') || '').toLowerCase()
    const role = current.getAttribute('role')
    const tag = current.tagName.toLowerCase()
    if (role === 'menuitem' || cls.includes('menu-item') || tag === 'li' || tag === 'button') {
      return current
    }
    current = current.parentElement
  }
  return null
}

function tryInjectViaTextSearch(
  anchorX: number,
  anchorY: number,
  markerAttr: string,
  createItem: (template: HTMLElement) => HTMLElement
): boolean {
  const allElements = Array.from(document.querySelectorAll<HTMLElement>('body *'))
  const anchorCandidates: HTMLElement[] = []
  for (const el of allElements) {
    const text = (el.textContent || '').trim()
    if (!text) continue
    if (el.closest('[style*="display: none"]') || el.closest('.rc-menu-hidden')) continue
    if (!CONTEXT_MENU_ANCHOR_LABELS.some(lbl => text.includes(lbl))) continue
    const candidate = findMenuItemCandidate(el)
    if (candidate) anchorCandidates.push(candidate)
  }
  if (anchorCandidates.length === 0) return false
  const closest = anchorCandidates
    .map(el => ({ el, dist: distanceToRect(anchorX, anchorY, el.getBoundingClientRect()) }))
    .sort((a, b) => a.dist - b.dist)[0]?.el
  if (!closest) return false
  const parent = closest.parentElement
  if (!parent || parent.querySelector(`[${markerAttr}]`)) return true
  const item = createItem(closest)
  if (document.querySelector(`[${markerAttr}]`)) return true
  closest.before(item)
  return true
}

function tryInjectContextMenuItem(
  anchorX: number,
  anchorY: number,
  markerAttr: string,
  createItem: (template: HTMLElement) => HTMLElement
): boolean {
  if (document.querySelector(`[${markerAttr}]`)) return true
  return (
    tryInjectViaMenuGroupList(markerAttr, createItem) ||
    tryInjectViaGridContainer(markerAttr, createItem) ||
    tryInjectViaTextSearch(anchorX, anchorY, markerAttr, createItem)
  )
}

/**
 * Hides the "Protect Rows And Columns" item from Univer's context menu.
 * The feature is not supported in this app; leaving it visible confuses users.
 * Walks all nested grids/sections to find the leaf item, not a parent container.
 */
function hideProtectContextMenuItem(): void {
  if (typeof document === 'undefined') return
  const candidates = document.querySelectorAll<HTMLElement>(
    'button, [role="button"], [role="menuitem"], .univer-menu-item, [class*="menu-item"], [class*="univer-h-8"]'
  )
  for (const el of candidates) {
    if (el.style.display === 'none') continue
    const spans = el.querySelectorAll('span')
    for (const span of spans) {
      if (span.children.length > 0) continue
      const text = (span.textContent || '').trim()
      if (/^protect/i.test(text)) {
        el.style.display = 'none'
        break
      }
    }
  }
}

const HIDDEN_RIBBON_TABS = ['data', 'daten']

/**
 * Hides unwanted tabs from Univer's ribbon dropdown.
 * Walks text nodes to find the tab title, then hides the closest clickable ancestor.
 */
function hideUnwantedRibbonTabs(): void {
  if (typeof document === 'undefined') return
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = (node.textContent || '').trim().toLowerCase()
      return HIDDEN_RIBBON_TABS.includes(text) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    }
  })
  let textNode: Text | null = null
  while ((textNode = walker.nextNode() as Text | null)) {
    let el: HTMLElement | null = textNode.parentElement
    for (let depth = 0; depth < 8 && el; depth++) {
      const cls = el.getAttribute('class') || ''
      if (
        cls.includes('univer-cursor-pointer') ||
        cls.includes('univer-rounded') ||
        el.getAttribute('role') === 'tab'
      ) {
        if (el.style.display !== 'none') el.style.display = 'none'
        break
      }
      el = el.parentElement
    }
  }
}

function scheduleContextMenuInjectionPoll(run: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      globalThis.setTimeout(run, 0)
    })
  })
}

/**
 * Apply German number-format locale on the active workbook.
 * Returns false if skipped or failed (caller may retry after Univer injector is ready).
 */
function applyGermanNumfmtLocale(workbook: unknown, opts?: { silent?: boolean }): boolean {
  const setNumfmtLocal = (workbook as { setNumfmtLocal?: (locale: string) => unknown } | null | undefined)
    ?.setNumfmtLocal
  if (typeof setNumfmtLocal !== 'function') return false
  try {
    setNumfmtLocal.call(workbook, GERMAN_NUMFMT_LOCALE)
    return true
  } catch (error) {
    if (!opts?.silent) {
      console.error('[UniverSheetGrid] setNumfmtLocal failed:', error)
    }
    return false
  }
}

/**
 * Univer's workbook can expose setNumfmtLocal before the internal injector is wired;
 * calling immediately after createWorkbook throws (e.g. reading '_injector' of undefined).
 * Defer and retry briefly; failures are silent so devtools are not spammed for this race.
 */
function scheduleApplyGermanNumfmtLocale(univerAPI: { getActiveWorkbook?: () => unknown }): void {
  const tryApply = (): boolean => {
    const wb = univerAPI.getActiveWorkbook?.()
    return Boolean(wb && applyGermanNumfmtLocale(wb, { silent: true }))
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (tryApply()) return
      globalThis.setTimeout(() => {
        if (tryApply()) return
        globalThis.setTimeout(() => {
          tryApply()
        }, 150)
      }, 0)
    })
  })
}

function normalizeMenuText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function extractFormatMenuLabel(text: string): string | null {
  const normalized = normalizeMenuText(text)
  const previewMap = getNumfmtPreviewMap()
  const labels = Object.keys(previewMap).sort((a, b) => b.length - a.length)
  for (const label of labels) {
    if (normalized === label || normalized.startsWith(`${label} `)) return label
  }
  return null
}

export function getGermanNumfmtPattern(label: string): string | undefined {
  return getNumfmtPatternMap()[label]
}

/**
 * Locates the number-format dropdown list container using the same grid heuristic as
 * `tryInjectViaGridContainer`, but keyed on format-menu anchors and excluding cell context menus.
 */
function findNumfmtFormatMenuGrids(): HTMLElement[] {
  const anchorLabels = getNumfmtAnchorLabels()
  return Array.from(document.querySelectorAll<HTMLElement>('[class*="univer-grid"][class*="univer-gap-1"]')).filter(
    el => {
      const gridText = (el.textContent || '').toLowerCase()
      if (CONTEXT_MENU_ANCHOR_LABELS.some(lbl => gridText.includes(lbl.toLowerCase()))) return false
      if (!anchorLabels.every(lbl => gridText.includes(lbl.toLowerCase()))) return false
      const childGrids = el.querySelectorAll<HTMLElement>('[class*="univer-grid"][class*="univer-gap-1"]')
      for (const child of childGrids) {
        if (child === el) continue
        const childText = (child.textContent || '').toLowerCase()
        if (anchorLabels.every(lbl => childText.includes(lbl.toLowerCase()))) return false
      }
      return true
    }
  )
}

function patchGermanNumfmtMenuPreview(): void {
  if (typeof document === 'undefined') return
  const grids = findNumfmtFormatMenuGrids()
  if (grids.length === 0) return
  const previewMap = getNumfmtPreviewMap()
  for (const grid of grids) {
    const rows = grid.querySelectorAll<HTMLElement>(NUMFMT_GRID_ROW_SELECTOR)
    for (const row of rows) {
      const labelSpan = row.querySelector<HTMLElement>(':scope > span:first-child')
      if (!labelSpan) continue
      const label = normalizeMenuText(labelSpan.textContent || '')
      if (!label || !(label in previewMap)) continue
      const preview = previewMap[label]
      const previewSpan = row.querySelector<HTMLElement>(NUMFMT_ROW_PREVIEW_SPAN_SELECTOR)
      if (!previewSpan) continue
      if (normalizeMenuText(previewSpan.textContent || '') === normalizeMenuText(preview)) continue
      previewSpan.textContent = preview
    }
  }
}

/**
 * Univer's date format list (`DATEFMTLISG`) contains hardcoded Chinese labels
 * (年, 月, 日, 下午/上午). Replace them with locale-appropriate text so no
 * Chinese ever appears in the UI.
 */
const CHINESE_DATE_LABEL_REPLACEMENTS: Record<string, Record<string, string>> = {
  'en-US': {
    '1930年08月05日': 'Aug 05, 1930',
    '8月5日': 'Aug 5',
    '下午01:30': '01:30 PM',
    '下午1:30': '1:30 PM',
    '下午1:30:30': '1:30:30 PM',
    '08-05 下午 01:30': '08-05 01:30 PM'
  },
  'de-DE': {
    '1930年08月05日': '05.08.1930',
    '8月5日': '5. Aug.',
    '下午01:30': '13:30',
    '下午1:30': '13:30',
    '下午1:30:30': '13:30:30',
    '08-05 下午 01:30': '05.08. 13:30'
  }
}

const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/

/**
 * Gravity Platform hosts remote apps in a pane that uses plain Tailwind (`overflow-auto`, no `gba:`).
 * That outer pane scrolls the whole embedded UI so Univer's sheet-tab footer scrolls away.
 * Also, a `min-h-dvh` / oversized viewer can exceed the pane height while the shell still scrolls.
 * Patch: stop outer vertical scrolling and size the spreadsheet viewer root to the pane height.
 */
function patchEmbeddedSpreadsheetHostLayout(gridHost: HTMLElement): (() => void) | undefined {
  if (typeof document === 'undefined') return undefined

  let el: HTMLElement | null = gridHost.parentElement
  let scrollShell: HTMLElement | null = null
  while (el && el !== document.body) {
    const st = getComputedStyle(el)
    const cls = typeof el.className === 'string' ? el.className : ''
    const isGbaWrapper = cls.includes('gba:')
    const overflowsVertically =
      (st.overflowY === 'auto' || st.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1
    if (overflowsVertically && !isGbaWrapper) {
      scrollShell = el
      break
    }
    el = el.parentElement
  }

  if (!scrollShell) return undefined

  const prevShellOverflow = scrollShell.style.overflow
  const prevShellMinHeight = scrollShell.style.minHeight
  scrollShell.style.overflow = 'hidden'
  if (!scrollShell.style.minHeight) {
    scrollShell.style.minHeight = '0'
  }

  const viewerRoot = gridHost.closest<HTMLElement>('[data-testid="spreadsheet-app-viewer"], [data-testid$="-viewer"]')

  let restoreViewer: (() => void) | undefined
  if (viewerRoot && scrollShell.contains(viewerRoot)) {
    const slotHeight = scrollShell.clientHeight
    if (slotHeight > 0) {
      viewerRoot.style.setProperty('max-height', `${slotHeight}px`, 'important')
      viewerRoot.style.setProperty('height', `${slotHeight}px`, 'important')
      viewerRoot.style.setProperty('min-height', '0', 'important')
      restoreViewer = () => {
        viewerRoot.style.removeProperty('max-height')
        viewerRoot.style.removeProperty('height')
        viewerRoot.style.removeProperty('min-height')
      }
    }
  }

  return () => {
    scrollShell.style.overflow = prevShellOverflow
    scrollShell.style.minHeight = prevShellMinHeight
    if (!prevShellOverflow) scrollShell.style.removeProperty('overflow')
    if (!prevShellMinHeight) scrollShell.style.removeProperty('min-height')
    restoreViewer?.()
  }
}

function patchChineseDateLabels(): void {
  if (typeof document === 'undefined') return
  const replacements = CHINESE_DATE_LABEL_REPLACEMENTS[activeAppLocale] ?? CHINESE_DATE_LABEL_REPLACEMENTS['en-US']
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.textContent && CHINESE_CHAR_REGEX.test(node.textContent)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT
    }
  })
  let textNode: Text | null = null
  while ((textNode = walker.nextNode() as Text | null)) {
    const text = textNode.textContent ?? ''
    const replacement = replacements[text.trim()]
    if (replacement) {
      textNode.textContent = replacement
    }
  }
}

export const UniverSheetGrid = forwardRef<UniverSheetGridHandle, UniverSheetGridProps>(
  function UniverSheetGrid(props, ref) {
    const { locale: appLocale } = useTranslation(spreadsheetTranslations)
    activeAppLocale = appLocale

    const {
      sheet,
      data,
      columns,
      initialSnapshot,
      onCellChange,
      onCellsChange,
      onSnapshotRequested,
      onDataChange,
      onCursorEmit
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)
    /** Host element must be in state so the Univer bootstrap effect re-runs after the ref attaches (avoids one-shot `if (!containerRef.current) return` with no re-subscribe). */
    const [gridHostEl, setGridHostEl] = useState<HTMLDivElement | null>(null)
    // If a persisted snapshot initializes to a blank sheet (no canvas), retry once with a row-built snapshot.
    const [forceRowSnapshotSeed, setForceRowSnapshotSeed] = useState(0)
    const setGridHostRef = useCallback((node: HTMLDivElement | null) => {
      containerRef.current = node
      setGridHostEl(node)
    }, [])

    useLayoutEffect(() => {
      if (!gridHostEl) return undefined
      let cleanup: (() => void) | undefined
      const run = () => {
        if (!gridHostEl.isConnected) return
        cleanup?.()
        cleanup = patchEmbeddedSpreadsheetHostLayout(gridHostEl)
      }
      run()
      const t0 = window.setTimeout(run, 0)
      const t1 = window.setTimeout(run, 100)
      const raf = window.requestAnimationFrame(run)
      return () => {
        window.clearTimeout(t0)
        window.clearTimeout(t1)
        window.cancelAnimationFrame(raf)
        cleanup?.()
      }
    }, [gridHostEl])

    // Tracks whether this sheet is the currently active editor on the page.
    // Needed for published screens where the host app may register global shortcuts (e.g. Cmd+B).
    const isSheetInteractionActiveRef = useRef<boolean>(false)
    const univerAPIRef = useRef<ReturnType<typeof createUniver>['univerAPI'] | null>(null)
    const remoteEchoSuppressionRef = useRef<Map<string, RemoteEchoSuppressionEntry>>(new Map())
    const isDirtyRef = useRef(false)
    const hasEditedRef = useRef(false)
    const snapshotRequestInFlightRef = useRef<Promise<void> | null>(null)
    const snapshotRequestQueuedCountRef = useRef<number>(0)
    const snapshotCheckpointTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const requestSnapshotCheckpointRef = useRef<((force?: boolean) => void) | null>(null)
    const scheduleSnapshotCheckpointRef = useRef<((delayMs?: number) => void) | null>(null)
    const newRowClientIdByIndexRef = useRef<Map<number, string>>(new Map())
    const activeSelectionRef = useRef<{ row: number; col: number } | null>(null)
    const contextRef = useRef<ReturnType<typeof createUniverConversionContext> | null>(null)
    const propsRef = useRef({ sheet, data, columns, initialSnapshot })
    propsRef.current = { sheet, data, columns, initialSnapshot }
    const callbacksRef = useRef({
      onCellChange,
      onCellsChange,
      onSnapshotRequested,
      onDataChange,
      onCursorEmit,
      onDimensionsChange: props.onDimensionsChange,
      onOpenCommentRequest: props.onOpenCommentRequest,
      onActiveWorksheetChange: props.onActiveWorksheetChange
    })
    callbacksRef.current = {
      onCellChange,
      onCellsChange,
      onSnapshotRequested,
      onDataChange,
      onCursorEmit,
      onDimensionsChange: props.onDimensionsChange,
      onOpenCommentRequest: props.onOpenCommentRequest,
      onActiveWorksheetChange: props.onActiveWorksheetChange
    }
    const readOnlyRef = useRef(props.isReadOnly)
    readOnlyRef.current = props.isReadOnly
    const lastEmittedCursorPathRef = useRef<string>('')
    const lastEmittedWorksheetIdRef = useRef<string>('')
    // Caches actual column widths and row heights read from the workbook snapshot so that
    // cursor overlays match the real rendered cell dimensions (not hardcoded constants).
    const cellDimensionsRef = useRef<{
      defaultColWidth: number
      defaultRowHeight: number
      columnData: Record<string | number, { w?: number }>
      rowData: Record<string | number, { h?: number }>
      rowHeaderWidth: number
      columnHeaderHeight: number
      zoomRatio: number
    } | null>(null)
    // Tracks viewport scroll used by Univer canvas rendering.
    const sheetScrollRef = useRef<{ scrollLeft: number; scrollTop: number }>({ scrollLeft: 0, scrollTop: 0 })
    // Allows the Univer init effect to trigger a cursor position refresh on scroll
    const refreshCursorRectsRef = useRef<(() => void) | null>(null)
    const refreshCommentRectsRef = useRef<(() => void) | null>(null)
    const [cursorRects, setCursorRects] = useState<
      Record<string, { top: number; left: number; width: number; height: number }>
    >({})
    const [commentRects, setCommentRects] = useState<
      Record<string, { top: number; left: number; width: number; height: number }>
    >({})
    const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
    const remoteCursorOverlays = useMemo(
      () =>
        (props.participants ?? [])
          .map(participant => {
            const parsed = parseCursorPath(participant.cursor?.path)
            if (!parsed) return null
            return {
              id: `${participant.userId}-${parsed.row}-${parsed.col}`,
              userName: participant.userName || 'User',
              userColor: participant.userColor || '#4ECDC4',
              row: parsed.row,
              col: parsed.col
            }
          })
          .filter(
            (entry): entry is { id: string; userName: string; userColor: string; row: number; col: number } => !!entry
          ),
      [props.participants]
    )
    const supportedUniverFonts = useMemo(() => getSupportedUniverFonts(), [])
    const commentOverlays = useMemo(
      () =>
        (props.commentedCells ?? [])
          .map(comment => {
            const parsed = parseA1Reference(comment.cellReference)
            if (!parsed) return null
            return {
              id: comment.cellReference,
              ref: comment.cellReference,
              row: parsed.row,
              col: parsed.col,
              content: comment.content,
              createdByName: comment.createdByName,
              createdByAvatar: comment.createdByAvatar,
              createdAt: comment.createdAt
            }
          })
          .filter(
            (
              entry
            ): entry is {
              id: string
              ref: string
              row: number
              col: number
              content: string
              createdByName?: string
              createdByAvatar?: string
              createdAt?: string
            } => !!entry
          ),
      [props.commentedCells]
    )

    const resolveCellRect = useCallback(
      (row: number, col: number): { top: number; left: number; width: number; height: number } | null => {
        const api = univerAPIRef.current
        const container = containerRef.current
        if (!api || !container) return null
        try {
          const workbook = api.getActiveWorkbook?.()
          const worksheet = workbook?.getActiveSheet?.()
          if (!worksheet) return null

          // Use the snapshot cache for cell dimensions. Apply zoomRatio so overlays
          // match the actual rendered size when the user has zoomed the sheet.
          const dims = cellDimensionsRef.current
          const zoom = dims?.zoomRatio ?? 1
          const rowHeaderWidth = dims?.rowHeaderWidth ?? CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX
          const columnHeaderHeight = dims?.columnHeaderHeight ?? CURSOR_OVERLAY_HEADER_HEIGHT_PX
          const getColumnWidth = (c: number): number =>
            (dims?.columnData[c]?.w ?? dims?.defaultColWidth ?? CURSOR_OVERLAY_COL_WIDTH_PX) * zoom
          const getRowHeight = (r: number): number =>
            (dims?.rowData[r]?.h ?? dims?.defaultRowHeight ?? CURSOR_OVERLAY_ROW_HEIGHT_PX) * zoom

          let cellLeft = 0
          for (let c = 0; c < col; c++) cellLeft += getColumnWidth(c)
          let cellTop = 0
          for (let r = 0; r < row; r++) cellTop += getRowHeight(r)

          const containerBox = container.getBoundingClientRect()

          const scrollState = (
            worksheet as {
              getScrollState?: () => {
                sheetViewStartRow?: number
                sheetViewStartColumn?: number
                offsetX?: number
                offsetY?: number
              }
            }
          ).getScrollState?.()
          let scrollLeftFromState: number | undefined
          let scrollTopFromState: number | undefined
          if (scrollState) {
            const startCol = Math.max(0, scrollState.sheetViewStartColumn ?? 0)
            const startRow = Math.max(0, scrollState.sheetViewStartRow ?? 0)
            let left = 0
            let top = 0
            for (let c = 0; c < startCol; c++) left += getColumnWidth(c)
            for (let r = 0; r < startRow; r++) top += getRowHeight(r)
            left += scrollState.offsetX ?? 0
            top += scrollState.offsetY ?? 0
            scrollLeftFromState = left
            scrollTopFromState = top
          }
          const scrollLeft =
            typeof scrollLeftFromState === 'number' && Number.isFinite(scrollLeftFromState)
              ? scrollLeftFromState
              : sheetScrollRef.current.scrollLeft
          const scrollTop =
            typeof scrollTopFromState === 'number' && Number.isFinite(scrollTopFromState)
              ? scrollTopFromState
              : sheetScrollRef.current.scrollTop

          // Use the topmost canvas to find where the sheet grid starts vertically
          // (below the Univer toolbar and formula bar). We use canvas.top for the
          // vertical anchor, but NOT canvas.left — the sheet always fills the container
          // horizontally from x=0, so the horizontal anchor is just the row index width.
          // Using canvas.left causes incorrect results because Univer may render the cell
          // content canvas starting at an offset that varies by version/layout.
          const canvases = Array.from(container.querySelectorAll<HTMLCanvasElement>('canvas'))
          // Pick the largest canvas by pixel area — that is the main sheet rendering canvas,
          // which sits below the toolbar and formula bar. Smaller canvases belong to the
          // formula bar input, overlays, or other internal Univer UI components.
          const mainCanvas = canvases.reduce<HTMLCanvasElement | null>((best, c) => {
            if (!best) return c
            return c.width * c.height > best.width * best.height ? c : best
          }, null)

          if (mainCanvas) {
            const canvasBox = mainCanvas.getBoundingClientRect()
            return {
              // Vertical: canvas top + column header height + row offsets - viewport scroll
              top: canvasBox.top - containerBox.top + columnHeaderHeight + cellTop - scrollTop,
              // Horizontal: row index width + column offsets - viewport scroll
              left: rowHeaderWidth + cellLeft - scrollLeft,
              width: getColumnWidth(col),
              height: getRowHeight(row)
            }
          }

          return null
        } catch {
          return null
        }
      },
      []
    )

    useEffect(() => {
      if (remoteCursorOverlays.length === 0) {
        refreshCursorRectsRef.current = null
        setCursorRects({})
        return
      }
      const refresh = () => {
        const next: Record<string, { top: number; left: number; width: number; height: number }> = {}
        for (const cursor of remoteCursorOverlays) {
          const rect = resolveCellRect(cursor.row, cursor.col)
          if (rect) next[cursor.id] = rect
        }
        setCursorRects(prev => (areCursorRectsEqual(prev, next) ? prev : next))
      }
      refreshCursorRectsRef.current = refresh
      refresh()
      const onResize = () => refresh()
      const onScroll = () => refresh()
      globalThis.addEventListener('resize', onResize)
      globalThis.addEventListener('scroll', onScroll, true)
      return () => {
        refreshCursorRectsRef.current = null
        globalThis.removeEventListener('resize', onResize)
        globalThis.removeEventListener('scroll', onScroll, true)
      }
    }, [remoteCursorOverlays, resolveCellRect])

    useEffect(() => {
      if (commentOverlays.length === 0) {
        refreshCommentRectsRef.current = null
        setCommentRects({})
        setHoveredCommentId(null)
        return
      }
      const refresh = () => {
        const next: Record<string, { top: number; left: number; width: number; height: number }> = {}
        for (const marker of commentOverlays) {
          const rect = resolveCellRect(marker.row, marker.col)
          if (rect) next[marker.id] = { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        }
        setCommentRects(prev => {
          const prevKeys = Object.keys(prev)
          const nextKeys = Object.keys(next)
          if (prevKeys.length !== nextKeys.length) return next
          for (const key of nextKeys) {
            const p = prev[key]
            const n = next[key]
            if (!p) return next
            if (
              Math.abs(p.top - n.top) > 0.5 ||
              Math.abs(p.left - n.left) > 0.5 ||
              Math.abs(p.width - n.width) > 0.5 ||
              Math.abs((p.height ?? 0) - (n.height ?? 0)) > 0.5
            ) {
              return next
            }
          }
          return prev
        })
      }
      refreshCommentRectsRef.current = refresh
      refresh()
      // Retry when Univer canvas isn't ready yet — resolveCellRect can return null initially
      const retryId = globalThis.setTimeout(() => {
        refresh()
      }, 300)
      const onResize = () => refresh()
      const onScroll = () => refresh()
      globalThis.addEventListener('resize', onResize)
      globalThis.addEventListener('scroll', onScroll, true)
      return () => {
        globalThis.clearTimeout(retryId)
        refreshCommentRectsRef.current = null
        globalThis.removeEventListener('resize', onResize)
        globalThis.removeEventListener('scroll', onScroll, true)
      }
    }, [commentOverlays, resolveCellRect])

    useEffect(() => {
      if (!hoveredCommentId) return
      const stillExists = commentOverlays.some(marker => marker.id === hoveredCommentId)
      if (!stillExists) setHoveredCommentId(null)
    }, [commentOverlays, hoveredCommentId])

    // Callers should prefer passing A1-resolved coordinates (from cellRef) directly as rowIndex/colIndex.
    // The rowId fallback attempts to re-resolve via contextRef, but contextRef tracks the data prop
    // (not the Univer workbook), so it can be wrong after structural changes. See handleCollaborationOperation.
    const applyRemoteCellUpdate = useCallback((rowIndex: number, colIndex: number, value: unknown, rowId?: string) => {
      const tryApply = (attempt: number) => {
        const api = univerAPIRef.current
        if (!api) {
          if (attempt < 2) {
            globalThis.setTimeout(() => tryApply(attempt + 1), 150)
            return
          }
          console.warn('[UniverSheetGrid] applyRemoteCellUpdate: Univer API unavailable after retries')
          return
        }
        let resolvedRow = rowIndex
        if (rowId && contextRef.current) {
          const gridIndex = contextRef.current.rowIdToIndex.get(rowId)
          if (gridIndex !== undefined) {
            resolvedRow = gridIndex
          } else {
            const d = propsRef.current.data
            const fallback = d.findIndex(r => {
              const ids = [r._rowUuid, r._id, r.id].map(v => (v == null ? '' : String(v))).filter(Boolean)
              return ids.includes(rowId)
            })
            if (fallback >= 0) resolvedRow = fallback
          }
        }
        const expiresAt = Date.now() + REMOTE_ECHO_SUPPRESSION_TTL_MS
        const key = remoteEchoKey(resolvedRow, colIndex)
        remoteEchoSuppressionRef.current.set(key, { expiresAt, signature: toEchoSignature(value) })
        globalThis.setTimeout(() => {
          const current = remoteEchoSuppressionRef.current.get(key)
          if (current?.expiresAt === expiresAt) {
            remoteEchoSuppressionRef.current.delete(key)
          }
        }, REMOTE_ECHO_SUPPRESSION_TTL_MS + 50)
        try {
          const workbook = api.getActiveWorkbook()
          if (!workbook) {
            if (attempt < 2) {
              globalThis.setTimeout(() => tryApply(attempt + 1), 150)
              return
            }
            console.warn('[UniverSheetGrid] applyRemoteCellUpdate: no active workbook after retries')
            return
          }
          const worksheet = workbook.getActiveSheet()
          if (!worksheet) {
            if (attempt < 2) {
              globalThis.setTimeout(() => tryApply(attempt + 1), 150)
              return
            }
            console.warn('[UniverSheetGrid] applyRemoteCellUpdate: no active worksheet after retries')
            return
          }
          const range = worksheet.getRange(resolvedRow, colIndex)
          if (range) {
            range.setValue(value as any)
          } else {
            console.warn('[UniverSheetGrid] applyRemoteCellUpdate: getRange returned null', { resolvedRow, colIndex })
          }
        } catch (e) {
          console.error('[UniverSheetGrid] applyRemoteCellUpdate error:', e)
        }
      }
      tryApply(0)
    }, [])

    const getWorkbookSnapshot = useCallback((): Record<string, unknown> | null => {
      const api = univerAPIRef.current
      if (!api) return null
      try {
        const workbook = api.getActiveWorkbook()
        if (!workbook) return null
        const wb = workbook as unknown as {
          save?: () => unknown
          getSnapshot?: () => unknown
          snapshot?: unknown
        }
        const rawSnapshot = wb.save?.() ?? wb.getSnapshot?.() ?? wb.snapshot
        if (!rawSnapshot || typeof rawSnapshot !== 'object') return null

        // Ensure payload is JSON-serializable before sending to API.
        try {
          return structuredClone(rawSnapshot as Record<string, unknown>)
        } catch {
          try {
            return JSON.parse(JSON.stringify(rawSnapshot)) as Record<string, unknown>
          } catch (cloneError) {
            console.error('[UniverSheetGrid] snapshot is not serializable:', cloneError)
            return null
          }
        }
      } catch (e) {
        console.error('[UniverSheetGrid] getWorkbookSnapshot error:', e)
        return null
      }
    }, [])

    const applyRemoteDimensions = useCallback(
      (payload: CellDimensionsPayload) => {
        if (payload.sheetId !== sheet.id) return
        const currentColumnData = cellDimensionsRef.current?.columnData ?? {}
        cellDimensionsRef.current = {
          defaultColWidth: payload.defaultColWidth,
          defaultRowHeight: payload.defaultRowHeight,
          // Column widths are synchronized through durable column metadata. Applying
          // snapshot-derived columnData here can reintroduce an older width after a newer resize.
          columnData: currentColumnData,
          rowData: payload.rowData ?? {},
          rowHeaderWidth: payload.rowHeaderWidth,
          columnHeaderHeight: payload.columnHeaderHeight,
          zoomRatio: payload.zoomRatio
        }
        const api = univerAPIRef.current
        const worksheet = api?.getActiveWorkbook?.()?.getActiveSheet?.()
        if (
          worksheet &&
          typeof (worksheet as { setColumnWidth?: (col: number, w: number) => unknown }).setColumnWidth === 'function'
        ) {
          const ws = worksheet as {
            setColumnWidth: (col: number, w: number) => unknown
            setRowHeight: (row: number, h: number) => unknown
          }
          Object.entries(payload.rowData ?? {}).forEach(([rowStr, meta]) => {
            const h = meta?.h
            if (typeof h === 'number' && h > 0) ws.setRowHeight(Number(rowStr), h)
          })
        }
        refreshCursorRectsRef.current?.()
        refreshCommentRectsRef.current?.()
      },
      [sheet.id]
    )

    const getVisibleRangeValues = useCallback(
      (rowCount: number, colCount: number): Record<number, Record<number, unknown>> | null => {
        const api = univerAPIRef.current
        if (!api) return null
        try {
          const workbook = api.getActiveWorkbook()
          const worksheet = workbook?.getActiveSheet?.()
          if (!worksheet) return null

          const values: Record<number, Record<number, unknown>> = {}
          const safeRowCount = Math.max(0, Math.min(rowCount, 1000))
          let effectiveMaxCol = Math.max(0, Math.min(colCount, 256))
          for (let row = 0; row < safeRowCount; row++) {
            for (let col = 0; col < effectiveMaxCol; col++) {
              try {
                const range = worksheet.getRange?.(row, col)
                const value =
                  (range as { getValue?: () => unknown })?.getValue?.() ??
                  (range as { getCellData?: () => { v?: unknown } })?.getCellData?.()?.v
                if (value === undefined) continue
                if (!values[row]) values[row] = {}
                values[row][col] = value
              } catch {
                effectiveMaxCol = col
                break
              }
            }
          }
          return values
        } catch (e) {
          console.error('[UniverSheetGrid] getVisibleRangeValues error:', e)
          return null
        }
      },
      []
    )

    const getActiveCellReference = useCallback((): string | null => {
      const active =
        activeSelectionRef.current ?? extractActiveRangePosition(univerAPIRef.current?.getActiveWorkbook?.())
      if (!active) return null
      const a1 = toA1Reference(active.row, active.col)
      return a1 || null
    }, [])

    const toCellDimensionsPayload = useCallback(
      (dims: SnapshotDimensions): CellDimensionsPayload => ({
        sheetId: sheet.id,
        defaultColWidth: dims.defaultColWidth,
        defaultRowHeight: dims.defaultRowHeight,
        columnData: dims.columnData,
        rowData: dims.rowData,
        rowHeaderWidth: dims.rowHeaderWidth,
        columnHeaderHeight: dims.columnHeaderHeight,
        zoomRatio: dims.zoomRatio
      }),
      [sheet.id]
    )

    useEffect(() => {
      const container = containerRef.current
      if (!container || props.isReadOnly) return

      const customMarkerAttr = 'data-univer-custom-comment-item'
      const customClassName = 'univer-custom-comment-item'
      const openLinkMarkerAttr = 'data-univer-open-link-item'
      const openLinkClassName = 'univer-open-link-item'
      let contextMenuObserver: MutationObserver | null = null

      const createCommentItem = (template: HTMLElement) =>
        createContextMenuItem(template, customMarkerAttr, customClassName, 'Add comment', () => {
          callbacksRef.current.onOpenCommentRequest?.()
        })

      const injectComment = (x: number, y: number) =>
        tryInjectContextMenuItem(x, y, customMarkerAttr, createCommentItem)
      const injectOpenLink = (x: number, y: number) => {
        const wb = univerAPIRef.current?.getActiveWorkbook?.()
        const active = activeSelectionRef.current ?? extractActiveRangePosition(wb)
        if (active == null) return false
        const { data, columns, sheet } = propsRef.current
        let cellFormula: string | null = null
        try {
          const snap =
            (wb as { save?: () => unknown; getSnapshot?: () => unknown })?.save?.() ??
            (wb as { getSnapshot?: () => unknown })?.getSnapshot?.()
          const sheets =
            snap && typeof snap === 'object'
              ? ((snap as Record<string, unknown>).sheets as Record<
                  string,
                  { cellData?: Record<number | string, Record<number | string, { f?: string }>> }
                >)
              : null
          const sheetId =
            sheet?.id ??
            (Array.isArray((snap as Record<string, unknown>)?.sheetOrder)
              ? (snap as { sheetOrder: string[] }).sheetOrder[0]
              : '')
          const ws = sheetId ? sheets?.[sheetId] : null
          const rowCells = ws?.cellData?.[active.row] ?? ws?.cellData?.[String(active.row)]
          const cell =
            rowCells && typeof rowCells === 'object' ? (rowCells[active.col] ?? rowCells[String(active.col)]) : null
          if (cell?.f) cellFormula = cell.f
        } catch {
          /* ignore */
        }
        const url = getHyperlinkUrlFromSelection(active.row, active.col, data, columns, cellFormula)
        if (!url) return false
        return tryInjectContextMenuItem(x, y, openLinkMarkerAttr, (template: HTMLElement) =>
          createContextMenuItem(template, openLinkMarkerAttr, openLinkClassName, 'Open link', () => {
            window.open(url, '_blank', 'noopener,noreferrer')
          })
        )
      }

      const stopObserver = () => {
        if (contextMenuObserver) {
          contextMenuObserver.disconnect()
          contextMenuObserver = null
        }
      }

      const pollInjection = (x: number, y: number, attempts: { count: number }, maxAttempts: number) => {
        attempts.count += 1
        hideProtectContextMenuItem()
        injectOpenLink(x, y)
        if (injectComment(x, y)) {
          stopObserver()
          return
        }
        if (attempts.count < maxAttempts) {
          globalThis.setTimeout(() => pollInjection(x, y, attempts, maxAttempts), 50)
        } else {
          stopObserver()
        }
      }

      const onNativeContextMenu = (e: MouseEvent) => {
        const x = e.clientX
        const y = e.clientY
        const attempts = { count: 0 }
        stopObserver()
        contextMenuObserver = new MutationObserver(() => {
          hideProtectContextMenuItem()
          injectOpenLink(x, y)
          if (injectComment(x, y)) stopObserver()
        })
        contextMenuObserver.observe(document.body, { childList: true, subtree: true })
        scheduleContextMenuInjectionPoll(() => pollInjection(x, y, attempts, 40))
      }

      container.addEventListener('contextmenu', onNativeContextMenu, true)
      return () => {
        stopObserver()
        container.removeEventListener('contextmenu', onNativeContextMenu, true)
      }
    }, [props.isReadOnly])

    useEffect(() => {
      if (props.isReadOnly) return
      if (!gridHostEl) return

      const applyGermanPatternToActiveRange = (label: string) => {
        const pattern = getGermanNumfmtPattern(label)
        if (!pattern) return
        const workbook = univerAPIRef.current?.getActiveWorkbook?.() as
          | { getActiveRange?: () => { setNumberFormat?: (nextPattern: string) => unknown } | null }
          | undefined
        const range = workbook?.getActiveRange?.()
        if (!range || typeof range.setNumberFormat !== 'function') return
        try {
          range.setNumberFormat(pattern)
        } catch (error) {
          console.error('[UniverSheetGrid] setNumberFormat override failed:', error)
        }
      }

      /**
       * Toolbar overflow (⋮) and Radix popovers often mount outside `containerRef`. A capture listener
       * on the grid host never runs, so we observe `document.body` and rAF-debounce patches — including
       * `characterData` so React text updates are re-overridden.
       */
      let rafScheduled = 0
      const scheduleNumfmtMenuPatch = () => {
        if (rafScheduled !== 0) return
        rafScheduled = globalThis.requestAnimationFrame(() => {
          rafScheduled = 0
          patchGermanNumfmtMenuPreview()
          patchChineseDateLabels()
          hideUnwantedRibbonTabs()
        })
      }

      const observer = new globalThis.MutationObserver(() => {
        scheduleNumfmtMenuPatch()
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      scheduleNumfmtMenuPatch()

      /** Univer re-applies `Dt(pattern)` to preview spans on render; re-patch on a timer while the sheet is mounted. */
      const numfmtPreviewIntervalId = globalThis.setInterval(() => {
        patchGermanNumfmtMenuPreview()
        patchChineseDateLabels()
        hideUnwantedRibbonTabs()
      }, 200)

      const onNumfmtMenuItemClickCapture = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null
        if (!target) return
        const row = target.closest(NUMFMT_MENU_ITEM_ROW_SELECTOR) as HTMLElement | null
        if (!row) return
        const grids = findNumfmtFormatMenuGrids()
        if (!grids.some(g => g.contains(row))) return
        const labelSpan = row.querySelector<HTMLElement>(':scope > span:first-child')
        const label = labelSpan ? normalizeMenuText(labelSpan.textContent || '') : null
        if (!label) return
        globalThis.setTimeout(() => {
          applyGermanPatternToActiveRange(label)
          scheduleNumfmtMenuPatch()
        }, 0)
      }

      document.addEventListener('click', onNumfmtMenuItemClickCapture, true)

      return () => {
        observer.disconnect()
        globalThis.clearInterval(numfmtPreviewIntervalId)
        if (rafScheduled !== 0) {
          globalThis.cancelAnimationFrame(rafScheduled)
          rafScheduled = 0
        }
        document.removeEventListener('click', onNumfmtMenuItemClickCapture, true)
      }
    }, [props.isReadOnly, gridHostEl])

    useEffect(() => {
      const container = containerRef.current
      if (!container) return
      const handleLinkClick = () => {
        const wb = univerAPIRef.current?.getActiveWorkbook?.()
        const active = activeSelectionRef.current ?? extractActiveRangePosition(wb)
        if (active == null) return
        const { data, columns, sheet } = propsRef.current
        let cellFormula: string | null = null
        try {
          const snap =
            (wb as { save?: () => unknown; getSnapshot?: () => unknown })?.save?.() ??
            (wb as { getSnapshot?: () => unknown })?.getSnapshot?.()
          const sheets =
            snap && typeof snap === 'object'
              ? ((snap as Record<string, unknown>).sheets as Record<
                  string,
                  { cellData?: Record<number | string, Record<number | string, { f?: string }>> }
                >)
              : null
          const sheetId =
            sheet?.id ??
            (Array.isArray((snap as Record<string, unknown>)?.sheetOrder)
              ? (snap as { sheetOrder: string[] }).sheetOrder[0]
              : '')
          const ws = sheetId ? sheets?.[sheetId] : null
          const rowCells = ws?.cellData?.[active.row] ?? ws?.cellData?.[String(active.row)]
          const cell =
            rowCells && typeof rowCells === 'object' ? (rowCells[active.col] ?? rowCells[String(active.col)]) : null
          if (cell?.f) cellFormula = cell.f
        } catch {
          /* ignore */
        }
        const url = getHyperlinkUrlFromSelection(active.row, active.col, data, columns, cellFormula)
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
      }
      const onCaptureClick = (e: MouseEvent) => {
        if (e.detail > 1) return
        if (!container.contains(e.target as Node)) return
        globalThis.setTimeout(handleLinkClick, 50)
      }
      document.addEventListener('click', onCaptureClick, true)
      return () => document.removeEventListener('click', onCaptureClick, true)
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        applyRemoteCellUpdate,
        getWorkbookSnapshot,
        getVisibleRangeValues,
        applyRemoteDimensions,
        getActiveCellReference
      }),
      [applyRemoteCellUpdate, getWorkbookSnapshot, getVisibleRangeValues, applyRemoteDimensions, getActiveCellReference]
    )

    // Keep conversion context in sync when data/columns change (e.g. after save) so value-change handler maps indices correctly.
    useEffect(() => {
      if (!univerAPIRef.current) return
      contextRef.current = createUniverConversionContext(columns, data)
    }, [data, columns])

    useEffect(() => {
      const api = univerAPIRef.current
      const worksheet = api?.getActiveWorkbook?.()?.getActiveSheet?.()
      if (
        !worksheet ||
        typeof (worksheet as { setColumnWidth?: (col: number, w: number) => unknown }).setColumnWidth !== 'function'
      ) {
        return
      }

      const ws = worksheet as { setColumnWidth: (col: number, w: number) => unknown }
      const nextColumnData = { ...(cellDimensionsRef.current?.columnData ?? {}) }
      const visibleColumns = columns.filter(column => column.isVisible !== false)
      visibleColumns.forEach((column, index) => {
        if (typeof column.width === 'number' && Number.isFinite(column.width) && column.width > 0) {
          ws.setColumnWidth(index, column.width)
          nextColumnData[index] = { ...(nextColumnData[index] ?? {}), w: column.width }
        }
      })
      cellDimensionsRef.current = cellDimensionsRef.current
        ? { ...cellDimensionsRef.current, columnData: nextColumnData }
        : {
            defaultColWidth: CURSOR_OVERLAY_COL_WIDTH_PX,
            defaultRowHeight: CURSOR_OVERLAY_ROW_HEIGHT_PX,
            columnData: nextColumnData,
            rowData: {},
            rowHeaderWidth: 48,
            columnHeaderHeight: 28,
            zoomRatio: 1
          }
    }, [columns])

    // Fallback interval: separate from Univer lifecycle so it keeps running even if the Univer effect re-runs.
    useEffect(() => {
      const FALLBACK_INTERVAL_MS = 10000
      const id = setInterval(() => {
        if (!hasEditedRef.current) return
        const req = requestSnapshotCheckpointRef.current
        if (!req || snapshotRequestInFlightRef.current) return
        req(true)
      }, FALLBACK_INTERVAL_MS)
      return () => clearInterval(id)
    }, [])

    // Background tabs heavily throttle timers; the debounced snapshot checkpoint can be skipped or delayed
    // long enough that users see "Unsaved" without univer-snapshot traffic. Re-arm when the tab is visible again.
    useEffect(() => {
      if (typeof document === 'undefined') return
      const onVisibilityChange = () => {
        if (document.visibilityState !== 'visible') return
        if (readOnlyRef.current) return
        const schedule = scheduleSnapshotCheckpointRef.current
        if (!schedule || !hasEditedRef.current) return
        schedule(0)
      }
      document.addEventListener('visibilitychange', onVisibilityChange)
      return () => document.removeEventListener('visibilitychange', onVisibilityChange)
    }, [])

    useEffect(() => {
      setForceRowSnapshotSeed(0)
    }, [sheet.id, props.snapshotSeed])

    // Recreate Univer only when the workbook identity/bootstrap changes.
    // In multi-sheet mode the remount key stays stable across tab switches so the shared
    // workbook instance keeps unsaved in-memory sheet state instead of resetting per tab.
    useEffect(() => {
      if (!gridHostEl) return
      newRowClientIdByIndexRef.current.clear()
      lastEmittedWorksheetIdRef.current = ''
      const { sheet: s, data: d, columns: c, initialSnapshot: initialSnapshotForSheet } = propsRef.current
      let snapshotForInit: UniverWorkbookSnapshot
      try {
        if (initialSnapshotForSheet && typeof initialSnapshotForSheet === 'object' && forceRowSnapshotSeed === 0) {
          snapshotForInit = initialSnapshotForSheet as UniverWorkbookSnapshot
          transformAvatarFormulasInSnapshot(snapshotForInit as unknown as Record<string, unknown>, c)
        } else {
          snapshotForInit = buildWorkbookSnapshot(s, d, c)
        }
      } catch (e) {
        console.error('[UniverSheetGrid] buildWorkbookSnapshot error:', e)
        return
      }
      contextRef.current = createUniverConversionContext(c, d)

      const univerLocaleData =
        appLocale === 'de-DE'
          ? mergeLocales(UniverPresetSheetsCoreEnUS, UNIVER_NUMFMT_DE_LOCALE)
          : mergeLocales(UniverPresetSheetsCoreEnUS)

      const { univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: univerLocaleData
        },
        presets: [
          UniverSheetsCorePreset({
            container: gridHostEl,
            customFontFamily: {
              override: true,
              list: supportedUniverFonts
            }
          })
        ]
      })

      const initDims = extractDimensionsFromSnapshot(snapshotForInit as unknown as Record<string, unknown>)
      if (initDims) cellDimensionsRef.current = initDims

      univerAPIRef.current = univerAPI
      try {
        univerAPI.createWorkbook(snapshotForInit as unknown as Record<string, unknown>)
        scheduleApplyGermanNumfmtLocale(univerAPI)
      } catch (error) {
        console.error('[UniverSheetGrid] createWorkbook error:', error)
        if (initialSnapshotForSheet && forceRowSnapshotSeed === 0) {
          console.warn('[UniverSheetGrid] Falling back to row-built snapshot after createWorkbook failure')
          setForceRowSnapshotSeed(Date.now())
        }
        univerAPI.dispose()
        univerAPIRef.current = null
        contextRef.current = null
        return
      }

      const emitWorksheetFromUniver = () => {
        try {
          const wb = univerAPIRef.current?.getActiveWorkbook?.() as
            | {
                getActiveSheet?: () => { getSheetId?: () => string; getSheetName?: () => string }
              }
            | undefined
          const activeWorksheet = wb?.getActiveSheet?.()
          const worksheetId = activeWorksheet?.getSheetId?.()
          if (!worksheetId || worksheetId === lastEmittedWorksheetIdRef.current) return
          lastEmittedWorksheetIdRef.current = worksheetId
          const worksheetName =
            typeof activeWorksheet?.getSheetName === 'function' ? activeWorksheet.getSheetName() : ''
          callbacksRef.current.onActiveWorksheetChange?.(worksheetId, worksheetName)
        } catch {
          /* ignore */
        }
      }

      queueMicrotask(() => {
        try {
          const wb = univerAPI.getActiveWorkbook?.() as { setActiveSheet?: (id: string) => void } | undefined
          wb?.setActiveSheet?.(s.id)
        } catch {
          /* ignore */
        }
        emitWorksheetFromUniver()
      })
      const canvasHealthTimeout = globalThis.setTimeout(() => {
        const host = containerRef.current
        const hasCanvas = Boolean(host?.querySelector('canvas'))
        if (hasCanvas) return
        if (!initialSnapshotForSheet || forceRowSnapshotSeed !== 0) return
        console.warn('[UniverSheetGrid] No canvas after snapshot bootstrap; retrying with row-built snapshot', {
          sheetId: s.id,
          columns: c.length,
          rows: d.length
        })
        setForceRowSnapshotSeed(Date.now())
      }, 1500)

      // Re-read from Univer after it hydrates (handles column/row resizes, Excel imports, etc.)
      const updateCellDimensions = (): { changed: boolean; dimensions: SnapshotDimensions | null } => {
        try {
          const wb = univerAPIRef.current?.getActiveWorkbook() as unknown as {
            save?: () => Record<string, unknown>
            getSnapshot?: () => Record<string, unknown>
          } | null
          const snap = wb?.save?.() ?? wb?.getSnapshot?.()
          const d = snap ? extractDimensionsFromSnapshot(snap) : null
          if (!d) return { changed: false, dimensions: null }
          const changed = !areSnapshotDimensionsEqual(cellDimensionsRef.current, d)
          cellDimensionsRef.current = d
          if (changed) {
            refreshCursorRectsRef.current?.()
            refreshCommentRectsRef.current?.()
          }
          return { changed, dimensions: d }
        } catch {
          return { changed: false, dimensions: null }
        }
      }
      setTimeout(updateCellDimensions, 200)

      const SNAPSHOT_TIMEOUT_MS = 10000
      const requestSnapshotCheckpoint = (force = false) => {
        const onSnapshotRequestedCb = callbacksRef.current.onSnapshotRequested
        if (!onSnapshotRequestedCb) return
        if (!force && !isDirtyRef.current) return
        if (snapshotRequestInFlightRef.current) {
          snapshotRequestQueuedCountRef.current += 1
          return
        }
        try {
          const result = onSnapshotRequestedCb()
          const promise = Promise.resolve(result) as Promise<void>
          snapshotRequestInFlightRef.current = promise
          const timeoutId = setTimeout(() => {
            if (snapshotRequestInFlightRef.current === promise) {
              snapshotRequestInFlightRef.current = null
              if (snapshotRequestQueuedCountRef.current > 0) {
                snapshotRequestQueuedCountRef.current -= 1
                requestSnapshotCheckpoint(true)
              }
            }
          }, SNAPSHOT_TIMEOUT_MS)
          void promise
            .then(() => {
              isDirtyRef.current = false
            })
            .catch(() => {
              // Keep dirty; we'll retry on the next trigger.
            })
            .finally(() => {
              clearTimeout(timeoutId)
              snapshotRequestInFlightRef.current = null
              if (snapshotRequestQueuedCountRef.current > 0) {
                snapshotRequestQueuedCountRef.current -= 1
                requestSnapshotCheckpoint(true)
              }
            })
        } catch {
          // Keep dirty
          if (snapshotRequestQueuedCountRef.current > 0) {
            snapshotRequestQueuedCountRef.current -= 1
            requestSnapshotCheckpoint(true)
          }
        }
      }
      // 2000ms gives the cell-flush debounce (400ms) + API round-trip time to finish
      // before we snapshot, so the saved snapshot always reflects a persisted version.
      const scheduleSnapshotCheckpoint = (delayMs = 2000) => {
        if (snapshotCheckpointTimerRef.current) {
          clearTimeout(snapshotCheckpointTimerRef.current)
        }
        snapshotCheckpointTimerRef.current = setTimeout(() => {
          snapshotCheckpointTimerRef.current = null
          requestSnapshotCheckpoint(true)
        }, delayMs)
      }
      requestSnapshotCheckpointRef.current = requestSnapshotCheckpoint
      scheduleSnapshotCheckpointRef.current = scheduleSnapshotCheckpoint
      const markDirtyAndScheduleSnapshot = () => {
        isDirtyRef.current = true
        hasEditedRef.current = true
        scheduleSnapshotCheckpoint()
      }
      const handleSheetScroll = (scrollLeft: number, scrollTop: number) => {
        sheetScrollRef.current = { scrollLeft, scrollTop }
        refreshCursorRectsRef.current?.()
        refreshCommentRectsRef.current?.()
      }
      let scrollStateReadBlockedUntil = 0
      const syncScrollFromWorksheet = () => {
        if (Date.now() < scrollStateReadBlockedUntil) return
        const workbook = univerAPI.getActiveWorkbook?.()
        const worksheet = workbook?.getActiveSheet?.()
        if (!worksheet) return
        const dims = cellDimensionsRef.current
        const zoom = dims?.zoomRatio ?? 1
        const getColumnWidth = (c: number): number =>
          (dims?.columnData[c]?.w ?? dims?.defaultColWidth ?? CURSOR_OVERLAY_COL_WIDTH_PX) * zoom
        const getRowHeight = (r: number): number =>
          (dims?.rowData[r]?.h ?? dims?.defaultRowHeight ?? CURSOR_OVERLAY_ROW_HEIGHT_PX) * zoom
        let scrollState:
          | {
              sheetViewStartRow?: number
              sheetViewStartColumn?: number
              offsetX?: number
              offsetY?: number
            }
          | undefined
        try {
          scrollState = (
            worksheet as
              | {
                  getScrollState?: () => {
                    sheetViewStartRow?: number
                    sheetViewStartColumn?: number
                    offsetX?: number
                    offsetY?: number
                  }
                }
              | undefined
          )?.getScrollState?.()
        } catch {
          // Univer can throw while DI graph is still bootstrapping; retry shortly.
          scrollStateReadBlockedUntil = Date.now() + 500
          return
        }
        if (!scrollState) return
        const startCol = Math.max(0, scrollState.sheetViewStartColumn ?? 0)
        const startRow = Math.max(0, scrollState.sheetViewStartRow ?? 0)
        let left = 0
        let top = 0
        for (let c = 0; c < startCol; c++) left += getColumnWidth(c)
        for (let r = 0; r < startRow; r++) top += getRowHeight(r)
        left += scrollState.offsetX ?? 0
        top += scrollState.offsetY ?? 0
        if (Number.isFinite(left) && Number.isFinite(top)) {
          handleSheetScroll(left, top)
        }
      }
      // Seed initial scroll and keep in sync through events + lightweight polling fallback.
      syncScrollFromWorksheet()
      const scrollEventName = (univerAPI as { Event?: { Scroll?: string } }).Event?.Scroll ?? 'Scroll'
      const scrollEventDisposable = (
        univerAPI as {
          addEvent?(
            event: string,
            cb: (p: {
              sheetViewStartRow?: number
              sheetViewStartColumn?: number
              offsetX?: number
              offsetY?: number
            }) => void
          ): { dispose(): void }
        }
      ).addEvent?.(scrollEventName, () => {
        syncScrollFromWorksheet()
      })
      const activeWorksheet = univerAPI.getActiveWorkbook?.()?.getActiveSheet?.()
      const worksheetScrollDisposable = (
        activeWorksheet as {
          onScroll?: (cb: (s: unknown) => void) => { dispose(): void }
        }
      )?.onScroll?.(() => {
        syncScrollFromWorksheet()
      })
      const scrollPollIntervalId = setInterval(syncScrollFromWorksheet, 120)

      const commandEventKey =
        (univerAPI as { Event?: { CommandExecuted?: string } }).Event?.CommandExecuted ?? 'CommandExecuted'
      const commandDisposable = (
        univerAPI as {
          addEvent?(
            event: string,
            cb: (p: { type?: number; id?: string; commandId?: string; params?: unknown }) => void
          ): { dispose(): void }
        }
      ).addEvent?.(commandEventKey, (event: { type?: number; id?: string; commandId?: string; params?: unknown }) => {
        const commandId = String(event?.id ?? event?.commandId ?? '').toLowerCase()
        if (commandId.includes('comment') || commandId.includes('thread')) {
          callbacksRef.current.onOpenCommentRequest?.()
        }
        queueMicrotask(emitWorksheetFromUniver)
        if (readOnlyRef.current) return
        const { changed: dimensionsChanged, dimensions } = updateCellDimensions()
        if (dimensionsChanged) {
          if (dimensions) {
            callbacksRef.current.onDimensionsChange?.(toCellDimensionsPayload(dimensions))
          }
          markDirtyAndScheduleSnapshot()
        }
        const t = event?.type
        // Only MUTATION (type 2) represents an actual data change. COMMAND (type 0)
        // includes selection/navigation commands which must not trigger snapshots.
        if (t === UNIVER_COMMAND_TYPE_MUTATION) {
          markDirtyAndScheduleSnapshot()
        }
      })
      const eventKey =
        (univerAPI as { Event?: { SheetValueChanged?: string } }).Event?.SheetValueChanged ?? 'SheetValueChanged'
      const valueChangeDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.(
        eventKey,
        (params: {
          effectedRanges?: Array<{
            getRange?: () => { startRow: number; endRow: number; startColumn: number; endColumn: number }
          }>
          payload?: {
            id?: string
            params?: {
              cellValue?: Record<number, Record<number, { v?: unknown }>>
              range?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
            }
          }
        }) => {
          if (readOnlyRef.current) return
          const payload = params?.payload
          let cellValue = normalizeCellMatrix(payload?.params?.cellValue)
          if (!cellValue) {
            // Fallback: derive changed values from effected ranges when mutation payload
            // does not provide `cellValue` (observed in some Univer command variants).
            const workbook = univerAPIRef.current?.getActiveWorkbook()
            const worksheet = workbook?.getActiveSheet()
            const ranges = (payload?.params?.range ??
              params.effectedRanges?.map(r => r.getRange?.()).filter(Boolean) ??
              []) as Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
            cellValue = deriveCellMatrixFromRanges(worksheet, ranges)
          }
          // Paste/edit mutations can use different internal command ids across Univer versions.
          // Persist whenever mutation payload carries concrete cell values.
          if (!cellValue) return
          const range = payload?.params?.range?.[0] ?? params.effectedRanges?.[0]?.getRange?.()
          const { rowOffset, colOffset } = resolveCellOffsets(range, cellValue)
          const now = Date.now()
          const shouldSuppress = (globalRowIndex: number, globalColIndex: number, value: unknown): boolean => {
            const key = remoteEchoKey(globalRowIndex, globalColIndex)
            const entry = remoteEchoSuppressionRef.current.get(key)
            if (!entry) return false
            if (now > entry.expiresAt) {
              remoteEchoSuppressionRef.current.delete(key)
              return false
            }
            return entry.signature === toEchoSignature(value)
          }

          let hasNonSuppressedCell = false
          for (const rowKey of Object.keys(cellValue)) {
            const rowIndex = Number(rowKey)
            if (Number.isNaN(rowIndex)) continue
            const rowCells = cellValue[rowIndex]
            if (!rowCells || typeof rowCells !== 'object') continue
            const globalRowIndex = rowIndex + rowOffset
            for (const colKey of Object.keys(rowCells)) {
              const colIndex = Number(colKey)
              if (Number.isNaN(colIndex)) continue
              const globalColIndex = colIndex + colOffset
              const cell = rowCells[colIndex]
              if (!shouldSuppress(globalRowIndex, globalColIndex, cell)) {
                hasNonSuppressedCell = true
                break
              }
            }
            if (hasNonSuppressedCell) break
          }

          if (!hasNonSuppressedCell) return

          isDirtyRef.current = true
          hasEditedRef.current = true
          scheduleSnapshotCheckpoint()
          const ctxBefore = contextRef.current
          const {
            onCellChange: onCellChangeCb,
            onCellsChange: onCellsChangeCb,
            onDataChange: onDataChangeCb
          } = callbacksRef.current
          if (!ctxBefore) return
          const currentData = propsRef.current.data
          const newRowIndices = getNewRowIndices(cellValue, ctxBefore, rowOffset)
          if (newRowIndices.length > 0 && onDataChangeCb) {
            const newRows = buildNewRowsFromCellMatrix({
              newRowIndices,
              cellValue,
              ctx: ctxBefore,
              colOffset,
              rowOffset,
              getClientRowId: (globalRowIndex: number) =>
                getOrCreateClientRowId(globalRowIndex, newRowClientIdByIndexRef.current)
            })
            const nextData = [...currentData, ...newRows]
            onDataChangeCb(nextData)
            // Keep mapping up to date immediately so subsequent events in the same paste burst can resolve rowIds.
            contextRef.current = createUniverConversionContext(propsRef.current.columns, nextData)
          }

          const ctx = contextRef.current ?? ctxBefore
          const changedCells = collectChangedCells({ cellValue, ctx, rowOffset, colOffset, shouldSuppress })

          if (changedCells.length > 0 && onCellsChangeCb) {
            onCellsChangeCb(changedCells)
            // Do NOT call requestSnapshotCheckpoint here. At this point the cell flush
            // (schedulePendingCellPersist) has not yet run, so the sheet version has not
            // been bumped. A snapshot saved now would be immediately stale. The debounced
            // CommandExecuted snapshot (fired below) runs after the flush completes and
            // captures the correct version.
            return
          }

          if (changedCells.length > 0 && onCellChangeCb) {
            for (const cell of changedCells) {
              onCellChangeCb(cell.rowId, cell.columnName, cell.value)
            }
            // Same reasoning: snapshot is triggered by CommandExecuted, not here.
          }
        }
      )
      const selectionEventKey =
        (univerAPI as { Event?: { SelectionMoveEnd?: string } }).Event?.SelectionMoveEnd ?? 'SelectionMoveEnd'
      // Emits cursor position using A1 notation (cellRef) as the primary coordinate.
      // row:/col: entries are kept for backward compatibility.
      const emitCursorByRowCol = (startRow: number, startColumn: number) => {
        activeSelectionRef.current = { row: startRow, col: startColumn }
        const onCursorEmitCb = callbacksRef.current.onCursorEmit
        if (!onCursorEmitCb) return
        const a1 = toA1Reference(startRow, startColumn)
        const path = [`cellRef:${a1}`, `row:${startRow}`, `col:${startColumn}`]
        const signature = path.join('|')
        if (lastEmittedCursorPathRef.current === signature) return
        lastEmittedCursorPathRef.current = signature
        onCursorEmitCb({ path })
      }
      const emitCursorFromWorksheetSelection = () => {
        const workbook = univerAPIRef.current?.getActiveWorkbook?.()
        const fromRange = extractActiveRangePosition(workbook)
        if (fromRange) {
          emitCursorByRowCol(fromRange.row, fromRange.col)
          return
        }
        const worksheet = workbook?.getActiveSheet?.()
        const selection = (
          worksheet as { getSelection?: () => { getCurrentCell?: () => unknown } | null } | undefined
        )?.getSelection?.()
        const currentCell = selection?.getCurrentCell?.() as
          | { actualRow?: number; actualColumn?: number; row?: number; column?: number }
          | undefined
        const row = currentCell?.actualRow ?? currentCell?.row
        const col = currentCell?.actualColumn ?? currentCell?.column
        if (typeof row !== 'number' || typeof col !== 'number') return
        emitCursorByRowCol(row, col)
      }
      const emitCursorFromSelectionEvent = (event: unknown) => {
        const pos = extractSelectionFromEvent(event)
        if (!pos) return
        emitCursorByRowCol(pos.row, pos.col)
      }
      const selectionDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.(selectionEventKey, emitCursorFromSelectionEvent)
      const selectionChangeDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.('SelectionChanged', emitCursorFromSelectionEvent)
      const currentSelectionChangeDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.('CurrentSelectionChanged', emitCursorFromSelectionEvent)
      const cursorPollIntervalId = setInterval(emitCursorFromWorksheetSelection, 300)

      const dispose = () => {
        requestSnapshotCheckpointRef.current = null
        scheduleSnapshotCheckpointRef.current = null
        clearTimeout(canvasHealthTimeout)
        if (snapshotCheckpointTimerRef.current) {
          clearTimeout(snapshotCheckpointTimerRef.current)
          snapshotCheckpointTimerRef.current = null
        }
        try {
          valueChangeDisposable?.dispose()
        } catch {}
        try {
          selectionDisposable?.dispose()
        } catch {}
        try {
          selectionChangeDisposable?.dispose()
        } catch {}
        try {
          currentSelectionChangeDisposable?.dispose()
        } catch {}
        try {
          scrollEventDisposable?.dispose?.()
        } catch {}
        try {
          worksheetScrollDisposable?.dispose?.()
        } catch {}
        clearInterval(scrollPollIntervalId)
        clearInterval(cursorPollIntervalId)
        try {
          commandDisposable?.dispose?.()
        } catch {}
        sheetScrollRef.current = { scrollLeft: 0, scrollTop: 0 }
        univerAPI.dispose()
        univerAPIRef.current = null
        contextRef.current = null
      }

      return dispose
    }, [
      props.workbookRemountKey ?? sheet.id,
      props.snapshotSeed,
      props.isReadOnly,
      gridHostEl,
      forceRowSnapshotSeed,
      supportedUniverFonts,
      appLocale
    ])

    useEffect(() => {
      if (!props.multiSheetWorkbookMode) return
      try {
        const wb = univerAPIRef.current?.getActiveWorkbook?.() as
          | {
              getActiveSheet?: () => { getSheetId?: () => string }
              setActiveSheet?: (id: string) => void
            }
          | undefined
        const activeWorksheetId = wb?.getActiveSheet?.()?.getSheetId?.()
        if (activeWorksheetId === sheet.id) return
        wb?.setActiveSheet?.(sheet.id)
      } catch {
        /* ignore */
      }
    }, [props.multiSheetWorkbookMode, sheet.id])

    // Track "active sheet" based on pointer/focus so we can hijack shortcuts even when
    // Univer's canvas selection doesn't move DOM focus (common in published embeds).
    useEffect(() => {
      const updateInteractionActive = (target: EventTarget | null) => {
        const container = containerRef.current
        if (!container) return
        isSheetInteractionActiveRef.current = target instanceof Node && container.contains(target)
      }

      const onPointerDownCapture = (e: PointerEvent) => updateInteractionActive(e.target)
      const onFocusInCapture = (e: FocusEvent) => updateInteractionActive(e.target)

      globalThis.addEventListener('pointerdown', onPointerDownCapture, true)
      globalThis.addEventListener('focusin', onFocusInCapture, true)
      return () => {
        globalThis.removeEventListener('pointerdown', onPointerDownCapture, true)
        globalThis.removeEventListener('focusin', onFocusInCapture, true)
      }
    }, [])

    // Hijack Cmd/Ctrl+B at the window capture phase so host apps can't intercept it first.
    // We execute the Univer command directly, so we don't need the native event to reach the sheet DOM.
    useEffect(() => {
      const onKeyDownCapture = (e: KeyboardEvent) => {
        if (props.isReadOnly) return
        const api = univerAPIRef.current
        const container = containerRef.current
        if (!api || !container) return

        const activeEl = typeof document !== 'undefined' ? document.activeElement : null
        if (isDomTextEditingTarget(activeEl) && activeEl instanceof Element && !container.contains(activeEl)) {
          return
        }

        const inSheet =
          (activeEl instanceof Element && container.contains(activeEl)) || isSheetInteractionActiveRef.current
        if (!inSheet) return

        const isMod = e.metaKey || e.ctrlKey
        if (!isMod) return

        if (e.key.toLowerCase() !== 'b') return

        e.preventDefault()
        e.stopImmediatePropagation()
        e.stopPropagation()
        // Prefer Univer's built-in command (handles edit mode vs selection mode),
        // but fall back to explicitly toggling the active range's fontWeight so the
        // shortcut still works even if focus routing in the host app is unusual.
        try {
          const didExecute = api.syncExecuteCommand('sheet.command.set-range-bold')
          if (didExecute) return
        } catch {
          // continue to fallback
        }

        try {
          const wb = api.getActiveWorkbook?.()
          const range =
            (wb as { getActiveRange?: () => any } | null | undefined)?.getActiveRange?.() ??
            (wb as { getActiveSheet?: () => any } | null | undefined)?.getActiveSheet?.()?.getActiveRange?.()
          if (!range) return
          const style = (range as { getCellStyleData?: () => { bl?: number } | null })?.getCellStyleData?.()
          const isBold = style?.bl === 1
          ;(range as { setFontWeight?: (v: 'normal' | 'bold' | null) => unknown })?.setFontWeight?.(
            isBold ? 'normal' : 'bold'
          )
        } catch {
          // Ignore — shortcut is best-effort in published embeds
        }
      }

      globalThis.addEventListener('keydown', onKeyDownCapture, true)
      return () => globalThis.removeEventListener('keydown', onKeyDownCapture, true)
    }, [props.isReadOnly])

    // If sheet turns read-only while focused, drop the active interaction flag so
    // host/global shortcuts don't keep targeting the grid.
    useEffect(() => {
      if (!props.isReadOnly) return
      isSheetInteractionActiveRef.current = false
    }, [props.isReadOnly])

    // When embedded in a published platform, the host may use Cmd+B etc. for its own actions.
    // Hijack these shortcuts when the user is focused inside the spreadsheet so Univer handles them.
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!containerRef.current?.contains(e.target as Node)) return
      const activeEl = typeof document !== 'undefined' ? document.activeElement : null
      if (isDomTextEditingTarget(activeEl) && activeEl instanceof Element && !containerRef.current.contains(activeEl)) {
        return
      }
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return
      const key = e.key.toLowerCase()
      const spreadsheetShortcuts = ['b', 'i', 'u', 'c', 'v', 'x', 'z', 'y']
      if (spreadsheetShortcuts.includes(key)) {
        e.stopPropagation()
      }
    }, [])

    const forwardReadOnlyOverlayWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
      // Keep the read-only overlay to block edits/clicks, but forward wheel/trackpad
      // gestures so users can still navigate large sheets in view mode.
      e.preventDefault()
      e.stopPropagation()

      const overlay = e.currentTarget
      const previousPointerEvents = overlay.style.pointerEvents
      overlay.style.pointerEvents = 'none'
      const target = globalThis.document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      overlay.style.pointerEvents = previousPointerEvents

      if (!target) return

      target.dispatchEvent(
        new WheelEvent('wheel', {
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaZ: e.deltaZ,
          deltaMode: e.deltaMode,
          clientX: e.clientX,
          clientY: e.clientY,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
          bubbles: true,
          cancelable: true
        })
      )
    }, [])

    return (
      <div
        className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:overflow-hidden"
        style={{ height: props.height ?? '100%', width: props.width ?? '100%' }}
        onKeyDown={handleKeyDown}
      >
        <div ref={setGridHostRef} className="gba:w-full gba:h-full" data-testid="univer-sheet-grid-container" />
        {props.isReadOnly && (
          <div
            data-testid="univer-readonly-overlay"
            className="gba:absolute gba:inset-0 gba:z-30 gba:cursor-not-allowed"
            onWheel={forwardReadOnlyOverlayWheel}
            aria-hidden="true"
          />
        )}
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:z-20">
          {remoteCursorOverlays.map(cursor =>
            (() => {
              const rect = cursorRects[cursor.id]
              const top = rect ? rect.top : CURSOR_OVERLAY_HEADER_HEIGHT_PX + cursor.row * CURSOR_OVERLAY_ROW_HEIGHT_PX
              const left = rect
                ? rect.left
                : CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX + cursor.col * CURSOR_OVERLAY_COL_WIDTH_PX
              const width = rect ? rect.width : CURSOR_OVERLAY_COL_WIDTH_PX
              const height = rect ? rect.height : CURSOR_OVERLAY_ROW_HEIGHT_PX
              return (
                <div
                  key={cursor.id}
                  className="gba:absolute gba:rounded-sm"
                  style={{
                    top,
                    left,
                    width,
                    height,
                    border: `2px solid ${cursor.userColor}`,
                    boxShadow: `0 0 8px ${cursor.userColor}33`
                  }}
                >
                  <div
                    className="gba:absolute gba:-top-2 gba:-right-2 gba:h-5 gba:min-w-5 gba:px-1 gba:text-[9px] gba:leading-5 gba:font-semibold gba:text-white gba:rounded-full gba:text-center gba:whitespace-nowrap gba:shadow-sm"
                    style={{ backgroundColor: cursor.userColor }}
                    title={cursor.userName}
                  >
                    {getInitials(cursor.userName)}
                  </div>
                </div>
              )
            })()
          )}
        </div>
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:z-10">
          {commentOverlays.map(marker => {
            const rect = commentRects[marker.id]
            const top = rect ? rect.top : CURSOR_OVERLAY_HEADER_HEIGHT_PX + marker.row * CURSOR_OVERLAY_ROW_HEIGHT_PX
            const leftBase = rect
              ? rect.left
              : CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX + marker.col * CURSOR_OVERLAY_COL_WIDTH_PX
            const width = rect ? rect.width : CURSOR_OVERLAY_COL_WIDTH_PX
            return (
              <React.Fragment key={marker.id}>
                <div
                  className="gba:absolute gba:h-2.5 gba:w-2.5 gba:rounded-full gba:bg-blue-500 gba:border gba:border-white gba:shadow-sm"
                  style={{
                    top: Math.max(0, top + 2),
                    left: Math.max(0, leftBase + width - 12)
                  }}
                  title={`Comment: ${marker.ref}`}
                  data-testid="univer-cell-comment-badge"
                />
                <div
                  className="gba:absolute gba:pointer-events-auto gba:cursor-pointer"
                  style={{
                    top: Math.max(0, top),
                    left: Math.max(0, leftBase + width - 24),
                    width: 24,
                    height: 24
                  }}
                  onMouseEnter={() => setHoveredCommentId(marker.id)}
                  onMouseLeave={() => setHoveredCommentId(prev => (prev === marker.id ? null : prev))}
                />
              </React.Fragment>
            )
          })}
          {(() => {
            if (!hoveredCommentId) return null
            const marker = commentOverlays.find(entry => entry.id === hoveredCommentId)
            if (!marker) return null
            const rect = commentRects[marker.id]
            if (!rect) return null
            const top = rect.top
            const left = rect.left
            const author = marker.createdByName || 'User'
            const avatar = marker.createdByAvatar
            const time = formatCommentTime(marker.createdAt)
            return (
              <div
                className="gba:absolute gba:w-[260px] gba:max-w-[65vw] gba:rounded-2xl gba:border gba:bg-card gba:p-4 gba:shadow-xl"
                style={{ top: Math.max(8, top - 164), left: Math.max(8, left - 24) }}
                data-testid="univer-cell-comment-hover-card"
              >
                <div className="gba:flex gba:items-center gba:gap-3">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={author}
                      className="gba:h-9 gba:w-9 gba:rounded-full gba:object-cover gba:border"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="gba:flex gba:h-9 gba:w-9 gba:items-center gba:justify-center gba:rounded-full gba:bg-emerald-800 gba:text-xs gba:font-semibold gba:text-white">
                      {getInitials(author)}
                    </div>
                  )}
                  <div className="gba:flex gba:flex-col">
                    <div className="gba:text-sm gba:leading-none gba:font-semibold">{author}</div>
                    {time && <div className="gba:text-xs gba:leading-none gba:text-muted-foreground">{time}</div>}
                  </div>
                </div>
                <div className="gba:mt-3 gba:text-sm gba:leading-snug">{marker.content || ''}</div>
              </div>
            )
          })()}
        </div>
      </div>
    )
  }
)

export default UniverSheetGrid
