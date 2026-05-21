import { getClientRowIdentity, type ViewerRow } from './spreadsheetRowIdentity'
import { getViewerRowVisualIndex, sortRowsByCanonicalVisualOrder } from './spreadsheetPeerRowHydration'

type Brand<T, Name extends string> = T & { readonly __brand: Name }

export type GridRowIndex = Brand<number, 'GridRowIndex'>
export type VirtualRowSlot = Brand<number, 'VirtualRowSlot'>
export type VisibleRowIndex = Brand<number, 'VisibleRowIndex'>
export type BackendRowId = Brand<string, 'BackendRowId'>
export type ClientRowId = Brand<string, 'ClientRowId'>
export type UiRowLabel = Brand<number, 'UiRowLabel'>

const normalizeSlotIndex = (value: number): number => Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0))

const getRowSlot = (row: ViewerRow, fallbackIndex: number): number => getViewerRowVisualIndex(row, fallbackIndex)

const withGridRowIndex = <T extends ViewerRow>(row: T, gridRowIndex: number): T => {
  if (row._gridRowIndex === gridRowIndex) {
    return row
  }
  return {
    ...row,
    _gridRowIndex: gridRowIndex
  }
}

const mapMovedSlot = (slot: number, sourceStart: number, count: number, destination: number): number => {
  if (count <= 0) {
    return slot
  }

  const sourceEnd = sourceStart + count
  if (destination >= sourceStart && destination <= sourceEnd) {
    return slot
  }

  if (destination < sourceStart) {
    if (slot >= sourceStart && slot < sourceEnd) {
      return destination + (slot - sourceStart)
    }
    if (slot >= destination && slot < sourceStart) {
      return slot + count
    }
    return slot
  }

  if (slot >= sourceStart && slot < sourceEnd) {
    return destination - count + (slot - sourceStart)
  }
  if (slot >= sourceEnd && slot < destination) {
    return slot - count
  }
  return slot
}

export function resolveMaterializedRowsInSlotRange<T extends ViewerRow>(
  rows: T[],
  startGridRowIndex: number,
  count: number
): T[] {
  const start = normalizeSlotIndex(startGridRowIndex)
  const safeCount = Math.max(0, Math.trunc(count))
  const end = start + safeCount
  return rows.filter((row, index) => {
    const slot = getRowSlot(row, index)
    const backendRowId = typeof row._rowUuid === 'string' && row._rowUuid ? row._rowUuid : String(row.id ?? '')
    return Boolean(backendRowId) && slot >= start && slot < end
  })
}

export function resolveLocalRowsInSlotRange<T extends ViewerRow>(
  rows: T[],
  startGridRowIndex: number,
  count: number
): T[] {
  const start = normalizeSlotIndex(startGridRowIndex)
  const safeCount = Math.max(0, Math.trunc(count))
  const end = start + safeCount
  return rows.filter((row, index) => {
    const slot = getRowSlot(row, index)
    const backendRowId = typeof row._rowUuid === 'string' && row._rowUuid ? row._rowUuid : String(row.id ?? '')
    return !backendRowId && Boolean(getClientRowIdentity(row)) && slot >= start && slot < end
  })
}

export function shiftMaterializedRowsAfterSlot<T extends ViewerRow>(
  rows: T[],
  startGridRowIndex: number,
  delta: number
): T[] {
  if (delta === 0) {
    return [...rows]
  }
  const start = normalizeSlotIndex(startGridRowIndex)
  return sortRowsByCanonicalVisualOrder(rows).map((row, index) => {
    const slot = getRowSlot(row, index)
    if (slot < start) {
      return row
    }
    return withGridRowIndex(row, slot + delta)
  })
}

export function projectRowsToUniverGridSlots<T extends ViewerRow>(rows: T[]): T[] {
  return sortRowsByCanonicalVisualOrder(rows).map((row, index) => withGridRowIndex(row, index))
}

export function applyInsertRowSlotsTransform<T extends ViewerRow>(
  rows: T[],
  startGridRowIndex: number,
  count: number,
  insertedRows: T[] = []
): T[] {
  const start = normalizeSlotIndex(startGridRowIndex)
  const safeCount = Math.max(0, Math.trunc(count))
  if (safeCount === 0) {
    return [...rows]
  }

  const shiftedRows = sortRowsByCanonicalVisualOrder(rows).map((row, index) => {
    const slot = getRowSlot(row, index)
    return slot >= start ? withGridRowIndex(row, slot + safeCount) : row
  })
  const normalizedInsertedRows = insertedRows.map((row, index) => withGridRowIndex(row, start + index))

  return sortRowsByCanonicalVisualOrder([...shiftedRows, ...normalizedInsertedRows])
}

export function applyDeleteRowSlotsTransform<T extends ViewerRow>(
  rows: T[],
  startGridRowIndex: number,
  count: number
): T[] {
  const start = normalizeSlotIndex(startGridRowIndex)
  const safeCount = Math.max(0, Math.trunc(count))
  if (safeCount === 0) {
    return [...rows]
  }

  const end = start + safeCount
  return sortRowsByCanonicalVisualOrder(rows)
    .filter((row, index) => {
      const slot = getRowSlot(row, index)
      return slot < start || slot >= end
    })
    .map((row, index) => {
      const slot = getRowSlot(row, index)
      if (slot < end) {
        return row
      }
      return withGridRowIndex(row, slot - safeCount)
    })
}

export function applyMoveRowSlotsTransform<T extends ViewerRow>(
  rows: T[],
  sourceStartGridRowIndex: number,
  count: number,
  destinationGridRowIndex: number
): T[] {
  const sourceStart = normalizeSlotIndex(sourceStartGridRowIndex)
  const safeCount = Math.max(0, Math.trunc(count))
  const destination = normalizeSlotIndex(destinationGridRowIndex)
  if (safeCount === 0) {
    return [...rows]
  }

  return sortRowsByCanonicalVisualOrder(rows)
    .map((row, index) => {
      const slot = getRowSlot(row, index)
      return withGridRowIndex(row, mapMovedSlot(slot, sourceStart, safeCount, destination))
    })
    .sort((left, right) => getViewerRowVisualIndex(left, 0) - getViewerRowVisualIndex(right, 0))
}
