/**
 * Tests for spreadsheet collaboration operation format and apply logic.
 * Verifies hypotheses about why cell edits may not show for the other user.
 */

import { createUniverConversionContext } from '../utils/univerAdapter'
import type { SpreadsheetColumn } from '../types/spreadsheet'

// --- Operation format contract (sender → receiver) ---

/** Shape sent by handleCellsChange (SpreadsheetAppViewer) */
interface CellUpdateSendFormat {
  type: 'cell_update'
  data: {
    sheetId: string
    rowId: string
    column: string
    value: unknown
  }
  broadcastOnly?: boolean
}

/** Shape expected by handleCollaborationOperation (receiver) */
interface CellUpdateReceiveFormat {
  sheetId?: string
  rowId?: string
  column?: string
  columnId?: string
  value?: unknown
}

function applyRemoteColumnUpdate(
  columns: SpreadsheetColumn[],
  payload: {
    columnId?: string
    columnPatch?: Partial<SpreadsheetColumn>
    label?: string
    columns?: SpreadsheetColumn[]
  }
): SpreadsheetColumn[] | null {
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

function applyColumnWidthsFromDimensions(
  columns: SpreadsheetColumn[],
  payload: {
    defaultColWidth: number
    columnData: Record<string | number, { w?: number }>
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
    it('sender format is compatible with receiver expectations', () => {
      const sent: CellUpdateSendFormat = {
        type: 'cell_update',
        data: {
          sheetId: 'sheet-1',
          rowId: 'uuid-row-1',
          column: 'ColumnA',
          value: 'updated'
        },
        broadcastOnly: true
      }

      const d = sent.data as unknown as CellUpdateReceiveFormat
      expect(d.sheetId).toBe('sheet-1')
      expect(d.rowId).toBe('uuid-row-1')
      expect(d.column).toBe('ColumnA')
      expect(d.column ?? d.columnId).toBe('ColumnA')
      expect(d.value).toBe('updated')
    })

    it('receiver accepts columnId as fallback when column is missing', () => {
      const receiveFormat: CellUpdateReceiveFormat = {
        sheetId: 'sheet-1',
        rowId: 'uuid-row-1',
        columnId: 'col-a',
        value: 42
      }
      const columnKey = receiveFormat.column ?? receiveFormat.columnId
      expect(columnKey).toBe('col-a')
    })
  })

  describe('createUniverConversionContext row/column resolution', () => {
    it('rowIdToIndex maps persisted _rowUuid as well as canonical _id (cross-tab collab row id)', () => {
      const ctx = createUniverConversionContext(mockColumns, mockDataWithBackendIds)
      expect(ctx.rowIdToIndex.get('uuid-row-1')).toBe(0)
      expect(ctx.rowIdToIndex.get('row_0')).toBe(0)
      expect(ctx.rowIndexToId.get(0)).toBe('row_0')
    })

    it('resolves colIndex by column name or id', () => {
      const ctx = createUniverConversionContext(mockColumns, mockDataWithBackendIds)
      expect(ctx.columnIdToIndex.get('col-a')).toBe(0)
      expect(ctx.columnIdToIndex.get('ColumnA')).toBeUndefined()

      const colIndexByName = mockColumns.findIndex(c => c.id === 'ColumnA' || c.name === 'ColumnA')
      expect(colIndexByName).toBe(0)
    })
  })

  describe('receiver validation conditions', () => {
    const isValidForApply = (d: CellUpdateReceiveFormat, activeSheetId: string): boolean => {
      if (!d?.sheetId || d.sheetId !== activeSheetId) return false
      if (d.rowId == null) return false
      if (d.value === undefined) return false
      const columnKey = d.column ?? d.columnId
      if (columnKey == null) return false
      return true
    }

    it('rejects when sheetId does not match active sheet', () => {
      expect(isValidForApply({ sheetId: 'other-sheet', rowId: 'r1', column: 'Col', value: 1 }, 'active-sheet')).toBe(
        false
      )
    })

    it('rejects when rowId is missing', () => {
      expect(isValidForApply({ sheetId: 'active-sheet', column: 'Col', value: 1 }, 'active-sheet')).toBe(false)
    })

    it('rejects when value is undefined', () => {
      expect(
        isValidForApply({ sheetId: 'active-sheet', rowId: 'r1', column: 'Col', value: undefined }, 'active-sheet')
      ).toBe(false)
    })

    it('rejects when both column and columnId are missing', () => {
      expect(isValidForApply({ sheetId: 'active-sheet', rowId: 'r1', value: 1 }, 'active-sheet')).toBe(false)
    })

    it('accepts valid payload', () => {
      expect(isValidForApply({ sheetId: 'active-sheet', rowId: 'r1', column: 'Col', value: 1 }, 'active-sheet')).toBe(
        true
      )
    })
  })

  describe('emit path: getBackendRowIdForUiRowId can skip emit', () => {
    it('returns undefined for new rows without UUID (ops are dropped)', () => {
      const getBackendRowId = (uiRowId: string, rows: Record<string, unknown>[]): string | undefined => {
        const row = rows.find(r => (r._id ?? r.id) === uiRowId)
        if (!row) return undefined
        const uuid = String((row as { _rowUuid?: string })._rowUuid ?? '')
        const id = String((row as { id?: string }).id ?? '')
        const localId = String((row as { _id?: string })._id ?? '')
        const isUuid = (s: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
        if (isUuid(uuid)) return uuid
        if (isUuid(id)) return id
        if (isUuid(localId)) return localId
        return undefined
      }

      const newRow = { _id: 'row_new_1', ColumnA: 'new' }
      expect(getBackendRowId('row_new_1', [newRow])).toBeUndefined()

      const persistedRow = { _id: 'row_0', _rowUuid: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789', ColumnA: 'a' }
      expect(getBackendRowId('row_0', [persistedRow])).toBe('a1b2c3d4-e5f6-4789-abcd-ef0123456789')
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
  })
})
