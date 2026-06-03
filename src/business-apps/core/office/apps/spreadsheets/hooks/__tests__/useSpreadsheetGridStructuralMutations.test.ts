import { act, renderHook } from '@testing-library/react'

import { SpreadsheetIntentJournal } from '../../core/spreadsheetIntentJournal'
import { SpreadsheetVersionCausalOwnershipRegistry } from '../../core/spreadsheetVersionCausalOwnership'
import {
  protectSpreadsheetPendingLocalMutationCells,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../../utils/spreadsheetPendingMaterializationCells'
import { useSpreadsheetGridStructuralMutations } from '../useSpreadsheetGridStructuralMutations'

describe('useSpreadsheetGridStructuralMutations', () => {
  it('persists move_row_slots without full snapshot reload or grid resync', async () => {
    const initialRows = [
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 1, name: 'A' },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, name: 'B' }
    ]

    const moveRowSlots = jest.fn().mockResolvedValue({ newVersion: 7 })
    const commitLocalSheetData = jest.fn()
    const syncSheetRowsIntoLocalState = jest.fn()
    const syncGridConversionContext = jest.fn()
    const scheduleStructuralSnapshotReload = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetGridStructuralMutations({
        activeSheetIdRef: { current: 'sheet-1' },
        createdSheetIdAliasesRef: { current: new Map() },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => fn(),
        mutationFacade: {
          insertRowSlots: jest.fn(),
          deleteRowSlots: jest.fn(),
          moveRowSlots,
          moveCellRange: jest.fn()
        },
        rowSlotIdentityRegistry: {
          markUnhealthy: jest.fn(),
          markHealthy: jest.fn(),
          bindBackendRowId: jest.fn(),
          syncRows: jest.fn()
        },
        rowMaterializationReadiness: {
          registerPending: jest.fn(),
          resolveMany: jest.fn(),
          reject: jest.fn()
        },
        activeSheetColumns: [],
        spreadsheetColumnsForGrid: [],
        spreadsheetGridRef: {
          current: { syncGridConversionContext }
        },
        getActiveSessionRows: () => initialRows,
        getKnownRowsForSheet: () => [],
        commitLocalSheetData,
        syncSheetRowsIntoLocalState,
        pendingUniverRowsBySheetRef: { current: new Map() },
        latestUniverDataRef: { current: null },
        lastProcessedLengthRef: { current: 0 },
        buildAddRowPayloadsFromUniverRows: jest.fn(),
        buildPersistedRowIdMapFromInsertRowSlotsResult: jest.fn(() => new Map()),
        mapPersistedRowsToViewerRows: jest.fn(),
        createNativeSpreadsheetClientRowId: jest.fn(() => 'client-row-1'),
        logRowIdentityDiagnostics: jest.fn(),
        buildRowIdentityDiagnostics: jest.fn(),
        isUuid: jest.fn(),
        isUuidString: jest.fn((value: string) => value.startsWith('row-')),
        recoverFromVersionConflictRef: { current: jest.fn().mockResolvedValue(false) },
        sheetPersist: {
          beginPersist: jest.fn(),
          markDirty: jest.fn(),
          recordSuccess: jest.fn(),
          recordError: jest.fn(),
          endPersist: jest.fn()
        },
        versioning: {
          markAsChanged: jest.fn(),
          markAsSaved: jest.fn()
        },
        sheetPersistErrorMessage: 'persist failed',
        handleColumnsInsertInternal: jest.fn(),
        handleColumnsDeleteInternal: jest.fn(),
        handleColumnsMoveInternal: jest.fn(),
        scheduleStructuralSnapshotReload
      })
    )

    await act(async () => {
      result.current.onRowsMove(1, 1, 3)
      await Promise.resolve()
    })

    expect(moveRowSlots).toHaveBeenCalledWith('sheet-1', 1, 1, 3)
    expect(commitLocalSheetData).toHaveBeenCalledWith(
      [
        expect.objectContaining({ _id: 'row-2', _gridRowIndex: 1 }),
        expect.objectContaining({ _id: 'row-1', _gridRowIndex: 2 })
      ],
      expect.objectContaining({ persisted: false, publishParent: true })
    )
    expect(syncSheetRowsIntoLocalState).toHaveBeenCalledWith(
      'sheet-1',
      [
        expect.objectContaining({ _id: 'row-2', _gridRowIndex: 1 }),
        expect.objectContaining({ _id: 'row-1', _gridRowIndex: 2 })
      ],
      expect.objectContaining({ persisted: true, syncGrid: false, version: 7 })
    )
    expect(syncGridConversionContext).toHaveBeenCalled()
    expect(scheduleStructuralSnapshotReload).not.toHaveBeenCalled()
  })

  it('persists insert_row_slots without full snapshot reload or grid resync', async () => {
    const initialRows = [
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 1, name: 'A' },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 2, name: 'B' }
    ]

    const insertRowSlots = jest.fn().mockResolvedValue({
      newVersion: 8,
      operationResults: [{ type: 'insert_row_slots', result: { rows: [] } }]
    })
    const syncSheetRowsIntoLocalState = jest.fn()
    const scheduleStructuralSnapshotReload = jest.fn()
    const bindBackendRowId = jest.fn()
    const resolveMany = jest.fn()
    const spreadsheetIntentJournalRef = { current: new SpreadsheetIntentJournal() }
    const versionCausalOwnershipRef = { current: new SpreadsheetVersionCausalOwnershipRegistry() }
    const pendingLocalMutationCellsRef = { current: new Set<string>() }
    spreadsheetIntentJournalRef.current.captureIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'client-row-1',
      columnName: 'name',
      value: 'A',
      baseVersion: 3
    })
    versionCausalOwnershipRef.current.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'client-row-1',
      columnName: 'name',
      baseVersion: 3
    })
    protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, [
      {
        key: spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'client-row-1', 'name'),
        ownerId: 'plan:client-row-1:name'
      }
    ])

    const { result } = renderHook(() =>
      useSpreadsheetGridStructuralMutations({
        activeSheetIdRef: { current: 'sheet-1' },
        createdSheetIdAliasesRef: { current: new Map() },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => fn(),
        mutationFacade: {
          insertRowSlots,
          deleteRowSlots: jest.fn(),
          moveRowSlots: jest.fn()
        },
        rowSlotIdentityRegistry: {
          markUnhealthy: jest.fn(),
          markHealthy: jest.fn(),
          bindBackendRowId,
          syncRows: jest.fn()
        },
        rowMaterializationReadiness: {
          registerPending: jest.fn(),
          resolveMany,
          reject: jest.fn()
        },
        spreadsheetIntentJournalRef,
        versionCausalOwnershipRef,
        pendingLocalMutationCellsRef,
        activeSheetColumns: [],
        spreadsheetColumnsForGrid: [],
        spreadsheetGridRef: {
          current: { syncGridConversionContext: jest.fn() }
        },
        getActiveSessionRows: () => initialRows,
        getKnownRowsForSheet: () => [],
        commitLocalSheetData: jest.fn(),
        syncSheetRowsIntoLocalState,
        pendingUniverRowsBySheetRef: { current: new Map() },
        latestUniverDataRef: { current: null },
        lastProcessedLengthRef: { current: 0 },
        buildAddRowPayloadsFromUniverRows: jest.fn(() => [{ _clientRowId: 'client-row-1', name: 'A' }]),
        buildPersistedRowIdMapFromInsertRowSlotsResult: jest.fn(() => new Map([['client-row-1', 'backend-row-1']])),
        mapPersistedRowsToViewerRows: jest.fn(() => []),
        createNativeSpreadsheetClientRowId: jest.fn(() => 'client-row-1'),
        logRowIdentityDiagnostics: jest.fn(),
        buildRowIdentityDiagnostics: jest.fn(),
        isUuid: jest.fn(),
        isUuidString: jest.fn((value: string) => value.startsWith('row-')),
        recoverFromVersionConflictRef: { current: jest.fn().mockResolvedValue(false) },
        sheetPersist: {
          beginPersist: jest.fn(),
          markDirty: jest.fn(),
          recordSuccess: jest.fn(),
          recordError: jest.fn(),
          endPersist: jest.fn()
        },
        versioning: {
          markAsChanged: jest.fn(),
          markAsSaved: jest.fn()
        },
        sheetPersistErrorMessage: 'persist failed',
        handleColumnsInsertInternal: jest.fn(),
        handleColumnsDeleteInternal: jest.fn(),
        handleColumnsMoveInternal: jest.fn(),
        scheduleStructuralSnapshotReload
      })
    )

    await act(async () => {
      result.current.onRowsInsert(1, 1, 'lefttop')
      await Promise.resolve()
    })

    expect(insertRowSlots).toHaveBeenCalled()
    expect(resolveMany).toHaveBeenCalledWith('sheet-1', new Map([['client-row-1', 'backend-row-1']]))
    expect(bindBackendRowId).toHaveBeenCalledWith('sheet-1', 'client-row-1', 'backend-row-1')
    expect(spreadsheetIntentJournalRef.current.listIntents('sheet-1')).toEqual([
      expect.objectContaining({ logicalRowHandle: 'backend-row-1' })
    ])
    expect(
      pendingLocalMutationCellsRef.current.has(
        spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'client-row-1', 'name')
      )
    ).toBe(false)
    expect(
      pendingLocalMutationCellsRef.current.has(
        spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'backend-row-1', 'name')
      )
    ).toBe(true)
    expect(syncSheetRowsIntoLocalState).toHaveBeenCalledWith(
      'sheet-1',
      expect.any(Array),
      expect.objectContaining({ persisted: true, syncGrid: false, version: 8 })
    )
    expect(scheduleStructuralSnapshotReload).not.toHaveBeenCalled()
  })

  it('persists move_cell_range without full snapshot reload or grid resync', async () => {
    const initialRows = [
      { _id: 'row-0', _rowUuid: 'row-0', _gridRowIndex: 0, ColumnA: 'A0' },
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 1 }
    ]
    const fromRange = { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }
    const toRange = { startRow: 1, endRow: 1, startColumn: 0, endColumn: 0 }

    const moveCellRange = jest.fn().mockResolvedValue({ newVersion: 9 })
    const commitLocalSheetData = jest.fn()
    const syncSheetRowsIntoLocalState = jest.fn()
    const syncGridConversionContext = jest.fn()
    const scheduleStructuralSnapshotReload = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetGridStructuralMutations({
        activeSheetIdRef: { current: 'sheet-1' },
        createdSheetIdAliasesRef: { current: new Map() },
        operationQueueRef: { current: Promise.resolve() },
        chainOnOperationQueue: async (_queueRef, fn) => fn(),
        mutationFacade: {
          insertRowSlots: jest.fn(),
          deleteRowSlots: jest.fn(),
          moveRowSlots: jest.fn(),
          moveCellRange
        },
        rowSlotIdentityRegistry: {
          markUnhealthy: jest.fn(),
          markHealthy: jest.fn(),
          bindBackendRowId: jest.fn(),
          syncRows: jest.fn()
        },
        rowMaterializationReadiness: {
          registerPending: jest.fn(),
          resolveMany: jest.fn(),
          reject: jest.fn()
        },
        activeSheetColumns: [{ name: 'ColumnA' }],
        spreadsheetColumnsForGrid: [{ name: 'ColumnA' }],
        spreadsheetGridRef: {
          current: { syncGridConversionContext }
        },
        getActiveSessionRows: () => initialRows,
        getKnownRowsForSheet: () => [],
        commitLocalSheetData,
        syncSheetRowsIntoLocalState,
        pendingUniverRowsBySheetRef: { current: new Map() },
        latestUniverDataRef: { current: null },
        lastProcessedLengthRef: { current: 0 },
        buildAddRowPayloadsFromUniverRows: jest.fn(),
        buildPersistedRowIdMapFromInsertRowSlotsResult: jest.fn(() => new Map()),
        mapPersistedRowsToViewerRows: jest.fn(),
        createNativeSpreadsheetClientRowId: jest.fn(() => 'client-row-1'),
        logRowIdentityDiagnostics: jest.fn(),
        buildRowIdentityDiagnostics: jest.fn(),
        isUuid: jest.fn(),
        isUuidString: jest.fn((value: string) => value.startsWith('row-')),
        recoverFromVersionConflictRef: { current: jest.fn().mockResolvedValue(false) },
        sheetPersist: {
          beginPersist: jest.fn(),
          markDirty: jest.fn(),
          recordSuccess: jest.fn(),
          recordError: jest.fn(),
          endPersist: jest.fn()
        },
        versioning: {
          markAsChanged: jest.fn(),
          markAsSaved: jest.fn()
        },
        sheetPersistErrorMessage: 'persist failed',
        handleColumnsInsertInternal: jest.fn(),
        handleColumnsDeleteInternal: jest.fn(),
        handleColumnsMoveInternal: jest.fn(),
        scheduleStructuralSnapshotReload
      })
    )

    await act(async () => {
      result.current.onCellRangeMove(fromRange, toRange)
      await Promise.resolve()
    })

    expect(moveCellRange).toHaveBeenCalledWith('sheet-1', fromRange, toRange)
    expect(commitLocalSheetData).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ _id: 'row-1', ColumnA: 'A0' })]),
      expect.objectContaining({ persisted: false, syncGrid: false, publishParent: true })
    )
    expect(syncSheetRowsIntoLocalState).toHaveBeenCalledWith(
      'sheet-1',
      expect.any(Array),
      expect.objectContaining({ persisted: true, syncGrid: false, version: 9 })
    )
    expect(scheduleStructuralSnapshotReload).not.toHaveBeenCalled()
  })
})
