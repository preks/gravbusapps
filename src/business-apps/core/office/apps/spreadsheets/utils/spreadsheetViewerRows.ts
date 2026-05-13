import type { SpreadsheetColumn } from '../types'
import type { SpreadsheetPendingCellChange as CellChange } from '../core'
import { getCanonicalRowId, getClientRowIdentity } from './spreadsheetRowIdentity'
import { getKnownCellValueCount } from '../core'
import {
  mergeAuthoritativeViewerRowsIntoWorkbookSnapshot,
  stripWorkbookSnapshotValuesPreservingFormatting
} from './univerAdapter'
import { getFiniteNonNegativeGridRowIndex } from './spreadsheetPeerRowHydration'
import { shouldSkipFreshRowCellReplay } from './spreadsheetPendingCells'
import type { SnapshotCellCoordinate } from '../core'

export type ViewerRow = Record<string, unknown>

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const isUuidString = (value: string): boolean => UUID_RE.test(value)

export const viewerRowId = (row: Record<string, unknown>): string => getCanonicalRowId(row)

/** Cap for splitting batched clear-cell ops into individual ops when flushing to backend. */
export const MAX_INDIVIDUAL_CLEAR_CELL_OPS = 200

export const mergeDuplicateClientRows = <T extends Record<string, unknown>>(rows: T[]): T[] => {
  const mergedByClientId = new Map<string, T>()
  const output: T[] = []

  for (const row of rows) {
    const clientRowId = getClientRowIdentity(row)
    if (!clientRowId) {
      output.push(row)
      continue
    }

    const existing = mergedByClientId.get(clientRowId)
    if (!existing) {
      mergedByClientId.set(clientRowId, row)
      output.push(row)
      continue
    }

    const existingCount = getKnownCellValueCount(existing)
    const nextCount = getKnownCellValueCount(row)
    const merged = (nextCount >= existingCount ? { ...existing, ...row } : { ...row, ...existing }) as T
    const existingIndex = output.indexOf(existing)
    if (existingIndex >= 0) output[existingIndex] = merged
    mergedByClientId.set(clientRowId, merged)
  }

  return output
}

export const buildAnalyticsInsertPayloads = (
  rows: Array<Record<string, unknown>>,
  columns: SpreadsheetColumn[]
): Array<Record<string, unknown>> =>
  rows
    .map(row => {
      const payload: Record<string, unknown> = {}
      columns.forEach(column => {
        if (row[column.name] !== undefined) {
          payload[column.name] = row[column.name]
        }
      })
      return payload
    })
    .filter(payload => Object.keys(payload).length > 0)

export const applyRemoteColumnUpdate = (
  columns: SpreadsheetColumn[],
  payload: {
    columnId?: string
    columnPatch?: Partial<SpreadsheetColumn>
    label?: string
    columns?: SpreadsheetColumn[]
  }
): SpreadsheetColumn[] | null => {
  if (Array.isArray(payload.columns) && payload.columns.length > 0) {
    return payload.columns
  }
  if (!payload.columnId) return null
  const nextPatch: Partial<SpreadsheetColumn> = { ...(payload.columnPatch ?? {}) }
  if (typeof payload.label === 'string' && payload.label.trim()) {
    nextPatch.label = payload.label.trim()
  }
  if (Object.keys(nextPatch).length === 0) return null
  return columns.map(column => (column.id === payload.columnId ? { ...column, ...nextPatch } : column))
}

export const mapSnapshotRowsToViewerRows = (snapshotRows: unknown[]): ViewerRow[] =>
  mergeDuplicateClientRows(
    snapshotRows.map(row => {
      const rowRecord = row as Record<string, unknown>
      const raw = (rowRecord.data as Record<string, unknown>) || {}
      const clientRowId = raw._clientRowId
      if (clientRowId) {
        return {
          ...raw,
          _id: clientRowId,
          _rowUuid: rowRecord.id as string
        }
      }
      return {
        ...raw,
        _id: rowRecord.id as string
      }
    })
  )

