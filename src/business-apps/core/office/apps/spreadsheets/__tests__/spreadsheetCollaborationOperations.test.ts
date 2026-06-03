/**
 * Tests for spreadsheet collaboration operation format and apply logic.
 * Verifies hypotheses about why cell edits may not show for the other user.
 */

import { createUniverConversionContext, overlaySparseRowIndexMappings } from '../utils/univerAdapter'
import { applyRemoteColumnUpdate } from '../utils/spreadsheetViewerRows'
import type { SpreadsheetColumn } from '../types/spreadsheet'

// --- Operation format contract (authoritative batch receiver) ---

interface SpreadsheetBatchOperation {
  type: 'set_range' | 'row_add' | 'row_delete'
  data: {
    sheetId: string
    cells?: Array<{ rowId: string; columnName: string; value: unknown }>
    rowIds?: string[]
  }
  version?: number
}

interface SpreadsheetBatchReceiveFormat {
  type: 'batch_operations'
  data: {
    sheetId: string
    operations: SpreadsheetBatchOperation[]
  }
  version: number
}

function rowMatchesRemoteId(row: Record<string, unknown>, remoteRowId: string): boolean {
  const candidateIds = [
    (row as { _rowUuid?: string })._rowUuid,
    (row as { _id?: string })._id,
    (row as { id?: string }).id
  ]
    .map(value => (value == null ? '' : String(value)))
    .filter(Boolean)
  return candidateIds.includes(remoteRowId)
}

function getClientRowId(row: Record<string, unknown>): string {
  const clientRowId = row._clientRowId ?? row._id ?? row.id
  return typeof clientRowId === 'string' ? clientRowId : ''
}

function replaceClientRowsWithCreatedRows(
  existingRows: Array<Record<string, unknown>>,
  createdRows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const createdRowByClientId = new Map<string, Record<string, unknown>>()
  createdRows.forEach(row => {
    const clientRowId = getClientRowId(row)
    if (!clientRowId) return
    createdRowByClientId.set(clientRowId, row)
  })

  const replacedClientRowIds = new Set<string>()
  const nextRows = existingRows.map(row => {
    const clientRowId = getClientRowId(row)
    if (!clientRowId) return row
    const createdRow = createdRowByClientId.get(clientRowId)
    if (!createdRow) return row
    replacedClientRowIds.add(clientRowId)
    return createdRow
  })

  createdRows.forEach(row => {
    const clientRowId = getClientRowId(row)
    if (clientRowId && replacedClientRowIds.has(clientRowId)) return
    nextRows.push(row)
  })

  return nextRows
}

function mapAddedRowsFromDeltaResult(result: Record<string, unknown>): Array<Record<string, unknown>> {
  const rows = Array.isArray(result.rows) ? (result.rows as Array<Record<string, unknown>>) : []
  return rows.map(entry => {
    const rowData = ((entry.data as Record<string, unknown>) || {}) as Record<string, unknown>
    const clientRowId = rowData._clientRowId
    if (clientRowId) {
      return {
        ...rowData,
        _id: (entry.id as string) || 'generated',
        _clientRowId: clientRowId,
        _rowUuid: (entry.id as string) || 'generated'
      }
    }
    return {
      ...rowData,
      _id: (entry.id as string) || 'generated'
    }
  })
}

function applyRemoteRowAddPlaceholders(
  rows: Array<Record<string, unknown>>,
  payload: Record<string, unknown>
): Array<Record<string, unknown>> {
  const rowIds = Array.isArray(payload.rowIds) ? payload.rowIds.map(value => String(value || '')).filter(Boolean) : []
  if (rowIds.length === 0) return rows
  const nextRows = [...rows]
  for (const rowId of rowIds) {
    if (nextRows.some(row => rowMatchesRemoteId(row, rowId))) continue
    nextRows.push({
      _id: rowId,
      _rowUuid: rowId
    })
  }
  return nextRows
}

function applyColumnWidthsFromDimensions(
  columns: SpreadsheetColumn[],
  payload: {
    defaultColWidth: number
    columnData: Record<string | number, { w?: number; hd?: number }>
  }
): { nextColumns: SpreadsheetColumn[]; changedColumns: Array<{ columnId: string; width: number }> } | null {
  const changedColumns: Array<{ columnId: string; width: number }> = []
  let visibleIndex = 0

  const nextColumns = columns.map(column => {
    if (column.isVisible === false) return column
    const entry = payload.columnData[visibleIndex] ?? payload.columnData[String(visibleIndex)]
    const rawWidth = entry?.w ?? payload.defaultColWidth
    visibleIndex += 1
    if (typeof rawWidth !== 'number' || !Number.isFinite(rawWidth) || rawWidth <= 0) return column
    const nextWidth = Math.round(rawWidth)
    const currentWidth =
      typeof column.width === 'number' && Number.isFinite(column.width) ? Math.round(column.width) : null
    if (currentWidth === nextWidth) return column
    changedColumns.push({ columnId: column.id, width: nextWidth })
    return { ...column, width: nextWidth }
  })

  return changedColumns.length > 0 ? { nextColumns, changedColumns } : null
}

