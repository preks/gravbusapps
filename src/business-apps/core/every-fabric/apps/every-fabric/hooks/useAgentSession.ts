import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AgentChunkEvent,
  AgentStreamEvent,
  ChatMessage,
  DeepAgentSession,
  SessionConfig,
  SkillLoadedEvent,
  StartSessionResponse
} from '../types/enterpriseAgent'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'
import { useFlowBotFabricClient } from './useFlowBotFabricClient'
import { useSessionStream } from './useSessionStream'
import { sessionToMessages } from '../utils/messageUtils'
import { isFlowBotFabricRuntime } from '../utils/fabricRuntime'

export interface ActiveSkillInfo {
  skill_id: string
  name: string
  category: string
  description: string
  icon?: string
  was_auto_detected: boolean
}

const POLL_INTERVAL_MS = 3000
/** Sparse safety-net poll when SSE is healthy. The BE now supports ETag /
 *  304 on this endpoint so polling is cheap; we keep just enough to catch a
 *  missed terminal event without re-introducing the request storm. */
const POLL_WHILE_SSE_MS = 15000
const REST_SYNC_MAX_MS = 4000
const REST_SYNC_INTERVAL_MS = 120

/**
 * Per-session cache of volatile UI state — kept alive across tab switches so
 * returning to a session re-hydrates its running flag / optimistic messages
 * / active skill instead of flashing an empty shell. The SSE buffer lives in
 * `sessionStreamRegistry`; this cache mirrors the bits that `useAgentSession`
 * owns in local state.
 *
 * Entries are trimmed to keep memory bounded (LRU over MAX_CACHE sessions).
 */
interface SessionUiStateCache {
  session: DeepAgentSession | null
  isAgentRunning: boolean
  optimisticMessages: ChatMessage[]
  activeSkill: ActiveSkillInfo | null
  lastReplyTimestamp: number
  processedTerminalAt: number
  lastAccess: number
}
const MAX_SESSION_UI_CACHE = 16
const sessionUiStateCache = new Map<string, SessionUiStateCache>()

interface AgentExecutionClient {
  startSession: (
    task: string,
    config?: SessionConfig,
    activeExternalConnectionIds?: string[],
    activeEnterpriseSkillId?: string,
    fallbackSkillId?: string
  ) => Promise<StartSessionResponse>
  getSession: (sessionId: string) => Promise<DeepAgentSession>
  replyToInterrupt: (sessionId: string, message?: string, structuredInput?: Record<string, any>) => Promise<unknown>
}

const readSessionUiCache = (sessionId: string | null): SessionUiStateCache | null => {
  if (!sessionId) return null
  const cached = sessionUiStateCache.get(sessionId)
  if (cached) cached.lastAccess = Date.now()
  return cached ?? null
}

const writeSessionUiCache = (sessionId: string | null, patch: Partial<SessionUiStateCache>): void => {
  if (!sessionId) return
  const existing = sessionUiStateCache.get(sessionId)
  const merged: SessionUiStateCache = {
    session: null,
    isAgentRunning: false,
    optimisticMessages: [],
    activeSkill: null,
    lastReplyTimestamp: 0,
    processedTerminalAt: -1,
    lastAccess: Date.now(),
    ...existing,
    ...patch
  }
  sessionUiStateCache.set(sessionId, merged)
  if (sessionUiStateCache.size > MAX_SESSION_UI_CACHE) {
    const sorted = Array.from(sessionUiStateCache.entries()).sort((a, b) => a[1].lastAccess - b[1].lastAccess)
    while (sessionUiStateCache.size > MAX_SESSION_UI_CACHE && sorted.length > 0) {
      const [oldestId] = sorted.shift()!
      if (oldestId !== sessionId) sessionUiStateCache.delete(oldestId)
    }
  }
}

const isTerminalStatus = (status: string) => status !== 'running' && status !== 'pending'

/** Last terminal status in the event stream (same overlay rule as mergedSession). */
const streamOverlayTerminalStatus = (events: AgentStreamEvent[]): string | null => {
  let status: string | null = null
  for (const ev of events) {
    if (ev.type === 'terminal') status = ev.status
  }
  return status
}

