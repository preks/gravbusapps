import { planCommittedSpreadsheetRemoteTransaction } from '../spreadsheetRemoteTransaction'
import type { SpreadsheetCommittedBatchEnvelope } from '../spreadsheetCommittedDeltaContract'
import { spreadsheetDeltaGoldenFixtures } from './spreadsheetDeltaGoldenFixtures'

const baseBatch = (
  operation: SpreadsheetCommittedBatchEnvelope['operations'][number]
): SpreadsheetCommittedBatchEnvelope => ({
  sheetId: 'sheet-1',
  workbookId: 'workbook-1',
  batchId: 'batch-1',
  actorId: 'user-1',
  baseVersion: 1,
  appliedVersion: 2,
  payloadSchemaVersion: 1,
  operations: [operation]
})

describe('spreadsheetRemoteTransaction', () => {
  it.each(spreadsheetDeltaGoldenFixtures)(
    'matches golden replay projection for $name',
    ({ batch, baseRows, columns, workbookSnapshot, expectedRows, expectedDirtyRegions, expectedRejection }) => {
      const plan = planCommittedSpreadsheetRemoteTransaction({
        batch,
        baseRows,
        columns,
        workbookSnapshot
      })

      if (expectedRejection) {
        expect(plan).toEqual({
          ok: false,
          reason: expectedRejection.reason,
          detail: expectedRejection.detail
        })
        return
      }

      expect(plan.ok).toBe(true)
      if (!plan.ok) return
      expect(plan.sessionPatch.rows).toEqual(expectedRows)
      expect(plan.dirtyRegions).toEqual(expectedDirtyRegions)
    }
  )

  it('plans merge_ranges batches without rejecting unsupported_operation', () => {
    const plan = planCommittedSpreadsheetRemoteTransaction({
      batch: baseBatch({
        type: 'merge_ranges',
        operationId: 'merge-1',
        data: {
          sheetId: 'sheet-1',
          ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }]
        }
      }),
      baseRows: [
        { _id: 'row-1', _gridRowIndex: 0, ColumnA: 'anchor', ColumnB: 'slave' },
        { _id: 'row-2', _gridRowIndex: 1, ColumnA: 'below', ColumnB: 'b1' }
      ],
      columns: [
        { id: 'col-a', name: 'ColumnA', type: 'text', isVisible: true, order: 0 },
        { id: 'col-b', name: 'ColumnB', type: 'text', isVisible: true, order: 1 }
      ] as any
    })

    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.sessionPatch.rows[0]).toEqual({ _id: 'row-1', _gridRowIndex: 0, ColumnA: 'anchor' })
    expect(plan.dirtyRegions).toEqual([{ type: 'rect', minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 }])
  })

  it('plans column_update metadata batches without rejecting unsupported_operation', () => {
    const plan = planCommittedSpreadsheetRemoteTransaction({
      batch: baseBatch({
        type: 'column_update',
        operationId: 'col-update-1',
        data: {
          sheetId: 'sheet-1',
          columnId: 'col-a',
          columnPatch: { width: 180 }
        }
      }),
      baseRows: [],
      columns: [{ id: 'col-a', name: 'A', type: 'text', isVisible: true, width: 120 } as any]
    })

    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.dirtyRegions).toEqual([])
  })

  it('projects row insert into session rows and broad dirty region', () => {
    const plan = planCommittedSpreadsheetRemoteTransaction({
      batch: baseBatch({
        type: 'insert_row_slots',
        operationId: 'op-1',
        data: {
          sheetId: 'sheet-1',
          startGridRowIndex: 1,
          count: 1,
          rows: [{ id: 'row-2', data: { _gridRowIndex: 1, Name: 'Inserted' } }],
          rowIds: ['row-2']
        }
      }),
      baseRows: [
        { _id: 'row-1', Name: 'A' },
        { _id: 'row-3', Name: 'C' }
      ],
      columns: [{ id: 'name', name: 'Name', type: 'text', isVisible: true } as any]
    })

    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.sessionPatch.rows).toHaveLength(3)
    expect(plan.dirtyRegions).toEqual([
      {
        type: 'rect',
        minRow: 1,
        maxRow: 1,
        minCol: 0,
        maxCol: Number.MAX_SAFE_INTEGER
      }
    ])
  })

  it('rejects structural live replay when unsupported merges are present', () => {
    const plan = planCommittedSpreadsheetRemoteTransaction({
      batch: baseBatch({
        type: 'move_cell_range',
        operationId: 'op-1',
        data: {
          sheetId: 'sheet-1',
          fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
          toRange: { startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }
        }
      }),
      baseRows: [{ _id: 'row-1', Name: 'A' }],
      workbookSnapshot: {
        sheets: {
          'sheet-1': {
            mergeData: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }],
            cellData: { '0': { '0': { v: 'A' } } }
          }
        }
      }
    })

    expect(plan).toEqual({
      ok: false,
      reason: 'unsupported_workbook_feature',
      detail: 'mergeData'
    })
  })

  it('rejects move range live replay when from/to ranges contain formulas', () => {
    const plan = planCommittedSpreadsheetRemoteTransaction({
      batch: baseBatch({
        type: 'move_cell_range',
        operationId: 'op-1',
        data: {
          sheetId: 'sheet-1',
          fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
          toRange: { startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }
        }
      }),
      baseRows: [{ _id: 'row-1', Name: 'A' }],
      workbookSnapshot: {
        sheets: {
          'sheet-1': {
            cellData: { '0': { '0': { f: '=A2' } } }
          }
        }
      }
    })

    expect(plan).toEqual({
      ok: false,
      reason: 'unsupported_workbook_feature',
      detail: 'formulas'
    })
  })

  it('allows move range live replay when formulas exist only outside from/to ranges', () => {
    const plan = planCommittedSpreadsheetRemoteTransaction({
      batch: baseBatch({
        type: 'move_cell_range',
        operationId: 'op-1',
        data: {
          sheetId: 'sheet-1',
          fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
          toRange: { startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }
        }
      }),
      baseRows: [
        { _id: 'row-1', Name: 'A' },
        { _id: 'row-2', Name: 'B' }
      ],
      workbookSnapshot: {
        sheets: {
          'sheet-1': {
            cellData: {
              '0': { '0': { v: 'A' } },
              '5': { '2': { f: '=SUM(A1:A10)' } }
            }
          }
        }
      }
    })

    expect(plan.ok).toBe(true)
  })

  it.each(['conditionalFormatting', 'dataValidation', 'filterData'])(
    'rejects structural live replay when %s metadata is present',
    metadataKey => {
      const plan = planCommittedSpreadsheetRemoteTransaction({
        batch: baseBatch({
          type: 'move_cell_range',
          operationId: 'op-1',
          data: {
            sheetId: 'sheet-1',
            fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
            toRange: { startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }
          }
        }),
        baseRows: [{ _id: 'row-1', Name: 'A' }],
        workbookSnapshot: {
          sheets: {
            'sheet-1': {
              [metadataKey]: [{ range: { startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 } }],
              cellData: { '0': { '0': { v: 'A' } } }
            }
          }
        }
      })

      expect(plan).toEqual({
        ok: false,
        reason: 'unsupported_workbook_feature',
        detail: metadataKey
      })
    }
  )

  it.each(['comments', 'images', 'charts', 'drawings', 'rowGroups', 'columnGroups'])(
    'rejects structural live replay when anchored %s metadata is present',
    metadataKey => {
      const plan = planCommittedSpreadsheetRemoteTransaction({
        batch: baseBatch({
          type: 'move_row_slots',
          operationId: 'op-1',
          data: {
            sheetId: 'sheet-1',
            sourceStartGridRowIndex: 0,
            count: 1,
            destinationGridRowIndex: 2,
            rowIds: ['row-1']
          }
        }),
        baseRows: [{ _id: 'row-1', _rowUuid: 'row-1', Name: 'A' }],
        workbookSnapshot: {
          sheets: {
            'sheet-1': {
              [metadataKey]: [{ id: `${metadataKey}-1` }],
              cellData: { '0': { '0': { v: 'A' } } }
            }
          }
        }
      })

      expect(plan).toEqual({
        ok: false,
        reason: 'unsupported_workbook_feature',
        detail: metadataKey
      })
    }
  )

  it('rejects column reorder without explicit identity/index maps', () => {
    const plan = planCommittedSpreadsheetRemoteTransaction({
      batch: baseBatch({
        type: 'columns_reorder',
        operationId: 'op-1',
        data: { sheetId: 'sheet-1', columns: [] }
      }),
      baseRows: []
    })

    expect(plan).toEqual({
      ok: false,
      reason: 'unsupported_workbook_feature',
      detail: 'column_reorder_missing_index_maps'
    })
  })
})
