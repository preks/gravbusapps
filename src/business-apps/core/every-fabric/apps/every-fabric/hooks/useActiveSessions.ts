import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ActiveSessionSnapshot,
  ActiveSessionsStatusCounts,
  ActiveStreamEvent,
  ActiveStreamOverviewEvent,
  ActiveStreamSessionAddedEvent,
  ActiveStreamSessionEvent,
  ActiveStreamSessionRemovedEvent,
  ActiveStreamStatusChangedEvent
} from '../types/activeSession'
import type { HitlRequestedEvent } from '../types/enterpriseAgent'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'
import { isFlowBotFabricRuntime } from '../utils/fabricRuntime'
import { connectPromptManagerSse, type PromptManagerSseConnection } from '../utils/promptManagerSse'

const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 15_000
/** REST fallback cadence when SSE is unreachable. */
const FALLBACK_POLL_MS = 10_000
/** Consecutive SSE failures before we flip to REST polling. */
const SSE_FAILURE_THRESHOLD = 3
/** Terminal session statuses — once we see one we drop the session from the active set. */
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled'])

type SessionMap = Map<string, ActiveSessionSnapshot>

function toSessionMap(sessions: ActiveSessionSnapshot[]): SessionMap {
  const next: SessionMap = new Map()
  for (const s of sessions) next.set(s.session_id, s)
  return next
}

function statusCountsOf(sessions: ActiveSessionSnapshot[]): ActiveSessionsStatusCounts {
  const counts: ActiveSessionsStatusCounts = { running: 0, pending: 0, waiting_for_human: 0 }
  for (const s of sessions) {
    if (s.status === 'running') counts.running += 1
    else if (s.status === 'pending') counts.pending += 1
    else if (s.status === 'waiting_for_human') counts.waiting_for_human += 1
  }
  return counts
}

function sortByUpdatedDesc(a: ActiveSessionSnapshot, b: ActiveSessionSnapshot): number {
  const at = Date.parse(a.updated_at ?? a.created_at ?? '') || 0
  const bt = Date.parse(b.updated_at ?? b.created_at ?? '') || 0
  return bt - at
}

/**
 * Merge an incoming per-session SSE event into the current map.
 *
 * We deliberately only "enrich" what we already track — full snapshot refreshes
 * come from `overview` events and REST fallback. For chunk events we update the
 * `updated_at` watermark and, for known chunk kinds, the `current_activity`
 * label so the spinner stays in sync without waiting for a full refetch.
 */
function activityFromAgentChunk(
  event: ActiveStreamSessionEvent,
  timestamp: string | null | undefined
): ActiveSessionSnapshot['current_activity'] | null {
  const chunkKind = typeof event.chunk_kind === 'string' ? event.chunk_kind : undefined
  const content = typeof event.content === 'string' ? event.content.trim() : ''
  const toolName = typeof event.tool_name === 'string' ? event.tool_name : undefined

  if (event.role === 'tool' && toolName) {
    return {
      step: 'tool_call',
      label: `Calling ${toolName}`,
      started_at: timestamp ?? null,
      tool_name: toolName
    }
  }
  if ((chunkKind === 'status' || chunkKind === 'live_status') && content) {
    return {
      step: 'thinking',
      label: content.slice(0, 200),
      started_at: timestamp ?? null
    }
  }
  if (event.role === 'ai' && content) {
    return {
      step: 'thinking',
      label: 'Generating response',
      started_at: timestamp ?? null
    }
  }
  return null
}

function activityFromEvent(
  event: ActiveStreamSessionEvent,
  timestamp: string | null | undefined
): ActiveSessionSnapshot['current_activity'] | null {
  if (event.type === 'agent_chunk') return activityFromAgentChunk(event, timestamp)
  if (event.type === 'subagent_spawned') {
    const name = typeof event.name === 'string' ? event.name : ''
    return {
      step: 'subagent',
      label: name ? `Delegating to ${name}` : 'Delegating to subagent',
      started_at: timestamp ?? null,
      subagent_name: name || null
    }
  }
  if (event.type === 'expert_called') {
    const name = typeof event.name === 'string' ? event.name : ''
    return {
      step: 'expert',
      label: name ? `Consulting ${name}` : 'Consulting expert',
      started_at: timestamp ?? null,
      expert_name: name || null
    }
  }
  return null
}

