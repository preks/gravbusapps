import {
  buildCommittedBatchDedupeKey,
  getSpreadsheetDeltaReplayMode,
  normalizeCommittedBatchEnvelope,
  replayDeltasAsCommittedBatches,
  validateCommittedBatchForLiveApply
} from '../spreadsheetCommittedDeltaContract'

describe('spreadsheetCommittedDeltaContract', () => {
  it('normalizes legacy batch_operations data into a committed envelope', () => {
    const batch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 4,
        version: 5,
        data: {
          sheetId: 'sheet-1',
          workbookId: 'workbook-1',
          batchId: 'batch-1',
          actorId: 'user-1',
          operations: [{ type: 'set_range', operationId: 'op-1', data: { cells: [] } }]
        }
      },
      incomingVersion: 5
    })

    expect(batch).toEqual(
      expect.objectContaining({
        sheetId: 'sheet-1',
        workbookId: 'workbook-1',
        batchId: 'batch-1',
        actorId: 'user-1',
        baseVersion: 4,
        appliedVersion: 5,
        payloadSchemaVersion: 1
      })
    )
    expect(batch?.operations[0]).toEqual(
      expect.objectContaining({ type: 'set_range', operationId: 'op-1', baseVersion: 4, appliedVersion: 5 })
    )
  })

  it('allows live apply when local version is already at appliedVersion but content may be missing', () => {
    const batch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 4,
        version: 5,
        data: { sheetId: 'sheet-1', batchId: 'batch-1', operations: [{ type: 'set_range', data: { cells: [] } }] }
      }
    })

    expect(batch).not.toBeNull()
    expect(
      validateCommittedBatchForLiveApply({ batch: batch!, localAppliedVersion: 5, alreadyApplied: false })
    ).toEqual({
      ok: true
    })
  })

  it('requires local version continuity for live apply', () => {
    const batch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 4,
        version: 5,
        data: { sheetId: 'sheet-1', batchId: 'batch-1', operations: [{ type: 'set_range', data: { cells: [] } }] }
      }
    })

    expect(batch).not.toBeNull()
    expect(
      validateCommittedBatchForLiveApply({ batch: batch!, localAppliedVersion: 4, alreadyApplied: false })
    ).toEqual({
      ok: true
    })
    expect(
      validateCommittedBatchForLiveApply({ batch: batch!, localAppliedVersion: 3, alreadyApplied: false })
    ).toEqual({
      ok: false,
      reason: 'version_gap'
    })
    expect(
      validateCommittedBatchForLiveApply({ batch: batch!, localAppliedVersion: 6, alreadyApplied: false })
    ).toEqual({
      ok: false,
      reason: 'stale_version'
    })
  })

  it('builds idempotency keys from version and batch id', () => {
    const batch = normalizeCommittedBatchEnvelope({
      operation: {
        baseVersion: 7,
        version: 8,
        data: { sheetId: 'sheet-1', batchId: 'batch-1', operations: [{ type: 'set_range', data: { cells: [] } }] }
      }
    })

    expect(buildCommittedBatchDedupeKey(batch!)).toBe('sheet-1:8:batch-1')
  })

  it('groups replay deltas by version and batch identity in order', () => {
    const batches = replayDeltasAsCommittedBatches({
      sheetId: 'sheet-1',
      changes: [
        {
          operationType: 'set_cell',
          payload: { cellRef: 'A1', value: 'b' },
          appliedVersion: 6,
          baseVersion: 5,
          operationLogId: 'log-6'
        },
        {
          operationType: 'set_cell',
          payload: { cellRef: 'A2', value: 'a' },
          appliedVersion: 5,
          baseVersion: 4,
          operationLogId: 'log-5'
        },
        {
          operationType: 'insert_row_slots',
          payload: { startGridRowIndex: 1, count: 1 },
          appliedVersion: 6,
          baseVersion: 5,
          operationLogId: 'log-6b'
        }
      ]
    })

    expect(batches.map(batch => batch.appliedVersion)).toEqual([5, 6, 6])
    expect(batches[0]?.operations).toHaveLength(1)
    expect(batches[1]?.operations).toHaveLength(1)
    expect(batches[2]?.operations).toHaveLength(1)
    expect(batches[1]?.batchId).toBe('log-6')
  })

  it('defaults delta replay to enabled with explicit rollback and shadow overrides', () => {
    localStorage.removeItem('gba.spreadsheets.deltaReplay')
    expect(getSpreadsheetDeltaReplayMode()).toBe('enabled')

    localStorage.setItem('gba.spreadsheets.deltaReplay', 'off')
    expect(getSpreadsheetDeltaReplayMode()).toBe('off')

    localStorage.setItem('gba.spreadsheets.deltaReplay', 'shadow')
    expect(getSpreadsheetDeltaReplayMode()).toBe('shadow')

    localStorage.setItem('gba.spreadsheets.deltaReplay', 'unexpected')
    expect(getSpreadsheetDeltaReplayMode()).toBe('enabled')
  })
})
