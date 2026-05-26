import { UniverRemoteTransactionRunner } from '../univerRemoteTransactionRunner'
import type { SpreadsheetRemoteTransactionPlan } from '../spreadsheetRemoteTransaction'

const okPlan = (
  operations: Extract<SpreadsheetRemoteTransactionPlan, { ok: true }>['batch']['operations']
): Extract<SpreadsheetRemoteTransactionPlan, { ok: true }> => ({
  ok: true,
  batch: {
    sheetId: 'sheet-1',
    workbookId: 'workbook-1',
    batchId: 'batch-1',
    actorId: 'user-1',
    baseVersion: 1,
    appliedVersion: 2,
    payloadSchemaVersion: 1,
    operations
  },
  sessionPatch: { sheetId: 'sheet-1', rows: [], version: 2 },
  dirtyRegions: []
})

describe('UniverRemoteTransactionRunner', () => {
  it('applies value operations under the remote-apply guard', () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const runWithRemoteApplyGuard = jest.fn((apply: () => unknown) => apply())
    const runner = new UniverRemoteTransactionRunner({
      applyRemoteCellUpdatesBulk,
      runWithRemoteApplyGuard
    })

    const result = runner.run(
      okPlan([
        {
          type: 'set_cell',
          operationId: 'op-1',
          data: { sheetId: 'sheet-1', rowId: 'row-1', row: 0, col: 1, value: 'Remote' }
        }
      ])
    )

    expect(result).toEqual({ ok: true, appliedCellCount: 1, appliedOperationCount: 1 })
    expect(runWithRemoteApplyGuard).toHaveBeenCalledTimes(1)
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 1,
          value: 'Remote',
          rowId: 'row-1',
          options: expect.objectContaining({ targetSheetId: 'sheet-1', diagnosticBatchId: 'batch-1' })
        })
      ],
      expect.objectContaining({ batchId: 'batch-1', operationType: 'set_cell' })
    )
  })

  it('applies style operations after registering style payloads in cell options', () => {
    const applyRemoteCellUpdate = jest.fn()
    const runner = new UniverRemoteTransactionRunner({ applyRemoteCellUpdate })

    const result = runner.run(
      okPlan([
        {
          type: 'set_style',
          operationId: 'style-1',
          data: {
            sheetId: 'sheet-1',
            styles: { 'style-1': { bg: { rgb: '#ff0000' } } },
            cells: [{ row: 1, col: 2, stylePatch: { set: { s: 'style-1' } } }]
          }
        }
      ])
    )

    expect(result).toEqual({ ok: true, appliedCellCount: 1, appliedOperationCount: 1 })
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      1,
      2,
      undefined,
      undefined,
      expect.objectContaining({
        stylePatch: { set: { s: 'style-1' } },
        univerStyles: { 'style-1': { bg: { rgb: '#ff0000' } } }
      })
    )
  })

  it('routes range and clear operations through existing remote apply callbacks', () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteClearAllRange = jest.fn()
    const applyRemoteClearFormatRange = jest.fn()
    const runner = new UniverRemoteTransactionRunner({
      applyRemoteCellUpdatesBulk,
      applyRemoteClearAllRange,
      applyRemoteClearFormatRange
    })

    const result = runner.run(
      okPlan([
        {
          type: 'set_range',
          operationId: 'range-1',
          data: {
            sheetId: 'sheet-1',
            cells: [
              { row: 0, col: 0, rowId: 'row-1', value: 'A' },
              { row: 0, col: 1, rowId: 'row-1', value: 'B' }
            ]
          }
        },
        {
          type: 'clear_all',
          operationId: 'clear-all-1',
          data: { sheetId: 'sheet-1', ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }] }
        },
        {
          type: 'clear_format',
          operationId: 'clear-format-1',
          data: { sheetId: 'sheet-1', ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }] }
        }
      ])
    )

    expect(result).toEqual({ ok: true, appliedCellCount: 2, appliedOperationCount: 3 })
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'A' }),
        expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'B' })
      ],
      expect.objectContaining({ operationType: 'set_range' })
    )
    expect(applyRemoteClearAllRange).toHaveBeenCalledWith(
      { sheetId: 'sheet-1', ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }] },
      expect.objectContaining({ operationType: 'clear_all' })
    )
    expect(applyRemoteClearFormatRange).toHaveBeenCalledWith(
      { sheetId: 'sheet-1', ranges: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }] },
      expect.objectContaining({ operationType: 'clear_format' })
    )
  })

  it('accepts row structural operations without applying grid sync in the runner', () => {
    const forceGridReapply = jest.fn()
    const runner = new UniverRemoteTransactionRunner({ applyRemoteCellUpdate: jest.fn(), forceGridReapply })

    expect(
      runner.run({
        ...okPlan([
          {
            type: 'move_row_slots',
            operationId: 'move-1',
            data: { sheetId: 'sheet-1', sourceStartGridRowIndex: 0, count: 1, destinationGridRowIndex: 2 }
          }
        ]),
        dirtyRegions: [{ type: 'rowsFrom', startRow: 0 }]
      })
    ).toEqual({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 })
    expect(forceGridReapply).not.toHaveBeenCalled()
  })

  it('accepts deferred row persistence operations without cell applies', () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const runner = new UniverRemoteTransactionRunner({ applyRemoteCellUpdatesBulk })

    expect(
      runner.run(
        okPlan([
          {
            type: 'add_rows',
            operationId: 'add-rows-1',
            data: {
              sheetId: 'sheet-1',
              rows: [{ id: 'row-new', data: { ColumnA: 'created' } }]
            }
          },
          {
            type: 'insert_rows_at',
            operationId: 'insert-rows-at-1',
            data: {
              sheetId: 'sheet-1',
              insertAt: 1,
              rows: [{ id: 'row-inserted', data: { ColumnA: 'inserted' } }]
            }
          }
        ])
      )
    ).toEqual({ ok: true, appliedCellCount: 0, appliedOperationCount: 2 })
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
  })

  it('accepts column metadata and dimension ops as runner no-ops', () => {
    const runner = new UniverRemoteTransactionRunner({ applyRemoteCellUpdate: jest.fn() })

    expect(
      runner.run(
        okPlan([
          {
            type: 'column_update',
            operationId: 'col-update-1',
            data: { sheetId: 'sheet-1', columnId: 'col-a', columnPatch: { width: 180 } }
          },
          {
            type: 'set_col_width',
            operationId: 'col-width-1',
            data: { sheetId: 'sheet-1', colIndex: 0, width: 180 }
          },
          {
            type: 'set_row_height',
            operationId: 'row-height-1',
            data: { sheetId: 'sheet-1', rowIndex: 0, height: 28 }
          }
        ])
      )
    ).toEqual({ ok: true, appliedCellCount: 0, appliedOperationCount: 3 })
  })

  it('accepts visibility_update as a deferred live feature op with zero cell applies', () => {
    const runner = new UniverRemoteTransactionRunner({ applyRemoteCellUpdate: jest.fn() })

    expect(
      runner.run(
        okPlan([
          {
            type: 'visibility_update',
            operationId: 'hide-col-1',
            data: {
              sheetId: 'sheet-1',
              axis: 'column',
              hidden: true,
              ranges: [{ start: 3, end: 3 }]
            }
          }
        ])
      )
    ).toEqual({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 })
  })

  it('accepts freeze_panes as a deferred live feature op with zero cell applies', () => {
    const runner = new UniverRemoteTransactionRunner({ applyRemoteCellUpdate: jest.fn() })

    expect(
      runner.run(
        okPlan([
          {
            type: 'freeze_panes',
            operationId: 'freeze-col-1',
            data: {
              sheetId: 'sheet-1',
              commandId: 'sheet.command.set-col-frozen',
              startRow: -1,
              startColumn: 0,
              ySplit: 0,
              xSplit: 0
            }
          }
        ])
      )
    ).toEqual({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 })
  })

  it('defers set_style until persisted cell bulk completes', () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    let completeValues: (() => void) | undefined
    const runner = new UniverRemoteTransactionRunner({
      applyRemoteCellUpdatesBulk: (items, meta) => {
        if (meta?.operationType === 'set_range') {
          completeValues = meta.onApplyComplete
        }
        applyRemoteCellUpdatesBulk(items, meta)
      }
    })

    const result = runner.run(
      okPlan([
        {
          type: 'set_range',
          operationId: 'range-1',
          data: {
            sheetId: 'sheet-1',
            cells: [{ row: 0, col: 0, value: 'v' }]
          }
        },
        {
          type: 'set_style',
          operationId: 'style-1',
          data: {
            sheetId: 'sheet-1',
            cells: [{ row: 0, col: 0, stylePatch: { set: { s: 'style-1' } } }]
          }
        }
      ])
    )

    expect(result).toEqual({ ok: true, appliedCellCount: 1, appliedOperationCount: 1 })
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1)
    expect(applyRemoteCellUpdatesBulk.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ operationType: 'set_range' })
    )
    completeValues?.()
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(2)
    expect(applyRemoteCellUpdatesBulk.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ operationType: 'set_style' })
    )
  })

  it('rejects unsupported workbook feature operations until feature live transforms are wired', () => {
    const runner = new UniverRemoteTransactionRunner({ applyRemoteCellUpdate: jest.fn() })

    expect(
      runner.run(
        okPlan([
          {
            type: 'merge_ranges',
            operationId: 'merge-1',
            data: { sheetId: 'sheet-1', ranges: [] }
          }
        ])
      )
    ).toEqual({
      ok: false,
      reason: 'unsupported_runner_operation',
      detail: 'merge_ranges'
    })
  })
})