async function waitForRestSyncWithWaitingHumanStream(
  eventsSnapshot: AgentStreamEvent[],
  readRestStatus: () => DeepAgentSession['status'] | undefined,
  fetchSession: () => Promise<DeepAgentSession | null>
): Promise<void> {
  const overlay = streamOverlayTerminalStatus(eventsSnapshot)
  if (overlay !== 'waiting_for_human' || readRestStatus() !== 'running') return
  const deadline = Date.now() + REST_SYNC_MAX_MS
  while (Date.now() < deadline) {
    await fetchSession()
    const st = readRestStatus()
    if (st === 'waiting_for_human') break
    if (st !== 'running') break
    await new Promise(r => setTimeout(r, REST_SYNC_INTERVAL_MS))
  }
}

async function postInterruptWith409Retry(
  postInterrupt: () => Promise<unknown>,
  fetchSession: () => Promise<DeepAgentSession | null>
): Promise<void> {
  let attempts = 0
  while (true) {
    try {
      await postInterrupt()
      return
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      const isConflict = /409/.test(msg) && /Session is still running|waiting_for_human/i.test(msg)
      if (isConflict && attempts < 1) {
        attempts++
        await fetchSession()
        await new Promise(r => setTimeout(r, REST_SYNC_INTERVAL_MS))
        continue
      }
      throw error
    }
  }
}

const toEpoch = (timestamp: string): number => {
  const parsed = Date.parse(timestamp)
  return Number.isNaN(parsed) ? 0 : parsed
}

function epochFromStreamEvent(event: AgentStreamEvent): number | null {
  if (!('timestamp' in event) || typeof event.timestamp !== 'string') {
    return null
  }
  return toEpoch(event.timestamp)
}

const currentTurnTrace = (events: AgentStreamEvent[]): AgentStreamEvent[] => {
  if (events.length === 0) return events

  let latestHumanSeq = -1
  for (const event of events) {
    if (event.type === 'agent_chunk' && event.role === 'human' && typeof event.seq === 'number') {
      latestHumanSeq = Math.max(latestHumanSeq, event.seq)
    }
  }

  if (latestHumanSeq < 0) return events
  return events.filter(event => !('seq' in event) || typeof event.seq !== 'number' || event.seq >= latestHumanSeq)
}

const chunkStreamKey = (chunk: AgentChunkEvent): string | null => {
  const raw = chunk.metadata?.stream_key
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : null
}

const looksLikeInternalErrorLeak = (content: string): boolean => {
  const normalized = content.toLowerCase()
  return (
    normalized.includes("client error '400 bad request'") ||
    normalized.includes("client error '404 not found'") ||
    normalized.includes("client error '500") ||
    normalized.includes("client error '502") ||
    normalized.includes("client error '503") ||
    normalized.includes("client error '504") ||
    normalized.includes('for more information check: https://developer.mozilla.org/') ||
    normalized.includes('flow engine http error') ||
    normalized.includes('functions service call failed') ||
    normalized.includes('promptodm lookup failed')
  )
}

function sessionTraceOrEmpty(mergedSession: DeepAgentSession | null | undefined): AgentStreamEvent[] {
  return mergedSession?.trace ?? []
}

function buildStreamingContentFromSnapshots(events: AgentStreamEvent[]): string | null {
  const responseSnapshots = events
    .filter(
      (entry): entry is AgentChunkEvent =>
        entry.type === 'agent_chunk' &&
        entry.role === 'ai' &&
        entry.chunk_kind === 'response_stream' &&
        typeof entry.content === 'string' &&
        entry.content.trim().length > 0
    )
    .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

  if (responseSnapshots.length === 0) {
    return null
  }

  const primarySnapshots = responseSnapshots.filter(snapshot => chunkStreamKey(snapshot) !== 'continuation')
  const preferredSnapshots = primarySnapshots.length > 0 ? primarySnapshots : responseSnapshots
  const safeSnapshots = preferredSnapshots.filter(snapshot => !looksLikeInternalErrorLeak(snapshot.content.trim()))
  if (safeSnapshots.length === 0) {
    return ''
  }

  let stableContent = ''
  for (const snapshot of safeSnapshots) {
    const nextContent = snapshot.content.trim()
    if (!nextContent) continue
    if (!stableContent) {
      stableContent = nextContent
      continue
    }
    if (nextContent.length >= stableContent.length && nextContent.startsWith(stableContent)) {
      stableContent = nextContent
    }
  }

  return stableContent || safeSnapshots[safeSnapshots.length - 1].content.trim()
}