export const partitionCellUpdatesByBackendRowId = (
  queuedCells: CellChange[],
  uiToBackendRowId: Map<string, string>,
  pendingClientRowUpdates: Map<string, Record<string, unknown>>,
  isUuid: (value: string) => boolean
): {
  setUpdatesByBackendRowId: Map<string, Record<string, unknown>>
  clearCells: Array<{ rowId: string; columnName: string }>
} => {
  const setUpdatesByBackendRowId = new Map<string, Record<string, unknown>>()
  const clearColumnsByBackendRowId = new Map<string, Set<string>>()
  for (const cell of queuedCells) {
    const uiRowId = String(cell.rowId)
    const backendRowId = uiToBackendRowId.get(uiRowId) ?? (isUuid(uiRowId) ? uiRowId : undefined)
    if (!backendRowId) {
      const pending = pendingClientRowUpdates.get(uiRowId) ?? {}
      pending[cell.columnName] = cell.value
      pendingClientRowUpdates.set(uiRowId, pending)
      continue
    }
    const backendUpdates = setUpdatesByBackendRowId.get(backendRowId) ?? {}
    const clearColumns = clearColumnsByBackendRowId.get(backendRowId) ?? new Set<string>()
    if (cell.value === undefined) {
      delete backendUpdates[cell.columnName]
      if (Object.keys(backendUpdates).length === 0) {
        setUpdatesByBackendRowId.delete(backendRowId)
      } else {
        setUpdatesByBackendRowId.set(backendRowId, backendUpdates)
      }
      clearColumns.add(cell.columnName)
      clearColumnsByBackendRowId.set(backendRowId, clearColumns)
      continue
    }

    clearColumns.delete(cell.columnName)
    if (clearColumns.size === 0) {
      clearColumnsByBackendRowId.delete(backendRowId)
    } else {
      clearColumnsByBackendRowId.set(backendRowId, clearColumns)
    }
    backendUpdates[cell.columnName] = cell.value
    setUpdatesByBackendRowId.set(backendRowId, backendUpdates)
  }
  const clearCells = Array.from(clearColumnsByBackendRowId.entries()).flatMap(([rowId, columnNames]) =>
    Array.from(columnNames).map(columnName => ({ rowId, columnName }))
  )
  return { setUpdatesByBackendRowId, clearCells }
}

export const buildAddRowPayloadsFromUniverRows = (
  rows: Array<Record<string, unknown>>,
  columns: SpreadsheetColumn[]
): Array<Record<string, unknown>> =>
  mergeDuplicateClientRows(rows).map(row => {
    const payload: Record<string, unknown> = {}
    const clientRowId = String(row._id || '')
    if (clientRowId) payload._clientRowId = clientRowId
    const gridRowIndex = getFiniteNonNegativeGridRowIndex(row)
    if (gridRowIndex !== undefined) payload._gridRowIndex = gridRowIndex
    columns.forEach(col => {
      const value = row[col.name]
      if (value !== undefined) payload[col.name] = value
    })
    return payload
  })

export const buildCreatedRowsFromBatch = (
  rowPayloads: Array<Record<string, unknown>>,
  returnedRows: Array<Record<string, unknown>>,
  pendingUpdates: Map<string, Record<string, unknown>>
): {
  createdRows: Array<Record<string, unknown>>
  flushCells: Array<{ rowId: string; columnName: string; value: unknown }>
  persistedIdByClientRowId: Map<string, string>
} => {
  const flushCells: Array<{ rowId: string; columnName: string; value: unknown }> = []
  const persistedIdByClientRowId = new Map<string, string>()
  returnedRows.forEach(entry => {
    const persistedId = entry.id
    if (typeof persistedId !== 'string' || !persistedId) return
    const data = entry.data
    if (!data || typeof data !== 'object') return
    const clientRowId = (data as Record<string, unknown>)._clientRowId
    if (typeof clientRowId === 'string' && clientRowId) {
      persistedIdByClientRowId.set(clientRowId, persistedId)
    }
  })
  const createdRows = rowPayloads.map((rowPayload, index) => {
    const clientRowId = String(rowPayload._clientRowId || '')
    const persistedId =
      (clientRowId ? persistedIdByClientRowId.get(clientRowId) : undefined) ??
      (returnedRows[index]?.id as string | undefined)
    const pending = clientRowId ? pendingUpdates.get(clientRowId) : undefined
    const reconciledPending: Record<string, unknown> = {}
    if (clientRowId && pending) {
      pendingUpdates.delete(clientRowId)
      for (const [columnName, value] of Object.entries(pending)) {
        if (shouldSkipFreshRowCellReplay(rowPayload[columnName], value)) {
          continue
        }
        reconciledPending[columnName] = value
        if (persistedId) {
          flushCells.push({ rowId: persistedId, columnName, value })
        }
      }
    }
    const merged = Object.keys(reconciledPending).length > 0 ? { ...rowPayload, ...reconciledPending } : rowPayload
    return {
      ...merged,
      _id: clientRowId || persistedId || `temp_${index}`,
      ...(persistedId ? { _rowUuid: persistedId } : {})
    }
  })
  return { createdRows, flushCells, persistedIdByClientRowId }
}

