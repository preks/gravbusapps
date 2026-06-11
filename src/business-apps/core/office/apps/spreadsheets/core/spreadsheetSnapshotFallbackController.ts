export type SpreadsheetSnapshotFallbackReason =
  | 'version_gap'
  | 'stale_version'
  | 'missing_version'
  | 'duplicate_ambiguity'
  | 'invalid_envelope'
  | 'unsupported_payload_schema'
  | 'requires_snapshot'
  | 'unsupported_operation'
  | 'unsupported_workbook_feature'
  | 'planning_failure'
  | 'live_apply_failure'

export type SpreadsheetSnapshotFallbackRequest = {
  sheetId?: string
  reason: SpreadsheetSnapshotFallbackReason
  immediate?: boolean
  detail?: string
}

export type SpreadsheetSnapshotFallbackSchedule = (request: SpreadsheetSnapshotFallbackRequest) => void

const VERSION_RELATED_FALLBACK_REASONS = new Set<SpreadsheetSnapshotFallbackReason>([
  'version_gap',
  'stale_version',
  'missing_version',
  'duplicate_ambiguity',
  'planning_failure',
  'live_apply_failure'
])

export const isVersionRelatedSnapshotFallbackReason = (reason: SpreadsheetSnapshotFallbackReason): boolean =>
  VERSION_RELATED_FALLBACK_REASONS.has(reason)

export class SpreadsheetSnapshotFallbackController {
  private scheduledKeys = new Set<string>()
  private releaseTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private attemptTimesBySheet = new Map<string, number[]>()

  constructor(
    private readonly schedule: SpreadsheetSnapshotFallbackSchedule,
    private readonly coalesceWindowMs = 500,
    private readonly maxAttemptsPerWindow = 10,
    private readonly attemptWindowMs = 10_000
  ) {}

  requestFallback(request: SpreadsheetSnapshotFallbackRequest): boolean {
    const key = `${request.sheetId ?? 'active'}:${request.reason}:${request.immediate === true}`
    if (this.scheduledKeys.has(key)) return false

    const now = Date.now()
    const attemptKey = request.sheetId ?? 'active'
    const recentAttempts = (this.attemptTimesBySheet.get(attemptKey) ?? []).filter(
      attemptedAt => now - attemptedAt <= this.attemptWindowMs
    )
    if (recentAttempts.length >= this.maxAttemptsPerWindow) {
      this.attemptTimesBySheet.set(attemptKey, recentAttempts)
      console.warn('[SpreadsheetAppViewer] snapshot fallback circuit open', {
        sheetId: request.sheetId ?? null,
        reason: request.reason,
        attemptCount: recentAttempts.length,
        attemptWindowMs: this.attemptWindowMs
      })
      return false
    }
    recentAttempts.push(now)
    this.attemptTimesBySheet.set(attemptKey, recentAttempts)

    this.scheduledKeys.add(key)
    this.schedule(request)
    const timer = globalThis.setTimeout(() => {
      this.scheduledKeys.delete(key)
      this.releaseTimers.delete(key)
    }, this.coalesceWindowMs)
    const maybeNodeTimer = timer as { unref?: () => void }
    if (typeof maybeNodeTimer.unref === 'function') {
      maybeNodeTimer.unref()
    }
    this.releaseTimers.set(key, timer)
    return true
  }

  clear(): void {
    for (const timer of this.releaseTimers.values()) {
      clearTimeout(timer)
    }
    this.releaseTimers.clear()
    this.scheduledKeys.clear()
    this.attemptTimesBySheet.clear()
  }
}
