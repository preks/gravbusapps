/**
 * SessionStreamRegistry
 *
 * A small singleton registry of live per-session SSE streams. Each entry
 * owns exactly one `EventSource` and accumulates dedup'd, batched events so
 * that `useAgentSession` / `useSessionStream` can read without owning the
 * connection themselves.
 *
 * Why a registry instead of per-hook EventSource?
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

type Listener = () => void

interface InternalEntry {
  sessionId: string
  accessToken: string
  source: EventSource | null
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
}

const entries = new Map<string, InternalEntry>()
let graceSweepTimer: ReturnType<typeof setInterval> | null = null

const dedupeKey = (event: AgentStreamEvent): string => {
  if ('event_id' in event && event.event_id) return String(event.event_id)
  if ('seq' in event && typeof event.seq === 'number') return `seq:${event.seq}`
  return JSON.stringify(event)
}

const buildStreamUrl = (sessionId: string, accessToken: string, sinceSeq: number): string => {
  const base = PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL
  const sinceParam = sinceSeq > 0 ? `&since_seq=${sinceSeq}` : ''
  return `${base}/deep-agent/sessions/${sessionId}/stream?token=${encodeURIComponent(accessToken)}${sinceParam}`
}

const notify = (entry: InternalEntry) => {
  for (const listener of entry.listeners) listener()
}

const closeSource = (entry: InternalEntry) => {
  if (entry.source) {
    entry.source.close()
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

  const url = buildStreamUrl(entry.sessionId, entry.accessToken, entry.state.lastSeq)
  let source: EventSource
  try {
    source = new EventSource(url)
  } catch {
    entry.state = { ...entry.state, errorCount: entry.state.errorCount + 1 }
    notify(entry)
    scheduleReconnect(entry)
    return
  }
  entry.source = source

  source.onopen = () => {
    if (entry.disposed) return
    entry.reconnectDelayMs = INITIAL_BACKOFF_MS
    entry.state = { ...entry.state, isConnected: true }
    notify(entry)
  }

  source.onmessage = (e: MessageEvent) => {
    if (entry.disposed) return
    try {
      const event = JSON.parse(e.data) as AgentStreamEvent
      const key = dedupeKey(event)
      if (entry.seenEventKeys.has(key)) return
      entry.seenEventKeys.add(key)

      let lastSeq = entry.state.lastSeq
      if ('seq' in event && typeof event.seq === 'number' && event.seq > lastSeq) {
        lastSeq = event.seq
      }

      const terminalReached = event.type === 'terminal'
      entry.state = {
        ...entry.state,
        events: [...entry.state.events, event],
        lastSeq,
        terminalReached: entry.state.terminalReached || terminalReached
      }
      notify(entry)

      if (terminalReached) {
        closeSource(entry)
      }
    } catch {
      // malformed payload — ignore
    }
  }

  source.onerror = () => {
    closeSource(entry)
    if (entry.disposed || entry.state.terminalReached) return
    entry.state = { ...entry.state, errorCount: entry.state.errorCount + 1 }
    notify(entry)
    scheduleReconnect(entry)
  }
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
  listeners: new Set()
})

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
export const resetSessionStream = (sessionId: string): void => {
  const entry = entries.get(sessionId)
  if (!entry) return
  // Clear the event buffer on the assumption that the caller will re-read the
  // authoritative trace from REST; we only need the SSE to pick up from here.
  entry.state = {
    events: [],
    isConnected: false,
    lastSeq: 0,
    terminalReached: false,
    errorCount: 0
  }
  entry.seenEventKeys.clear()
  closeSource(entry)
  if (entry.reconnectTimer) {
    clearTimeout(entry.reconnectTimer)
    entry.reconnectTimer = null
  }
  connect(entry)
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
