import type { SpreadsheetColumn } from '../types'
import { isSpreadsheetStoredCellClearValue } from './spreadsheetBatchBuilders'
import { applyMoveCellRangeWirePayloadToViewerRows } from '../utils/spreadsheetMoveCellRangeGrid'
import { mergeInsertedRowsAtIndex } from '../utils/spreadsheetInsertRowsAt'
import {
  applyDeleteRowSlotsTransform,
  applyInsertRowSlotsTransform,
  applyMoveRowSlotsTransform
} from '../utils/spreadsheetRowSlotTransforms'
import { getCanonicalRowId, getClientRowIdentity, rowMatchesRemoteId } from '../utils/spreadsheetRowIdentity'
import { getFiniteNonNegativeGridRowIndex, getViewerRowVisualIndex } from '../utils/spreadsheetPeerRowHydration'
import { mergeDuplicateRowsPreferIncoming } from '../utils/spreadsheetViewerRows'
import type { SpreadsheetViewerRow } from './SpreadsheetSession'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

const getDurableRowIdentity = (row: SpreadsheetViewerRow): string => {
  const explicit = row._rowUuid ?? row.UUID ?? row.uuid
  if (typeof explicit === 'string' && explicit) return explicit
  const canonical = getCanonicalRowId(row)
  return UUID_RE.test(canonical) ? canonical : ''
}

const getMergeableGridRowIndex = (row: SpreadsheetViewerRow): number | undefined =>
  getDurableRowIdentity(row) ? getFiniteNonNegativeGridRowIndex(row) : undefined

const mergeDuplicateClientRows = (rows: SpreadsheetViewerRow[]): SpreadsheetViewerRow[] => {
  const mergedByClientId = new Map<string, SpreadsheetViewerRow>()
  const mergedByDurableId = new Map<string, SpreadsheetViewerRow>()
  const mergedByGridRowIndex = new Map<number, SpreadsheetViewerRow>()
  const output: SpreadsheetViewerRow[] = []

  const remember = (row: SpreadsheetViewerRow): void => {
    const clientRowId = getClientRowIdentity(row)
    if (clientRowId) mergedByClientId.set(clientRowId, row)
    const durableId = getDurableRowIdentity(row)
    if (durableId) mergedByDurableId.set(durableId, row)
    const gridRowIndex = getMergeableGridRowIndex(row)
    if (gridRowIndex !== undefined) mergedByGridRowIndex.set(gridRowIndex, row)
  }

  for (const row of rows) {
    const clientRowId = getClientRowIdentity(row)
    const durableId = getDurableRowIdentity(row)
    const gridRowIndex = getMergeableGridRowIndex(row)
    const existing =
      (durableId ? mergedByDurableId.get(durableId) : undefined) ??
      (gridRowIndex !== undefined ? mergedByGridRowIndex.get(gridRowIndex) : undefined) ??
      (clientRowId ? mergedByClientId.get(clientRowId) : undefined)

    if (!existing) {
      remember(row)
      output.push(row)
      continue
    }

    const merged = mergeDuplicateRowsPreferIncoming(existing, row)
    const existingIndex = output.indexOf(existing)
    if (existingIndex >= 0) {
      output[existingIndex] = merged
    }
    remember(merged)
    const existingClientRowId = getClientRowIdentity(existing)
    if (existingClientRowId) mergedByClientId.set(existingClientRowId, merged)
    if (clientRowId) mergedByClientId.set(clientRowId, merged)
    if (durableId) mergedByDurableId.set(durableId, merged)
    if (gridRowIndex !== undefined) mergedByGridRowIndex.set(gridRowIndex, merged)
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

type ClearAllRange = {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

const numberOrNull = (value: unknown): number | null => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return Math.trunc(numeric)
}

const normalizeClearAllRanges = (payload: Record<string, unknown>): ClearAllRange[] => {
  const rawRanges = Array.isArray(payload.ranges) ? payload.ranges : []
  const normalized: ClearAllRange[] = []
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

const findRowIndexAtGridRowIndex = (rows: SpreadsheetViewerRow[], gridRowIndex: number): number | undefined => {
  for (let index = 0; index < rows.length; index += 1) {
    if (getViewerRowVisualIndex(rows[index], index) === gridRowIndex) {
      return index
    }
  }
  return undefined
}

/** Clear covered cell values for merge_ranges (anchor cell keeps its value; matches server). */
export const applyMergeRangesDelta = (
  rows: SpreadsheetViewerRow[],
  payload: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): SpreadsheetViewerRow[] => {
  const ranges = normalizeClearAllRanges(payload)
  if (ranges.length === 0) return rows

  const visibleColumns = (columns ?? []).filter(column => column.isVisible !== false)
  if (visibleColumns.length === 0) return rows

  const nextRows = rows.map(row => ({ ...row }))
  for (const range of ranges) {
    const maxCol = Math.min(range.endColumn, visibleColumns.length - 1)
    for (let gridRowIndex = range.startRow; gridRowIndex <= range.endRow; gridRowIndex += 1) {
      const rowIndex = findRowIndexAtGridRowIndex(nextRows, gridRowIndex)
      if (rowIndex == null) continue
      let nextRow = nextRows[rowIndex]
      for (let colIndex = range.startColumn; colIndex <= maxCol; colIndex += 1) {
        if (gridRowIndex === range.startRow && colIndex === range.startColumn) continue
        const column = visibleColumns[colIndex]
        if (!column?.name) continue
        nextRow = stripEquivalentColumnKeysFromRow(nextRow, column.name, columns).nextRow
      }
      nextRows[rowIndex] = nextRow
    }
  }
  return nextRows
}

/** Wipe viewer-row column values for every cell inside clear_all ranges (matches server projection). */
export const applyClearAllDelta = (
  rows: SpreadsheetViewerRow[],
  payload: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): SpreadsheetViewerRow[] => {
  const ranges = normalizeClearAllRanges(payload)
  if (ranges.length === 0) return rows

  const visibleColumns = (columns ?? []).filter(column => column.isVisible !== false)
  if (visibleColumns.length === 0) return rows

  const nextRows = rows.map(row => ({ ...row }))
  for (const range of ranges) {
    const maxCol = Math.min(range.endColumn, visibleColumns.length - 1)
    for (let gridRowIndex = range.startRow; gridRowIndex <= range.endRow; gridRowIndex += 1) {
      const rowIndex = findRowIndexAtGridRowIndex(nextRows, gridRowIndex)
      if (rowIndex == null) continue
      let nextRow = nextRows[rowIndex]
      for (let colIndex = range.startColumn; colIndex <= maxCol; colIndex += 1) {
        const column = visibleColumns[colIndex]
        if (!column?.name) continue
        nextRow = stripEquivalentColumnKeysFromRow(nextRow, column.name, columns).nextRow
      }
      nextRows[rowIndex] = nextRow
    }
  }
  return nextRows
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
    case 'clear_all':
      return applyClearAllDelta(rows, payload, columns)
    case 'merge_ranges':
      return applyMergeRangesDelta(rows, payload, columns)
    case 'unmerge_ranges':
      return rows
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
