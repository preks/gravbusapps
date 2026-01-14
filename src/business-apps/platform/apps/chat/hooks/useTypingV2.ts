import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useWebSocketV2 } from './useWebSocketV2'
import { debounce } from '../utils/debounce'
import type { TypingIndicator } from '../types'

interface UseTypingV2Options {
  accessToken: string
  wsUrl: string
  wsSocketPath?: string
  conversationId: string | null
  currentUserId: string | null
}

/**
 * Typing Indicators Hook with Debouncing and Auto-cleanup
 *
 * Features:
 * - Debounced typing events (reduce network traffic)
 * - Auto-stop typing after 3 seconds of inactivity
 * - Auto-remove stale typing indicators (5 seconds)
 * - Proper cleanup of timeouts on unmount
 * - Only show typing for other users
 */
export function useTypingV2(options: UseTypingV2Options) {
  const { accessToken, wsUrl, wsSocketPath, conversationId, currentUserId } = options

  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const isTypingRef = useRef(false)
  const stopTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize WebSocket
  const ws = useWebSocketV2({
    accessToken,
    wsUrl,
    wsSocketPath
  })

  /**
   * Start typing (debounced to reduce network traffic)
   */
  const startTyping = useMemo(
    () =>
      debounce(() => {
        if (!conversationId || !ws.client || isTypingRef.current) return

        isTypingRef.current = true
        ws.emitTyping(conversationId, true)

        if (process.env.NODE_ENV === 'development') {
          console.log('[Typing V2] Started typing in conversation:', conversationId)
        }

        // Auto-stop typing after 3 seconds of inactivity
        if (stopTypingTimeoutRef.current) {
          clearTimeout(stopTypingTimeoutRef.current)
        }

        stopTypingTimeoutRef.current = setTimeout(() => {
          stopTyping()
        }, 3000)
      }, 300),
    [conversationId, ws]
  )

  /**
   * Stop typing
   */
  const stopTyping = useCallback(() => {
    if (!conversationId || !ws.client || !isTypingRef.current) return

    isTypingRef.current = false
    ws.emitTyping(conversationId, false)

    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current)
      stopTypingTimeoutRef.current = null
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Typing V2] Stopped typing in conversation:', conversationId)
    }
  }, [conversationId, ws])

  /**
   * Handle typing input
   */
  const handleTyping = useCallback(() => {
    startTyping()
  }, [startTyping])

  /**
   * Handle typing event from WebSocket
   */
  const handleTypingEvent = useCallback(
    (event: TypingIndicator) => {
      // Ignore own typing events
      if (event.userId === currentUserId) {
        return
      }

      // Only process events for current conversation
      if (event.conversationId !== conversationId) {
        return
      }

      if (event.isTyping) {
        // Add user to typing list (or update if exists)
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== event.userId)
          return [...filtered, event]
        })

        // Auto-remove after 5 seconds
        const existing = typingTimeouts.current.get(event.userId)
        if (existing) {
          clearTimeout(existing)
        }

        const timeout = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== event.userId))
          typingTimeouts.current.delete(event.userId)

          if (process.env.NODE_ENV === 'development') {
            console.log('[Typing V2] Auto-removed stale typing indicator for user:', event.userId)
          }
        }, 5000)

        typingTimeouts.current.set(event.userId, timeout)

        if (process.env.NODE_ENV === 'development') {
          console.log('[Typing V2] User started typing:', event.userId)
        }
      } else {
        // Remove user immediately
        setTypingUsers(prev => prev.filter(u => u.userId !== event.userId))

        const timeout = typingTimeouts.current.get(event.userId)
        if (timeout) {
          clearTimeout(timeout)
          typingTimeouts.current.delete(event.userId)
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[Typing V2] User stopped typing:', event.userId)
        }
      }
    },
    [currentUserId, conversationId]
  )

  /**
   * Subscribe to typing events
   */
  useEffect(() => {
    if (!conversationId || !ws.client) return

    ws.on('typing:update', handleTypingEvent)

    return () => {
      ws.off('typing:update', handleTypingEvent)
    }
  }, [conversationId, ws, handleTypingEvent])

  /**
   * Cleanup on conversation change or unmount
   */
  useEffect(() => {
    return () => {
      // Clear all typing timeouts
      typingTimeouts.current.forEach(timeout => clearTimeout(timeout))
      typingTimeouts.current.clear()

      // Clear stop typing timeout
      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current)
      }

      // Stop typing if we were typing
      if (isTypingRef.current && conversationId && ws.client) {
        ws.emitTyping(conversationId, false)
        isTypingRef.current = false
      }

      // Cancel debounced function
      startTyping.cancel()

      // Clear typing users
      setTypingUsers([])
    }
  }, [conversationId, ws, startTyping])

  return {
    typingUsers: typingUsers.filter(u => u.conversationId === conversationId),
    handleTyping,
    stopTyping
  }
}
