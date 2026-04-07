import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage, DeepAgentSession, SessionConfig } from '../types/enterpriseAgent'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'
import { useSessionStream } from './useSessionStream'
import { sessionToMessages } from '../utils/messageUtils'

const POLL_INTERVAL_MS = 3000

const isTerminalStatus = (status: string) => status !== 'running' && status !== 'pending'

const extractSeq = (messageId: string): number | null => {
  const match = messageId.match(/:(\d+)$/)
  if (!match) return null
  const seq = parseInt(match[1], 10)
  return Number.isNaN(seq) ? null : seq
}

const messageSignature = (message: ChatMessage): string => {
  if (message.type === 'final_answer') return `final_answer:${message.id}`
  if (message.type === 'human_interrupt') return `human_interrupt:${message.id}`
  if (message.type === 'structured_input_request') return `structured_input_request:${message.id}`
  if (message.type === 'error') return `error:${message.id}`

  if (message.type === 'user_input') {
    const content = typeof message.content === 'string' ? message.content.trim() : String(message.content)
    return `user_input:${content}`
  }

  return `${message.id}`
}

const toEpoch = (timestamp: string): number => {
  const parsed = Date.parse(timestamp)
  return Number.isNaN(parsed) ? 0 : parsed
}

const messageTypeOrder = (type: ChatMessage['type']): number => {
  switch (type) {
    case 'user_input':
      return 0
    case 'agent_thinking':
      return 1
    case 'plan':
      return 2
    case 'tool_call':
      return 3
    case 'tool_result':
      return 4
    case 'reflection':
      return 5
    case 'expert_call':
      return 6
    case 'human_interrupt':
      return 7
    case 'structured_input_request':
      return 8
    case 'final_answer':
      return 9
    case 'error':
      return 10
    default:
      return 11
  }
}

const mergeDuplicateMessage = (existing: ChatMessage, incoming: ChatMessage): ChatMessage => {
  if (existing.type !== incoming.type) return incoming

  if (incoming.type === 'user_input') {
    return toEpoch(existing.timestamp) <= toEpoch(incoming.timestamp) ? existing : incoming
  }

  if (
    incoming.type === 'final_answer' ||
    incoming.type === 'human_interrupt' ||
    incoming.type === 'structured_input_request' ||
    incoming.type === 'error'
  ) {
    return toEpoch(existing.timestamp) >= toEpoch(incoming.timestamp) ? existing : incoming
  }

  return toEpoch(existing.timestamp) <= toEpoch(incoming.timestamp) ? existing : incoming
}

