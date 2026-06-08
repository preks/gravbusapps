/**
 * Global Zustand store tracking in-flight Flowbot agent runs.
 *
 * The store is intentionally minimal: it only holds the **pointers** the
 * UI needs to render correctly across many concurrent runs in many
 * sessions. It deliberately does NOT hold per-run output payloads —
 * the rendering of OutputItems remains owned by the per-hook React state
 * in `useFlowBot` so we don't have to rewrite the whole transcript
 * pipeline. Frames are delivered to subscribers via the
 * `flowbotStreamManager`, which owns the SSE connections.
 *
 * Shape:
 *  - `viewedSessionId`: which session the user is currently looking at
 *    (frontend-only "active" pointer per the ticket — backend never sees it).
 *  - `activeRunBySession`: `{ [sessionId]: runId }` — exactly one in-flight
 *    run per session at a time, but many sessions can each have one.
 *  - `runs`: `{ [runId]: RunState }` — durable per-run state needed for
 *    reconnect (lastEventId is the SSE `id:` so /resume can continue from
 *    the exact point we dropped).
 *
 * Persistence: a tiny envelope is mirrored to localStorage so that after
 * a hard refresh we can immediately start showing "running" indicators
 * without waiting on the `/active-runs` round-trip. The server is still
 * the source of truth — the bootstrap call reconciles us with reality.
 */

import { create } from 'zustand'

export type RunStatus = 'streaming' | 'completed' | 'errored' | 'cancelled' | 'reconnecting'

export interface RunState {
  /** Server-assigned UUID of this run. */
  runId: string
  /** Session this run belongs to. */
  sessionId: string
  /** Last status known to the frontend; reflects what the user should see. */
  status: RunStatus
  /** Redis stream entry id of the most recently observed event (SSE `id:`). */
  lastEventId: string | null
  /** Wall-clock when the run started (for sorting / debugging only). */
  startedAt: number
  /** Optional user-visible error blurb captured on errored state. */
  error?: string
}

interface PersistedShape {
  viewedSessionId: string | null
  activeRunBySession: Record<string, string>
  runs: Record<string, Pick<RunState, 'runId' | 'sessionId' | 'lastEventId' | 'startedAt' | 'status'>>
}

const STORAGE_KEY = 'newwork_every_ai_active_runs'

function loadPersisted(): PersistedShape {
  if (typeof window === 'undefined') {
    return { viewedSessionId: null, activeRunBySession: {}, runs: {} }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { viewedSessionId: null, activeRunBySession: {}, runs: {} }
    const parsed = JSON.parse(raw) as Partial<PersistedShape> | null
    if (!parsed || typeof parsed !== 'object') {
      return { viewedSessionId: null, activeRunBySession: {}, runs: {} }
    }
    const activeRunBySession =
      typeof parsed.activeRunBySession === 'object' && parsed.activeRunBySession !== null
        ? (parsed.activeRunBySession as Record<string, string>)
        : {}
    const runs = typeof parsed.runs === 'object' && parsed.runs !== null ? (parsed.runs as PersistedShape['runs']) : {}
    return {
      viewedSessionId: typeof parsed.viewedSessionId === 'string' ? parsed.viewedSessionId : null,
      activeRunBySession,
      runs
    }
  } catch {
    return { viewedSessionId: null, activeRunBySession: {}, runs: {} }
  }
}

