import { useEffect, useRef, useCallback, useState } from 'react'
import { ChatWebSocketClient } from '../services/chatWebSocketClient'
import type { Message, TypingIndicator, PresenceUpdate } from '../types'

/**
 * Shared WebSocket client instance (singleton pattern)
 * Prevents multiple connections when multiple components mount
 */
let sharedWsClient: ChatWebSocketClient | null = null
let sharedWsKey: string | null = null
let sharedWsRefCount = 0

interface UseWebSocketV2Options {
  accessToken: string
  wsUrl: string
  wsSocketPath?: string
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

interface WebSocketV2API {
  client: ChatWebSocketClient | null
  isConnected: boolean
  isOffline: boolean

  // Event subscription
  on: <K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]) => void
  off: <K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]) => void

  // Room management
  joinConversation: (conversationId: string) => void
  leaveConversation: (conversationId: string) => void

  // Emit events
  emitTyping: (conversationId: string, isTyping: boolean) => void
  sendMessage: (conversationId: string, content: string, metadata?: Record<string, any>) => Promise<void>
}

interface WebSocketEventMap {
  'message:new': (message: Message) => void
  'message:update': (message: Message) => void
  'message:delete': (data: { messageId: string; conversationId: string }) => void
  'message:status': (data: { messageId: string; status: string }) => void
  'typing:update': (data: TypingIndicator) => void
  'presence:update': (data: PresenceUpdate) => void
  'conversation:update': (data: any) => void
}

/**
 * WebSocket V2 Hook with shared connection and reference counting
 *
 * Features:
 * - Single WebSocket connection shared across all components
 * - Reference counting for proper cleanup
 * - Automatic reconnection with exponential backoff
 * - Event deduplication
 * - Memory leak prevention
 */
export function useWebSocketV2(options: UseWebSocketV2Options): WebSocketV2API {
  const { accessToken, wsUrl, wsSocketPath } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  // Track if this instance is active
  const isMountedRef = useRef(true)
  const optionsRef = useRef(options)

  // Keep options in sync
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  /**
   * Initialize or reuse WebSocket connection
   */
  useEffect(() => {
    const wsKey = `${wsUrl}-${accessToken}`

    // Increment reference count
    sharedWsRefCount++

    // Create new connection if needed or reuse existing
    if (!sharedWsClient || sharedWsKey !== wsKey) {
      // Clean up old client if key changed
      if (sharedWsClient && sharedWsKey !== wsKey) {
        sharedWsClient.disconnect()
        sharedWsClient = null
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[WS V2] Creating new WebSocket connection', { wsUrl, refCount: sharedWsRefCount })
      }

      sharedWsClient = new ChatWebSocketClient(wsUrl, accessToken, wsSocketPath)
      sharedWsKey = wsKey

      // Set up connection event handlers
      sharedWsClient.on('connect', () => {
        if (isMountedRef.current) {
          setIsConnected(true)
          setIsOffline(false)
          if (optionsRef.current.onConnect) {
            optionsRef.current.onConnect()
          }
        }
      })

      sharedWsClient.on('disconnect', () => {
        if (isMountedRef.current) {
          setIsConnected(false)
          if (optionsRef.current.onDisconnect) {
            optionsRef.current.onDisconnect()
          }
        }
      })

      sharedWsClient.on('error', (error: any) => {
        if (isMountedRef.current) {
          if (optionsRef.current.onError) {
            optionsRef.current.onError(error instanceof Error ? error : new Error(String(error)))
          }
        }
      })

      sharedWsClient.on('offline', () => {
        if (isMountedRef.current) {
          setIsOffline(true)
        }
      })

      sharedWsClient.on('online', () => {
        if (isMountedRef.current) {
          setIsOffline(false)
        }
      })

      // Connect
      sharedWsClient.connect()
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[WS V2] Reusing existing WebSocket connection', { refCount: sharedWsRefCount })
      }

      // Update state from existing connection
      if (sharedWsClient.isConnected()) {
        setIsConnected(true)
        setIsOffline(false)
      }
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false
      sharedWsRefCount--

      if (process.env.NODE_ENV === 'development') {
        console.log('[WS V2] Component unmounted, refCount:', sharedWsRefCount)
      }

      // Only disconnect when last component unmounts
      if (sharedWsRefCount === 0 && sharedWsClient) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[WS V2] Last component unmounted, disconnecting WebSocket')
        }

        sharedWsClient.disconnect()
        sharedWsClient = null
        sharedWsKey = null
      }
    }
  }, [accessToken, wsUrl, wsSocketPath])

  /**
   * Subscribe to WebSocket events
   */
  const on = useCallback(<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]) => {
    if (!sharedWsClient) return
    sharedWsClient.on(event, handler as any)
  }, [])

  /**
   * Unsubscribe from WebSocket events
   */
  const off = useCallback(<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]) => {
    if (!sharedWsClient) return
    sharedWsClient.off(event, handler as any)
  }, [])

  /**
   * Join a conversation room
   */
  const joinConversation = useCallback((conversationId: string) => {
    if (!sharedWsClient || !conversationId) return

    if (process.env.NODE_ENV === 'development') {
      console.log('[WS V2] Joining conversation:', conversationId)
    }

    sharedWsClient.joinConversation(conversationId)
  }, [])

  /**
   * Leave a conversation room
   */
  const leaveConversation = useCallback((conversationId: string) => {
    if (!sharedWsClient || !conversationId) return

    if (process.env.NODE_ENV === 'development') {
      console.log('[WS V2] Leaving conversation:', conversationId)
    }

    sharedWsClient.leaveConversation(conversationId)
  }, [])

  /**
   * Emit typing indicator
   */
  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (!sharedWsClient || !conversationId) return
    sharedWsClient.emitTyping(conversationId, isTyping)
  }, [])

  /**
   * Send a message through WebSocket
   */
  const sendMessage = useCallback(async (conversationId: string, content: string, metadata?: Record<string, any>) => {
    if (!sharedWsClient || !conversationId) {
      throw new Error('WebSocket not connected')
    }

    return sharedWsClient.sendMessage(conversationId, content, metadata)
  }, [])

  return {
    client: sharedWsClient,
    isConnected,
    isOffline,
    on,
    off,
    joinConversation,
    leaveConversation,
    emitTyping,
    sendMessage
  }
}

/**
 * Get current WebSocket connection info (for debugging)
 */
export function getWebSocketInfo() {
  return {
    hasConnection: !!sharedWsClient,
    isConnected: sharedWsClient?.isConnected() || false,
    refCount: sharedWsRefCount,
    key: sharedWsKey
  }
}
