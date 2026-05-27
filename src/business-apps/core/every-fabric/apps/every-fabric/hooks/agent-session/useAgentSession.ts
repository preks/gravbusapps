import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ChatMessage,
  DeepAgentSession,
  MessageAttachmentRef,
  SessionConfig,
  StartSessionResponse
} from '../../types/enterpriseAgent'
import { invalidateDeepAgentSessionEtagCache, useEnterpriseAgentClient } from '../useEnterpriseAgentClient'
import { useFlowBotFabricClient } from '../useFlowBotFabricClient'
import { markSessionStreamRestTerminal } from '../sessionStreamRegistry'
import { useSessionStream } from '../useSessionStream'
import { isFlowBotFabricRuntime } from '../../utils/fabricRuntime'
import { postSessionReply } from './replyFlow'
import { readSessionUiCache, writeSessionUiCache } from './sessionUiStateCache'
import { isTerminalStatus } from './sessionStatus'
import { epochFromStreamEvent } from './traceTurn'
import type { ActiveSkillInfo, AgentExecutionClient } from './types'
import { POLL_INTERVAL_MS } from './types'
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
  const streamSuppressed = useMemo(() => {
    const rest = session ?? matchedBootstrapSession
    return !!(rest && isTerminalStatus(rest.status))
  }, [session, matchedBootstrapSession])
  const {
    messages: streamMessages,
    events,
    isConnected
  } = useSessionStream(sessionId, accessToken, streamVersion, streamSuppressed)
  const [sessionLoadError, setSessionLoadError] = useState(false)
  const [isAgentRunning, setIsAgentRunning] = useState(initialCached?.isAgentRunning ?? false)
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>(initialCached?.optimisticMessages ?? [])
  const [activeSkill, setActiveSkill] = useState<ActiveSkillInfo | null>(initialCached?.activeSkill ?? null)
  const [lastReplyTimestamp, setLastReplyTimestamp] = useState<number>(initialCached?.lastReplyTimestamp ?? 0)

  const sessionRef = useRef<DeepAgentSession | null>(null)
  sessionRef.current = session ?? matchedBootstrapSession
  const eventsRef = useRef(events)
  eventsRef.current = events
  const processedTerminalAtRef = useRef<number>(-1)
  const previewUrlByAttachmentId = useRef<Map<string, string>>(new Map())
  const isAgentRunningRef = useRef(isAgentRunning)
  isAgentRunningRef.current = isAgentRunning

  const fetchSession = useCallback(
    async (options?: { bypassCache?: boolean }) => {
      if (!sessionId) return null
      try {
        const s = await client.getSession(sessionId, options)
        setSessionLoadError(false)
        setSession(s)
        if (s && isTerminalStatus(s.status)) {
          markSessionStreamRestTerminal(sessionId)
        }
        return s
      } catch {
        setSessionLoadError(true)
        return null
      }
    },
    [sessionId, client]
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
    const timer = setInterval(async () => {
      const current = sessionRef.current
      const needsWork =
        isAgentRunningRef.current || current?.status === 'running' || current?.status === 'pending' || !current
      if (!needsWork && current && isTerminalStatus(current.status)) {
        setIsAgentRunning(false)
        return
      }
      const next = await fetchSession(needsWork ? { bypassCache: true } : undefined)
      if (next && isTerminalStatus(next.status)) {
        setIsAgentRunning(false)
        setLastReplyTimestamp(0)
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [sessionId, fetchSession])

  useEffect(() => {
    if (events.length === 0) return
    const lastEvent = events[events.length - 1]
    if (lastEvent?.type !== 'terminal') return
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
    if (!derived.mergedSession) return
    if (!isTerminalStatus(derived.mergedSession.status)) return
    setIsAgentRunning(false)
    setLastReplyTimestamp(0)
    if (sessionId) markSessionStreamRestTerminal(sessionId)
  }, [derived.mergedSession?.status, derived.mergedSession?.session_id, sessionId])

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
