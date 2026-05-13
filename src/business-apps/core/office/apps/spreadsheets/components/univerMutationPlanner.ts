import type { SpreadsheetMutationPlan, SpreadsheetMutationPlannedCell, SpreadsheetStylePatch } from '../core'
import { readSpreadsheetRowCellValue, toA1Reference } from '../core'
import type { SpreadsheetColumn } from '../types'
import type { ConversionContext } from '../utils/univerAdapter'
import type { SheetCellMatrix, SheetRangeShape } from './cellMatrixUtils'

const UNIVER_INLINE_STYLE_KEYS = [
  'bl',
  'it',
  'ul',
  'st',
  'ol',
  'ff',
  'fs',
  'cl',
  'bg',
  'ht',
  'vt',
  'tb',
  'tr',
  'pd',
  'bd',
  'n'
] as const

const UNIVER_INLINE_STYLE_KEY_SET = new Set<string>(UNIVER_INLINE_STYLE_KEYS as readonly string[])
const UNIVER_FORMATTING_KEYS = ['s', ...UNIVER_INLINE_STYLE_KEYS] as const
const VALUE_KEYS = ['v', 'f', 'm', 'ct'] as const

export type SpreadsheetLocalMutationIntent =
  | 'edit'
  | 'pasteReplace'
  | 'clearAll'
  | 'clearFormat'
  | 'formatOnly'
  | 'autofill'

export interface SpreadsheetPlannedMutationDiagnostics {
  targetCellCount: number
  explicitTargetCount: number
  derivedTargetCount: number
  plannedValueSetCount: number
  plannedValueClearCount: number
  plannedStylePatchCount: number
}

export interface SpreadsheetAuthoritativeMutationEnvelope {
  plan: SpreadsheetMutationPlan | null
  diagnostics: SpreadsheetPlannedMutationDiagnostics
}

interface PlannerTargetCell {
  rowIndex: number
  colIndex: number
  explicit: boolean
}

export interface BuildAuthoritativeMutationEnvelopeParams {
  sheetId: string
  traceId: string
  intent: SpreadsheetLocalMutationIntent
  currentData: Record<string, unknown>[]
  contextColumns: SpreadsheetColumn[]
  ctx: ConversionContext
  ranges: SheetRangeShape[]
  explicitPayloadAbsoluteCellValue?: SheetCellMatrix
  worksheetCellValue?: SheetCellMatrix
  mergedCellValue: SheetCellMatrix
  workbookSnapshot: Record<string, unknown> | null
  allowValueCarryingStylePayloads?: boolean
  replaceRangeStyleIntent?: boolean
  shouldSuppress?: (rowIndex: number, colIndex: number, value: unknown) => boolean
  /** Univer command id from SheetValueChanged / CommandExecuted (empty when omitted). */
  mutationCommandId?: string
}

