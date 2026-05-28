import type { SpreadsheetSnapshotFallbackReason } from './spreadsheetSnapshotFallbackController'
import type { SpreadsheetCommittedBatchEnvelope } from './spreadsheetCommittedDeltaContract'

export type CommittedBatchBlockReason =
  | 'invalid_envelope'
  | 'unsupported_payload_schema'
  | 'requires_snapshot'
  | 'missing_version'
  | 'version_gap'
  | 'stale_version'
  | 'duplicate'

export type BlockedRecoveryAction =
  | { kind: 'skip' }
  | {
      kind: 'catchup'
      catchUpReason: 'version_gap' | 'stale_version_data_op'
      sinceVersion: number
      incomingVersion: number
    }
  | { kind: 'refresh_and_catchup' }
  | { kind: 'snapshot_fallback'; reason: SpreadsheetSnapshotFallbackReason }

const RECOVERY_TTL_MS = 15_000

const recoverableCatchUpReasons = new Set<CommittedBatchBlockReason>([
  'missing_version',
  'version_gap',
  'stale_version'
])

const immediateSnapshotReasons = new Set<CommittedBatchBlockReason>([
  'requires_snapshot',
  'unsupported_payload_schema',
  'invalid_envelope'
])

const recoveryKey = (sheetId: string, batchId: string | undefined, reason: CommittedBatchBlockReason): string =>
  `${sheetId}:${batchId ?? 'no-batch'}:${reason}`

type RecoveryAttempt = {
  refreshUsed: boolean
  catchUpUsed: boolean
  at: number
}

/**
 * Tracks bounded recovery attempts for blocked committed batches so repeated
 * websocket echoes do not schedule catch-up storms.
 */
export class SpreadsheetCollaborationBlockedRecoveryTracker {
  private readonly attempts = new Map<string, RecoveryAttempt>()

  private pruneExpired(now = Date.now()): void {
    for (const [key, attempt] of this.attempts) {
      if (now - attempt.at > RECOVERY_TTL_MS) {
        this.attempts.delete(key)
      }
    }
  }

  resolveBlockedCommittedBatch(params: {
    batch: SpreadsheetCommittedBatchEnvelope
    reason: CommittedBatchBlockReason
    knownVersion: number | null
    alreadyApplied: boolean
    isRecentLocalBatch: boolean
  }): BlockedRecoveryAction {
    const { batch, reason, knownVersion, alreadyApplied, isRecentLocalBatch } = params
    if (reason === 'duplicate' || alreadyApplied) {
      return { kind: 'skip' }
    }
    if (isRecentLocalBatch) {
      return { kind: 'skip' }
    }
    if (immediateSnapshotReasons.has(reason)) {
      return { kind: 'snapshot_fallback', reason }
    }
    if (!recoverableCatchUpReasons.has(reason)) {
      return { kind: 'snapshot_fallback', reason: 'planning_failure' }
    }

    const now = Date.now()
    this.pruneExpired(now)
    const key = recoveryKey(batch.sheetId, batch.batchId, reason)
    const attempt = this.attempts.get(key) ?? { refreshUsed: false, catchUpUsed: false, at: now }

    if (reason === 'missing_version') {
      if (!attempt.refreshUsed) {
        this.attempts.set(key, { ...attempt, refreshUsed: true, at: now })
        return { kind: 'refresh_and_catchup' }
      }
      if (!attempt.catchUpUsed) {
        this.attempts.set(key, { ...attempt, catchUpUsed: true, at: now })
        return {
          kind: 'catchup',
          catchUpReason: 'version_gap',
          sinceVersion: Math.max(0, batch.baseVersion),
          incomingVersion: batch.appliedVersion
        }
      }
      return { kind: 'snapshot_fallback', reason: 'missing_version' }
    }

    if (reason === 'version_gap') {
      if (!attempt.catchUpUsed) {
        this.attempts.set(key, { ...attempt, catchUpUsed: true, at: now })
        return {
          kind: 'catchup',
          catchUpReason: 'version_gap',
          sinceVersion: Math.max(0, knownVersion ?? 0),
          incomingVersion: batch.appliedVersion
        }
      }
      return { kind: 'snapshot_fallback', reason: 'version_gap' }
    }

    if (reason === 'stale_version') {
      if (!attempt.catchUpUsed) {
        this.attempts.set(key, { ...attempt, catchUpUsed: true, at: now })
        return {
          kind: 'catchup',
          catchUpReason: 'stale_version_data_op',
          sinceVersion: Math.max(0, batch.baseVersion),
          incomingVersion: batch.appliedVersion
        }
      }
      return { kind: 'snapshot_fallback', reason: 'stale_version' }
    }

    return { kind: 'snapshot_fallback', reason: 'planning_failure' }
  }
}
