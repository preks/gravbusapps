import { act, renderHook } from '@testing-library/react'

import { createSpreadsheetRowMaterializationReadiness } from '../spreadsheetRowMaterializationReadiness'
import { useSpreadsheetUniverRowCreatePipeline } from '../useSpreadsheetUniverRowCreatePipeline'
import type { SpreadsheetColumn } from '../../types'
import { spreadsheetPendingLocalMutationCoordinateCellKey } from '../../utils/spreadsheetPendingMaterializationCells'

const column = (id: string, name: string): SpreadsheetColumn => ({
  id,
  name,
  label: name,
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order: 0
})

describe('useSpreadsheetUniverRowCreatePipeline', () => {
  it('persists newly materialized rows for the worksheet that emitted the change, even when React active sheet lags', async () => {
    const activeSheetIdRef = { current: 'sheet-1' }
    const latestUniverDataRef = {
      current: {
        sheetId: 'sheet-2',
        data: [{ _id: 'client-row-1', ColumnA: 'first user value' }]
      }
    }
    const pendingUniverRowsBySheetRef = {
      current: new Map([
        [
          'sheet-2',
          {
            data: [{ _id: 'client-row-1', ColumnA: 'first user value' }],
            persistedRows: []
          }
        ]
      ])
    }
    const persistAddedRowsWithBatch = jest.fn(
      async (
        _targetSheetId: string,
        _rowPayloads: Record<string, unknown>[],
        updateLocalRowsAfterCreate: (result: {
          createdRows: Array<Record<string, unknown>>
          persistedIdByClientRowId: Map<string, string>
        }) => void
      ) => {
        expect(
          pendingLocalMutationCellsRef.current.has(spreadsheetPendingLocalMutationCoordinateCellKey('sheet-2', 0, 0))
        ).toBe(true)
        updateLocalRowsAfterCreate({
          createdRows: [
            {
              _id: 'backend-row-1',
              _clientRowId: 'client-row-1',
              _rowUuid: 'backend-row-1',
              ColumnA: 'first user value'
            }
          ],
          persistedIdByClientRowId: new Map([['client-row-1', 'backend-row-1']])
        })
      }
    )
    const commitRowsForSheet = jest.fn()
    const onRowsMaterializedContextSync = jest.fn()
    const onRowIdentityDiagnostics = jest.fn()
    const pendingLocalMutationCellsRef = { current: new Set<string>() }

    const { result } = renderHook(() =>
      useSpreadsheetUniverRowCreatePipeline({
        activeSheetId: 'sheet-1',
        activeSheetIdRef,
        activeSheetColumns: [column('active-col', 'ActiveColumn')],
        pendingLocalMutationCellsRef,
        getColumnsForSheet: sheetId => (sheetId === 'sheet-2' ? [column('col-a', 'ColumnA')] : []),
        isUuid: value => value === 'backend-row-1',
        isOpsV2Enabled: true,
        onRowAdd: undefined,
        entityEnabledRef: { current: false },
        canEditWithLockRef: { current: true },
        latestUniverDataRef,
        pendingUniverRowsBySheetRef,
        lastProcessedLengthRef: { current: 0 },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => fn(),
        sheetPersist: {
          beginPersist: jest.fn(),
          endPersist: jest.fn(),
          markDirty: jest.fn(),
          recordSuccess: jest.fn(),
          recordError: jest.fn()
        },
        markVersionAsChanged: jest.fn(),
        markVersionAsSaved: jest.fn(),
        onPersistRowsErrorMessage: 'failed',
        getActiveSessionRows: () => [],
        buildAddRowPayloadsFromUniverRows: (rows, columns) =>
          rows.map(row => ({
            _clientRowId: row._id,
            _gridRowIndex: row._gridRowIndex,
            [columns[0].name]: row[columns[0].name]
          })),
        persistAddedRowsWithBatch,
        persistSingleAddedRow: jest.fn(),
        recoverFromVersionConflict: jest.fn(async () => false),
        summarizeRowsForDebug: rows => ({ count: rows?.length ?? 0 }),
        getRowsForSheet: () => [],
        multiSheetDebugLog: jest.fn(),
        commitRowsForSheet,
        onRowsMaterializedContextSync,
        onRowIdentityDiagnostics,
        pendingCreatedSheetSelectionRef: { current: null },
        createdSheetIdAliasesRef: { current: new Map<string, string>() }
      })
    )

    await act(async () => {
      await result.current.processUniverDataChange()
    })

    expect(persistAddedRowsWithBatch).toHaveBeenCalledWith(
      'sheet-2',
      [{ _clientRowId: 'client-row-1', _gridRowIndex: 0, ColumnA: 'first user value' }],
      expect.any(Function)
    )
    expect(pendingLocalMutationCellsRef.current.size).toBe(0)
    expect(commitRowsForSheet).toHaveBeenCalledWith(
      'sheet-2',
      [
        {
          _id: 'backend-row-1',
          _clientRowId: 'client-row-1',
          _rowUuid: 'backend-row-1',
          ColumnA: 'first user value',
          _gridRowIndex: 0
        }
      ],
      { syncGrid: false }
    )
    expect(onRowIdentityDiagnostics).toHaveBeenCalledWith(
      'row_session_snapshot_reconciled',
      expect.objectContaining({
        targetSheetId: 'sheet-2',
        rowIdentities: [
          expect.objectContaining({
            uiRowId: 'client-row-1',
            backendRowUuid: 'backend-row-1',
            hasBackendUuid: true,
            canRemap: true
          })
        ]
      })
    )
    expect(onRowsMaterializedContextSync).toHaveBeenCalledWith(
      'sheet-2',
      [
        {
          _id: 'backend-row-1',
          _clientRowId: 'client-row-1',
          _rowUuid: 'backend-row-1',
          ColumnA: 'first user value',
          _gridRowIndex: 0
        }
      ],
      {
        affectedUiRowIds: ['client-row-1'],
        createdGridRowIndices: [0],
        isActiveTarget: false
      }
    )
    expect(latestUniverDataRef.current).toEqual({
      sheetId: 'sheet-2',
      data: [
        {
          _id: 'backend-row-1',
          _clientRowId: 'client-row-1',
          _rowUuid: 'backend-row-1',
          ColumnA: 'first user value'
        }
      ]
    })
    expect(pendingUniverRowsBySheetRef.current.has('sheet-2')).toBe(false)
  })

  it('skips add_rows when the active-sheet Univer snapshot is older than the persisted session rows after an insert', async () => {
    const activeSheetIdRef = { current: 'sheet-1' }
    const latestUniverDataRef = {
      current: {
        sheetId: 'sheet-1',
        data: [
          { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _clientRowId: 'client-row-1', ColumnA: 1 },
          { _id: 'backend-row-2', _rowUuid: 'backend-row-2', _clientRowId: 'client-row-2', ColumnA: 2 },
          { _id: 'backend-row-3', _rowUuid: 'backend-row-3', _clientRowId: 'client-row-3', ColumnA: 3 }
        ]
      }
    }
    const pendingUniverRowsBySheetRef = { current: new Map<string, never>() }
    const persistedRows = [
      { _id: 'backend-row-1', _rowUuid: 'backend-row-1', _clientRowId: 'client-row-1', ColumnA: 1, _gridRowIndex: 0 },
      {
        _id: 'backend-inserted',
        _rowUuid: 'backend-inserted',
        _clientRowId: 'client-inserted',
        _gridRowIndex: 1
      },
      { _id: 'backend-row-2', _rowUuid: 'backend-row-2', _clientRowId: 'client-row-2', ColumnA: 2, _gridRowIndex: 2 },
      { _id: 'backend-row-3', _rowUuid: 'backend-row-3', _clientRowId: 'client-row-3', ColumnA: 3, _gridRowIndex: 3 }
    ]
    const persistAddedRowsWithBatch = jest.fn()
    const multiSheetDebugLog = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetUniverRowCreatePipeline({
        activeSheetId: 'sheet-1',
        activeSheetIdRef,
        activeSheetColumns: [column('col-a', 'ColumnA')],
        getColumnsForSheet: () => [column('col-a', 'ColumnA')],
        isUuid: value => value.startsWith('backend-'),
        isOpsV2Enabled: true,
        onRowAdd: undefined,
        entityEnabledRef: { current: false },
        canEditWithLockRef: { current: true },
        latestUniverDataRef,
        pendingUniverRowsBySheetRef,
        lastProcessedLengthRef: { current: persistedRows.length },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => fn(),
        sheetPersist: {
          beginPersist: jest.fn(),
          endPersist: jest.fn(),
          markDirty: jest.fn(),
          recordSuccess: jest.fn(),
          recordError: jest.fn()
        },
        markVersionAsChanged: jest.fn(),
        markVersionAsSaved: jest.fn(),
        onPersistRowsErrorMessage: 'failed',
        getActiveSessionRows: () => persistedRows,
        buildAddRowPayloadsFromUniverRows: rows => rows.map(row => ({ _clientRowId: row._id, ColumnA: row.ColumnA })),
        persistAddedRowsWithBatch,
        persistSingleAddedRow: jest.fn(),
        recoverFromVersionConflict: jest.fn(async () => false),
        summarizeRowsForDebug: rows => ({ count: rows?.length ?? 0 }),
        getRowsForSheet: () => persistedRows,
        multiSheetDebugLog,
        commitRowsForSheet: jest.fn(),
        onRowsMaterializedContextSync: jest.fn(),
        onRowIdentityDiagnostics: jest.fn(),
        pendingCreatedSheetSelectionRef: { current: null },
        createdSheetIdAliasesRef: { current: new Map<string, string>() },
        rowMaterializationReadiness: createSpreadsheetRowMaterializationReadiness()
      })
    )

    await act(async () => {
      await result.current.processUniverDataChange()
    })

    expect(persistAddedRowsWithBatch).not.toHaveBeenCalled()
    expect(multiSheetDebugLog).toHaveBeenCalledWith(
      'process_univer_data_change_skip_stale_active_snapshot',
      expect.any(Function)
    )
  })

  it('does not persist rows while sheet creation is awaiting persisted id', async () => {
    const activeSheetIdRef = { current: 'temp-new' }
    const latestUniverDataRef = {
      current: {
        sheetId: 'temp-new',
        data: [{ _id: 'r1', ColumnA: 'x' }]
      }
    }
    const pendingUniverRowsBySheetRef = {
      current: new Map([
        [
          'temp-new',
          {
            data: [{ _id: 'r1', ColumnA: 'x' }],
            persistedRows: []
          }
        ]
      ])
    }
    const persistAddedRowsWithBatch = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetUniverRowCreatePipeline({
        activeSheetId: 'temp-new',
        activeSheetIdRef,
        activeSheetColumns: [column('col-a', 'ColumnA')],
        getColumnsForSheet: () => [column('col-a', 'ColumnA')],
        isUuid: () => false,
        isOpsV2Enabled: true,
        onRowAdd: undefined,
        entityEnabledRef: { current: false },
        canEditWithLockRef: { current: true },
        latestUniverDataRef,
        pendingUniverRowsBySheetRef,
        lastProcessedLengthRef: { current: 0 },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => fn(),
        sheetPersist: {
          beginPersist: jest.fn(),
          endPersist: jest.fn(),
          markDirty: jest.fn(),
          recordSuccess: jest.fn(),
          recordError: jest.fn()
        },
        markVersionAsChanged: jest.fn(),
        markVersionAsSaved: jest.fn(),
        onPersistRowsErrorMessage: 'failed',
        getActiveSessionRows: () => [],
        buildAddRowPayloadsFromUniverRows: rows => rows.map(row => ({ _clientRowId: row._id, ColumnA: row.ColumnA })),
        persistAddedRowsWithBatch,
        persistSingleAddedRow: jest.fn(),
        recoverFromVersionConflict: jest.fn(async () => false),
        summarizeRowsForDebug: rows => ({ count: rows?.length ?? 0 }),
        getRowsForSheet: () => [],
        multiSheetDebugLog: jest.fn(),
        commitRowsForSheet: jest.fn(),
        onRowIdentityDiagnostics: jest.fn(),
        pendingCreatedSheetSelectionRef: {
          current: { temporarySheetId: 'temp-new', persistedSheetId: null }
        },
        createdSheetIdAliasesRef: { current: new Map<string, string>() }
      })
    )

    await act(async () => {
      await result.current.processUniverDataChange()
    })

    expect(persistAddedRowsWithBatch).not.toHaveBeenCalled()
  })

  it('persists visual rows that already count as processed but lack backend row ids', async () => {
    const activeSheetIdRef = { current: 'sheet-1' }
    const latestUniverDataRef = {
      current: {
        sheetId: 'sheet-1',
        data: [
          { _id: 'client-row-1', ColumnA: 'first pasted value' },
          { _id: 'client-row-2', ColumnA: 'second pasted value' }
        ]
      }
    }
    const pendingUniverRowsBySheetRef = { current: new Map<string, never>() }
    const persistAddedRowsWithBatch = jest.fn(
      async (
        _targetSheetId: string,
        _rowPayloads: Record<string, unknown>[],
        updateLocalRowsAfterCreate: (result: {
          createdRows: Array<Record<string, unknown>>
          persistedIdByClientRowId: Map<string, string>
        }) => void
      ) => {
        updateLocalRowsAfterCreate({
          createdRows: [
            {
              _id: 'backend-row-1',
              _clientRowId: 'client-row-1',
              _rowUuid: 'backend-row-1',
              ColumnA: 'first pasted value'
            },
            {
              _id: 'backend-row-2',
              _clientRowId: 'client-row-2',
              _rowUuid: 'backend-row-2',
              ColumnA: 'second pasted value'
            }
          ],
          persistedIdByClientRowId: new Map([
            ['client-row-1', 'backend-row-1'],
            ['client-row-2', 'backend-row-2']
          ])
        })
      }
    )
    const commitRowsForSheet = jest.fn()
    const onRowsMaterializedContextSync = jest.fn()
    const onRowIdentityDiagnostics = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetUniverRowCreatePipeline({
        activeSheetId: 'sheet-1',
        activeSheetIdRef,
        activeSheetColumns: [column('col-a', 'ColumnA')],
        getColumnsForSheet: () => [column('col-a', 'ColumnA')],
        isUuid: value => value.startsWith('backend-row-'),
        isOpsV2Enabled: true,
        onRowAdd: undefined,
        entityEnabledRef: { current: false },
        canEditWithLockRef: { current: true },
        latestUniverDataRef,
        pendingUniverRowsBySheetRef,
        lastProcessedLengthRef: { current: 2 },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => fn(),
        sheetPersist: {
          beginPersist: jest.fn(),
          endPersist: jest.fn(),
          markDirty: jest.fn(),
          recordSuccess: jest.fn(),
          recordError: jest.fn()
        },
        markVersionAsChanged: jest.fn(),
        markVersionAsSaved: jest.fn(),
        onPersistRowsErrorMessage: 'failed',
        getActiveSessionRows: () => [{ _id: 'client-row-1' }, { _id: 'client-row-2' }],
        buildAddRowPayloadsFromUniverRows: rows => rows.map(row => ({ _clientRowId: row._id, ColumnA: row.ColumnA })),
        persistAddedRowsWithBatch,
        persistSingleAddedRow: jest.fn(),
        recoverFromVersionConflict: jest.fn(async () => false),
        summarizeRowsForDebug: rows => ({ count: rows?.length ?? 0 }),
        getRowsForSheet: () => [],
        multiSheetDebugLog: jest.fn(),
        commitRowsForSheet,
        onRowsMaterializedContextSync,
        onRowIdentityDiagnostics,
        pendingCreatedSheetSelectionRef: { current: null },
        createdSheetIdAliasesRef: { current: new Map<string, string>() }
      })
    )

    await act(async () => {
      await result.current.processUniverDataChange()
    })

    expect(persistAddedRowsWithBatch).toHaveBeenCalledWith(
      'sheet-1',
      [
        { _clientRowId: 'client-row-1', ColumnA: 'first pasted value' },
        { _clientRowId: 'client-row-2', ColumnA: 'second pasted value' }
      ],
      expect.any(Function)
    )
    expect(commitRowsForSheet).toHaveBeenCalledWith(
      'sheet-1',
      [
        {
          _id: 'backend-row-1',
          _clientRowId: 'client-row-1',
          _rowUuid: 'backend-row-1',
          ColumnA: 'first pasted value',
          _gridRowIndex: 0
        },
        {
          _id: 'backend-row-2',
          _clientRowId: 'client-row-2',
          _rowUuid: 'backend-row-2',
          ColumnA: 'second pasted value',
          _gridRowIndex: 1
        }
      ],
      { syncGrid: false }
    )
    expect(onRowIdentityDiagnostics).toHaveBeenCalledWith(
      'row_session_snapshot_reconciled',
      expect.objectContaining({
        rowIdentities: [
          expect.objectContaining({ uiRowId: 'client-row-1', backendRowUuid: 'backend-row-1' }),
          expect.objectContaining({ uiRowId: 'client-row-2', backendRowUuid: 'backend-row-2' })
        ]
      })
    )
    expect(onRowsMaterializedContextSync).toHaveBeenCalledWith(
      'sheet-1',
      [
        {
          _id: 'backend-row-1',
          _clientRowId: 'client-row-1',
          _rowUuid: 'backend-row-1',
          ColumnA: 'first pasted value',
          _gridRowIndex: 0
        },
        {
          _id: 'backend-row-2',
          _clientRowId: 'client-row-2',
          _rowUuid: 'backend-row-2',
          ColumnA: 'second pasted value',
          _gridRowIndex: 1
        }
      ],
      {
        affectedUiRowIds: ['client-row-1', 'client-row-2'],
        createdGridRowIndices: [0, 1],
        isActiveTarget: true
      }
    )
  })

  it('patches the latest Univer snapshot so the same row no longer reports as temp without a backend on the next pass', async () => {
    const activeSheetIdRef = { current: 'sheet-1' }
    const latestUniverDataRef = {
      current: {
        sheetId: 'sheet-1',
        data: [{ _id: 'client-row-1', ColumnA: 'first pasted value' }]
      }
    }
    const pendingUniverRowsBySheetRef = { current: new Map<string, never>() }
    const persistedRowsRef = { current: [] as Array<Record<string, unknown>> }
    const persistAddedRowsWithBatch = jest.fn(
      async (
        _targetSheetId: string,
        _rowPayloads: Record<string, unknown>[],
        updateLocalRowsAfterCreate: (result: {
          createdRows: Array<Record<string, unknown>>
          persistedIdByClientRowId: Map<string, string>
        }) => void
      ) => {
        updateLocalRowsAfterCreate({
          createdRows: [
            {
              _id: 'backend-row-1',
              _clientRowId: 'client-row-1',
              _rowUuid: 'backend-row-1',
              ColumnA: 'first pasted value'
            }
          ],
          persistedIdByClientRowId: new Map([['client-row-1', 'backend-row-1']])
        })
      }
    )
    const commitRowsForSheet = jest.fn((sheetId: string, rows: Array<Record<string, unknown>>) => {
      if (sheetId === 'sheet-1') {
        persistedRowsRef.current = rows
      }
    })
    const multiSheetDebugLog = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetUniverRowCreatePipeline({
        activeSheetId: 'sheet-1',
        activeSheetIdRef,
        activeSheetColumns: [column('col-a', 'ColumnA')],
        getColumnsForSheet: () => [column('col-a', 'ColumnA')],
        isUuid: value => value === 'backend-row-1',
        isOpsV2Enabled: true,
        onRowAdd: undefined,
        entityEnabledRef: { current: false },
        canEditWithLockRef: { current: true },
        latestUniverDataRef,
        pendingUniverRowsBySheetRef,
        lastProcessedLengthRef: { current: 1 },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => fn(),
        sheetPersist: {
          beginPersist: jest.fn(),
          endPersist: jest.fn(),
          markDirty: jest.fn(),
          recordSuccess: jest.fn(),
          recordError: jest.fn()
        },
        markVersionAsChanged: jest.fn(),
        markVersionAsSaved: jest.fn(),
        onPersistRowsErrorMessage: 'failed',
        getActiveSessionRows: () => persistedRowsRef.current,
        buildAddRowPayloadsFromUniverRows: rows =>
          rows.map(row => ({
            _clientRowId: row._id,
            ColumnA: row.ColumnA
          })),
        persistAddedRowsWithBatch,
        persistSingleAddedRow: jest.fn(),
        recoverFromVersionConflict: jest.fn(async () => false),
        summarizeRowsForDebug: rows => ({ count: rows?.length ?? 0 }),
        getRowsForSheet: () => persistedRowsRef.current,
        multiSheetDebugLog,
        commitRowsForSheet,
        onRowsMaterializedContextSync: jest.fn(),
        onRowIdentityDiagnostics: jest.fn(),
        pendingCreatedSheetSelectionRef: { current: null },
        createdSheetIdAliasesRef: { current: new Map<string, string>() }
      })
    )

    await act(async () => {
      await result.current.processUniverDataChange()
    })

    multiSheetDebugLog.mockClear()

    await act(async () => {
      await result.current.processUniverDataChange()
    })

    expect(persistAddedRowsWithBatch).toHaveBeenCalledTimes(1)
    expect(latestUniverDataRef.current?.data).toEqual([
      {
        _id: 'backend-row-1',
        _clientRowId: 'client-row-1',
        _rowUuid: 'backend-row-1',
        ColumnA: 'first pasted value'
      }
    ])
    expect(
      multiSheetDebugLog.mock.calls.filter(
        ([event]) => event === 'process_univer_data_change_skip_materialization_diagnostics'
      )
    ).toEqual([])
  })

  it('publishes temp row readiness immediately after create response, before session merge catches up', async () => {
    const rowMaterializationReadiness = createSpreadsheetRowMaterializationReadiness()
    const latestUniverDataRef = {
      current: {
        sheetId: 'sheet-1',
        data: [{ _id: 'client-row-1', ColumnA: 'first user value' }]
      }
    }
    const persistAddedRowsWithBatch = jest.fn(
      async (
        _targetSheetId: string,
        _rowPayloads: Record<string, unknown>[],
        updateLocalRowsAfterCreate: (result: {
          createdRows: Array<Record<string, unknown>>
          persistedIdByClientRowId: Map<string, string>
        }) => void
      ) => {
        updateLocalRowsAfterCreate({
          createdRows: [
            {
              _id: 'backend-row-1',
              _clientRowId: 'client-row-1',
              _rowUuid: 'backend-row-1',
              ColumnA: 'first user value'
            }
          ],
          persistedIdByClientRowId: new Map([['client-row-1', 'backend-row-1']])
        })
      }
    )

    const { result } = renderHook(() =>
      useSpreadsheetUniverRowCreatePipeline({
        activeSheetId: 'sheet-1',
        activeSheetIdRef: { current: 'sheet-1' },
        activeSheetColumns: [column('col-a', 'ColumnA')],
        getColumnsForSheet: () => [column('col-a', 'ColumnA')],
        isUuid: value => value === 'backend-row-1',
        isOpsV2Enabled: true,
        onRowAdd: undefined,
        entityEnabledRef: { current: false },
        canEditWithLockRef: { current: true },
        latestUniverDataRef,
        pendingUniverRowsBySheetRef: { current: new Map() },
        lastProcessedLengthRef: { current: 0 },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => fn(),
        sheetPersist: {
          beginPersist: jest.fn(),
          endPersist: jest.fn(),
          markDirty: jest.fn(),
          recordSuccess: jest.fn(),
          recordError: jest.fn()
        },
        markVersionAsChanged: jest.fn(),
        markVersionAsSaved: jest.fn(),
        onPersistRowsErrorMessage: 'failed',
        getActiveSessionRows: () => [],
        buildAddRowPayloadsFromUniverRows: rows =>
          rows.map(row => ({
            _clientRowId: row._id,
            ColumnA: row.ColumnA
          })),
        persistAddedRowsWithBatch,
        persistSingleAddedRow: jest.fn(),
        recoverFromVersionConflict: jest.fn(async () => false),
        summarizeRowsForDebug: rows => ({ count: rows?.length ?? 0 }),
        getRowsForSheet: () => [],
        multiSheetDebugLog: jest.fn(),
        commitRowsForSheet: jest.fn(),
        onRowsMaterializedContextSync: jest.fn(),
        onRowIdentityDiagnostics: jest.fn(),
        pendingCreatedSheetSelectionRef: { current: null },
        createdSheetIdAliasesRef: { current: new Map<string, string>() },
        rowMaterializationReadiness
      })
    )

    await act(async () => {
      await result.current.processUniverDataChange()
    })

    expect(rowMaterializationReadiness.getResolvedBackendRowId('sheet-1', 'client-row-1')).toBe('backend-row-1')
  })

  it('prefers batch add_rows for materialization when the payload carries client identity and grid slot metadata', async () => {
    const persistAddedRowsWithBatch = jest.fn(
      async (
        _targetSheetId: string,
        _rowPayloads: Record<string, unknown>[],
        updateLocalRowsAfterCreate: (result: {
          createdRows: Array<Record<string, unknown>>
          persistedIdByClientRowId: Map<string, string>
        }) => void
      ) => {
        updateLocalRowsAfterCreate({
          createdRows: [
            {
              _id: 'backend-row-7',
              _clientRowId: 'client-row-7',
              _rowUuid: 'backend-row-7',
              _gridRowIndex: 7,
              ColumnA: 'value 7'
            }
          ],
          persistedIdByClientRowId: new Map([['client-row-7', 'backend-row-7']])
        })
      }
    )
    const persistSingleAddedRow = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetUniverRowCreatePipeline({
        activeSheetId: 'sheet-1',
        activeSheetIdRef: { current: 'sheet-1' },
        activeSheetColumns: [column('col-a', 'ColumnA')],
        getColumnsForSheet: () => [column('col-a', 'ColumnA')],
        isUuid: value => value === 'backend-row-7',
        isOpsV2Enabled: false,
        onRowAdd: jest.fn(),
        entityEnabledRef: { current: false },
        canEditWithLockRef: { current: true },
        latestUniverDataRef: {
          current: {
            sheetId: 'sheet-1',
            data: [{ _id: 'client-row-7', _gridRowIndex: 7, ColumnA: 'value 7' }]
          }
        },
        pendingUniverRowsBySheetRef: { current: new Map() },
        lastProcessedLengthRef: { current: 0 },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => fn(),
        sheetPersist: {
          beginPersist: jest.fn(),
          endPersist: jest.fn(),
          markDirty: jest.fn(),
          recordSuccess: jest.fn(),
          recordError: jest.fn()
        },
        markVersionAsChanged: jest.fn(),
        markVersionAsSaved: jest.fn(),
        onPersistRowsErrorMessage: 'failed',
        getActiveSessionRows: () => [],
        buildAddRowPayloadsFromUniverRows: rows =>
          rows.map(row => ({
            _clientRowId: row._id,
            _gridRowIndex: row._gridRowIndex,
            ColumnA: row.ColumnA
          })),
        persistAddedRowsWithBatch,
        persistSingleAddedRow,
        recoverFromVersionConflict: jest.fn(async () => false),
        summarizeRowsForDebug: rows => ({ count: rows?.length ?? 0 }),
        getRowsForSheet: () => [],
        multiSheetDebugLog: jest.fn(),
        commitRowsForSheet: jest.fn(),
        onRowsMaterializedContextSync: jest.fn(),
        onRowIdentityDiagnostics: jest.fn(),
        pendingCreatedSheetSelectionRef: { current: null },
        createdSheetIdAliasesRef: { current: new Map<string, string>() }
      })
    )

    await act(async () => {
      await result.current.processUniverDataChange()
    })

    expect(persistAddedRowsWithBatch).toHaveBeenCalledWith(
      'sheet-1',
      [{ _clientRowId: 'client-row-7', _gridRowIndex: 7, ColumnA: 'value 7' }],
      expect.any(Function)
    )
    expect(persistSingleAddedRow).not.toHaveBeenCalled()
  })

  it('can materialize a specific temp row selected from the latest snapshot for submit readiness', async () => {
    const rowMaterializationReadiness = createSpreadsheetRowMaterializationReadiness()
    const persistAddedRowsWithBatch = jest.fn(
      async (
        _targetSheetId: string,
        _rowPayloads: Record<string, unknown>[],
        updateLocalRowsAfterCreate: (result: {
          createdRows: Array<Record<string, unknown>>
          persistedIdByClientRowId: Map<string, string>
        }) => void
      ) => {
        updateLocalRowsAfterCreate({
          createdRows: [{ _id: 'client-row-9', _rowUuid: 'backend-row-9', _gridRowIndex: 9, ColumnA: 'value 9' }],
          persistedIdByClientRowId: new Map([['client-row-9', 'backend-row-9']])
        })
      }
    )

    const { result } = renderHook(() =>
      useSpreadsheetUniverRowCreatePipeline({
        activeSheetId: 'sheet-1',
        activeSheetIdRef: { current: 'sheet-1' },
        activeSheetColumns: [column('col-a', 'ColumnA')],
        getColumnsForSheet: () => [column('col-a', 'ColumnA')],
        isUuid: value => value === 'backend-row-9',
        isOpsV2Enabled: true,
        onRowAdd: undefined,
        entityEnabledRef: { current: false },
        canEditWithLockRef: { current: true },
        latestUniverDataRef: { current: null },
        pendingUniverRowsBySheetRef: { current: new Map() },
        lastProcessedLengthRef: { current: 0 },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => fn(),
        sheetPersist: {
          beginPersist: jest.fn(),
          endPersist: jest.fn(),
          markDirty: jest.fn(),
          recordSuccess: jest.fn(),
          recordError: jest.fn()
        },
        markVersionAsChanged: jest.fn(),
        markVersionAsSaved: jest.fn(),
        onPersistRowsErrorMessage: 'failed',
        getActiveSessionRows: () => [],
        buildAddRowPayloadsFromUniverRows: rows =>
          rows.map(row => ({
            _clientRowId: row._id,
            _gridRowIndex: row._gridRowIndex,
            ColumnA: row.ColumnA
          })),
        persistAddedRowsWithBatch,
        persistSingleAddedRow: jest.fn(),
        recoverFromVersionConflict: jest.fn(async () => false),
        summarizeRowsForDebug: rows => ({ count: rows?.length ?? 0 }),
        getRowsForSheet: () => [],
        multiSheetDebugLog: jest.fn(),
        commitRowsForSheet: jest.fn(),
        onRowsMaterializedContextSync: jest.fn(),
        onRowIdentityDiagnostics: jest.fn(),
        pendingCreatedSheetSelectionRef: { current: null },
        createdSheetIdAliasesRef: { current: new Map<string, string>() },
        rowMaterializationReadiness
      })
    )

    await act(async () => {
      await result.current.materializeTemporaryRowsForSubmit('sheet-1', [
        { _id: 'client-row-9', _gridRowIndex: 9, ColumnA: 'value 9' }
      ])
    })

    expect(persistAddedRowsWithBatch).toHaveBeenCalledWith(
      'sheet-1',
      [{ _clientRowId: 'client-row-9', _gridRowIndex: 9, ColumnA: 'value 9' }],
      expect.any(Function)
    )
    expect(rowMaterializationReadiness.getResolvedBackendRowId('sheet-1', 'client-row-9')).toBe('backend-row-9')
  })
})
