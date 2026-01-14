import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import type { Message, PaginatedResponse, Conversation } from '../types'
import { ChatApiClient } from '../services/chatApiClient'
import { useMessageCache } from './useMessageCache'

interface UseMessagesOptions {
  apiClient: ChatApiClient
  conversationId: string | null
  currentUserId?: string | null
  conversation?: Conversation | null
  enabled?: boolean
  onMessagesLoaded?: (messageIds: string[]) => void // Callback to notify when messages are loaded
}

export function useMessages({
  apiClient,
  conversationId,
  currentUserId,
  conversation,
  enabled = true,
  onMessagesLoaded
}: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const isLoadingMoreRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeConversationIdRef = useRef<string | null>(null)

  // PERFORMANCE: Message cache for instant conversation reopening
  const { getCachedMessages, setCachedMessages, updateCachedMessage, addMessageToCache, removeMessageFromCache } =
    useMessageCache()

  // CRITICAL FIX: Use refs for all values to prevent loadMessages from recreating
  // This was causing the effect to re-run repeatedly (infinite loop)
  const apiClientRef = useRef(apiClient)
  const conversationIdRef = useRef(conversationId)
  const currentUserIdRef = useRef(currentUserId)
  const enabledRef = useRef(enabled)

  // Keep refs in sync
  useEffect(() => {
    apiClientRef.current = apiClient
  }, [apiClient])

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  // Use ref for conversation to avoid triggering loadMessages when conversation metadata changes
  const conversationRef = useRef(conversation)
  useEffect(() => {
    conversationRef.current = conversation
  }, [conversation])

  const loadMessages = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      // CRITICAL FIX: Use refs to access current values without recreating callback
      const currentConversationId = conversationIdRef.current
      const currentApiClient = apiClientRef.current
      const currentEnabled = enabledRef.current
      const currentUserId = currentUserIdRef.current

      if (!currentConversationId || !currentEnabled) return

      // Check if apiClient is valid (not empty object)
      if (!currentApiClient || typeof currentApiClient.getMessages !== 'function') {
        return
      }

      // PERFORMANCE: Try to load from cache first (only for initial page load, not pagination)
      if (pageNum === 1 && !append) {
        const cached = getCachedMessages(currentConversationId)
        if (cached) {
          // CRITICAL: Mark messages as processed FIRST (before WebSocket can fire!)
          if (typeof onMessagesLoaded === 'function') {
            onMessagesLoaded(cached.messages.map(m => m.id))
          }

          // Set messages from cache immediately (< 1ms!)
          startTransition(() => {
            setMessages(cached.messages)
            setHasMore(cached.hasMore)
            setPage(cached.page)
            setIsLoading(false)
            isLoadingMoreRef.current = false
          })

          return // Skip API call entirely!
        }
      }

      // Prevent concurrent loads for the SAME conversation
      // (but allow new conversation loads to proceed)
      if (isLoadingMoreRef.current && currentConversationId === activeConversationIdRef.current) {
        return
      }

      // Cancel any in-flight request for previous conversation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller for this request
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Capture the conversation ID at the time of the request
      const requestConversationId = currentConversationId

      try {
        isLoadingMoreRef.current = true
        setIsLoading(true)
        setError(null)

        const response: PaginatedResponse<Message> = await currentApiClient.getMessages(
          currentConversationId,
          pageNum,
          25
        )

        // CRITICAL: Check if this response is still relevant
        // If conversation changed while request was in flight, discard the response
        if (abortController.signal.aborted || requestConversationId !== activeConversationIdRef.current) {
          // Clear loading states for the aborted request
          if (requestConversationId !== activeConversationIdRef.current) {
            setIsLoading(false)
            isLoadingMoreRef.current = false
          }
          return
        }

        // Ensure response.data exists and is an array
        // Backend already returns messages in ascending order (oldest first, newest last)
        const loadedMessages = response.data && Array.isArray(response.data) ? response.data : []

        // OPTIMIZATION: Pre-calculate read timestamp ONCE outside the loop
        // This avoids expensive recalculation for each message
        const otherParticipants = conversationRef.current?.participants?.filter(p => p.userId !== currentUserId) || []
        const mostRecentOtherReadTimestamp = otherParticipants.reduce((latest, p) => {
          if (!p.lastReadAt) return latest
          const readAtTime = new Date(p.lastReadAt).getTime()
          return !latest || readAtTime > latest ? readAtTime : latest
        }, 0)

        // OPTIMIZATION: Process message statuses with minimal overhead
        // Use simple array map without intermediate functions for better performance
        const processedMessages = loadedMessages.map(msg => {
          // If no currentUserId, use backend status or default to 'sent'
          if (!currentUserId) {
            return { ...msg, status: (msg.status || 'sent') as 'sent' | 'delivered' | 'read' }
          }

          // If it's the current user's message
          if (msg.senderId === currentUserId) {
            // Check if any other participant read the message (use pre-calculated timestamp)
            if (mostRecentOtherReadTimestamp > 0 && new Date(msg.createdAt).getTime() <= mostRecentOtherReadTimestamp) {
              return { ...msg, status: 'read' as const }
            }
            // Otherwise, show as sent
            return { ...msg, status: 'sent' as const }
          } else {
            // If it's someone else's message in the active conversation, mark as read
            return { ...msg, status: 'read' as const }
          }
        })

        // PERFORMANCE: Store in cache for instant future access
        const finalMessages = append ? [...messages, ...processedMessages] : processedMessages
        const finalHasMore = response.page < response.totalPages

        if (!append) {
          // Only cache initial loads, not pagination
          setCachedMessages(currentConversationId, finalMessages, response.page, finalHasMore)

          // CRITICAL: Notify parent that we loaded messages with their IDs
          // This prevents WebSocket from re-processing the same messages
          if (typeof onMessagesLoaded === 'function') {
            onMessagesLoaded(finalMessages.map(m => m.id))
          }
        }

        // OPTIMIZATION: Update state in a single batch using startTransition
        // This makes the UI non-blocking and prevents jank
        startTransition(() => {
          // Update messages
          if (append) {
            // When loading older messages, prepend them (they're older than current messages)
            setMessages(prev => [...processedMessages, ...prev])
          } else {
            // Initial load: messages are already in correct order (oldest first, newest last)
            setMessages(finalMessages)
          }

          // Update pagination state
          setHasMore(finalHasMore)
          setPage(response.page)

          // Clear loading state INSIDE startTransition to prevent flash
          setIsLoading(false)
          isLoadingMoreRef.current = false
        })
      } catch (err) {
        // Don't set error if request was aborted (expected behavior)
        if (err instanceof Error && err.name === 'AbortError') {
          // Clear loading states when aborted
          setIsLoading(false)
          isLoadingMoreRef.current = false
          return
        }

        // Only set error if this is still the active conversation
        if (requestConversationId === activeConversationIdRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to load messages'))
        }

        // Clear loading state on error
        setIsLoading(false)
        isLoadingMoreRef.current = false
      }
    },
    [] // EMPTY DEPENDENCIES - callback never recreates!
  )

  const loadMoreMessages = useCallback(() => {
    if (hasMore && !isLoading && !isLoadingMoreRef.current) {
      loadMessages(page + 1, true)
    }
  }, [hasMore, isLoading, page, loadMessages])

  const addMessage = useCallback(
    (message: Message) => {
      setMessages(prev => {
        // Check if message already exists (by ID or by temp ID + content match)
        const existingIndex = prev.findIndex(m => {
          if (m.id === message.id) return true
          // Replace optimistic message (temp ID) with real message if content matches
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
          const existingMessage = prev[existingIndex]

          // Preserve better status when replacing message (delivered > sent, read > delivered)
          const statusPriority = { sent: 1, delivered: 2, read: 3 }
          const existingPriority = statusPriority[existingMessage.status as keyof typeof statusPriority] || 0
          const newPriority = statusPriority[message.status as keyof typeof statusPriority] || 0

          // Replace existing message, but preserve better status
          const updated = [...prev]
          const finalStatus = existingPriority > newPriority ? existingMessage.status : message.status
          updated[existingIndex] = {
            ...message,
            status: finalStatus
          }

          return updated
        }

        // PERFORMANCE: Update cache when adding new message
        if (conversationIdRef.current) {
          addMessageToCache(conversationIdRef.current, message)
        }

        return [...prev, message]
      })
    },
    [addMessageToCache]
  )

  const updateMessage = useCallback(
    (message: Message) => {
      setMessages(prev => prev.map(m => (m.id === message.id ? { ...m, ...message } : m)))

      // PERFORMANCE: Update cache
      if (conversationIdRef.current) {
        updateCachedMessage(conversationIdRef.current, message.id, () => message)
      }
    },
    [updateCachedMessage]
  )

  const deleteMessage = useCallback(
    (messageId: string) => {
      setMessages(prev => prev.filter(m => m.id !== messageId))

      // PERFORMANCE: Update cache
      if (conversationIdRef.current) {
        removeMessageFromCache(conversationIdRef.current, messageId)
      }
    },
    [removeMessageFromCache]
  )

  const updateMessageStatus = useCallback(
    (messageId: string, status: 'sent' | 'delivered' | 'read') => {
      // Make this synchronous (no startTransition) to ensure status updates happen immediately
      // Status updates are important for UX and should not be delayed
      setMessages(prev => {
        const newMessages = prev.map(m => (m.id === messageId ? { ...m, status } : m))
        return newMessages
      })

      // PERFORMANCE: Update cache
      if (conversationIdRef.current) {
        updateCachedMessage(conversationIdRef.current, messageId, msg => ({ ...msg, status }))
      }
    },
    [updateCachedMessage]
  )

  const bulkUpdateMessagesFromSender = useCallback((senderId: string, status: 'sent' | 'delivered' | 'read') => {
    // Use startTransition for bulk status updates as they're not urgent for the UI
    startTransition(() => {
      setMessages(prev => prev.map(m => (m.senderId === senderId ? { ...m, status } : m)))
    })
  }, [])

  // Track previous conversation ID to detect conversation changes
  const prevConversationIdRef = useRef<string | null>(null)

  // Load messages when conversation changes or API client becomes available
  useEffect(() => {
    if (conversationId && enabled && apiClient && typeof apiClient.getMessages === 'function') {
      // Clear messages immediately when switching to a different conversation
      // This prevents showing the wrong conversation's messages
      const isConversationChange =
        prevConversationIdRef.current !== null && prevConversationIdRef.current !== conversationId

      if (isConversationChange) {
        // Clear old messages immediately to prevent showing wrong conversation's messages
        setMessages([])

        // Cancel any in-flight requests from previous conversation
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
          abortControllerRef.current = null
        }

        // Set loading state immediately for smooth UX (shows spinner while switching)
        setIsLoading(true)
        isLoadingMoreRef.current = false
      }

      // Update active conversation ref BEFORE starting the load
      activeConversationIdRef.current = conversationId
      prevConversationIdRef.current = conversationId

      startTransition(() => {
        setPage(1)
        setHasMore(true)
      })

      // CRITICAL FIX: Defer message loading to not block the effect
      // This prevents the 20-second click handler violation
      setTimeout(() => {
        loadMessages(1, false)
      }, 0)
    }

    // Cleanup: abort any in-flight requests when component unmounts or conversation becomes null
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [conversationId, enabled, apiClient, loadMessages]) // Removed 'conversation' to prevent reload on metadata changes

  return {
    messages,
    isLoading,
    error,
    hasMore,
    loadMoreMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    updateMessageStatus,
    bulkUpdateMessagesFromSender,
    refresh: () => loadMessages(1, false)
  }
}
