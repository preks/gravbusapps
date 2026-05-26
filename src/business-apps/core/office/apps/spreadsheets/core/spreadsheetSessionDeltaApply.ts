import type { SpreadsheetColumn } from '../types'
import { isSpreadsheetStoredCellClearValue } from './spreadsheetBatchBuilders'
import { applyMoveCellRangeWirePayloadToViewerRows } from '../utils/spreadsheetMoveCellRangeGrid'
import { mergeInsertedRowsAtIndex } from '../utils/spreadsheetInsertRowsAt'
import {
  applyDeleteRowSlotsTransform,
  applyInsertRowSlotsTransform,
  applyMoveRowSlotsTransform
} from '../utils/spreadsheetRowSlotTransforms'
import { getClientRowIdentity, rowMatchesRemoteId } from '../utils/spreadsheetRowIdentity'
import { getKnownCellValueCount } from './spreadsheetSnapshotWorkbookUtils'
import type { SpreadsheetViewerRow } from './SpreadsheetSession'

const resolveColumnAliasInfo = (
  columnKey: string,
  columns?: SpreadsheetColumn[]
): { targetColumnName: string; normalizedAliases: Set<string> } => {
  const targetColumn = columns?.find(
    column => column.id === columnKey || column.name === columnKey || column.label === columnKey
  )
  const aliases = [columnKey, targetColumn?.name, targetColumn?.id, targetColumn?.label]
    .map(value => (value == null ? '' : String(value).trim()))
    .filter(Boolean)
    .map(value => value.toLowerCase())
  return {
    targetColumnName: targetColumn?.name ?? String(columnKey),
    normalizedAliases: new Set(aliases)
  }
}

const stripEquivalentColumnKeysFromRow = (
  row: SpreadsheetViewerRow,
  columnKey: string,
  columns?: SpreadsheetColumn[]
): { nextRow: SpreadsheetViewerRow; targetColumnName: string } => {
  const { targetColumnName, normalizedAliases } = resolveColumnAliasInfo(columnKey, columns)
  const nextRow: SpreadsheetViewerRow = { ...row }
  for (const rowKey of Object.keys(nextRow)) {
    if (!normalizedAliases.has(rowKey.toLowerCase())) continue
    delete nextRow[rowKey]
  }
  return { nextRow, targetColumnName }
}

const mergeDuplicateClientRows = (rows: SpreadsheetViewerRow[]): SpreadsheetViewerRow[] => {
  const mergedByClientId = new Map<string, SpreadsheetViewerRow>()
  const output: SpreadsheetViewerRow[] = []
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
    const merged = nextCount >= existingCount ? { ...existing, ...row } : { ...row, ...existing }
    const existingIndex = output.indexOf(existing)
    if (existingIndex >= 0) {
      output[existingIndex] = merged
    }
    mergedByClientId.set(clientRowId, merged)
  }
  return output
}

const replaceClientRowsWithCreatedRows = (
  existingRows: SpreadsheetViewerRow[],
  createdRows: SpreadsheetViewerRow[]
): SpreadsheetViewerRow[] => {
  const createdRowByClientId = new Map<string, SpreadsheetViewerRow>()
  createdRows.forEach(row => {
    const clientRowId = getClientRowIdentity(row)
    if (!clientRowId) return
    createdRowByClientId.set(clientRowId, row)
  })

  const replacedClientRowIds = new Set<string>()
  const nextRows = existingRows.map(row => {
    const clientRowId = getClientRowIdentity(row)
    if (!clientRowId) return row
    const createdRow = createdRowByClientId.get(clientRowId)
    if (!createdRow) return row
    replacedClientRowIds.add(clientRowId)
    return createdRow
  })

  createdRows.forEach(row => {
    const clientRowId = getClientRowIdentity(row)
    if (clientRowId && replacedClientRowIds.has(clientRowId)) return
    nextRows.push(row)
  })

  return mergeDuplicateClientRows(nextRows)
}

const mapAddedRowsFromDeltaResult = (result: Record<string, unknown>): SpreadsheetViewerRow[] => {
  const rows = Array.isArray(result.rows) ? (result.rows as Array<Record<string, unknown>>) : []
  return rows.map((entry, index) => {
    const rowData = ((entry.data as Record<string, unknown>) || {}) as Record<string, unknown>
    const clientRowId = rowData._clientRowId
    if (clientRowId) {
      return {
        ...rowData,
        _id: clientRowId,
        _rowUuid: (entry.id as string) || `row_${index}`
      }
    }
    return {
      ...rowData,
      _id: (entry.id as string) || `row_${index}`
    }
  })
}

const applySetCellDelta = (
  rows: SpreadsheetViewerRow[],
  payload: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): SpreadsheetViewerRow[] => {
  const rowId = String(payload.rowId || '')
  const columnName = String(payload.columnName || payload.column || '')
  const value = payload.value
  if (isSpreadsheetStoredCellClearValue(value)) {
    return applyClearCellDelta(rows, payload, columns)
  }
  let matched = false
  const nextRows = rows.map(row => {
    if (!rowMatchesRemoteId(row, rowId)) return row
    matched = true
    const { nextRow, targetColumnName } = stripEquivalentColumnKeysFromRow(row, columnName, columns)
    nextRow[targetColumnName] = value
    return nextRow
  })
  if (!rowId || !columnName || matched) return nextRows
  const { targetColumnName } = resolveColumnAliasInfo(columnName, columns)
  return [...nextRows, { _id: rowId, _rowUuid: rowId, [targetColumnName]: value }]
}

