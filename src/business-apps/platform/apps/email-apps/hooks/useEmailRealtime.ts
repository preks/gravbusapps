/**
 * useEmailRealtime - instant push updates for the Email app.
 *
 * Connects to the document-service Socket.IO `/emails` namespace and listens
 * for `email:new` events. The backend emits these when a brand-new message is
 * persisted (e.g. triggered by a Microsoft Graph change notification), letting
 * the UI refresh immediately instead of waiting for the polling interval.
 *
 * Falls back gracefully: when disabled or unauthenticated no socket is opened,
 * and the existing polling in `useEmails` keeps the list fresh.
 */

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

export interface EmailRealtimeEvent {
  accountId: string
  folderId: string
  messageId: string
  receivedAt: string
}

export interface UseEmailRealtimeOptions {
  accessToken: string
  /** Account currently displayed; events for other accounts are ignored. */
  accountId?: string
  enabled?: boolean
  onNewEmail?: (event: EmailRealtimeEvent) => void
}

export interface UseEmailRealtimeReturn {
  isConnected: boolean
}

export function useEmailRealtime({
  accessToken,
  accountId,
  enabled = true,
  onNewEmail
}: UseEmailRealtimeOptions): UseEmailRealtimeReturn {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  const onNewEmailRef = useRef(onNewEmail)
  onNewEmailRef.current = onNewEmail
  const accountIdRef = useRef(accountId)
  accountIdRef.current = accountId

  useEffect(() => {
    if (!enabled || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    const apiUrl = getDocumentServiceApiUrl().replace(/\/api\/v1$/, '')
    const urlObj = new URL(apiUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002')
    const isLocalhost = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1'
    const servicePath = urlObj.pathname
    const socketPath = isLocalhost ? '/socket.io' : `${servicePath}/socket.io`

    const socket = io(`${urlObj.origin}/emails`, {
      auth: { token: accessToken },
      path: socketPath,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10
    })

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    socket.on('email:new', (event: EmailRealtimeEvent) => {
      // Only react to events for the account currently in view.
      if (accountIdRef.current && event.accountId !== accountIdRef.current) return
      onNewEmailRef.current?.(event)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [enabled, accessToken])

  return { isConnected }
}
