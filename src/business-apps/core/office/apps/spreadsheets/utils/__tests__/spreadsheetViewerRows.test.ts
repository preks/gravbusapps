import {
  appendPendingSnapshotClearCoordinates,
  buildAddRowPayloadsFromUniverRows,
  collectSnapshotClearCoordinates,
  collectSnapshotValueWriteCoordinates,
  isUuidString,
  mergeDuplicateClientRows,
  partitionCellUpdatesByBackendRowId,
  removePendingSnapshotClearCoordinates,
  snapshotCellCoordinateKey
} from '../spreadsheetViewerRows'
import type { SpreadsheetPendingCellChange as CellChange } from '../../core'

describe('spreadsheetViewerRows', () => {
  describe('isUuidString', () => {
    it('accepts lowercase UUID v4', () => {
      expect(isUuidString('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })
    it('rejects non-uuid', () => {
      expect(isUuidString('not-a-uuid')).toBe(false)
    })
  })

  describe('mergeDuplicateClientRows', () => {
    it('merges rows with same client identity keeping richer values', () => {
      const a = { _id: 'c1', foo: 1, _clientRowId: 'c1' }
      const b = { _id: 'c1', foo: 2, bar: 3, _clientRowId: 'c1' }
      const merged = mergeDuplicateClientRows([a, b] as Record<string, unknown>[])
      expect(merged).toHaveLength(1)
      expect((merged[0] as { bar?: number }).bar).toBe(3)
    })
    it('keeps rows without client id', () => {
      const rows = [{ x: 1 }, { x: 2 }]
      expect(mergeDuplicateClientRows(rows)).toHaveLength(2)
    })
  })

  describe('partitionCellUpdatesByBackendRowId', () => {
    const isUuid = (s: string) => s.length === 36

    it('routes uuid row id to backend map', () => {
      const pending = new Map<string, Record<string, unknown>>()
      const cells: CellChange[] = [
        { rowId: '550e8400-e29b-41d4-a716-446655440000', columnName: 'a', value: 1 } as CellChange
      ]
      const uiToBackend = new Map<string, string>()
      const { setUpdatesByBackendRowId, clearCells } = partitionCellUpdatesByBackendRowId(
        cells,
        uiToBackend,
        pending,
        isUuid
      )
      expect(setUpdatesByBackendRowId.get('550e8400-e29b-41d4-a716-446655440000')?.a).toBe(1)
      expect(clearCells).toHaveLength(0)
    })

    it('queues pending when no backend id', () => {
      const pending = new Map<string, Record<string, unknown>>()
      const cells: CellChange[] = [{ rowId: 'temp-1', columnName: 'a', value: 2 } as CellChange]
      const uiToBackend = new Map<string, string>()
      partitionCellUpdatesByBackendRowId(cells, uiToBackend, pending, isUuid)
      expect(pending.get('temp-1')?.a).toBe(2)
    })
  })

  describe('buildAddRowPayloadsFromUniverRows', () => {
    it('uses explicit client row id instead of persisted backend uuid', () => {
      const payloads = buildAddRowPayloadsFromUniverRows(
        [
          {
            _id: '978d11d9-ae40-443a-b264-bcac96e006ca',
            _rowUuid: '978d11d9-ae40-443a-b264-bcac96e006ca',
            _clientRowId: 'client_7e32aad9-f6cb-46d7-981c-76ec46124f93',
            _gridRowIndex: 2,
            column_a: 2
          }
        ],
        [
          {
            id: 'col-a',
            name: 'column_a',
            label: 'A',
            type: 'text',
            isVisible: true,
            isEditable: true,
            isRequired: false,
            isUnique: false,
            order: 0
          }
        ]
      )

      expect(payloads).toEqual([
        {
          _clientRowId: 'client_7e32aad9-f6cb-46d7-981c-76ec46124f93',
          _gridRowIndex: 2,
          column_a: 2
        }
      ])
    })

    it('omits _clientRowId when the row already has only backend identity', () => {
      const payloads = buildAddRowPayloadsFromUniverRows(
        [
          {
            _id: '978d11d9-ae40-443a-b264-bcac96e006ca',
            _rowUuid: '978d11d9-ae40-443a-b264-bcac96e006ca',
            _gridRowIndex: 2,
            column_a: 2
          }
        ],
        [
          {
            id: 'col-a',
            name: 'column_a',
            label: 'A',
            type: 'text',
            isVisible: true,
            isEditable: true,
            isRequired: false,
            isUnique: false,
            order: 0
          }
        ]
      )

      expect(payloads).toEqual([
        {
          _gridRowIndex: 2,
          column_a: 2
        }
      ])
    })
  })

  describe('snapshot coordinate helpers', () => {
    it('collectSnapshotClearCoordinates filters null-value cells with coords', () => {
      const coords = collectSnapshotClearCoordinates([
        { value: null, univerRow: 1, univerCol: 2 },
        { value: 'x', univerRow: 3, univerCol: 4 }
      ])
      expect(coords).toEqual([{ row: 1, col: 2 }])
    })

    it('collectSnapshotValueWriteCoordinates skips null', () => {
      const coords = collectSnapshotValueWriteCoordinates([
        { value: 'hi', univerRow: 0, univerCol: 1 },
        { value: null, univerRow: 2, univerCol: 3 }
      ])
      expect(coords).toEqual([{ row: 0, col: 1 }])
    })

    it('append and remove pending clears', () => {
      const pending = new Map<string, Set<string>>()
      appendPendingSnapshotClearCoordinates(pending, 's1', [{ row: 1, col: 2 }])
      expect(pending.get('s1')?.has(snapshotCellCoordinateKey(1, 2))).toBe(true)
      const removed = removePendingSnapshotClearCoordinates(pending, 's1', [{ row: 1, col: 2 }])
      expect(removed).toBe(1)
      expect(pending.has('s1')).toBe(false)
    })
  })
})
