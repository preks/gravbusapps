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