export const useAgentSession = (sessionId: string | null, accessToken: string) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [streamVersion, setStreamVersion] = useState(0)
  const { messages: streamMessages, events, isConnected } = useSessionStream(sessionId, accessToken, streamVersion)
  const [session, setSession] = useState<DeepAgentSession | null>(null)
  // Tracks that a reply POST was sent and the agent is running, even before the stream delivers
  // new events. Terminal events clear this. Resets on session switch.
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [dismissedInterruptKey, setDismissedInterruptKey] = useState<string | null>(null)
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([])

  const sessionRef = useRef<DeepAgentSession | null>(null)
  sessionRef.current = session

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
    setDismissedInterruptKey(null)
    setOptimisticMessages([])
    if (!sessionId) {
      setStreamVersion(0)
      return
    }
    void fetchSession()
  }, [sessionId, fetchSession])

  useEffect(() => {
    if (!sessionId) return

    const timer = setInterval(async () => {
      const current = sessionRef.current
      if (!current) return
      if (isTerminalStatus(current.status)) {
        clearInterval(timer)
        return
      }
      if (isConnected) return
      await fetchSession()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [sessionId, fetchSession, isConnected])

  useEffect(() => {
    const lastEvent = events[events.length - 1]
    if (!lastEvent || lastEvent.type !== 'terminal') return
    setIsAgentRunning(false)
    void fetchSession()
  }, [events, fetchSession])

  useEffect(() => {
    if (streamMessages.length === 0) return
    const hasRealUserMessages = streamMessages.some(m => m.type === 'user_input' && !m.id.startsWith('optimistic-'))
    if (hasRealUserMessages) {
      setOptimisticMessages([])
    }
  }, [streamMessages])

  const currentInterruptKey =
    sessionId && session?.status === 'waiting_for_human' && session.human_question
      ? `${sessionId}:${session.human_question}`
      : null

  useEffect(() => {
    if (!dismissedInterruptKey) return
    if (!currentInterruptKey || currentInterruptKey !== dismissedInterruptKey) {
      setDismissedInterruptKey(null)
    }
  }, [currentInterruptKey, dismissedInterruptKey])

  const mergedSession = useMemo((): DeepAgentSession | null => {
    if (!session) return null
    let status = session.status
    for (const ev of events) {
      if (ev.type === 'terminal') status = ev.status
    }
    const isDismissedInterrupt =
      status === 'waiting_for_human' &&
      sessionId &&
      session.human_question &&
      dismissedInterruptKey === `${sessionId}:${session.human_question}`

    if (isDismissedInterrupt) {
      return {
        ...session,
        status: 'running',
        human_question: null
      }
    }

    return { ...session, status }
  }, [session, events, sessionId, dismissedInterruptKey])

  const messages: ChatMessage[] = useMemo(() => {
    const snapshotMessages = mergedSession ? sessionToMessages(mergedSession) : []
    const allMessages = [...snapshotMessages, ...streamMessages, ...optimisticMessages]
    if (allMessages.length === 0) return []

    const mergedBySignature = new Map<string, ChatMessage>()

    for (const message of allMessages) {
      const signature = messageSignature(message)
      const existing = mergedBySignature.get(signature)
      mergedBySignature.set(signature, existing ? mergeDuplicateMessage(existing, message) : message)
    }

    return [...mergedBySignature.values()].sort((a, b) => {
      const aSeq = extractSeq(a.id)
      const bSeq = extractSeq(b.id)
      if (aSeq !== null && bSeq !== null && aSeq !== bSeq) return aSeq - bSeq
      const timestampDelta = toEpoch(a.timestamp) - toEpoch(b.timestamp)
      if (timestampDelta !== 0) return timestampDelta
      return messageTypeOrder(a.type) - messageTypeOrder(b.type)
    })
  }, [streamMessages, mergedSession, optimisticMessages])

  const startSession = useCallback(
    async (task: string, config?: SessionConfig, activeExternalConnectionIds?: string[]) => {
      const { session_id } = await client.startSession(task, config, activeExternalConnectionIds)
      return session_id
    },
    [client]
  )

  const reply = useCallback(
    async (message?: string, structuredInput?: Record<string, any>) => {
      console.log('[reply] Called with:', {
        message,
        structuredInput,
        hasStructuredInput: !!structuredInput,
        structuredInputType: typeof structuredInput,
        structuredInputKeys: structuredInput ? Object.keys(structuredInput) : null
      })
      if (!sessionId) return
      const current = sessionRef.current
      const interruptKey =
        current?.status === 'waiting_for_human' && current.human_question
          ? `${sessionId}:${current.human_question}`
          : null
      if (current?.status === 'waiting_for_human' && current.human_question) {
        setDismissedInterruptKey(interruptKey)
      }

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
      try {
        console.log('[reply] About to call client.replyToInterrupt with:', { sessionId, message, structuredInput })
        await client.replyToInterrupt(sessionId, message, structuredInput)
        console.log('[reply] Backend response received, refreshing session')
        setStreamVersion(v => v + 1)
        await fetchSession()
        setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticId))
      } catch (error) {
        console.error('[reply] Error sending to backend:', error)
        setIsAgentRunning(false)
        if (interruptKey) setDismissedInterruptKey(null)
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
    isConnected,
    isStreaming: isAgentRunning || (!!mergedSession && mergedSession.status === 'running'),
    isWaitingForInput: mergedSession?.status === 'waiting_for_human',
    startSession,
    reply
  }
}
