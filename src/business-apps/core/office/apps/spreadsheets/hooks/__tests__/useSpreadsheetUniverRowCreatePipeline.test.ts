import { act, renderHook } from '@testing-library/react'

import { useSpreadsheetUniverRowCreatePipeline } from '../useSpreadsheetUniverRowCreatePipeline'
import type { SpreadsheetColumn } from '../../types'

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
        updateLocalRowsAfterCreate: (createdRows: Array<Record<string, unknown>>) => void
      ) => {
        updateLocalRowsAfterCreate([{ _id: 'client-row-1', _rowUuid: 'backend-row-1', ColumnA: 'first user value' }])
      }
    )
    const commitRowsForSheet = jest.fn()
    const onRowsMaterializedContextSync = jest.fn()
    const onRowIdentityDiagnostics = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetUniverRowCreatePipeline({
        activeSheetId: 'sheet-1',
        activeSheetIdRef,
        activeSheetColumns: [column('active-col', 'ActiveColumn')],
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
      [{ _clientRowId: 'client-row-1', ColumnA: 'first user value' }],
      expect.any(Function)
    )
    expect(commitRowsForSheet).toHaveBeenCalledWith(
      'sheet-2',
      [{ _id: 'client-row-1', _rowUuid: 'backend-row-1', ColumnA: 'first user value', _gridRowIndex: 0 }],
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
      [{ _id: 'client-row-1', _rowUuid: 'backend-row-1', ColumnA: 'first user value', _gridRowIndex: 0 }],
      {
        affectedUiRowIds: ['client-row-1'],
        isActiveTarget: false
      }
    )
    expect(pendingUniverRowsBySheetRef.current.has('sheet-2')).toBe(false)
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
        updateLocalRowsAfterCreate: (createdRows: Array<Record<string, unknown>>) => void
      ) => {
        updateLocalRowsAfterCreate([
          { _id: 'client-row-1', _rowUuid: 'backend-row-1', ColumnA: 'first pasted value' },
          { _id: 'client-row-2', _rowUuid: 'backend-row-2', ColumnA: 'second pasted value' }
        ])
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
        { _id: 'client-row-1', _rowUuid: 'backend-row-1', ColumnA: 'first pasted value', _gridRowIndex: 0 },
        { _id: 'client-row-2', _rowUuid: 'backend-row-2', ColumnA: 'second pasted value', _gridRowIndex: 1 }
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
        { _id: 'client-row-1', _rowUuid: 'backend-row-1', ColumnA: 'first pasted value', _gridRowIndex: 0 },
        { _id: 'client-row-2', _rowUuid: 'backend-row-2', ColumnA: 'second pasted value', _gridRowIndex: 1 }
      ],
      {
        affectedUiRowIds: ['client-row-1', 'client-row-2'],
        isActiveTarget: true
      }
    )
  })
})
