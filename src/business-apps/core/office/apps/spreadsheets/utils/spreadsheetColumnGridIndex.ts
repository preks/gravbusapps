import type { SpreadsheetColumn } from '../types'

const sortColumnsByOrder = (columns: SpreadsheetColumn[]): SpreadsheetColumn[] =>
  [...columns].sort((left, right) => left.order - right.order)

/** Visible grid index where a column with the given `order` is inserted (counts prior visible columns). */
export const visibleInsertIndexFromColumnOrder = (columns: SpreadsheetColumn[], order: number): number =>
  sortColumnsByOrder(columns).filter(entry => entry.isVisible !== false && entry.order < order).length

/** Maps a column's `order` to its visible grid column index (hidden columns excluded). */
export const visibleGridColumnIndexFromColumn = (columns: SpreadsheetColumn[], column: SpreadsheetColumn): number => {
  const sorted = sortColumnsByOrder(columns)
  const fullIndex = sorted.findIndex(entry => entry.id === column.id)
  if (fullIndex < 0) {
    return sorted.filter(entry => entry.isVisible !== false).length
  }
  return sorted.slice(0, fullIndex).filter(entry => entry.isVisible !== false).length
}

export type ColumnSlotInsert = {
  startGridColumnIndex: number
  count: number
}

/** Merges consecutive slot inserts (e.g. four adds at 6,7,8,9 → one insert at 6 with count 4). */
export const coalesceAdjacentColumnSlotInserts = (inserts: ColumnSlotInsert[]): ColumnSlotInsert[] => {
  if (inserts.length === 0) return []
  const sorted = [...inserts].sort((left, right) => left.startGridColumnIndex - right.startGridColumnIndex)
  const coalesced: ColumnSlotInsert[] = []
  let current = { ...sorted[0] }

  for (let index = 1; index < sorted.length; index += 1) {
    const next = sorted[index]
    const currentEndExclusive = current.startGridColumnIndex + current.count
    if (next.startGridColumnIndex === currentEndExclusive) {
      current.count += next.count
      continue
    }
    if (next.startGridColumnIndex === current.startGridColumnIndex && next.count === current.count) {
      continue
    }
    coalesced.push(current)
    current = { ...next }
  }

  coalesced.push(current)
  return coalesced
}

export const extractContiguousColumnSlotInsert = (
  existingColumns: SpreadsheetColumn[],
  addedColumns: SpreadsheetColumn[]
): ColumnSlotInsert | null => {
  if (addedColumns.length === 0) return null
  const sortedOrders = [...addedColumns].map(column => column.order).sort((left, right) => left - right)
  const minOrder = sortedOrders[0]
  const isContiguous = sortedOrders.every((order, index) => order === minOrder + index)
  if (!isContiguous) return null
  return {
    startGridColumnIndex: visibleInsertIndexFromColumnOrder(existingColumns, minOrder),
    count: addedColumns.length
  }
}

export type ColumnSlotDelete = ColumnSlotInsert

/** Merges consecutive slot deletes (e.g. cols 6–9 → one delete at 6 with count 4). */
export const coalesceAdjacentColumnSlotDeletes = coalesceAdjacentColumnSlotInserts

export const extractContiguousColumnSlotDelete = (
  existingColumns: SpreadsheetColumn[],
  deletedColumnIds: string[]
): ColumnSlotDelete | null => {
  if (deletedColumnIds.length === 0) return null
  const visibleColumns = sortColumnsByOrder(existingColumns).filter(column => column.isVisible !== false)
  const indices = deletedColumnIds
    .map(columnId => visibleColumns.findIndex(column => column.id === columnId))
    .filter(index => index >= 0)
    .sort((left, right) => left - right)
  if (indices.length === 0) return null
  const startGridColumnIndex = indices[0]
  const isContiguous = indices.every((index, offset) => index === startGridColumnIndex + offset)
  if (!isContiguous) return null
  return { startGridColumnIndex, count: indices.length }
}

export const mergeRemoteColumnDelete = (columns: SpreadsheetColumn[], columnId: string): SpreadsheetColumn[] => {
  const filtered = sortColumnsByOrder(columns).filter(column => column.id !== columnId)
  return filtered.map((column, order) => ({ ...column, order }))
}

export const mergeRemoteColumnAdd = (columns: SpreadsheetColumn[], column: SpreadsheetColumn): SpreadsheetColumn[] => {
  if (columns.some(entry => entry.id === column.id)) {
    return columns.map(entry => (entry.id === column.id ? { ...entry, ...column } : entry))
  }
  const sorted = sortColumnsByOrder(columns)
  const insertAt = sorted.findIndex(entry => entry.order >= column.order)
  const at = insertAt === -1 ? sorted.length : insertAt
  return [...sorted.slice(0, at), column, ...sorted.slice(at)].map((entry, order) => ({ ...entry, order }))
}
