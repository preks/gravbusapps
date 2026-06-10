import { renderHook, waitFor } from '@testing-library/react'

import { useUniverAuthoritativeGridSync } from '../useUniverAuthoritativeGridSync'
import * as univerAdapter from '../../utils/univerAdapter'
import {
  migratePendingLocalMutationProtectionRowHandle,
  protectSpreadsheetPendingLocalMutationCells,
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../../utils/spreadsheetPendingMaterializationCells'

const createStableHookRefs = () => ({
  univerAPIRef: { current: {} as unknown },
  authoritativePaintCellsRef: { current: null as import('../../core').SpreadsheetBulkRemoteCellItem[] | null },
  authoritativePaintMetaRef: { current: null as import('../../core').SpreadsheetBulkRemoteApplyMeta | null },
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
      reason?: string
      pendingLocalFilterPolicy?: import('../../utils/spreadsheetAuthoritativeRegion').PendingLocalFilterPolicy
      preserveStagedDirectPaint?: boolean
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
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
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
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
    )
  })

  it('releases planner protection after an authoritative echo matches the expected signature', async () => {
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
    expect(pendingLocalMutationCellsRef.current.has(protectionKey)).toBe(false)
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'local name' }),
        expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'remote note' })
      ],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
    )
  })

  it('skips full-grid authoritative repaint for column_reorder_local_echo without staged direct paint', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const refs = createStableHookRefs()
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: null,
      preferBulk: true,
      clearAllSignatures: true,
      reason: 'column_reorder_local_echo'
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, name: '=A1', note: 'remote note' }],
        columns: [
          { id: 'col-name', name: 'name', isVisible: true },
          { id: 'col-note', name: 'note', isVisible: true }
        ] as any,
        authoritativeDataSyncToken: 0,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate,
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(refs.lastProcessedAuthoritativeReapplySeedRef.current).toBe(1))
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
  })

  it('defers authoritative repaint while column structure is unhealthy', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const refs = createStableHookRefs()
    const columnStructureStateRef = {
      current: {
        healthy: false,
        pendingInsertedRange: { startIndex: 1, endIndex: 1, columnNames: ['inserted'] },
        expectedColumnsSignature: 'pending'
      }
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, name: 'A1', note: 'B1' }],
        columns: [
          { id: 'col-name', name: 'name', isVisible: true },
          { id: 'col-note', name: 'note', isVisible: true }
        ] as any,
        authoritativeDataSyncToken: 1,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        columnStructureStateRef,
        applyRemoteCellUpdate,
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await Promise.resolve()

    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(refs.lastProcessedAuthoritativeDataSyncTokenRef.current).toBe(0)
    expect(refs.lastProcessedAuthoritativeReapplySeedRef.current).toBe(0)
  })

  it('rebuilds the full viewer state for forced column reorder structural repair after initial sync', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const refs = createStableHookRefs()
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: null,
      preferBulk: true,
      clearAllSignatures: true,
      reason: 'column_reorder_structural_repair',
      pendingLocalFilterPolicy: 'server_authoritative_repair'
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [
          { _id: 'row-1', _gridRowIndex: 0, name: 'A1', note: 'B1' },
          { _id: 'row-2', _gridRowIndex: 1, name: 'A2', note: 'B2' }
        ],
        columns: [
          { id: 'col-name', name: 'name', isVisible: true },
          { id: 'col-note', name: 'note', isVisible: true }
        ] as any,
        authoritativeDataSyncToken: 1,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate,
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'A1' }),
        expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'B1' }),
        expect.objectContaining({ rowIndex: 1, colIndex: 0, value: 'A2' }),
        expect.objectContaining({ rowIndex: 1, colIndex: 1, value: 'B2' })
      ]),
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
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
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
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
    expect(applyRemoteCellUpdate.mock.calls.every(call => call[4]?.skipRemoteEchoRegistration === true)).toBe(true)
  })

  it('falls back to repaint blank cells for forced bounded regions outside the current row extent', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.lastSyncedGridRowCountRef.current = 2
    refs.lastSyncedGridColumnCountRef.current = 1
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: [{ minRow: 2, maxRow: 2, minCol: 0, maxCol: 0 }],
      preferBulk: true,
      clearAllSignatures: false
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [
          { _id: 'row-0', _gridRowIndex: 0, column_m: 'M0' },
          { _id: 'row-1', _gridRowIndex: 1, column_m: 'M1' }
        ],
        columns: [{ id: 'col-m', name: 'column_m', isVisible: true }] as any,
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
      [expect.objectContaining({ rowIndex: 2, colIndex: 0, value: '' })],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
    )
  })

  it('allows server-authoritative row-materialization repair to clear adoption-only protection', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = { current: new Set<string>() }
    protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, [
      {
        key: spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 2, 0),
        ownerId: 'materialization:sheet-1:2:0:column_m',
        kind: 'materialization_adoption'
      }
    ])
    const refs = createStableHookRefs()
    refs.lastSyncedGridRowCountRef.current = 2
    refs.lastSyncedGridColumnCountRef.current = 1
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: [{ minRow: 2, maxRow: 2, minCol: 0, maxCol: 0 }],
      preferBulk: true,
      clearAllSignatures: false,
      reason: 'row_materialization',
      pendingLocalFilterPolicy: 'server_authoritative_repair'
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [
          { _id: 'row-0', _gridRowIndex: 0, column_m: 'M0' },
          { _id: 'row-1', _gridRowIndex: 1, column_m: 'M1' }
        ],
        columns: [{ id: 'col-m', name: 'column_m', isVisible: true }] as any,
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
      [expect.objectContaining({ rowIndex: 2, colIndex: 0, value: '' })],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
    )
    expect(
      pendingLocalMutationCellsRef.current.has(spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 2, 0))
    ).toBe(false)
  })

  it('allows backend dirty-region repair to clear materialization adoption protection for sibling cells', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = { current: new Set<string>() }
    protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, [
      {
        key: spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 2, 0),
        ownerId: 'materialization:sheet-1:2:0:column_m',
        kind: 'materialization_adoption'
      }
    ])
    const refs = createStableHookRefs()
    refs.lastSyncedGridRowCountRef.current = 2
    refs.lastSyncedGridColumnCountRef.current = 2
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: [{ minRow: 2, maxRow: 2, minCol: 0, maxCol: 1 }],
      preferBulk: true,
      clearAllSignatures: false,
      reason: 'dirty_regions_from_backend_materialization',
      pendingLocalFilterPolicy: 'server_authoritative_repair'
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [
          { _id: 'row-0', _gridRowIndex: 0, column_m: 'M0' },
          { _id: 'row-1', _gridRowIndex: 1, column_m: 'M1' }
        ],
        columns: [
          { id: 'col-m', name: 'column_m', isVisible: true },
          { id: 'col-n', name: 'column_n', isVisible: true }
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
    const [items, meta] = applyRemoteCellUpdatesBulk.mock.calls[0] as [
      Array<{ rowIndex: number; colIndex: number; value: unknown }>,
      { operationType: string; skipRemoteEchoRegistration: boolean }
    ]
    expect(meta).toEqual(
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
    )
    expect(items).toEqual([
      expect.objectContaining({ rowIndex: 2, colIndex: 0, value: '' }),
      expect.objectContaining({ rowIndex: 2, colIndex: 1, value: '' })
    ])
  })

  it('keeps same-cell local edit protection active during server-authoritative repair', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = { current: new Set<string>() }
    protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, [
      {
        key: spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 0, 0),
        ownerId: 'queue:sheet-1:coord:0:0'
      }
    ])
    const refs = createStableHookRefs()
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: [{ minRow: 0, maxRow: 0, minCol: 0, maxCol: 1 }],
      preferBulk: true,
      clearAllSignatures: false,
      reason: 'dirty_regions_from_backend_used',
      pendingLocalFilterPolicy: 'server_authoritative_repair'
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'local', column_b: 'repair' }],
        columns: [
          { id: 'col-a', name: 'column_a', isVisible: true },
          { id: 'col-b', name: 'column_b', isVisible: true }
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
      [expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'repair' })],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
    )
    expect(
      pendingLocalMutationCellsRef.current.has(spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 0, 0))
    ).toBe(true)
  })

  it('keeps post-move destination edits protected during move reconciliation', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = { current: new Set<string>() }
    protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, [
      {
        key: spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 21, 1),
        ownerId: 'queue:sheet-1:coord:21:1',
        expectedSignature: 'd:11'
      }
    ])
    const refs = createStableHookRefs()
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: [{ minRow: 18, maxRow: 21, minCol: 0, maxCol: 1 }],
      preferBulk: true,
      clearAllSignatures: false,
      reason: 'cell_range_move_reconcile'
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [
          { _id: 'row-18', _gridRowIndex: 18, column_a: 'moved-a' },
          { _id: 'row-19', _gridRowIndex: 19, column_a: 'moved-b' },
          { _id: 'row-20', _gridRowIndex: 20, column_a: 'moved-c' },
          { _id: 'row-21', _gridRowIndex: 21, column_a: 'moved-d', column_b: 4 }
        ],
        columns: [
          { id: 'col-a', name: 'column_a', isVisible: true },
          { id: 'col-b', name: 'column_b', isVisible: true }
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
    const [items] = applyRemoteCellUpdatesBulk.mock.calls[0] as [
      Array<{ rowIndex: number; colIndex: number; value: unknown }>
    ]
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rowIndex: 18, colIndex: 0, value: 'moved-a' }),
        expect.objectContaining({ rowIndex: 21, colIndex: 0, value: 'moved-d' })
      ])
    )
    expect(items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ rowIndex: 21, colIndex: 1, value: 4 })])
    )
    expect(
      pendingLocalMutationCellsRef.current.has(spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 21, 1))
    ).toBe(true)
  })

  it('paints session-derived cells when authoritativePaintCellsRef is populated', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.authoritativePaintCellsRef.current = [
      { rowIndex: 0, colIndex: 0, value: 'local', rowId: 'row-1', options: { useSenderA1Row: true } },
      { rowIndex: 0, colIndex: 1, value: '', rowId: 'row-1', options: { useSenderA1Row: true } }
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
        expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'local', options: { useSenderA1Row: true } }),
        expect.objectContaining({ rowIndex: 0, colIndex: 1, value: '', options: { useSenderA1Row: true } })
      ],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: false })
    )
    expect(refs.authoritativePaintCellsRef.current).toBeNull()
  })

  it('keeps projector-owned row coordinates after inserted empty rows during authoritative reapply', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.authoritativePaintCellsRef.current = [
      { rowIndex: 1, colIndex: 0, value: 99, rowId: 'inserted-row', options: { useSenderA1Row: true } }
    ]

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [
          { _id: 'row-1', _gridRowIndex: 0, A: '' },
          { _id: 'inserted-row', _gridRowIndex: 1, A: 99 },
          { _id: 'row-2', _gridRowIndex: 2, A: '' }
        ],
        columns: [{ id: 'col-a', name: 'A', isVisible: true }] as any,
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
        expect.objectContaining({
          rowIndex: 1,
          colIndex: 0,
          value: 99,
          rowId: 'inserted-row',
          options: { useSenderA1Row: true }
        })
      ],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: false })
    )
  })

  it('prefers bounded forced repair over wider staged session paint cells in the same sync cycle', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.authoritativePaintCellsRef.current = [
      { rowIndex: 0, colIndex: 0, value: 'left', rowId: 'row-1' },
      { rowIndex: 0, colIndex: 1, value: 'middle', rowId: 'row-1' },
      { rowIndex: 0, colIndex: 2, value: 'right', rowId: 'row-1' }
    ]
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: [{ minRow: 0, maxRow: 0, minCol: 2, maxCol: 2 }],
      preferBulk: true,
      clearAllSignatures: false,
      reason: 'dirty_regions_from_backend_used',
      pendingLocalFilterPolicy: 'server_authoritative_repair'
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'left', column_b: 'middle', column_c: 'right' }],
        columns: [
          { id: 'col-a', name: 'column_a', isVisible: true },
          { id: 'col-b', name: 'column_b', isVisible: true },
          { id: 'col-c', name: 'column_c', isVisible: true }
        ] as any,
        authoritativeDataSyncToken: 1,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [expect.objectContaining({ rowIndex: 0, colIndex: 2, value: 'right' })],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
    )
  })

  it('merges staged direct paint with forced repair remainder when preserveStagedDirectPaint is set', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.authoritativePaintCellsRef.current = [
      { rowIndex: 0, colIndex: 0, value: 'left', rowId: 'row-1' },
      { rowIndex: 0, colIndex: 1, value: 'middle', rowId: 'row-1' }
    ]
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: [{ minRow: 0, maxRow: 0, minCol: 2, maxCol: 2 }],
      preferBulk: true,
      clearAllSignatures: false,
      reason: 'dirty_regions_from_backend_used',
      pendingLocalFilterPolicy: 'server_authoritative_repair',
      preserveStagedDirectPaint: true
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'left', column_b: 'middle', column_c: 'right' }],
        columns: [
          { id: 'col-a', name: 'column_a', isVisible: true },
          { id: 'col-b', name: 'column_b', isVisible: true },
          { id: 'col-c', name: 'column_c', isVisible: true }
        ] as any,
        authoritativeDataSyncToken: 1,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'left' }),
        expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'middle' }),
        expect.objectContaining({ rowIndex: 0, colIndex: 2, value: 'right' })
      ]),
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: false })
    )
  })

  it('restores staged style paint when forced dirty repair filters the projected value lane to zero', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = {
      current: new Set([spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 0, 0)])
    }
    const refs = createStableHookRefs()
    refs.authoritativePaintCellsRef.current = [
      {
        rowIndex: 0,
        colIndex: 0,
        value: undefined,
        rowId: 'row-1',
        options: {
          stylePatch: { set: { s: 'style-1' } },
          targetSheetId: 'sheet-1',
          useSenderA1Row: true
        }
      }
    ]
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: [{ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }],
      preferBulk: true,
      clearAllSignatures: false,
      reason: 'dirty_regions_from_backend_used',
      pendingLocalFilterPolicy: 'server_authoritative_repair',
      preserveStagedDirectPaint: true
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'local' }],
        columns: [{ id: 'col-a', name: 'column_a', isVisible: true }] as any,
        authoritativeDataSyncToken: 1,
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
      [
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 0,
          options: expect.objectContaining({
            stylePatch: { set: { s: 'style-1' } },
            targetSheetId: 'sheet-1',
            useSenderA1Row: true
          })
        })
      ],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: false })
    )
  })

  it('merges staged style paint into full-grid forced repair when preserveStagedDirectPaint is set', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.authoritativePaintCellsRef.current = [
      {
        rowIndex: 0,
        colIndex: 0,
        value: undefined,
        rowId: 'row-1',
        options: {
          stylePatch: { unset: ['s', 'bg'] },
          targetSheetId: 'sheet-1',
          useSenderA1Row: true
        }
      }
    ]
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: null,
      preferBulk: true,
      clearAllSignatures: true,
      reason: 'column_reorder_structural_repair',
      pendingLocalFilterPolicy: 'server_authoritative_repair',
      preserveStagedDirectPaint: true
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'server value', column_b: 'neighbor' }],
        columns: [
          { id: 'col-a', name: 'column_a', isVisible: true },
          { id: 'col-b', name: 'column_b', isVisible: true }
        ] as any,
        authoritativeDataSyncToken: 1,
        authoritativeReapplySeed: 1,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 0,
          value: undefined,
          options: expect.objectContaining({
            stylePatch: { unset: ['s', 'bg'] },
            targetSheetId: 'sheet-1',
            useSenderA1Row: true
          })
        }),
        expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'neighbor' })
      ],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: false })
    )
  })

  it('restores staged value paint when forced repair keeps staged direct paint for the same generation', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = {
      current: new Set([spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 0, 0)])
    }
    const refs = createStableHookRefs()
    refs.authoritativePaintCellsRef.current = [
      {
        rowIndex: 0,
        colIndex: 0,
        value: 'server value',
        rowId: 'row-1'
      }
    ]
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: [{ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }],
      preferBulk: true,
      clearAllSignatures: false,
      reason: 'dirty_regions_from_backend_used',
      pendingLocalFilterPolicy: 'server_authoritative_repair',
      preserveStagedDirectPaint: true
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'local value' }],
        columns: [{ id: 'col-a', name: 'column_a', isVisible: true }] as any,
        authoritativeDataSyncToken: 1,
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
      [
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 0,
          value: 'server value',
          rowId: 'row-1'
        })
      ],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: false })
    )
  })

  it('allows acknowledged value cells through forced repair pending-local filtering', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = {
      current: new Set([spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'row-1', 'column_a')])
    }
    const refs = createStableHookRefs()
    refs.authoritativePaintMetaRef.current = {
      operationType: 'set_range',
      acknowledgedCellKeys: ['row-1\u0000column_a']
    }
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: [{ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }],
      preferBulk: true,
      clearAllSignatures: false,
      reason: 'dirty_regions_from_backend_used'
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0, column_a: 'server value' }],
        columns: [{ id: 'col-a', name: 'column_a', isVisible: true }] as any,
        authoritativeDataSyncToken: 1,
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
      [
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 0,
          rowId: 'row-1',
          value: 'server value'
        })
      ],
      expect.objectContaining({
        operationType: 'set_range',
        acknowledgedCellKeys: ['row-1\u0000column_a'],
        skipRemoteEchoRegistration: true
      })
    )
  })

  it('does not fall back to a full-grid repaint on token-only syncs without a staged diff', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    const baseProps = {
      sheet: { id: 'sheet-1' } as any,
      data: [{ _id: 'row-1', _gridRowIndex: 0, column_p: 'local' }],
      columns: [{ id: 'col-p', name: 'column_p', isVisible: true }] as any,
      authoritativeReapplySeed: 0,
      collabBulkApplyIdleNonce: 0,
      applyRemoteCellUpdate: jest.fn(),
      applyRemoteCellUpdatesBulk,
      ...refs
    }

    const { rerender } = renderHook(
      ({ authoritativeDataSyncToken }) =>
        useUniverAuthoritativeGridSync({
          ...baseProps,
          authoritativeDataSyncToken
        }),
      {
        initialProps: { authoritativeDataSyncToken: 1 }
      }
    )

    await waitFor(() => undefined)
    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()

    applyRemoteCellUpdatesBulk.mockClear()
    rerender({ authoritativeDataSyncToken: 2 })
    await waitFor(() => undefined)

    expect(applyRemoteCellUpdatesBulk).not.toHaveBeenCalled()
  })

  it('paints only the union of token-driven multi-region sync targets and not the gap between them', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.pendingAuthoritativeRegionRef.current = [
      { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 },
      { minRow: 0, maxRow: 0, minCol: 2, maxCol: 2 }
    ]

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'left', column_b: 'gap', column_c: 'right' }],
        columns: [
          { id: 'col-a', name: 'column_a', isVisible: true },
          { id: 'col-b', name: 'column_b', isVisible: true },
          { id: 'col-c', name: 'column_c', isVisible: true }
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
        expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'left' }),
        expect.objectContaining({ rowIndex: 0, colIndex: 2, value: 'right' })
      ],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
    )
    const [items] = applyRemoteCellUpdatesBulk.mock.calls[0] as [
      Array<{ rowIndex: number; colIndex: number; value: unknown }>
    ]
    expect(items).toHaveLength(2)
    expect(items.some(item => item.colIndex === 1)).toBe(false)
  })

  it('prefers prepared bounded region sync over wider session paint cells during non-forced repaint', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.pendingAuthoritativeRegionRef.current = [{ minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 }]
    refs.authoritativePaintCellsRef.current = [
      { rowIndex: 0, colIndex: 0, value: 'left', rowId: 'row-1' },
      { rowIndex: 0, colIndex: 1, value: 'wide-gap', rowId: 'row-1' },
      { rowIndex: 0, colIndex: 2, value: 'wide-right', rowId: 'row-1' }
    ]

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'left', column_b: 'gap', column_c: 'right' }],
        columns: [
          { id: 'col-a', name: 'column_a', isVisible: true },
          { id: 'col-b', name: 'column_b', isVisible: true },
          { id: 'col-c', name: 'column_c', isVisible: true }
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
      [expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'left' })],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
    )
    const [items] = applyRemoteCellUpdatesBulk.mock.calls[0] as [
      Array<{ rowIndex: number; colIndex: number; value: unknown }>
    ]
    expect(items).toHaveLength(1)
    expect(items.some(item => item.colIndex === 1 || item.colIndex === 2)).toBe(false)
  })

  it('keeps semantic protection after row-handle migration to a backend id', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const pendingLocalMutationCellsRef = {
      current: new Set([spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'client-row-1', 'name')])
    }
    protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, [
      {
        key: spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'client-row-1', 'name'),
        ownerId: 'plan:migrate:name',
        expectedSignature: 's:stale name'
      }
    ])
    migratePendingLocalMutationProtectionRowHandle(
      pendingLocalMutationCellsRef,
      'sheet-1',
      'client-row-1',
      'backend-row-1'
    )
    const refs = createStableHookRefs()
    refs.pendingForcedAuthoritativeReapplyRef.current = {
      regions: null,
      preferBulk: true,
      clearAllSignatures: true
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [
          {
            _id: 'backend-row-1',
            _rowUuid: 'backend-row-1',
            _clientRowId: 'client-row-1',
            _gridRowIndex: 0,
            name: 'stale name',
            note: 'remote note'
          }
        ],
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
    expect(
      pendingLocalMutationCellsRef.current.has(
        spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'client-row-1', 'name')
      )
    ).toBe(false)
    expect(
      pendingLocalMutationCellsRef.current.has(
        spreadsheetPendingLocalMutationSemanticCellKey('sheet-1', 'backend-row-1', 'name')
      )
    ).toBe(false)
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'stale name' }),
        expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'remote note' })
      ],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
    )
  })

  it('runs authoritative apply completion after the projector paint finishes', async () => {
    const onApplyComplete = jest.fn()
    const applyRemoteCellUpdatesBulk = jest.fn((_items, meta) => meta?.onApplyComplete?.())
    const refs = createStableHookRefs()
    refs.authoritativePaintCellsRef.current = [{ rowIndex: 0, colIndex: 0, value: 'local', rowId: 'row-1' }]
    refs.authoritativePaintMetaRef.current = {
      operationType: 'cells_changed',
      onApplyComplete
    }

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_p: 'local' }],
        columns: [{ id: 'col-p', name: 'column_p', isVisible: true }] as any,
        authoritativeDataSyncToken: 1,
        authoritativeReapplySeed: 0,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(onApplyComplete).toHaveBeenCalledTimes(1))
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'local' })],
      expect.objectContaining({
        operationType: 'cells_changed',
        onApplyComplete,
        skipRemoteEchoRegistration: false
      })
    )
    expect(refs.authoritativePaintMetaRef.current).toBeNull()
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

    const snapshotMismatchSpy = jest
      .spyOn(univerAdapter, 'workbookSnapshotConflictsWithViewerRows')
      .mockReturnValue(false)

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

  it('skips authoritative sync after snapshot init when workbook only has extra snapshot-only cells', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.skipNextAuthoritativeSyncAfterSnapshotInitRef.current = true
    const sheet = { id: 'sheet-1' } as any
    const data = [{ _id: 'row-1', _gridRowIndex: 0, column_p: 'local' }]
    const columns = [{ id: 'col-p', name: 'column_p', isVisible: true }] as any
    refs.getWorkbookSnapshotRef.current = () => ({
      sheets: {
        'sheet-1': {
          cellData: {
            0: {
              0: { v: 'local' },
              1: { v: 'snapshot-only', bg: { rgb: '#ffee58' } }
            }
          }
        }
      }
    })

    const snapshotConflictSpy = jest
      .spyOn(univerAdapter, 'workbookSnapshotConflictsWithViewerRows')
      .mockReturnValue(false)
    const trackingHeaderSpy = jest
      .spyOn(univerAdapter, 'snapshotTrackingHeaderMatchesColumnLabels')
      .mockReturnValue(true)

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
    expect(refs.skipNextAuthoritativeSyncAfterSnapshotInitRef.current).toBe(false)

    trackingHeaderSpy.mockRestore()
    snapshotConflictSpy.mockRestore()
  })

  it('does not skip authoritative sync after snapshot init when tracking headers are stale', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const applyRemoteCellUpdate = jest.fn()
    const refs = createStableHookRefs()
    refs.skipNextAuthoritativeSyncAfterSnapshotInitRef.current = true
    const sheet = { id: 'sheet-1' } as any
    const data = [{ _id: 'row-1', _gridRowIndex: 0, column_p: 'local' }]
    const columns = [{ id: 'col-p', name: 'column_p', isVisible: true }] as any
    const matchingSnapshot = { sheets: { 'sheet-1': { cellData: {} } } }
    refs.getWorkbookSnapshotRef.current = () => matchingSnapshot

    const snapshotMismatchSpy = jest
      .spyOn(univerAdapter, 'workbookSnapshotConflictsWithViewerRows')
      .mockReturnValue(false)
    const trackingHeaderSpy = jest
      .spyOn(univerAdapter, 'snapshotTrackingHeaderMatchesColumnLabels')
      .mockReturnValue(false)

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet,
        data,
        columns,
        authoritativeDataSyncToken: 1,
        authoritativeReapplySeed: 0,
        collabBulkApplyIdleNonce: 0,
        applyRemoteCellUpdate,
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(refs.skipNextAuthoritativeSyncAfterSnapshotInitRef.current).toBe(false))
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [expect.objectContaining({ rowIndex: 0, colIndex: 0, value: 'local', rowId: 'row-1' })],
      expect.objectContaining({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
    )
    expect(applyRemoteCellUpdate).not.toHaveBeenCalled()
    expect(refs.lastProcessedAuthoritativeDataSyncTokenRef.current).toBe(1)
    expect(refs.skipNextAuthoritativeSyncAfterSnapshotInitRef.current).toBe(false)

    trackingHeaderSpy.mockRestore()
    snapshotMismatchSpy.mockRestore()
  })

  it('applies pending bootstrap style repair through the stylePatch lane', async () => {
    const applyRemoteCellUpdatesBulk = jest.fn()
    const refs = createStableHookRefs()
    refs.skipNextAuthoritativeSyncAfterSnapshotInitRef.current = true
    refs.getWorkbookSnapshotRef.current = () => ({ sheets: { 'sheet-1': { cellData: {} } } })
    const snapshotMismatchSpy = jest
      .spyOn(univerAdapter, 'workbookSnapshotConflictsWithViewerRows')
      .mockReturnValue(false)
    const trackingHeaderSpy = jest
      .spyOn(univerAdapter, 'snapshotTrackingHeaderMatchesColumnLabels')
      .mockReturnValue(true)

    renderHook(() =>
      useUniverAuthoritativeGridSync({
        sheet: { id: 'sheet-1' } as any,
        data: [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'local' }],
        columns: [{ id: 'col-a', name: 'column_a', isVisible: true }] as any,
        authoritativeDataSyncToken: 1,
        authoritativeReapplySeed: 0,
        collabBulkApplyIdleNonce: 0,
        pendingBootstrapStyleRepair: {
          sheetId: 'sheet-1',
          snapshot: {
            sheetOrder: ['sheet-1'],
            sheets: {
              'sheet-1': {
                id: 'sheet-1',
                cellData: {
                  0: { 0: { s: 'style-1' } }
                }
              }
            },
            styles: { 'style-1': { bg: { rgb: '#ffff00' } } }
          },
          formattingSource: 'remote',
          formattingScore: 1,
          nonce: 1
        },
        applyRemoteCellUpdate: jest.fn(),
        applyRemoteCellUpdatesBulk,
        ...refs
      })
    )

    await waitFor(() => expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledTimes(1))
    expect(applyRemoteCellUpdatesBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          rowIndex: 0,
          colIndex: 0,
          rowId: 'row-1',
          options: expect.objectContaining({
            stylePatch: { set: { s: 'style-1' } },
            targetSheetId: 'sheet-1',
            skipRemoteEchoRegistration: true,
            univerStyles: { 'style-1': { bg: { rgb: '#ffff00' } } }
          })
        })
      ],
      expect.objectContaining({ operationType: 'bootstrap_style_repair', skipRemoteEchoRegistration: true })
    )

    trackingHeaderSpy.mockRestore()
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