function applyWaitingForHuman(
  map: SessionMap,
  sid: string,
  existing: ActiveSessionSnapshot,
  event: ActiveStreamSessionEvent
): SessionMap {
  const timestamp = typeof event.timestamp === 'string' ? event.timestamp : existing.updated_at
  const pendingQuestion =
    typeof event.human_question === 'string' && event.human_question
      ? event.human_question
      : (existing.pending_human_question ?? null)
  const pendingStructured =
    event.structured_input_request && typeof event.structured_input_request === 'object'
      ? (event.structured_input_request as Record<string, unknown>)
      : (existing.pending_structured_input ?? null)
  const nextSnapshot: ActiveSessionSnapshot = {
    ...existing,
    status: 'waiting_for_human',
    pending_human_question: pendingQuestion,
    pending_structured_input: pendingStructured,
    updated_at: timestamp ?? existing.updated_at,
    current_activity: {
      step: 'awaiting_human',
      label: pendingQuestion ? String(pendingQuestion).slice(0, 200) : 'Waiting for your input',
      started_at: timestamp ?? null
    }
  }
  const next = new Map(map)
  next.set(sid, nextSnapshot)
  return next
}

function applyTerminalEvent(
  map: SessionMap,
  sid: string,
  existing: ActiveSessionSnapshot | undefined,
  event: ActiveStreamSessionEvent
): SessionMap {
  const status = typeof event.status === 'string' ? event.status : 'completed'
  if (TERMINAL_STATUSES.has(status)) {
    if (!existing) return map
    const next = new Map(map)
    next.delete(sid)
    return next
  }
  // A `waiting_for_human` terminal event keeps the session active, but we
  // MUST reflect the new status on the snapshot so the sidebar pill updates
  // without waiting for the next overview event.
  if (status === 'waiting_for_human' && existing) {
    return applyWaitingForHuman(map, sid, existing, event)
  }
  return map
}

function applySessionEvent(map: SessionMap, event: ActiveStreamSessionEvent): SessionMap {
  const sid = event.session_id
  if (!sid) return map

  const existing = map.get(sid)

  if (event.type === 'terminal') {
    return applyTerminalEvent(map, sid, existing, event)
  }

  if (!existing) {
    // We don't have a snapshot yet for this session — the next REST refetch,
    // overview, or `session_added` event will materialise it; skip for now.
    return map
  }

  if (event.type === 'hitl_requested') {
    const { request } = event as ActiveStreamSessionEvent & HitlRequestedEvent
    return applyWaitingForHuman(map, sid, existing, {
      ...event,
      status: 'waiting_for_human',
      human_question: request?.description || request?.title || null,
      structured_input_request: request?.payload && typeof request.payload === 'object' ? request.payload : null
    })
  }

  if (event.type === 'hitl_resolved') {
    const timestamp = typeof event.timestamp === 'string' ? event.timestamp : existing.updated_at
    const nextSnapshot: ActiveSessionSnapshot = {
      ...existing,
      status: 'running',
      pending_human_question: null,
      pending_structured_input: null,
      updated_at: timestamp ?? existing.updated_at,
      current_activity: { step: 'thinking', label: 'Resuming...', started_at: timestamp ?? null }
    }
    const next = new Map(map)
    next.set(sid, nextSnapshot)
    return next
  }

  const timestamp = typeof event.timestamp === 'string' ? event.timestamp : existing.updated_at
  const nextSnapshot: ActiveSessionSnapshot = {
    ...existing,
    updated_at: timestamp ?? existing.updated_at,
    next_event_seq:
      typeof event.seq === 'number' ? Math.max(existing.next_event_seq, event.seq + 1) : existing.next_event_seq,
    last_event_seq:
      typeof event.seq === 'number' ? Math.max(existing.last_event_seq ?? 0, event.seq) : existing.last_event_seq
  }

  const activity = activityFromEvent(event, timestamp)
  if (activity) {
    nextSnapshot.current_activity = activity
  }

  const next = new Map(map)
  next.set(sid, nextSnapshot)
  return next
}

