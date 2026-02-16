import { useRef, useCallback, useEffect } from 'react'
import { LRUCache, DEFAULT_CACHE_CONFIG } from '../utils/cacheUtils'
import type { Message, Conversation, User } from '../types'

/**
 * Message cache entry with pagination metadata
 */
interface MessageCacheEntry {
  messages: Message[]
  page: number
  hasMore: boolean
  totalCount?: number
}

/**
 * Cache Hook
 *
 * Features:
 * - Ref-based storage (no re-renders)
 * - LRU eviction policy
 * - TTL-based expiration
 * - Separate caches for messages, conversations, users
 * - Cache warming on mount
 * - Performance metrics
 */
export function useCache() {
  // Initialize caches in refs (never triggers re-renders)
  const messagesCacheRef = useRef(new LRUCache<string, MessageCacheEntry>(DEFAULT_CACHE_CONFIG.messages))
  const conversationsCacheRef = useRef(new LRUCache<string, Conversation>(DEFAULT_CACHE_CONFIG.conversations))
  const usersCacheRef = useRef(new LRUCache<string, User>(DEFAULT_CACHE_CONFIG.users))

  // Cleanup interval ref
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Get cached messages for a conversation
   */
  const getCachedMessages = useCallback((conversationId: string): MessageCacheEntry | null => {
    if (!conversationId) return null
    return messagesCacheRef.current.get(conversationId)
  }, [])

  /**
   * Set cached messages for a conversation
   */
  const setCachedMessages = useCallback(
    (conversationId: string, messages: Message[], page: number, hasMore: boolean, totalCount?: number) => {
      if (!conversationId) return

      messagesCacheRef.current.set(conversationId, {
        messages,
        page,
        hasMore,
        totalCount
      })
    },
    []
  )

  /**
   * Update a single message in cache
   */
  const updateCachedMessage = useCallback(
    (conversationId: string, messageId: string, updater: (message: Message) => Message) => {
      const success = messagesCacheRef.current.update(conversationId, entry => ({
        ...entry,
        messages: entry.messages.map(msg => (msg.id === messageId ? updater(msg) : msg))
      }))

      return success
    },
    []
  )

  /**
   * Add a message to cache
   */
  const addMessageToCache = useCallback((conversationId: string, message: Message) => {
    const success = messagesCacheRef.current.update(conversationId, entry => {
      // Check if message already exists
      const exists = entry.messages.some(m => m.id === message.id)
      if (exists) return entry

      return {
        ...entry,
        messages: [...entry.messages, message]
      }
    })

    return success
  }, [])

  /**
   * Remove a message from cache
   */
  const removeMessageFromCache = useCallback((conversationId: string, messageId: string) => {
    const success = messagesCacheRef.current.update(conversationId, entry => ({
      ...entry,
      messages: entry.messages.filter(m => m.id !== messageId)
    }))

    return success
  }, [])

  /**
   * Invalidate message cache for a conversation (so next open refetches from API).
   */
  const invalidateMessages = useCallback((conversationId: string) => {
    if (!conversationId) return
    messagesCacheRef.current.delete(conversationId)
  }, [])

  /**
   * Invalidate conversation cache
   */
  const invalidateConversation = useCallback((conversationId: string) => {
    messagesCacheRef.current.delete(conversationId)
    conversationsCacheRef.current.delete(conversationId)
  }, [])

  /**
   * Get cached conversation
   */
  const getCachedConversation = useCallback((conversationId: string): Conversation | null => {
    if (!conversationId) return null
    return conversationsCacheRef.current.get(conversationId)
  }, [])

  /**
   * Set cached conversation
   */
  const setCachedConversation = useCallback((conversation: Conversation) => {
    if (!conversation.id) return
    conversationsCacheRef.current.set(conversation.id, conversation)
  }, [])

  /**
   * Get cached user
   */
  const getCachedUser = useCallback((userId: string): User | null => {
    if (!userId) return null
    return usersCacheRef.current.get(userId)
  }, [])

  /**
   * Set cached user
   */
  const setCachedUser = useCallback((user: User) => {
    if (!user.id) return
    usersCacheRef.current.set(user.id, user)
  }, [])

  /**
   * Clear all caches
   */
  const clearAllCaches = useCallback(() => {
    messagesCacheRef.current.clear()
    conversationsCacheRef.current.clear()
    usersCacheRef.current.clear()
  }, [])

  /**
   * Get cache statistics (for monitoring)
   */
  const getCacheStats = useCallback(() => {
    return {
      messages: messagesCacheRef.current.getStats(),
      conversations: conversationsCacheRef.current.getStats(),
      users: usersCacheRef.current.getStats()
    }
  }, [])

  /**
   * Warm up cache with initial data (optional)
   */
  const warmCache = useCallback(
    (data: { messages?: Array<{ conversationId: string; messages: Message[] }>; conversations?: Conversation[] }) => {
      if (data.messages) {
        data.messages.forEach(({ conversationId, messages }) => {
          setCachedMessages(conversationId, messages, 1, false)
        })
      }

      if (data.conversations) {
        data.conversations.forEach(conv => {
          setCachedConversation(conv)
        })
      }
    },
    [setCachedMessages, setCachedConversation]
  )

  /**
   * Set up periodic cleanup of expired entries
   */
  useEffect(() => {
    // Clean up expired entries every 60 seconds
    cleanupIntervalRef.current = setInterval(() => {
      messagesCacheRef.current.cleanup()
      conversationsCacheRef.current.cleanup()
      usersCacheRef.current.cleanup()
    }, 60 * 1000)

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
    }
  }, [])

  /**
   * Log cache stats in development (every 30 seconds)
   */
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    // Cache stats logging disabled
  }, [getCacheStats])

  return {
    // Message cache
    getCachedMessages,
    setCachedMessages,
    updateCachedMessage,
    addMessageToCache,
    removeMessageFromCache,
    invalidateMessages,

    // Conversation cache
    getCachedConversation,
    setCachedConversation,
    invalidateConversation,

    // User cache
    getCachedUser,
    setCachedUser,

    // Utilities
    clearAllCaches,
    getCacheStats,
    warmCache
  }
}
