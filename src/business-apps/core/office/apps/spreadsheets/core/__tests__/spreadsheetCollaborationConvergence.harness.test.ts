import { applyCommittedGridRowPlacements } from '../../utils/spreadsheetCommittedGridRowPlacements'
import { applySpreadsheetSessionDeltaChangesToRows } from '../spreadsheetSessionDeltaApply'
import { SpreadsheetVersionCausalOwnershipRegistry } from '../spreadsheetVersionCausalOwnership'
import { validateCommittedBatchForLiveApply } from '../spreadsheetCommittedDeltaContract'

/**
 * Deterministic multi-step convergence checks for the identity protocol.
 * Simulates two clients applying BE identity-keyed placements in version order.
 */
describe('spreadsheetCollaborationConvergence harness', () => {
  it('converges row placements when peers apply the same version-ordered maps', () => {
    const clientA = [{ _rowUuid: 'row-1', _gridRowIndex: 0, A: 'a' }]
    const clientB = [{ _rowUuid: 'row-1', _gridRowIndex: 0, A: 'a' }]

    const v2 = { 'row-1': 2 }
    const v3 = { 'row-1': 5, 'row-2': 6 }

    const afterV2A = applyCommittedGridRowPlacements(clientA, v2)
    const afterV2B = applyCommittedGridRowPlacements(clientB, v2)
    const afterV3A = applyCommittedGridRowPlacements(afterV2A, v3)
    const afterV3B = applyCommittedGridRowPlacements(afterV2B, v3)

    expect(afterV3A).toEqual(afterV3B)
    expect(afterV3A[0]._gridRowIndex).toBe(5)
  })

  it('gates live WS apply at knownVersion + 1 and routes gaps to catch-up', () => {
    const batchAtNext = {
      sheetId: 's1',
      baseVersion: 4,
      appliedVersion: 5,
      operations: [{ type: 'set_cell', data: {} }],
      payloadSchemaVersion: 1
    }

    expect(
      validateCommittedBatchForLiveApply({
        batch: batchAtNext,
        localAppliedVersion: 4,
        alreadyApplied: false
      })
    ).toEqual({ ok: true })

    const gap = validateCommittedBatchForLiveApply({
      batch: { ...batchAtNext, appliedVersion: 6 },
      localAppliedVersion: 4,
      alreadyApplied: false
    })
    expect(gap.ok).toBe(false)
    if (!gap.ok) {
      expect(gap.reason).toBe('version_gap')
    }

    const latePeer = validateCommittedBatchForLiveApply({
      batch: { ...batchAtNext, appliedVersion: 4 },
      localAppliedVersion: 5,
      alreadyApplied: false
    })
    expect(latePeer).toEqual({ ok: true })
  })

  it('folds interleaved peer set_cell ops into session rows (last write per cell)', () => {
    const rows = [{ _id: 'row-1', _rowUuid: 'row-1', A: 'local', B: 'local-b' }]
    const afterPeerA = applySpreadsheetSessionDeltaChangesToRows(rows, [
      {
        operationType: 'set_cell',
        payload: { rowId: 'row-1', columnName: 'A', value: 'peer-a' }
      }
    ])
    const afterPeerB = applySpreadsheetSessionDeltaChangesToRows(afterPeerA, [
      {
        operationType: 'set_cell',
        payload: { rowId: 'row-1', columnName: 'B', value: 'peer-b' }
      }
    ])

    expect(afterPeerB[0]).toEqual({
      _id: 'row-1',
      _rowUuid: 'row-1',
      A: 'peer-a',
      B: 'peer-b'
    })
  })

  it('converges a same-cell two-writer race: loser folds rejected_conflict serverState', () => {
    // Both clients start from the same base value.
    const clientA = [{ _id: 'row-1', _rowUuid: 'row-1', A: 'base' }]
    const clientB = [{ _id: 'row-1', _rowUuid: 'row-1', A: 'base' }]

    // Client A optimistically writes its own value into its session.
    const clientAOptimistic = applySpreadsheetSessionDeltaChangesToRows(clientA, [
      { operationType: 'set_cell', payload: { rowId: 'row-1', columnName: 'A', value: 'a-wins-locally' } }
    ])
    expect(clientAOptimistic[0].A).toBe('a-wins-locally')

    // Server serializes the race: client B's write is accepted; client A's
    // overlapping write comes back as rejected_conflict carrying serverState.
    const serverWonValue = 'b-wins'
    const clientBAfterAccept = applySpreadsheetSessionDeltaChangesToRows(clientB, [
      { operationType: 'set_cell', payload: { rowId: 'row-1', columnName: 'A', value: serverWonValue } }
    ])

    // Client A paints the rejected_conflict serverState as a remote fold
    // (mirrors useSpreadsheetMutationPipeline.applyMutationToSession).
    const rejectedServerState = [{ rowId: 'row-1', columnName: 'A', field: 'value', value: serverWonValue }]
    const clientAConverged = applySpreadsheetSessionDeltaChangesToRows(
      clientAOptimistic,
      rejectedServerState
        .filter(cell => cell.field === 'value')
        .map(cell => ({
          operationType: 'set_cell' as const,
          payload: { rowId: cell.rowId, columnName: cell.columnName, value: cell.value }
        }))
    )

    expect(clientAConverged[0].A).toBe(serverWonValue)
    expect(clientBAfterAccept[0].A).toBe(serverWonValue)
    expect(clientAConverged[0].A).toBe(clientBAfterAccept[0].A)
  })

  it('converges an interleaved two-client paste (add_rows + set_range) with no cell loss', () => {
    // Phase 2 (p2-harness-paste-rows): two logical clients each paste a block that creates
    // rows AND fills cells, interleaved. The server serializes both pastes and broadcasts the
    // same committed stream to every peer. We assert both peers converge on identical cell
    // content (no value lost when a client handle materializes to a UUID) and identical row
    // order once the committed grid placements are applied.
    const base = [{ _id: 'row-1', _rowUuid: 'row-1', A: 'x', B: 'y' }]

    // Client A optimistically pasted a 2-row block (client handles + values).
    const clientAOptimistic = [
      ...base,
      { _id: 'client_a1', A: 'pa1', B: 'pb1' },
      { _id: 'client_a2', A: 'pa2', B: 'pb2' }
    ]
    // Client B optimistically pasted a 1-row block (client handle + value).
    const clientBOptimistic = [...base, { _id: 'client_b1', A: 'pb-a' }]

    // Server-serialized committed stream broadcast to all peers, in version order:
    // A.add_rows → A.set_range (on materialized UUIDs) → B.add_rows → B.set_range.
    const committedStream = [
      {
        operationType: 'add_rows',
        result: {
          rows: [
            { id: 'uuid-a1', data: { _clientRowId: 'client_a1' } },
            { id: 'uuid-a2', data: { _clientRowId: 'client_a2' } }
          ]
        }
      },
      {
        operationType: 'set_range',
        payload: {
          cells: [
            { rowId: 'uuid-a1', columnName: 'A', value: 'pa1' },
            { rowId: 'uuid-a1', columnName: 'B', value: 'pb1' },
            { rowId: 'uuid-a2', columnName: 'A', value: 'pa2' },
            { rowId: 'uuid-a2', columnName: 'B', value: 'pb2' }
          ]
        }
      },
      {
        operationType: 'add_rows',
        result: { rows: [{ id: 'uuid-b1', data: { _clientRowId: 'client_b1' } }] }
      },
      {
        operationType: 'set_range',
        payload: { cells: [{ rowId: 'uuid-b1', columnName: 'A', value: 'pb-a' }] }
      }
    ]

    const convergedA = applySpreadsheetSessionDeltaChangesToRows(clientAOptimistic, committedStream)
    const convergedB = applySpreadsheetSessionDeltaChangesToRows(clientBOptimistic, committedStream)

    // Cell content converges regardless of which paste was locally optimistic.
    const cellContentByUuid = (rows: typeof convergedA): Record<string, { A: unknown; B: unknown }> =>
      Object.fromEntries(rows.map(row => [String(row._rowUuid ?? row._id), { A: row.A, B: row.B }]))
    expect(cellContentByUuid(convergedA)).toEqual(cellContentByUuid(convergedB))

    // No cell loss: every pasted value survives, keyed by the materialized UUID; base intact.
    expect(cellContentByUuid(convergedA)).toEqual({
      'row-1': { A: 'x', B: 'y' },
      'uuid-a1': { A: 'pa1', B: 'pb1' },
      'uuid-a2': { A: 'pa2', B: 'pb2' },
      'uuid-b1': { A: 'pb-a', B: undefined }
    })

    // Exactly base + 2 (A) + 1 (B) rows; no duplicate handles linger.
    expect(convergedA).toHaveLength(4)
    expect(convergedB).toHaveLength(4)

    // Row ORDER converges once the BE-committed grid placements are applied: both peers sort
    // identically by `_gridRowIndex` ("GET sheet matches grid").
    const placements = { 'row-1': 0, 'uuid-a1': 1, 'uuid-a2': 2, 'uuid-b1': 3 }
    const sortByGridIndex = (rows: typeof convergedA): typeof convergedA =>
      [...applyCommittedGridRowPlacements(rows, placements)].sort(
        (left, right) => Number(left._gridRowIndex) - Number(right._gridRowIndex)
      )
    const orderedA = sortByGridIndex(convergedA)
    const orderedB = sortByGridIndex(convergedB)
    expect(orderedA.map(row => String(row._rowUuid ?? row._id))).toEqual(['row-1', 'uuid-a1', 'uuid-a2', 'uuid-b1'])
    expect(cellContentByUuid(orderedA)).toEqual(cellContentByUuid(orderedB))
  })

  it('does not suppress peer paint via version-causal ownership registry', () => {
    const ownership = new SpreadsheetVersionCausalOwnershipRegistry()
    ownership.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'client_row_9',
      columnName: 'ColumnA',
      baseVersion: 8
    })
    ownership.markSubmitted('sheet-1', 'client_row_9', 'ColumnA')

    expect(
      ownership.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'client_row_9',
        columnName: 'ColumnA',
        remoteAppliedVersion: 8
      })
    ).toBe(false)
  })
})
