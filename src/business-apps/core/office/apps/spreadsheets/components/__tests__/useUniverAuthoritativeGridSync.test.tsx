import { renderHook, waitFor } from '@testing-library/react'

import { useUniverAuthoritativeGridSync } from '../useUniverAuthoritativeGridSync'
import * as univerAdapter from '../../utils/univerAdapter'
import {
  protectSpreadsheetPendingLocalMutationCells,
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../../utils/spreadsheetPendingMaterializationCells'

const createStableHookRefs = () => ({
  univerAPIRef: { current: {} as unknown },
  authoritativePaintCellsRef: { current: null as import('../../core').SpreadsheetBulkRemoteCellItem[] | null },
  lastSyncedGridRowCountRef: { current: 1 },
  lastSyncedGridColumnCountRef: { current: 2 },
  lastProcessedAuthoritativeDataSyncTokenRef: { current: 0 },
  lastProcessedAuthoritativeReapplySeedRef: { current: 0 },
  collabPersistedBulkApplyDepthRef: { current: 0 },
  skipNextAuthoritativeSyncAfterSnapshotInitRef: { current: false },
  getWorkbookSnapshotRef: { current: null as (() => Record<string, unknown> | null) | null },
  pendingAuthoritativeRegionRef: {
    current: null as import('../../utils/spreadsheetAuthoritativeRegion').AuthoritativeGridRegion[] | null
  },
  pendingForcedAuthoritativeReapplyRef: {
    current: null as {
      regions: import('../../utils/spreadsheetAuthoritativeRegion').AuthoritativeGridRegion[] | null
      preferBulk: boolean
      clearAllSignatures: boolean
    } | null
  }
})

describe('useUniverAuthoritativeGridSync', () => {
  it('does not repaint coordinate-protected pending local cells during forced reapply', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = {
      current: new Set([spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 0, 0)])
    }
    const refs = createStableHookRefs()
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: null,
      preferBulk: true,
      clearAllSignatures: true
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
        pendingLocalMutationCellsRef,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'remote note' })],
      { operationType: 'authoritative_reapply' }
    )
  })

  it('does not repaint semantic-protected pending local cells during forced reapply', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = {
      current: new Set([spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'row-1', 'name')])
    }
    const refs = createStableHookRefs()
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: null,
      preferBulk: true,
      clearAllSignatures: true
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
        pendingLocalMutationCellsRef,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))

    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'remote note' })],
      { operationType: 'authoritative_reapply' }
    )
  })

  it('keeps planner protection until an explicit ack release arrives', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = { current: new Set<string>() }
    const protectionKey = spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 0, 0)
    protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, [
      { key: protectionKey, ownerId: 'plan:test', expectedSignature: 's:local name' }
    ])
    const refs = createStableHookRefs()
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: null,
      preferBulk: true,
      clearAllSignatures: true
    }

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
        pendingLocalMutationCellsRef,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))
    expect(pendingLocalMutationCellsRef.current.has(protectionKey)).toBe(true)
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'remote note' })],
      { operationType: 'authoritative_reapply' }
    )
  })

  it('paints peer-cleared blank cells during authoritative reapply', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.lastSyncedGridColumnCountRef.current = 1
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: null,
      preferBulk: true,
      clearAllSignatures: true
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1', version: 10 } as any,
        data: [{ _rowUuid: 'row-1', _gridRowIndex: 0, name: '' }],
        columns: [{ id: 'col-name', name: 'name', isVisible: true }] as any,
        authoritativeDataSyncToken: 0,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [expect.objectContaining({ rowIndex: 0, colIndex: 0, value: '' })],
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
    const refs = createStableHookRefs()
    refs.lastSyncedGridRowCountRef.current = data.length
    refs.lastSyncedGridColumnCountRef.current = 1
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: [boundedRegion],
      preferBulk: false,
      clearAllSignatures: false
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data,
        columns: [{ id: 'col-m', name: 'column_m', isVisible: true }] as any,
        authoritativeDataSyncToken: 0,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate,
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdate).toHaveBeenCalled())
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate.mock.calls.map(call => call[0])).toEqual([112, 113, 114, 115])
  })

  it('paints session-derived cells when authoritativePaintCellsRef is populated', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.authoritativePaintCellsRef.current = [
      { rowIndex: 0, colIndex: 0, value: 'local', rowId: 'row-1' },
      { rowIndex: 0, colIndex: 1, value: '', rowId: 'row-1' }
    ]

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_p: 'local', column_t: '' }],
        columns: [
          { id: 'col-p', name: 'column_p', isVisible: true },
          { id: 'col-t', name: 'column_t', isVisible: true }
        ] as any,
        authoritativeDataSyncToken: 1,
        authoritativeReapplySeed: 0,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'local' }),
        expect.objectContaining({ rowIndex: 0, colIndex: 1, value: '' })
      ],
      { operationType: 'authoritative_reapply' }
    )
    expect(refs.authoritativePaintCellsRef.current).toBeNull()
  })

  it('skips authoritative sync after snapshot init when workbook already matches viewer rows', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.skipNextAuthoritativeSyncAfterSnapshotInitRef.current = true
    const sheet = { id: 'sheet-1' } as any
    const data = [{ _id: 'row-1', _gridRowIndex: 0, column_p: 'local' }]
    const columns = [{ id: 'col-p', name: 'column_p', isVisible: true }] as any
    const matchingSnapshot = { sheets: { 'sheet-1': { cellData: {} } } }
    refs.getWorkbookSnapshotRef.current = () => matchingSnapshot

    const snapshotMismatchSpy = jest.spyOn(univerAdapter, 'workbookSnapshotMismatchesViewerRows').mockReturnValue(false)

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet,
        data,
        columns,
        authoritativeDataSyncToken: 1,
        authoritativeReapplySeed: 0,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => undefined)
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
    expect(refs.lastProcessedAuthoritativeDataSyncTokenRef.current).toBe(1)
    expect(refs.skipNextAuthoritativeSyncAfterSnapshotInitRef.current).toBe(false)

    snapshotMismatchSpy.mockRestore()
  })

  it('skips authoritative sync while collab bulk apply depth is non-zero', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.collabPersistedBulkApplyDepthRef.current = 1

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_p: 'local', column_t: '' }],
        columns: [{ id: 'col-p', name: 'column_p', isVisible: true }] as any,
        authoritativeDataSyncToken: 1,
        authoritativeReapplySeed: 0,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )
    await waitFor(() => undefined)
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
  })
})
