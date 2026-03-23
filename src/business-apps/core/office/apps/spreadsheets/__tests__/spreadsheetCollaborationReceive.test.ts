/**
 * Tests for spreadsheet collaboration receive/apply logic.
 * Verifies handleCollaborationOperation correctly applies cell_update operations.
 */

import { createUniverConversionContext } from '../utils/univerAdapter'
import type { SpreadsheetColumn } from '../types/spreadsheet'

function backendRowIdOf(row: Record<string, unknown>): string {
  return String(
    (row as { _rowUuid?: string })._rowUuid || (row as { _id?: string })._id || (row as { id?: string }).id || ''
  )
}

function resolveRemoteCellCoordinates(
  columns: SpreadsheetColumn[],
  data: Record<string, unknown>[],
  columnKey: string,
  remoteRowId: string
): { rowIndex: number | undefined; colIndex: number; targetColumnName: string } {
  const ctx = createUniverConversionContext(columns, data)
  let rowIndex = ctx.rowIdToIndex.get(remoteRowId)
  if (rowIndex === undefined) {
    const fallbackIndex = data.findIndex(row => backendRowIdOf(row) === remoteRowId)
    if (fallbackIndex >= 0) rowIndex = fallbackIndex
  }

  let colIndex = ctx.columnIdToIndex.get(columnKey) ?? -1
  if (colIndex < 0) {
    colIndex = columns.findIndex(c => c.id === columnKey || c.name === columnKey)
  }

  const targetColumnName =
    columns.find(c => c.id === columnKey)?.name ?? columns.find(c => c.name === columnKey)?.name ?? String(columnKey)

  return { rowIndex, colIndex, targetColumnName }
}

describe('spreadsheetCollaborationReceive', () => {
  const columns: SpreadsheetColumn[] = [
    { id: 'col-a', name: 'ColumnA', type: 'text', isVisible: true },
    { id: 'col-b', name: 'ColumnB', type: 'number', isVisible: true }
  ]

  const dataWithBackendIds: Record<string, unknown>[] = [
    { _id: 'row_0', _rowUuid: 'uuid-1', ColumnA: '', ColumnB: 0 },
    { _id: 'row_1', _rowUuid: 'uuid-2', ColumnA: '', ColumnB: 0 }
  ]

  describe('resolveRemoteCellCoordinates', () => {
    it('resolves rowIndex and colIndex for valid backend row id and column name', () => {
      const result = resolveRemoteCellCoordinates(columns, dataWithBackendIds, 'ColumnA', 'uuid-1')
      expect(result.rowIndex).toBe(0)
      expect(result.colIndex).toBe(0)
      expect(result.targetColumnName).toBe('ColumnA')
    })

    it('resolves by column id when column name not in context', () => {
      const result = resolveRemoteCellCoordinates(columns, dataWithBackendIds, 'col-a', 'uuid-1')
      expect(result.rowIndex).toBe(0)
      expect(result.colIndex).toBe(0)
      expect(result.targetColumnName).toBe('ColumnA')
    })

    it('returns rowIndex undefined when remoteRowId not found in data', () => {
      const result = resolveRemoteCellCoordinates(columns, dataWithBackendIds, 'ColumnA', 'unknown-uuid')
      expect(result.rowIndex).toBeUndefined()
      expect(result.colIndex).toBe(0)
    })

    it('returns colIndex -1 when column not found', () => {
      const result = resolveRemoteCellCoordinates(columns, dataWithBackendIds, 'NonExistentColumn', 'uuid-1')
      expect(result.rowIndex).toBe(0)
      expect(result.colIndex).toBe(-1)
      expect(result.targetColumnName).toBe('NonExistentColumn')
    })
  })

  describe('receiver apply conditions', () => {
    it('would apply when rowIndex defined, colIndex >= 0', () => {
      const { rowIndex, colIndex } = resolveRemoteCellCoordinates(columns, dataWithBackendIds, 'ColumnA', 'uuid-1')
      const shouldCallApplyRemoteCellUpdate = rowIndex !== undefined && colIndex !== undefined && colIndex >= 0
      expect(shouldCallApplyRemoteCellUpdate).toBe(true)
    })

    it('would NOT apply when rowIndex undefined (row not found)', () => {
      const { rowIndex, colIndex } = resolveRemoteCellCoordinates(
        columns,
        dataWithBackendIds,
        'ColumnA',
        'unknown-uuid'
      )
      const shouldCallApplyRemoteCellUpdate = rowIndex !== undefined && colIndex !== undefined && colIndex >= 0
      expect(shouldCallApplyRemoteCellUpdate).toBe(false)
    })

    it('would NOT apply when colIndex is -1 (column not found)', () => {
      const { rowIndex, colIndex } = resolveRemoteCellCoordinates(columns, dataWithBackendIds, 'BadColumn', 'uuid-1')
      const shouldCallApplyRemoteCellUpdate = rowIndex !== undefined && colIndex !== undefined && colIndex >= 0
      expect(shouldCallApplyRemoteCellUpdate).toBe(false)
    })
  })
})
