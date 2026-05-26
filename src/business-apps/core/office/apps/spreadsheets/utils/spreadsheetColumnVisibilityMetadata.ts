import type { SpreadsheetColumn } from '../types'

export type ColumnVisibilityRange = { start: number; end: number }

const sortColumnsByOrder = (columns: SpreadsheetColumn[]): SpreadsheetColumn[] =>
  [...columns].sort((left, right) => left.order - right.order)

/**
 * Univer `visibility_update` column ranges use **physical sheet column indices**
 * (`startColumn` / `endColumn` from hide mutations), i.e. position in the full
 * column list sorted by `order`, including columns with `isVisible === false`.
 */
export const applyColumnVisibilityRangesToSpreadsheetColumns = (
  columns: SpreadsheetColumn[],
  hidden: boolean,
  ranges: ColumnVisibilityRange[]
): SpreadsheetColumn[] => {
  if (ranges.length === 0) return columns
  const sorted = sortColumnsByOrder(columns)
  const nextById = new Map(columns.map(column => [column.id, { ...column }]))

  for (const range of ranges) {
    const rangeStart = Math.max(0, Math.trunc(range.start))
    const rangeEnd = Math.max(rangeStart, Math.trunc(range.end))
    for (let physicalIndex = rangeStart; physicalIndex <= rangeEnd; physicalIndex += 1) {
      const column = sorted[physicalIndex]
      if (!column) continue
      const entry = nextById.get(column.id)
      if (!entry) continue
      nextById.set(column.id, { ...entry, isVisible: hidden ? false : true })
    }
  }

  return sortColumnsByOrder([...nextById.values()])
}

/** Keeps session column visibility when canonical snapshot metadata has not caught up yet. */
export const mergeSheetColumnVisibilityFromLocal = (
  serverColumns: SpreadsheetColumn[],
  localColumns: SpreadsheetColumn[]
): SpreadsheetColumn[] => {
  if (serverColumns.length === 0 || localColumns.length === 0) return serverColumns
  const localById = new Map(localColumns.map(column => [column.id, column]))
  return serverColumns.map(column => {
    const local = localById.get(column.id)
    if (!local || local.isVisible === column.isVisible) return column
    return { ...column, isVisible: local.isVisible }
  })
}

const coalescePhysicalIndexRanges = (indices: number[]): ColumnVisibilityRange[] => {
  if (indices.length === 0) return []
  const sorted = [...indices].sort((left, right) => left - right)
  const ranges: ColumnVisibilityRange[] = []
  let start = sorted[0]
  let end = sorted[0]

  for (let index = 1; index < sorted.length; index += 1) {
    const next = sorted[index]
    if (next === end + 1) {
      end = next
      continue
    }
    ranges.push({ start, end })
    start = next
    end = next
  }
  ranges.push({ start, end })
  return ranges
}

/** Replays hide commands for columns marked hidden in spreadsheet metadata. */
export const buildColumnVisibilityReplayOperations = (
  sheetId: string,
  columns: SpreadsheetColumn[]
): Array<{ type: 'visibility_update'; data: Record<string, unknown> }> => {
  const sorted = sortColumnsByOrder(columns)
  const hiddenPhysicalIndices = sorted
    .map((column, physicalIndex) => (column.isVisible === false ? physicalIndex : -1))
    .filter(index => index >= 0)
  const ranges = coalescePhysicalIndexRanges(hiddenPhysicalIndices)
  if (ranges.length === 0) return []

  return [
    {
      type: 'visibility_update',
      data: {
        sheetId,
        axis: 'column',
        hidden: true,
        ranges
      }
    }
  ]
}
