import { useEffect, useRef, useState } from 'react'
import type { NotificationClient } from '@/common/network/notification/NotificationClient'
import {
  fetchUnreadNotificationCount,
  formatNotificationErrorMessage,
  getNotificationsRefreshDetailFromEvent,
  notifyHostRefresh
} from '../utils'

interface UseNotificationsHostStateOptions {
  client: NotificationClient
  accessToken?: string
}

function parseSseEvent(raw: string): { eventName: string | null; parsed: Record<string, unknown> | null } {
  let eventName: string | null = null
  let dataPayload = ''

  raw.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('event:')) {
      eventName = trimmed.slice(6).trim()
    }
    if (trimmed.startsWith('data:')) {
      dataPayload += trimmed.slice(5).trim()
    }
  })

  let parsed: Record<string, unknown> | null = null
  if (dataPayload) {
    try {
      parsed = JSON.parse(dataPayload) as Record<string, unknown>
    } catch {
      parsed = null
    }
  }

  return { eventName, parsed }
}

function looksLikeNotification(eventName: string | null, parsed: Record<string, unknown> | null): boolean {
  if (eventName === 'notification') {
    return true
  }
  if (!parsed) {
    return false
  }
  return Boolean(parsed.notificationId || parsed.title || parsed.message)
}

const RECONNECT_JITTER_MS = 1000

/** Jitter for SSE reconnect backoff only (not used for secrets or identifiers). */
function getReconnectJitterMs(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    return 0
  }

  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) {
    return 0
  }

  const randomValues = new Uint32Array(1)
  cryptoApi.getRandomValues(randomValues)
  return randomValues[0] % maxExclusive
}

export function useNotificationsHostState({ client, accessToken }: UseNotificationsHostStateOptions) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const attemptsRef = useRef(0)
  const connectingRef = useRef(false)
  const accessTokenRef = useRef<string | undefined>()
  const loadUnreadCountRef = useRef<() => Promise<void>>()

  accessTokenRef.current = accessToken

  loadUnreadCountRef.current = async () => {
    if (!accessTokenRef.current) {
      setUnreadCount(0)
      return
    }
    try {
      const count = await fetchUnreadNotificationCount(client)
      setUnreadCount(count)
      notifyHostRefresh({ unreadCount: count, reloadList: true })
    } catch (error) {
      const message = formatNotificationErrorMessage(error, 'Unable to load notification count')
      notifyHostRefresh({ listError: message })
    }
  }

  useEffect(() => {
    loadUnreadCountRef.current?.()?.catch(() => undefined)
  }, [accessToken])

  useEffect(() => {
    const handleRefresh: EventListener = event => {
      const detail = getNotificationsRefreshDetailFromEvent(event)
      if (typeof detail?.unreadCount === 'number') {
        setUnreadCount(detail.unreadCount)
        setRefreshKey(previous => previous + 1)
        return
      }
      loadUnreadCountRef.current?.()?.catch(() => undefined)
    }

    globalThis.window.addEventListener('notifications:refresh', handleRefresh)
    return () => {
      globalThis.window.removeEventListener('notifications:refresh', handleRefresh)
    }
  }, [])

  useEffect(() => {
    const url = client.getSseUrl()
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let controller: AbortController | null = null

    const handleIncoming = () => {
      loadUnreadCountRef.current?.()?.catch(() => undefined)
      setRefreshKey(previous => previous + 1)
    }

    const connect = async () => {
      if (connectingRef.current) {
        return
      }
      connectingRef.current = true
      controller = new AbortController()

      try {
        const headers: Record<string, string> = {
          Accept: 'text/event-stream'
        }
        if (accessTokenRef.current) {
          headers.Authorization = `Bearer ${accessTokenRef.current}`
        }

        const res = await fetch(url, {
          method: 'GET',
          headers,
          credentials: 'include',
          signal: controller.signal
        })

        if (!res.ok || !res.body) {
          throw new Error('SSE connection failed')
        }

        attemptsRef.current = 0

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })

          let idx = buffer.indexOf('\n\n')
          while (idx !== -1) {
            const raw = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)

            const { eventName, parsed } = parseSseEvent(raw)
            if (looksLikeNotification(eventName, parsed)) {
              handleIncoming()
            }

            idx = buffer.indexOf('\n\n')
          }
        }
      } catch {
        if (!controller?.signal.aborted) {
          attemptsRef.current += 1
          const base = 3000 * 2 ** Math.min(attemptsRef.current - 1, 4)
          const delay = Math.min(60000, base) + getReconnectJitterMs(RECONNECT_JITTER_MS)
          reconnectTimer = setTimeout(connect, delay)
        }
      } finally {
        connectingRef.current = false
      }
    }

    connect()

    const handleOnline = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      controller?.abort()
      attemptsRef.current = 0
      connect()
    }

    globalThis.window.addEventListener('online', handleOnline)

    return () => {
      controller?.abort()
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      globalThis.window.removeEventListener('online', handleOnline)
    }
  }, [client])

  return { refreshKey, unreadCount }
}
