import { renderHook, waitFor } from '@testing-library/react'

import { useUniverAuthoritativeGridSync } from '../useUniverAuthoritativeGridSync'
import { SpreadsheetVersionCausalOwnershipRegistry } from '../../core/spreadsheetVersionCausalOwnership'
import {
  protectSpreadsheetPendingLocalMutationCells,
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../../utils/spreadsheetPendingMaterializationCells'

describe('useUniverAuthoritativeGridSync', () => {
  it('does not repaint coordinate-protected pending local cells during forced reapply', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = {
      current: new Set([spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 0, 0)])
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, name: '', note: 'remote note' }],
        columns: [
          { id: 'col-name', name: 'name', isVisible: true },
          { id: 'col-note', name: 'note', isVisible: true }
        ] as any,
        authoritativeDataSyncToken: 0,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        univerAPIRef: { current: {} },
        lastSyncedGridCellSignaturesRef: { current: new Map() },
        lastSyncedGridRowCountRef: { current: 1 },
        lastSyncedGridColumnCountRef: { current: 2 },
        lastProcessedAuthoritativeDataSyncTokenRef: { current: 0 },
        lastProcessedAuthoritativeReapplySeedRef: { current: 0 },
        collabPersistedBulkApplyDepthRef: { current: 0 },
        skipNextAuthoritativeSyncAfterSnapshotInitRef: { current: false },
        getWorkbookSnapshotRef: { current: null },
        pendingAuthoritativeRegionRef: { current: null },
        pendingForcedAuthoritativeReapplyRef: {
          current: { regions: null, preferBulk: true, clearAllSignatures: true }
        },
        pendingLocalMutationCellsRef,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        resolveActiveWorksheetBounds: () => ({ maxRowIndex: 0, maxColIndex: 1 })
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 1,
          value: 'remote note'
        })
      ],
      { operationType: 'authoritative_reapply' }
    )
  })

  it('does not repaint semantic-protected pending local cells during forced reapply', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = {
      current: new Set([spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'row-1', 'name')])
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, name: 'stale name', note: 'remote note' }],
        columns: [
          { id: 'col-name', name: 'name', isVisible: true },
          { id: 'col-note', name: 'note', isVisible: true }
        ] as any,
        authoritativeDataSyncToken: 0,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        univerAPIRef: { current: {} },
        lastSyncedGridCellSignaturesRef: { current: new Map() },
        lastSyncedGridRowCountRef: { current: 1 },
        lastSyncedGridColumnCountRef: { current: 2 },
        lastProcessedAuthoritativeDataSyncTokenRef: { current: 0 },
        lastProcessedAuthoritativeReapplySeedRef: { current: 0 },
        collabPersistedBulkApplyDepthRef: { current: 0 },
        skipNextAuthoritativeSyncAfterSnapshotInitRef: { current: false },
        getWorkbookSnapshotRef: { current: null },
        pendingAuthoritativeRegionRef: { current: null },
        pendingForcedAuthoritativeReapplyRef: {
          current: { regions: null, preferBulk: true, clearAllSignatures: true }
        },
        pendingLocalMutationCellsRef,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        resolveActiveWorksheetBounds: () => ({ maxRowIndex: 0, maxColIndex: 1 })
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 1,
          value: 'remote note'
        })
      ],
      { operationType: 'authoritative_reapply' }
    )
  })

  it('keeps planner protection until an explicit ack release arrives', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = {
      current: new Set<string>()
    }
    const protectionKey = spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 0, 0)
    protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, [
      {
        key: protectionKey,
        ownerId: 'plan:test',
        expectedSignature: 's:local name'
      }
    ])

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, name: 'local name', note: 'remote note' }],
        columns: [
          { id: 'col-name', name: 'name', isVisible: true },
          { id: 'col-note', name: 'note', isVisible: true }
        ] as any,
        authoritativeDataSyncToken: 0,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        univerAPIRef: { current: {} },
        lastSyncedGridCellSignaturesRef: { current: new Map() },
        lastSyncedGridRowCountRef: { current: 1 },
        lastSyncedGridColumnCountRef: { current: 2 },
        lastProcessedAuthoritativeDataSyncTokenRef: { current: 0 },
        lastProcessedAuthoritativeReapplySeedRef: { current: 0 },
        collabPersistedBulkApplyDepthRef: { current: 0 },
        skipNextAuthoritativeSyncAfterSnapshotInitRef: { current: false },
        getWorkbookSnapshotRef: { current: null },
        pendingAuthoritativeRegionRef: { current: null },
        pendingForcedAuthoritativeReapplyRef: {
          current: { regions: null, preferBulk: true, clearAllSignatures: true }
        },
        pendingLocalMutationCellsRef,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        resolveActiveWorksheetBounds: () => ({ maxRowIndex: 0, maxColIndex: 1 })
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))

    expect(pendingLocalMutationCellsRef.current.has(protectionKey)).toBe(true)
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 1,
          value: 'remote note'
        })
      ],
      { operationType: 'authoritative_reapply' }
    )
  })

  it('skips authoritative repaint for version-causal owned cells', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const ownership = new SpreadsheetVersionCausalOwnershipRegistry()
    ownership.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-1',
      columnName: 'name',
      baseVersion: 10
    })

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1', version: 10 } as any,
        data: [{ _rowUuid: 'row-1', _gridRowIndex: 0, name: 'local', note: 'remote' }],
        columns: [
          { id: 'col-name', name: 'name', isVisible: true },
          { id: 'col-note', name: 'note', isVisible: true }
        ] as any,
        authoritativeDataSyncToken: 0,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        univerAPIRef: { current: {} },
        lastSyncedGridCellSignaturesRef: { current: new Map() },
        lastSyncedGridRowCountRef: { current: 1 },
        lastSyncedGridColumnCountRef: { current: 2 },
        lastProcessedAuthoritativeDataSyncTokenRef: { current: 0 },
        lastProcessedAuthoritativeReapplySeedRef: { current: 0 },
        collabPersistedBulkApplyDepthRef: { current: 0 },
        skipNextAuthoritativeSyncAfterSnapshotInitRef: { current: false },
        getWorkbookSnapshotRef: { current: null },
        pendingAuthoritativeRegionRef: { current: null },
        pendingForcedAuthoritativeReapplyRef: {
          current: { regions: null, preferBulk: true, clearAllSignatures: true }
        },
        versionCausalOwnershipRef: { current: ownership },
        resolveAuthoritativeAppliedVersion: () => 10,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        resolveActiveWorksheetBounds: () => ({ maxRowIndex: 0, maxColIndex: 1 })
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'remote' })],
      { operationType: 'authoritative_reapply' }
    )
  })

  it('scans only the bounded region during forced authoritative reapply', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const boundedRegion = { minRow: 112, maxRow: 115, minCol: 0, maxCol: 0 }
    const data = Array.from({ length: 120 }, (_, rowIndex) => ({
      _id: `row-${rowIndex}`,
      _gridRowIndex: rowIndex,
      column_m: rowIndex === 113 ? 'M113' : ''
    }))

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data,
        columns: [{ id: 'col-m', name: 'column_m', isVisible: true }] as any,
        authoritativeDataSyncToken: 0,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        univerAPIRef: { current: {} },
        lastSyncedGridCellSignaturesRef: { current: new Map() },
        lastSyncedGridRowCountRef: { current: data.length },
        lastSyncedGridColumnCountRef: { current: 1 },
        lastProcessedAuthoritativeDataSyncTokenRef: { current: 0 },
        lastProcessedAuthoritativeReapplySeedRef: { current: 0 },
        collabPersistedBulkApplyDepthRef: { current: 0 },
        skipNextAuthoritativeSyncAfterSnapshotInitRef: { current: false },
        getWorkbookSnapshotRef: { current: null },
        pendingAuthoritativeRegionRef: { current: null },
        pendingForcedAuthoritativeReapplyRef: {
          current: { regions: [boundedRegion], preferBulk: false, clearAllSignatures: false }
        },
        applyRemoteCellUpdate,
        applyRemoteCellUpdatesBulk,
        resolveActiveWorksheetBounds: () => ({ maxRowIndex: data.length - 1, maxColIndex: 0 })
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdate).toHaveBeenCalled())

    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate.mock.calls.map(call => call[0])).toEqual([112, 113, 114, 115])
  })
})
