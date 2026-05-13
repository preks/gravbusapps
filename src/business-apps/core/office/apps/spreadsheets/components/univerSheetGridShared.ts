import type { SheetCellMatrix, SheetRangeShape } from './cellMatrixUtils'
import { readWorksheetCellValue } from '../utils/univerWorksheetCellRead'

const GERMAN_NUMFMT_PREVIEW_BY_LABEL: Record<string, string> = {
  Accounting: '1.220,00 EUR',
  Currency: '1.220,00 EUR',
  Date: '31.12.2024',
  'Date and time': '31.12.2024 12:00:00',
  Number: '1.220,00',
  Percentage: '122000,00%',
  Scientific: '1,22E+03',
  Time: '12:00:00'
}

const GERMAN_NUMFMT_PATTERN_BY_LABEL: Record<string, string> = {
  Accounting: '#,##0.00 "EUR"',
  Currency: '#,##0.00 "EUR"',
  Date: 'dd.mm.yyyy',
  'Date and time': 'dd.mm.yyyy hh:mm:ss',
  Number: '#,##0.00',
  Percentage: '0.00%',
  Scientific: '0.00E+00',
  Time: 'hh:mm:ss'
}

const UNIVER_CELL_VALUE_KEYS = new Set(['v', 'f', 'm', 'p', 'si', 'custom'])

export function isClearLikeMutationCommand(commandId: string): boolean {
  const normalized = commandId.trim().toLowerCase()
  if (!normalized) return false
  if (normalized.includes('move-selection') || normalized.includes('navigation')) return false

  return (
    normalized.includes('clear-range') ||
    normalized.includes('clear-selection') ||
    normalized.includes('clear-content') ||
    normalized.includes('clear-value') ||
    normalized.includes('delete-selection') ||
    normalized.includes('deleteselectioncommand') ||
    normalized.includes('move-range') ||
    normalized.includes('move-cell') ||
    normalized.includes('move-row') ||
    normalized.includes('move-column') ||
    normalized.includes('cut-paste') ||
    normalized.includes('cutpaste')
  )
}

function isPersistableNonBlankCellValue(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number' || typeof value === 'boolean') return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entry = value as Record<string, unknown>
  return Object.entries(entry).some(([key, entryValue]) => {
    if (!UNIVER_CELL_VALUE_KEYS.has(key)) return false
    return isPersistableNonBlankCellValue(entryValue)
  })
}

function hasNonBlankPersistableCellMatrixEntries(cellValue: SheetCellMatrix): boolean {
  for (const rowCells of Object.values(cellValue)) {
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const cell of Object.values(rowCells)) {
      if (isPersistableNonBlankCellValue(cell)) return true
    }
  }
  return false
}

export function isImplicitClearLikeSetRangeMutation(params: {
  commandId: string
  ranges: SheetRangeShape[]
  payloadCellValue?: SheetCellMatrix
}): boolean {
  const normalized = params.commandId.trim().toLowerCase()
  if (!normalized.includes('set-range-values')) return false
  if (params.payloadCellValue && hasNonBlankPersistableCellMatrixEntries(params.payloadCellValue)) return false
  return params.ranges.some(
    range =>
      Number.isFinite(range.startRow) &&
      Number.isFinite(range.endRow) &&
      Number.isFinite(range.startColumn) &&
      Number.isFinite(range.endColumn) &&
      range.endRow >= range.startRow &&
      range.endColumn >= range.startColumn
  )
}

function readFormulaFromUnknown(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.startsWith('=') ? trimmed : null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const f = (value as { f?: unknown }).f
  if (typeof f !== 'string') return null
  const trimmed = f.trim()
  if (trimmed.length === 0) return null
  return trimmed.startsWith('=') ? trimmed : `=${trimmed}`
}

function readPayloadFormula(
  payloadCellValue: SheetCellMatrix | undefined,
  rowIndex: number,
  colIndex: number
): string | null {
  if (!payloadCellValue) return null
  const row = payloadCellValue[rowIndex]
  if (!row || typeof row !== 'object') return null
  if (!Object.prototype.hasOwnProperty.call(row, colIndex)) return null
  return readFormulaFromUnknown((row as Record<number, unknown>)[colIndex])
}

function readLiveWorksheetFormula(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  rowIndex: number,
  colIndex: number
): string | null {
  const live = readWorksheetCellValue(worksheet, rowIndex, colIndex)
  if (live && typeof live === 'object' && !Array.isArray(live)) {
    return readFormulaFromUnknown(live)
  }
  if (typeof live === 'string') {
    return readFormulaFromUnknown(live)
  }
  return null
}

export function enrichCellMatrixWithLiveFormulas(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  cellValue: SheetCellMatrix,
  payloadCellValue?: SheetCellMatrix | undefined
): SheetCellMatrix {
  let nextValue: SheetCellMatrix | null = null
  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (!Number.isFinite(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (!Number.isFinite(colIndex)) continue
      const entry = (rowCells as Record<number, unknown>)[colIndex]
      if (entry === null) continue
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        if (Object.prototype.hasOwnProperty.call(entry, 'f')) continue
      }
      const formula =
        readPayloadFormula(payloadCellValue, rowIndex, colIndex) ??
        readLiveWorksheetFormula(worksheet, rowIndex, colIndex)
      if (!formula) continue
      if (!nextValue) nextValue = { ...cellValue }
      const nextRow = { ...(nextValue[rowIndex] ?? {}) } as Record<number, unknown>
      let merged: Record<string, unknown>
      if (entry && typeof entry === 'object') {
        merged = { ...(entry as Record<string, unknown>), f: formula }
      } else if (entry === undefined) {
        merged = { f: formula }
      } else {
        merged = { v: entry, f: formula }
      }
      nextRow[colIndex] = merged as unknown
      nextValue[rowIndex] = nextRow as Record<number, unknown>
    }
  }
  return nextValue ?? cellValue
}

export function isCurrentFacadeWorksheet(
  activeSheet: { getSheetId?: () => string } | null | undefined,
  worksheet: { getSheetId?: () => string } | null | undefined,
  expectedSheetId?: string | null
): boolean {
  if (!activeSheet || !worksheet) return false
  const activeId = activeSheet.getSheetId?.()
  const worksheetId = worksheet.getSheetId?.()
  if (!activeId || !worksheetId || activeId !== worksheetId) return false
  return !expectedSheetId || worksheetId === expectedSheetId
}

function normalizeMenuText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function extractFormatMenuLabel(text: string): string | null {
  const normalized = normalizeMenuText(text)
  const labels = Object.keys(GERMAN_NUMFMT_PREVIEW_BY_LABEL).sort((a, b) => b.length - a.length)
  for (const label of labels) {
    if (normalized === label || normalized.startsWith(`${label} `)) return label
  }
  return null
}

export function getGermanNumfmtPattern(label: string): string | undefined {
  return GERMAN_NUMFMT_PATTERN_BY_LABEL[label]
}
