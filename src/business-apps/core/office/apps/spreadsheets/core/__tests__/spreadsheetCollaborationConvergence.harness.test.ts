import { applyCommittedGridRowPlacements } from '../../utils/spreadsheetCommittedGridRowPlacements'
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

    const stale = validateCommittedBatchForLiveApply({
      batch: { ...batchAtNext, appliedVersion: 4 },
      localAppliedVersion: 5,
      alreadyApplied: false
    })
    expect(stale.ok).toBe(false)
    if (!stale.ok) {
      expect(stale.reason).toBe('stale_version')
    }
  })

  it('protects a pending J361-style cell from authoritative repaint at the same version', () => {
    const ownership = new SpreadsheetVersionCausalOwnershipRegistry()
    ownership.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'client_row_9',
      columnName: 'ColumnA',
      baseVersion: 8
    })

    expect(
      ownership.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'client_row_9',
        columnName: 'ColumnA',
        remoteAppliedVersion: 8
      })
    ).toBe(true)

    ownership.markSubmitted('sheet-1', 'client_row_9', 'ColumnA')
    expect(
      ownership.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'client_row_9',
        columnName: 'ColumnA',
        remoteAppliedVersion: 9
      })
    ).toBe(true)

    ownership.markAcknowledged('sheet-1', 'client_row_9', 'ColumnA', 9)
    expect(
      ownership.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'client_row_9',
        columnName: 'ColumnA',
        remoteAppliedVersion: 9
      })
    ).toBe(false)
  })
})
