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
  // True for a completed run whose triggered flow is paused on a human approval;
  // drives the uniform "Awaiting approval" badge in the feed.
  pendingFlowApproval: boolean
}

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
    isNew: false,
    pendingFlowApproval: false
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
    isNew,
    pendingFlowApproval: Boolean(run.pending_flow_approval)
  }
}

// A completed run whose triggered flow is paused on a human approval. Rendered
// as a "finished" card (badge, not pulsing dot) but flagged so the badge reads
// "Awaiting approval" and the activity line shows the pending question.
function flowPendingItem(run: WorkforceActiveRun): WorkforceFeedItem {
  return {
    key: run.session_id,
    kind: 'finished',
    sessionId: run.session_id,
    agentId: run.agent_id,
    displayName: run.display_name ?? null,
    status: run.status,
    source: run.source ?? null,
    trigger: run.trigger ?? null,
    timestamp: run.updated_at ?? run.started_at ?? null,
    currentActivity: run.pending_human_question ?? null,
    durationMs: null,
    credits: null,
    caseRef: null,
    isNew: false,
    pendingFlowApproval: true
  }
}

/**
 * Build the merged, newest-first feed from an overview snapshot.
 * ``newActiveIds`` flags runs that appeared since the previous snapshot so the
 * UI can animate "just started" items.
 *
 * The feed is intentionally NOT globally truncated: the grouped sections each
 * cap how many cards they show (with "Show N more"), and the "Needs you"
 * section must reflect every action-required run so its count matches the
 * server-side ribbon gauge. The backend already bounds the active-run query.
 */
export function buildFeed(
  overview: WorkforceActiveOverview | null,
  newActiveIds: ReadonlySet<string>
): WorkforceFeedItem[] {
  if (!overview) return []
  const recent = overview.recent_completed ?? []
  const seen = new Set(recent.map(run => run.session_id))
  const items: WorkforceFeedItem[] = recent.map(finishedItem)

  for (const run of overview.runs ?? []) {
    // A run that already shows up as finished should not double as active.
    if (seen.has(run.session_id)) continue
    seen.add(run.session_id)
    items.push(activeItem(run, newActiveIds.has(run.session_id)))
  }

  // Completed runs paused on a flow approval: surface them in the feed so the
  // command center shows the same "Awaiting approval" state as everywhere else.
  for (const run of overview.flow_pending ?? []) {
    if (seen.has(run.session_id)) continue
    seen.add(run.session_id)
    items.push(flowPendingItem(run))
  }

  items.sort((a, b) => tsMs(b.timestamp) - tsMs(a.timestamp))
  return items
}

// ---------------------------------------------------------------------------
// Section grouping
//
// The live feed is short but mixes everything together, so finding the run
// that needs a human, or telling active from finished, is hard. We partition
// the already-sorted feed into three attention-ordered buckets that the
// sidebar renders as collapsible sections. Pure + React-free so it stays
// trivially unit-testable.
// ---------------------------------------------------------------------------

export type WorkforceFeedSectionId = 'needsYou' | 'active' | 'recentlyDone'

export interface WorkforceFeedSection {
  id: WorkforceFeedSectionId
  items: WorkforceFeedItem[]
}

export interface GroupedWorkforceFeed {
  needsYou: WorkforceFeedItem[]
  active: WorkforceFeedItem[]
  recentlyDone: WorkforceFeedItem[]
}

// Action-required states: the agent is blocked and a human must intervene
// (approve a draft, resolve an escalation, or lift a budget cap). These are
// the most important things to surface, so they get their own always-open
// section at the top.
const NEEDS_YOU_STATUSES: ReadonlySet<WorkforceRunStatus> = new Set<WorkforceRunStatus>([
  'waiting_for_human',
  'escalated',
  'budget_paused'
])

// Per-section presentation config.
// - ``initialVisible`` caps how many cards a section shows before a "Show N
//   more" toggle. The header always shows the full count, so the cap only
//   affects density, never the reported number.
// - ``collapsible`` controls whether the whole section can be collapsed away.
//   "Needs you" is NOT collapsible: action items must never be fully hidden
//   behind a collapse (though they may sit behind a "Show N more").
// - ``order`` fixes the top-to-bottom layout. ``labelKey`` is the Fluent key
//   (the model holds the key, not the text, so this file stays React/i18n-free);
//   icons are mapped in the component.
export interface WorkforceFeedSectionConfig {
  id: WorkforceFeedSectionId
  labelKey: string
  order: number
  initialVisible: number
  collapsible: boolean
}

export const WORKFORCE_FEED_SECTION_CONFIG: Record<WorkforceFeedSectionId, WorkforceFeedSectionConfig> = {
  needsYou: {
    id: 'needsYou',
    labelKey: 'command-center-section-needs-you',
    order: 0,
    initialVisible: 6,
    collapsible: false
  },
  active: { id: 'active', labelKey: 'command-center-section-active', order: 1, initialVisible: 3, collapsible: true },
  recentlyDone: {
    id: 'recentlyDone',
    labelKey: 'command-center-section-recently-done',
    order: 2,
    initialVisible: 2,
    collapsible: true
  }
}

// Sections in render order, for components that iterate without re-sorting.
export const WORKFORCE_FEED_SECTION_ORDER: readonly WorkforceFeedSectionId[] = ['needsYou', 'active', 'recentlyDone']

/**
 * Partition a feed (newest-first) into attention-ordered sections.
 *
 * - ``needsYou``: runs blocked on a human (waiting / escalated / budget paused).
 * - ``active``: live runs still working (running / pending).
 * - ``recentlyDone``: everything finished (completed / failed / cancelled / filtered).
 *
 * Relative order inside each bucket is preserved from the input, so callers
 * keep the newest-first ordering ``buildFeed`` produced.
 */
export function groupFeed(items: readonly WorkforceFeedItem[]): GroupedWorkforceFeed {
  const grouped: GroupedWorkforceFeed = { needsYou: [], active: [], recentlyDone: [] }
  for (const item of items) {
    // A completed run whose flow is paused on a human approval is action-required
    // too, even though its kind is "finished".
    if (NEEDS_YOU_STATUSES.has(item.status) || item.pendingFlowApproval) {
      grouped.needsYou.push(item)
    } else if (item.kind === 'active') {
      grouped.active.push(item)
    } else {
      grouped.recentlyDone.push(item)
    }
  }
  return grouped
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
