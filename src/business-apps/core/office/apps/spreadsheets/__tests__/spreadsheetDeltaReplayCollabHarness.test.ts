/**
 * Automated coverage for the Phase 0 / Step 6 two-client collaboration matrix.
 * Each case models a remote peer applying an op and asserts the local manager state/grid hooks.
 */
import type { SpreadsheetColumn } from '../types/spreadsheet'
import { SpreadsheetCollaborationManager } from '../services/SpreadsheetCollaborationManager'
import { createManagerWithCommittedReplay } from './helpers/spreadsheetCollabCommittedReplayTestUtils'

function col(partial: Partial<SpreadsheetColumn> & Pick<SpreadsheetColumn, 'id' | 'name'>): SpreadsheetColumn {
  return {
    type: 'text',
    label: partial.name,
    isEditable: true,
    isRequired: false,
    isUnique: false,
    order: 0,
    isVisible: true,
    ...partial
  }
}

describe('spreadsheetDeltaReplayCollabHarness', () => {
  beforeEach(() => {
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('plain cell edit: remote set_cell applies through committed replay', () => {
    const columns = [col({ id: 'col-a', name: 'ColumnA', order: 0 })]
    const rows = [{ _id: 'row-1', ColumnA: 'before' }]
    const { manager, applyRemoteCellUpdatesBulk } = createManagerWithCommittedReplay({
      getSheetVersion: () => 4,
      getColumns: () => columns,
      getLocalSheetData: () => rows,
      getSheetData: () => rows
    })

    manager.handleOperation({
      userId: 'peer',
      userName: 'Peer',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          baseVersion: 4,
          appliedVersion: 5,
          payloadSchemaVersion: 1,
          batchId: 'batch-cell-1',
          operations: [
            {
              type: 'set_cell',
              data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: 'after', row: 0, col: 0 }
            }
          ]
        }
      },
      version: 5,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalled()
  })

  it('row insert: insert_row_slots applies on committed path', async () => {
    const applyRemoteInsertRowSlots = jest.fn(() => true)
    const commitSheetData = jest.fn()
    const rows = [
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'a' },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'b' }
    ]
    const { manager, applyRemoteCellUpdatesBulk } = createManagerWithCommittedReplay({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', order: 0 })],
      getLocalSheetData: () => rows,
      getSheetData: () => rows,
      commitSheetData,
      applyRemoteInsertRowSlots
    })

    manager.handleOperation({
      userId: 'peer',
      userName: 'Peer',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'insert_row_slots',
              data: {
                sheetId: 'sheet-1',
                startGridRowIndex: 1,
                count: 1,
                rows: [{ id: 'row-new', data: { _gridRowIndex: 1, ColumnA: 'new' } }]
              }
            }
          ]
        }
      },
      version: 10,
      timestamp: Date.now()
    })

    await Promise.resolve()
    expect(applyRemoteInsertRowSlots).toHaveBeenCalled()
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
  })

  it('version gap: requests catch-up instead of applying stale batch', () => {
    const requestSheetCatchUp = jest.fn()
    const applyRemoteCellUpdatesBulk = jest.fn()
    const { manager } = createManagerWithCommittedReplay({
      getSheetVersion: () => 8,
      requestSheetCatchUp,
      applyRemoteCellUpdatesBulk
    })

    manager.handleOperation({
      userId: 'peer',
      userName: 'Peer',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          baseVersion: 9,
          appliedVersion: 10,
          payloadSchemaVersion: 1,
          operations: [{ type: 'set_cell', data: { sheetId: 'sheet-1', rowId: 'r1', columnName: 'A', value: 1 } }]
        }
      },
      version: 10,
      timestamp: Date.now()
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'version_gap', expect.any(Object))
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
  })

  it('rich sheet merge: plans snapshot fallback instead of committed apply', () => {
    const onDiagnosticsTraceEvent = jest.fn()
    const applyRemoteCellUpdatesBulk = jest.fn()
    const { manager } = createManagerWithCommittedReplay({
      getSheetVersion: () => 1,
      getLocalSheetData: () => [{ _id: 'row-1', ColumnA: 'x' }],
      getWorkbookSnapshot: () => ({
        sheets: {
          'sheet-1': {
            mergeData: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }],
            cellData: { '0': { '0': { v: 'x' } } }
          }
        }
      }),
      onDiagnosticsTraceEvent,
      applyRemoteCellUpdatesBulk
    })

    manager.handleOperation({
      userId: 'peer',
      userName: 'Peer',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'move_cell_range',
              data: {
                sheetId: 'sheet-1',
                fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
                toRange: { startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }
              }
            }
          ]
        }
      },
      version: 2,
      timestamp: Date.now()
    })

    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_committed_batch_transaction_rejected',
        payload: expect.objectContaining({ detail: 'mergeData' })
      })
    )
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
  })

  it('identity-keyed placements: applies gridRowIndexByRowUuid on committed batch', async () => {
    const commitSheetData = jest.fn()
    const rows = [
      { _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'a' },
      { _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'b' }
    ]
    const { manager } = createManagerWithCommittedReplay({
      getSheetVersion: () => 4,
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', order: 0 })],
      getLocalSheetData: () => rows,
      getSheetData: () => rows,
      commitSheetData
    })

    manager.handleOperation({
      userId: 'peer',
      userName: 'Peer',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          baseVersion: 4,
          appliedVersion: 5,
          payloadSchemaVersion: 1,
          gridRowIndexByRowUuid: { 'row-1': 3, 'row-2': 4 },
          operations: [
            {
              type: 'set_cell',
              data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: 'x', row: 0, col: 0 }
            }
          ]
        }
      },
      version: 5,
      timestamp: Date.now()
    })

    await Promise.resolve()
    expect(commitSheetData).toHaveBeenCalled()
    const committedRows = commitSheetData.mock.calls[0][1] as Array<Record<string, unknown>>
    expect(committedRows[0]._gridRowIndex).toBe(3)
    expect(committedRows[1]._gridRowIndex).toBe(4)
  })

  it('WS-before-HTTP-ack: local committed batch dedupes peer echo at same version', () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const { manager } = createManagerWithCommittedReplay({
      getSheetVersion: () => 4,
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', order: 0 })],
      getLocalSheetData: () => [{ _rowUuid: 'row-1', ColumnA: 'local' }],
      getSheetData: () => [{ _rowUuid: 'row-1', ColumnA: 'local' }],
      applyRemoteCellUpdatesBulk
    })

    const batchEnvelope = {
      sheetId: 'sheet-1',
      baseVersion: 4,
      appliedVersion: 5,
      payloadSchemaVersion: 1,
      batchId: 'batch-local-1',
      operations: [
        {
          type: 'set_cell',
          data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: 'local' }
        }
      ]
    }

    manager.applyLocalCommittedBatch({
      committedBatch: {
        ...batchEnvelope,
        operations: batchEnvelope.operations.map(op => ({
          type: op.type,
          data: op.data
        }))
      },
      isSameUser: true
    })

    manager.handleOperation({
      userId: 'self',
      userName: 'Self',
      operation: {
        type: 'batch_operations',
        data: batchEnvelope
      },
      version: 5,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
  })

  it('HTTP catch-up replay: replayDeltaChanges uses committed envelopes', () => {
    const handleOperation = jest.spyOn(SpreadsheetCollaborationManager.prototype, 'handleOperation')
    const { manager } = createManagerWithCommittedReplay({
      getSheetVersion: () => 3,
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', order: 0 })],
      getLocalSheetData: () => [{ _id: 'row-1', ColumnA: 'v' }]
    })

    manager.replayDeltaChanges(
      [
        {
          operationType: 'set_cell',
          appliedVersion: 4,
          baseVersion: 3,
          operationLogId: 'log-4',
          payload: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: 'remote' }
        }
      ],
      4,
      'sheet-1'
    )

    expect(handleOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: expect.objectContaining({ type: 'batch_operations' })
      })
    )
    handleOperation.mockRestore()
  })
})
