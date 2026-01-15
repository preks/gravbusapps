import { useState, useEffect, useCallback, useRef, startTransition, useMemo } from 'react'
import type { Message, PaginatedResponse, Conversation } from '../types'
import { ChatApiClient } from '../services/chatApiClient'
import { startPerformanceTimer, measureRender, devPerf } from '../utils/performanceUtils'
import { useCacheV2 } from './useCacheV2'

interface UseMessagesV2Options {
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
export function useMessagesV2({
  apiClient,
  conversationId,
  currentUserId,
  conversation,
  enabled = true,
  onMessagesLoaded
}: UseMessagesV2Options) {
  // Performance tracking
  const renderCountRef = useRef(0)
  devPerf(() => {
    renderCountRef.current++
    measureRender('useMessagesV2')
  })

  // Cache hook
  const cache = useCacheV2()
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
  if (prevConversationIdRef.current !== conversationId && prevConversationIdRef.current !== undefined) {
    // ConversationId changed - clear state immediately
    devPerf(() => console.log('[V2] ConversationId changed during render, clearing state synchronously'))
    setMessages([])
    setCurrentPage(1)
    setHasMore(false)
    setError(null)
  }
  prevConversationIdRef.current = conversationId ?? undefined

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
          devPerf(() => console.log('[V2] Already loaded this conversation, skipping duplicate load'))
          return
        }

        const cached = cache.getCachedMessages(conversationId)
        if (cached) {
          devPerf(() => console.log('[V2] Loading from cache:', conversationId))

          // Verify conversation hasn't changed (prevents race conditions)
          if (conversationId !== displayedConversationIdRef.current) {
            devPerf(() => console.log('[V2] Stale cache ignored - conversation changed'))
            return
          }

          // CRITICAL: Prevent concurrent cache loads
          if (isLoadingRef.current) {
            devPerf(() => console.log('[V2] Already loading, skipping duplicate cache load'))
            return
          }

          // Mark this conversation as loaded
          lastLoadedConversationRef.current = conversationId

          // Notify parent that messages were loaded (prevent WebSocket duplicates)
          if (onMessagesLoaded) {
            onMessagesLoaded(cached.messages.map(m => m.id))
          }

          // Set from cache with status recalculation
          startTransition(() => {
            const processedMessages = processMessages(cached.messages)
            setMessages(processedMessages)
            setCurrentPage(cached.page)
            setHasMore(cached.hasMore)
            setIsLoading(false)
            isLoadingRef.current = false
          })

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
      let perfTimer: ReturnType<typeof startPerformanceTimer> | null = null
      if (process.env.NODE_ENV === 'development') {
        perfTimer = startPerformanceTimer(`messages-load-page-${page}`)
      }

      try {
        isLoadingRef.current = true
        setIsLoading(true)
        setError(null)

        devPerf(() => console.log('[V2] Loading messages from API:', { conversationId, page }))

        // Fetch messages from API
        const response: PaginatedResponse<Message> = await apiClient.getMessages(
          conversationId,
          page,
          100 // Load 50 messages per page
        )

        // CRITICAL: Verify response is still relevant (check against current displayed conversation)
        // This prevents race conditions when switching conversations rapidly
        if (requestConversationId !== displayedConversationIdRef.current) {
          devPerf(() =>
            console.log('[V2] Stale request ignored - conversation changed:', {
              requested: requestConversationId,
              current: displayedConversationIdRef.current
            })
          )
          return
        }

        const loadedMessages = response.data || []
        const processedMessages = processMessages(loadedMessages)

        devPerf(() =>
          console.log('[V2] Messages loaded from API:', {
            count: loadedMessages.length,
            page: response.page,
            totalPages: response.totalPages
          })
        )

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

        // End performance tracking
        if (perfTimer) {
          perfTimer.endAndLog()
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          devPerf(() => console.log('[V2] Request aborted'))
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
      devPerf(() => console.log('[V2] Adding message:', { id: message.id, optimistic: isOptimistic }))

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
          devPerf(() => console.log('[V2] Updating existing message'))
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
        }

        devPerf(() => console.log('[V2] Adding new message'))

        // Add to cache
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
        devPerf(() => console.log('[V2] Conversation changed, loading messages:', conversationId))

        // Reset the last loaded conversation so loadMessages can proceed
        lastLoadedConversationRef.current = undefined

        // CRITICAL: Update ref IMMEDIATELY to prevent double-loading
        // Must be synchronous, BEFORE loadMessages is called
        displayedConversationIdRef.current = conversationId

        // Load new conversation's messages (will use cache if available)
        // State is already cleared synchronously during render
        loadMessages(1)
      }
    }

    // Cleanup on unmount or conversation change
    return () => {
      if (abortControllerRef.current) {
        devPerf(() => console.log('[V2] Cleaning up conversation:', conversationId))
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
