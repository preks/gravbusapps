import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getEveryboxServiceApiUrl } from '../../every-api/utils/everyboxServiceUrl'

type StreamStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error'

interface InvalidationEventPayload {
  changed?: {
    inbox?: boolean
    completed?: boolean
    blinks?: boolean
    outflows?: boolean
  }
}

interface UseEveryboxInvalidationStreamOptions {
  userId: string
  accessToken?: string
  search?: string
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title'
  sortOrder?: 'asc' | 'desc'
  dueFilter?: 'any' | 'dueSoon24h' | 'overdue' | 'hasDueDate' | 'noDueDate'
  enabled?: boolean
  startDelayMs?: number
  onInvalidate?: (payload: InvalidationEventPayload) => void
}

function parseEventChunk(message: string): { eventType: string; eventData: string } {
  let eventType = ''
  let eventData = ''
  for (const line of message.split('\n')) {
    if (line.startsWith('event: ')) eventType = line.slice(7)
    else if (line.startsWith('data: ')) eventData += line.slice(6)
  }
  return { eventType, eventData }
}

export function useEveryboxInvalidationStream(options: UseEveryboxInvalidationStreamOptions) {
  const {
    userId,
    accessToken,
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    dueFilter = 'any',
    enabled = true,
    startDelayMs = 0,
    onInvalidate
  } = options

  const [status, setStatus] = useState<StreamStatus>('idle')
  const abortRef = useRef<AbortController | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const streamUrl = useMemo(() => {
    if (!userId) return ''
    const url = new URL(`${getEveryboxServiceApiUrl()}/tasks/user/${userId}/stream`)
    url.searchParams.set('dueFilter', dueFilter)
    url.searchParams.set('sortBy', sortBy)
    url.searchParams.set('sortOrder', sortOrder)
    if (search.trim()) {
      url.searchParams.set('search', search.trim())
    }
    return url.toString()
  }, [userId, search, sortBy, sortOrder, dueFilter])

  const connect = useCallback(async () => {
    if (!enabled || !userId || !accessToken || !streamUrl) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      setStatus('connecting')

      const response = await fetch(streamUrl, {
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
        throw new Error('No SSE response body')
      }

      setStatus('connected')
      reconnectAttemptsRef.current = 0

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          setStatus('closed')
          break
        }

        buffer += value
        const messages = buffer.split('\n\n')
        buffer = messages.pop() ?? ''

        for (const message of messages) {
          const { eventType, eventData } = parseEventChunk(message)
          if (!eventType || !eventData) continue
          if (eventType === 'invalidate') {
            try {
              onInvalidate?.(JSON.parse(eventData) as InvalidationEventPayload)
            } catch {
              // Ignore malformed payloads
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      setStatus('error')

      if (reconnectAttemptsRef.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
        reconnectAttemptsRef.current += 1
        setStatus('reconnecting')
        reconnectTimeoutRef.current = setTimeout(() => {
          void connect()
        }, delay)
      }
    }
  }, [enabled, userId, accessToken, streamUrl, onInvalidate])

  useEffect(() => {
    if (enabled && userId && accessToken && streamUrl) {
      if (startDelayMs > 0) {
        reconnectTimeoutRef.current = setTimeout(() => {
          void connect()
        }, startDelayMs)
      } else {
        void connect()
      }
    }

    return () => {
      abortRef.current?.abort()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      setStatus('closed')
    }
  }, [enabled, userId, accessToken, streamUrl, connect, startDelayMs])

  return { status }
}
