/**
 * SessionStreamRegistry
 *
 * A small singleton registry of live per-session SSE streams. Each entry
 * owns exactly one fetch-based SSE connection and accumulates dedup'd, batched events so
 * that `useAgentSession` / `useSessionStream` can read without owning the
 * connection themselves.
 *
 * Why a registry instead of per-hook SSE connections?
 *
 * 1. **Grace-period keep-alive**: when the user switches from session A to B,
 *    A's connection stays open for `GRACE_MS`. If they switch back within the
 *    window (common during multi-session usage) the stream is still live and
 *    no trace refetch / SSE reconnect is needed.
 * 2. **Cross-component sharing**: multiple components can observe the same
 *    session's events without opening duplicate connections.
 * 3. **Connection-pool safety**: hard cap on concurrent streams (default 4)
 *    with LRU eviction of non-focused, non-grace entries protects the browser
 *    from running out of HTTP connections for the rest of the app.
 *
 * The registry is NOT React-specific at this layer; `useSessionStreamEntry`
 * wraps it with `useSyncExternalStore`.
 */

import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import type { AgentStreamEvent } from '../types/enterpriseAgent'
import { connectPromptManagerSse, type PromptManagerSseConnection } from '../utils/promptManagerSse'

export interface SessionStreamEntry {
  events: AgentStreamEvent[]
  isConnected: boolean
  lastSeq: number
  terminalReached: boolean
  errorCount: number
}

const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 10_000
const GRACE_MS = 20_000
const MAX_STREAMS = 4
/** Stop reconnecting after this many consecutive closes with zero events (orphan / dead stream). */
const MAX_EMPTY_CLOSE_STREAK = 3

type Listener = () => void

interface InternalEntry {
  sessionId: string
  accessToken: string
  source: PromptManagerSseConnection | null
  state: SessionStreamEntry
  seenEventKeys: Set<string>
  reconnectTimer: ReturnType<typeof setTimeout> | null
  reconnectDelayMs: number
  refcount: number
  /** Unix ms after which this entry is eligible for disposal if unreferenced. */
  disposeAt: number | null
  lastAccess: number
  disposed: boolean
  listeners: Set<Listener>
  /** Pending coalesced-notify handle (rAF id or timeout id), or null. */
  notifyHandle: number | null
  /** Whether events arrived during the current frame and need a trailing emit. */
  pendingTrailing: boolean
}

const entries = new Map<string, InternalEntry>()
let graceSweepTimer: ReturnType<typeof setInterval> | null = null

const isStreamEndEvent = (event: AgentStreamEvent): boolean =>
  event.type === 'terminal' || event.type === 'turn_snapshot'

const dedupeKey = (event: AgentStreamEvent): string => {
  if ('event_id' in event && event.event_id) return String(event.event_id)
  if ('seq' in event && typeof event.seq === 'number') return `seq:${event.seq}`
  return JSON.stringify(event)
}

const buildStreamUrl = (sessionId: string, sinceSeq: number): string => {
  const base = PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL
  const sinceParam = sinceSeq > 0 ? `?since_seq=${sinceSeq}` : ''
  return `${base}/deep-agent/sessions/${sessionId}/stream${sinceParam}`
}

const scheduleFrame = (cb: () => void): number => {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(cb)
  return setTimeout(cb, 16) as unknown as number
}

const cancelFrame = (handle: number): void => {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(handle)
    return
  }
  clearTimeout(handle as unknown as ReturnType<typeof setTimeout>)
}

const emit = (entry: InternalEntry) => {
  for (const listener of entry.listeners) listener()
}

const notify = (entry: InternalEntry) => {
  // An immediate notify delivers the latest state, so it supersedes any
  // pending coalesced emit for this entry.
  if (entry.notifyHandle !== null) {
    cancelFrame(entry.notifyHandle)
    entry.notifyHandle = null
  }
  entry.pendingTrailing = false
  emit(entry)
}

