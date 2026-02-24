/**
 * useFlowEventStream - Shared hook for consuming SSE event streams.
 * Transport-agnostic: same hook for both simulation and live monitoring.
 * Uses the fetch + ReadableStream + manual SSE parsing pattern.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export type FlowEventType =
  | 'flow.started'
  | 'step.entering'
  | 'step.completed'
  | 'step.failed'
  | 'step.skipped'
  | 'step.awaiting_input'
  | 'decision.evaluated'
  | 'expression.resolved'
  | 'fork.entered'
  | 'join.completed'
  | 'rework.triggered'
  | 'flow.completed'
  | 'flow.failed'
  | 'sim.paused'
  | 'sim.resumed'

export interface FlowStreamEvent {
  event: FlowEventType
  data: Record<string, unknown>
  timestamp: string
  flowId: string
  templateId: string
}

export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error'

interface UseFlowEventStreamOptions {
  /** SSE endpoint URL */
  url: string
  /** Bearer token for authentication */
  accessToken: string
  /** Whether the stream should be active */
  enabled?: boolean
  /** Callback for each event */
  onEvent?: (event: FlowStreamEvent) => void
  /** Callback when stream closes normally */
  onComplete?: () => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Max reconnect attempts */
  maxReconnectAttempts?: number
}

function parseMessageLines(message: string): { eventData: string; eventType: string } {
  let eventData = ''
  let eventType = ''
  for (const line of message.split('\n')) {
    if (line.startsWith('data: ')) eventData += line.slice(6)
    else if (line.startsWith('event: ')) eventType = line.slice(7)
  }
  return { eventData, eventType }
}

const TERMINAL_EVENTS = new Set<FlowEventType>(['flow.completed', 'flow.failed'])

export function useFlowEventStream(options: UseFlowEventStreamOptions) {
  const { url, accessToken, enabled = true, onEvent, onComplete, onError, maxReconnectAttempts = 5 } = options

  const [status, setStatus] = useState<StreamStatus>('idle')
  const [events, setEvents] = useState<FlowStreamEvent[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(async () => {
    if (!enabled || !url) return

    // Abort previous connection
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      setStatus('connecting')

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${accessToken}`
        },
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body for SSE stream')
      }

      setStatus('connected')
      reconnectAttemptsRef.current = 0

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          setStatus('closed')
          onComplete?.()
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE format: "data: {...}\n\n"
        const messages = buffer.split('\n\n')
        buffer = messages.pop() ?? ''

        for (const message of messages) {
          const { eventData, eventType } = parseMessageLines(message)
          if (!eventData) continue
          try {
            const parsed = JSON.parse(eventData) as FlowStreamEvent
            if (eventType) parsed.event = eventType as FlowEventType
            setEvents(prev => [...prev, parsed])
            onEvent?.(parsed)
            if (TERMINAL_EVENTS.has(parsed.event)) {
              setStatus('closed')
              onComplete?.()
              controller.abort()
              return
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        return
      }

      setStatus('error')
      onError?.(err as Error)

      // Reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
        reconnectAttemptsRef.current++
        setStatus('reconnecting')

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, delay)
      }
    }
  }, [url, accessToken, enabled, onEvent, onComplete, onError, maxReconnectAttempts])

  // Start connection when enabled
  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      abortRef.current?.abort()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [enabled, connect])

  const disconnect = useCallback(() => {
    abortRef.current?.abort()
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    setStatus('closed')
  }, [])

  const reset = useCallback(() => {
    setEvents([])
    setStatus('idle')
    reconnectAttemptsRef.current = 0
  }, [])

  return {
    status,
    events,
    connect,
    disconnect,
    reset
  }
}
