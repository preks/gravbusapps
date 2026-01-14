import { useState, useEffect, useCallback, useRef } from 'react'
import type { Message, PaginatedResponse } from '../types'
import { ChatApiClient } from '../services/chatApiClient'
import { startPerformanceTimer, measureRender, devPerf } from '../utils/performanceUtils'

interface UseMessagesV2Options {
  apiClient: ChatApiClient
  conversationId: string | null
  currentUserId?: string | null
  enabled?: boolean
}

/**
 * Simplified messages hook - focuses on core functionality without complex optimizations
 *
 * Key simplifications:
 * - No message caching (for now)
 * - No complex enrichment
 * - Simple state management
 * - Clear data flow
 */
export function useMessagesV2({
  apiClient,
  conversationId,
  currentUserId, // Reserved for future use (read receipts, message status)
  enabled = true
}: UseMessagesV2Options) {
  // Performance tracking
  const renderCountRef = useRef(0)
  devPerf(() => {
    renderCountRef.current++
    measureRender('useMessagesV2')
    // Log currentUserId for debugging (suppresses unused warning)
    console.log('[V2 Hook] User:', currentUserId || 'unknown')
  })
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

  /**
   * Load messages for the current conversation
   */
  const loadMessages = useCallback(
    async (page: number = 1) => {
      if (!conversationId || !enabled || !apiClient) {
        return
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

        devPerf(() => console.log('[V2] Loading messages:', { conversationId, page }))

        // Fetch messages from API
        const response: PaginatedResponse<Message> = await apiClient.getMessages(
          conversationId,
          page,
          50 // Load 50 messages per page
        )

        // Verify response is still relevant
        if (requestConversationId !== conversationId) {
          devPerf(() => console.log('[V2] Request aborted - conversation changed'))
          return
        }

        const loadedMessages = response.data || []

        devPerf(() =>
          console.log('[V2] Messages loaded:', {
            count: loadedMessages.length,
            page: response.page,
            totalPages: response.totalPages
          })
        )

        // OPTIMIZATION: Batch all state updates together to trigger single render
        // Use functional updates to ensure we have latest state
        const newPage = response.page
        const newHasMore = response.page < response.totalPages

        if (page === 1) {
          // Initial load - replace all messages (single state update batch)
          setMessages(loadedMessages)
          setCurrentPage(newPage)
          setHasMore(newHasMore)
        } else {
          // Load more - prepend older messages (single state update batch)
          setMessages(prev => [...loadedMessages, ...prev])
          setCurrentPage(newPage)
          setHasMore(newHasMore)
        }

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
        setError(err instanceof Error ? err : new Error('Failed to load messages'))
      } finally {
        isLoadingRef.current = false
        setIsLoading(false)
      }
    },
    [apiClient, conversationId, enabled]
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
   * Add a new message (e.g., from WebSocket)
   */
  const addMessage = useCallback((message: Message) => {
    devPerf(() => console.log('[V2] Adding message:', { id: message.id, conversationId: message.conversationId }))

    setMessages(prev => {
      // Check if message already exists
      const exists = prev.some(m => m.id === message.id)
      if (exists) {
        devPerf(() => console.log('[V2] Updating existing message'))
        // Update existing message
        return prev.map(m => (m.id === message.id ? message : m))
      }
      devPerf(() => console.log('[V2] Adding new message'))
      // Add new message at the end
      return [...prev, message]
    })
  }, [])

  /**
   * Update an existing message
   */
  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, ...updates } : m)))
  }, [])

  /**
   * Delete a message
   */
  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }, [])

  /**
   * Reset state when conversation changes
   */
  useEffect(() => {
    if (conversationId) {
      devPerf(() => console.log('[V2] Conversation changed, loading messages:', conversationId))

      // Clear messages immediately
      setMessages([])
      setCurrentPage(1)
      setHasMore(false)
      setError(null)

      // Load new conversation's messages
      loadMessages(1)
    }

    // Cleanup on unmount or conversation change
    return () => {
      if (abortControllerRef.current) {
        devPerf(() => console.log('[V2] Cleaning up conversation:', conversationId))
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [conversationId, loadMessages])

  return {
    messages,
    isLoading,
    error,
    hasMore,
    loadMore,
    addMessage,
    updateMessage,
    deleteMessage,
    refresh: () => loadMessages(1)
  }
}
