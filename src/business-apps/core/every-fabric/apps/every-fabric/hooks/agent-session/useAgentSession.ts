import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AgentStreamEvent,
  ChatMessage,
  DeepAgentSession,
  MessageAttachmentRef,
  SessionConfig,
  StartSessionResponse
} from '../../types/enterpriseAgent'
import { invalidateDeepAgentSessionEtagCache, useEnterpriseAgentClient } from '../useEnterpriseAgentClient'
import { useFlowBotFabricClient } from '../useFlowBotFabricClient'
import { appendSessionStreamEvents, markSessionStreamRestTerminal } from '../sessionStreamRegistry'
import { useSessionStream } from '../useSessionStream'
import { isFlowBotFabricRuntime } from '../../utils/fabricRuntime'
import { postSessionReply } from './replyFlow'
import { readSessionUiCache, writeSessionUiCache } from './sessionUiStateCache'
import { deriveStreamSuppressed, isRestTerminalForCurrentTurn, isTerminalStatus } from './sessionStatus'
import { currentTurnTraceSince, epochFromStreamEvent } from './traceTurn'
import type { ActiveSkillInfo, AgentExecutionClient } from './types'
import { POLL_INTERVAL_MS, POLL_INTERVAL_WHILE_SSE_CONNECTED_MS } from './types'
import { pickActiveSkillFromEvents } from './skillFromEvents'
import { useAgentSessionDerived } from './useAgentSessionDerived'

export { deriveFabricIsStreaming } from './sessionStatus'
export { looksLikeRawPayload } from './streamPayloadGuards'
export type { ActiveSkillInfo } from './types'