function buildStreamingContentFromLegacyThinking(events: AgentStreamEvent[]): string {
  const legacyThinking = events
    .filter(
      (entry): entry is AgentChunkEvent =>
        entry.type === 'agent_chunk' &&
        entry.role === 'ai' &&
        entry.chunk_kind === 'thinking' &&
        typeof entry.content === 'string' &&
        entry.content.trim().length > 0
    )
    .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

  if (legacyThinking.length === 0) {
    return ''
  }

  return legacyThinking
    .map(e => e.content.trim())
    .filter(Boolean)
    .join('\n\n')
}

function computeStreamingDisplayContent(
  liveTurnEvents: AgentStreamEvent[],
  lastReplyTimestamp: number,
  isAgentRunning: boolean,
  mergedStatus: DeepAgentSession['status'] | undefined
): string {
  const isActivelyRunning = isAgentRunning || mergedStatus === 'running'
  if (!isActivelyRunning) {
    return ''
  }

  if (lastReplyTimestamp > 0) {
    const hasRecentEvents = liveTurnEvents.some(event => {
      const t = epochFromStreamEvent(event)
      return t !== null && t >= lastReplyTimestamp
    })
    if (!hasRecentEvents) {
      return ''
    }
  }

  const fromSnapshots = buildStreamingContentFromSnapshots(liveTurnEvents)
  if (fromSnapshots !== null) {
    return fromSnapshots
  }

  return buildStreamingContentFromLegacyThinking(liveTurnEvents)
}