function applySessionAdded(map: SessionMap, event: ActiveStreamSessionAddedEvent): SessionMap {
  if (!event.session?.session_id) return map
  const next = new Map(map)
  next.set(event.session.session_id, event.session)
  return next
}

function applySessionRemoved(map: SessionMap, event: ActiveStreamSessionRemovedEvent): SessionMap {
  if (!event.session_id || !map.has(event.session_id)) return map
  const next = new Map(map)
  next.delete(event.session_id)
  return next
}

function applyStatusChanged(map: SessionMap, event: ActiveStreamStatusChangedEvent): SessionMap {
  const sid = event.session_id
  if (!sid) return map

  // If the BE included a full snapshot, prefer it (atomic replacement).
  if (event.session?.session_id === sid) {
    const next = new Map(map)
    next.set(sid, event.session)
    return next
  }

  const existing = map.get(sid)
  if (!existing) return map

  const nextSnapshot: ActiveSessionSnapshot = {
    ...existing,
    status: event.status ?? existing.status,
    current_activity: event.current_activity ?? existing.current_activity,
    todos_summary: event.todos_summary ?? existing.todos_summary,
    pending_human_question:
      event.pending_human_question === undefined ? existing.pending_human_question : event.pending_human_question,
    pending_structured_input:
      event.pending_structured_input === undefined ? existing.pending_structured_input : event.pending_structured_input,
    updated_at: event.updated_at ?? existing.updated_at
  }
  const next = new Map(map)
  next.set(sid, nextSnapshot)
  return next
}

export interface UseActiveSessionsResult {
  activeSessions: ActiveSessionSnapshot[]
  statusCounts: ActiveSessionsStatusCounts
  /** True while SSE is connected and driving updates. False means REST fallback polling. */
  isLive: boolean
  isLoading: boolean
  refetch: () => Promise<void>
  /**
   * Optimistically drop a session from the active map. Used by the sidebar
   * Stop button so the row disappears immediately, without waiting for the
   * backend's next poll tick to emit a `terminal` / `session_removed` event.
   */
  removeActive: (sessionId: string) => void
}

/**
 * Subscribes to the multiplexed `/deep-agent/sessions/active/stream` SSE feed
 * and exposes a live-sorted list of the authenticated user's active agent
 * sessions. Falls back to REST polling if the SSE connection repeatedly fails.
 */