export const useAgentSession = (
  sessionId: string | null,
  accessToken: string,
  bootstrapSession?: DeepAgentSession | null
) => {
  const promptManagerClient = useEnterpriseAgentClient(accessToken)
  const flowBotClient = useFlowBotFabricClient(accessToken)
  const client: AgentExecutionClient = isFlowBotFabricRuntime() ? flowBotClient : promptManagerClient
  const initialCached = readSessionUiCache(sessionId)
  const matchedBootstrapSession = useMemo(
    () => (bootstrapSession?.session_id === sessionId ? bootstrapSession : null),
    [bootstrapSession, sessionId]
  )
  const [session, setSession] = useState<DeepAgentSession | null>(initialCached?.session ?? null)
  const [streamVersion, setStreamVersion] = useState(0)
  const [sessionLoadError, setSessionLoadError] = useState(false)
  const [isAgentRunning, setIsAgentRunning] = useState(initialCached?.isAgentRunning ?? false)
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>(initialCached?.optimisticMessages ?? [])
  const [activeSkill, setActiveSkill] = useState<ActiveSkillInfo | null>(initialCached?.activeSkill ?? null)
  const [lastReplyTimestamp, setLastReplyTimestamp] = useState<number>(initialCached?.lastReplyTimestamp ?? 0)
  const streamSuppressed = useMemo(() => {
    const rest = session ?? matchedBootstrapSession
    return deriveStreamSuppressed(rest, isAgentRunning)
  }, [session, matchedBootstrapSession, isAgentRunning])
  const {
    messages: streamMessages,
    events,
    isConnected
  } = useSessionStream(sessionId, accessToken, streamVersion, streamSuppressed)

  const sessionRef = useRef<DeepAgentSession | null>(null)
  sessionRef.current = session ?? matchedBootstrapSession
  const eventsRef = useRef(events)
  eventsRef.current = events
  const processedTerminalAtRef = useRef<number>(-1)
  const previewUrlByAttachmentId = useRef<Map<string, string>>(new Map())
  const isAgentRunningRef = useRef(isAgentRunning)
  isAgentRunningRef.current = isAgentRunning
  const isConnectedRef = useRef(isConnected)
  isConnectedRef.current = isConnected
  const streamSuppressedRef = useRef(streamSuppressed)
  streamSuppressedRef.current = streamSuppressed
  const lastReplyTimestampRef = useRef(lastReplyTimestamp)
  lastReplyTimestampRef.current = lastReplyTimestamp

  const fetchSession = useCallback(
    async (options?: { bypassCache?: boolean }) => {
      if (!sessionId) return null
      try {
        const s = await client.getSession(sessionId, options)
        setSessionLoadError(false)
        setSession(s)
        if (s?.trace?.length) {
          // While a reply is in flight the REST snapshot still carries the
          // *previous* turn's `terminal` row. Appending that verbatim makes the
          // live stream registry mark `terminalReached` and abort the current
          // turn's SSE before its response renders. Scope the append to the
          // current turn so a stale prior-turn terminal can't poison the
          // live stream. (The full REST trace still drives history rendering.)
          const replyStartedAt = lastReplyTimestampRef.current
          const replyInFlight = replyStartedAt > 0 || isAgentRunningRef.current
          const traceForRegistry = replyInFlight
            ? currentTurnTraceSince(s.trace as AgentStreamEvent[], replyStartedAt)
            : (s.trace as AgentStreamEvent[])
          if (traceForRegistry.length > 0) {
            appendSessionStreamEvents(sessionId, traceForRegistry, accessToken)
          }
        }
        // Only suppress the live stream for a terminal snapshot that belongs to
        // the current turn. A stale previous-turn `completed` replay during a
        // follow-up would otherwise kill the SSE stream mid-answer.
        if (isRestTerminalForCurrentTurn(s, lastReplyTimestampRef.current)) {
          markSessionStreamRestTerminal(sessionId)
        }
        return s
      } catch {
        setSessionLoadError(true)
        return null
      }
    },
    [sessionId, client, accessToken]
  )

  useEffect(() => {
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

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const scheduleNext = (delayMs: number) => {
      if (cancelled) return
      timeoutId = setTimeout(() => {
        void pollOnce()
      }, delayMs)
    }

    const pollOnce = async () => {
      if (cancelled) return
      const current = sessionRef.current
      const needsWork =
        isAgentRunningRef.current || current?.status === 'running' || current?.status === 'pending' || !current
      if (!needsWork && current && isTerminalStatus(current.status)) {
        setIsAgentRunning(false)
        return
      }

      const sessionActivelyStreaming =
        isAgentRunningRef.current || current?.status === 'running' || current?.status === 'pending'
      const sseLive = sessionActivelyStreaming && isConnectedRef.current && !streamSuppressedRef.current
      // SSE owns incremental tokens; REST still syncs coalesced trace rows on a
      // slower cadence so missed SSE upserts do not freeze the bubble until terminal.
      const next = await fetchSession(needsWork ? { bypassCache: true } : undefined)
      // Ignore a stale previous-turn terminal snapshot while a reply is in
      // flight; otherwise streaming flips off mid-turn and the bubble freezes.
      if (isRestTerminalForCurrentTurn(next, lastReplyTimestampRef.current)) {
        setIsAgentRunning(false)
        setLastReplyTimestamp(0)
      }

      const nextDelay = sseLive ? POLL_INTERVAL_WHILE_SSE_CONNECTED_MS : POLL_INTERVAL_MS
      scheduleNext(nextDelay)
    }

    scheduleNext(POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [sessionId, fetchSession])

  useEffect(() => {
    if (events.length === 0) return
    const lastEvent = events[events.length - 1]
    if (lastEvent?.type !== 'terminal' && lastEvent?.type !== 'turn_snapshot') return
    if (processedTerminalAtRef.current === events.length) return
    if (lastReplyTimestamp > 0) {
      const terminalTime = epochFromStreamEvent(lastEvent)
      if (terminalTime !== null && terminalTime < lastReplyTimestamp) return
    }
    processedTerminalAtRef.current = events.length
    setIsAgentRunning(false)
    setLastReplyTimestamp(0)
    if (sessionId) invalidateDeepAgentSessionEtagCache(sessionId)
    fetchSession({ bypassCache: true }).catch(() => undefined)
  }, [events, fetchSession, sessionId, lastReplyTimestamp])

  useEffect(() => {
    if (streamMessages.length === 0) return
    const hasRealUserMessages = streamMessages.some(m => m.type === 'user_input' && !m.id.startsWith('optimistic-'))
    if (hasRealUserMessages) setOptimisticMessages([])
  }, [streamMessages])

  useEffect(() => {
    const next = pickActiveSkillFromEvents(events)
    if (next) setActiveSkill(next)
  }, [events])

  useEffect(() => {
    if (lastReplyTimestamp === 0 || events.length === 0) return
    const hasFreshEvents = events.some(event => {
      const eventTime = epochFromStreamEvent(event)
      return eventTime !== null && eventTime >= lastReplyTimestamp
    })
    if (hasFreshEvents) setLastReplyTimestamp(0)
  }, [events, lastReplyTimestamp])

  const derived = useAgentSessionDerived({
    session,
    matchedBootstrapSession,
    events,
    streamMessages,
    optimisticMessages,
    isAgentRunning,
    lastReplyTimestamp,
    previewUrlByAttachmentId: previewUrlByAttachmentId.current
  })

  useEffect(() => {
    if (!derived.mergedSession || isAgentRunning) return
    if (!isTerminalStatus(derived.mergedSession.status)) return
    setIsAgentRunning(false)
    setLastReplyTimestamp(0)
    if (sessionId) markSessionStreamRestTerminal(sessionId)
  }, [derived.mergedSession?.status, derived.mergedSession?.session_id, sessionId, isAgentRunning])

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

  const activateSession = useCallback(
    async (targetSessionId: string): Promise<StartSessionResponse> => client.activateSession(targetSessionId),
    [client]
  )

  const reply = useCallback(
    async (message?: string, structuredInput?: Record<string, any>, attachments?: MessageAttachmentRef[]) => {
      if (!sessionId) return
      await postSessionReply({
        sessionId,
        client,
        message,
        structuredInput,
        attachments,
        previewUrlByAttachmentId: previewUrlByAttachmentId.current,
        eventsSnapshot: eventsRef.current,
        readRestStatus: () => sessionRef.current?.status,
        fetchSession,
        setOptimisticMessages,
        setIsAgentRunning,
        setLastReplyTimestamp,
        setStreamVersion
      })
    },
    [sessionId, client, fetchSession]
  )

  return {
    session: derived.mergedSession,
    messages: derived.messages,
    events,
    streamingGreeting: derived.streamingGreeting,
    streamingContent: derived.streamingContent,
    streamingThinking: derived.streamingThinking,
    statusHeadline: derived.statusHeadline,
    liveStatusHeadline: derived.liveStatusHeadline,
    displayStatus: derived.displayStatus,
    ackHeadline: derived.ackHeadline,
    planItems: derived.planItems,
    agentActivityLines: derived.agentActivityLines,
    isConnected,
    isStreaming: derived.isStreaming,
    isWaitingForInput: derived.mergedSession?.status === 'waiting_for_human',
    sessionLoadError,
    activeSkill,
    startSession,
    activateSession,
    reply,
    retrySessionLoad: fetchSession
  }
}
