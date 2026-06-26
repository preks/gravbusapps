// Live "who is working right now" activity for the whole workforce.
//
// Subscribes to GET /workforce/active/stream (SSE) which pushes trimmed
// overview snapshots of every non-terminal run, optionally scoped to a
// workspace. Falls back to a one-shot REST snapshot for the initial paint and
// reconnects with backoff if the stream drops. The result drives the overview
// "N agents working now" strip and the per-tile live pulse.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { connectPromptManagerSse, type PromptManagerSseConnection } from '../../utils/promptManagerSse'
import { buildFeed, tsMs, type WorkforceFeedItem } from './workforceFeedModel'
import type {
  WorkforceActiveOverview,
  WorkforceActiveRun,
  WorkforceRecentRun,
  WorkforceThroughput
} from './workforceTypes'

// How many recently-completed runs to keep in the client-side buffer. The
// server's live window may be shorter than a typical page session, so we
// accumulate completions here and pass the buffer to buildFeed. The section
// shows RECENTLY_DONE_INITIAL_VISIBLE first and hides the rest under "Show more".
const RECENTLY_DONE_BUFFER_SIZE = 15

export interface UseWorkforceLiveActivityResult {
  overview: WorkforceActiveOverview | null
  isConnected: boolean
  /** Map of agentId -> its live runs (usually one). */
  runsByAgent: Map<string, WorkforceActiveRun[]>
  /** Set of agent ids that currently have at least one in-flight run. */
  workingAgentIds: Set<string>
  totalWorking: number
  /** Just-finished runs from the latest snapshot (recent window). */
  recentCompleted: WorkforceRecentRun[]
  /** Merged, capped, newest-first feed of active + finished runs. */
  feed: WorkforceFeedItem[]
  /** Server-computed count of runs completed today (UTC). */
  completedToday: number
  /** Hourly completion counts across today (UTC), oldest first. */
  throughputBuckets: number[]
  isAgentWorking: (agentId: string) => boolean
  activeRunForAgent: (agentId: string) => WorkforceActiveRun | null
}

const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 15_000

const EMPTY_RESULT: Omit<UseWorkforceLiveActivityResult, 'isAgentWorking' | 'activeRunForAgent'> = {
  overview: null,
  isConnected: false,
  runsByAgent: new Map(),
  workingAgentIds: new Set(),
  totalWorking: 0,
  recentCompleted: [],
  feed: [],
  completedToday: 0,
  throughputBuckets: []
}

function buildStreamUrl(workspaceId: string): string {
  const base = PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL
  const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ''
  return `${base}/workforce/active/stream${query}`
}

