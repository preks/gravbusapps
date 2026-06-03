import type { MutableRefObject } from 'react'
import type { SheetRangeShape } from '../components/cellMatrixUtils'

export type MergeGestureSuppressEntry = {
  ranges: SheetRangeShape[]
  untilMs: number
}

export type MergeGestureSuppressBySheetRef = MutableRefObject<Map<string, MergeGestureSuppressEntry>>

const MERGE_GESTURE_SUPPRESS_MS = 750

const numberOrNull = (value: unknown): number | null => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return Math.trunc(numeric)
}

export const normalizeSheetRangeShapes = (rawRanges: unknown): SheetRangeShape[] => {
  if (!Array.isArray(rawRanges)) return []
  const normalized: SheetRangeShape[] = []
  for (const candidate of rawRanges) {
    if (!candidate || typeof candidate !== 'object') continue
    const record = candidate as Record<string, unknown>
    const startRow = numberOrNull(record.startRow)
    const endRow = numberOrNull(record.endRow)
    const startColumn = numberOrNull(record.startColumn)
    const endColumn = numberOrNull(record.endColumn)
    if (startRow == null || endRow == null || startColumn == null || endColumn == null) continue
    if (endRow < startRow || endColumn < startColumn) continue
    normalized.push({ startRow, endRow, startColumn, endColumn })
  }
  return normalized
}

export const registerMergeGestureSuppress = (
  ref: MergeGestureSuppressBySheetRef | undefined,
  sheetId: string,
  ranges: SheetRangeShape[],
  durationMs: number = MERGE_GESTURE_SUPPRESS_MS
): void => {
  if (!ref || ranges.length === 0) return
  ref.current.set(sheetId, {
    ranges,
    untilMs: Date.now() + durationMs
  })
}

export const getActiveMergeGestureSuppressRanges = (
  ref: MergeGestureSuppressBySheetRef | undefined,
  sheetId: string,
  nowMs: number = Date.now()
): SheetRangeShape[] => {
  if (!ref) return []
  const entry = ref.current.get(sheetId)
  if (!entry || entry.untilMs <= nowMs) {
    if (entry) ref.current.delete(sheetId)
    return []
  }
  return entry.ranges
}

export const isGridCellInSheetRanges = (rowIndex: number, colIndex: number, ranges: SheetRangeShape[]): boolean =>
  ranges.some(
    range =>
      rowIndex >= range.startRow &&
      rowIndex <= range.endRow &&
      colIndex >= range.startColumn &&
      colIndex <= range.endColumn
  )

export const unionSheetRangeShapes = (...rangeGroups: (SheetRangeShape[] | undefined | null)[]): SheetRangeShape[] => {
  const output: SheetRangeShape[] = []
  for (const group of rangeGroups) {
    if (!Array.isArray(group)) continue
    for (const range of group) {
      output.push(range)
    }
  }
  return output
}
