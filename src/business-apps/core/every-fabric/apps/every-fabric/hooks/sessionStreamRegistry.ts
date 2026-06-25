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
import type { AgentChunkEvent, AgentStreamEvent } from '../types/enterpriseAgent'
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
}

const entries = new Map<string, InternalEntry>()
/**
 * Listeners are keyed by ``sessionId`` rather than stored on the entry so that
 * a `useSyncExternalStore` subscription survives entry recreation. Entries are
 * disposed + rebuilt for the same session on LRU eviction or auth-token change;
 * if the listener lived on the entry it would stay bound to the dead object and
 * the component would stop re-rendering even though the *new* entry receives
 * live SSE events (symptom: "stream events arrive but the UI never updates;
 * a refresh fixes it"). Keying by session id keeps subscriptions stable.
 */
const sessionListeners = new Map<string, Set<Listener>>()
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

const notify = (entry: InternalEntry) => {
  const listeners = sessionListeners.get(entry.sessionId)
  if (!listeners) return
  for (const listener of listeners) listener()
}

const pendingNotifyEntries = new Set<InternalEntry>()
let notifyRafId: number | null = null

/** Batch subscriber notifications to one paint frame for smoother streaming UI. */
const scheduleNotify = (entry: InternalEntry, immediate = false) => {
  if (immediate) {
    pendingNotifyEntries.delete(entry)
    notify(entry)
    return
  }
  pendingNotifyEntries.add(entry)
  if (notifyRafId !== null) return
  notifyRafId = requestAnimationFrame(() => {
    notifyRafId = null
    const batch = Array.from(pendingNotifyEntries)
    pendingNotifyEntries.clear()
    for (const target of batch) notify(target)
  })
}

const isResponseStreamChunk = (event: AgentStreamEvent): event is AgentChunkEvent =>
  event.type === 'agent_chunk' && event.role === 'ai' && event.chunk_kind === 'response_stream'

const responseStreamCoalesceKey = (event: AgentChunkEvent): string => {
  const streamKey =
    typeof event.metadata?.stream_key === 'string' && event.metadata.stream_key.trim().length > 0
      ? event.metadata.stream_key
      : 'primary'
  const segmentId =
    typeof event.metadata?.segment_id === 'number' && Number.isFinite(event.metadata.segment_id)
      ? event.metadata.segment_id
      : 0
  return `${streamKey}:${segmentId}`
}

/**
 * Cumulative response_stream snapshots replace the prior snapshot for the same
 * segment instead of appending — fewer array copies and less React churn.
 */
const ingestStreamEvent = (
  entry: InternalEntry,
  event: AgentStreamEvent
): { applied: boolean; immediateNotify: boolean } => {
  const key = dedupeKey(event)
  if (entry.seenEventKeys.has(key)) {
    return { applied: false, immediateNotify: false }
  }
  entry.seenEventKeys.add(key)

  let lastSeq = entry.state.lastSeq
  if ('seq' in event && typeof event.seq === 'number' && event.seq > lastSeq) {
    lastSeq = event.seq
  }

  const terminalReached = isStreamEndEvent(event)
  let nextEvents = entry.state.events

  if (isResponseStreamChunk(event)) {
    const coalesceKey = responseStreamCoalesceKey(event)
    for (let i = nextEvents.length - 1; i >= 0; i -= 1) {
      const existing = nextEvents[i]
      if (!isResponseStreamChunk(existing)) continue
      if (responseStreamCoalesceKey(existing) === coalesceKey) {
        nextEvents = [...nextEvents]
        nextEvents[i] = event
        entry.state = {
          ...entry.state,
          events: nextEvents,
          lastSeq,
          errorCount: 0,
          terminalReached: entry.state.terminalReached || terminalReached
        }
        // Paint each cumulative snapshot immediately — rAF batching here made
        // long answers appear to "dump" at turn end when SSE delivered many
        // upserts in one frame.
        return { applied: true, immediateNotify: true }
      }
      break
    }
  }

  entry.state = {
    ...entry.state,
    events: [...nextEvents, event],
    lastSeq,
    errorCount: 0,
    terminalReached: entry.state.terminalReached || terminalReached
  }
  return { applied: true, immediateNotify: terminalReached }
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
      const { applied, immediateNotify } = ingestStreamEvent(entry, event)
      if (!applied) return
      scheduleNotify(entry, immediateNotify)

      if (entry.state.terminalReached) {
        closeSource(entry)
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
  disposed: false
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
  let appliedAny = false
  let immediateNotify = false
  for (const event of eventsToAppend) {
    const result = ingestStreamEvent(entry, event)
    if (!result.applied) continue
    appliedAny = true
    immediateNotify = immediateNotify || result.immediateNotify
    lastSeq = entry.state.lastSeq
    terminalReached = entry.state.terminalReached
  }

  if (!appliedAny) return

  entry.state = {
    ...entry.state,
    isConnected: !terminalReached,
    lastSeq,
    terminalReached
  }
  scheduleNotify(entry, immediateNotify)
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
  // Keyed by session id (not the entry) so the subscription keeps working
  // across entry disposal/recreation for the same session.
  let listeners = sessionListeners.get(sessionId)
  if (!listeners) {
    listeners = new Set()
    sessionListeners.set(sessionId, listeners)
  }
  listeners.add(listener)
  return () => {
    const set = sessionListeners.get(sessionId)
    if (!set) return
    set.delete(listener)
    if (set.size === 0) sessionListeners.delete(sessionId)
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
    sessionListeners.clear()
    if (graceSweepTimer !== null) {
      clearInterval(graceSweepTimer)
      graceSweepTimer = null
    }
  }
}
