import type { SpreadsheetColumn } from '../types'
import { isSpreadsheetStoredCellClearValue } from '../core/spreadsheetBatchBuilders'
import type { SpreadsheetBatchOperation, SpreadsheetBatchOperationResponse } from '../services/SpreadsheetApiService'
import { mergeInsertedRowsAtIndex } from './spreadsheetInsertRowsAt'
import { applyMoveCellRangeWirePayloadToViewerRows } from './spreadsheetMoveCellRangeGrid'
import {
  applyDeleteRowSlotsTransform,
  applyInsertRowSlotsTransform,
  applyMoveRowSlotsTransform
} from './spreadsheetRowSlotTransforms'
import {
  getSpreadsheetRowRefIdentity,
  getCanonicalRowId,
  getClientRowIdentity,
  resolveSpreadsheetRowRef,
  rowMatchesRemoteId,
  stripEquivalentColumnKeysFromRow,
  type ViewerRow
} from './spreadsheetRowIdentity'
import { getFiniteNonNegativeGridRowIndex } from './spreadsheetPeerRowHydration'
import { applyClearAllDelta } from '../core/spreadsheetSessionDeltaApply'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const resolvePayloadRowIdentity = (payload: Record<string, unknown>): string => {
  const rowId = String(payload.rowId || '')
  if (rowId) return rowId
  const rowRef = resolveSpreadsheetRowRef(payload.rowRef)
  return rowRef ? getSpreadsheetRowRefIdentity(rowRef) : ''
}

const applySetCellDelta = (
  rows: ViewerRow[],
  payload: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): ViewerRow[] => {
  const rowId = resolvePayloadRowIdentity(payload)
  const columnName = String(payload.columnName || payload.column || '')
  const value = payload.value
  if (isSpreadsheetStoredCellClearValue(value)) {
    return applyClearCellDelta(rows, payload, columns)
  }
  return rows.map(row => {
    if (!rowMatchesRemoteId(row, rowId)) return row
    const cleared = stripEquivalentColumnKeysFromRow(row, columnName, columns)
    return {
      ...cleared.nextRow,
      [cleared.targetColumnName]: value
    }
  })
}

const applySetRangeDelta = (
  rows: ViewerRow[],
  payload: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): ViewerRow[] => {
  const cells = Array.isArray(payload.cells) ? (payload.cells as Array<Record<string, unknown>>) : []
  let nextRows = rows
  for (const cell of cells) {
    const rowId = resolvePayloadRowIdentity(cell)
    const columnName = String(cell.columnName || cell.column || '')
    if (!rowId || !columnName) continue
    if (!Object.prototype.hasOwnProperty.call(cell, 'value') || isSpreadsheetStoredCellClearValue(cell.value)) {
      nextRows = applyClearCellDelta(nextRows, cell, columns)
      continue
    }
    nextRows = applySetCellDelta(nextRows, { rowId, columnName, value: cell.value }, columns)
  }
  return nextRows
}

const applyClearCellDelta = (
  rows: ViewerRow[],
  payload: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): ViewerRow[] => {
  const rowId = resolvePayloadRowIdentity(payload)
  const columnName = String(payload.columnName || payload.column || '')
  return rows.map(row => {
    if (!rowMatchesRemoteId(row, rowId)) return row
    return stripEquivalentColumnKeysFromRow(row, columnName, columns).nextRow
  })
}

const mapAddedRowsFromDeltaResult = (result: Record<string, unknown>): ViewerRow[] => {
  const rows = Array.isArray(result.rows) ? (result.rows as Array<Record<string, unknown>>) : []
  return rows.map(entry => {
    const rowData = ((entry.data as Record<string, unknown>) || {}) as Record<string, unknown>
    const clientRowId = rowData._clientRowId
    if (clientRowId) {
      return {
        ...rowData,
        _id: (entry.id as string) || `row_${Math.random().toString(16).slice(2)}`,
        _clientRowId: clientRowId,
        _rowUuid: (entry.id as string) || `row_${Math.random().toString(16).slice(2)}`
      }
    }
    return {
      ...rowData,
      _id: (entry.id as string) || `row_${Math.random().toString(16).slice(2)}`
    }
  })
}

const replaceClientRowsWithCreatedRows = (existingRows: ViewerRow[], createdRows: ViewerRow[]): ViewerRow[] => {
  const getDurableRowIdentity = (row: ViewerRow): string => {
    const explicit = row._rowUuid ?? row.UUID ?? row.uuid
    if (typeof explicit === 'string' && explicit) return explicit
    const canonical = getCanonicalRowId(row)
    return UUID_RE.test(canonical) ? canonical : ''
  }
  const getMergeableGridRowIndex = (row: ViewerRow): number | undefined =>
    getDurableRowIdentity(row) ? getFiniteNonNegativeGridRowIndex(row) : undefined
  const createdRowByClientId = new Map<string, ViewerRow>()
  const createdRowByDurableId = new Map<string, ViewerRow>()
  const createdRowByGridRowIndex = new Map<number, ViewerRow>()
  createdRows.forEach(row => {
    const clientRowId = getClientRowIdentity(row) || getCanonicalRowId(row)
    if (clientRowId) createdRowByClientId.set(clientRowId, row)
    const durableId = getDurableRowIdentity(row)
    if (durableId) createdRowByDurableId.set(durableId, row)
    const gridRowIndex = getMergeableGridRowIndex(row)
    if (gridRowIndex !== undefined) createdRowByGridRowIndex.set(gridRowIndex, row)
  })

  const replacedCreatedRows = new Set<ViewerRow>()
  const nextRows = existingRows.map(row => {
    const clientRowId = getClientRowIdentity(row) || getCanonicalRowId(row)
    const durableId = getDurableRowIdentity(row)
    const gridRowIndex = getMergeableGridRowIndex(row)
    const createdRow =
      (durableId ? createdRowByDurableId.get(durableId) : undefined) ??
      (gridRowIndex !== undefined ? createdRowByGridRowIndex.get(gridRowIndex) : undefined) ??
      (clientRowId ? createdRowByClientId.get(clientRowId) : undefined)
    if (!createdRow) return row
    replacedCreatedRows.add(createdRow)
    return { ...row, ...createdRow }
  })

  createdRows.forEach(row => {
    if (replacedCreatedRows.has(row)) return
    nextRows.push(row)
  })

  return nextRows
}

