import type { SpreadsheetColumn } from '../types'
import type { SpreadsheetBatchOperation, SpreadsheetBatchOperationResponse } from '../services/SpreadsheetApiService'
import { mergeInsertedRowsAtIndex } from './spreadsheetInsertRowsAt'
import {
  getSpreadsheetRowRefIdentity,
  getCanonicalRowId,
  getClientRowIdentity,
  resolveSpreadsheetRowRef,
  rowMatchesRemoteId,
  stripEquivalentColumnKeysFromRow,
  type ViewerRow
} from './spreadsheetRowIdentity'

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
    if (!Object.prototype.hasOwnProperty.call(cell, 'value')) {
      nextRows = applyClearCellDelta(nextRows, { rowId, columnName }, columns)
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
  const createdRowByClientId = new Map<string, ViewerRow>()
  createdRows.forEach(row => {
    const clientRowId = getClientRowIdentity(row) || getCanonicalRowId(row)
    if (!clientRowId) return
    createdRowByClientId.set(clientRowId, row)
  })

  const replacedClientRowIds = new Set<string>()
  const nextRows = existingRows.map(row => {
    const clientRowId = getClientRowIdentity(row) || getCanonicalRowId(row)
    if (!clientRowId) return row
    const createdRow = createdRowByClientId.get(clientRowId)
    if (!createdRow) return row
    replacedClientRowIds.add(clientRowId)
    return createdRow
  })

  createdRows.forEach(row => {
    const clientRowId = getClientRowIdentity(row) || getCanonicalRowId(row)
    if (clientRowId && replacedClientRowIds.has(clientRowId)) return
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
      case 'delete_rows':
        nextRows = applyDeleteRowsDelta(nextRows, payload)
        break
      default:
        break
    }
  }

  return nextRows
}
