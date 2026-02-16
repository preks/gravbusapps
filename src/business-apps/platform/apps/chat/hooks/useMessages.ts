import { useState, useEffect, useCallback, useRef, startTransition, useMemo } from 'react'
import type { Message, PaginatedResponse, Conversation } from '../types'
import { ChatApiClient } from '../services/chatApiClient'
import { devPerf } from '../utils/performanceUtils'
import { useCache } from './useCache'

interface UseMessagesOptions {
  apiClient: ChatApiClient
  conversationId: string | null
  currentUserId?: string | null
  conversation?: Conversation | null
  enabled?: boolean
  onMessagesLoaded?: (messageIds: string[]) => void
}

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read'

/**
 * Enhanced V2 messages hook with caching and status tracking
 *
 * Features:
 * - Message caching for instant conversation switching
 * - Message status tracking (sent/delivered/read)
 * - Optimistic updates for better UX
 * - Proper cleanup and memory management
 */
export function useMessages({
  apiClient,
  conversationId,
  currentUserId,
  conversation,
  enabled = true,
  onMessagesLoaded
}: UseMessagesOptions) {
  // Cache hook
  const cache = useCache()
  // Core state
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Refs for request management
  const abortControllerRef = useRef<AbortController | null>(null)
  const isLoadingRef = useRef(false)
  const conversationRef = useRef(conversation)
  const currentUserIdRef = useRef(currentUserId)
  const cacheRef = useRef(cache) // Stable reference for useEffect without causing infinite loop
  const displayedConversationIdRef = useRef<string | undefined>(undefined) // Track which conversation's messages are displayed
  const lastLoadedConversationRef = useRef<string | undefined>(undefined) // Track which conversation we've successfully loaded (prevents duplicate loads)
  const prevConversationIdRef = useRef<string | undefined>(undefined) // Track previous conversationId to detect changes during render

  // CRITICAL: Clear messages synchronously during render when conversationId changes
  // This prevents showing old conversation's messages even for 1 frame
  // Must happen BEFORE any effects run
  if (prevConversationIdRef.current !== conversationId) {
    const prev = prevConversationIdRef.current
    const current = conversationId ?? undefined

    // Clear messages in two cases:
    // 1. Switching between two conversations (A → B)
    // 2. Closing a conversation (A → null)
    if (prev && (current || prev !== current)) {
      setMessages([])
      setCurrentPage(1)
      setHasMore(false)
      setError(null)
      // Invalidate message cache so next time we open this conversation we refetch from API
      cache.invalidateMessages(prev)
      lastLoadedConversationRef.current = undefined
    }

    // Update ref AFTER clearing to prevent duplicate clears
    prevConversationIdRef.current = current
  }

  // Keep refs in sync
  useEffect(() => {
    conversationRef.current = conversation
  }, [conversation])

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  useEffect(() => {
    cacheRef.current = cache
  }, [cache])

  /**
   * Calculate message status based on participants' read timestamps
   */
  const calculateMessageStatus = useCallback((message: Message): MessageStatus => {
    if (!currentUserIdRef.current || message.senderId !== currentUserIdRef.current) {
      return 'read' // Other users' messages are always "read" (from our perspective)
    }

    const conv = conversationRef.current
    if (!conv?.participants) return 'sent'

    // Get other participants' most recent read timestamp
    const otherParticipants = conv.participants.filter(p => p.userId !== currentUserIdRef.current)
    const mostRecentReadTimestamp = otherParticipants.reduce((latest, p) => {
      if (!p.lastReadAt) return latest
      const readTime = new Date(p.lastReadAt).getTime()
      return !latest || readTime > latest ? readTime : latest
    }, 0)

    if (mostRecentReadTimestamp > 0) {
      const messageTime = new Date(message.createdAt).getTime()
      if (messageTime <= mostRecentReadTimestamp) {
        return 'read'
      }
    }

    return 'sent'
  }, [])

  /**
   * Process messages with status calculation
   */
  const processMessages = useCallback(
    (messages: Message[]): Message[] => {
      // Defensive: Return [] if input is not array
      if (!Array.isArray(messages)) return []
      return messages.map(msg => {
        const status = calculateMessageStatus(msg)
        // Map 'sending' to 'sent' to match Message interface (sent | delivered | read)
        const validStatus: 'sent' | 'delivered' | 'read' =
          status === 'sending' ? 'sent' : (status as 'sent' | 'delivered' | 'read')
        return {
          ...msg,
          status: validStatus
        }
      })
    },
    [calculateMessageStatus]
  )

  /**
   * Load messages for the current conversation
   */
  const loadMessages = useCallback(
    async (page: number = 1) => {
      if (!conversationId || !enabled || !apiClient) {
        return
      }

      // Try cache first for initial load
      if (page === 1) {
        // CRITICAL: Prevent duplicate loads
        // If we just loaded this conversation, skip (prevents double cache loads)
        if (lastLoadedConversationRef.current === conversationId) {
          return
        }

        const cached = cache.getCachedMessages(conversationId)
        if (cached) {
          // Verify conversation hasn't changed (prevents race conditions)
          if (conversationId !== displayedConversationIdRef.current) {
            return
          }

          // CRITICAL: Prevent concurrent cache loads
          if (isLoadingRef.current) {
            return
          }

          // Mark this conversation as loaded
          lastLoadedConversationRef.current = conversationId

          // Notify parent that messages were loaded (prevent WebSocket duplicates)
          if (onMessagesLoaded) {
            onMessagesLoaded(cached.messages.map(m => m.id))
          }

          // PERFORMANCE FIX: Apply cached data synchronously WITHOUT loading state
          // Cache should be instant - no spinner, no delays, just immediate display
          const processedMessages = processMessages(cached.messages)
          setMessages(processedMessages)
          setCurrentPage(cached.page)
          setHasMore(cached.hasMore)
          // Note: isLoading stays false - cached data appears instantly

          return // Skip API call
        }
      }

      // Prevent concurrent requests
      if (isLoadingRef.current) {
        return
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()
      const requestConversationId = conversationId

      // Start performance tracking

      try {
        isLoadingRef.current = true
        setIsLoading(true)
        setError(null)
        // Fetch messages from API
        const response: PaginatedResponse<Message> = await apiClient.getMessages(
          conversationId,
          page,
          100 // Load 50 messages per page
        )

        // CRITICAL: Verify response is still relevant (check against current displayed conversation)
        // This prevents race conditions when switching conversations rapidly
        if (requestConversationId !== displayedConversationIdRef.current) {
          return
        }

        const loadedMessages = response.data || []
        const processedMessages = processMessages(loadedMessages)

        const newPage = response.page
        const newHasMore = response.page < response.totalPages

        // Cache initial loads
        if (page === 1) {
          cache.setCachedMessages(conversationId, processedMessages, newPage, newHasMore)

          // Notify parent that messages were loaded
          if (onMessagesLoaded) {
            onMessagesLoaded(processedMessages.map(m => m.id))
          }
        }

        // OPTIMIZATION: Batch ALL state updates together to trigger single render
        // Include isLoading in the batch to prevent extra render
        startTransition(() => {
          if (page === 1) {
            setMessages(processedMessages)
            // Mark this conversation as successfully loaded (prevents duplicate loads)
            lastLoadedConversationRef.current = conversationId
          } else {
            // Load more - prepend older messages
            setMessages(prev => [...processedMessages, ...prev])
          }
          setCurrentPage(newPage)
          setHasMore(newHasMore)
          setIsLoading(false)
          isLoadingRef.current = false
        })
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        console.error('[V2] Failed to load messages:', err)
        devPerf(() => console.error('[V2] Error details:', err))

        // Batch error state updates
        startTransition(() => {
          setError(err instanceof Error ? err : new Error('Failed to load messages'))
          setIsLoading(false)
          isLoadingRef.current = false
        })
      }
    },
    [apiClient, conversationId, enabled, cache, processMessages, onMessagesLoaded]
  )

  /**
   * Load more (older) messages
   */
  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadMessages(currentPage + 1)
    }
  }, [hasMore, isLoading, currentPage, loadMessages])

  /**
   * Add a new message with optimistic update support
   */
  const addMessage = useCallback(
    (message: Message, isOptimistic: boolean = false) => {
      // Calculate status and ensure it matches Message interface (sent | delivered | read)
      const calculatedStatus = isOptimistic ? 'sending' : calculateMessageStatus(message)
      const validStatus: 'sent' | 'delivered' | 'read' =
        calculatedStatus === 'sending' ? 'sent' : (calculatedStatus as 'sent' | 'delivered' | 'read')

      const processedMessage = {
        ...message,
        status: validStatus
      }

      setMessages(prev => {
        // Check if message already exists
        const existingIndex = prev.findIndex(m => {
          if (m.id === message.id) return true
          // Replace temp message with real one (match by content + timestamp)
          if (
            m.id.startsWith('temp-') &&
            m.content === message.content &&
            m.conversationId === message.conversationId
          ) {
            return true
          }
          return false
        })

        if (existingIndex >= 0) {
          const updated = [...prev]
          // Preserve better status when replacing
          const existingStatus = prev[existingIndex].status || 'sent'
          const statusPriority = { sending: 1, sent: 2, delivered: 3, read: 4 }
          const existingPriority = statusPriority[existingStatus as keyof typeof statusPriority] || 0
          const newPriority = statusPriority[processedMessage.status as keyof typeof statusPriority] || 0

          // Preserve better status when replacing
          const finalStatus: 'sending' | 'sent' | 'delivered' | 'read' =
            existingPriority > newPriority ? existingStatus : processedMessage.status

          updated[existingIndex] = {
            ...processedMessage,
            status: finalStatus
          }
          return updated
        } // Add to cache
        if (conversationId) {
          cache.addMessageToCache(conversationId, processedMessage)
        }

        return [...prev, processedMessage]
      })
    },
    [calculateMessageStatus, conversationId, cache]
  )

  /**
   * Update an existing message
   */
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, ...updates } : m)))

      // Update cache
      if (conversationId) {
        cache.updateCachedMessage(conversationId, messageId, msg => ({ ...msg, ...updates }))
      }
    },
    [conversationId, cache]
  )

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(
    (messageId: string) => {
      setMessages(prev => prev.filter(m => m.id !== messageId))

      // Update cache
      if (conversationId) {
        cache.removeMessageFromCache(conversationId, messageId)
      }
    },
    [conversationId, cache]
  )

  /**
   * Update message status (sent/delivered/read)
   */
  const updateMessageStatus = useCallback(
    (messageId: string, status: MessageStatus) => {
      // Convert to valid Message status (no 'sending')
      const validStatus: 'sent' | 'delivered' | 'read' =
        status === 'sending' ? 'sent' : (status as 'sent' | 'delivered' | 'read')

      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, status: validStatus } : m)))

      // Update cache
      if (conversationId) {
        cache.updateCachedMessage(conversationId, messageId, msg => ({ ...msg, status: validStatus }))
      }
    },
    [conversationId, cache]
  )

  /**
   * Bulk update message statuses (e.g., mark all as read)
   */
  const bulkUpdateStatus = useCallback(
    (updates: Array<{ id: string; status: MessageStatus }>) => {
      const statusMap = new Map(updates.map(u => [u.id, u.status]))

      startTransition(() => {
        setMessages(prev =>
          prev.map(m => {
            if (statusMap.has(m.id)) {
              // Only allow valid Message.status: 'sent' | 'delivered' | 'read'
              const status = statusMap.get(m.id)
              const validStatus: 'sent' | 'delivered' | 'read' =
                status === 'sending' ? 'sent' : (status as 'sent' | 'delivered' | 'read')
              return { ...m, status: validStatus }
            }
            return m
          })
        )
      })

      // Update cache
      if (conversationId) {
        updates.forEach(({ id, status }) => {
          // Convert to valid Message status before caching
          const validStatus: 'sent' | 'delivered' | 'read' =
            status === 'sending' ? 'sent' : (status as 'sent' | 'delivered' | 'read')
          cache.updateCachedMessage(conversationId, id, msg => ({ ...msg, status: validStatus }))
        })
      }
    },
    [conversationId, cache]
  )

  /**
   * Load messages when conversation changes
   * PERFORMANCE: State clearing happens synchronously during render now
   */
  useEffect(() => {
    if (conversationId) {
      // Check if we're actually switching to a different conversation
      const isSwitchingConversation = displayedConversationIdRef.current !== conversationId

      if (isSwitchingConversation) {
        // Reset the last loaded conversation so loadMessages can proceed
        lastLoadedConversationRef.current = undefined

        // CRITICAL: Update ref IMMEDIATELY to prevent double-loading
        // Must be synchronous, BEFORE loadMessages is called
        displayedConversationIdRef.current = conversationId

        // Load new conversation's messages (will use cache if available)
        // State is already cleared synchronously during render
        loadMessages(1)
      }
    } else {
      // ConversationId is null/undefined - clear the displayed conversation ref
      // This ensures the next conversation selection is treated as a new conversation
      if (displayedConversationIdRef.current) {
        displayedConversationIdRef.current = undefined
      }
    }

    // Cleanup on unmount or conversation change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [conversationId]) // CRITICAL: Only conversationId, not loadMessages or cache

  // PERFORMANCE: Memoize return object to prevent cascade re-renders
  // Note: refresh is recreated when loadMessages changes, which is intentional
  return useMemo(
    () => ({
      messages,
      isLoading,
      error,
      hasMore,
      loadMore,
      addMessage,
      updateMessage,
      deleteMessage,
      updateMessageStatus,
      bulkUpdateStatus,
      refresh: () => loadMessages(1)
    }),
    [
      messages,
      isLoading,
      error,
      hasMore,
      loadMore,
      addMessage,
      updateMessage,
      deleteMessage,
      updateMessageStatus,
      bulkUpdateStatus,
      loadMessages
    ]
  )
}
