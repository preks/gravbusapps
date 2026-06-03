import type { SpreadsheetColumn } from '../../types'
import type { SpreadsheetCommittedBatchEnvelope } from '../spreadsheetCommittedDeltaContract'
import type { SpreadsheetViewerRow } from '../SpreadsheetSession'

export type SpreadsheetDeltaGoldenFixture = {
  name: string
  columns: SpreadsheetColumn[]
  batch: SpreadsheetCommittedBatchEnvelope
  baseRows: SpreadsheetViewerRow[]
  workbookSnapshot?: Record<string, unknown>
  expectedRows?: SpreadsheetViewerRow[]
  expectedDirtyRegions?: unknown[]
  expectedRejection?: { reason: string; detail: string }
}

const textColumn = (id: string, name: string, order: number): SpreadsheetColumn =>
  ({
    id,
    name,
    label: name,
    type: 'text',
    isEditable: true,
    isRequired: false,
    isUnique: false,
    isVisible: true,
    order
  }) as SpreadsheetColumn

const baseEnvelope = (
  name: string,
  operation: SpreadsheetCommittedBatchEnvelope['operations'][number],
  overrides?: Partial<SpreadsheetCommittedBatchEnvelope>
): SpreadsheetCommittedBatchEnvelope => ({
  sheetId: 'sheet-1',
  workbookId: 'workbook-1',
  batchId: `golden-${name}`,
  actorId: 'user-1',
  baseVersion: 10,
  appliedVersion: 11,
  payloadSchemaVersion: 1,
  operations: [operation],
  ...overrides
})

export const spreadsheetDeltaGoldenFixtures: SpreadsheetDeltaGoldenFixture[] = [
  {
    name: 'set-cell',
    columns: [textColumn('name', 'Name', 0)],
    baseRows: [{ _id: 'row-1', _rowUuid: 'row-1', Name: 'Old' }],
    batch: baseEnvelope('set-cell', {
      type: 'set_cell',
      operationId: 'op-set-cell',
      data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'Name', value: 'New', row: 0, col: 0 }
    }),
    expectedRows: [{ _id: 'row-1', _rowUuid: 'row-1', Name: 'New' }],
    expectedDirtyRegions: [{ type: 'rect', minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }]
  },
  {
    name: 'move-row-slots',
    columns: [textColumn('name', 'Name', 0)],
    baseRows: [
      { _id: 'row-a', _rowUuid: 'row-a', Name: 'A' },
      { _id: 'row-b', _rowUuid: 'row-b', Name: 'B' },
      { _id: 'row-c', _rowUuid: 'row-c', Name: 'C' }
    ],
    batch: baseEnvelope('move-row-slots', {
      type: 'move_row_slots',
      operationId: 'op-move-row',
      data: {
        sheetId: 'sheet-1',
        sourceStartGridRowIndex: 0,
        count: 1,
        destinationGridRowIndex: 3,
        rowIds: ['row-a']
      }
    }),
    expectedRows: [
      { _id: 'row-b', _rowUuid: 'row-b', _gridRowIndex: 0, Name: 'B' },
      { _id: 'row-c', _rowUuid: 'row-c', _gridRowIndex: 1, Name: 'C' },
      { _id: 'row-a', _rowUuid: 'row-a', _gridRowIndex: 2, Name: 'A' }
    ],
    expectedDirtyRegions: [
      {
        type: 'rect',
        minRow: 0,
        maxRow: 3,
        minCol: 0,
        maxCol: Number.MAX_SAFE_INTEGER
      }
    ]
  },
  {
    name: 'merge-fallback',
    columns: [textColumn('name', 'Name', 0)],
    baseRows: [{ _id: 'row-1', _rowUuid: 'row-1', Name: 'A' }],
    workbookSnapshot: {
      sheets: {
        'sheet-1': {
          mergeData: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }],
          cellData: { '0': { '0': { v: 'A' } } }
        }
      }
    },
    batch: baseEnvelope('merge-fallback', {
      type: 'move_cell_range',
      operationId: 'op-move-cell-range',
      data: {
        sheetId: 'sheet-1',
        fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
        toRange: { startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }
      }
    }),
    expectedRejection: { reason: 'unsupported_workbook_feature', detail: 'mergeData' }
  }
]
