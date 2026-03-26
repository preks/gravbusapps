import { useEffect, useMemo, useRef, useState } from 'react'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import type { AgentStreamEvent, ChatMessage } from '../types/enterpriseAgent'
import { deriveMessagesFromEvents } from '../utils/messageUtils'

const getEventDedupeKey = (event: AgentStreamEvent): string => {
  if ('event_id' in event && event.event_id) return event.event_id
  if ('seq' in event && typeof event.seq === 'number') return `seq:${event.seq}`
  return JSON.stringify(event)
}

export const useSessionStream = (sessionId: string | null, accessToken: string, streamVersion = 0) => {
  const [events, setEvents] = useState<AgentStreamEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const seenEventsRef = useRef<Set<string>>(new Set())
  const accessTokenRef = useRef(accessToken)
  const lastSeqRef = useRef(0)
  const prevSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    accessTokenRef.current = accessToken
  }, [accessToken])

  useEffect(() => {
    const isNewSession = prevSessionIdRef.current !== sessionId
    prevSessionIdRef.current = sessionId

    if (!sessionId) {
      setEvents([])
      setIsConnected(false)
      seenEventsRef.current.clear()
      lastSeqRef.current = 0
      return
    }

    if (isNewSession) {
      setEvents([])
      setIsConnected(false)
      seenEventsRef.current.clear()
      lastSeqRef.current = 0
    }

    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectDelayMs = 1000
    let terminalReached = false
    let disposed = false

    const closeStream = () => {
      if (source) {
        source.close()
        source = null
      }
      setIsConnected(false)
    }

    const connect = () => {
      if (disposed || terminalReached) return

      const base = PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL
      const since = lastSeqRef.current
      const sinceParam = since > 0 ? `&since_seq=${since}` : ''
      const url = `${base}/deep-agent/sessions/${sessionId}/stream?token=${encodeURIComponent(accessTokenRef.current)}${sinceParam}`
      source = new EventSource(url)

      source.onopen = () => {
        if (disposed) return
        reconnectDelayMs = 1000
        setIsConnected(true)
      }

      source.onmessage = (e: MessageEvent) => {
        try {
          const event: AgentStreamEvent = JSON.parse(e.data as string)
          const eventKey = getEventDedupeKey(event)
          if (seenEventsRef.current.has(eventKey)) return
          seenEventsRef.current.add(eventKey)
          if ('seq' in event && typeof event.seq === 'number') {
            lastSeqRef.current = Math.max(lastSeqRef.current, event.seq)
          }
          setEvents(prev => [...prev, event])

          if (event.type === 'terminal') {
            terminalReached = true
            closeStream()
          }
        } catch {
          // ignore parse errors
        }
      }

      source.onerror = () => {
        closeStream()
        if (disposed || terminalReached) return
        reconnectTimer = setTimeout(() => {
          reconnectDelayMs = Math.min(reconnectDelayMs * 2, 10000)
          connect()
        }, reconnectDelayMs)
      }
    }

    connect()

    return () => {
      disposed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      closeStream()
    }
  }, [sessionId, streamVersion])

  const messages: ChatMessage[] = useMemo(() => deriveMessagesFromEvents(events), [events])

  return { messages, events, isConnected }
}