/**
 * Coalesce high-frequency stream updates with a per-frame leading+trailing
 * throttle. Streamed answer/thinking chunks arrive in *cumulative* mode (each
 * event carries the full text so far), so subscribers always read the latest
 * `entry.state` snapshot — meaning we can safely collapse a burst into far
 * fewer notifications without losing content.
 *
 * - Leading edge: the first event of a burst notifies immediately so the UI
 *   reacts instantly (and so synchronous callers see a synchronous emit).
 * - Trailing edge: any further events that land within the same frame are
 *   collapsed into a single follow-up emit at frame end.
 *
 * This turns "one full FabricContext re-render + markdown re-parse per token"
 * into at most ~2 per frame, which is what stops a fast stream from pinning
 * the main thread.
 */
const scheduleNotify = (entry: InternalEntry) => {
  if (entry.disposed) return
  if (entry.notifyHandle !== null) {
    // A burst is already in-flight this frame — remember to flush the latest
    // state once when the frame closes.
    entry.pendingTrailing = true
    return
  }
  entry.notifyHandle = scheduleFrame(() => {
    entry.notifyHandle = null
    if (entry.disposed) return
    if (entry.pendingTrailing) {
      entry.pendingTrailing = false
      emit(entry)
    }
  })
  emit(entry)
}

const closeSource = (entry: InternalEntry) => {
  if (entry.source) {
    entry.source.abort()
    entry.source = null
  }
  if (entry.state.isConnected) {
    entry.state = { ...entry.state, isConnected: false }
    notify(entry)
  }
}

const disposeEntry = (entry: InternalEntry) => {
  if (entry.disposed) return
  entry.disposed = true
  if (entry.reconnectTimer) {
    clearTimeout(entry.reconnectTimer)
    entry.reconnectTimer = null
  }
  if (entry.notifyHandle !== null) {
    cancelFrame(entry.notifyHandle)
    entry.notifyHandle = null
  }
  closeSource(entry)
  entries.delete(entry.sessionId)
}

const evictLruIfOverCap = () => {
  if (entries.size <= MAX_STREAMS) return
  // Candidates: entries with zero refcount AND past their grace window.
  const now = Date.now()
  const candidates = Array.from(entries.values()).filter(
    e => e.refcount === 0 && (e.disposeAt === null || e.disposeAt <= now)
  )
  candidates.sort((a, b) => a.lastAccess - b.lastAccess)
  while (entries.size > MAX_STREAMS && candidates.length > 0) {
    const victim = candidates.shift()!
    disposeEntry(victim)
  }
}

const ensureGraceSweep = () => {
  if (graceSweepTimer !== null) return
  graceSweepTimer = setInterval(() => {
    const now = Date.now()
    for (const entry of Array.from(entries.values())) {
      if (entry.refcount === 0 && entry.disposeAt !== null && entry.disposeAt <= now) {
        disposeEntry(entry)
      }
    }
    if (entries.size === 0 && graceSweepTimer !== null) {
      clearInterval(graceSweepTimer)
      graceSweepTimer = null
    }
  }, 2_000)
}