export const useAgentSession = (
  sessionId: string | null,
  accessToken: string,
  bootstrapSession?: DeepAgentSession | null
) => {
  const promptManagerClient = useEnterpriseAgentClient(accessToken)
  const flowBotClient = useFlowBotFabricClient(accessToken)
  const client: AgentExecutionClient = isFlowBotFabricRuntime() ? flowBotClient : promptManagerClient
  const [streamVersion, setStreamVersion] = useState(0)
  const { messages: streamMessages, events, isConnected } = useSessionStream(sessionId, accessToken, streamVersion)
  const initialCached = readSessionUiCache(sessionId)
  const [session, setSession] = useState<DeepAgentSession | null>(initialCached?.session ?? null)
  const [sessionLoadError, setSessionLoadError] = useState(false)
  // Tracks that a reply POST was sent and the agent is running, even before the stream delivers
  // new events. Terminal events clear this. Per-session state survives tab switches.
  const [isAgentRunning, setIsAgentRunning] = useState(initialCached?.isAgentRunning ?? false)
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>(initialCached?.optimisticMessages ?? [])
  const [activeSkill, setActiveSkill] = useState<ActiveSkillInfo | null>(initialCached?.activeSkill ?? null)
  // Tracks when a new reply was just sent to prevent showing stale streaming content
  const [lastReplyTimestamp, setLastReplyTimestamp] = useState<number>(initialCached?.lastReplyTimestamp ?? 0)

  const matchedBootstrapSession = useMemo(
    () => (bootstrapSession?.session_id === sessionId ? bootstrapSession : null),
    [bootstrapSession, sessionId]
  )

  const sessionRef = useRef<DeepAgentSession | null>(null)
  sessionRef.current = session ?? matchedBootstrapSession
  const eventsRef = useRef<AgentStreamEvent[]>([])
  eventsRef.current = events
  // Track the event count at which we last processed a terminal, so the
  // terminal-detection effect ignores stale terminals after events are cleared.
  const processedTerminalAtRef = useRef<number>(-1)

  const fetchSession = useCallback(async () => {
    if (!sessionId) return null
    try {
      const s = await client.getSession(sessionId)
      setSessionLoadError(false)
      setSession(s)
      return s
    } catch {
      setSessionLoadError(true)
      return null
    }
  }, [sessionId, client])

  useEffect(() => {
    // Hydrate from per-session cache so switching back to an in-flight session
    // restores its running flag / optimistic messages instead of flashing empty.
    // Falls back to a clean slate for sessions we've never seen.
    const cached = readSessionUiCache(sessionId)
    setSession(cached?.session ?? null)
    setSessionLoadError(false)
    setIsAgentRunning(cached?.isAgentRunning ?? false)
    setOptimisticMessages(cached?.optimisticMessages ?? [])
    setActiveSkill(cached?.activeSkill ?? null)
    setLastReplyTimestamp(cached?.lastReplyTimestamp ?? 0)
    processedTerminalAtRef.current = cached?.processedTerminalAt ?? -1
    if (!sessionId) {
      setStreamVersion(0)
      return
    }
    fetchSession().catch(() => undefined)
  }, [sessionId, fetchSession])

  // Persist volatile UI state back to the cache whenever it changes, so a
  // subsequent switch back to this session re-hydrates correctly.
  useEffect(() => {
    if (!sessionId) return
    writeSessionUiCache(sessionId, {
      session,
      isAgentRunning,
      optimisticMessages,
      activeSkill,
      lastReplyTimestamp,
      processedTerminalAt: processedTerminalAtRef.current
    })
  }, [sessionId, session, isAgentRunning, optimisticMessages, activeSkill, lastReplyTimestamp])

  // Unified fallback poller.
  //
  // We used to run two concurrent setInterval timers here — a generic poll
  // and a separate "watchdog" while `isAgentRunning` — both hitting the
  // session trace endpoint. That produced thousands of requests per session
  // (visible in the network panel during long turns). Now we collapse them
  // into a single cadence:
  //
  //   • SSE disconnected        → 3s (so the UI still makes progress when
  //                                   the stream is down and we rely on REST)
  //   • SSE connected           → 15s (sparse safety net; terminal events
  //                                    and explicit fetchSession calls on
  //                                    SSE reconnect do the real work).
  //
  // The BE now supports ETag + If-None-Match on this endpoint, so even when
  // the poll fires there's minimal cost when nothing changed.
  useEffect(() => {
    if (!sessionId) return

    const intervalMs = isConnected ? POLL_WHILE_SSE_MS : POLL_INTERVAL_MS
    const timer = setInterval(async () => {
      const current = sessionRef.current
      if (!current) return
      if (isTerminalStatus(current.status)) {
        clearInterval(timer)
        return
      }
      const next = await fetchSession()
      if (next && isTerminalStatus(next.status)) {
        setIsAgentRunning(false)
        clearInterval(timer)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [sessionId, fetchSession, isConnected])

  useEffect(() => {
    if (events.length === 0) return
    const lastEvent = events[events.length - 1]
    if (lastEvent?.type !== 'terminal') return
    // Guard: only act on a terminal event if we haven't already processed one
    // at this exact events.length. This prevents stale terminals (carried over
    // from a previous turn before the events array is cleared) from
    // prematurely resetting isAgentRunning when fetchSession ref changes.
    if (processedTerminalAtRef.current === events.length) return
    processedTerminalAtRef.current = events.length
    setIsAgentRunning(false)
    fetchSession().catch(() => undefined)
  }, [events, fetchSession])

  useEffect(() => {
    if (streamMessages.length === 0) return
    const hasRealUserMessages = streamMessages.some(m => m.type === 'user_input' && !m.id.startsWith('optimistic-'))
    if (hasRealUserMessages) {
      setOptimisticMessages([])
    }
  }, [streamMessages])

  useEffect(() => {
    if (events.length === 0) return
    const skillEvent = events.find((e): e is SkillLoadedEvent => e.type === 'skill_loaded')
    if (skillEvent?.skill) {
      setActiveSkill({
        skill_id: skillEvent.skill.skill_id,
        name: skillEvent.skill.name,
        category: skillEvent.skill.category,
        description: skillEvent.skill.description,
        icon: skillEvent.skill.icon,
        was_auto_detected: skillEvent.was_auto_detected
      })
    }
  }, [events])

  // Clear lastReplyTimestamp once we receive fresh events from the new turn
  useEffect(() => {
    if (lastReplyTimestamp === 0 || events.length === 0) return

    const hasFreshEvents = events.some(event => {
      const eventTime = epochFromStreamEvent(event)
      return eventTime !== null && eventTime >= lastReplyTimestamp
    })

    if (hasFreshEvents) {
      setLastReplyTimestamp(0)
    }
  }, [events, lastReplyTimestamp])

  const mergedSession = useMemo((): DeepAgentSession | null => {
    const restSession = session ?? matchedBootstrapSession
    if (!restSession) return null

    // REST session status is AUTHORITATIVE for terminal states.
    // If REST says completed/failed/cancelled, that's the final answer.
    // SSE may have stale or intermediate terminal events (e.g. waiting_for_human)
    // that should not override a completed REST status.
    const restStatus = restSession.status
    const isRestTerminal = restStatus === 'completed' || restStatus === 'failed' || restStatus === 'cancelled'

    if (isRestTerminal) {
      return restSession // REST is authoritative, no overlay needed
    }

    // For non-terminal REST status, SSE terminal events provide real-time updates
    let status: DeepAgentSession['status'] = restStatus
    for (const ev of events) {
      if (ev.type === 'terminal') status = ev.status
    }
    return { ...restSession, status }
  }, [session, matchedBootstrapSession, events])

  const messages: ChatMessage[] = useMemo(() => {
    // Production-grade approach: Server (REST session.trace) is the source of truth.
    // SSE streamMessages are ONLY used for real-time updates during active streaming.
    // Once the session reaches a terminal state, REST trace is authoritative.

    const restSession = session ?? matchedBootstrapSession
    const isRestTerminal = restSession && isTerminalStatus(restSession.status)

    // Get authoritative messages from REST session trace
    const traceMessages = mergedSession ? sessionToMessages(mergedSession) : []

    if (isRestTerminal && !isAgentRunning) {
      // Session is complete - use REST trace as the single source of truth.
      // Trace is already in correct order from the server.
      return traceMessages
    }

    // Session is running - show REST trace + any SSE messages not yet in trace.
    // Dedupe strictly by stable ChatMessage.id (no fragile seq-suffix parsing —
    // many message types like expert_call / tool_call / tool_result use
    // step_id-based ids WITHOUT a trailing `:seq`, and the previous sort would
    // pull every such message to the bottom of the conversation regardless of
    // where it actually belonged, causing experts / tool calls to visually
    // "shift under" later user replies and appear duplicated above/below.
    //
    // Both `traceMessages` and `streamMessages` already come out of
    // `deriveMessagesFromEvents` in server/seq order, so preserving each
    // source's ordering and merging them is sufficient — no global re-sort.
    const traceIds = new Set(traceMessages.map(m => m.id))
    const newStreamMessages = streamMessages.filter(m => !traceIds.has(m.id))

    return [...traceMessages, ...newStreamMessages, ...optimisticMessages]
  }, [streamMessages, mergedSession, optimisticMessages, isAgentRunning, session, matchedBootstrapSession])

  const liveTurnEvents = useMemo(() => {
    if (events.length > 0) return currentTurnTrace(events)
    return currentTurnTrace(sessionTraceOrEmpty(mergedSession))
  }, [events, mergedSession])

  // Extract greeting from the ENTIRE session history, not just current turn
  // This ensures we only show one greeting at the very beginning
  const streamingGreeting = useMemo(() => {
    const allEvents = events.length > 0 ? events : sessionTraceOrEmpty(mergedSession)
    const greetingEvents = allEvents
      .filter(
        (entry): entry is AgentChunkEvent =>
          entry.type === 'agent_chunk' &&
          entry.role === 'ai' &&
          entry.chunk_kind === 'final' &&
          typeof entry.content === 'string' &&
          entry.content.trim().length > 0
      )
      .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

    // Only return the FIRST greeting ever, not per-turn
    return greetingEvents[0]?.content.trim() ?? ''
  }, [events, mergedSession])

  const streamingContent = useMemo(
    () => computeStreamingDisplayContent(liveTurnEvents, lastReplyTimestamp, isAgentRunning, mergedSession?.status),
    [isAgentRunning, liveTurnEvents, mergedSession?.status, lastReplyTimestamp]
  )

  // Extract agent reasoning/thinking from ALL session events (not filtered by turn)
  // This ensures thinking is visible even after human-in-the-loop replies
  const streamingThinking = useMemo(() => {
    // Show thinking during active sessions, but also keep it visible briefly after completion
    const allEvents = events.length > 0 ? events : sessionTraceOrEmpty(mergedSession)
    const thinkingSnapshots = allEvents
      .filter(
        (entry): entry is AgentChunkEvent =>
          entry.type === 'agent_chunk' &&
          entry.role === 'ai' &&
          entry.chunk_kind === 'agent_reasoning' &&
          typeof entry.content === 'string' &&
          entry.content.trim().length > 0
      )
      .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

    if (thinkingSnapshots.length > 0) {
      // Get the latest/longest thinking snapshot (cumulative mode)
      const latestThinking = thinkingSnapshots[thinkingSnapshots.length - 1]
      return latestThinking.content.trim()
    }

    return ''
  }, [events, mergedSession])

  // Extract the latest status update from agent_chunk events with chunk_kind='status'
  // This provides real-time status headlines during agent initialization and execution
  const statusHeadline = useMemo(() => {
    // Clear status when session is completed/failed/cancelled
    if (
      mergedSession?.status === 'completed' ||
      mergedSession?.status === 'failed' ||
      mergedSession?.status === 'cancelled'
    ) {
      return null
    }

    if (!events || events.length === 0) return null

    // Get latest status event from the stream
    const statusEvents = events
      .filter((e): e is AgentChunkEvent => e.type === 'agent_chunk' && e.chunk_kind === 'status')
      .sort((a, b) => toEpoch(b.timestamp) - toEpoch(a.timestamp))

    if (statusEvents.length > 0) {
      // Remove emoji prefix if present (backend adds 🔄)
      return statusEvents[0].content.replace(/🔄\s*/, '')
    }

    return null
  }, [events, mergedSession?.status])

  const startSession = useCallback(
    async (
      task: string,
      config?: SessionConfig,
      activeExternalConnectionIds?: string[],
      activeEnterpriseSkillId?: string,
      fallbackSkillId?: string
    ): Promise<StartSessionResponse> => {
      return client.startSession(task, config, activeExternalConnectionIds, activeEnterpriseSkillId, fallbackSkillId)
    },
    [client]
  )

  const reply = useCallback(
    async (message?: string, structuredInput?: Record<string, any>) => {
      if (!sessionId) return

      // Avoid TS control-flow narrowing on sessionRef inside the sync loop (ref updates after fetch).
      const readRestStatus = (): DeepAgentSession['status'] | undefined => sessionRef.current?.status

      await waitForRestSyncWithWaitingHumanStream(eventsRef.current, readRestStatus, fetchSession)

      const optimisticId = `optimistic-${Date.now()}`
      if (message && !structuredInput) {
        const optimisticMessage: ChatMessage = {
          id: optimisticId,
          type: 'user_input',
          timestamp: new Date().toISOString(),
          content: message
        }
        setOptimisticMessages(prev => [...prev, optimisticMessage])
      }

      setIsAgentRunning(true)
      setLastReplyTimestamp(Date.now()) // Mark when we sent a new reply to prevent showing stale content
      const postInterrupt = () => client.replyToInterrupt(sessionId, message, structuredInput)

      try {
        await postInterruptWith409Retry(postInterrupt, fetchSession)
        if (!isFlowBotFabricRuntime()) {
          setStreamVersion(v => v + 1)
        }
        await fetchSession()
        setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticId))
      } catch (error) {
        console.error('[reply] Error sending to backend:', error instanceof Error ? error.message : 'Request failed')
        setIsAgentRunning(false)
        setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticId))
        throw error
      }
    },
    [sessionId, client, fetchSession]
  )

  return {
    session: mergedSession,
    messages,
    events,
    streamingGreeting,
    streamingContent,
    streamingThinking,
    statusHeadline,
    isConnected,
    isStreaming: isAgentRunning || (!!mergedSession && mergedSession.status === 'running'),
    isWaitingForInput: mergedSession?.status === 'waiting_for_human',
    sessionLoadError,
    activeSkill,
    startSession,
    reply,
    retrySessionLoad: fetchSession
  }
}
