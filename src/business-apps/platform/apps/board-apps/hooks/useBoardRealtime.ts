/**
 * useBoardRealtime - optional live updates for boards.
 *
 * When enabled: connects to Socket.IO /boards namespace for domain events.
 * When disabled: no socket connection, no background traffic.
 * For system live sheets: uses polling with configurable interval.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

export type BoardRealtimeEventType =
  | 'row.created'
  | 'row.updated'
  | 'row.deleted'
  | 'column.updated'
  | 'view.updated'
  | 'group.updated'
  | 'sheet.externalSync.progress'
  | 'sheet.externalSync.completed'
  | 'sheet.externalSync.failed'
  | 'sheet.externalSync.cancelled'

export interface BoardRealtimeEvent {
  type: BoardRealtimeEventType
  boardId: string
  sheetId?: string
  rowId?: string
  runId?: string
  status?: string
  totalFetched?: number
  totalSynced?: number
  estimatedTotal?: number | null
  lastMessage?: string | null
  syncedCount?: number
  error?: string
  data?: Record<string, unknown>
  actorUserId?: string
  timestamp: string
}

export interface UseBoardRealtimeOptions {
  boardId: string
  accessToken: string
  enabled: boolean
  onEvent?: (event: BoardRealtimeEvent) => void
}

export interface UseBoardRealtimeReturn {
  isConnected: boolean
  enable: () => void
  disable: () => void
}

export function useBoardRealtime({
  boardId,
  accessToken,
  enabled,
  onEvent
}: UseBoardRealtimeOptions): UseBoardRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isEnabled, setIsEnabled] = useState(enabled)
  const socketRef = useRef<Socket | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    setIsEnabled(enabled)
  }, [enabled])

  useEffect(() => {
    if (!isEnabled || !boardId || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    const apiUrl = getDocumentServiceApiUrl().replace('/api/v1', '')

    const socket = io(`${apiUrl}/boards`, {
      auth: { token: accessToken },
      query: { boardId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10
    })

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    socket.on('board.event', (event: BoardRealtimeEvent) => {
      onEventRef.current?.(event)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [isEnabled, boardId, accessToken])

  const enable = useCallback(() => setIsEnabled(true), [])
  const disable = useCallback(() => setIsEnabled(false), [])

  return { isConnected, enable, disable }
}

/**
 * useBoardPolling - periodic data refresh for system live sheets.
 */
export interface UseBoardPollingOptions {
  enabled: boolean
  intervalMs: number
  onRefresh: () => Promise<void>
}

export function useBoardPolling({ enabled, intervalMs, onRefresh }: UseBoardPollingOptions) {
  const [isPolling, setIsPolling] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setIsPolling(false)
      return
    }

    setIsPolling(true)
    timerRef.current = setInterval(() => {
      void onRefreshRef.current()
    }, intervalMs)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setIsPolling(false)
    }
  }, [enabled, intervalMs])

  return { isPolling }
}
