import { planCommittedBatchDirtyRegions, SPREADSHEET_DELTA_ALL_COLUMNS } from '../spreadsheetDeltaRegionPlanner'
import type { SpreadsheetCommittedBatchEnvelope } from '../spreadsheetCommittedDeltaContract'

const moveBatch = (data: Record<string, unknown>): SpreadsheetCommittedBatchEnvelope => ({
  sheetId: 'sheet-1',
  workbookId: 'workbook-1',
  batchId: 'batch-move',
  actorId: 'user-1',
  baseVersion: 1,
  appliedVersion: 2,
  payloadSchemaVersion: 1,
  operations: [
    {
      type: 'move_row_slots',
      operationId: 'op-move',
      data
    }
  ]
})

describe('spreadsheetDeltaRegionPlanner', () => {
  it('plans a bounded rect for move_row_slots instead of rowsFrom full-sheet expansion', () => {
    const regions = planCommittedBatchDirtyRegions(
      moveBatch({
        sheetId: 'sheet-1',
        sourceStartGridRowIndex: 1,
        count: 5,
        destinationGridRowIndex: 7
      })
    )

    expect(regions).toEqual([
      {
        type: 'rect',
        minRow: 1,
        maxRow: 11,
        minCol: 0,
        maxCol: SPREADSHEET_DELTA_ALL_COLUMNS
      }
    ])
  })

  it('includes shifted gap rows when moving down past the source block', () => {
    const regions = planCommittedBatchDirtyRegions(
      moveBatch({
        sheetId: 'sheet-1',
        sourceStartGridRowIndex: 1,
        count: 2,
        destinationGridRowIndex: 5
      })
    )

    expect(regions).toEqual([
      {
        type: 'rect',
        minRow: 1,
        maxRow: 6,
        minCol: 0,
        maxCol: SPREADSHEET_DELTA_ALL_COLUMNS
      }
    ])
  })

  it('plans per-cell rects for set_range instead of entireUsedRange', () => {
    const regions = planCommittedBatchDirtyRegions({
      sheetId: 'sheet-1',
      workbookId: 'workbook-1',
      batchId: 'batch-range',
      actorId: 'user-1',
      baseVersion: 1,
      appliedVersion: 2,
      payloadSchemaVersion: 1,
      operations: [
        {
          type: 'set_range',
          operationId: 'op-range',
          data: {
            cells: [
              { row: 10, col: 3, value: 'a' },
              { row: 11, col: 4, value: 'b' }
            ]
          }
        }
      ]
    })

    expect(regions).toEqual([
      { type: 'rect', minRow: 10, maxRow: 10, minCol: 3, maxCol: 3 },
      { type: 'rect', minRow: 11, maxRow: 11, minCol: 4, maxCol: 4 }
    ])
    expect(regions.some(region => region.type === 'entireUsedRange')).toBe(false)
  })

  it('plans per-cell rects for set_style instead of entireUsedRange', () => {
    const regions = planCommittedBatchDirtyRegions({
      sheetId: 'sheet-1',
      workbookId: 'workbook-1',
      batchId: 'batch-style',
      actorId: 'user-1',
      baseVersion: 1,
      appliedVersion: 2,
      payloadSchemaVersion: 1,
      operations: [
        {
          type: 'set_style',
          operationId: 'op-style',
          data: {
            cells: [{ row: 5, col: 2 }]
          }
        }
      ]
    })

    expect(regions).toEqual([{ type: 'rect', minRow: 5, maxRow: 5, minCol: 2, maxCol: 2 }])
  })

  it('plans a bounded rect for add_rows from _gridRowIndex', () => {
    const regions = planCommittedBatchDirtyRegions({
      sheetId: 'sheet-1',
      workbookId: 'workbook-1',
      batchId: 'batch-add',
      actorId: 'user-1',
      baseVersion: 1,
      appliedVersion: 2,
      payloadSchemaVersion: 1,
      operations: [
        {
          type: 'add_rows',
          operationId: 'op-add',
          data: {
            rows: [
              { _gridRowIndex: 158, column_j: { v: 4 } },
              { _gridRowIndex: 159, column_j: { v: 5 } }
            ]
          }
        }
      ]
    })

    expect(regions).toEqual([
      {
        type: 'rect',
        minRow: 158,
        maxRow: 159,
        minCol: 0,
        maxCol: SPREADSHEET_DELTA_ALL_COLUMNS
      }
    ])
  })

  it('plans a bounded rect for insert_rows_at', () => {
    const regions = planCommittedBatchDirtyRegions({
      sheetId: 'sheet-1',
      workbookId: 'workbook-1',
      batchId: 'batch-insert-at',
      actorId: 'user-1',
      baseVersion: 1,
      appliedVersion: 2,
      payloadSchemaVersion: 1,
      operations: [
        {
          type: 'insert_rows_at',
          operationId: 'op-insert-at',
          data: { insertAt: 12, rows: [{ column_j: { v: 1 } }, { column_j: { v: 2 } }] }
        }
      ]
    })

    expect(regions).toEqual([
      {
        type: 'rect',
        minRow: 12,
        maxRow: 13,
        minCol: 0,
        maxCol: SPREADSHEET_DELTA_ALL_COLUMNS
      }
    ])
  })

  it('plans per-range rects for clear_all instead of entireUsedRange', () => {
    const regions = planCommittedBatchDirtyRegions({
      sheetId: 'sheet-1',
      workbookId: 'workbook-1',
      batchId: 'batch-clear-all',
      actorId: 'user-1',
      baseVersion: 1,
      appliedVersion: 2,
      payloadSchemaVersion: 1,
      operations: [
        {
          type: 'clear_all',
          operationId: 'op-clear-all',
          data: {
            ranges: [
              { startRow: 2, endRow: 4, startColumn: 1, endColumn: 3 },
              { startRow: 10, endRow: 10, startColumn: 0, endColumn: 0 }
            ]
          }
        }
      ]
    })

    expect(regions).toEqual([
      { type: 'rect', minRow: 2, maxRow: 4, minCol: 1, maxCol: 3 },
      { type: 'rect', minRow: 10, maxRow: 10, minCol: 0, maxCol: 0 }
    ])
    expect(regions.some(region => region.type === 'entireUsedRange')).toBe(false)
  })

  it('plans per-range rects for merge_ranges', () => {
    const regions = planCommittedBatchDirtyRegions({
      sheetId: 'sheet-1',
      workbookId: 'workbook-1',
      batchId: 'batch-merge',
      actorId: 'user-1',
      baseVersion: 1,
      appliedVersion: 2,
      payloadSchemaVersion: 1,
      operations: [
        {
          type: 'merge_ranges',
          operationId: 'op-merge',
          data: {
            ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }]
          }
        }
      ]
    })

    expect(regions).toEqual([{ type: 'rect', minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 }])
  })

  it('plans a bounded rect for insert_row_slots instead of rowsFrom full-sheet expansion', () => {
    const regions = planCommittedBatchDirtyRegions({
      sheetId: 'sheet-1',
      workbookId: 'workbook-1',
      batchId: 'batch-insert',
      actorId: 'user-1',
      baseVersion: 1,
      appliedVersion: 2,
      payloadSchemaVersion: 1,
      operations: [
        {
          type: 'insert_row_slots',
          operationId: 'op-insert',
          data: { sheetId: 'sheet-1', startGridRowIndex: 4, count: 2 }
        }
      ]
    })

    expect(regions).toEqual([
      {
        type: 'rect',
        minRow: 4,
        maxRow: 5,
        minCol: 0,
        maxCol: SPREADSHEET_DELTA_ALL_COLUMNS
      }
    ])
  })
})