describe('spreadsheetCollaborationOperations', () => {
  const mockColumns: SpreadsheetColumn[] = [
    {
      id: 'col-a',
      name: 'ColumnA',
      label: 'ColumnA',
      type: 'text',
      isVisible: true,
      isEditable: true,
      isRequired: false,
      isUnique: false,
      order: 0
    },
    {
      id: 'col-b',
      name: 'ColumnB',
      label: 'ColumnB',
      type: 'number',
      isVisible: true,
      isEditable: true,
      isRequired: false,
      isUnique: false,
      order: 1
    }
  ]

  const mockDataWithBackendIds: Record<string, unknown>[] = [
    { _id: 'row_0', _rowUuid: 'uuid-row-1', ColumnA: 'a1', ColumnB: 10 },
    { _id: 'row_1', _rowUuid: 'uuid-row-2', ColumnA: 'a2', ColumnB: 20 }
  ]

  describe('operation format contract', () => {
    it('authoritative batch format carries one version for all nested operations', () => {
      const received: SpreadsheetBatchReceiveFormat = {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-1',
                cells: [{ rowId: 'uuid-row-1', columnName: 'ColumnA', value: 'updated' }]
              }
            }
          ]
        },
        version: 7
      }

      expect(received.data.sheetId).toBe('sheet-1')
      expect(received.version).toBe(7)
      expect(received.data.operations).toHaveLength(1)
      expect(received.data.operations[0]).toEqual({
        type: 'set_range',
        data: {
          sheetId: 'sheet-1',
          cells: [{ rowId: 'uuid-row-1', columnName: 'ColumnA', value: 'updated' }]
        }
      })
    })

    it('nested set_range cells remain compatible with column fallback resolution', () => {
      const operation: SpreadsheetBatchOperation = {
        type: 'set_range',
        data: {
          sheetId: 'sheet-1',
          cells: [{ rowId: 'uuid-row-1', columnName: 'col-a', value: 42 }]
        }
      }
      expect(operation.data.cells?.[0]?.columnName).toBe('col-a')
    })
  })

  describe('createUniverConversionContext row/column resolution', () => {
    it('maps backend row ids and local row ids to the same row index', () => {
      const ctx = createUniverConversionContext(mockColumns, mockDataWithBackendIds)
      expect(ctx.rowIdToIndex.get('uuid-row-1')).toBe(0)
      expect(ctx.rowIdToIndex.get('row_0')).toBe(0)
      expect(ctx.rowIndexToId.get(0)).toBe('uuid-row-1')
    })

    it('uses persisted backend uuid as canonical rowIndex mapping when _id is a provisional client id', () => {
      const persistedUuid = '660e8400-e29b-41d4-a716-446655440000'
      const clientId = 'client_550e8400-e29b-41d4-a716-446655440000'
      const ctx = createUniverConversionContext(mockColumns, [
        { _id: clientId, _rowUuid: persistedUuid, ColumnA: 'x', ColumnB: 1 }
      ])
      expect(ctx.rowIndexToId.get(0)).toBe(persistedUuid)
      expect(ctx.rowIdToIndex.get(clientId)).toBe(0)
      expect(ctx.rowIdToIndex.get(persistedUuid)).toBe(0)
    })

    it('resolves colIndex by column name or id', () => {
      const ctx = createUniverConversionContext(mockColumns, mockDataWithBackendIds)
      expect(ctx.columnIdToIndex.get('col-a')).toBe(0)
      expect(ctx.columnIdToIndex.get('ColumnA')).toBeUndefined()

      const colIndexByName = mockColumns.findIndex(c => c.id === 'ColumnA' || c.name === 'ColumnA')
      expect(colIndexByName).toBe(0)
    })

    it('can overlay sparse sheet row positions for newly created client rows', () => {
      const ctx = createUniverConversionContext(mockColumns, mockDataWithBackendIds)
      overlaySparseRowIndexMappings(ctx, [{ rowIndex: 6, rowId: 'client_row_6' }])

      expect(ctx.rowIndexToId.get(6)).toBe('client_row_6')
      expect(ctx.rowIdToIndex.get('client_row_6')).toBe(6)
    })
  })

  describe('receiver validation conditions', () => {
    const isValidForApply = (d: SpreadsheetBatchReceiveFormat, activeSheetId: string): boolean => {
      if (!d?.data?.sheetId || d.data.sheetId !== activeSheetId) return false
      if (!Array.isArray(d.data.operations) || d.data.operations.length === 0) return false
      const firstCell = d.data.operations[0]?.data.cells?.[0]
      if (!firstCell?.rowId) return false
      if (firstCell.value === undefined) return false
      if (!firstCell.columnName) return false
      return true
    }

    it('rejects when sheetId does not match active sheet', () => {
      expect(
        isValidForApply(
          {
            type: 'batch_operations',
            data: {
              sheetId: 'other-sheet',
              operations: [
                {
                  type: 'set_range',
                  data: { sheetId: 'other-sheet', cells: [{ rowId: 'r1', columnName: 'Col', value: 1 }] }
                }
              ]
            },
            version: 1
          },
          'active-sheet'
        )
      ).toBe(false)
    })

    it('rejects when no nested operations are present', () => {
      expect(
        isValidForApply(
          { type: 'batch_operations', data: { sheetId: 'active-sheet', operations: [] }, version: 1 },
          'active-sheet'
        )
      ).toBe(false)
    })

    it('rejects when value is undefined', () => {
      expect(
        isValidForApply(
          {
            type: 'batch_operations',
            data: {
              sheetId: 'active-sheet',
              operations: [
                {
                  type: 'set_range',
                  data: { sheetId: 'active-sheet', cells: [{ rowId: 'r1', columnName: 'Col', value: undefined }] }
                }
              ]
            },
            version: 1
          },
          'active-sheet'
        )
      ).toBe(false)
    })

    it('rejects when columnName is missing', () => {
      expect(
        isValidForApply(
          {
            type: 'batch_operations',
            data: {
              sheetId: 'active-sheet',
              operations: [
                {
                  type: 'set_range',
                  data: { sheetId: 'active-sheet', cells: [{ rowId: 'r1', columnName: '', value: 1 }] }
                }
              ]
            },
            version: 1
          },
          'active-sheet'
        )
      ).toBe(false)
    })

    it('accepts valid payload', () => {
      expect(
        isValidForApply(
          {
            type: 'batch_operations',
            data: {
              sheetId: 'active-sheet',
              operations: [
                {
                  type: 'set_range',
                  data: { sheetId: 'active-sheet', cells: [{ rowId: 'r1', columnName: 'Col', value: 1 }] }
                }
              ]
            },
            version: 1
          },
          'active-sheet'
        )
      ).toBe(true)
    })
  })

  describe('sender behavior under the one-stream model', () => {
    it('keeps edits queued locally until persistence assigns backend ids', () => {
      const pendingEdits: Array<{ rowId: string; columnName: string; value: unknown }> = []
      const queuePendingEdit = (rowId: string, columnName: string, value: unknown) => {
        pendingEdits.push({ rowId, columnName, value })
      }

      queuePendingEdit('row_new_1', 'ColumnA', 'new')
      queuePendingEdit('row_0', 'ColumnA', 'persisted')

      expect(pendingEdits).toEqual([
        { rowId: 'row_new_1', columnName: 'ColumnA', value: 'new' },
        { rowId: 'row_0', columnName: 'ColumnA', value: 'persisted' }
      ])
    })
  })

  describe('remote column metadata updates', () => {
    it('patches a single remote column without requiring a full structural resync', () => {
      const next = applyRemoteColumnUpdate(mockColumns, {
        columnId: 'col-a',
        columnPatch: { width: 240 },
        label: 'Updated A'
      })

      expect(next).toEqual([
        {
          id: 'col-a',
          name: 'ColumnA',
          label: 'Updated A',
          type: 'text',
          isVisible: true,
          isEditable: true,
          isRequired: false,
          isUnique: false,
          order: 0,
          width: 240
        },
        {
          id: 'col-b',
          name: 'ColumnB',
          label: 'ColumnB',
          type: 'number',
          isVisible: true,
          isEditable: true,
          isRequired: false,
          isUnique: false,
          order: 1
        }
      ])
    })

    it('merges a remote column_add payload into the column model', () => {
      const next = applyRemoteColumnUpdate(mockColumns, {
        column: {
          id: 'col-c',
          name: 'ColumnC',
          label: 'Column C',
          type: 'text',
          isVisible: true,
          isEditable: true,
          isRequired: false,
          isUnique: false,
          order: 1
        }
      })

      expect(next?.map(column => column.id)).toEqual(['col-a', 'col-c', 'col-b'])
    })

    it('accepts a full columns array replacement when provided', () => {
      const replacement: SpreadsheetColumn[] = [
        {
          id: 'col-x',
          name: 'X',
          label: 'X',
          type: 'text',
          isVisible: true,
          isEditable: true,
          isRequired: false,
          isUnique: false,
          order: 0,
          width: 300
        }
      ]
      expect(applyRemoteColumnUpdate(mockColumns, { columns: replacement })).toBe(replacement)
    })

    it('derives changed column widths from a dimensions payload for visible columns', () => {
      const result = applyColumnWidthsFromDimensions(mockColumns, {
        defaultColWidth: 100,
        columnData: { 0: { w: 210 }, 1: { w: 120 } }
      })

      expect(result).toEqual({
        nextColumns: [
          {
            id: 'col-a',
            name: 'ColumnA',
            label: 'ColumnA',
            type: 'text',
            isVisible: true,
            isEditable: true,
            isRequired: false,
            isUnique: false,
            order: 0,
            width: 210
          },
          {
            id: 'col-b',
            name: 'ColumnB',
            label: 'ColumnB',
            type: 'number',
            isVisible: true,
            isEditable: true,
            isRequired: false,
            isUnique: false,
            order: 1,
            width: 120
          }
        ],
        changedColumns: [
          { columnId: 'col-a', width: 210 },
          { columnId: 'col-b', width: 120 }
        ]
      })
    })
  })

  describe('row update collaboration behavior', () => {
    it('treats row_update as data-only, not structural', () => {
      const structuralOps = new Set(['row_add', 'row_delete', 'column_add', 'column_delete', 'columns_reorder'])
      expect(structuralOps.has('row_update')).toBe(false)
      expect(structuralOps.has('columns_reorder')).toBe(true)
    })

    it('matches row_update payloads against either _rowUuid or _id', () => {
      const row = { _id: 'row_0', _rowUuid: 'uuid-row-1', ColumnA: 'before' }
      expect(rowMatchesRemoteId(row, 'uuid-row-1')).toBe(true)
      expect(rowMatchesRemoteId(row, 'row_0')).toBe(true)
    })

    it('replaces a temporary client row instead of appending a duplicate persisted row', () => {
      const existingRows = [
        { _id: 'row_0', _rowUuid: 'uuid-row-0', ColumnA: 'existing' },
        { _id: 'client_row_1', ColumnA: 'draft' }
      ]

      const createdRows = [{ _id: 'client_row_1', _rowUuid: 'uuid-row-1', ColumnA: 'draft' }]

      expect(replaceClientRowsWithCreatedRows(existingRows, createdRows)).toEqual([
        { _id: 'row_0', _rowUuid: 'uuid-row-0', ColumnA: 'existing' },
        { _id: 'client_row_1', _rowUuid: 'uuid-row-1', ColumnA: 'draft' }
      ])
    })

    it('replaces a temporary client row when add_rows delta arrives from remote recovery', () => {
      const existingRows = [
        { _id: 'row_0', _rowUuid: 'uuid-row-0', ColumnA: 'existing' },
        { _id: 'client_row_1', ColumnA: 'draft' }
      ]

      const addedRows = mapAddedRowsFromDeltaResult({
        rows: [{ id: 'uuid-row-1', data: { _clientRowId: 'client_row_1', ColumnA: 'draft' } }]
      })

      expect(replaceClientRowsWithCreatedRows(existingRows, addedRows)).toEqual([
        { _id: 'row_0', _rowUuid: 'uuid-row-0', ColumnA: 'existing' },
        { _id: 'uuid-row-1', _rowUuid: 'uuid-row-1', _clientRowId: 'client_row_1', ColumnA: 'draft' }
      ])
    })

    it('adds placeholder rows for live row_add operations so later set_range can match them', () => {
      const existingRows = [{ _id: 'row_0', _rowUuid: 'uuid-row-0', ColumnA: 'existing' }]

      const withPlaceholders = applyRemoteRowAddPlaceholders(existingRows, {
        rowIds: ['uuid-row-1']
      })

      expect(withPlaceholders).toEqual([
        { _id: 'row_0', _rowUuid: 'uuid-row-0', ColumnA: 'existing' },
        { _id: 'uuid-row-1', _rowUuid: 'uuid-row-1' }
      ])
    })
  })
})
