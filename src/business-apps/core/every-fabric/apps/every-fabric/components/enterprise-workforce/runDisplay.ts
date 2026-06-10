// Tiny presentation helpers for Workforce runs. Kept pure (no React,
// no client) so the run UI components stay small and the helpers can
// be unit tested in isolation.

import { parseIsoTimestamp, parseIsoTimestampMs } from '../../utils/renderUtils'
import type { WorkforceRun, WorkforceRunStatus } from './workforceTypes'
import { tokensToCredits } from './workforceTypes'

/** Backend timestamps are UTC; Workforce UI displays them in UTC+2. */
const WORKFORCE_DISPLAY_UTC_OFFSET_MS = 2 * 60 * 60 * 1000

export interface RunStatusVisual {
  label: string
  // Tailwind class fragments applied to the status pill. We avoid
  // hardcoded colors and stick to the design-system semantic tokens.
  pillClass: string
}

const STATUS_VISUALS: Record<WorkforceRunStatus, RunStatusVisual> = {
  pending: {
    label: 'Pending',
    pillClass: 'gba:bg-muted gba:text-muted-foreground'
  },
  running: {
    label: 'Running',
    pillClass: 'gba:bg-primary/10 gba:text-primary'
  },
  waiting_for_human: {
    label: 'Waiting for human',
    pillClass: 'gba:bg-amber-500/15 gba:text-amber-700 gba:dark:text-amber-300'
  },
  completed: {
    label: 'Completed',
    pillClass: 'gba:bg-emerald-500/15 gba:text-emerald-700 gba:dark:text-emerald-300'
  },
  failed: {
    label: 'Failed',
    pillClass: 'gba:bg-destructive/15 gba:text-destructive'
  },
  cancelled: {
    label: 'Cancelled',
    pillClass: 'gba:bg-muted gba:text-muted-foreground'
  },
  escalated: {
    label: 'Escalated',
    pillClass: 'gba:bg-amber-500/15 gba:text-amber-700 gba:dark:text-amber-300'
  },
  budget_paused: {
    label: 'Budget paused',
    pillClass: 'gba:bg-amber-500/15 gba:text-amber-700 gba:dark:text-amber-300'
  },
  filtered: {
    label: 'Filtered',
    pillClass: 'gba:bg-muted gba:text-muted-foreground'
  }
}

export function runStatusVisual(status: WorkforceRunStatus): RunStatusVisual {
  return STATUS_VISUALS[status] ?? STATUS_VISUALS.pending
}

export function readTotalTokens(run: WorkforceRun): number {
  const summary = run.cost_summary
  if (!summary) return 0
  const record = summary as Record<string, unknown>

  const readNum = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null

  // Mirror prompt-manager's credit_breakdown_from_cost_summary: the deep-agent
  // runtime persists the aggregate under "tokens_used", not "total_tokens".
  const direct =
    readNum(record.total_tokens) ??
    readNum(record.totalTokens) ??
    readNum(record.tokens_used) ??
    readNum(record.tokensUsed)

  if (direct !== null && direct > 0) return direct

  const prompt = readNum(record.prompt_tokens) ?? readNum(record.input_tokens) ?? 0
  const completion = readNum(record.completion_tokens) ?? readNum(record.output_tokens) ?? 0
  const fromParts = prompt + completion
  if (fromParts > 0) return fromParts

  return direct !== null ? Math.max(direct, 0) : 0
}

export function runCredits(run: WorkforceRun): number {
  return tokensToCredits(readTotalTokens(run))
}

// Returns a short ``"x min y s"``-style human-readable duration, or
// ``null`` if the run does not have enough timestamps yet.
export function runDurationLabel(run: WorkforceRun, nowIso?: string): string | null {
  const startedAt = run.started_at ?? run.created_at
  if (!startedAt) return null
  // Backend timestamps are naive UTC (no offset); parse via parseIsoTimestamp
  // so they are read as UTC. Using raw Date.parse would treat them as local
  // time and inflate the duration by the viewer's UTC offset.
  const start = parseIsoTimestampMs(startedAt)
  if (start === null) return null
  const end = parseIsoTimestampMs(run.completed_at ?? nowIso) ?? Date.now()
  if (end < start) return null
  const ms = end - start
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

export function shortenInput(input: string, maxLength = 140): string {
  const trimmed = (input || '').trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength - 1)}…`
}

function shiftToWorkforceDisplayTime(iso: string | null | undefined): Date | null {
  const parsed = parseIsoTimestamp(iso)
  if (!parsed) return null
  return new Date(parsed.getTime() + WORKFORCE_DISPLAY_UTC_OFFSET_MS)
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Format a UTC ISO timestamp as ``dd.mm.yyyy, HH:mm:ss`` in UTC+2 (24h). */
export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—'
  const shifted = shiftToWorkforceDisplayTime(iso)
  if (!shifted) return iso
  const day = pad2(shifted.getUTCDate())
  const month = pad2(shifted.getUTCMonth() + 1)
  const year = shifted.getUTCFullYear()
  const hours = pad2(shifted.getUTCHours())
  const minutes = pad2(shifted.getUTCMinutes())
  const seconds = pad2(shifted.getUTCSeconds())
  return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`
}

/** Date-only variant for compact labels (``dd.mm.yyyy`` in UTC+2). */
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—'
  const shifted = shiftToWorkforceDisplayTime(iso)
  if (!shifted) return iso
  const day = pad2(shifted.getUTCDate())
  const month = pad2(shifted.getUTCMonth() + 1)
  const year = shifted.getUTCFullYear()
  return `${day}.${month}.${year}`
}

/** Time-only variant for inline trace rows (``HH:mm:ss`` in UTC+2). */
export function formatTimeOnly(iso: string | null | undefined): string {
  if (!iso) return '—'
  const shifted = shiftToWorkforceDisplayTime(iso)
  if (!shifted) return iso
  const hours = pad2(shifted.getUTCHours())
  const minutes = pad2(shifted.getUTCMinutes())
  const seconds = pad2(shifted.getUTCSeconds())
  return `${hours}:${minutes}:${seconds}`
}

/** Compact label for agent tiles: relative time with UTC+2 date fallback. */
export function formatLastRunLabel(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return 'No runs yet'
  const parsed = parseIsoTimestamp(iso)
  if (!parsed) return 'No runs yet'

  // Elapsed time is timezone-invariant; parse as UTC so naive backend ISO
  // strings are not interpreted in the browser's local zone.
  const diffMs = Math.max(0, nowMs - parsed.getTime())
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  // Day-boundary labels use UTC+2 so "Yesterday" matches local working hours.
  const thenDay = shiftToWorkforceDisplayTime(iso)
  const nowDay = new Date(nowMs + WORKFORCE_DISPLAY_UTC_OFFSET_MS)
  if (thenDay) {
    const calendarDaysApart =
      Date.UTC(nowDay.getUTCFullYear(), nowDay.getUTCMonth(), nowDay.getUTCDate()) -
      Date.UTC(thenDay.getUTCFullYear(), thenDay.getUTCMonth(), thenDay.getUTCDate())
    const daySpan = Math.round(calendarDaysApart / (24 * 60 * 60 * 1000))
    if (daySpan === 1) return 'Yesterday'
    if (daySpan > 1 && daySpan < 7) return `${daySpan}d ago`
    if (daySpan >= 7) return formatDateOnly(iso)
  }

  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return formatDateOnly(iso)
}
