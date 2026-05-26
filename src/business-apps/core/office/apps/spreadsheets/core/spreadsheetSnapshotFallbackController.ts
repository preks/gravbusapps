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

export class SpreadsheetSnapshotFallbackController {
  private scheduledKeys = new Set<string>()
  private releaseTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(
    private readonly schedule: SpreadsheetSnapshotFallbackSchedule,
    private readonly coalesceWindowMs = 500
  ) {}

  requestFallback(request: SpreadsheetSnapshotFallbackRequest): boolean {
    const key = `${request.sheetId ?? 'active'}:${request.reason}:${request.immediate === true}`
    if (this.scheduledKeys.has(key)) return false
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
  }
}
