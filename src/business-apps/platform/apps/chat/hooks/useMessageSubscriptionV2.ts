import { useEffect, useRef, useCallback } from 'react'
import { useWebSocketV2 } from './useWebSocketV2'
import type { Message } from '../types'

interface UseMessageSubscriptionV2Options {
  accessToken: string
  wsUrl: string
  wsSocketPath?: string
  conversationId: string | null
  onNewMessage: (message: Message) => void
  onMessageUpdate: (message: Message) => void
  onMessageDelete: (data: { messageId: string; conversationId: string }) => void
  onMessageStatus: (data: { messageId: string; status: string }) => void
}

/**
 * Message Subscription Hook with Deduplication
 *
 * Features:
 * - Automatic subscription/unsubscription based on conversationId
 * - Event deduplication to prevent duplicate processing
 * - Timestamp-based filtering (ignore older messages from WS)
 * - Proper cleanup on unmount or conversation change
 */
export function useMessageSubscriptionV2(options: UseMessageSubscriptionV2Options) {
  const {
    accessToken,
    wsUrl,
    wsSocketPath,
    conversationId,
    onNewMessage,
    onMessageUpdate,
    onMessageDelete,
    onMessageStatus
  } = options

  // Track processed events to prevent duplicates
  const processedEventsRef = useRef<Set<string>>(new Set())
  const newestMessageTimestampRef = useRef<number>(0)

  // Keep callbacks in refs to avoid recreating handlers
  const onNewMessageRef = useRef(onNewMessage)
  const onMessageUpdateRef = useRef(onMessageUpdate)
  const onMessageDeleteRef = useRef(onMessageDelete)
  const onMessageStatusRef = useRef(onMessageStatus)

  // Keep refs in sync
  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  useEffect(() => {
    onMessageUpdateRef.current = onMessageUpdate
  }, [onMessageUpdate])

  useEffect(() => {
    onMessageDeleteRef.current = onMessageDelete
  }, [onMessageDelete])

  useEffect(() => {
    onMessageStatusRef.current = onMessageStatus
  }, [onMessageStatus])

  // Initialize WebSocket connection
  const ws = useWebSocketV2({
    accessToken,
    wsUrl,
    wsSocketPath
  })

  /**
   * Set newest message timestamp (called when loading messages from cache/API)
   */
  const setNewestMessageTimestamp = useCallback((timestamp: number) => {
    newestMessageTimestampRef.current = timestamp

    if (process.env.NODE_ENV === 'development') {
      console.log('[WS V2] Set newest message timestamp:', new Date(timestamp).toISOString())
    }
  }, [])

  /**
   * Handle new message event with deduplication
   */
  const handleNewMessage = useCallback((message: Message) => {
    // Create composite key for deduplication
    const eventKey = `new-${message.id}-${message.createdAt}`

    // Check if already processed
    if (processedEventsRef.current.has(eventKey)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[WS V2] Skipping duplicate message event:', eventKey)
      }
      return
    }

    // Check if older than cached messages (prevents duplicates on load)
    const messageTime = new Date(message.createdAt).getTime()
    if (messageTime <= newestMessageTimestampRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[WS V2] Skipping old message (already in cache):', message.id)
      }
      return
    }

    // Mark as processed
    processedEventsRef.current.add(eventKey)

    // Update newest timestamp
    if (messageTime > newestMessageTimestampRef.current) {
      newestMessageTimestampRef.current = messageTime
    }

    // Cleanup old event IDs (keep last 1000)
    if (processedEventsRef.current.size > 1000) {
      const oldEvents = Array.from(processedEventsRef.current).slice(0, 500)
      oldEvents.forEach(key => processedEventsRef.current.delete(key))
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[WS V2] Processing new message:', message.id)
    }

    // Call handler
    onNewMessageRef.current(message)
  }, [])

  /**
   * Handle message update event
   */
  const handleMessageUpdate = useCallback((message: Message) => {
    const eventKey = `update-${message.id}-${message.updatedAt || message.createdAt}`

    if (processedEventsRef.current.has(eventKey)) {
      return
    }

    processedEventsRef.current.add(eventKey)

    if (process.env.NODE_ENV === 'development') {
      console.log('[WS V2] Processing message update:', message.id)
    }

    onMessageUpdateRef.current(message)
  }, [])

  /**
   * Handle message delete event
   */
  const handleMessageDelete = useCallback((data: { messageId: string; conversationId: string }) => {
    const eventKey = `delete-${data.messageId}-${Date.now()}`

    if (processedEventsRef.current.has(eventKey)) {
      return
    }

    processedEventsRef.current.add(eventKey)

    if (process.env.NODE_ENV === 'development') {
      console.log('[WS V2] Processing message delete:', data.messageId)
    }

    onMessageDeleteRef.current(data)
  }, [])

  /**
   * Handle message status event
   */
  const handleMessageStatus = useCallback((data: { messageId: string; status: string }) => {
    const eventKey = `status-${data.messageId}-${data.status}`

    if (processedEventsRef.current.has(eventKey)) {
      return
    }

    processedEventsRef.current.add(eventKey)

    if (process.env.NODE_ENV === 'development') {
      console.log('[WS V2] Processing status update:', data)
    }

    onMessageStatusRef.current(data)
  }, [])

  /**
   * Subscribe to conversation events
   */
  useEffect(() => {
    if (!conversationId || !ws.client) return

    if (process.env.NODE_ENV === 'development') {
      console.log('[WS V2] Subscribing to conversation:', conversationId)
    }

    // Subscribe to events
    ws.on('message:new', handleNewMessage)
    ws.on('message:update', handleMessageUpdate)
    ws.on('message:delete', handleMessageDelete)
    ws.on('message:status', handleMessageStatus)

    // Join conversation room
    ws.joinConversation(conversationId)

    // Cleanup on conversation change or unmount
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[WS V2] Unsubscribing from conversation:', conversationId)
      }

      ws.off('message:new', handleNewMessage)
      ws.off('message:update', handleMessageUpdate)
      ws.off('message:delete', handleMessageDelete)
      ws.off('message:status', handleMessageStatus)
      ws.leaveConversation(conversationId)

      // Clear processed events when changing conversations
      processedEventsRef.current.clear()
      newestMessageTimestampRef.current = 0
    }
  }, [conversationId, ws, handleNewMessage, handleMessageUpdate, handleMessageDelete, handleMessageStatus])

  return {
    isConnected: ws.isConnected,
    isOffline: ws.isOffline,
    setNewestMessageTimestamp
  }
}