function isClearLikeMutationCommandId(commandId: string | undefined): boolean {
  const normalized = String(commandId ?? '')
    .trim()
    .toLowerCase()
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

function isPersistableCellDataMutationValue(value: unknown): boolean {
  if (value === undefined) return false
  if (value === null) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const o = value as Record<string, unknown>
  return 'v' in o || 'f' in o || 'm' in o || 'ct' in o
}

function hasCollabWireStylePayload(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const o = value as Record<string, unknown>
  if ('s' in o) return true
  for (const k of UNIVER_INLINE_STYLE_KEYS) {
    if (k in o) return true
  }
  return false
}

export function cellMatrixHasCollabWireStylePayload(cellValue: SheetCellMatrix | undefined): boolean {
  if (!cellValue) return false
  for (const rowCells of Object.values(cellValue)) {
    if (!rowCells || typeof rowCells !== 'object') continue
    if (Object.values(rowCells).some(cell => hasCollabWireStylePayload(cell))) return true
  }
  return false
}

function isCollabWireCellMutationValue(value: unknown, allowValueCarryingStylePayloads = false): boolean {
  if (!hasCollabWireStylePayload(value)) return false
  if (allowValueCarryingStylePayloads) return true
  const o = value as Record<string, unknown>
  for (const k of VALUE_KEYS) {
    if (k in o) return false
  }
  return true
}

function normalizeValueForEchoSignature(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('=')) return { f: trimmed }
    return value
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const obj = value as Record<string, unknown>
  if (typeof obj.f === 'string') {
    const trimmed = obj.f.trim()
    return { f: trimmed.startsWith('=') ? trimmed : `=${trimmed}` }
  }
  if (obj.v !== undefined) return typeof obj.v === 'number' && !Number.isFinite(obj.v) ? null : obj.v
  if (obj.m !== undefined) return typeof obj.m === 'number' && !Number.isFinite(obj.m) ? null : obj.m
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

function normalizeBlankLikeEchoSignature(signature: string | undefined): string {
  if (signature === 'u:' || signature === 'n:' || signature === 's:') return 'blank'
  return signature ?? 'missing'
}

function isUniverFormattingKey(key: string): boolean {
  return key === 's' || UNIVER_INLINE_STYLE_KEY_SET.has(key)
}

type SpreadsheetStylePatchIntent = 'normal' | 'replaceRange'

function buildStylePatchFromUniverCell(
  univerCell: Record<string, unknown> | undefined,
  intent: SpreadsheetStylePatchIntent
): SpreadsheetStylePatch | undefined {
  const set: Record<string, unknown> = {}
  const unset = new Set<string>()
  if (intent === 'replaceRange') {
    for (const key of UNIVER_FORMATTING_KEYS) unset.add(key)
  }
  if (univerCell && typeof univerCell === 'object') {
    for (const [key, value] of Object.entries(univerCell)) {
      if (!isUniverFormattingKey(key)) continue
      if (value == null) {
        unset.add(key)
        delete set[key]
      } else {
        set[key] = value
        unset.delete(key)
      }
    }
  }
  if (intent === 'normal' && typeof set.s === 'string' && set.s.length > 0) {
    for (const key of UNIVER_INLINE_STYLE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(set, key)) continue
      unset.add(key)
    }
  }
  if (Object.keys(set).length === 0 && unset.size === 0) return undefined
  return {
    ...(Object.keys(set).length > 0 ? { set } : {}),
    ...(unset.size > 0 ? { unset: Array.from(unset) } : {})
  }
}

function countCellMatrixEntries(cellValue: SheetCellMatrix | undefined): number {
  if (!cellValue) return 0
  let count = 0
  for (const rowCells of Object.values(cellValue)) {
    if (!rowCells || typeof rowCells !== 'object') continue
    count += Object.keys(rowCells).length
  }
  return count
}

function buildTargetCells(params: {
  explicitPayloadAbsoluteCellValue?: SheetCellMatrix
  worksheetCellValue?: SheetCellMatrix
  mergedCellValue: SheetCellMatrix
  ranges: SheetRangeShape[]
  replaceRangeStyleIntent: boolean
}): PlannerTargetCell[] {
  const { explicitPayloadAbsoluteCellValue, worksheetCellValue, mergedCellValue, ranges, replaceRangeStyleIntent } =
    params
  const out = new Map<string, PlannerTargetCell>()
  const push = (rowIndex: number, colIndex: number, explicit: boolean) => {
    const key = `${rowIndex}:${colIndex}`
    const current = out.get(key)
    if (current) {
      if (explicit) current.explicit = true
      return
    }
    out.set(key, { rowIndex, colIndex, explicit })
  }

  if (explicitPayloadAbsoluteCellValue && countCellMatrixEntries(explicitPayloadAbsoluteCellValue) > 0) {
    for (const rowKey of Object.keys(explicitPayloadAbsoluteCellValue)) {
      const rowIndex = Number(rowKey)
      if (Number.isNaN(rowIndex)) continue
      const rowCells = explicitPayloadAbsoluteCellValue[rowIndex]
      if (!rowCells || typeof rowCells !== 'object') continue
      for (const colKey of Object.keys(rowCells)) {
        const colIndex = Number(colKey)
        if (Number.isNaN(colIndex)) continue
        push(rowIndex, colIndex, true)
      }
    }
  }

  if (replaceRangeStyleIntent) {
    for (const range of ranges) {
      for (let rowIndex = range.startRow; rowIndex <= range.endRow; rowIndex += 1) {
        for (let colIndex = range.startColumn; colIndex <= range.endColumn; colIndex += 1) {
          push(rowIndex, colIndex, true)
        }
      }
    }
  }

  if (out.size === 0) {
    const source = worksheetCellValue ?? mergedCellValue
    for (const rowKey of Object.keys(source)) {
      const rowIndex = Number(rowKey)
      if (Number.isNaN(rowIndex)) continue
      const rowCells = source[rowIndex]
      if (!rowCells || typeof rowCells !== 'object') continue
      for (const colKey of Object.keys(rowCells)) {
        const colIndex = Number(colKey)
        if (Number.isNaN(colIndex)) continue
        push(rowIndex, colIndex, false)
      }
    }
  }

  return Array.from(out.values())
}

