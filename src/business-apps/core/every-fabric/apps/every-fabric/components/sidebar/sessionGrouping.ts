import type { ActiveSessionSnapshot } from '../../types/activeSession'
import type { FabricSessionSummary } from '../../types/fabric'
import { sessionActivityMs } from '../../utils/renderUtils'

/**
 * Pure helpers that split the single source-of-truth session list into the two
 * sections rendered by the sidebar. Kept out of the React component so they're
 * unit-testable and trivially memoizable.
 */

/** Statuses that classify a session as "currently active" for UI purposes. */
const ACTIVE_STATUSES = new Set(['running', 'pending', 'waiting_for_human'])

/** Non-active statuses that appear in the Recents section and can be filtered. */
export type RecentsStatusFilter = 'completed' | 'failed' | 'cancelled'
export const RECENTS_STATUS_OPTIONS: { value: RecentsStatusFilter; label: string }[] = [
  { value: 'completed', label: 'Done' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' }
]

export interface RecentsGroup {
  label: 'Today' | 'Yesterday' | 'Earlier'
  sessions: FabricSessionSummary[]
}

export function isActiveStatus(status: string | undefined | null): boolean {
  return !!status && ACTIVE_STATUSES.has(status)
}

/**
 * Merge per-session SSE snapshots with the full history list, keeping the
 * SSE-driven `ActiveSessionSnapshot` as the source of truth for active rows and
 * returning everything else (dedupe by `session_id`) as "recents".
 */
export function splitSessions(
  historySessions: FabricSessionSummary[],
  activeSnapshots: ActiveSessionSnapshot[]
): { active: ActiveSessionSnapshot[]; recents: FabricSessionSummary[] } {
  const activeById = new Map(activeSnapshots.map(s => [s.session_id, s]))
  const fallbackActive = historySessions
    .filter(s => !activeById.has(s.session_id) && isActiveStatus(s.status))
    .map(historySessionToActiveSnapshot)
  const recents = historySessions.filter(s => !activeById.has(s.session_id) && !isActiveStatus(s.status))
  return { active: [...activeSnapshots, ...fallbackActive].sort(sortActiveByUpdatedDesc), recents }
}

function historySessionToActiveSnapshot(session: FabricSessionSummary): ActiveSessionSnapshot {
  const selectedSkill = session.config?.selectedEnterpriseSkill
  const status = isActiveStatus(session.status) ? (session.status as ActiveSessionSnapshot['status']) : 'running'
  return {
    session_id: session.session_id,
    input: session.input,
    status,
    skill: selectedSkill
      ? {
          id: selectedSkill.id ?? selectedSkill.name ?? 'selected-skill',
          name: selectedSkill.name ?? null
        }
      : null,
    current_activity: {
      step: status === 'waiting_for_human' ? 'awaiting_human' : 'thinking',
      label:
        status === 'pending' ? 'Starting...' : status === 'waiting_for_human' ? 'Waiting for your input' : 'Working...',
      started_at: session.updated_at ?? session.created_at ?? null
    },
    todos_summary: { done: 0, total: 0 },
    pending_human_question: session.human_question ?? null,
    trace_count: 0,
    next_event_seq: 0,
    updated_at: session.updated_at,
    created_at: session.created_at
  }
}

function sortActiveByUpdatedDesc(a: ActiveSessionSnapshot, b: ActiveSessionSnapshot): number {
  const aTs = sessionActivityMs(a) ?? 0
  const bTs = sessionActivityMs(b) ?? 0
  return bTs - aTs
}

function startOfDay(d: Date): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

export function groupRecentsByDay(sessions: FabricSessionSummary[]): RecentsGroup[] {
  const now = new Date()
  const today = startOfDay(now)
  const yesterday = today - 24 * 60 * 60 * 1000

  const buckets: Record<RecentsGroup['label'], FabricSessionSummary[]> = {
    Today: [],
    Yesterday: [],
    Earlier: []
  }

  for (const session of sessions) {
    // Normalize naive-UTC strings from the backend so day bucketing lines up
    // with the user's local calendar (see `parseIsoTimestamp` for details).
    const ts = sessionActivityMs(session)
    if (ts === null) {
      buckets.Earlier.push(session)
      continue
    }
    let bucketKey: RecentsGroup['label'] = 'Earlier'
    if (ts >= today) bucketKey = 'Today'
    else if (ts >= yesterday) bucketKey = 'Yesterday'
    buckets[bucketKey].push(session)
  }

  return (['Today', 'Yesterday', 'Earlier'] as const)
    .filter(label => buckets[label].length > 0)
    .map(label => ({ label, sessions: buckets[label] }))
}

/**
 * Case-insensitive filter over the fields most likely to be searchable:
 * the input text and, for active sessions, the current activity label +
 * skill name.
 */
export function matchesQuery(text: string | undefined | null, query: string): boolean {
  if (!query) return true
  if (!text) return false
  return text.toLowerCase().includes(query.toLowerCase())
}

export function filterActiveByQuery(sessions: ActiveSessionSnapshot[], query: string): ActiveSessionSnapshot[] {
  if (!query.trim()) return sessions
  const needle = query.trim().toLowerCase()
  return sessions.filter(s => {
    if (matchesQuery(s.input, needle)) return true
    if (matchesQuery(s.current_activity?.label, needle)) return true
    if (matchesQuery(s.skill?.name ?? null, needle)) return true
    return false
  })
}

export function filterRecentsByQuery(sessions: FabricSessionSummary[], query: string): FabricSessionSummary[] {
  if (!query.trim()) return sessions
  const needle = query.trim().toLowerCase()
  return sessions.filter(s => {
    if (matchesQuery(s.input, needle)) return true
    if (matchesQuery(s.status, needle)) return true
    if (matchesQuery(s.config?.selectedEnterpriseSkill?.name ?? null, needle)) return true
    return false
  })
}

export function filterRecentsByStatus(
  sessions: FabricSessionSummary[],
  statusFilter: Set<RecentsStatusFilter> | null
): FabricSessionSummary[] {
  if (!statusFilter || statusFilter.size === 0) return sessions
  return sessions.filter(s => statusFilter.has(s.status as RecentsStatusFilter))
}
