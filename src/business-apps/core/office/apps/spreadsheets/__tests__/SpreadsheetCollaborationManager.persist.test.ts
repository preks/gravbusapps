import {
  SpreadsheetCollaborationManager,
  type CollaborationCallbacks
} from '../services/SpreadsheetCollaborationManager'
import type { SpreadsheetColumn } from '../types/spreadsheet'

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

describe('SpreadsheetCollaborationManager persist and receive', () => {
  beforeEach(() => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'off')
  })

  const makeCommittedReplayCallbacks = (over: Partial<CollaborationCallbacks>): CollaborationCallbacks =>
    makeCallbacks({
      runRemoteTransaction: jest.fn(() => ({
        ok: true as const,
        appliedCellCount: 1,
        appliedOperationCount: 1
      })),
      applyRemoteCellUpdatesBulk: jest.fn(),
      ...over
    })

  const makeCallbacks = (over: Partial<CollaborationCallbacks>): CollaborationCallbacks => ({
    getActiveSheetId: () => 'sheet-1',
    getColumns: () => [],
    getLocalSheetData: () => [],
    getBackendRowIdForUiRowId: () => undefined,
    commitLocalSheetData: jest.fn(),
    applyRemoteCellUpdate: jest.fn(),
    onVersionUpdate: jest.fn(),
    scheduleSheetVersionRefreshFromApi: jest.fn(),
    scheduleRemoteStructuralResync: jest.fn(),
    ...over
  })

  afterEach(() => {
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  describe('legacy batch_operations envelope synthesis', () => {
    it('rewraps unenveloped batch_operations into committed receive when delta replay is enabled', () => {
      localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
      const runRemoteTransaction = jest.fn(() => ({
        ok: true as const,
        appliedCellCount: 1,
        appliedOperationCount: 1
      }))
      const callbacks = makeCallbacks({
        getSheetVersion: () => 4,
        getColumns: () => [col({ id: 'col-a', name: 'ColumnA', order: 0 })],
        getLocalSheetData: () => [{ _id: 'row-1', ColumnA: 'old' }],
        runRemoteTransaction
      })
      const manager = new SpreadsheetCollaborationManager(callbacks)

      manager.handleOperation({
        userId: 'u2',
        userName: 'Other',
        operation: {
          type: 'batch_operations',
          data: {
            sheetId: 'sheet-1',
            operations: [
              {
                type: 'set_cell',
                data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: 'new', row: 0, col: 0 }
              }
            ]
          }
        },
        version: 5,
        timestamp: Date.now()
      })

      expect(runRemoteTransaction).toHaveBeenCalled()
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })
  })

  describe('phase 3 legacy wire relay', () => {
    it('emits telemetry and requests catch-up for deprecated standalone structural wire ops', () => {
      const requestSheetCatchUp = jest.fn()
      const onDiagnosticsTraceEvent = jest.fn()
      const callbacks = makeCallbacks({
        requestSheetCatchUp,
        onDiagnosticsTraceEvent
      })
      const manager = new SpreadsheetCollaborationManager(callbacks)
      manager.setLastKnownVersion(5)

      manager.handleOperation({
        userId: 'u2',
        userName: 'Other',
        operation: {
          type: 'insert_row_slots',
          data: { sheetId: 'sheet-1', startGridRowIndex: 1, count: 1, rows: [] }
        },
        version: 6,
        timestamp: Date.now()
      })

      expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'client_deprecated_ws_structural_relay_received' })
      )
      expect(requestSheetCatchUp).toHaveBeenCalledWith(
        'sheet-1',
        'stale_version_data_op',
        expect.objectContaining({ incomingVersion: 6 })
      )
    })

    it('routes legacy cells_changed through committed replay when enabled', () => {
      localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
      const runRemoteTransaction = jest.fn(() => ({
        ok: true as const,
        appliedCellCount: 1,
        appliedOperationCount: 1
      }))
      const onDiagnosticsTraceEvent = jest.fn()
      const callbacks = makeCallbacks({
        getSheetVersion: () => 2,
        getColumns: () => [col({ id: 'col-a', name: 'ColumnA', order: 0 })],
        getLocalSheetData: () => [{ _id: 'row-1', ColumnA: 'old' }],
        runRemoteTransaction,
        onDiagnosticsTraceEvent
      })
      const manager = new SpreadsheetCollaborationManager(callbacks)

      manager.handleOperation({
        userId: 'u2',
        userName: 'Other',
        operation: {
          type: 'cells_changed',
          data: {
            sheetId: 'sheet-1',
            cells: [{ rowId: 'row-1', column: 'ColumnA', value: 'new' }]
          }
        },
        version: 3,
        timestamp: Date.now()
      })

      expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'client_legacy_wire_operation_received' })
      )
      expect(runRemoteTransaction).toHaveBeenCalled()
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })
  })

  describe('delta replay catch-up routing', () => {
    it('replayDeltaChanges synthesizes committed batch_operations instead of legacy handleBatchOperations', () => {
      localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
      const handleOperation = jest.spyOn(SpreadsheetCollaborationManager.prototype, 'handleOperation')
      const callbacks = makeCallbacks({
        getColumns: () => [col({ id: 'col-a', name: 'ColumnA', order: 0 })],
        getLocalSheetData: () => [{ _id: 'row-1', ColumnA: 'a' }]
      })
      const manager = new SpreadsheetCollaborationManager(callbacks)

      manager.replayDeltaChanges(
        [
          {
            operationType: 'set_cell',
            appliedVersion: 5,
            baseVersion: 4,
            operationLogId: 'log-5',
            payload: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: 'remote' }
          }
        ],
        5,
        'sheet-1'
      )

      expect(handleOperation).toHaveBeenCalledTimes(1)
      const payload = handleOperation.mock.calls[0]?.[0]
      expect(payload?.operation.type).toBe('batch_operations')
      expect(payload?.operation.data).toEqual(
        expect.objectContaining({
          sheetId: 'sheet-1',
          appliedVersion: 5,
          baseVersion: 4,
          batchId: 'log-5'
        })
      )
      expect(payload?.version).toBe(5)
      handleOperation.mockRestore()
    })
  })

  it('replays set_style deltas through the same live apply path after reconnect', async () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', id: 'row-0', ColumnA: 'old' }]
    const applyRemoteCellUpdate = jest.fn()
    const onVersionUpdate = jest.fn()
    const fetchChangesSince = jest.fn().mockResolvedValue({
      sheetId: 'sheet-1',
      currentVersion: 2,
      requiresSnapshot: false,
      changes: [
        {
          operationType: 'set_style',
          appliedVersion: 2,
          payload: {
            sheetId: 'sheet-1',
            styles: { 'style-1': { bg: { rgb: '#ff0000' } } },
            cells: [{ row: 0, col: 0, stylePatch: { set: { s: 'style-1' } } }]
          },
          result: {}
        }
      ]
    })

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      applyRemoteCellUpdate,
      onVersionUpdate,
      fetchChangesSince
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(1)

    manager.setConnectionState(true, true)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetchChangesSince).toHaveBeenCalledWith('sheet-1', 1)
    expect(onVersionUpdate).toHaveBeenCalledWith(2)
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      undefined,
      undefined,
      expect.objectContaining({
        stylePatch: { set: { s: 'style-1' } },
        univerStyles: { 'style-1': { bg: { rgb: '#ff0000' } } }
      })
    )
  })

  it('plans committed batches in shadow mode without scheduling snapshot side effects', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'shadow')
    const commitSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'name', name: 'Name', isVisible: true, order: 0 })],
      getSheetData: () => [{ _id: 'row-1', _rowUuid: 'row-1', Name: 'Old' }],
      commitSheetData,
      applyRemoteCellUpdate,
      scheduleRemoteStructuralResync,
      onDiagnosticsTraceEvent
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        baseVersion: 1,
        version: 2,
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-1',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'set_cell',
              operationId: 'op-1',
              data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'Name', value: 'New', row: 0, col: 0 }
            }
          ]
        }
      }
    })

    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_committed_batch_transaction_planned',
        payload: expect.objectContaining({ replayMode: 'shadow' })
      })
    )
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('coalesces committed batch snapshot fallback and records fallback reason telemetry', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const onCollabDiagnostic = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      scheduleRemoteStructuralResync,
      onDiagnosticsTraceEvent,
      isCollabDiagEnabled: () => true,
      onCollabDiagnostic
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)
    const operation = {
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-requires-snapshot',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          requiresSnapshot: true,
          operations: [
            {
              type: 'set_cell',
              operationId: 'op-1',
              data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'Name', value: 'New' }
            }
          ]
        }
      }
    }

    manager.handleOperation(operation)
    manager.handleOperation(operation)

    expect(scheduleRemoteStructuralResync).toHaveBeenCalledTimes(1)
    expect(scheduleRemoteStructuralResync).toHaveBeenCalledWith('sheet-1', { immediate: true })
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_snapshot_fallback_scheduled',
        payload: expect.objectContaining({ reason: 'requires_snapshot', sheetId: 'sheet-1' })
      })
    )
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_snapshot_fallback_deduplicated',
        payload: expect.objectContaining({ reason: 'requires_snapshot', sheetId: 'sheet-1' })
      })
    )
    expect(onCollabDiagnostic).toHaveBeenCalledWith(
      'blocked_recovery_escalated_to_snapshot',
      expect.objectContaining({
        reason: 'requires_snapshot',
        fallbackReason: 'requires_snapshot',
        recoveryPath: 'explicit_snapshot_required'
      })
    )
  })

  it('enriches rowId-based set_cell payloads before enabled runner apply', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const commitSheetData = jest.fn()
    const applyRemoteCellUpdatesBulk = jest.fn()
    const runRemoteTransaction = jest.fn(
      (plan: { batch: { operations: Array<{ data: Record<string, unknown> }> } }) => {
        expect(plan.batch.operations[0]?.data).toEqual(
          expect.objectContaining({ row: 0, col: 0, rowId: 'row-1', columnName: 'Name', value: 'New' })
        )
        return { ok: true, appliedCellCount: 1, appliedOperationCount: 1 } as const
      }
    )
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'name', name: 'Name', isVisible: true, order: 0 })],
      getSheetData: () => [{ _id: 'row-1', _rowUuid: 'row-1', Name: 'Old' }],
      commitSheetData,
      applyRemoteCellUpdatesBulk,
      runRemoteTransaction
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          batchId: 'batch-enabled-rowid',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'set_cell',
              operationId: 'op-1',
              data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'Name', value: 'New' }
            }
          ]
        }
      }
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('commits enabled transaction plans through the remote runner without legacy grid apply', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const commitSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({ ok: true, appliedCellCount: 1, appliedOperationCount: 1 }) as const)
    const onVersionUpdate = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'name', name: 'Name', isVisible: true, order: 0 })],
      getSheetData: () => [{ _id: 'row-1', _rowUuid: 'row-1', Name: 'Old' }],
      commitSheetData,
      applyRemoteCellUpdate,
      runRemoteTransaction,
      onVersionUpdate,
      scheduleRemoteStructuralResync,
      onDiagnosticsTraceEvent
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-enabled-1',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'set_cell',
              operationId: 'op-1',
              data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'Name', value: 'New', row: 0, col: 0 }
            }
          ]
        }
      }
    })

    expect(runRemoteTransaction).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
    expect(commitSheetData).toHaveBeenCalledWith('sheet-1', [{ _id: 'row-1', _rowUuid: 'row-1', Name: 'New' }], {
      persisted: true,
      syncGrid: false
    })
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(onVersionUpdate).toHaveBeenCalledWith(2)
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'client_committed_batch_transaction_applied' })
    )
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('does not advance enabled transactions when the remote runner fails', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const commitSheetData = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({ ok: false, reason: 'runner_apply_failed', detail: 'boom' }) as const)
    const onVersionUpdate = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'name', name: 'Name', isVisible: true, order: 0 })],
      getSheetData: () => [{ _id: 'row-1', _rowUuid: 'row-1', Name: 'Old' }],
      commitSheetData,
      runRemoteTransaction,
      onVersionUpdate,
      scheduleRemoteStructuralResync
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-enabled-failure',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'set_cell',
              operationId: 'op-1',
              data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'Name', value: 'New', row: 0, col: 0 }
            }
          ]
        }
      }
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    expect(commitSheetData).not.toHaveBeenCalled()
    expect(onVersionUpdate).not.toHaveBeenCalled()
    expect(scheduleRemoteStructuralResync).toHaveBeenCalledWith('sheet-1', { immediate: true })
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('commits enabled row structural transactions without scheduling structural resync', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const commitSheetData = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 }) as const)
    const forceGridReapply = jest.fn()
    const applyRemoteRowSlotsMove = jest.fn(() => true)
    const scheduleRemoteStructuralResync = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'name', name: 'Name', isVisible: true, order: 0 })],
      getSheetData: () => [
        { _id: 'row-a', _rowUuid: 'row-a', Name: 'A' },
        { _id: 'row-b', _rowUuid: 'row-b', Name: 'B' }
      ],
      commitSheetData,
      runRemoteTransaction,
      forceGridReapply,
      applyRemoteRowSlotsMove,
      scheduleRemoteStructuralResync
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-enabled-row-move',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'move_row_slots',
              operationId: 'move-1',
              data: {
                sheetId: 'sheet-1',
                sourceStartGridRowIndex: 0,
                count: 1,
                destinationGridRowIndex: 2,
                rowIds: ['row-a']
              }
            }
          ]
        }
      }
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    expect(commitSheetData).toHaveBeenCalledWith(
      'sheet-1',
      [
        { _id: 'row-b', _rowUuid: 'row-b', _gridRowIndex: 0, Name: 'B' },
        { _id: 'row-a', _rowUuid: 'row-a', _gridRowIndex: 1, Name: 'A' }
      ],
      { persisted: true, syncGrid: false }
    )
    return Promise.resolve().then(() => {
      expect(applyRemoteRowSlotsMove).toHaveBeenCalledWith({
        sheetId: 'sheet-1',
        sourceStartGridRowIndex: 0,
        count: 1,
        destinationGridRowIndex: 2
      })
      expect(forceGridReapply).not.toHaveBeenCalled()
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })
  })

  it('applies enabled column structural metadata without scheduling structural resync', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const commitSheetData = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 }) as const)
    const onRemoteColumnUpdate = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()
    const columns = [col({ id: 'col-a', name: 'A', order: 0 }), col({ id: 'col-b', name: 'B', order: 1 })]
    const reorderedColumns = [
      { ...columns[1], order: 0 },
      { ...columns[0], order: 1 }
    ]
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => columns,
      getSheetData: () => [],
      commitSheetData,
      runRemoteTransaction,
      onRemoteColumnUpdate,
      scheduleRemoteStructuralResync
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-enabled-columns',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'columns_reorder',
              operationId: 'columns-1',
              data: {
                sheetId: 'sheet-1',
                columns: reorderedColumns,
                previousIndexByColumnId: { 'col-a': 0, 'col-b': 1 },
                nextIndexByColumnId: { 'col-b': 0, 'col-a': 1 }
              }
            }
          ]
        }
      }
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    expect(onRemoteColumnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        columns: reorderedColumns
      })
    )
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('applies enabled column_update and set_col_width batches without snapshot fallback', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const commitSheetData = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 5 }) as const)
    const onRemoteColumnUpdate = jest.fn()
    const applyRemoteDimensions = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'col-a', name: 'A', order: 0, width: 120 })],
      getSheetData: () => [],
      commitSheetData,
      runRemoteTransaction,
      onRemoteColumnUpdate,
      applyRemoteDimensions,
      scheduleRemoteStructuralResync,
      onDiagnosticsTraceEvent
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-dimensions-change',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'column_update',
              operationId: 'col-update-1',
              data: {
                sheetId: 'sheet-1',
                columnId: 'col-a',
                columnPatch: { width: 180 }
              }
            },
            {
              type: 'set_col_width',
              operationId: 'col-width-1',
              data: { sheetId: 'sheet-1', colIndex: 0, width: 180 }
            }
          ]
        }
      }
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    expect(onRemoteColumnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        columnId: 'col-a',
        columnPatch: { width: 180 }
      })
    )
    expect(applyRemoteDimensions).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        columnData: { '0': { w: 180 } }
      })
    )
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'client_snapshot_fallback_scheduled' })
    )
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('applies a concurrent set_style + set_row_height batch through one receive pipeline (Gate 3c)', () => {
    // Phase 3 (p3-gate3c): style-only and dimension-only changes arrive together inside a single
    // authoritative `batch_operations` envelope. Both must apply via the one receive pipeline —
    // style through `applyRemoteCellUpdate`, row height through the authoritative
    // `applyRemoteDimensions` fan-out (NOT a P2P `dimension_sync` relay) — with no snapshot
    // fallback / structural resync.
    const applyRemoteCellUpdate = jest.fn()
    const applyRemoteDimensions = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const callbacks = makeCallbacks({
      applyRemoteCellUpdate,
      applyRemoteDimensions,
      scheduleRemoteStructuralResync,
      onDiagnosticsTraceEvent
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_style',
              operationId: 'style-1',
              data: {
                sheetId: 'sheet-1',
                styles: { style_fill: { bg: { rgb: '#ffeb3b' } } },
                cells: [{ row: 0, col: 0, cellRef: 'A1', stylePatch: { set: { s: 'style_fill' } } }]
              }
            },
            {
              type: 'set_row_height',
              operationId: 'row-height-1',
              data: { sheetId: 'sheet-1', rowIndex: 0, height: 42 }
            }
          ]
        }
      }
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      undefined,
      undefined,
      expect.objectContaining({
        stylePatch: { set: { s: 'style_fill' } },
        univerStyles: { style_fill: { bg: { rgb: '#ffeb3b' } } }
      })
    )
    expect(applyRemoteDimensions).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        rowData: { '0': { h: 42 } }
      })
    )
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'client_snapshot_fallback_scheduled' })
    )
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(2)
  })

  it('commits enabled move_cell_range transactions without scheduling structural resync', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const commitSheetData = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 }) as const)
    const scheduleRemoteStructuralResync = jest.fn()
    const applyRemoteMoveCellRange = jest.fn(() => true)
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [
        col({ id: 'col-a', name: 'A', isVisible: true, order: 0 }),
        col({ id: 'col-b', name: 'B', isVisible: true, order: 1 })
      ],
      getSheetData: () => [
        { _id: 'row-1', _rowUuid: 'row-1', A: 'A1', B: 'B1' },
        { _id: 'row-2', _rowUuid: 'row-2', A: 'A2', B: 'B2' }
      ],
      commitSheetData,
      runRemoteTransaction,
      scheduleRemoteStructuralResync,
      applyRemoteMoveCellRange,
      isRecentLocalBatchId: () => false
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-enabled-move-cell-range',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'move_cell_range',
              operationId: 'move-cells-1',
              data: {
                sheetId: 'sheet-1',
                fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
                toRange: { startRow: 1, endRow: 1, startColumn: 1, endColumn: 1 }
              }
            }
          ]
        }
      }
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    expect(commitSheetData).toHaveBeenCalledWith(
      'sheet-1',
      [
        { _id: 'row-1', _rowUuid: 'row-1', B: 'B1' },
        { _id: 'row-2', _rowUuid: 'row-2', A: 'A2', B: 'A1' }
      ],
      { persisted: true, syncGrid: false }
    )
    return Promise.resolve().then(() => {
      expect(applyRemoteMoveCellRange).toHaveBeenCalledWith({
        sheetId: 'sheet-1',
        fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
        toRange: { startRow: 1, endRow: 1, startColumn: 1, endColumn: 1 }
      })
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })
  })

  it('applies remote row visibility_update on the grid when delta replay is enabled', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const commitSheetData = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 }) as const)
    const scheduleRemoteStructuralResync = jest.fn()
    const applyRemoteSpreadsheetFeatureOperation = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'col-a', name: 'A', isVisible: true, order: 0 })],
      getSheetData: () => [{ _id: 'row-1', _rowUuid: 'row-1', A: 'A1' }],
      commitSheetData,
      runRemoteTransaction,
      scheduleRemoteStructuralResync,
      applyRemoteSpreadsheetFeatureOperation,
      isRecentLocalBatchId: () => false
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-enabled-hide-rows',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'visibility_update',
              operationId: 'hide-rows-1',
              data: {
                sheetId: 'sheet-1',
                axis: 'row',
                hidden: true,
                ranges: [{ start: 1, end: 1 }]
              }
            }
          ]
        }
      }
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    return Promise.resolve().then(() => {
      expect(applyRemoteSpreadsheetFeatureOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visibility_update',
          data: expect.objectContaining({
            sheetId: 'sheet-1',
            axis: 'row',
            hidden: true,
            ranges: [{ start: 1, end: 1 }]
          })
        }),
        expect.objectContaining({ operationType: 'visibility_update' })
      )
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })
  })

  it('applies remote column visibility_update on the grid when delta replay is enabled', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const commitSheetData = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 }) as const)
    const scheduleRemoteStructuralResync = jest.fn()
    const applyRemoteSpreadsheetFeatureOperation = jest.fn()
    const onRemoteColumnUpdate = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [
        col({ id: 'col-a', name: 'A', isVisible: true, order: 0 }),
        col({ id: 'col-b', name: 'B', isVisible: true, order: 1 })
      ],
      getSheetData: () => [{ _id: 'row-1', _rowUuid: 'row-1', A: 'A1', B: 'B1' }],
      commitSheetData,
      runRemoteTransaction,
      scheduleRemoteStructuralResync,
      applyRemoteSpreadsheetFeatureOperation,
      onRemoteColumnUpdate,
      isRecentLocalBatchId: () => false
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-enabled-hide-cols',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'visibility_update',
              operationId: 'hide-cols-1',
              data: {
                sheetId: 'sheet-1',
                axis: 'column',
                hidden: true,
                ranges: [{ start: 0, end: 0 }]
              }
            }
          ]
        }
      }
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    return Promise.resolve().then(() => {
      expect(applyRemoteSpreadsheetFeatureOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visibility_update',
          data: expect.objectContaining({
            sheetId: 'sheet-1',
            axis: 'column',
            hidden: true,
            ranges: [{ start: 0, end: 0 }]
          })
        }),
        expect.objectContaining({ operationType: 'visibility_update' })
      )
      expect(onRemoteColumnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          sheetId: 'sheet-1',
          columns: expect.arrayContaining([
            expect.objectContaining({ id: 'col-a', isVisible: false }),
            expect.objectContaining({ id: 'col-b', isVisible: true })
          ])
        })
      )
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })
  })

  it('applies remote freeze_panes on the grid when delta replay is enabled', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const runRemoteTransaction = jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 }) as const)
    const scheduleRemoteStructuralResync = jest.fn()
    const applyRemoteSpreadsheetFeatureOperation = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'col-a', name: 'A', isVisible: true, order: 0 })],
      getSheetData: () => [{ _id: 'row-1', _rowUuid: 'row-1', A: 'A1' }],
      runRemoteTransaction,
      scheduleRemoteStructuralResync,
      applyRemoteSpreadsheetFeatureOperation,
      isRecentLocalBatchId: () => false
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-enabled-freeze-col',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
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
          ]
        }
      }
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    return Promise.resolve().then(() => {
      expect(applyRemoteSpreadsheetFeatureOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'freeze_panes',
          data: expect.objectContaining({
            sheetId: 'sheet-1',
            startColumn: 0,
            startRow: -1
          })
        }),
        expect.objectContaining({ operationType: 'freeze_panes' })
      )
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })
  })

  it('applies remote freeze_panes cancel on the grid when delta replay is enabled', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const applyRemoteSpreadsheetFeatureOperation = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'col-a', name: 'A', isVisible: true, order: 0 })],
      getSheetData: () => [{ _id: 'row-1', _rowUuid: 'row-1', A: 'A1' }],
      runRemoteTransaction: jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 }) as const),
      applyRemoteSpreadsheetFeatureOperation,
      isRecentLocalBatchId: () => false
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-enabled-unfreeze',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'freeze_panes',
              operationId: 'unfreeze-1',
              data: {
                sheetId: 'sheet-1',
                cleared: true
              }
            }
          ]
        }
      }
    })

    return Promise.resolve().then(() => {
      expect(applyRemoteSpreadsheetFeatureOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'freeze_panes',
          data: expect.objectContaining({ sheetId: 'sheet-1', cleared: true })
        }),
        expect.objectContaining({ operationType: 'freeze_panes' })
      )
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })
  })

  it('skips remote visibility_update grid apply for local echo batches when delta replay is enabled', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const applyRemoteSpreadsheetFeatureOperation = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'col-a', name: 'A', isVisible: true, order: 0 })],
      getSheetData: () => [{ _id: 'row-1', _rowUuid: 'row-1', A: 'A1' }],
      runRemoteTransaction: jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 }) as const),
      applyRemoteSpreadsheetFeatureOperation,
      isRecentLocalBatchId: () => true
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-1',
      userName: 'Local User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-local-echo-hide',
          actorId: 'user-1',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'visibility_update',
              operationId: 'hide-rows-echo',
              data: {
                sheetId: 'sheet-1',
                axis: 'row',
                hidden: false,
                ranges: [{ start: 0, end: 0 }]
              }
            }
          ]
        }
      }
    })

    return Promise.resolve().then(() => {
      expect(applyRemoteSpreadsheetFeatureOperation).not.toHaveBeenCalled()
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })
  })

  it('requests catch-up when known sheet version is ahead of a committed batch that was never applied', () => {
    const commitSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 6,
      getColumns: () => [col({ id: 'name', name: 'Name', isVisible: true, order: 0 })],
      getSheetData: () => [{ _id: 'row-1', _rowUuid: 'row-1', Name: 'Old' }],
      commitSheetData,
      applyRemoteCellUpdate,
      scheduleRemoteStructuralResync,
      requestSheetCatchUp,
      onDiagnosticsTraceEvent
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(6)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 1,
      operation: {
        type: 'batch_operations',
        broadcastOnly: true,
        baseVersion: 0,
        version: 1,
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-remote-1',
          actorId: 'user-2',
          baseVersion: 0,
          appliedVersion: 1,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'set_cell',
              operationId: 'op-1',
              data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'Name', value: 'Peer', row: 0, col: 0 }
            }
          ]
        }
      }
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'stale_version_data_op', {
      sinceVersion: 0,
      incomingVersion: 1
    })
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(commitSheetData).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'client_committed_batch_already_reflected_skipped' })
    )
  })

  it('replays mixed value and style deltas through the manager catch-up path', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', _rowUuid: 'backend-row-1', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const onVersionUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      onVersionUpdate
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'set_cell',
          appliedVersion: 3,
          payload: { sheetId: 'sheet-1', rowId: 'backend-row-1', columnName: 'ColumnA', value: 'new' }
        },
        {
          operationType: 'set_style',
          appliedVersion: 3,
          payload: {
            sheetId: 'sheet-1',
            styles: { 'style-1': { bg: { rgb: '#00ff00' } } },
            cells: [{ row: 0, col: 0, stylePatch: { set: { s: 'style-1' } } }]
          }
        }
      ],
      3,
      'sheet-1'
    )

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [{ _id: 'row-0', _rowUuid: 'backend-row-1', ColumnA: 'new', _updatedAt: expect.any(String) }],
      { persisted: true, syncGrid: false }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'new', 'backend-row-1')
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      undefined,
      undefined,
      expect.objectContaining({
        diagnosticOperationType: 'set_style',
        stylePatch: { set: { s: 'style-1' } },
        univerStyles: { 'style-1': { bg: { rgb: '#00ff00' } } }
      })
    )
    expect(onVersionUpdate).toHaveBeenCalledWith(3)
  })

  it('does not schedule full-grid forceGridReapply after set_style and version catch-up replay', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-m', name: 'column_m', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-113', _rowUuid: 'row-113', column_m: 'M113' }]
    const forceGridReapply = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData: jest.fn(),
      applyRemoteCellUpdate,
      forceGridReapply,
      onVersionUpdate: jest.fn()
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'add_rows',
          appliedVersion: 5,
          payload: {
            sheetId: 'sheet-1',
            rows: [{ id: 'row-113', data: { column_m: 'M113' } }]
          }
        },
        {
          operationType: 'set_style',
          appliedVersion: 5,
          payload: {
            sheetId: 'sheet-1',
            styles: { 'style-1': { bg: { rgb: '#00ff00' } } },
            cells: [{ row: 0, col: 0, stylePatch: { set: { s: 'style-1' } } }]
          }
        }
      ],
      5,
      'sheet-1'
    )

    expect(forceGridReapply).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalled()
  })

  it('replayDeltaChanges prefers cellRef for sparse-row grid apply instead of data-array index', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [
      { _id: 'row-0', _rowUuid: 'row-0', _gridRowIndex: 0, ColumnA: 'a' },
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 1, ColumnA: 'b' },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'c' },
      { _id: 'row-sparse', _rowUuid: 'backend-sparse', _gridRowIndex: 10, ColumnA: 'old' }
    ]
    const applyRemoteCellUpdate = jest.fn()
    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData: jest.fn(),
      applyRemoteCellUpdate
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'set_range',
          appliedVersion: 4,
          payload: {
            sheetId: 'sheet-1',
            cells: [
              {
                rowId: 'backend-sparse',
                columnName: 'ColumnA',
                value: 'remote',
                cellRef: 'A11',
                row: 10,
                col: 0
              }
            ]
          }
        }
      ],
      4,
      'sheet-1'
    )

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(10, 0, 'remote', 'backend-sparse')
    expect(applyRemoteCellUpdate).not.toHaveBeenCalledWith(3, 0, expect.anything(), expect.anything())
  })

  it('replayDeltaChanges maps row identity through _gridRowIndex when cellRef is absent', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [
      { _id: 'row-0', _rowUuid: 'row-0', _gridRowIndex: 0, ColumnA: 'a' },
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 1, ColumnA: 'b' },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'c' },
      { _id: 'row-sparse', _rowUuid: 'backend-sparse', _gridRowIndex: 10, ColumnA: 'old' }
    ]
    const applyRemoteCellUpdate = jest.fn()
    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData: jest.fn(),
      applyRemoteCellUpdate
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'set_cell',
          appliedVersion: 5,
          payload: {
            sheetId: 'sheet-1',
            rowId: 'backend-sparse',
            columnName: 'ColumnA',
            value: 'remote'
          }
        }
      ],
      5,
      'sheet-1'
    )

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(10, 0, 'remote', 'backend-sparse')
  })

  it('replays inactive-sheet set_style deltas to the target worksheet and sheet version', () => {
    const applyRemoteCellUpdate = jest.fn()
    const onSheetVersionUpdate = jest.fn()
    const callbacks = makeCallbacks({
      getActiveSheetId: () => 'sheet-1',
      applyRemoteCellUpdate,
      onSheetVersionUpdate
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.replayDeltaChanges(
      [
        {
          operationType: 'set_style',
          appliedVersion: 8,
          payload: {
            sheetId: 'sheet-2',
            styles: { 'style-2': { bg: { rgb: '#0000ff' } } },
            cells: [{ row: 1, col: 2, cellRef: 'C2', stylePatch: { set: { s: 'style-2' } } }]
          }
        }
      ],
      8,
      'sheet-2'
    )

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      1,
      2,
      undefined,
      undefined,
      expect.objectContaining({
        diagnosticOperationType: 'set_style',
        targetSheetId: 'sheet-2',
        stylePatch: { set: { s: 'style-2' } },
        univerStyles: { 'style-2': { bg: { rgb: '#0000ff' } } }
      })
    )
    expect(onSheetVersionUpdate).toHaveBeenCalledWith('sheet-2', 8)
  })

  it('handleOperation cells_changed uses visible column index when leading column is hidden', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const columns: SpreadsheetColumn[] = [
      col({ id: 'hidden', name: 'Hidden', isVisible: false, order: 0 }),
      col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 1 }),
      col({ id: 'col-b', name: 'ColumnB', isVisible: true, order: 2 })
    ]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'a', ColumnB: 1 }]
    const commitLocalSheetData = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({
      ok: true as const,
      appliedCellCount: 1,
      appliedOperationCount: 1
    }))

    const callbacks = makeCommittedReplayCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      runRemoteTransaction
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(2)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [{ rowId: 'row-0', column: 'col-b', value: 99 }]
        }
      },
      version: 3,
      timestamp: Date.now()
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('ignores legacy dimension_sync P2P (dimensions use batch_operations only)', () => {
    const applyRemoteDimensions = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()
    const callbacks = makeCallbacks({
      applyRemoteDimensions,
      scheduleRemoteStructuralResync
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'dimension_sync',
        broadcastOnly: true,
        data: {
          sheetId: 'sheet-1',
          defaultColWidth: 88,
          defaultRowHeight: 24,
          columnData: { 2: { w: 180 } },
          rowData: {}
        }
      },
      timestamp: Date.now()
    })

    expect(applyRemoteDimensions).not.toHaveBeenCalled()
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
  })

  it('requests catch-up instead of applying an incoming operation when a version gap is detected', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const requestSheetCatchUp = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      requestSheetCatchUp
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(1)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [{ rowId: 'row-0', column: 'ColumnA', value: 'new' }]
        }
      },
      version: 3,
      timestamp: Date.now()
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'version_gap', {
      sinceVersion: 1,
      incomingVersion: 3
    })
    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
  })

  it('routes sheet_created broadcasts to workbook structure refresh callback', () => {
    const onWorkbookStructureChange = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()

    const callbacks = makeCallbacks({
      onWorkbookStructureChange,
      scheduleRemoteStructuralResync
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'sheet_created',
        data: {
          sheetId: 'sheet-2',
          sheet: { id: 'sheet-2', name: 'Sheet 2' }
        }
      },
      timestamp: Date.now()
    })

    expect(onWorkbookStructureChange).toHaveBeenCalledWith({
      type: 'sheet_created',
      sheetId: 'sheet-2',
      sheet: { id: 'sheet-2', name: 'Sheet 2' }
    })
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
  })

  it('routes sheet_created broadcasts even when the new sheet version matches the default known version', () => {
    const onWorkbookStructureChange = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: sheetId => (sheetId === 'sheet-2' ? 0 : 0),
      onWorkbookStructureChange
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'sheet_created',
        data: {
          sheetId: 'sheet-2',
          sheet: { id: 'sheet-2', name: 'Sheet 2' }
        }
      },
      version: 0,
      timestamp: Date.now()
    })

    expect(onWorkbookStructureChange).toHaveBeenCalledWith({
      type: 'sheet_created',
      sheetId: 'sheet-2',
      sheet: { id: 'sheet-2', name: 'Sheet 2' }
    })
  })

  it('routes sheet rename and delete broadcasts to workbook structure refresh callback', () => {
    const onWorkbookStructureChange = jest.fn()
    const callbacks = makeCallbacks({ onWorkbookStructureChange })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'sheet_renamed',
        data: {
          sheetId: 'sheet-2',
          sheet: { id: 'sheet-2', name: 'Renamed' }
        }
      },
      timestamp: Date.now()
    })
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'sheet_deleted',
        data: { sheetId: 'sheet-2' }
      },
      timestamp: Date.now()
    })

    expect(onWorkbookStructureChange).toHaveBeenNthCalledWith(1, {
      type: 'sheet_renamed',
      sheetId: 'sheet-2',
      sheet: { id: 'sheet-2', name: 'Renamed' }
    })
    expect(onWorkbookStructureChange).toHaveBeenNthCalledWith(2, {
      type: 'sheet_deleted',
      sheetId: 'sheet-2',
      sheet: undefined
    })
  })

  it('uses the active sheet version instead of a global max when receiving same-sheet edits', () => {
    const data: Record<string, unknown>[] = [{ _id: 'row-b-1', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getActiveSheetId: () => 'sheet-b',
      getSheetVersion: sheetId => (sheetId === 'sheet-b' ? 0 : 52),
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(52)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-b',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-b',
                cells: [{ rowId: 'row-b-1', columnName: 'ColumnA', value: 'new' }]
              }
            }
          ]
        },
        broadcastOnly: true
      },
      version: 1,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [{ _id: 'row-b-1', ColumnA: 'new', _updatedAt: expect.any(String) }],
      { persisted: true, syncGrid: false }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'new', 'row-b-1')
  })

  it('applies inactive-sheet batch values to the target worksheet and marks materialization', () => {
    const dataBySheet: Record<string, Record<string, unknown>[]> = {
      'sheet-1': [{ _id: 'active-row', ColumnA: 'active' }],
      'sheet-2': [{ _id: 'row-b-1', ColumnA: 'old' }]
    }
    const commitSheetData = jest.fn((sheetId: string, rows: Record<string, unknown>[]) => {
      dataBySheet[sheetId] = rows
    })
    const applyRemoteCellUpdate = jest.fn()
    const markSheetNeedsGridMaterialization = jest.fn()

    const callbacks = makeCallbacks({
      getActiveSheetId: () => 'sheet-1',
      getSheetVersion: sheetId => (sheetId === 'sheet-2' ? 0 : 10),
      getColumnsForSheet: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getSheetData: sheetId => dataBySheet[sheetId] ?? [],
      getLocalSheetData: () => dataBySheet['sheet-1'],
      commitSheetData,
      applyRemoteCellUpdate,
      markSheetNeedsGridMaterialization
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(10)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'set_cell',
              data: {
                sheetId: 'sheet-2',
                rowId: 'row-b-1',
                columnName: 'ColumnA',
                value: 'new inactive value'
              }
            }
          ]
        },
        broadcastOnly: true
      },
      version: 1,
      timestamp: Date.now()
    })

    expect(commitSheetData).toHaveBeenCalledWith(
      'sheet-2',
      [expect.objectContaining({ _id: 'row-b-1', ColumnA: 'new inactive value' })],
      { persisted: true, syncGrid: false }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      'new inactive value',
      'row-b-1',
      expect.objectContaining({ targetSheetId: 'sheet-2' })
    )
    expect(markSheetNeedsGridMaterialization).toHaveBeenCalledWith('sheet-2', expect.any(String))
  })

  it('handleOperation cells_changed matches row when wire rowId is backend UUID on id, not on _id', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const backendUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'client-temp-row', id: backendUuid, ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({
      ok: true as const,
      appliedCellCount: 1,
      appliedOperationCount: 1
    }))

    const callbacks = makeCommittedReplayCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      runRemoteTransaction
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(1)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [{ rowId: backendUuid, column: 'ColumnA', value: 'new' }]
        }
      },
      version: 2,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(runRemoteTransaction).toHaveBeenCalled()
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('handleOperation cells_changed uses cellRef (A1) for grid apply when present', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
    const runRemoteTransaction = jest.fn(() => ({
      ok: true as const,
      appliedCellCount: 1,
      appliedOperationCount: 1
    }))

    const callbacks = makeCommittedReplayCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData: jest.fn(),
      runRemoteTransaction
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(0)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [
            {
              rowId: 'row-0',
              column: 'ColumnA',
              value: 'typed',
              cellRef: 'B43'
            }
          ]
        }
      },
      version: 1,
      timestamp: Date.now()
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('applies style-only cells_changed from another tab of the same user', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setCurrentUserId('same-user')

    manager.handleOperation({
      userId: 'same-user',
      userName: 'Same User Other Tab',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [
            {
              rowId: 'row-0',
              column: 'ColumnA',
              cellRef: 'A1',
              univerCell: { s: 'style-1' },
              univerStyles: {
                'style-1': { bd: { t: { s: 1, cl: { rgb: '#111111' } } } }
              }
            }
          ]
        },
        broadcastOnly: true
      },
      version: 2,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      undefined,
      'row-0',
      expect.objectContaining({
        univerCell: { s: 'style-1' },
        univerStyles: {
          'style-1': { bd: { t: { s: 1, cl: { rgb: '#111111' } } } }
        }
      })
    )
  })

  it('ignores its own broadcast-only style echo when the client op id matches', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const emitOperation = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setEmitFunctions(emitOperation, jest.fn())
    manager.setConnectionState(true, true)

    manager.emitOperation({
      type: 'cells_changed',
      data: {
        sheetId: 'sheet-1',
        cells: [
          {
            rowId: 'row-0',
            column: 'ColumnA',
            cellRef: 'A1',
            univerCell: { s: 'style-self' },
            univerStyles: { 'style-self': { bl: 1 } }
          }
        ]
      },
      broadcastOnly: true
    } as never)

    expect(emitOperation).not.toHaveBeenCalled()
  })

  it('live-applies off-sheet style-only cells_changed to the target worksheet', () => {
    let activeSheetId = 'sheet-1'
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getActiveSheetId: () => activeSheetId,
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-2',
          cells: [
            {
              rowId: 'row-0',
              column: 'ColumnA',
              cellRef: 'A1',
              univerCell: { s: 'style-2' },
              univerStyles: {
                'style-2': { bl: 1 }
              }
            }
          ]
        },
        broadcastOnly: true
      },
      version: 9,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      undefined,
      'row-0',
      expect.objectContaining({
        targetSheetId: 'sheet-2',
        univerCell: { s: 'style-2' },
        univerStyles: { 'style-2': { bl: 1 } }
      })
    )

    activeSheetId = 'sheet-2'
    manager.flushDeferredCellsChangedForSheet('sheet-2')

    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledTimes(1)
  })

  it('handleOperation batch_operations applies persisted set_range changes', () => {
    const columns: SpreadsheetColumn[] = [
      col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 }),
      col({ id: 'col-b', name: 'ColumnB', isVisible: true, order: 1 })
    ]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', _rowUuid: 'backend-row-1', ColumnA: 'old', ColumnB: 1 }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-1',
                cells: [
                  { rowId: 'backend-row-1', columnName: 'ColumnA', value: 'new-a' },
                  { rowId: 'backend-row-1', columnName: 'ColumnB', value: 42 }
                ]
              }
            }
          ]
        }
      },
      version: 5,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'new-a', 'backend-row-1')
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 1, 42, 'backend-row-1')
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(5)
  })

  it('applies same-version batch_operations when version state was already advanced', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', _rowUuid: 'backend-row-1', ColumnA: 'old' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      getSheetVersion: () => 5,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      onDiagnosticsTraceEvent
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-1',
                cells: [{ rowId: 'backend-row-1', columnName: 'ColumnA', value: 'first-edit' }]
              }
            }
          ]
        }
      },
      version: 5,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'first-edit', 'backend-row-1')
    expect(onDiagnosticsTraceEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_collab_receive_skipped',
        payload: expect.objectContaining({ reason: 'stale_version' })
      })
    )
  })

  it('treats set_range cells without a value as clear operations', () => {
    const columns: SpreadsheetColumn[] = [
      col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 }),
      col({ id: 'col-b', name: 'ColumnB', isVisible: true, order: 1 })
    ]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', _rowUuid: 'backend-row-1', ColumnA: 'old', ColumnB: 1 }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-1',
                cells: [{ rowId: 'backend-row-1', columnName: 'ColumnA' }]
              }
            }
          ]
        }
      },
      version: 5,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, null, 'backend-row-1')
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(5)
  })

  it('does not apply peer set_range to a client_* row by visual slot when durable rowId is unknown (p4-durable-rowid-only)', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const commitSheetData = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const callbacks = makeCallbacks({
      getActiveSheetId: () => 'sheet-1',
      getColumnsForSheet: () => columns,
      getSheetData: sheetId =>
        sheetId === 'sheet-2' ? [{ _id: 'client_sheet-2_0', _gridRowIndex: 0, ColumnA: 'local' }] : [],
      commitSheetData,
      requestSheetCatchUp
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-2',
                cells: [{ rowId: 'backend-row-1', columnName: 'ColumnA', value: 'peer' }]
              }
            }
          ]
        }
      },
      version: 7,
      timestamp: Date.now()
    })
    expect(commitSheetData).not.toHaveBeenCalled()
    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-2', 'row_identity_mismatch', {
      sinceVersion: 0,
      incomingVersion: 7
    })
  })

  it('requests inactive-sheet catch-up instead of materializing persisted set_range rows that cannot be matched locally', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const commitSheetData = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()

    const callbacks = makeCallbacks({
      getActiveSheetId: () => 'sheet-1',
      getColumnsForSheet: () => columns,
      getSheetData: sheetId => (sheetId === 'sheet-2' ? [{ _id: 'client_sheet-2_0', ColumnA: 'stale' }] : []),
      commitSheetData,
      scheduleRemoteStructuralResync,
      requestSheetCatchUp,
      onDiagnosticsTraceEvent
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-2',
                cells: [{ rowId: 'backend-row-1', columnName: 'ColumnA', value: 'fresh' }]
              }
            }
          ]
        }
      },
      version: 6,
      timestamp: Date.now()
    })

    expect(commitSheetData).not.toHaveBeenCalled()
    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-2', 'row_identity_mismatch', {
      sinceVersion: 0,
      incomingVersion: 6
    })
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_collab_value_apply_incomplete',
        severity: 'warning'
      })
    )
  })

  it('requests immediate active-sheet resync when a persisted value update has unknown row identity', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'client_sheet-1_0', ColumnA: '1' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const scheduleRemoteStructuralResync = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      scheduleRemoteStructuralResync
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-1',
                cells: [{ rowId: 'backend-row-1', columnName: 'ColumnA', value: '2' }]
              }
            }
          ]
        }
      },
      version: 6,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(scheduleRemoteStructuralResync).toHaveBeenCalledWith('sheet-1', { immediate: true })
  })

  it('handleOperation row_update applies row payload without cells_changed echo', () => {
    const columns: SpreadsheetColumn[] = [
      col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 }),
      col({ id: 'col-b', name: 'ColumnB', isVisible: true, order: 1 })
    ]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', _rowUuid: 'backend-row-1', ColumnA: 'old', ColumnB: 1 }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'row_update',
        data: {
          sheetId: 'sheet-1',
          rowId: 'backend-row-1',
          rowData: {
            ColumnA: 'updated',
            ColumnB: 7
          }
        }
      },
      version: 6,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'updated', 'backend-row-1')
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 1, 7, 'backend-row-1')
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(6)
  })

  it('applies authoritative batch updates from another tab of the same user', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-e', name: 'ColumnE', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [
      { _id: 'row-28', _rowUuid: 'backend-row-28', ColumnE: 'keep' },
      { _id: 'row-29', _rowUuid: 'backend-row-29', ColumnE: 'remove-1' },
      { _id: 'row-30', _rowUuid: 'backend-row-30', ColumnE: 'remove-2' }
    ]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setCurrentUserId('same-user')

    manager.handleOperation({
      userId: 'same-user',
      userName: 'Same User Other Tab',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'clear_cell',
              data: { sheetId: 'sheet-1', rowId: 'backend-row-29', columnName: 'ColumnE' }
            },
            {
              type: 'clear_cell',
              data: { sheetId: 'sheet-1', rowId: 'backend-row-30', columnName: 'ColumnE' }
            }
          ]
        }
      },
      version: 7,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(1, 0, null, 'backend-row-29')
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(2, 0, null, 'backend-row-30')
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(7)
  })

  it('does not drop same-user authoritative batches when the server omits the top-level version', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-e', name: 'ColumnE', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-28', _rowUuid: 'backend-row-28', ColumnE: 'before' }]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setCurrentUserId('same-user')

    manager.handleOperation({
      userId: 'same-user',
      userName: 'Same User Other Tab',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_cell',
              data: { sheetId: 'sheet-1', rowId: 'backend-row-28', columnName: 'ColumnE', value: 'after' }
            }
          ]
        }
      },
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, 'after', 'backend-row-28')
  })

  it('applies inactive-sheet authoritative batches into sheet cache state and version update', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const onSheetVersionUpdate = jest.fn()
    const commitSheetData = jest.fn()
    const inactiveColumns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const inactiveRows: Record<string, unknown>[] = [{ _id: 'row-1', _rowUuid: 'backend-row-1', ColumnA: 'before' }]
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      onSheetVersionUpdate,
      getColumnsForSheet: sheetId => (sheetId === 'sheet-2' ? inactiveColumns : []),
      getSheetData: sheetId => (sheetId === 'sheet-2' ? inactiveRows : []),
      commitSheetData
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'set_cell',
              data: { sheetId: 'sheet-2', rowId: 'backend-row-1', columnName: 'ColumnA', value: 'remote' }
            }
          ]
        }
      },
      version: 11,
      timestamp: Date.now()
    })

    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(commitSheetData).toHaveBeenCalledWith(
      'sheet-2',
      [{ _id: 'row-1', _rowUuid: 'backend-row-1', ColumnA: 'remote', _updatedAt: expect.any(String) }],
      { persisted: true, syncGrid: false }
    )
    expect(onSheetVersionUpdate).toHaveBeenCalledWith('sheet-2', 11)
    expect(callbacks.commitLocalSheetData).not.toHaveBeenCalled()
    expect(callbacks.onVersionUpdate).not.toHaveBeenCalled()
  })

  it('applies batched column_add metadata in one onRemoteColumnUpdate call', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const onRemoteColumnUpdate = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 4 }) as const)
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'col-a', name: 'A', order: 0 }), col({ id: 'col-b', name: 'B', order: 1 })],
      getSheetData: () => [],
      runRemoteTransaction,
      onRemoteColumnUpdate
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-column-adds',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'column_add',
              operationId: 'add-1',
              data: {
                sheetId: 'sheet-1',
                column: col({ id: 'col-c', name: 'C', order: 2 })
              }
            },
            {
              type: 'column_add',
              operationId: 'add-2',
              data: {
                sheetId: 'sheet-1',
                column: col({ id: 'col-d', name: 'D', order: 3 })
              }
            }
          ]
        }
      }
    })

    expect(onRemoteColumnUpdate).toHaveBeenCalledTimes(1)
    expect(onRemoteColumnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-1',
        columns: [
          expect.objectContaining({ id: 'col-a' }),
          expect.objectContaining({ id: 'col-b' }),
          expect.objectContaining({ id: 'col-c' }),
          expect.objectContaining({ id: 'col-d' })
        ]
      })
    )
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('applies active-sheet column_add with live grid insert instead of snapshot resync', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const onRemoteColumnUpdate = jest.fn()
    const applyRemoteInsertColumnSlots = jest.fn(() => true)
    const forceGridReapply = jest.fn()
    const onSheetVersionUpdate = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      onRemoteColumnUpdate,
      applyRemoteInsertColumnSlots,
      forceGridReapply,
      onSheetVersionUpdate,
      getActiveSheetId: () => 'sheet-2',
      getColumns: () => [
        col({ id: 'col-a', name: 'ColumnA', order: 0 }),
        col({ id: 'col-b', name: 'ColumnB', order: 1 }),
        col({ id: 'col-c', name: 'ColumnC', order: 2 }),
        col({ id: 'col-new', name: 'ColumnD', order: 3, isVisible: true })
      ],
      getSheetData: () => [{ _id: 'row-1', ColumnA: 'a', ColumnB: 'b', ColumnC: 'c', ColumnD: '' }]
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'column_add',
              data: {
                sheetId: 'sheet-2',
                column: { id: 'col-new', name: 'ColumnD', order: 3, isVisible: true }
              }
            }
          ]
        }
      },
      version: 12,
      timestamp: Date.now()
    })

    expect(onRemoteColumnUpdate).toHaveBeenCalled()
    return Promise.resolve().then(() => {
      expect(applyRemoteInsertColumnSlots).toHaveBeenCalledWith(
        expect.objectContaining({
          sheetId: 'sheet-2',
          startGridColumnIndex: 3,
          count: 1
        })
      )
      expect(forceGridReapply).not.toHaveBeenCalled()
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
      expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(12)
      expect(onSheetVersionUpdate).not.toHaveBeenCalled()
      expect(callbacks.commitLocalSheetData).not.toHaveBeenCalled()
    })
  })

  it('applies column_delete with live grid remove instead of snapshot resync', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const onRemoteColumnUpdate = jest.fn()
    const applyRemoteDeleteColumnSlots = jest.fn(() => true)
    const forceGridReapply = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      onRemoteColumnUpdate,
      applyRemoteDeleteColumnSlots,
      forceGridReapply,
      isRecentLocalBatchId: () => false,
      getActiveSheetId: () => 'sheet-2',
      getColumns: () => [
        col({ id: 'col-a', name: 'ColumnA', order: 0 }),
        col({ id: 'col-b', name: 'ColumnB', order: 1 }),
        col({ id: 'col-c', name: 'ColumnC', order: 2 }),
        col({ id: 'col-d', name: 'ColumnD', order: 3 })
      ],
      getSheetData: () => [{ _id: 'row-1', ColumnA: 'a', ColumnB: 'b', ColumnC: 'c', ColumnD: 'd' }]
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'column_delete',
              data: {
                sheetId: 'sheet-2',
                columnId: 'col-b',
                visibleDeleteIndex: 1,
                deleteCount: 1
              }
            }
          ]
        }
      },
      version: 13,
      timestamp: Date.now()
    })

    expect(onRemoteColumnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-2',
        columns: [
          expect.objectContaining({ id: 'col-a' }),
          expect.objectContaining({ id: 'col-c' }),
          expect.objectContaining({ id: 'col-d' })
        ]
      })
    )
    return Promise.resolve().then(() => {
      expect(applyRemoteDeleteColumnSlots).toHaveBeenCalledWith(
        expect.objectContaining({
          sheetId: 'sheet-2',
          startGridColumnIndex: 1,
          count: 1
        })
      )
      expect(forceGridReapply).not.toHaveBeenCalled()
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    })
  })

  it('defers inactive-sheet structural column batches without touching the active data model', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const onSheetVersionUpdate = jest.fn()
    const commitLocalSheetData = jest.fn()
    const commitSheetData = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      onSheetVersionUpdate,
      commitLocalSheetData,
      commitSheetData,
      getActiveSheetId: () => 'sheet-1'
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'column_add',
              data: {
                sheetId: 'sheet-2',
                column: { id: 'col-new', name: 'ColumnD', order: 3 }
              }
            }
          ]
        }
      },
      version: 12,
      timestamp: Date.now()
    })

    expect(scheduleRemoteStructuralResync).toHaveBeenCalledWith('sheet-2', { immediate: false })
    expect(onSheetVersionUpdate).toHaveBeenCalledWith('sheet-2', 12)
    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(commitSheetData).not.toHaveBeenCalled()
  })

  it('applies full remote columns_reorder payloads with live grid reapply instead of snapshot resync', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const onRemoteColumnUpdate = jest.fn()
    const applyRemoteColumnReorder = jest.fn(() => true)
    const forceGridReapply = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      onRemoteColumnUpdate,
      applyRemoteColumnReorder,
      forceGridReapply,
      getActiveSheetId: () => 'sheet-2'
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'columns_reorder',
              data: {
                sheetId: 'sheet-2',
                columns: [
                  col({ id: 'col-a', name: 'ColumnA', order: 0 }),
                  col({ id: 'col-c', name: 'ColumnC', order: 1 }),
                  col({ id: 'col-b', name: 'ColumnB', order: 2 })
                ]
              }
            }
          ]
        }
      },
      version: 15,
      timestamp: Date.now()
    })

    expect(onRemoteColumnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        sheetId: 'sheet-2',
        columns: [
          expect.objectContaining({ id: 'col-a', order: 0 }),
          expect.objectContaining({ id: 'col-c', order: 1 }),
          expect.objectContaining({ id: 'col-b', order: 2 })
        ]
      })
    )
    return Promise.resolve().then(() => {
      expect(applyRemoteColumnReorder).toHaveBeenCalledWith(
        expect.objectContaining({
          sheetId: 'sheet-2',
          previousColumns: expect.any(Array),
          nextColumns: expect.any(Array)
        })
      )
      expect(forceGridReapply).toHaveBeenCalledWith(
        'sheet-2',
        null,
        expect.objectContaining({
          allowFullGridReapply: true,
          clearAllSignatures: true,
          preferBulk: true
        })
      )
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    })
  })

  it('applies inactive-sheet structural row batches into cache instead of forcing a workbook reload', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const onSheetVersionUpdate = jest.fn()
    const commitSheetData = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      onSheetVersionUpdate,
      getSheetData: sheetId => (sheetId === 'sheet-2' ? [] : []),
      commitSheetData
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'add_rows',
              data: {
                sheetId: 'sheet-2',
                rows: [{ id: 'row-new', data: { ColumnA: 'plain value' } }]
              }
            }
          ]
        }
      },
      version: 13,
      timestamp: Date.now()
    })

    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(commitSheetData).toHaveBeenCalledWith(
      'sheet-2',
      [{ _id: 'row-new', _rowUuid: 'row-new', ColumnA: 'plain value' }],
      { persisted: true, syncGrid: false }
    )
    expect(onSheetVersionUpdate).toHaveBeenCalledWith('sheet-2', 13)
    expect(callbacks.commitLocalSheetData).not.toHaveBeenCalled()
    expect(callbacks.onVersionUpdate).not.toHaveBeenCalled()
  })

  it('applies move_row_slots with live grid reapply instead of snapshot resync', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const forceGridReapply = jest.fn()
    const commitLocalSheetData = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      forceGridReapply,
      getActiveSheetId: () => 'sheet-2',
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getSheetData: sheetId =>
        sheetId === 'sheet-2'
          ? [
              { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'first' },
              { _id: 'row-3', _rowUuid: 'row-3', _gridRowIndex: 3, ColumnA: 'second' }
            ]
          : [],
      commitSheetData: commitLocalSheetData
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'move_row_slots',
              data: {
                sheetId: 'sheet-2',
                sourceStartGridRowIndex: 2,
                destinationGridRowIndex: 10,
                count: 1,
                rowIds: ['row-2']
              }
            }
          ]
        }
      },
      version: 16,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      'sheet-2',
      [
        expect.objectContaining({ _id: 'row-3', _gridRowIndex: 2 }),
        expect.objectContaining({ _id: 'row-2', _gridRowIndex: 9 })
      ],
      { persisted: true, syncGrid: true }
    )
    return Promise.resolve().then(() => {
      expect(forceGridReapply).toHaveBeenCalledWith(
        'sheet-2',
        expect.objectContaining({ minRow: 2, maxRow: 10, minCol: 0, maxCol: 0 }),
        expect.objectContaining({ clearAllSignatures: false, preferBulk: true })
      )
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    })
  })

  it('applies enabled add_rows through deferred runner no-op and structural grid sync', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const scheduleRemoteStructuralResync = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 }) as const)
    const forceGridReapply = jest.fn()
    const commitLocalSheetData = jest.fn()
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getActiveSheetId: () => 'sheet-1',
      getColumns: () => columns,
      getSheetData: () => [],
      commitLocalSheetData,
      commitSheetData: commitLocalSheetData,
      runRemoteTransaction,
      forceGridReapply,
      scheduleRemoteStructuralResync,
      requestSheetCatchUp
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-enabled-add-rows',
          actorId: 'user-2',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          dirtyRegions: [{ type: 'cell', row: 0, col: 0, columnName: 'ColumnA' }],
          operations: [
            {
              type: 'add_rows',
              operationId: 'add-rows-1',
              data: {
                sheetId: 'sheet-1',
                rows: [{ id: 'row-new', data: { ColumnA: 'remote value' } }]
              },
              result: {
                rows: [{ id: 'row-new', data: { ColumnA: 'remote value' } }]
              }
            }
          ]
        }
      }
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    expect(commitLocalSheetData).toHaveBeenCalledWith(
      'sheet-1',
      [expect.objectContaining({ _id: 'row-new', ColumnA: 'remote value' })],
      { persisted: true, syncGrid: true }
    )
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(requestSheetCatchUp).not.toHaveBeenCalled()
    return Promise.resolve().then(() => {
      expect(forceGridReapply).toHaveBeenCalledWith(
        'sheet-1',
        { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 },
        expect.objectContaining({
          clearAllSignatures: false,
          preferBulk: true,
          reason: 'dirty_regions_from_backend_used'
        })
      )
    })
  })

  it('applies enabled move_row_slots with native grid move after session commit', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const commitLocalSheetData = jest.fn()
    const runRemoteTransaction = jest.fn(() => ({ ok: true, appliedCellCount: 0, appliedOperationCount: 1 }) as const)
    const forceGridReapply = jest.fn()
    const applyRemoteRowSlotsMove = jest.fn(() => true)
    const callbacks = makeCallbacks({
      getSheetVersion: () => 1,
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getSheetData: () => [
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'first' },
        { _id: 'row-3', _rowUuid: 'row-3', _gridRowIndex: 3, ColumnA: 'second' }
      ],
      commitLocalSheetData,
      commitSheetData: commitLocalSheetData,
      runRemoteTransaction,
      forceGridReapply,
      applyRemoteRowSlotsMove
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: 2,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          batchId: 'batch-enabled-move-rows',
          baseVersion: 1,
          appliedVersion: 2,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'move_row_slots',
              operationId: 'move-1',
              data: {
                sheetId: 'sheet-1',
                sourceStartGridRowIndex: 2,
                destinationGridRowIndex: 10,
                count: 1,
                rowIds: ['row-2']
              }
            }
          ]
        }
      }
    })

    return Promise.resolve().then(() => {
      expect(commitLocalSheetData).toHaveBeenCalledWith(
        'sheet-1',
        expect.any(Array),
        expect.objectContaining({ persisted: true, syncGrid: false })
      )
      expect(applyRemoteRowSlotsMove).toHaveBeenCalledWith({
        sheetId: 'sheet-1',
        sourceStartGridRowIndex: 2,
        count: 1,
        destinationGridRowIndex: 10
      })
      expect(forceGridReapply).not.toHaveBeenCalled()
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })
  })

  it('relocates relational row values and applies native move_cell_range on the grid', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const forceGridReapply = jest.fn()
    const applyRemoteMoveCellRange = jest.fn(() => true)
    const commitLocalSheetData = jest.fn()
    const columns: SpreadsheetColumn[] = [
      col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 }),
      col({ id: 'col-b', name: 'ColumnB', isVisible: true, order: 1 }),
      col({ id: 'col-c', name: 'ColumnC', isVisible: true, order: 2 })
    ]
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      forceGridReapply,
      applyRemoteMoveCellRange,
      isRecentLocalBatchId: () => false,
      getActiveSheetId: () => 'sheet-2',
      getColumnsForSheet: () => columns,
      getSheetData: sheetId =>
        sheetId === 'sheet-2'
          ? [
              { _id: 'row-0', _rowUuid: 'row-0', _gridRowIndex: 0, ColumnA: 'A0', ColumnB: 'keep' },
              { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 1 },
              { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2 }
            ]
          : [],
      commitSheetData: commitLocalSheetData
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setCurrentUserId('u1')
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'move_cell_range',
              data: {
                sheetId: 'sheet-2',
                fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
                toRange: { startRow: 2, endRow: 2, startColumn: 2, endColumn: 2 }
              }
            }
          ]
        }
      },
      version: 21,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalled()
    const [, committedRows] = commitLocalSheetData.mock.calls[0]
    expect(committedRows[0]).not.toHaveProperty('ColumnA')
    expect(committedRows[0].ColumnB).toBe('keep')
    expect(committedRows[2].ColumnC).toBe('A0')
    expect(commitLocalSheetData).toHaveBeenCalledWith(
      'sheet-2',
      expect.any(Array),
      expect.objectContaining({ persisted: true, syncGrid: false })
    )
    return Promise.resolve().then(() => {
      expect(applyRemoteMoveCellRange).toHaveBeenCalledWith({
        sheetId: 'sheet-2',
        fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
        toRange: { startRow: 2, endRow: 2, startColumn: 2, endColumn: 2 }
      })
      expect(forceGridReapply).toHaveBeenCalledWith(
        'sheet-2',
        expect.objectContaining({ minRow: 0, maxRow: 2, minCol: 0, maxCol: 2 }),
        expect.objectContaining({ clearAllSignatures: false, preferBulk: true })
      )
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    })
  })

  it('reconciles authoritative grid on same-user move_cell_range batch echo without native move', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const forceGridReapply = jest.fn()
    const applyRemoteMoveCellRange = jest.fn(() => true)
    const commitLocalSheetData = jest.fn()
    const columns: SpreadsheetColumn[] = [
      col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 }),
      col({ id: 'col-b', name: 'ColumnB', isVisible: true, order: 1 })
    ]
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      forceGridReapply,
      applyRemoteMoveCellRange,
      getActiveSheetId: () => 'sheet-2',
      getColumnsForSheet: () => columns,
      getSheetData: () => [{ _id: 'row-0', _rowUuid: 'row-0', _gridRowIndex: 0, ColumnA: 'A0' }],
      commitSheetData: commitLocalSheetData
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setCurrentUserId('u1')
    manager.handleOperation({
      userId: 'u1',
      userName: 'Self',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'move_cell_range',
              data: {
                sheetId: 'sheet-2',
                fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
                toRange: { startRow: 0, endRow: 0, startColumn: 1, endColumn: 1 }
              }
            }
          ]
        }
      },
      version: 22,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      'sheet-2',
      expect.any(Array),
      expect.objectContaining({ persisted: true, syncGrid: false })
    )
    return Promise.resolve().then(() => {
      expect(applyRemoteMoveCellRange).not.toHaveBeenCalled()
      expect(forceGridReapply).toHaveBeenCalledWith(
        'sheet-2',
        expect.objectContaining({ minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 }),
        expect.objectContaining({ clearAllSignatures: true, preferBulk: true })
      )
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    })
  })

  it('enriches set_range in the same committed batch after insert_row_slots using projected rows', () => {
    localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
    const runRemoteTransaction = jest.fn(
      (plan: { batch: { operations: Array<{ type: string; data: Record<string, unknown> }> } }) => {
        const setRange = plan.batch.operations.find(operation => operation.type === 'set_range')
        const cells = Array.isArray(setRange?.data.cells)
          ? (setRange?.data.cells as Array<Record<string, unknown>>)
          : []
        expect(cells).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rowId: 'row-new',
              columnName: 'ColumnA',
              value: 'typed',
              row: 2,
              col: 0
            })
          ])
        )
        return { ok: true, appliedCellCount: 1, appliedOperationCount: 2 } as const
      }
    )
    const callbacks = makeCallbacks({
      getSheetVersion: () => 15,
      getActiveSheetId: () => 'sheet-2',
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getSheetData: () => [
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'first' },
        { _id: 'row-3', _rowUuid: 'row-3', _gridRowIndex: 3, ColumnA: 'second' }
      ],
      runRemoteTransaction,
      applyRemoteInsertRowSlots: jest.fn(() => true),
      isRecentLocalBatchId: () => false
    })
    const manager = new SpreadsheetCollaborationManager(callbacks)

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          baseVersion: 15,
          appliedVersion: 16,
          payloadSchemaVersion: 1,
          operations: [
            {
              type: 'insert_row_slots',
              data: {
                sheetId: 'sheet-2',
                startGridRowIndex: 2,
                count: 1,
                rows: [{ id: 'row-new', data: { _gridRowIndex: 2, ColumnA: '' } }]
              }
            },
            {
              type: 'set_range',
              data: {
                cells: [{ rowId: 'row-new', columnName: 'ColumnA', value: 'typed' }]
              }
            }
          ]
        }
      },
      version: 16,
      timestamp: Date.now()
    })

    expect(runRemoteTransaction).toHaveBeenCalled()
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
  })

  it('applies insert_row_slots with native grid insert instead of snapshot resync', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const forceGridReapply = jest.fn()
    const applyRemoteInsertRowSlots = jest.fn(() => true)
    const commitLocalSheetData = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      forceGridReapply,
      applyRemoteInsertRowSlots,
      isRecentLocalBatchId: () => false,
      getActiveSheetId: () => 'sheet-2',
      getSheetData: sheetId =>
        sheetId === 'sheet-2'
          ? [
              { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, ColumnA: 'first' },
              { _id: 'row-3', _rowUuid: 'row-3', _gridRowIndex: 3, ColumnA: 'second' }
            ]
          : [],
      commitSheetData: commitLocalSheetData
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'insert_row_slots',
              data: {
                sheetId: 'sheet-2',
                startGridRowIndex: 2,
                count: 1,
                rows: [{ id: 'row-new', data: { _gridRowIndex: 2, ColumnA: '' } }]
              }
            }
          ]
        }
      },
      version: 16,
      timestamp: Date.now()
    })

    return Promise.resolve().then(() => {
      expect(commitLocalSheetData).toHaveBeenCalledWith(
        'sheet-2',
        expect.any(Array),
        expect.objectContaining({ persisted: true, syncGrid: false })
      )
      expect(applyRemoteInsertRowSlots).toHaveBeenCalledWith({
        sheetId: 'sheet-2',
        startGridRowIndex: 2,
        count: 1
      })
      expect(forceGridReapply).not.toHaveBeenCalled()
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    })
  })

  it('applies delete_row_slots with native grid remove instead of snapshot resync', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const forceGridReapply = jest.fn()
    const applyRemoteDeleteRowSlots = jest.fn(() => true)
    const commitLocalSheetData = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      forceGridReapply,
      applyRemoteDeleteRowSlots,
      isRecentLocalBatchId: () => false,
      getActiveSheetId: () => 'sheet-2',
      getSheetData: sheetId =>
        sheetId === 'sheet-2'
          ? [
              { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'keep' },
              { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'gone' },
              { _id: 'row-3', _rowUuid: 'row-3', _gridRowIndex: 2, ColumnA: 'after' }
            ]
          : [],
      commitSheetData: commitLocalSheetData
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          operations: [
            {
              type: 'delete_row_slots',
              data: {
                sheetId: 'sheet-2',
                startGridRowIndex: 1,
                count: 1,
                rowIds: ['row-2']
              }
            }
          ]
        }
      },
      version: 17,
      timestamp: Date.now()
    })

    return Promise.resolve().then(() => {
      expect(commitLocalSheetData).toHaveBeenCalledWith(
        'sheet-2',
        expect.arrayContaining([expect.objectContaining({ _id: 'row-1' }), expect.objectContaining({ _id: 'row-3' })]),
        expect.objectContaining({ persisted: true, syncGrid: false })
      )
      expect(commitLocalSheetData.mock.calls[0][1]).toHaveLength(2)
      expect(applyRemoteDeleteRowSlots).toHaveBeenCalledWith({
        sheetId: 'sheet-2',
        startGridRowIndex: 1,
        count: 1
      })
      expect(forceGridReapply).not.toHaveBeenCalled()
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    })
  })

  it('applies active-sheet row_add placeholders so later cell updates can target the new row', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const commitLocalSheetData = jest.fn()
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      getLocalSheetData: () => [{ _id: 'row-1', ColumnA: 'existing' }],
      commitLocalSheetData
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'row_add',
              data: {
                sheetId: 'sheet-1',
                rowIds: ['row-new']
              }
            }
          ]
        }
      },
      version: 14,
      timestamp: Date.now()
    })

    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [
        { _id: 'row-1', ColumnA: 'existing' },
        { _id: 'row-new', _rowUuid: 'row-new' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(14)
  })

  it('paints active-sheet add_rows values into the grid immediately', () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const forceGridReapply = jest.fn()
    let rows: Record<string, unknown>[] = [{ _id: 'row-1', ColumnA: 'existing' }]
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate,
      forceGridReapply
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'add_rows',
              data: {
                sheetId: 'sheet-1',
                rows: [{ id: 'backend-row-new', data: { _clientRowId: 'client-row-new', ColumnA: 'plain value' } }]
              }
            }
          ]
        }
      },
      version: 15,
      timestamp: Date.now()
    })

    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [
        { _id: 'row-1', ColumnA: 'existing' },
        { _clientRowId: 'client-row-new', ColumnA: 'plain value', _id: 'backend-row-new', _rowUuid: 'backend-row-new' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      1,
      0,
      'plain value',
      'backend-row-new',
      expect.objectContaining({ useSenderA1Row: true })
    )
    expect(forceGridReapply).toHaveBeenCalledWith(
      'sheet-1',
      { minRow: 1, maxRow: 1, minCol: 0, maxCol: 0 },
      expect.objectContaining({ clearAllSignatures: false, preferBulk: true })
    )
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(15)
  })

  it('applies active-sheet insert_rows_at at the requested index', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const forceGridReapply = jest.fn()
    let rows: Record<string, unknown>[] = [
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
    ]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate,
      forceGridReapply
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'insert_rows_at',
              data: {
                sheetId: 'sheet-1',
                insertAt: 1,
                rows: [
                  {
                    id: 'backend-row-new',
                    data: { _clientRowId: 'client-row-new', _gridRowIndex: 1, ColumnA: 'plain value' }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 17,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [
        { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
        {
          _clientRowId: 'client-row-new',
          _gridRowIndex: 1,
          ColumnA: 'plain value',
          _id: 'backend-row-new',
          _rowUuid: 'backend-row-new'
        },
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      1,
      0,
      'plain value',
      'backend-row-new',
      expect.objectContaining({ useSenderA1Row: true })
    )
    expect(forceGridReapply).toHaveBeenCalledWith(
      'sheet-1',
      { minRow: 1, maxRow: 2, minCol: 0, maxCol: 0 },
      expect.objectContaining({ clearAllSignatures: false, preferBulk: true })
    )
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(17)
  })

  it('keeps immediate cell edits attached to the inserted peer row', () => {
    const commitLocalSheetData = jest.fn()
    let rows: Record<string, unknown>[] = [
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
    ]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate: jest.fn(),
      forceGridReapply: jest.fn()
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'insert_rows_at',
              data: {
                sheetId: 'sheet-1',
                insertAt: 1,
                rows: [{ id: 'backend-row-new', data: { _clientRowId: 'client-row-new', _gridRowIndex: 1 } }]
              }
            }
          ]
        }
      },
      version: 18,
      timestamp: Date.now()
    })

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'set_cell',
        data: {
          sheetId: 'sheet-1',
          rowId: 'backend-row-new',
          columnName: 'ColumnA',
          value: 'edited immediately'
        }
      },
      version: 19,
      timestamp: Date.now()
    })

    expect(rows).toEqual([
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
      expect.objectContaining({
        _id: 'backend-row-new',
        _rowUuid: 'backend-row-new',
        _clientRowId: 'client-row-new',
        _gridRowIndex: 1,
        ColumnA: 'edited immediately'
      }),
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
    ])
    expect(commitLocalSheetData).toHaveBeenNthCalledWith(
      2,
      [
        { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
        expect.objectContaining({
          _id: 'backend-row-new',
          _rowUuid: 'backend-row-new',
          _clientRowId: 'client-row-new',
          _gridRowIndex: 1,
          ColumnA: 'edited immediately'
        }),
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
      ],
      { persisted: true, syncGrid: false }
    )
  })

  it('canonicalizes a permuted receiver baseline before applying insert_rows_at', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const forceGridReapply = jest.fn()
    let rows: Record<string, unknown>[] = [
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' },
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' }
    ]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate,
      forceGridReapply
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'insert_rows_at',
              data: {
                sheetId: 'sheet-1',
                insertAt: 1,
                rows: [
                  {
                    id: 'backend-row-new',
                    data: { _clientRowId: 'client-row-new', _gridRowIndex: 1, ColumnA: 'plain value' }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 17,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [
        { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
        {
          _clientRowId: 'client-row-new',
          _gridRowIndex: 1,
          ColumnA: 'plain value',
          _id: 'backend-row-new',
          _rowUuid: 'backend-row-new'
        },
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      1,
      0,
      'plain value',
      'backend-row-new',
      expect.objectContaining({ useSenderA1Row: true })
    )
    expect(forceGridReapply).toHaveBeenCalledWith(
      'sheet-1',
      { minRow: 1, maxRow: 2, minCol: 0, maxCol: 0 },
      expect.objectContaining({ clearAllSignatures: false, preferBulk: true })
    )
  })

  it('keeps follow-up edits on the inserted row even when the receiver baseline started permuted', () => {
    const commitLocalSheetData = jest.fn()
    let rows: Record<string, unknown>[] = [
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' },
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' }
    ]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate: jest.fn(),
      forceGridReapply: jest.fn()
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'insert_rows_at',
              data: {
                sheetId: 'sheet-1',
                insertAt: 1,
                rows: [{ id: 'backend-row-new', data: { _clientRowId: 'client-row-new', _gridRowIndex: 1 } }]
              }
            }
          ]
        }
      },
      version: 18,
      timestamp: Date.now()
    })

    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'set_cell',
        data: {
          sheetId: 'sheet-1',
          rowId: 'backend-row-new',
          columnName: 'ColumnA',
          value: 'edited immediately'
        }
      },
      version: 19,
      timestamp: Date.now()
    })

    expect(rows).toEqual([
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
      expect.objectContaining({
        _id: 'backend-row-new',
        _rowUuid: 'backend-row-new',
        _clientRowId: 'client-row-new',
        _gridRowIndex: 1,
        ColumnA: 'edited immediately'
      }),
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
    ])
    expect(commitLocalSheetData).toHaveBeenNthCalledWith(
      2,
      [
        { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
        expect.objectContaining({
          _id: 'backend-row-new',
          _rowUuid: 'backend-row-new',
          _clientRowId: 'client-row-new',
          _gridRowIndex: 1,
          ColumnA: 'edited immediately'
        }),
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
      ],
      { persisted: true, syncGrid: false }
    )
  })

  it('routes large active-sheet add_rows through a single bulk grid apply without duplicate forceGridReapply', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const applyRemoteCellUpdatesBulk = jest.fn()
    const forceGridReapply = jest.fn()
    let rows: Record<string, unknown>[] = [{ _id: 'row-1', ColumnA: 'existing' }]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      applyRemoteCellUpdate,
      applyRemoteCellUpdatesBulk,
      forceGridReapply
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          batchId: 'large-add-rows',
          traceSessionId: 'trace-session',
          traceId: 'trace-id',
          operations: [
            {
              type: 'add_rows',
              data: {
                sheetId: 'sheet-1',
                rows: Array.from({ length: 501 }, (_, index) => ({
                  id: `backend-row-${index}`,
                  data: { _clientRowId: `client-row-${index}`, ColumnA: `value ${index}` }
                }))
              }
            }
          ]
        }
      },
      version: 16,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ ColumnA: 'value 0' })]),
      {
        persisted: true,
        syncGrid: true
      }
    )
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ rowIndex: 1, colIndex: 0 })]),
      expect.objectContaining({ operationType: 'add_rows_replay' })
    )
    // Phase 1: `add_rows_replay` bulk already painted the created rows; the forced authoritative
    // reapply must be skipped so we do not re-write the same cells (forced reapply ignores
    // signature equality and was the main duplicate-work source on large auto-add deltas).
    expect(forceGridReapply).not.toHaveBeenCalled()
  })

  it('hydrates legacy row_add broadcasts from the delta log when only row ids are broadcast', async () => {
    const scheduleRemoteStructuralResync = jest.fn()
    const commitLocalSheetData = jest.fn()
    const fetchChangesSince = jest.fn().mockResolvedValue({
      currentVersion: 14,
      requiresSnapshot: false,
      changes: [
        {
          operationType: 'add_rows',
          payload: { rows: [{ _clientRowId: 'client-row-new', ColumnA: 'plain value' }] },
          result: {
            rows: [{ id: 'backend-row-new', data: { _clientRowId: 'client-row-new', ColumnA: 'plain value' } }]
          },
          appliedVersion: 14
        }
      ]
    })
    let rows: Record<string, unknown>[] = [{ _id: 'row-1', ColumnA: 'existing' }]
    const callbacks = makeCallbacks({
      scheduleRemoteStructuralResync,
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      fetchChangesSince
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'row_add',
              data: {
                sheetId: 'sheet-1',
                rowIds: ['backend-row-new']
              }
            }
          ]
        }
      },
      version: 14,
      timestamp: Date.now()
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchChangesSince).toHaveBeenCalledWith('sheet-1', 13)
    expect(commitLocalSheetData).toHaveBeenLastCalledWith(
      [
        { _id: 'row-1', ColumnA: 'existing' },
        { _clientRowId: 'client-row-new', ColumnA: 'plain value', _id: 'backend-row-new', _rowUuid: 'backend-row-new' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(14)
  })

  it('hydrates positioned insert_rows_at deltas at the correct visual index', async () => {
    const commitLocalSheetData = jest.fn()
    const forceGridReapply = jest.fn()
    const fetchChangesSince = jest.fn().mockResolvedValue({
      currentVersion: 14,
      requiresSnapshot: false,
      changes: [
        {
          operationType: 'insert_rows_at',
          payload: {
            insertAt: 1,
            rows: [{ _clientRowId: 'client-row-new', ColumnA: 'plain value' }]
          },
          result: {
            insertAt: 1,
            rows: [{ id: 'backend-row-new', data: { _clientRowId: 'client-row-new', ColumnA: 'plain value' } }]
          },
          appliedVersion: 14
        }
      ]
    })
    let rows: Record<string, unknown>[] = [
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
    ]
    const callbacks = makeCallbacks({
      getColumns: () => [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })],
      getLocalSheetData: () => rows,
      commitLocalSheetData: (next, options) => {
        rows = next
        commitLocalSheetData(next, options)
      },
      fetchChangesSince,
      forceGridReapply
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'row_add',
              data: {
                sheetId: 'sheet-1',
                rowIds: ['backend-row-new']
              }
            }
          ]
        }
      },
      version: 14,
      timestamp: Date.now()
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(fetchChangesSince).toHaveBeenCalledWith('sheet-1', 13)
    expect(commitLocalSheetData).toHaveBeenLastCalledWith(
      [
        { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, ColumnA: 'existing top' },
        {
          _clientRowId: 'client-row-new',
          ColumnA: 'plain value',
          _id: 'backend-row-new',
          _rowUuid: 'backend-row-new'
        },
        { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1, ColumnA: 'existing bottom' }
      ],
      { persisted: true, syncGrid: true }
    )
    expect(forceGridReapply).toHaveBeenLastCalledWith(
      'sheet-1',
      { minRow: 1, maxRow: 2, minCol: 0, maxCol: 0 },
      expect.objectContaining({ clearAllSignatures: false, preferBulk: true })
    )
  })

  it('requests targeted catch-up for stale data-bearing batch_operations when a newer sheet version is already known', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 12,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      requestSheetCatchUp
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(12)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_cell',
              data: { sheetId: 'sheet-1', rowId: 'backend-row-1', columnName: 'ColumnA', value: 'stale' }
            }
          ]
        }
      },
      version: 11,
      timestamp: Date.now()
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'stale_version_data_op', {
      sinceVersion: 10,
      incomingVersion: 11
    })
    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(callbacks.onVersionUpdate).not.toHaveBeenCalled()
  })

  it('requests targeted catch-up for stale style-only batch_operations when a newer sheet version is already known', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 12,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      requestSheetCatchUp,
      onDiagnosticsTraceEvent
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(12)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_style',
              data: {
                sheetId: 'sheet-1',
                styles: { s1: { ff: 'Arial' } },
                cells: [{ row: 0, col: 0, stylePatch: { set: { s: 's1' } } }]
              }
            }
          ]
        }
      },
      version: 11,
      timestamp: Date.now()
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'stale_version_data_op', {
      sinceVersion: 10,
      incomingVersion: 11
    })
    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'client_collab_stale_data_op_catchup_requested' })
    )
  })

  it('requests targeted catch-up for direct stale set_style operations when a newer sheet version is already known', () => {
    const applyRemoteCellUpdate = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const callbacks = makeCallbacks({
      getSheetVersion: () => 9,
      applyRemoteCellUpdate,
      requestSheetCatchUp
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.setLastKnownVersion(9)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'set_style',
        data: {
          sheetId: 'sheet-1',
          cells: [{ row: 0, col: 0, stylePatch: { set: { s: 's1' } } }]
        }
      },
      version: 8,
      timestamp: Date.now()
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'stale_version_data_op', {
      sinceVersion: 7,
      incomingVersion: 8
    })
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
  })

  it('requests targeted catch-up for stale cells_changed when known sheet version is ahead', () => {
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const requestSheetCatchUp = jest.fn()
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [{ _id: 'row-0', ColumnA: 'old' }]
    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      getSheetVersion: () => 5,
      commitLocalSheetData,
      applyRemoteCellUpdate,
      requestSheetCatchUp
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'cells_changed',
        data: {
          sheetId: 'sheet-1',
          cells: [{ rowId: 'row-0', column: 'ColumnA', value: 'peer' }]
        }
      },
      version: 3,
      timestamp: Date.now()
    })

    expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'stale_version_data_op', {
      sinceVersion: 2,
      incomingVersion: 3
    })
    expect(commitLocalSheetData).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
  })

  it('removes stale column-id aliases when a remote clear is applied', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-e', name: 'ColumnE', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = [
      { _id: 'row-1', _rowUuid: 'backend-row-1', ColumnE: 'visible-value', 'col-e': 'stale-alias-value' }
    ]
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()

    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_range',
              data: {
                sheetId: 'sheet-1',
                cells: [{ rowId: 'backend-row-1', columnName: 'ColumnE', value: null }]
              }
            }
          ]
        }
      },
      version: 7,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [{ _id: 'row-1', _rowUuid: 'backend-row-1', ColumnE: null, _updatedAt: expect.any(String) }],
      { persisted: true, syncGrid: false }
    )
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(0, 0, null, 'backend-row-1')
  })

  it('applies very large persisted batch replays cell-by-cell without forcing a whole-grid sync', () => {
    const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', isVisible: true, order: 0 })]
    const data: Record<string, unknown>[] = Array.from({ length: 600 }, (_, index) => ({
      _id: `row-${index}`,
      _rowUuid: `backend-row-${index}`,
      ColumnA: `value-${index}`
    }))
    const commitLocalSheetData = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const callbacks = makeCallbacks({
      getColumns: () => columns,
      getLocalSheetData: () => data,
      commitLocalSheetData,
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: Array.from({ length: 600 }, (_, index) => ({
            type: 'clear_cell',
            data: {
              sheetId: 'sheet-1',
              rowId: `backend-row-${index}`,
              columnName: 'ColumnA'
            }
          }))
        }
      },
      version: 8,
      timestamp: Date.now()
    })

    expect(commitLocalSheetData).toHaveBeenCalledWith(expect.any(Array), { persisted: true, syncGrid: false })
    expect(applyRemoteCellUpdate).toHaveBeenCalledTimes(600)
    expect(applyRemoteCellUpdate).toHaveBeenNthCalledWith(1, 0, 0, null, 'backend-row-0')
    expect(applyRemoteCellUpdate).toHaveBeenNthCalledWith(600, 599, 0, null, 'backend-row-599')
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(8)
  })

  it('forwards stylePatch payloads in set_style batch operations', () => {
    const applyRemoteCellUpdate = jest.fn()
    const callbacks = makeCallbacks({
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_style',
              data: {
                sheetId: 'sheet-1',
                styles: {
                  style_1: { ff: 'Arial' }
                },
                cells: [
                  {
                    row: 0,
                    col: 0,
                    cellRef: 'A1',
                    stylePatch: { set: { s: 'style_1', tb: 1, tr: { a: 45 } } }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 9,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      0,
      0,
      undefined,
      undefined,
      expect.objectContaining({
        stylePatch: { set: { s: 'style_1', tb: 1, tr: { a: 45 } } },
        univerStyles: { style_1: { ff: 'Arial' } }
      })
    )
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(9)
  })

  it('forwards stylePatch unset semantics from set_style batch to applyRemoteCellUpdate options', () => {
    const applyRemoteCellUpdate = jest.fn()
    const callbacks = makeCallbacks({
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_style',
              data: {
                sheetId: 'sheet-1',
                styles: {
                  style_bold: { bl: 1 }
                },
                cells: [
                  {
                    row: 5,
                    col: 4,
                    cellRef: 'E6',
                    stylePatch: {
                      unset: ['s', 'bg', 'cl', 'bd', 'tb', 'tr', 'pd', 'it', 'ul', 'st', 'ff', 'fs', 'n'],
                      set: { s: 'style_bold', bl: 1 }
                    }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 91,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      5,
      4,
      undefined,
      undefined,
      expect.objectContaining({
        stylePatch: {
          unset: ['s', 'bg', 'cl', 'bd', 'tb', 'tr', 'pd', 'it', 'ul', 'st', 'ff', 'fs', 'n'],
          set: { s: 'style_bold', bl: 1 }
        },
        univerStyles: { style_bold: { bl: 1 } }
      })
    )
    expect(callbacks.onVersionUpdate).toHaveBeenCalledWith(91)
  })

  it('applies set_style batch operations when the nested payload omits sheetId', () => {
    const applyRemoteCellUpdate = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const callbacks = makeCallbacks({
      applyRemoteCellUpdate,
      onDiagnosticsTraceEvent
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          batchId: 'batch-style-1',
          operations: [
            {
              type: 'set_style',
              data: {
                styles: {
                  style_1: { ff: 'Arial' }
                },
                cells: [
                  {
                    row: 1,
                    col: 9,
                    cellRef: 'J2',
                    stylePatch: { set: { s: 'style_1' } }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 10,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      1,
      9,
      undefined,
      undefined,
      expect.objectContaining({
        diagnosticBatchId: 'batch-style-1',
        diagnosticOperationType: 'set_style',
        stylePatch: { set: { s: 'style_1' } },
        univerStyles: { style_1: { ff: 'Arial' } }
      })
    )
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_collab_set_style_applied',
        batchId: 'batch-style-1',
        operationType: 'set_style'
      })
    )
  })

  it('applies inactive-sheet set_style batches to the target worksheet immediately', () => {
    const activeSheetId = 'sheet-1'
    const applyRemoteCellUpdate = jest.fn()
    const onDiagnosticsTraceEvent = jest.fn()
    const callbacks = makeCallbacks({
      getActiveSheetId: () => activeSheetId,
      applyRemoteCellUpdate,
      onDiagnosticsTraceEvent
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-2',
          batchId: 'batch-style-inactive',
          operations: [
            {
              type: 'set_style',
              data: {
                sheetId: 'sheet-2',
                styles: {
                  style_2: { bg: { rgb: '#ff0000' } }
                },
                cells: [
                  {
                    row: 2,
                    col: 3,
                    cellRef: 'D3',
                    stylePatch: { set: { s: 'style_2' } }
                  }
                ]
              }
            }
          ]
        }
      },
      version: 11,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      2,
      3,
      undefined,
      undefined,
      expect.objectContaining({
        diagnosticBatchId: 'batch-style-inactive',
        diagnosticOperationType: 'set_style',
        targetSheetId: 'sheet-2',
        stylePatch: { set: { s: 'style_2' } },
        univerStyles: { style_2: { bg: { rgb: '#ff0000' } } }
      })
    )
    expect(onDiagnosticsTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'client_collab_set_style_applied',
        batchId: 'batch-style-inactive',
        operationType: 'set_style'
      })
    )
  })

  it('ignores malformed set_style patches and applies only valid cells', () => {
    const applyRemoteCellUpdate = jest.fn()
    const callbacks = makeCallbacks({
      applyRemoteCellUpdate
    })

    const manager = new SpreadsheetCollaborationManager(callbacks)
    manager.handleOperation({
      userId: 'u2',
      userName: 'Other',
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          operations: [
            {
              type: 'set_style',
              data: {
                sheetId: 'sheet-1',
                cells: [
                  { row: 0, col: 0, cellRef: 'A1', stylePatch: null },
                  { row: 1, col: 1, cellRef: 'B2', stylePatch: { set: {} } },
                  { row: 2, col: 2, cellRef: 'C3', stylePatch: { unset: [] } },
                  { row: 3, col: 3, cellRef: 'D4', stylePatch: { set: { s: 'ok-style' } } }
                ]
              }
            }
          ]
        }
      },
      version: 12,
      timestamp: Date.now()
    })

    expect(applyRemoteCellUpdate).toHaveBeenCalledTimes(1)
    expect(applyRemoteCellUpdate).toHaveBeenCalledWith(
      3,
      3,
      undefined,
      undefined,
      expect.objectContaining({
        stylePatch: { set: { s: 'ok-style' } }
      })
    )
  })

  describe('blocked committed batch recovery', () => {
    const committedBatchOperation = (partial: {
      baseVersion: number
      appliedVersion: number
      batchId?: string
      requiresSnapshot?: boolean
    }) => ({
      userId: 'user-2',
      userName: 'Remote User',
      timestamp: Date.now(),
      version: partial.appliedVersion,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: partial.batchId ?? 'batch-remote',
          actorId: 'user-2',
          baseVersion: partial.baseVersion,
          appliedVersion: partial.appliedVersion,
          payloadSchemaVersion: 1,
          requiresSnapshot: partial.requiresSnapshot,
          operations: [
            {
              type: 'set_cell',
              operationId: 'op-1',
              data: { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'Name', value: 'Peer' }
            }
          ]
        }
      }
    })

    it('requests catch-up instead of snapshot fallback for version_gap blocked batches', () => {
      localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
      const requestSheetCatchUp = jest.fn()
      const scheduleRemoteStructuralResync = jest.fn()
      const onCollabDiagnostic = jest.fn()
      const callbacks = makeCallbacks({
        getSheetVersion: () => 3,
        getColumns: () => [col({ id: 'col-name', name: 'Name', isVisible: true, order: 0 })],
        getLocalSheetData: () => [{ _id: 'row-1', Name: 'existing' }],
        requestSheetCatchUp,
        scheduleRemoteStructuralResync,
        isCollabDiagEnabled: () => true,
        onCollabDiagnostic
      })
      const manager = new SpreadsheetCollaborationManager(callbacks)
      manager.setLastKnownVersion(3)

      manager.handleOperation(committedBatchOperation({ baseVersion: 4, appliedVersion: 5, batchId: 'batch-gap' }))

      expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'version_gap', {
        sinceVersion: 3,
        incomingVersion: 5
      })
      expect(onCollabDiagnostic).toHaveBeenCalledWith(
        'blocked_recovery_retrying',
        expect.objectContaining({
          reason: 'version_gap',
          catchUpReason: 'version_gap',
          recoveryPath: 'ops_catchup'
        })
      )
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })

    it('refreshes and catch-ups for missing_version blocked batches on inactive sheets', () => {
      localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
      const requestSheetCatchUp = jest.fn()
      const scheduleSheetVersionRefreshFromApi = jest.fn()
      const scheduleRemoteStructuralResync = jest.fn()
      const onCollabDiagnostic = jest.fn()
      const callbacks = makeCallbacks({
        getActiveSheetId: () => 'sheet-active',
        getSheetVersion: (() => undefined) as unknown as (sheetId: string) => number,
        requestSheetCatchUp,
        scheduleSheetVersionRefreshFromApi,
        scheduleRemoteStructuralResync,
        isCollabDiagEnabled: () => true,
        onCollabDiagnostic
      })
      const manager = new SpreadsheetCollaborationManager(callbacks)

      manager.handleOperation(committedBatchOperation({ baseVersion: 4, appliedVersion: 5, batchId: 'batch-missing' }))

      expect(scheduleSheetVersionRefreshFromApi).toHaveBeenCalled()
      expect(requestSheetCatchUp).toHaveBeenCalledWith('sheet-1', 'version_gap', {
        sinceVersion: 4,
        incomingVersion: 5
      })
      expect(onCollabDiagnostic).toHaveBeenCalledWith(
        'blocked_recovery_retrying',
        expect.objectContaining({
          reason: 'missing_version',
          catchUpReason: 'version_refresh',
          recoveryPath: 'ops_catchup'
        })
      )
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })

    it('skips blocked recovery for recent local batch echoes', () => {
      localStorage.setItem('gba.spreadsheets.deltaReplay', 'enabled')
      const requestSheetCatchUp = jest.fn()
      const scheduleRemoteStructuralResync = jest.fn()
      const callbacks = makeCallbacks({
        getSheetVersion: () => 3,
        isRecentLocalBatchId: () => true,
        requestSheetCatchUp,
        scheduleRemoteStructuralResync
      })
      const manager = new SpreadsheetCollaborationManager(callbacks)
      manager.setLastKnownVersion(3)

      manager.handleOperation(
        committedBatchOperation({ baseVersion: 4, appliedVersion: 5, batchId: 'batch-local-echo' })
      )

      expect(requestSheetCatchUp).not.toHaveBeenCalled()
      expect(scheduleRemoteStructuralResync).not.toHaveBeenCalled()
      localStorage.removeItem('gba.spreadsheets.deltaReplay')
    })
  })
})