function readMatrixCell(matrix: SheetCellMatrix | undefined, rowIndex: number, colIndex: number): unknown {
  const row = matrix?.[rowIndex]
  if (!row || typeof row !== 'object') return undefined
  return row[colIndex]
}

function resolveWorkbookWorksheet(
  workbookSnapshot: Record<string, unknown> | null,
  sheetId: string
): Record<string, unknown> | null {
  const sheets = workbookSnapshot?.sheets
  if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) return null
  const sheetRecord = sheets as Record<string, unknown>
  const exact = sheetRecord[sheetId]
  if (exact && typeof exact === 'object' && !Array.isArray(exact)) return exact as Record<string, unknown>
  const fallback = Object.values(sheetRecord).find(
    value =>
      value && typeof value === 'object' && !Array.isArray(value) && (value as Record<string, unknown>).id === sheetId
  )
  return fallback && typeof fallback === 'object' && !Array.isArray(fallback)
    ? (fallback as Record<string, unknown>)
    : null
}

function normalizeMergeRange(
  range: unknown
): { startRow: number; endRow: number; startColumn: number; endColumn: number } | null {
  if (!range || typeof range !== 'object' || Array.isArray(range)) return null
  const record = range as Record<string, unknown>
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

function buildMergeCoveredCellSet(workbookSnapshot: Record<string, unknown> | null, sheetId: string): Set<string> {
  const worksheet = resolveWorkbookWorksheet(workbookSnapshot, sheetId)
  const mergeData = Array.isArray(worksheet?.mergeData) ? worksheet.mergeData : []
  const covered = new Set<string>()
  for (const candidate of mergeData) {
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

/**
 * When Univer's merged matrix differs from how `buildTargetCells` indexed cells,
 * ensure non-blank worksheet reads still produce a planned value delta so typing
 * cannot disappear from persistence (legacy `collectChangedCells` forced path).
 */
function applyNonBlankWorksheetFallback(params: {
  plannedCells: Map<string, SpreadsheetMutationPlannedCell>
  worksheetCellValue?: SheetCellMatrix
  mergedCellValue: SheetCellMatrix
  explicitPayloadAbsoluteCellValue?: SheetCellMatrix
  ctx: ConversionContext
  currentData: Record<string, unknown>[]
  visibleColumns: SpreadsheetColumn[]
  stylesRoot: Record<string, unknown>
  replaceRangeStyleIntent: boolean
  allowValueCarryingStylePayloads: boolean
  shouldSuppress?: (rowIndex: number, colIndex: number, value: unknown) => boolean
  styleIntent: SpreadsheetStylePatchIntent
  mergeCoveredCellKeys: Set<string>
}): void {
  const {
    plannedCells,
    worksheetCellValue,
    mergedCellValue,
    explicitPayloadAbsoluteCellValue,
    ctx,
    currentData,
    visibleColumns,
    stylesRoot,
    replaceRangeStyleIntent,
    allowValueCarryingStylePayloads,
    shouldSuppress,
    styleIntent,
    mergeCoveredCellKeys
  } = params

  const matrices: SheetCellMatrix[] = []
  if (worksheetCellValue && countCellMatrixEntries(worksheetCellValue) > 0) {
    matrices.push(worksheetCellValue)
  }
  if (countCellMatrixEntries(mergedCellValue) > 0) {
    matrices.push(mergedCellValue)
  }
  if (explicitPayloadAbsoluteCellValue && countCellMatrixEntries(explicitPayloadAbsoluteCellValue) > 0) {
    matrices.push(explicitPayloadAbsoluteCellValue)
  }
  if (matrices.length === 0) return

  const scannedKeys = new Set<string>()
  for (const matrix of matrices) {
    for (const rowKey of Object.keys(matrix)) {
      const rowIndex = Number(rowKey)
      if (Number.isNaN(rowIndex)) continue
      const rowCells = matrix[rowIndex]
      if (!rowCells || typeof rowCells !== 'object') continue
      for (const colKey of Object.keys(rowCells)) {
        const colIndex = Number(colKey)
        if (Number.isNaN(colIndex)) continue
        const globalRowIndex = rowIndex
        const globalColIndex = colIndex
        const mapKey = `${globalRowIndex}:${globalColIndex}`
        if (mergeCoveredCellKeys.has(mapKey)) continue
        if (scannedKeys.has(mapKey)) continue
        scannedKeys.add(mapKey)

        const rowId = ctx.rowIndexToId.get(globalRowIndex)
        const columnName = ctx.columnIndexToName.get(globalColIndex) ?? ctx.columnIndexToId.get(globalColIndex)
        if (rowId === undefined || columnName === undefined) continue

        const candidateValue =
          readMatrixCell(worksheetCellValue, rowIndex, colIndex) ??
          readMatrixCell(mergedCellValue, rowIndex, colIndex) ??
          readMatrixCell(explicitPayloadAbsoluteCellValue, rowIndex, colIndex)

        if (shouldSuppress?.(globalRowIndex, globalColIndex, candidateValue) === true) {
          continue
        }

        let existing = plannedCells.get(mapKey)
        if (existing && existing.valueAction !== 'none') {
          continue
        }

        if (!isPersistableCellDataMutationValue(candidateValue)) {
          continue
        }

        const normalizedValue = normalizeValueForEchoSignature(candidateValue)
        const nextSignature = normalizeBlankLikeEchoSignature(toEchoSignature(normalizedValue))
        if (nextSignature === 'blank') {
          continue
        }

        const currentRow = currentData[globalRowIndex]
        const currentColumn = visibleColumns[globalColIndex]
        const currentValue =
          currentColumn && currentRow ? readSpreadsheetRowCellValue(currentRow, currentColumn) : undefined
        const currentSignature = normalizeBlankLikeEchoSignature(toEchoSignature(currentValue))
        if (currentSignature === nextSignature) {
          continue
        }

        if (!existing) {
          existing = {
            rowId,
            columnName,
            rowIndex: globalRowIndex,
            colIndex: globalColIndex,
            cellRef: toA1Reference(globalRowIndex, globalColIndex),
            valueAction: 'none'
          } as SpreadsheetMutationPlannedCell
        }

        existing.valueAction = nextSignature === 'blank' ? 'clear' : 'set'
        existing.value = normalizedValue

        const styleCell =
          (readMatrixCell(mergedCellValue, rowIndex, colIndex) as Record<string, unknown> | undefined) ??
          (readMatrixCell(worksheetCellValue, rowIndex, colIndex) as Record<string, unknown> | undefined) ??
          (readMatrixCell(explicitPayloadAbsoluteCellValue, rowIndex, colIndex) as Record<string, unknown> | undefined)
        const shouldIncludeStyle =
          existing.stylePatch == null &&
          (replaceRangeStyleIntent || isCollabWireCellMutationValue(styleCell, allowValueCarryingStylePayloads)) &&
          !(existing.valueAction === 'clear' && !replaceRangeStyleIntent)
        if (shouldIncludeStyle) {
          const stylePatch = buildStylePatchFromUniverCell(styleCell, styleIntent)
          if (stylePatch) {
            existing.stylePatch = stylePatch
            const styleId =
              stylePatch.set &&
              typeof stylePatch.set === 'object' &&
              typeof stylePatch.set.s === 'string' &&
              stylePatch.set.s.length > 0
                ? stylePatch.set.s
                : null
            if (styleId && stylesRoot[styleId] !== undefined) {
              existing.stylePatch = stylePatch
            }
          }
        }

        plannedCells.set(mapKey, existing)
      }
    }
  }
}

export function buildAuthoritativeMutationEnvelope(
  params: BuildAuthoritativeMutationEnvelopeParams
): SpreadsheetAuthoritativeMutationEnvelope {
  const {
    sheetId,
    traceId,
    currentData,
    contextColumns,
    ctx,
    ranges,
    explicitPayloadAbsoluteCellValue,
    worksheetCellValue,
    mergedCellValue,
    workbookSnapshot,
    allowValueCarryingStylePayloads = false,
    replaceRangeStyleIntent = false,
    shouldSuppress,
    mutationCommandId
  } = params

  const targetCells = buildTargetCells({
    explicitPayloadAbsoluteCellValue,
    worksheetCellValue,
    mergedCellValue,
    ranges,
    replaceRangeStyleIntent
  })

  const commandKey = String(mutationCommandId ?? '').trim()
  const ambiguousSparseNullNoiseGateActive =
    !isClearLikeMutationCommandId(mutationCommandId) &&
    !replaceRangeStyleIntent &&
    targetCells.length >= 2 &&
    commandKey.length === 0

  const stylesRoot =
    workbookSnapshot?.styles && typeof workbookSnapshot.styles === 'object' && !Array.isArray(workbookSnapshot.styles)
      ? (workbookSnapshot.styles as Record<string, unknown>)
      : {}

  const visibleColumns = contextColumns.filter(column => column.isVisible !== false)
  const plannedCells = new Map<string, SpreadsheetMutationPlannedCell>()
  const styleIntent: SpreadsheetStylePatchIntent = replaceRangeStyleIntent ? 'replaceRange' : 'normal'
  const mergeCoveredCellKeys = buildMergeCoveredCellSet(workbookSnapshot, sheetId)

  for (const target of targetCells) {
    const globalRowIndex = target.rowIndex
    const globalColIndex = target.colIndex
    const rowId = ctx.rowIndexToId.get(globalRowIndex)
    const columnName = ctx.columnIndexToName.get(globalColIndex) ?? ctx.columnIndexToId.get(globalColIndex)
    if (rowId === undefined || columnName === undefined) continue

    const candidateValue =
      readMatrixCell(worksheetCellValue, target.rowIndex, target.colIndex) ??
      readMatrixCell(mergedCellValue, target.rowIndex, target.colIndex) ??
      readMatrixCell(explicitPayloadAbsoluteCellValue, target.rowIndex, target.colIndex)

    if (shouldSuppress?.(globalRowIndex, globalColIndex, candidateValue) === true) {
      continue
    }

    const key = `${globalRowIndex}:${globalColIndex}`
    const isMergeCoveredSlave = mergeCoveredCellKeys.has(key)
    const existing =
      plannedCells.get(key) ??
      ({
        rowId,
        columnName,
        rowIndex: globalRowIndex,
        colIndex: globalColIndex,
        cellRef: toA1Reference(globalRowIndex, globalColIndex),
        valueAction: 'none'
      } as SpreadsheetMutationPlannedCell)

    if (!isMergeCoveredSlave && isPersistableCellDataMutationValue(candidateValue)) {
      const normalizedValue = normalizeValueForEchoSignature(candidateValue)
      const currentRow = currentData[globalRowIndex]
      const currentColumn = visibleColumns[globalColIndex]
      const currentValue =
        currentColumn && currentRow ? readSpreadsheetRowCellValue(currentRow, currentColumn) : undefined
      const currentSignature = normalizeBlankLikeEchoSignature(toEchoSignature(currentValue))
      const nextSignature = normalizeBlankLikeEchoSignature(toEchoSignature(normalizedValue))

      const candidateObj =
        candidateValue && typeof candidateValue === 'object' && !Array.isArray(candidateValue)
          ? (candidateValue as Record<string, unknown>)
          : null
      const ambiguousSparseNullClear =
        ambiguousSparseNullNoiseGateActive &&
        candidateObj !== null &&
        Object.prototype.hasOwnProperty.call(candidateObj, 'v') &&
        candidateObj.v === null &&
        nextSignature === 'blank' &&
        currentSignature !== 'blank'

      if (!ambiguousSparseNullClear && currentSignature !== nextSignature) {
        existing.valueAction = nextSignature === 'blank' ? 'clear' : 'set'
        existing.value = normalizedValue
      }
    }

    const styleCell =
      (readMatrixCell(mergedCellValue, target.rowIndex, target.colIndex) as Record<string, unknown> | undefined) ??
      (readMatrixCell(worksheetCellValue, target.rowIndex, target.colIndex) as Record<string, unknown> | undefined) ??
      (readMatrixCell(explicitPayloadAbsoluteCellValue, target.rowIndex, target.colIndex) as
        | Record<string, unknown>
        | undefined)
    const shouldIncludeStyle =
      (replaceRangeStyleIntent || isCollabWireCellMutationValue(styleCell, allowValueCarryingStylePayloads)) &&
      !(existing.valueAction === 'clear' && !replaceRangeStyleIntent)
    if (shouldIncludeStyle) {
      const stylePatch = buildStylePatchFromUniverCell(styleCell, styleIntent)
      if (stylePatch) {
        existing.stylePatch = stylePatch
        const styleId =
          stylePatch.set &&
          typeof stylePatch.set === 'object' &&
          typeof stylePatch.set.s === 'string' &&
          stylePatch.set.s.length > 0
            ? stylePatch.set.s
            : null
        if (styleId && stylesRoot[styleId] !== undefined) {
          existing.stylePatch = stylePatch
        }
      }
    }

    if (existing.valueAction !== 'none' || existing.stylePatch != null) {
      plannedCells.set(key, existing)
    }
  }

  applyNonBlankWorksheetFallback({
    plannedCells,
    worksheetCellValue,
    mergedCellValue,
    explicitPayloadAbsoluteCellValue,
    ctx,
    currentData,
    visibleColumns,
    stylesRoot,
    replaceRangeStyleIntent,
    allowValueCarryingStylePayloads,
    shouldSuppress,
    styleIntent,
    mergeCoveredCellKeys
  })

  const cells = Array.from(plannedCells.values()).map(cell => ({
    ...cell,
    cellRef: cell.cellRef ?? toA1Reference(cell.rowIndex, cell.colIndex)
  }))

  const usedStyleIds = new Set<string>()
  for (const cell of cells) {
    const styleId =
      cell.stylePatch &&
      cell.stylePatch.set &&
      typeof cell.stylePatch.set === 'object' &&
      typeof cell.stylePatch.set.s === 'string'
        ? cell.stylePatch.set.s
        : null
    if (styleId) usedStyleIds.add(styleId)
  }
  const styles: Record<string, unknown> = {}
  for (const styleId of usedStyleIds) {
    if (stylesRoot[styleId] !== undefined) styles[styleId] = stylesRoot[styleId]
  }

  const diagnostics: SpreadsheetPlannedMutationDiagnostics = {
    targetCellCount: targetCells.length,
    explicitTargetCount: targetCells.filter(cell => cell.explicit).length,
    derivedTargetCount: targetCells.filter(cell => !cell.explicit).length,
    plannedValueSetCount: cells.filter(cell => cell.valueAction === 'set').length,
    plannedValueClearCount: cells.filter(cell => cell.valueAction === 'clear').length,
    plannedStylePatchCount: cells.filter(cell => cell.stylePatch != null).length
  }

  if (cells.length === 0) {
    return { plan: null, diagnostics }
  }

  return {
    plan: {
      sheetId,
      traceId,
      cells,
      styles: Object.keys(styles).length > 0 ? styles : undefined
    },
    diagnostics
  }
}