export const useActiveSessions = (accessToken: string): UseActiveSessionsResult => {
  const client = useEnterpriseAgentClient(accessToken)
  const flowBotRuntime = isFlowBotFabricRuntime()
  const [sessionMap, setSessionMap] = useState<SessionMap>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  // Refs keep the effect single-shot (latest client / token without reconnecting).
  const clientRef = useRef(client)
  const accessTokenRef = useRef(accessToken)
  useEffect(() => {
    clientRef.current = client
    accessTokenRef.current = accessToken
  }, [client, accessToken])

  const hydrateFromRest = useCallback(async () => {
    if (flowBotRuntime) {
      setSessionMap(new Map())
      setIsLoading(false)
      setIsLive(false)
      return
    }
    try {
      const data = await clientRef.current.getActiveSessions({ limit: 50 })
      setSessionMap(toSessionMap(data.sessions ?? []))
      setIsLoading(false)
    } catch {
      setIsLoading(false)
    }
  }, [flowBotRuntime])

  useEffect(() => {
    if (flowBotRuntime) {
      setSessionMap(new Map())
      setIsLoading(false)
      setIsLive(false)
      return undefined
    }
    if (!accessToken) {
      setIsLoading(false)
      return undefined
    }

    let disposed = false
    let source: PromptManagerSseConnection | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let fallbackTimer: ReturnType<typeof setInterval> | null = null
    let backoffMs = INITIAL_BACKOFF_MS
    let consecutiveFailures = 0

    const stopFallbackPolling = () => {
      if (fallbackTimer !== null) {
        clearInterval(fallbackTimer)
        fallbackTimer = null
      }
    }

    const startFallbackPolling = () => {
      if (fallbackTimer !== null) return
      setIsLive(false)
      fallbackTimer = setInterval(() => {
        void hydrateFromRest()
      }, FALLBACK_POLL_MS)
    }

    const closeSource = () => {
      if (source) {
        source.abort()
        source = null
      }
      if (!disposed) setIsLive(false)
    }

    const scheduleReconnect = () => {
      if (disposed) return
      const delay = backoffMs
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS)
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
      }, delay)
    }

    const handleMessage = (raw: string) => {
      try {
        const event = JSON.parse(raw) as ActiveStreamEvent
        if (event.type === 'heartbeat') return
        if (event.type === 'overview') {
          const overview = event as ActiveStreamOverviewEvent
          setSessionMap(toSessionMap(overview.sessions ?? []))
          setIsLoading(false)
          return
        }
        if (event.type === 'session_added') {
          setSessionMap(prev => applySessionAdded(prev, event as ActiveStreamSessionAddedEvent))
          return
        }
        if (event.type === 'session_removed') {
          setSessionMap(prev => applySessionRemoved(prev, event as ActiveStreamSessionRemovedEvent))
          return
        }
        if (event.type === 'status_changed') {
          setSessionMap(prev => applyStatusChanged(prev, event as ActiveStreamStatusChangedEvent))
          return
        }
        setSessionMap(prev => applySessionEvent(prev, event as ActiveStreamSessionEvent))
      } catch {
        // malformed payload — ignore
      }
    }

    const handleStreamError = () => {
      closeSource()
      if (disposed) return
      consecutiveFailures += 1
      if (consecutiveFailures >= SSE_FAILURE_THRESHOLD) startFallbackPolling()
      scheduleReconnect()
    }

    const handleStreamClose = () => {
      closeSource()
      if (disposed) return
      // Multiplexed stream may end when the server hits its wait window;
      // reconnect without counting it as a hard failure.
      scheduleReconnect()
    }

    const connect = () => {
      if (disposed) return
      const token = accessTokenRef.current
      if (!token) return

      const url = clientRef.current.buildActiveSessionsStreamUrl()
      source = connectPromptManagerSse({
        url,
        accessToken: token,
        onOpen: () => {
          if (disposed) return
          consecutiveFailures = 0
          backoffMs = INITIAL_BACKOFF_MS
          stopFallbackPolling()
          setIsLive(true)
        },
        onMessage: raw => {
          if (disposed) return
          handleMessage(raw)
        },
        onError: handleStreamError,
        onClose: handleStreamClose
      })
    }

    void hydrateFromRest()
    connect()

    return () => {
      disposed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      stopFallbackPolling()
      closeSource()
    }
  }, [accessToken, flowBotRuntime, hydrateFromRest])

  const activeSessions = useMemo(() => Array.from(sessionMap.values()).sort(sortByUpdatedDesc), [sessionMap])

  const statusCounts = useMemo(() => statusCountsOf(activeSessions), [activeSessions])

  const removeActive = useCallback((sessionId: string) => {
    setSessionMap(prev => {
      if (!prev.has(sessionId)) return prev
      const next = new Map(prev)
      next.delete(sessionId)
      return next
    })
  }, [])

  return {
    activeSessions,
    statusCounts,
    isLive,
    isLoading,
    refetch: hydrateFromRest,
    removeActive
  }
}