export function useWorkforceLiveActivity(
  accessToken: string,
  workspaceId = '',
  enabled = true
): UseWorkforceLiveActivityResult {
  const client = usePromptManagerClient(accessToken)
  const [overview, setOverview] = useState<WorkforceActiveOverview | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const connectionRef = useRef<PromptManagerSseConnection | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backoffRef = useRef(INITIAL_BACKOFF_MS)
  // Session ids seen as active in the previous snapshot, so we can flag
  // "just started" runs in the feed.
  const prevActiveIdsRef = useRef<Set<string>>(new Set())
  // Client-side accumulator for recently-completed runs. The server's
  // recent_completed window may be short, so we merge every snapshot's
  // completions into this map (keyed by session_id) and pass the capped
  // buffer to buildFeed so "Recently done" stays populated across the session.
  const completedBufferRef = useRef<Map<string, WorkforceRecentRun>>(new Map())

  // One-shot REST snapshot for instant initial paint (the stream also sends an
  // overview on connect, but this avoids a blank strip during the handshake).
  useEffect(() => {
    if (!enabled || !accessToken) return
    let cancelled = false
    client
      .listActiveWorkforceRuns(workspaceId)
      .then(snapshot => {
        if (!cancelled) setOverview(prev => prev ?? snapshot)
      })
      .catch(() => {
        /* stream is the source of truth; ignore snapshot failure */
      })
    return () => {
      cancelled = true
    }
  }, [client, accessToken, workspaceId, enabled])

  useEffect(() => {
    if (!enabled || !accessToken) {
      setIsConnected(false)
      return
    }

    let disposed = false
    const url = buildStreamUrl(workspaceId)

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const scheduleReconnect = () => {
      if (disposed || reconnectTimerRef.current) return
      const delay = backoffRef.current
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS)
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null
        open()
      }, delay)
    }

    const handleMessage = (raw: string) => {
      if (disposed) return
      try {
        const payload = JSON.parse(raw) as WorkforceActiveOverview & { type?: string }
        if (payload.type === 'heartbeat') return
        setOverview(payload)
      } catch {
        /* malformed frame — ignore */
      }
    }

    const open = () => {
      if (disposed) return
      connectionRef.current = connectPromptManagerSse({
        url,
        accessToken,
        onOpen: () => {
          if (disposed) return
          backoffRef.current = INITIAL_BACKOFF_MS
          setIsConnected(true)
        },
        onMessage: handleMessage,
        onError: () => {
          setIsConnected(false)
          scheduleReconnect()
        },
        onClose: () => {
          setIsConnected(false)
          scheduleReconnect()
        }
      })
    }

    open()

    return () => {
      disposed = true
      clearReconnect()
      connectionRef.current?.abort()
      connectionRef.current = null
      setIsConnected(false)
    }
  }, [accessToken, workspaceId, enabled])

  const runsByAgent = useMemo(() => {
    // Active runs plus completed runs paused on a flow approval, so the per-agent
    // live sidebar surfaces "Awaiting approval" runs alongside in-flight ones.
    const map = new Map<string, WorkforceActiveRun[]>()
    const append = (run: WorkforceActiveRun): void => {
      if (!run.agent_id) return
      const list = map.get(run.agent_id)
      if (list) list.push(run)
      else map.set(run.agent_id, [run])
    }
    for (const run of overview?.runs ?? []) append(run)
    for (const run of overview?.flow_pending ?? []) append(run)
    return map
  }, [overview])

  // "Working" indicators (sphere, deck, working-now count) must reflect only
  // genuinely active runs; a flow-paused run needs attention but is not running.
  const workingAgentIds = useMemo(() => {
    const ids = new Set<string>()
    for (const run of overview?.runs ?? []) {
      if (run.agent_id) ids.add(run.agent_id)
    }
    return ids
  }, [overview])

  const isAgentWorking = useCallback((agentId: string) => workingAgentIds.has(agentId), [workingAgentIds])

  const activeRunForAgent = useCallback(
    (agentId: string) => (overview?.runs ?? []).find(run => run.agent_id === agentId) ?? null,
    [overview]
  )

  const recentCompleted = useMemo(() => overview?.recent_completed ?? [], [overview])

  // Merge active + finished runs into one feed, flagging runs that appeared
  // since the last snapshot. The ref update inside the memo is intentional:
  // it tracks the previous-active set across snapshots without an extra render.
  const feed = useMemo(() => {
    const currentActiveIds = new Set((overview?.runs ?? []).map(run => run.session_id))
    const newActiveIds = new Set<string>()
    for (const id of currentActiveIds) {
      if (!prevActiveIdsRef.current.has(id)) newActiveIds.add(id)
    }
    prevActiveIdsRef.current = currentActiveIds

    // Accumulate completions into the client buffer so "Recently done" stays
    // populated even when the server's recent_completed window is short.
    for (const run of overview?.recent_completed ?? []) {
      completedBufferRef.current.set(run.session_id, run)
    }
    // Evict runs that are currently active or flow-pending — they should
    // render under their live state, not as a stale finished card.
    for (const run of overview?.runs ?? []) {
      completedBufferRef.current.delete(run.session_id)
    }
    for (const run of overview?.flow_pending ?? []) {
      completedBufferRef.current.delete(run.session_id)
    }
    // Cap to the most recent RECENTLY_DONE_BUFFER_SIZE completions.
    if (completedBufferRef.current.size > RECENTLY_DONE_BUFFER_SIZE) {
      const sorted = [...completedBufferRef.current.entries()].sort(
        ([, a], [, b]) => tsMs(b.completed_at ?? b.started_at ?? null) - tsMs(a.completed_at ?? a.started_at ?? null)
      )
      completedBufferRef.current = new Map(sorted.slice(0, RECENTLY_DONE_BUFFER_SIZE))
    }

    const bufferedCompleted = [...completedBufferRef.current.values()]
    const enrichedOverview = overview ? { ...overview, recent_completed: bufferedCompleted } : null
    return buildFeed(enrichedOverview, newActiveIds)
  }, [overview])

  const throughput = useMemo<WorkforceThroughput>(() => overview?.throughput ?? { count: 0, buckets: [] }, [overview])

  if (!enabled) {
    return { ...EMPTY_RESULT, isAgentWorking: () => false, activeRunForAgent: () => null }
  }

  return {
    overview,
    isConnected,
    runsByAgent,
    workingAgentIds,
    totalWorking: overview?.count ?? 0,
    recentCompleted,
    feed,
    completedToday: throughput.count,
    throughputBuckets: throughput.buckets,
    isAgentWorking,
    activeRunForAgent
  }
}
