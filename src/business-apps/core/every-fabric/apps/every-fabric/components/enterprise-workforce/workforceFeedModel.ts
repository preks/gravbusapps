// Pure model for the Live Command Center feed.
//
// Merges the live active runs and the just-finished runs from a single
// active-overview snapshot into one chronological, capped feed, and derives a
// rolling last-hour throughput from observed completions. Kept free of React
// so it can be unit-tested without a DOM and reused by the hook + components.

import type {
  WorkforceActiveOverview,
  WorkforceActiveRun,
  WorkforceRecentRun,
  WorkforceRunCaseRef,
  WorkforceRunSource,
  WorkforceRunStatus,
  WorkforceTriggerSummary
} from './workforceTypes'

export type WorkforceFeedKind = 'active' | 'finished'

export interface WorkforceFeedItem {
  key: string
  kind: WorkforceFeedKind
  /** Run/session id this item points to (used to deep-link to the run). */
  sessionId: string
  agentId: string
  displayName: string | null
  status: WorkforceRunStatus
  source: WorkforceRunSource | null
  trigger: WorkforceTriggerSummary | null
  timestamp: string | null
  currentActivity: string | null
  durationMs: number | null
  credits: number | null
  caseRef: WorkforceRunCaseRef | null
  isNew: boolean
}

const FEED_CAP = 30
const HOUR_MS = 60 * 60 * 1000
const BUCKET_MS = 5 * 60 * 1000
const BUCKET_COUNT = 12

function tsMs(iso: string | null): number {
  if (!iso) return 0
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? 0 : parsed
}

function finishedItem(run: WorkforceRecentRun): WorkforceFeedItem {
  return {
    key: run.session_id,
    kind: 'finished',
    sessionId: run.session_id,
    agentId: run.agent_id,
    displayName: run.display_name ?? null,
    status: run.status,
    source: run.source ?? null,
    trigger: run.trigger ?? null,
    timestamp: run.completed_at ?? run.started_at ?? null,
    currentActivity: null,
    durationMs: run.duration_ms ?? null,
    credits: run.credits ?? null,
    caseRef: run.case_ref ?? null,
    isNew: false
  }
}

function activeItem(run: WorkforceActiveRun, isNew: boolean): WorkforceFeedItem {
  return {
    key: run.session_id,
    kind: 'active',
    sessionId: run.session_id,
    agentId: run.agent_id,
    displayName: run.display_name ?? null,
    status: run.status,
    source: run.source ?? null,
    trigger: run.trigger ?? null,
    timestamp: run.started_at ?? run.updated_at ?? null,
    currentActivity: run.current_activity ?? null,
    durationMs: null,
    credits: null,
    caseRef: null,
    isNew
  }
}

/**
 * Build the merged, capped, newest-first feed from an overview snapshot.
 * ``newActiveIds`` flags runs that appeared since the previous snapshot so the
 * UI can animate "just started" items.
 */
export function buildFeed(
  overview: WorkforceActiveOverview | null,
  newActiveIds: ReadonlySet<string>
): WorkforceFeedItem[] {
  if (!overview) return []
  const recent = overview.recent_completed ?? []
  const finishedIds = new Set(recent.map(run => run.session_id))
  const items: WorkforceFeedItem[] = recent.map(finishedItem)

  for (const run of overview.runs ?? []) {
    // A run that already shows up as finished should not double as active.
    if (finishedIds.has(run.session_id)) continue
    items.push(activeItem(run, newActiveIds.has(run.session_id)))
  }

  items.sort((a, b) => tsMs(b.timestamp) - tsMs(a.timestamp))
  return items.slice(0, FEED_CAP)
}

export interface ThroughputSnapshot {
  count: number
  /** Per-5-minute completion counts over the last hour, oldest first. */
  buckets: number[]
}

/**
 * Fold newly-observed completions into the rolling history map (mutated in
 * place), prune anything older than an hour, and return the last-hour count
 * plus a per-bucket sparkline series.
 */
export function foldThroughput(
  history: Map<string, number>,
  recent: readonly WorkforceRecentRun[],
  nowMs: number
): ThroughputSnapshot {
  for (const run of recent) {
    const completed = run.completed_at ? Date.parse(run.completed_at) : NaN
    if (!Number.isNaN(completed)) history.set(run.session_id, completed)
  }

  const cutoff = nowMs - HOUR_MS
  for (const [key, completedAt] of history) {
    if (completedAt < cutoff) history.delete(key)
  }

  const buckets = new Array<number>(BUCKET_COUNT).fill(0)
  for (const completedAt of history.values()) {
    const age = nowMs - completedAt
    const idx = Math.min(BUCKET_COUNT - 1, Math.max(0, Math.floor(age / BUCKET_MS)))
    // Oldest bucket on the left, newest on the right.
    buckets[BUCKET_COUNT - 1 - idx] += 1
  }

  return { count: history.size, buckets }
}
