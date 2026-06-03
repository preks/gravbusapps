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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true }
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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true }
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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true }
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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true }
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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true }
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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true }
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
    expect(meta).toEqual({ operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true })
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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true }
    )
    expect(
      pendingLocalMutationCellsRef.current.has(spreadsheetPendingLocalMutationCoordinateCellKey('sheet-1', 0, 0))
    ).toBe(true)
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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: false }
    )
    expect(refs.authoritativePaintCellsRef.current).toBeNull()
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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true }
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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true }
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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true }
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
      { operationType: 'authoritative_reapply', skipRemoteEchoRegistration: true }
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