function persistSnapshot(state: {
  viewedSessionId: string | null
  activeRunBySession: Record<string, string>
  runs: Record<string, RunState>
}) {
  if (typeof window === 'undefined') return
  try {
    const payload: PersistedShape = {
      viewedSessionId: state.viewedSessionId,
      activeRunBySession: state.activeRunBySession,
      runs: Object.fromEntries(
        Object.entries(state.runs).map(([id, r]) => [
          id,
          {
            runId: r.runId,
            sessionId: r.sessionId,
            lastEventId: r.lastEventId,
            startedAt: r.startedAt,
            // Only persist statuses that survive page reload. Mid-stream
            // statuses like `reconnecting` are recomputed by the manager.
            status: r.status === 'streaming' ? 'streaming' : r.status
          }
        ])
      )
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // localStorage may be full / disabled; not critical.
  }
}

interface StreamStoreState {
  viewedSessionId: string | null
  activeRunBySession: Record<string, string>
  runs: Record<string, RunState>

  setViewedSession: (sessionId: string | null) => void
  /** Register a brand-new run (called from manager.startRun). */
  registerRun: (params: { runId: string; sessionId: string; status?: RunStatus }) => void
  /** Update lastEventId after observing a frame from the SSE stream. */
  updateLastEventId: (runId: string, lastEventId: string) => void
  /** Patch the run status (e.g. `reconnecting`, `errored`). */
  setRunStatus: (runId: string, status: RunStatus, error?: string) => void
  /** Drop a run from the active maps (called on terminal end or explicit clear). */
  clearRun: (runId: string) => void
  /**
   * Hydrate from a server response (`GET /active-runs`). Adds any runs we
   * didn't know about, removes any local pointers the server says are gone.
   */
  hydrateFromServer: (
    serverRuns: Array<{ runId: string; sessionId: string; status: RunStatus; startedAt: number }>
  ) => void
}

const initial = loadPersisted()

export const useStreamStore = create<StreamStoreState>((set, get) => {
  const persist = () => {
    const s = get()
    persistSnapshot({
      viewedSessionId: s.viewedSessionId,
      activeRunBySession: s.activeRunBySession,
      runs: s.runs
    })
  }

  return {
    viewedSessionId: initial.viewedSessionId,
    activeRunBySession: initial.activeRunBySession,
    runs: Object.fromEntries(
      Object.entries(initial.runs).map(([id, r]) => [id, { ...r, status: 'streaming' as RunStatus } as RunState])
    ),

    setViewedSession: sessionId => {
      set({ viewedSessionId: sessionId })
      persist()
    },

    registerRun: ({ runId, sessionId, status }) => {
      set(prev => ({
        runs: {
          ...prev.runs,
          [runId]: {
            runId,
            sessionId,
            status: status ?? 'streaming',
            lastEventId: prev.runs[runId]?.lastEventId ?? null,
            startedAt: prev.runs[runId]?.startedAt ?? Date.now()
          }
        },
        activeRunBySession: {
          ...prev.activeRunBySession,
          [sessionId]: runId
        }
      }))
      persist()
    },

    updateLastEventId: (runId, lastEventId) => {
      set(prev => {
        const existing = prev.runs[runId]
        if (!existing) return prev
        return {
          runs: { ...prev.runs, [runId]: { ...existing, lastEventId } }
        }
      })
      persist()
    },

    setRunStatus: (runId, status, error) => {
      set(prev => {
        const existing = prev.runs[runId]
        if (!existing) return prev
        return {
          runs: { ...prev.runs, [runId]: { ...existing, status, error } }
        }
      })
      persist()
    },

    clearRun: runId => {
      set(prev => {
        const existing = prev.runs[runId]
        const nextRuns = { ...prev.runs }
        delete nextRuns[runId]
        const nextActive = { ...prev.activeRunBySession }
        if (existing && nextActive[existing.sessionId] === runId) {
          delete nextActive[existing.sessionId]
        }
        return { runs: nextRuns, activeRunBySession: nextActive }
      })
      persist()
    },

    hydrateFromServer: serverRuns => {
      set(prev => {
        const nextRuns: Record<string, RunState> = { ...prev.runs }
        const nextActive: Record<string, string> = { ...prev.activeRunBySession }
        const serverIds = new Set(serverRuns.map(r => r.runId))

        // Add / refresh server-known runs.
        for (const sr of serverRuns) {
          const existing = nextRuns[sr.runId]
          nextRuns[sr.runId] = {
            runId: sr.runId,
            sessionId: sr.sessionId,
            status: sr.status,
            // Keep our local lastEventId if we have one — it's strictly
            // newer than anything the server could give us in this response.
            lastEventId: existing?.lastEventId ?? null,
            startedAt: existing?.startedAt ?? sr.startedAt
          }
          nextActive[sr.sessionId] = sr.runId
        }

        // Drop locally-known runs that the server says are no longer active.
        for (const localId of Object.keys(nextRuns)) {
          if (!serverIds.has(localId) && nextRuns[localId].status === 'streaming') {
            const sid = nextRuns[localId].sessionId
            if (nextActive[sid] === localId) delete nextActive[sid]
            delete nextRuns[localId]
          }
        }

        return { runs: nextRuns, activeRunBySession: nextActive }
      })
      persist()
    }
  }
})

/** Selector: ids of every session that currently has a `streaming` run. */
export function selectRunningSessionIds(state: StreamStoreState): string[] {
  const out: string[] = []
  for (const [sessionId, runId] of Object.entries(state.activeRunBySession)) {
    const r = state.runs[runId]
    if (r && r.status === 'streaming') out.push(sessionId)
  }
  return out
}

/** Selector: did the given session have an active streaming run? */
export function selectIsSessionStreaming(state: StreamStoreState, sessionId: string | null): boolean {
  if (!sessionId) return false
  const runId = state.activeRunBySession[sessionId]
  if (!runId) return false
  const r = state.runs[runId]
  return Boolean(r && r.status === 'streaming')
}

/** Selector: full RunState for the currently-viewed session, or null. */
export function selectViewedRun(state: StreamStoreState): RunState | null {
  if (!state.viewedSessionId) return null
  const rid = state.activeRunBySession[state.viewedSessionId]
  if (!rid) return null
  return state.runs[rid] ?? null
}
