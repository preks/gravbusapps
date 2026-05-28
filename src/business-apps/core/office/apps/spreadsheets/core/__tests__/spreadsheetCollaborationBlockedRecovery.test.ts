import { SpreadsheetCollaborationBlockedRecoveryTracker } from '../spreadsheetCollaborationBlockedRecovery'
import type { SpreadsheetCommittedBatchEnvelope } from '../spreadsheetCommittedDeltaContract'

const batch = (partial: Partial<SpreadsheetCommittedBatchEnvelope>): SpreadsheetCommittedBatchEnvelope => ({
  sheetId: 'sheet-1',
  workbookId: 'wb-1',
  batchId: 'batch-1',
  actorId: 'user-2',
  baseVersion: 4,
  appliedVersion: 5,
  payloadSchemaVersion: 1,
  operations: [{ type: 'set_range', operationId: 'op-1', data: { cells: [] } }],
  ...partial
})

describe('SpreadsheetCollaborationBlockedRecoveryTracker', () => {
  it('skips duplicate and recently committed local batches', () => {
    const tracker = new SpreadsheetCollaborationBlockedRecoveryTracker()
    expect(
      tracker.resolveBlockedCommittedBatch({
        batch: batch({}),
        reason: 'duplicate',
        knownVersion: 5,
        alreadyApplied: true,
        isRecentLocalBatch: false
      })
    ).toEqual({ kind: 'skip' })
    expect(
      tracker.resolveBlockedCommittedBatch({
        batch: batch({}),
        reason: 'version_gap',
        knownVersion: 3,
        alreadyApplied: false,
        isRecentLocalBatch: true
      })
    ).toEqual({ kind: 'skip' })
  })

  it('escalates unrecoverable reasons to snapshot immediately', () => {
    const tracker = new SpreadsheetCollaborationBlockedRecoveryTracker()
    expect(
      tracker.resolveBlockedCommittedBatch({
        batch: batch({ requiresSnapshot: true }),
        reason: 'requires_snapshot',
        knownVersion: 5,
        alreadyApplied: false,
        isRecentLocalBatch: false
      })
    ).toEqual({ kind: 'snapshot_fallback', reason: 'requires_snapshot' })
  })

  it('refreshes once for missing_version then retries catch-up before snapshot', () => {
    const tracker = new SpreadsheetCollaborationBlockedRecoveryTracker()
    const envelope = batch({ batchId: 'batch-missing' })
    expect(
      tracker.resolveBlockedCommittedBatch({
        batch: envelope,
        reason: 'missing_version',
        knownVersion: null,
        alreadyApplied: false,
        isRecentLocalBatch: false
      })
    ).toEqual({ kind: 'refresh_and_catchup' })
    expect(
      tracker.resolveBlockedCommittedBatch({
        batch: envelope,
        reason: 'missing_version',
        knownVersion: null,
        alreadyApplied: false,
        isRecentLocalBatch: false
      })
    ).toEqual({
      kind: 'catchup',
      catchUpReason: 'version_gap',
      sinceVersion: 4,
      incomingVersion: 5
    })
    expect(
      tracker.resolveBlockedCommittedBatch({
        batch: envelope,
        reason: 'missing_version',
        knownVersion: null,
        alreadyApplied: false,
        isRecentLocalBatch: false
      })
    ).toEqual({ kind: 'snapshot_fallback', reason: 'missing_version' })
  })

  it('requests version_gap catch-up once before snapshot escalation', () => {
    const tracker = new SpreadsheetCollaborationBlockedRecoveryTracker()
    const envelope = batch({ batchId: 'batch-gap' })
    expect(
      tracker.resolveBlockedCommittedBatch({
        batch: envelope,
        reason: 'version_gap',
        knownVersion: 3,
        alreadyApplied: false,
        isRecentLocalBatch: false
      })
    ).toEqual({
      kind: 'catchup',
      catchUpReason: 'version_gap',
      sinceVersion: 3,
      incomingVersion: 5
    })
    expect(
      tracker.resolveBlockedCommittedBatch({
        batch: envelope,
        reason: 'version_gap',
        knownVersion: 3,
        alreadyApplied: false,
        isRecentLocalBatch: false
      })
    ).toEqual({ kind: 'snapshot_fallback', reason: 'version_gap' })
  })

  it('requests stale_version catch-up from batch base before snapshot escalation', () => {
    const tracker = new SpreadsheetCollaborationBlockedRecoveryTracker()
    const envelope = batch({ batchId: 'batch-stale', baseVersion: 6, appliedVersion: 7 })
    expect(
      tracker.resolveBlockedCommittedBatch({
        batch: envelope,
        reason: 'stale_version',
        knownVersion: 8,
        alreadyApplied: false,
        isRecentLocalBatch: false
      })
    ).toEqual({
      kind: 'catchup',
      catchUpReason: 'stale_version_data_op',
      sinceVersion: 6,
      incomingVersion: 7
    })
  })
})