const connect = (entry: InternalEntry) => {
  if (entry.disposed) return
  if (entry.state.terminalReached) return
  if (entry.source) return

  const url = buildStreamUrl(entry.sessionId, entry.state.lastSeq)

  const handleMessage = (raw: string) => {
    if (entry.disposed) return
    try {
      const event = JSON.parse(raw) as AgentStreamEvent
      const key = dedupeKey(event)
      if (entry.seenEventKeys.has(key)) return
      entry.seenEventKeys.add(key)

      let lastSeq = entry.state.lastSeq
      if ('seq' in event && typeof event.seq === 'number' && event.seq > lastSeq) {
        lastSeq = event.seq
      }

      const terminalReached = isStreamEndEvent(event)
      entry.state = {
        ...entry.state,
        events: [...entry.state.events, event],
        lastSeq,
        errorCount: 0,
        terminalReached: entry.state.terminalReached || terminalReached
      }

      if (terminalReached) {
        // Terminal transitions must reach the UI immediately (final answer,
        // stop-streaming, panel state) — never defer behind the frame coalescer.
        notify(entry)
        closeSource(entry)
      } else {
        // High-frequency incremental chunk: coalesce to one notify per frame.
        scheduleNotify(entry)
      }
    } catch {
      // malformed payload — ignore
    }
  }

  entry.source = connectPromptManagerSse({
    url,
    accessToken: entry.accessToken,
    onOpen: () => {
      if (entry.disposed) return
      entry.reconnectDelayMs = INITIAL_BACKOFF_MS
      entry.state = { ...entry.state, isConnected: true }
      notify(entry)
    },
    onMessage: handleMessage,
    onError: () => {
      closeSource(entry)
      if (entry.disposed || entry.state.terminalReached) return
      entry.state = { ...entry.state, errorCount: entry.state.errorCount + 1 }
      notify(entry)
      scheduleReconnect(entry)
    },
    onClose: () => {
      // Server closed the stream (timeout or terminal). Reconnect only while
      // the session is still active; terminal turns set terminalReached above.
      closeSource(entry)
      const emptyClose = entry.state.events.length === 0
      const nextStreak = emptyClose ? entry.state.errorCount + 1 : 0
      entry.state = { ...entry.state, errorCount: nextStreak }
      if (entry.disposed || entry.state.terminalReached) return
      if (emptyClose && nextStreak >= MAX_EMPTY_CLOSE_STREAK) {
        entry.state = { ...entry.state, terminalReached: true }
        return
      }
      scheduleReconnect(entry)
    }
  })
}

const scheduleReconnect = (entry: InternalEntry) => {
  if (entry.disposed) return
  if (entry.reconnectTimer !== null) return
  const delay = entry.reconnectDelayMs
  entry.reconnectDelayMs = Math.min(entry.reconnectDelayMs * 2, MAX_BACKOFF_MS)
  entry.reconnectTimer = setTimeout(() => {
    entry.reconnectTimer = null
    connect(entry)
  }, delay)
}

const createEntry = (sessionId: string, accessToken: string): InternalEntry => ({
  sessionId,
  accessToken,
  source: null,
  state: {
    events: [],
    isConnected: false,
    lastSeq: 0,
    terminalReached: false,
    errorCount: 0
  },
  seenEventKeys: new Set(),
  reconnectTimer: null,
  reconnectDelayMs: INITIAL_BACKOFF_MS,
  refcount: 0,
  disposeAt: null,
  lastAccess: Date.now(),
  disposed: false,
  listeners: new Set(),
  notifyHandle: null,
  pendingTrailing: false
})

export const ensureSessionStreamEntry = (sessionId: string, accessToken = ''): void => {
  if (entries.has(sessionId)) return
  entries.set(sessionId, createEntry(sessionId, accessToken))
}

export const appendSessionStreamEvents = (
  sessionId: string,
  eventsToAppend: AgentStreamEvent[],
  accessToken = ''
): void => {
  if (eventsToAppend.length === 0) return
  ensureSessionStreamEntry(sessionId, accessToken)
  const entry = entries.get(sessionId)
  if (!entry) return

  let lastSeq = entry.state.lastSeq
  let terminalReached = entry.state.terminalReached
  const nextEvents = [...entry.state.events]
  for (const event of eventsToAppend) {
    const key = dedupeKey(event)
    if (entry.seenEventKeys.has(key)) continue
    entry.seenEventKeys.add(key)
    nextEvents.push(event)
    if ('seq' in event && typeof event.seq === 'number' && event.seq > lastSeq) {
      lastSeq = event.seq
    }
    if (isStreamEndEvent(event)) {
      terminalReached = true
    }
  }

  entry.state = {
    ...entry.state,
    events: nextEvents,
    isConnected: !terminalReached,
    lastSeq,
    terminalReached
  }
  notify(entry)
}

