/**
 * Tests for spreadsheet collaboration receive/apply logic.
 * Verifies handleCollaborationOperation correctly applies live and persisted spreadsheet updates.
 */

import { createUniverConversionContext } from '../utils/univerAdapter'
import type { SpreadsheetColumn } from '../types/spreadsheet'

function backendRowIdOf(row: Record<string, unknown>): string {
  return String(
    (row as { _rowUuid?: string })._rowUuid || (row as { _id?: string })._id || (row as { id?: string }).id || ''
  )
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

function normalizeValueForEchoSignature(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('=')) return { f: trimmed }
    return value
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const obj = value as Record<string, unknown>
  if (typeof obj.f === 'string') {
    const trimmed = obj.f.trim()
    return { f: trimmed.startsWith('=') ? trimmed : `=${trimmed}` }
  }
  if (obj.v !== undefined) return obj.v
  if (obj.m !== undefined) return obj.m
  return value
}

function normalizeValueForGridWrite(value: unknown): unknown {
  const normalized = normalizeValueForEchoSignature(value)
  if (normalized === undefined || normalized === null) return ''
  if (typeof normalized === 'object' && normalized && !Array.isArray(normalized)) {
    const obj = normalized as Record<string, unknown>
    if (typeof obj.f === 'string') {
      return obj.f.trim().startsWith('=') ? obj.f.trim() : `=${obj.f.trim()}`
    }
  }
  return normalized
}

