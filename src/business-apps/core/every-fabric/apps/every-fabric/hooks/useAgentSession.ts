import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AgentChunkEvent,
  AgentStreamEvent,
  ChatMessage,
  DeepAgentSession,
  SessionConfig,
  SkillLoadedEvent
} from '../types/enterpriseAgent'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'
import { useSessionStream } from './useSessionStream'
import { sessionToMessages } from '../utils/messageUtils'

export interface ActiveSkillInfo {
  skill_id: string
  name: string
  category: string
  description: string
  icon?: string
  was_auto_detected: boolean
}

const POLL_INTERVAL_MS = 3000
const POLL_WHILE_SSE_MS = 6000
const REST_SYNC_MAX_MS = 4000
const REST_SYNC_INTERVAL_MS = 120

const isTerminalStatus = (status: string) => status !== 'running' && status !== 'pending'

/** Last terminal status in the event stream (same overlay rule as mergedSession). */
const streamOverlayTerminalStatus = (events: AgentStreamEvent[]): string | null => {
  let status: string | null = null
  for (const ev of events) {
    if (ev.type === 'terminal') status = ev.status
  }
  return status
}

const extractSeq = (messageId: string): number | null => {
  const match = /:(\d+)$/.exec(messageId)
  if (!match) return null
  const seq = Number.parseInt(match[1], 10)
  return Number.isNaN(seq) ? null : seq
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

export const useAgentSession = (sessionId: string | null, accessToken: string) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [streamVersion, setStreamVersion] = useState(0)
  const { messages: streamMessages, events, isConnected } = useSessionStream(sessionId, accessToken, streamVersion)
  const [session, setSession] = useState<DeepAgentSession | null>(null)
  // Tracks that a reply POST was sent and the agent is running, even before the stream delivers
  // new events. Terminal events clear this. Resets on session switch.
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([])
  const [activeSkill, setActiveSkill] = useState<ActiveSkillInfo | null>(null)

  const sessionRef = useRef<DeepAgentSession | null>(null)
  sessionRef.current = session
  const eventsRef = useRef<AgentStreamEvent[]>([])
  eventsRef.current = events
  // Track the event count at which we last processed a terminal, so the
  // terminal-detection effect ignores stale terminals after events are cleared.
  const processedTerminalAtRef = useRef<number>(-1)

  const fetchSession = useCallback(async () => {
    if (!sessionId) return null
    try {
      const s = await client.getSession(sessionId)
      setSession(s)
      return s
    } catch {
      return null
    }
  }, [sessionId, client])

  useEffect(() => {
    // Always wipe stale data immediately so switching sessions never shows the previous
    // session's messages while the new session loads.
    setSession(null)
    setIsAgentRunning(false)
    setOptimisticMessages([])
    setActiveSkill(null)
    processedTerminalAtRef.current = -1
    if (!sessionId) {
      setStreamVersion(0)
      return
    }
    fetchSession().catch(() => undefined)
  }, [sessionId, fetchSession])

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
      await fetchSession()
    }, intervalMs)

    return () => clearInterval(timer)
  }, [sessionId, fetchSession, isConnected])

  // Watchdog: when isAgentRunning is true, poll more aggressively to catch
  // completion even if SSE fails to deliver the terminal event.
  useEffect(() => {
    if (!sessionId || !isAgentRunning) return

    const watchdogTimer = setInterval(async () => {
      const s = await fetchSession()
      if (s && isTerminalStatus(s.status)) {
        setIsAgentRunning(false)
        clearInterval(watchdogTimer)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(watchdogTimer)
  }, [sessionId, isAgentRunning, fetchSession])

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

  const mergedSession = useMemo((): DeepAgentSession | null => {
    if (!session) return null

    // REST session status is AUTHORITATIVE for terminal states.
    // If REST says completed/failed/cancelled, that's the final answer.
    // SSE may have stale or intermediate terminal events (e.g. waiting_for_human)
    // that should not override a completed REST status.
    const restStatus = session.status
    const isRestTerminal = restStatus === 'completed' || restStatus === 'failed' || restStatus === 'cancelled'

    if (isRestTerminal) {
      return session // REST is authoritative, no overlay needed
    }

    // For non-terminal REST status, SSE terminal events provide real-time updates
    let status: DeepAgentSession['status'] = restStatus
    for (const ev of events) {
      if (ev.type === 'terminal') status = ev.status
    }
    return { ...session, status }
  }, [session, events])

  const messages: ChatMessage[] = useMemo(() => {
    // Production-grade approach: Server (REST session.trace) is the source of truth.
    // SSE streamMessages are ONLY used for real-time updates during active streaming.
    // Once the session reaches a terminal state, REST trace is authoritative.

    const isSessionTerminal = mergedSession && isTerminalStatus(mergedSession.status)

    // Get authoritative messages from REST session trace
    const traceMessages = mergedSession ? sessionToMessages(mergedSession) : []

    if (isSessionTerminal && !isAgentRunning) {
      // Session is complete - use REST trace as the single source of truth.
      // Trace is already in correct order from the server.
      return traceMessages
    }

    // Session is running - show REST trace + any SSE messages with higher seq than trace
    // This provides real-time updates while maintaining correct order
    const traceSeqs = new Set<number>()
    for (const msg of traceMessages) {
      const seq = extractSeq(msg.id)
      if (seq !== null) traceSeqs.add(seq)
    }

    // Only add SSE messages that aren't already in the trace
    const newStreamMessages = streamMessages.filter(msg => {
      const seq = extractSeq(msg.id)
      return seq !== null && !traceSeqs.has(seq)
    })

    // Combine: trace (already ordered) + new SSE messages (ordered) + optimistic (at end)
    const combined = [...traceMessages, ...newStreamMessages, ...optimisticMessages]

    // Sort by seq for consistency (trace is already ordered, but new messages need proper placement)
    return combined.sort((a, b) => {
      const aSeq = extractSeq(a.id)
      const bSeq = extractSeq(b.id)
      // Both have seq: sort by seq
      if (aSeq !== null && bSeq !== null) return aSeq - bSeq
      // One has seq, other doesn't: seq'd messages first, then others
      if (aSeq !== null) return -1
      if (bSeq !== null) return 1
      // Neither has seq (optimistic messages): sort by timestamp
      return toEpoch(a.timestamp) - toEpoch(b.timestamp)
    })
  }, [streamMessages, mergedSession, optimisticMessages, isAgentRunning])

  // Aggregate streaming content from agent_thinking messages for progressive display.
  // This is used by StreamingAnswerBubble to show the AI response as it generates.
  // We look at BOTH SSE stream messages AND the combined messages array to ensure
  // we capture thinking content regardless of timing between SSE and REST updates.
  const streamingContent = useMemo(() => {
    // Only show streaming content while agent is actively working
    const isActivelyRunning = isAgentRunning || mergedSession?.status === 'running'
    if (!isActivelyRunning) {
      return ''
    }

    // First check SSE stream messages (real-time)
    const sseThinking = streamMessages
      .filter(
        (m): m is ChatMessage & { content: string } => m.type === 'agent_thinking' && typeof m.content === 'string'
      )
      .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))

    if (sseThinking.length > 0) {
      return sseThinking
        .map(m => m.content.trim())
        .filter(Boolean)
        .join('\n\n')
    }

    // Fallback: check REST trace for any AI chunks if SSE hasn't delivered yet
    const trace = mergedSession?.trace ?? []
    const traceAiChunks = trace
      .filter(
        (entry): entry is AgentChunkEvent =>
          entry.type === 'agent_chunk' &&
          entry.role === 'ai' &&
          typeof entry.content === 'string' &&
          entry.content.trim().length > 0
      )
      .slice(-5) // Last few chunks

    if (traceAiChunks.length > 0) {
      return traceAiChunks
        .map(e => e.content.trim())
        .filter(Boolean)
        .join('\n\n')
    }

    return ''
  }, [streamMessages, isAgentRunning, mergedSession?.status, mergedSession?.trace])

  const startSession = useCallback(
    async (
      task: string,
      config?: SessionConfig,
      activeExternalConnectionIds?: string[],
      activeEnterpriseSkillId?: string,
      fallbackSkillId?: string
    ) => {
      const { session_id } = await client.startSession(
        task,
        config,
        activeExternalConnectionIds,
        activeEnterpriseSkillId,
        fallbackSkillId
      )
      return session_id
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
      const postInterrupt = () => client.replyToInterrupt(sessionId, message, structuredInput)

      try {
        await postInterruptWith409Retry(postInterrupt, fetchSession)
        setStreamVersion(v => v + 1)
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
    streamingContent,
    isConnected,
    isStreaming: isAgentRunning || (!!mergedSession && mergedSession.status === 'running'),
    isWaitingForInput: mergedSession?.status === 'waiting_for_human',
    activeSkill,
    startSession,
    reply
  }
}
