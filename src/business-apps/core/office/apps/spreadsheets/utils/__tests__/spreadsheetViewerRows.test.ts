import {
  appendPendingSnapshotClearCoordinates,
  buildAddRowPayloadsFromUniverRows,
  buildCreatedRowsFromBatch,
  buildPersistedRowIdMapFromInsertRowSlotsResult,
  collectSnapshotClearCoordinates,
  collectSnapshotValueWriteCoordinates,
  isUuidString,
  mergeDuplicateClientRows,
  overlaySnapshotIfRowsMismatch,
  partitionCellUpdatesByBackendRowId,
  removePendingSnapshotClearCoordinates,
  snapshotCellCoordinateKey
} from '../spreadsheetViewerRows'
import type { SpreadsheetPendingCellChange as CellChange } from '../../core'
import type { SpreadsheetColumn } from '../../types'

describe('spreadsheetViewerRows', () => {
  describe('isUuidString', () => {
    it('accepts lowercase UUID v4', () => {
      expect(isUuidString('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })
    it('rejects non-uuid', () => {
      expect(isUuidString('not-a-uuid')).toBe(false)
    })
  })

  describe('buildPersistedRowIdMapFromInsertRowSlotsResult', () => {
    it('merges rowMappings, result rows, and fallback client ids', () => {
      const map = buildPersistedRowIdMapFromInsertRowSlotsResult(
        {
          rows: [{ id: 'backend-1', data: { _clientRowId: 'client-1', _gridRowIndex: 2 } }],
          rowMappings: [{ clientRowId: 'client-2', rowUuid: 'backend-2' }]
        },
        {
          fallbackClientRowIdsInOrder: ['client-1', 'client-2', 'client-3'],
          rowMappings: [{ clientRowId: 'client-3', rowUuid: 'backend-3' }]
        }
      )

      expect(map.get('client-1')).toBe('backend-1')
      expect(map.get('client-2')).toBe('backend-2')
      expect(map.get('client-3')).toBe('backend-3')
    })
  })

  describe('buildCreatedRowsFromBatch', () => {
    it('connects client row ids to backend rows via batch rowMappings', () => {
      const { createdRows, persistedIdByClientRowId } = buildCreatedRowsFromBatch(
        [{ _clientRowId: 'client-row-7', _gridRowIndex: 7, ColumnA: 'draft' }],
        [{ id: 'backend-row-7', data: { _gridRowIndex: 7, ColumnA: 'occupied' } }],
        new Map(),
        { rowMappings: [{ clientRowId: 'client-row-7', rowUuid: 'backend-row-7' }] }
      )

      expect(persistedIdByClientRowId.get('client-row-7')).toBe('backend-row-7')
      expect(createdRows[0]).toEqual(
        expect.objectContaining({
          _clientRowId: 'client-row-7',
          _rowUuid: 'backend-row-7',
          _id: 'backend-row-7'
        })
      )
    })

    it('preserves adopted peer cell values returned by add_rows batch response', () => {
      const { createdRows } = buildCreatedRowsFromBatch(
        [{ _clientRowId: 'client-row-7', _gridRowIndex: 7, column_f: { v: 'second client' } }],
        [
          {
            id: 'backend-row-7',
            data: {
              _clientRowId: 'client-row-7',
              _gridRowIndex: 7,
              column_d: { v: 'first client' },
              column_f: { v: 'second client' }
            }
          }
        ],
        new Map(),
        { rowMappings: [{ clientRowId: 'client-row-7', rowUuid: 'backend-row-7' }] }
      )

      expect(createdRows[0]).toEqual(
        expect.objectContaining({
          _id: 'backend-row-7',
          _rowUuid: 'backend-row-7',
          _clientRowId: 'client-row-7',
          _gridRowIndex: 7,
          column_d: { v: 'first client' },
          column_f: { v: 'second client' }
        })
      )
    })
  })

  describe('mergeDuplicateClientRows', () => {
    it('merges rows with same client identity preferring later incoming fields', () => {
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

    it('merges adopted concurrent rows by backend uuid and grid slot', () => {
      const rowUuid = '02790541-7184-4356-84f3-4eed34510be6'
      const localRow = {
        _id: 'client_first',
        _rowUuid: rowUuid,
        _clientRowId: 'client_first',
        _gridRowIndex: 253,
        column_d: { v: 'lllll' }
      }
      const adoptedRow = {
        _id: 'client_second',
        _rowUuid: rowUuid,
        _clientRowId: 'client_second',
        _gridRowIndex: 253,
        column_d: { v: 'lllll' },
        column_f: { v: 'lllooo' }
      }

      const merged = mergeDuplicateClientRows([localRow, adoptedRow] as Record<string, unknown>[])

      expect(merged).toHaveLength(1)
      expect(merged[0]).toEqual(
        expect.objectContaining({
          _rowUuid: rowUuid,
          _clientRowId: 'client_second',
          _gridRowIndex: 253,
          column_d: { v: 'lllll' },
          column_f: { v: 'lllooo' }
        })
      )
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

    it('omits inline Univer style blobs from add_rows column payloads', () => {
      const payloads = buildAddRowPayloadsFromUniverRows(
        [
          {
            _clientRowId: 'client_row_9',
            _gridRowIndex: 9,
            column_a: { v: 1, s: 'style-1', ff: 'Arial', fs: 12 }
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

      expect(payloads[0]?.column_a).toEqual({ v: 1 })
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

    it('filters purely visual placeholder rows that carry no meaningful cell payload', () => {
      const payloads = buildAddRowPayloadsFromUniverRows(
        [
          {
            _id: 'client_row_12',
            _clientRowId: 'client_row_12',
            _gridRowIndex: 12
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

      expect(payloads).toEqual([])
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

  describe('overlaySnapshotIfRowsMismatch', () => {
    it('rebuilds values from authoritative viewer rows and preserves snapshot formatting', () => {
      const sheetId = 'sheet-1'
      const columns = [
        { id: 'c0', name: 'alpha', label: 'alpha', type: 'text', order: 0, isVisible: true }
      ] as SpreadsheetColumn[]
      const viewerRows = [{ alpha: 'from-server' }]
      const snapshot: Record<string, unknown> = {
        id: 'wb',
        styles: { styleRed: { bg: { rgb: '#ff0000' } } },
        sheetOrder: [sheetId],
        sheets: {
          [sheetId]: {
            id: sheetId,
            name: 'S',
            cellData: { 0: { 0: { v: 'stale', s: 'styleRed' } } }
          }
        }
      }
      const merged = overlaySnapshotIfRowsMismatch(snapshot, sheetId, viewerRows, columns)
      const cell = (
        merged?.sheets as Record<string, { cellData: Record<number, Record<number, { v?: string; s?: string }>> }>
      )[sheetId].cellData[0][0]
      expect(cell.v).toBe('from-server')
      expect(cell.s).toBe('styleRed')
    })
  })
})