export const acquireSessionStream = (
  sessionId: string,
  accessToken: string
): { entry: InternalEntry; release: () => void } => {
  let entry = entries.get(sessionId)
  if (entry && entry.accessToken !== accessToken) {
    // Auth changed — old connection's signed URL is effectively stale. Tear it
    // down and rebuild.
    disposeEntry(entry)
    entry = undefined
  }
  if (!entry) {
    entry = createEntry(sessionId, accessToken)
    entries.set(sessionId, entry)
    connect(entry)
    evictLruIfOverCap()
    ensureGraceSweep()
  }
  entry.refcount += 1
  entry.disposeAt = null
  entry.lastAccess = Date.now()

  const targetEntry = entry
  let released = false
  const release = () => {
    if (released) return
    released = true
    targetEntry.refcount = Math.max(0, targetEntry.refcount - 1)
    targetEntry.lastAccess = Date.now()
    if (targetEntry.refcount === 0) {
      // Keep the stream warm for GRACE_MS so quick back-and-forth tab
      // switches don't trigger a reconnect/refetch.
      targetEntry.disposeAt = Date.now() + GRACE_MS
      ensureGraceSweep()
      evictLruIfOverCap()
    }
  }
  return { entry, release }
}

/**
 * Reset a session's stream — closes the current connection and starts a new
 * one from the current `lastSeq`. Used when the FE knows a new turn has been
 * posted and wants to force the server to replay fresh events.
 */
/** REST says the session is done — stop SSE reconnect churn for this id. */
export const markSessionStreamRestTerminal = (sessionId: string): void => {
  const entry = entries.get(sessionId)
  if (!entry) return
  entry.state = { ...entry.state, terminalReached: true }
  if (entry.reconnectTimer) {
    clearTimeout(entry.reconnectTimer)
    entry.reconnectTimer = null
  }
  closeSource(entry)
  notify(entry)
}

/** Align SSE `since_seq` with the authoritative REST trace (e.g. before a new turn). */
export const advanceSessionStreamCursor = (sessionId: string, lastSeq: number): void => {
  const entry = entries.get(sessionId)
  if (!entry || lastSeq <= entry.state.lastSeq) return
  entry.state = { ...entry.state, lastSeq }
}

export const resetSessionStream = (sessionId: string, reconnect = true): void => {
  const entry = entries.get(sessionId)
  if (!entry) return
  // Clear the in-memory event buffer (REST trace is authoritative for completed
  // turns) but keep lastSeq so reconnect uses ?since_seq= and does not replay
  // prior-turn terminal events that confuse isAgentRunning / isStreaming.
  const lastSeq = entry.state.lastSeq
  entry.state = {
    events: [],
    isConnected: false,
    lastSeq,
    terminalReached: false,
    errorCount: 0
  }
  entry.seenEventKeys.clear()
  closeSource(entry)
  if (entry.reconnectTimer) {
    clearTimeout(entry.reconnectTimer)
    entry.reconnectTimer = null
  }
  if (reconnect) {
    connect(entry)
  }
  notify(entry)
}

export const subscribeSessionStream = (sessionId: string, listener: Listener): (() => void) => {
  const entry = entries.get(sessionId)
  if (!entry) return () => {}
  entry.listeners.add(listener)
  return () => {
    entry.listeners.delete(listener)
  }
}

export const getSessionStreamState = (sessionId: string): SessionStreamEntry | null => {
  const entry = entries.get(sessionId)
  return entry ? entry.state : null
}

/** Internal: for tests only. */
export const __testing__ = {
  entries,
  GRACE_MS,
  MAX_STREAMS,
  disposeAll: () => {
    for (const entry of Array.from(entries.values())) disposeEntry(entry)
    if (graceSweepTimer !== null) {
      clearInterval(graceSweepTimer)
      graceSweepTimer = null
    }
  }
}
