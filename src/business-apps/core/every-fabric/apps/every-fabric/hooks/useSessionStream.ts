import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import type { AgentStreamEvent, ChatMessage } from '../types/enterpriseAgent'
import { deriveMessagesFromEvents } from '../utils/messageUtils'

const BATCH_INTERVAL_MS = 16

const getEventDedupeKey = (event: AgentStreamEvent): string => {
  if ('event_id' in event && event.event_id) return event.event_id
  if ('seq' in event && typeof event.seq === 'number') return `seq:${event.seq}`
  return JSON.stringify(event)
}

interface BatchedEventProcessor {
  push: (event: AgentStreamEvent) => boolean
  flush: () => void
  clear: () => void
}

function createBatchedEventProcessor(
  seenEventsRef: MutableRefObject<Set<string>>,
  lastSeqRef: MutableRefObject<number>,
  onFlush: (events: AgentStreamEvent[]) => void
): BatchedEventProcessor {
  let buffer: AgentStreamEvent[] = []
  let rafId: number | null = null
  let lastFlushTime = 0

  const flush = () => {
    if (buffer.length === 0) return
    const eventsToFlush = buffer
    buffer = []
    onFlush(eventsToFlush)
    lastFlushTime = performance.now()
  }

  const scheduleFlush = () => {
    if (rafId !== null) return

    const timeSinceLastFlush = performance.now() - lastFlushTime
    if (timeSinceLastFlush >= BATCH_INTERVAL_MS) {
      flush()
    } else {
      rafId = requestAnimationFrame(() => {
        rafId = null
        flush()
      })
    }
  }

  return {
    push: (event: AgentStreamEvent): boolean => {
      const eventKey = getEventDedupeKey(event)
      if (seenEventsRef.current.has(eventKey)) return false

      seenEventsRef.current.add(eventKey)
      if ('seq' in event && typeof event.seq === 'number') {
        lastSeqRef.current = Math.max(lastSeqRef.current, event.seq)
      }

      buffer.push(event)
      scheduleFlush()

      return event.type === 'terminal'
    },
    flush: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      flush()
    },
    clear: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      buffer = []
    }
  }
}

export const useSessionStream = (sessionId: string | null, accessToken: string, streamVersion = 0) => {
  const [events, setEvents] = useState<AgentStreamEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const seenEventsRef = useRef<Set<string>>(new Set())
  const accessTokenRef = useRef(accessToken)
  const lastSeqRef = useRef(0)
  const prevSessionIdRef = useRef<string | null>(null)
  const batchProcessorRef = useRef<BatchedEventProcessor | null>(null)

  const handleFlush = useCallback((newEvents: AgentStreamEvent[]) => {
    setEvents(prev => [...prev, ...newEvents])
  }, [])

  useEffect(() => {
    accessTokenRef.current = accessToken
  }, [accessToken])

  useEffect(() => {
    prevSessionIdRef.current = sessionId

    if (!sessionId) {
      batchProcessorRef.current?.clear()
      setEvents([])
      setIsConnected(false)
      seenEventsRef.current.clear()
      lastSeqRef.current = 0
      return
    }

    // Clear state for new session or new turn
    batchProcessorRef.current?.clear()
    setEvents([])
    setIsConnected(false)
    seenEventsRef.current.clear()
    lastSeqRef.current = 0

    // Create batched processor for 60fps updates
    const processor = createBatchedEventProcessor(seenEventsRef, lastSeqRef, handleFlush)
    batchProcessorRef.current = processor

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
      processor.flush()
      setIsConnected(false)
    }

    const reconnectAfterDelay = () => {
      const delay = reconnectDelayMs
      reconnectTimer = setTimeout(handleReconnectTimeout, delay)
    }

    const handleReconnectTimeout = () => {
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, 10000)
      connect()
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
        if (disposed) return
        try {
          const event = JSON.parse(e.data) as AgentStreamEvent
          const isTerminal = processor.push(event)
          if (isTerminal) {
            terminalReached = true
            closeStream()
          }
        } catch {
          // Parse error, ignore
        }
      }

      source.onerror = () => {
        closeStream()
        if (disposed || terminalReached) return
        reconnectAfterDelay()
      }
    }

    connect()

    return () => {
      disposed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      processor.clear()
      closeStream()
    }
  }, [sessionId, streamVersion, handleFlush])

  const messages: ChatMessage[] = useMemo(() => deriveMessagesFromEvents(events), [events])

  return { messages, events, isConnected }
}
