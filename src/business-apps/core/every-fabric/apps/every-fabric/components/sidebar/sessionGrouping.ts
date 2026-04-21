import type { ActiveSessionSnapshot } from '../../types/activeSession'
import type { FabricSessionSummary } from '../../types/fabric'

/**
 * Pure helpers that split the single source-of-truth session list into the two
 * sections rendered by the sidebar. Kept out of the React component so they're
 * unit-testable and trivially memoizable.
 */

/** Statuses that classify a session as "currently active" for UI purposes. */
const ACTIVE_STATUSES = new Set(['running', 'pending', 'waiting_for_human'])

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
  const activeIds = new Set(activeSnapshots.map(s => s.session_id))
  const recents = historySessions.filter(s => !activeIds.has(s.session_id) && !isActiveStatus(s.status))
  return { active: activeSnapshots, recents }
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
    const ts = Date.parse(session.updated_at ?? session.created_at ?? '')
    if (Number.isNaN(ts)) {
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
  return sessions.filter(s => matchesQuery(s.input, needle))
}
