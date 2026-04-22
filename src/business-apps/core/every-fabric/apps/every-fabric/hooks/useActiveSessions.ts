import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ActiveSessionSnapshot,
  ActiveSessionsStatusCounts,
  ActiveStreamEvent,
  ActiveStreamOverviewEvent,
  ActiveStreamSessionEvent
} from '../types/activeSession'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'

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
  if (chunkKind === 'status' && content) {
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

function applySessionEvent(map: SessionMap, event: ActiveStreamSessionEvent): SessionMap {
  const sid = event.session_id
  if (!sid) return map

  const existing = map.get(sid)

  if (event.type === 'terminal') {
    const status = typeof event.status === 'string' ? event.status : 'completed'
    if (TERMINAL_STATUSES.has(status)) {
      if (!existing) return map
      const next = new Map(map)
      next.delete(sid)
      return next
    }
    // A `waiting_for_human` terminal event keeps the session active; fall through.
  }

  if (!existing) {
    // We don't have a snapshot yet for this session — the next REST refetch or
    // overview event will materialise it; skip for now.
    return map
  }

  const timestamp = typeof event.timestamp === 'string' ? event.timestamp : existing.updated_at
  const nextSnapshot: ActiveSessionSnapshot = {
    ...existing,
    updated_at: timestamp ?? existing.updated_at,
    next_event_seq:
      typeof event.seq === 'number' ? Math.max(existing.next_event_seq, event.seq + 1) : existing.next_event_seq
  }

  const activity = activityFromEvent(event, timestamp)
  if (activity) {
    nextSnapshot.current_activity = activity
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
}

/**
 * Subscribes to the multiplexed `/deep-agent/sessions/active/stream` SSE feed
 * and exposes a live-sorted list of the authenticated user's active agent
 * sessions. Falls back to REST polling if the SSE connection repeatedly fails.
 */
export const useActiveSessions = (accessToken: string): UseActiveSessionsResult => {
  const client = useEnterpriseAgentClient(accessToken)
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
    try {
      const data = await clientRef.current.getActiveSessions({ limit: 50 })
      setSessionMap(toSessionMap(data.sessions ?? []))
      setIsLoading(false)
    } catch {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false)
      return undefined
    }

    let disposed = false
    let source: EventSource | null = null
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
        source.close()
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
        setSessionMap(prev => applySessionEvent(prev, event as ActiveStreamSessionEvent))
      } catch {
        // malformed payload — ignore
      }
    }

    const connect = () => {
      if (disposed) return
      const token = accessTokenRef.current
      if (!token) return

      const url = clientRef.current.buildActiveSessionsStreamUrl(token)
      try {
        source = new EventSource(url)
      } catch {
        consecutiveFailures += 1
        if (consecutiveFailures >= SSE_FAILURE_THRESHOLD) startFallbackPolling()
        scheduleReconnect()
        return
      }

      source.onopen = () => {
        if (disposed) return
        consecutiveFailures = 0
        backoffMs = INITIAL_BACKOFF_MS
        stopFallbackPolling()
        setIsLive(true)
      }

      source.onmessage = e => {
        if (disposed) return
        handleMessage(e.data)
      }

      source.onerror = () => {
        closeSource()
        if (disposed) return
        consecutiveFailures += 1
        if (consecutiveFailures >= SSE_FAILURE_THRESHOLD) startFallbackPolling()
        scheduleReconnect()
      }
    }

    void hydrateFromRest()
    connect()

    return () => {
      disposed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      stopFallbackPolling()
      closeSource()
    }
  }, [accessToken, hydrateFromRest])

  const activeSessions = useMemo(() => Array.from(sessionMap.values()).sort(sortByUpdatedDesc), [sessionMap])

  const statusCounts = useMemo(() => statusCountsOf(activeSessions), [activeSessions])

  return {
    activeSessions,
    statusCounts,
    isLive,
    isLoading,
    refetch: hydrateFromRest
  }
}