const applySetRangeDelta = (
  rows: SpreadsheetViewerRow[],
  payload: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): SpreadsheetViewerRow[] => {
  const cells = Array.isArray(payload.cells) ? (payload.cells as Array<Record<string, unknown>>) : []
  let nextRows = rows
  for (const cell of cells) {
    const rowId = String(cell.rowId || '')
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
  rows: SpreadsheetViewerRow[],
  payload: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): SpreadsheetViewerRow[] => {
  const rowId = String(payload.rowId || '')
  const columnName = String(payload.columnName || payload.column || '')
  return rows.map(row => {
    if (!rowMatchesRemoteId(row, rowId)) return row
    return stripEquivalentColumnKeysFromRow(row, columnName, columns).nextRow
  })
}

const applyDeleteRowsDelta = (
  rows: SpreadsheetViewerRow[],
  payload: Record<string, unknown>
): SpreadsheetViewerRow[] => {
  const rowIds = Array.isArray(payload.rowIds) ? (payload.rowIds as Array<unknown>).map(String) : []
  return rows.filter(row => !rowIds.some(rowId => rowMatchesRemoteId(row, rowId)))
}

const applySingleDeltaChange = (
  rows: SpreadsheetViewerRow[],
  change: unknown,
  columns?: SpreadsheetColumn[]
): SpreadsheetViewerRow[] => {
  const changeRecord = change as Record<string, unknown>
  const opType = String(changeRecord.operationType || '')
  const payload = (changeRecord.payload || {}) as Record<string, unknown>
  const result = (changeRecord.result || {}) as Record<string, unknown>
  switch (opType) {
    case 'set_cell':
      return applySetCellDelta(rows, payload, columns)
    case 'set_range':
      return applySetRangeDelta(rows, payload, columns)
    case 'clear_cell':
      return applyClearCellDelta(rows, payload, columns)
    case 'add_rows':
      return replaceClientRowsWithCreatedRows(rows, mapAddedRowsFromDeltaResult(result))
    case 'insert_rows_at': {
      const insertAt = Number(payload.insertAt ?? result.insertAt ?? rows.length)
      return mergeInsertedRowsAtIndex(
        rows,
        mapAddedRowsFromDeltaResult(result),
        Number.isFinite(insertAt) ? insertAt : rows.length
      )
    }
    case 'insert_row_slots': {
      const startGridRowIndex = Number(payload.startGridRowIndex ?? result.startGridRowIndex ?? rows.length)
      const count = Number(payload.count ?? result.count ?? 0)
      return applyInsertRowSlotsTransform(
        rows,
        Number.isFinite(startGridRowIndex) ? startGridRowIndex : rows.length,
        Number.isFinite(count) ? count : 0,
        mapAddedRowsFromDeltaResult(result)
      )
    }
    case 'delete_rows':
      return applyDeleteRowsDelta(rows, payload)
    case 'delete_row_slots': {
      const startGridRowIndex = Number(payload.startGridRowIndex ?? 0)
      const count = Number(payload.count ?? 0)
      return applyDeleteRowSlotsTransform(
        rows,
        Number.isFinite(startGridRowIndex) ? startGridRowIndex : 0,
        Number.isFinite(count) ? count : 0
      )
    }
    case 'move_row_slots': {
      const sourceStartGridRowIndex = Number(payload.sourceStartGridRowIndex ?? 0)
      const destinationGridRowIndex = Number(payload.destinationGridRowIndex ?? 0)
      const count = Number(payload.count ?? 0)
      return applyMoveRowSlotsTransform(
        rows,
        Number.isFinite(sourceStartGridRowIndex) ? sourceStartGridRowIndex : 0,
        Number.isFinite(count) ? count : 0,
        Number.isFinite(destinationGridRowIndex) ? destinationGridRowIndex : 0
      )
    }
    case 'column_delete': {
      const columnId = String(payload.columnId ?? '')
      if (!columnId) return rows
      const column = columns?.find(entry => entry.id === columnId)
      const keysToStrip = new Set(
        [columnId, column?.name, column?.id, column?.label]
          .map(value => (value == null ? '' : String(value).trim()))
          .filter(Boolean)
          .map(value => value.toLowerCase())
      )
      if (keysToStrip.size === 0) return rows
      return rows.map(row => {
        const nextRow: SpreadsheetViewerRow = { ...row }
        for (const key of Object.keys(nextRow)) {
          if (keysToStrip.has(key.toLowerCase())) {
            delete nextRow[key]
          }
        }
        return nextRow
      })
    }
    case 'move_cell_range': {
      if (!columns) return rows
      return applyMoveCellRangeWirePayloadToViewerRows({
        rows,
        columns,
        fromRange: payload.fromRange,
        toRange: payload.toRange
      })
    }
    default:
      return rows
  }
}

export const applySpreadsheetSessionDeltaChangesToRows = (
  baseRows: SpreadsheetViewerRow[],
  changes: unknown[] | undefined,
  columns?: SpreadsheetColumn[]
): SpreadsheetViewerRow[] => {
  let next = [...baseRows]
  for (const change of changes ?? []) {
    next = applySingleDeltaChange(next, change, columns)
  }
  return next
}
