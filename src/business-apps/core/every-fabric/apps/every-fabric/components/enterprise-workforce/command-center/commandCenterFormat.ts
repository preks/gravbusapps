// Pure formatting helpers for the Live Command Center feed. Kept React-free so
// they're trivially unit-testable.

import type { WorkforceRunCaseRef } from '../workforceTypes'

/** Compact duration from milliseconds, e.g. "<1s", "42s", "3m 5s", "1h 2m". */
export function formatDurationMs(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return null
  if (ms < 1000) return '<1s'
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`
}

/** Elapsed wall-clock since an ISO start, as a coarse "12s"/"3m"/"1h" label. */
export function elapsedSince(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return 'just now'
  const start = Date.parse(iso)
  if (Number.isNaN(start)) return 'just now'
  const seconds = Math.max(0, Math.round((nowMs - start) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  return `${hours}h`
}

/** Short, human label for the case/entity a run acted on. */
export function caseRefLabel(caseRef: WorkforceRunCaseRef | null | undefined): string | null {
  if (!caseRef) return null
  const type = caseRef.entity_type?.trim()
  const id = caseRef.record_id?.trim()
  if (type && id) return `${type} ${id}`
  return id || type || null
}