const applyDeleteRowsDelta = (rows: ViewerRow[], payload: Record<string, unknown>): ViewerRow[] => {
  const rowIds = Array.isArray(payload.rowIds) ? (payload.rowIds as Array<unknown>).map(String) : []
  const rowRefs = Array.isArray(payload.rowRefs)
    ? (payload.rowRefs as Array<Record<string, unknown>>)
        .map(rowRef => resolveSpreadsheetRowRef(rowRef))
        .filter((rowRef): rowRef is NonNullable<typeof rowRef> => Boolean(rowRef))
        .map(getSpreadsheetRowRefIdentity)
    : []
  const allIds = [...rowIds, ...rowRefs]
  return rows.filter(row => !allIds.some(rowId => rowMatchesRemoteId(row, rowId)))
}

export const applyAuthoritativeBatchResponseToRows = (
  baseRows: ViewerRow[],
  operations: SpreadsheetBatchOperation[],
  response: SpreadsheetBatchOperationResponse,
  columns?: SpreadsheetColumn[]
): ViewerRow[] => {
  if (operations.length === 0) return baseRows

  const resultByOperationId = new Map(
    (response.operationResults ?? []).map(entry => [entry.operationId, entry.result as Record<string, unknown>])
  )

  let nextRows = [...baseRows]
  for (const operation of operations) {
    const payload = (operation.data ?? {}) as Record<string, unknown>
    switch (operation.type) {
      case 'set_cell':
        nextRows = applySetCellDelta(nextRows, payload, columns)
        break
      case 'set_range':
        nextRows = applySetRangeDelta(nextRows, payload, columns)
        break
      case 'clear_cell':
        nextRows = applyClearCellDelta(nextRows, payload, columns)
        break
      case 'clear_all':
        nextRows = applyClearAllDelta(nextRows, payload, columns)
        break
      case 'add_rows':
        nextRows = replaceClientRowsWithCreatedRows(
          nextRows,
          mapAddedRowsFromDeltaResult(resultByOperationId.get(operation.operationId) ?? {})
        )
        break
      case 'insert_rows_at': {
        const result = resultByOperationId.get(operation.operationId) ?? {}
        const insertAt = Number(payload.insertAt ?? result.insertAt ?? nextRows.length)
        nextRows = mergeInsertedRowsAtIndex(
          nextRows,
          mapAddedRowsFromDeltaResult(result),
          Number.isFinite(insertAt) ? insertAt : nextRows.length
        )
        break
      }
      case 'insert_row_slots': {
        const result = resultByOperationId.get(operation.operationId) ?? {}
        const startGridRowIndex = Number(payload.startGridRowIndex ?? result.startGridRowIndex ?? nextRows.length)
        const count = Number(payload.count ?? result.count ?? 0)
        nextRows = applyInsertRowSlotsTransform(
          nextRows,
          Number.isFinite(startGridRowIndex) ? startGridRowIndex : nextRows.length,
          Number.isFinite(count) ? count : 0,
          mapAddedRowsFromDeltaResult(result)
        )
        break
      }
      case 'delete_rows':
        nextRows = applyDeleteRowsDelta(nextRows, payload)
        break
      case 'delete_row_slots': {
        const startGridRowIndex = Number(payload.startGridRowIndex ?? 0)
        const count = Number(payload.count ?? 0)
        nextRows = applyDeleteRowSlotsTransform(
          nextRows,
          Number.isFinite(startGridRowIndex) ? startGridRowIndex : 0,
          Number.isFinite(count) ? count : 0
        )
        break
      }
      case 'move_row_slots': {
        const sourceStartGridRowIndex = Number(payload.sourceStartGridRowIndex ?? 0)
        const destinationGridRowIndex = Number(payload.destinationGridRowIndex ?? 0)
        const count = Number(payload.count ?? 0)
        nextRows = applyMoveRowSlotsTransform(
          nextRows,
          Number.isFinite(sourceStartGridRowIndex) ? sourceStartGridRowIndex : 0,
          Number.isFinite(count) ? count : 0,
          Number.isFinite(destinationGridRowIndex) ? destinationGridRowIndex : 0
        )
        break
      }
      case 'move_cell_range': {
        if (columns) {
          nextRows = applyMoveCellRangeWirePayloadToViewerRows({
            rows: nextRows,
            columns,
            fromRange: payload.fromRange,
            toRange: payload.toRange
          })
        }
        break
      }
      default:
        break
    }
  }

  return nextRows
}