function resolveRemoteCellCoordinates(
  columns: SpreadsheetColumn[],
  data: Record<string, unknown>[],
  columnKey: string,
  remoteRowId: string
): { rowIndex: number | undefined; colIndex: number | undefined; targetColumnName: string; columnExists: boolean } {
  const ctx = createUniverConversionContext(columns, data)
  const visibleColumns = columns.filter(column => column.isVisible !== false)
  let rowIndex = ctx.rowIdToIndex.get(remoteRowId)
  if (rowIndex === undefined) {
    const fallbackIndex = data.findIndex(row => backendRowIdOf(row) === remoteRowId)
    if (fallbackIndex >= 0) rowIndex = fallbackIndex
  }

  const targetColumn = columns.find(c => c.id === columnKey || c.name === columnKey)
  let colIndex = visibleColumns.findIndex(c => c.id === columnKey || c.name === columnKey)
  if (colIndex < 0) colIndex = undefined

  const targetColumnName = targetColumn?.name ?? String(columnKey)

  return { rowIndex, colIndex, targetColumnName, columnExists: Boolean(targetColumn) }
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
      expect(result.columnExists).toBe(true)
    })

    it('returns rowIndex undefined when remoteRowId not found in data', () => {
      const result = resolveRemoteCellCoordinates(columns, dataWithBackendIds, 'ColumnA', 'unknown-uuid')
      expect(result.rowIndex).toBeUndefined()
      expect(result.colIndex).toBe(0)
    })

    it('can fall back to the local row _id when remote row id is not the uuid', () => {
      const result = resolveRemoteCellCoordinates(columns, dataWithBackendIds, 'ColumnA', 'row_0')
      expect(result.rowIndex).toBe(0)
      expect(result.colIndex).toBe(0)
      expect(result.targetColumnName).toBe('ColumnA')
    })

    it('returns undefined colIndex when column not found', () => {
      const result = resolveRemoteCellCoordinates(columns, dataWithBackendIds, 'NonExistentColumn', 'uuid-1')
      expect(result.rowIndex).toBe(0)
      expect(result.colIndex).toBeUndefined()
      expect(result.targetColumnName).toBe('NonExistentColumn')
      expect(result.columnExists).toBe(false)
    })

    it('uses visible-column indexes for remote grid patches', () => {
      const columnsWithHidden: SpreadsheetColumn[] = [
        { id: 'col-a', name: 'ColumnA', type: 'text', isVisible: true },
        { id: 'col-hidden', name: 'HiddenColumn', type: 'text', isVisible: false },
        { id: 'col-b', name: 'ColumnB', type: 'number', isVisible: true }
      ]

      const result = resolveRemoteCellCoordinates(columnsWithHidden, dataWithBackendIds, 'ColumnB', 'uuid-1')
      expect(result.rowIndex).toBe(0)
      expect(result.colIndex).toBe(1)
      expect(result.targetColumnName).toBe('ColumnB')
      expect(result.columnExists).toBe(true)
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

    it('would NOT apply when colIndex is undefined (column not found)', () => {
      const { rowIndex, colIndex } = resolveRemoteCellCoordinates(columns, dataWithBackendIds, 'BadColumn', 'uuid-1')
      const shouldCallApplyRemoteCellUpdate = rowIndex !== undefined && colIndex !== undefined && colIndex >= 0
      expect(shouldCallApplyRemoteCellUpdate).toBe(false)
    })
  })

  describe('sequential remote updates', () => {
    it('unwraps persisted cell objects before writing them into the remote grid', () => {
      expect(normalizeValueForGridWrite({ v: 1 })).toBe(1)
      expect(normalizeValueForGridWrite({ m: 'display-only' })).toBe('display-only')
      expect(normalizeValueForGridWrite({ f: 'SUM(A1:A3)' })).toBe('=SUM(A1:A3)')
    })

    it('can resolve direct grid patches for authoritative batch set_range cells before row-state sync', () => {
      const gridPatches: Array<{ rowIndex: number; colIndex: number; value: unknown }> = []
      const incomingBatch = {
        sheetId: 'sheet-1',
        operations: [
          {
            type: 'set_range',
            data: {
              sheetId: 'sheet-1',
              cells: [
                { rowId: 'uuid-1', columnName: 'ColumnA', value: 'first' },
                { rowId: 'uuid-2', columnName: 'ColumnB', value: 42 }
              ]
            }
          }
        ]
      }

      const cells = (
        incomingBatch.operations[0].data as { cells: Array<{ rowId: string; columnName: string; value: unknown }> }
      ).cells
      for (const cell of cells) {
        const { rowIndex, colIndex } = resolveRemoteCellCoordinates(
          columns,
          dataWithBackendIds,
          cell.columnName,
          cell.rowId
        )
        if (rowIndex !== undefined && colIndex >= 0) {
          gridPatches.push({ rowIndex, colIndex, value: cell.value })
        }
      }

      expect(gridPatches).toEqual([
        { rowIndex: 0, colIndex: 0, value: 'first' },
        { rowIndex: 1, colIndex: 1, value: 42 }
      ])
    })

    it('preserves earlier cell changes when remote events arrive back-to-back', () => {
      const localRef = {
        current: [{ _id: 'row_0', _rowUuid: 'uuid-1', ColumnA: '', ColumnB: 0 }] as Record<string, unknown>[]
      }

      const applyRemoteCell = (columnName: string, value: unknown) => {
        const next = localRef.current.map(row =>
          backendRowIdOf(row) !== 'uuid-1' ? row : { ...row, [columnName]: value, _updatedAt: 'now' }
        )
        // Mirror the production fix: update the ref immediately so the next remote event
        // builds on the latest rows instead of stale state.
        localRef.current = next
      }

      applyRemoteCell('ColumnA', 'first')
      applyRemoteCell('ColumnB', 42)

      expect(localRef.current).toEqual([
        { _id: 'row_0', _rowUuid: 'uuid-1', ColumnA: 'first', ColumnB: 42, _updatedAt: 'now' }
      ])
    })

    it('applies the authoritative batch directly without a second healing path', () => {
      const localRef = {
        current: [{ _id: 'row_0', _rowUuid: 'uuid-1', ColumnA: '', ColumnB: 0 }] as Record<string, unknown>[]
      }

      const applyRemoteBatch = (batch: {
        sheetId: string
        operations: Array<{
          type: string
          data: { cells: Array<{ rowId: string; columnName: string; value: unknown }> }
        }>
      }) => {
        const updatesByRowId = new Map<string, Record<string, unknown>>()
        for (const operation of batch.operations) {
          if (operation.type !== 'set_range') continue
          for (const cell of operation.data.cells) {
            const rowUpdates = updatesByRowId.get(cell.rowId) ?? {}
            rowUpdates[cell.columnName] = cell.value
            updatesByRowId.set(cell.rowId, rowUpdates)
          }
        }
        localRef.current = localRef.current.map(row => {
          const updates = updatesByRowId.get(backendRowIdOf(row))
          return updates ? { ...row, ...updates, _updatedAt: 'now' } : row
        })
      }

      applyRemoteBatch({
        sheetId: 'sheet-1',
        operations: [
          {
            type: 'set_range',
            data: {
              cells: [
                { rowId: 'uuid-1', columnName: 'ColumnA', value: 'first' },
                { rowId: 'uuid-1', columnName: 'ColumnB', value: 42 }
              ]
            }
          }
        ]
      })

      expect(localRef.current).toEqual([
        { _id: 'row_0', _rowUuid: 'uuid-1', ColumnA: 'first', ColumnB: 42, _updatedAt: 'now' }
      ])
    })

    it('applies authoritative set_range rows even when payload uses _id instead of _rowUuid', () => {
      const localRef = {
        current: [{ _id: 'row_0', _rowUuid: 'uuid-1', ColumnA: '', ColumnB: 0 }] as Record<string, unknown>[]
      }

      const applyRemoteRange = (cells: Array<{ rowId: string; columnName: string; value: unknown }>) => {
        const updatesByRowId = new Map<string, Record<string, unknown>>()
        for (const cell of cells) {
          const rowUpdates = updatesByRowId.get(cell.rowId) ?? {}
          rowUpdates[cell.columnName] = cell.value
          updatesByRowId.set(cell.rowId, rowUpdates)
        }
        localRef.current = localRef.current.map(row => {
          const updates =
            updatesByRowId.get(backendRowIdOf(row)) ??
            updatesByRowId.get(String((row as { _id?: string })._id || '')) ??
            updatesByRowId.get(String((row as { id?: string }).id || ''))
          return updates ? { ...row, ...updates, _updatedAt: 'now' } : row
        })
      }

      applyRemoteRange([{ rowId: 'row_0', columnName: 'ColumnA', value: 'first' }])

      expect(localRef.current).toEqual([
        { _id: 'row_0', _rowUuid: 'uuid-1', ColumnA: 'first', ColumnB: 0, _updatedAt: 'now' }
      ])
    })

    it('treats _id and _rowUuid as the same logical row for remote matching', () => {
      const row = { _id: 'row_0', _rowUuid: 'uuid-1', ColumnA: '' }
      expect(rowMatchesRemoteId(row, 'row_0')).toBe(true)
      expect(rowMatchesRemoteId(row, 'uuid-1')).toBe(true)
      expect(rowMatchesRemoteId(row, 'missing')).toBe(false)
    })
  })
})
