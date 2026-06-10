import { toA1Reference, type SpreadsheetMutationPlannedCell } from '../core'
import type { UniverWorkbookSnapshot } from '../utils/univerAdapter'

const STYLE_INLINE_KEYS = [
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
]
const STYLE_UNSET_KEYS = ['s', ...STYLE_INLINE_KEYS]

type ColumnMoveReplayMove = {
  sourceStartColumn: number
  count: number
  destinationStartColumn: number
}

type ColumnMoveReplayRange = {
  startColumn: number
  endColumn: number
}

type StyleReplaySnapshotCell = {
  s?: unknown
  [key: string]: unknown
}

export interface BuildColumnMoveStyleReplayParams {
  snapshot: Record<string, unknown> | null
  sheetId: string
  moves: ColumnMoveReplayMove[]
  rowCountHint?: number
}

export interface ColumnMoveStyleReplayPlan {
  cells: SpreadsheetMutationPlannedCell[]
  styles?: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const cloneValue = <T>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

const mergeAffectedRanges = (ranges: ColumnMoveReplayRange[]): ColumnMoveReplayRange[] => {
  if (ranges.length === 0) return []
  const sorted = ranges
    .filter(range => range.endColumn >= range.startColumn)
    .sort((left, right) => left.startColumn - right.startColumn)
  if (sorted.length === 0) return []

  const merged: ColumnMoveReplayRange[] = [{ ...sorted[0] }]
  for (const range of sorted.slice(1)) {
    const previous = merged[merged.length - 1]
    if (range.startColumn <= previous.endColumn + 1) {
      previous.endColumn = Math.max(previous.endColumn, range.endColumn)
      continue
    }
    merged.push({ ...range })
  }
  return merged
}

const buildAffectedRanges = (moves: ColumnMoveReplayMove[]): ColumnMoveReplayRange[] =>
  mergeAffectedRanges(
    moves.map(move => ({
      startColumn: Math.max(0, Math.min(move.sourceStartColumn, move.destinationStartColumn)),
      endColumn: Math.max(
        move.sourceStartColumn + Math.max(0, move.count) - 1,
        move.destinationStartColumn + Math.max(0, move.count) - 1
      )
    }))
  )

const buildSnapshotStylePatch = (
  cell: StyleReplaySnapshotCell | null | undefined,
  workbookStyles: Record<string, unknown>
): { set?: Record<string, unknown>; unset?: string[] } | null => {
  if (!isRecord(cell)) {
    return { unset: STYLE_UNSET_KEYS }
  }

  const set: Record<string, unknown> = {}
  const styleRef = cell.s
  if (typeof styleRef === 'string' && styleRef.trim()) {
    set.s = styleRef
  } else if (isRecord(styleRef)) {
    for (const key of STYLE_INLINE_KEYS) {
      if (styleRef[key] !== undefined) {
        set[key] = cloneValue(styleRef[key])
      }
    }
  }

  for (const key of STYLE_INLINE_KEYS) {
    if (cell[key] !== undefined) {
      set[key] = cloneValue(cell[key])
    }
  }

  if (Object.keys(set).length > 0) {
    const styleId = typeof set.s === 'string' ? set.s : null
    if (styleId && !isRecord(workbookStyles[styleId])) {
      delete set.s
    }
    return { set }
  }

  return { unset: STYLE_UNSET_KEYS }
}

export function buildColumnMoveStyleReplayPlan({
  snapshot,
  sheetId,
  moves,
  rowCountHint
}: BuildColumnMoveStyleReplayParams): ColumnMoveStyleReplayPlan | null {
  if (!isRecord(snapshot) || !sheetId || moves.length === 0) {
    return null
  }

  const workbook = snapshot as UniverWorkbookSnapshot
  const worksheet = isRecord(workbook.sheets) ? workbook.sheets[sheetId] : undefined
  if (!isRecord(worksheet)) {
    return null
  }

  const cellData = isRecord(worksheet.cellData) ? (worksheet.cellData as Record<string, Record<string, unknown>>) : {}
  const workbookStyles = isRecord(workbook.styles) ? (workbook.styles as Record<string, unknown>) : {}
  const affectedRanges = buildAffectedRanges(moves)
  if (affectedRanges.length === 0) {
    return null
  }

  const rowIndexesFromSnapshot = Object.keys(cellData)
    .map(key => Number(key))
    .filter(index => Number.isInteger(index) && index >= 0)
  const maxRowIndex = rowIndexesFromSnapshot.length > 0 ? Math.max(...rowIndexesFromSnapshot) : -1
  const boundedRowCount = Math.max(0, rowCountHint ?? 0, maxRowIndex + 1)
  if (boundedRowCount <= 0) {
    return null
  }

  const cells: SpreadsheetMutationPlannedCell[] = []
  const styles: Record<string, unknown> = {}
  for (let rowIndex = 0; rowIndex < boundedRowCount; rowIndex += 1) {
    const rowCells = isRecord(cellData[rowIndex]) ? (cellData[rowIndex] as Record<string, unknown>) : {}
    for (const range of affectedRanges) {
      for (let colIndex = range.startColumn; colIndex <= range.endColumn; colIndex += 1) {
        const cell = isRecord(rowCells[colIndex]) ? (rowCells[colIndex] as StyleReplaySnapshotCell) : null
        const stylePatch = buildSnapshotStylePatch(cell, workbookStyles)
        if (!stylePatch) continue

        const styleId = stylePatch.set && typeof stylePatch.set.s === 'string' ? stylePatch.set.s : null
        if (styleId && isRecord(workbookStyles[styleId])) {
          styles[styleId] = cloneValue(workbookStyles[styleId])
        }

        cells.push({
          rowId: `style-replay-row-${rowIndex}`,
          columnName: `style-replay-col-${colIndex}`,
          rowIndex,
          colIndex,
          cellRef: toA1Reference(rowIndex, colIndex),
          valueAction: 'none',
          stylePatch
        })
      }
    }
  }

  if (cells.length === 0) {
    return null
  }

  return {
    cells,
    ...(Object.keys(styles).length > 0 ? { styles } : {})
  }
}
