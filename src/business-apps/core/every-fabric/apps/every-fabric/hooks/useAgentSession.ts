import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AgentStreamEvent, ChatMessage, DeepAgentSession, SessionConfig } from '../types/enterpriseAgent'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'
import { useSessionStream } from './useSessionStream'
import { sessionToMessages } from '../utils/messageUtils'

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

  if (incoming.type === 'plan') {
    return toEpoch(incoming.timestamp) >= toEpoch(existing.timestamp) ? incoming : existing
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
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([])

  const sessionRef = useRef<DeepAgentSession | null>(null)
  sessionRef.current = session
  const eventsRef = useRef<AgentStreamEvent[]>([])
  eventsRef.current = events

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
    if (!sessionId) {
      setStreamVersion(0)
      return
    }
    void fetchSession()
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

  const mergedSession = useMemo((): DeepAgentSession | null => {
    if (!session) return null
    let status = session.status
    for (const ev of events) {
      if (ev.type === 'terminal') status = ev.status
    }
    return { ...session, status }
  }, [session, events])

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
    async (
      task: string,
      config?: SessionConfig,
      activeExternalConnectionIds?: string[],
      activeEnterpriseSkillId?: string
    ) => {
      const { session_id } = await client.startSession(
        task,
        config,
        activeExternalConnectionIds,
        activeEnterpriseSkillId
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

      // SSE can emit terminal waiting_for_human before GET /sessions/:id catches up. The API
      // rejects interrupt replies with 409 while status is still "running" on the REST snapshot.
      const overlay = streamOverlayTerminalStatus(eventsRef.current)
      if (overlay === 'waiting_for_human' && readRestStatus() === 'running') {
        const deadline = Date.now() + REST_SYNC_MAX_MS
        while (Date.now() < deadline) {
          await fetchSession()
          const st = readRestStatus()
          if (st === 'waiting_for_human') break
          if (st !== 'running') break
          await new Promise(r => setTimeout(r, REST_SYNC_INTERVAL_MS))
        }
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
      const postInterrupt = () => client.replyToInterrupt(sessionId, message, structuredInput)

      try {
        let attempts = 0
        while (true) {
          try {
            await postInterrupt()
            break
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
    isConnected,
    isStreaming: isAgentRunning || (!!mergedSession && mergedSession.status === 'running'),
    isWaitingForInput: mergedSession?.status === 'waiting_for_human',
    startSession,
    reply
  }
}