export const mapPersistedRowsToViewerRows = (rows: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(rows)) return []
  return rows.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { _id: `temp_${index}` }
    const record = entry as { id?: unknown; data?: unknown }
    const data =
      record.data && typeof record.data === 'object' && !Array.isArray(record.data)
        ? (record.data as Record<string, unknown>)
        : {}
    const clientRowId = data._clientRowId
    if (typeof clientRowId === 'string' && clientRowId) {
      return { ...data, _id: clientRowId, _rowUuid: record.id }
    }
    return { ...data, _id: record.id ?? `temp_${index}` }
  })
}

export const replaceClientRowsWithCreatedRows = (
  existingRows: Array<Record<string, unknown>>,
  createdRows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> => {
  const createdRowByClientId = new Map<string, Record<string, unknown>>()
  createdRows.forEach(row => {
    const clientRowId = viewerRowId(row)
    if (!clientRowId) return
    createdRowByClientId.set(clientRowId, row)
  })

  const replacedClientRowIds = new Set<string>()
  const nextRows = existingRows.map(row => {
    const clientRowId = viewerRowId(row)
    if (!clientRowId) return row
    const createdRow = createdRowByClientId.get(clientRowId)
    if (!createdRow) return row
    replacedClientRowIds.add(clientRowId)
    return createdRow
  })

  createdRows.forEach(row => {
    const clientRowId = viewerRowId(row)
    if (clientRowId && replacedClientRowIds.has(clientRowId)) return
    nextRows.push(row)
  })

  return mergeDuplicateClientRows(nextRows)
}

/** Always rebuild value cells from rows; snapshots contribute formatting/layout only. */
export const overlaySnapshotIfRowsMismatch = (
  snapshot: Record<string, unknown> | null,
  sheetId: string,
  viewerRows: Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): Record<string, unknown> | null => {
  if (!snapshot) return null
  return mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(
    stripWorkbookSnapshotValuesPreservingFormatting(snapshot),
    sheetId,
    viewerRows,
    columns
  )
}

export const snapshotCellCoordinateKey = (row: number, col: number): string => `${row}:${col}`

export const isExplicitSnapshotCellClearValue = (value: unknown): boolean => value === null

export const collectSnapshotClearCoordinates = (
  cells: Array<{ value: unknown; univerRow?: number; univerCol?: number }>
): SnapshotCellCoordinate[] =>
  cells
    .filter(
      (cell): cell is { value: unknown; univerRow: number; univerCol: number } =>
        isExplicitSnapshotCellClearValue(cell.value) &&
        typeof cell.univerRow === 'number' &&
        Number.isFinite(cell.univerRow) &&
        typeof cell.univerCol === 'number' &&
        Number.isFinite(cell.univerCol)
    )
    .map(cell => ({ row: Math.trunc(cell.univerRow), col: Math.trunc(cell.univerCol) }))

export const collectSnapshotValueWriteCoordinates = (
  cells: Array<{ value: unknown; univerRow?: number; univerCol?: number }>
): SnapshotCellCoordinate[] =>
  cells
    .filter(
      (cell): cell is { value: unknown; univerRow: number; univerCol: number } =>
        cell.value !== null &&
        cell.value !== undefined &&
        typeof cell.univerRow === 'number' &&
        Number.isFinite(cell.univerRow) &&
        typeof cell.univerCol === 'number' &&
        Number.isFinite(cell.univerCol)
    )
    .map(cell => ({ row: Math.trunc(cell.univerRow), col: Math.trunc(cell.univerCol) }))

export const appendPendingSnapshotClearCoordinates = (
  pending: Map<string, Set<string>>,
  sheetId: string,
  cells: SnapshotCellCoordinate[]
): void => {
  if (!sheetId || cells.length === 0) return
  const current = pending.get(sheetId) ?? new Set<string>()
  for (const cell of cells) {
    current.add(snapshotCellCoordinateKey(cell.row, cell.col))
  }
  pending.set(sheetId, current)
}

export const removePendingSnapshotClearCoordinates = (
  pending: Map<string, Set<string>>,
  sheetId: string,
  cells: SnapshotCellCoordinate[]
): number => {
  if (!sheetId || cells.length === 0) return 0
  const current = pending.get(sheetId)
  if (!current || current.size === 0) return 0
  let removed = 0
  for (const cell of cells) {
    if (current.delete(snapshotCellCoordinateKey(cell.row, cell.col))) {
      removed += 1
    }
  }
  if (current.size === 0) {
    pending.delete(sheetId)
  }
  return removed
}
