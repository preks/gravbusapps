import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage, DeepAgentSession, SessionConfig } from '../types/enterpriseAgent'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'
import { useSessionStream } from './useSessionStream'
import { sessionToMessages } from '../utils/messageUtils'

const POLL_INTERVAL_MS = 3000

const isTerminalStatus = (status: string) => status !== 'running' && status !== 'pending'

export const useAgentSession = (sessionId: string | null, accessToken: string) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [streamVersion, setStreamVersion] = useState(0)
  const { messages: streamMessages, events, isConnected } = useSessionStream(sessionId, accessToken, streamVersion)
  const [session, setSession] = useState<DeepAgentSession | null>(null)

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
    if (!sessionId) {
      setSession(null)
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
    void fetchSession()
  }, [events, fetchSession])

  const mergedSession = useMemo((): DeepAgentSession | null => {
    if (!session) return null
    let status = session.status
    for (const ev of events) {
      if (ev.type === 'terminal') status = ev.status
    }
    return { ...session, status }
  }, [session, events])

  const messages: ChatMessage[] = useMemo(() => {
    if (streamMessages.length > 0) return streamMessages
    if (!mergedSession) return []
    return sessionToMessages(mergedSession)
  }, [streamMessages, mergedSession])

  const startSession = useCallback(
    async (task: string, config?: SessionConfig) => {
      const { session_id } = await client.startSession(task, config)
      return session_id
    },
    [client]
  )

  const reply = useCallback(
    async (message: string) => {
      if (!sessionId) return
      await client.replyToInterrupt(sessionId, message)
      setStreamVersion(v => v + 1)
      await fetchSession()
    },
    [sessionId, client, fetchSession]
  )

  return {
    session: mergedSession,
    messages,
    isStreaming: !!mergedSession && mergedSession.status === 'running',
    isWaitingForInput: mergedSession?.status === 'waiting_for_human',
    startSession,
    reply
  }
}
