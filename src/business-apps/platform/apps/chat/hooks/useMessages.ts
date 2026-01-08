import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import type { Message, PaginatedResponse, Conversation } from '../types'
import { ChatApiClient } from '../services/chatApiClient'
import { debugLog } from '../utils/debugLog'

interface UseMessagesOptions {
  apiClient: ChatApiClient
  conversationId: string | null
  currentUserId?: string | null
  conversation?: Conversation | null
  enabled?: boolean
}

export function useMessages({
  apiClient,
  conversationId,
  currentUserId,
  conversation,
  enabled = true
}: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const isLoadingMoreRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeConversationIdRef = useRef<string | null>(null)

  // Use ref for conversation to avoid triggering loadMessages when conversation metadata changes
  const conversationRef = useRef(conversation)
  useEffect(() => {
    conversationRef.current = conversation
  }, [conversation])

  const loadMessages = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!conversationId || !enabled) return

      // Check if apiClient is valid (not empty object)
      if (!apiClient || typeof apiClient.getMessages !== 'function') {
        console.warn('API client not ready, skipping message load')
        return
      }

      // Prevent concurrent loads for the SAME conversation
      // (but allow new conversation loads to proceed)
      if (isLoadingMoreRef.current && conversationId === activeConversationIdRef.current) {
        debugLog('[useMessages] Already loading messages for this conversation, skipping')
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
      const requestConversationId = conversationId

      try {
        isLoadingMoreRef.current = true
        setIsLoading(true)
        setError(null)

        const response: PaginatedResponse<Message> = await apiClient.getMessages(conversationId, pageNum, 50)

        // CRITICAL: Check if this response is still relevant
        // If conversation changed while request was in flight, discard the response
        if (abortController.signal.aborted || requestConversationId !== activeConversationIdRef.current) {
          debugLog('[useMessages] Discarding stale response for conversation:', requestConversationId)
          // Clear loading states for the aborted request
          if (requestConversationId !== activeConversationIdRef.current) {
            setIsLoading(false)
            isLoadingMoreRef.current = false
          }
          return
        }

        // Ensure response.data exists and is an array
        // Backend already returns messages in ascending order (oldest first, newest last)
        let loadedMessages = response.data && Array.isArray(response.data) ? response.data : []

        // Get OTHER participants' lastReadAt to determine if messages were read
        const otherParticipants = conversationRef.current?.participants?.filter(p => p.userId !== currentUserId) || []

        // Find the most recent lastReadAt from other participants
        const mostRecentOtherReadAt = otherParticipants.reduce(
          (latest, p) => {
            if (!p.lastReadAt) return latest
            const readAt = new Date(p.lastReadAt)
            return !latest || readAt > latest ? readAt : latest
          },
          null as Date | null
        )

        // Set correct status for loaded messages based on current user and context
        loadedMessages = loadedMessages.map(msg => {
          // If no currentUserId, keep original status or default to 'sent'
          if (!currentUserId) {
            return { ...msg, status: msg.status || 'sent' }
          }

          // If it's the current user's message
          if (msg.senderId === currentUserId) {
            // Check if any other participant read the message
            if (mostRecentOtherReadAt && new Date(msg.createdAt) <= mostRecentOtherReadAt) {
              return { ...msg, status: 'read' }
            }
            // Otherwise, show as sent (message sent but not yet confirmed read by anyone)
            return { ...msg, status: 'sent' }
          } else {
            // If it's someone else's message in the active conversation
            // Mark as read since we're viewing the conversation
            return { ...msg, status: 'read' }
          }
        })

        if (append) {
          // When loading older messages, prepend them (they're older than current messages)
          setMessages(prev => [...loadedMessages, ...prev])
        } else {
          // Initial load: messages are already in correct order (oldest first, newest last)
          setMessages(loadedMessages)
        }

        setHasMore(response.page < response.totalPages)
        setPage(response.page)
      } catch (err) {
        // Don't set error if request was aborted (expected behavior)
        if (err instanceof Error && err.name === 'AbortError') {
          debugLog('[useMessages] Request aborted for conversation:', requestConversationId)
          // Clear loading states when aborted
          setIsLoading(false)
          isLoadingMoreRef.current = false
          return
        }

        // Only set error if this is still the active conversation
        if (requestConversationId === activeConversationIdRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to load messages'))
          console.error('Error loading messages:', err)
        }
      } finally {
        // Always clear loading state in finally block
        // This ensures loading state is cleared even if conversation changed
        setIsLoading(false)
        isLoadingMoreRef.current = false
      }
    },
    [apiClient, conversationId, currentUserId, enabled] // Removed 'conversation' - using conversationRef instead
  )

  const loadMoreMessages = useCallback(() => {
    if (hasMore && !isLoading && !isLoadingMoreRef.current) {
      loadMessages(page + 1, true)
    }
  }, [hasMore, isLoading, page, loadMessages])

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      // Check if message already exists (by ID or by temp ID + content match)
      const existingIndex = prev.findIndex(m => {
        if (m.id === message.id) return true
        // Replace optimistic message (temp ID) with real message if content matches
        if (m.id.startsWith('temp-') && m.content === message.content && m.conversationId === message.conversationId) {
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

      return [...prev, message]
    })
  }, [])

  const updateMessage = useCallback((message: Message) => {
    setMessages(prev => prev.map(m => (m.id === message.id ? { ...m, ...message } : m)))
  }, [])

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }, [])

  const updateMessageStatus = useCallback((messageId: string, status: 'sent' | 'delivered' | 'read') => {
    // Make this synchronous (no startTransition) to ensure status updates happen immediately
    // Status updates are important for UX and should not be delayed
    setMessages(prev => {
      const newMessages = prev.map(m => (m.id === messageId ? { ...m, status } : m))
      return newMessages
    })
  }, [])

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
      // Load new messages
      loadMessages(1, false)
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
