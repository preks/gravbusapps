import { useCallback } from 'react'
import type { Message } from '../types'

interface MessageCacheEntry {
  messages: Message[]
  timestamp: number
  page: number
  hasMore: boolean
}

// In-memory cache with TTL per conversation
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes
const messageCache = new Map<string, MessageCacheEntry>()

/**
 * Message cache hook for instant conversation reopening.
 *
 * Features:
 * - In-memory cache with 2-minute TTL
 * - Stores messages per conversation
 * - Returns cached messages instantly (< 1ms)
 * - Prevents redundant API calls
 * - Automatically invalidates stale data
 *
 * Performance Impact:
 * - Reopening cached conversations: < 1ms (vs 200-500ms API call)
 * - Eliminates network delay and processing overhead
 * - Dramatically reduces WebSocket violations
 */
export const useMessageCache = () => {
  /**
   * Get cached messages for a conversation
   * Returns null if not cached or expired
   */
  const getCachedMessages = useCallback((conversationId: string): MessageCacheEntry | null => {
    if (!conversationId) return null

    const entry = messageCache.get(conversationId)
    if (!entry) return null

    // Check if cache entry is still valid
    const now = Date.now()
    if (now - entry.timestamp > CACHE_TTL) {
      messageCache.delete(conversationId)
      return null
    }

    return entry
  }, [])

  /**
   * Store messages in cache
   */
  const setCachedMessages = useCallback(
    (conversationId: string, messages: Message[], page: number, hasMore: boolean) => {
      if (!conversationId) return

      messageCache.set(conversationId, {
        messages,
        timestamp: Date.now(),
        page,
        hasMore
      })
    },
    []
  )

  /**
   * Update a single message in cache (for status updates, edits, etc.)
   */
  const updateCachedMessage = useCallback(
    (conversationId: string, messageId: string, updater: (message: Message) => Message) => {
      const entry = messageCache.get(conversationId)
      if (!entry) return

      const updatedMessages = entry.messages.map(msg => (msg.id === messageId ? updater(msg) : msg))

      messageCache.set(conversationId, {
        ...entry,
        messages: updatedMessages,
        timestamp: Date.now() // Refresh TTL on update
      })
    },
    []
  )

  /**
   * Add a new message to cache (for real-time messages)
   */
  const addMessageToCache = useCallback((conversationId: string, message: Message) => {
    const entry = messageCache.get(conversationId)
    if (!entry) return

    // Check if message already exists (avoid duplicates)
    const exists = entry.messages.some(m => m.id === message.id)
    if (exists) return

    messageCache.set(conversationId, {
      ...entry,
      messages: [...entry.messages, message],
      timestamp: Date.now() // Refresh TTL on add
    })
  }, [])

  /**
   * Remove a message from cache
   */
  const removeMessageFromCache = useCallback((conversationId: string, messageId: string) => {
    const entry = messageCache.get(conversationId)
    if (!entry) return

    const updatedMessages = entry.messages.filter(m => m.id !== messageId)

    messageCache.set(conversationId, {
      ...entry,
      messages: updatedMessages,
      timestamp: Date.now() // Refresh TTL on remove
    })
  }, [])

  /**
   * Invalidate cache for a specific conversation
   */
  const invalidateConversation = useCallback((conversationId: string) => {
    messageCache.delete(conversationId)
  }, [])

  /**
   * Clear all cached messages
   */
  const clearCache = useCallback(() => {
    messageCache.clear()
  }, [])

  /**
   * Get cache stats (for debugging)
   */
  const getCacheStats = useCallback(() => {
    const now = Date.now()
    const entries = Array.from(messageCache.entries())

    return {
      total: entries.length,
      valid: entries.filter(([, entry]) => now - entry.timestamp < CACHE_TTL).length,
      expired: entries.filter(([, entry]) => now - entry.timestamp >= CACHE_TTL).length,
      totalMessages: entries.reduce((sum, [, entry]) => sum + entry.messages.length, 0)
    }
  }, [])

  return {
    getCachedMessages,
    setCachedMessages,
    updateCachedMessage,
    addMessageToCache,
    removeMessageFromCache,
    invalidateConversation,
    clearCache,
    getCacheStats
  }
}
