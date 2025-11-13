import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import type { Message, PaginatedResponse, Conversation } from '../types'
import { ChatApiClient } from '../services/chatApiClient'

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

  const loadMessages = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (!conversationId || !enabled || isLoadingMoreRef.current) return

      // Check if apiClient is valid (not empty object)
      if (!apiClient || typeof apiClient.getMessages !== 'function') {
        console.warn('API client not ready, skipping message load')
        return
      }

      try {
        isLoadingMoreRef.current = true
        setIsLoading(true)
        setError(null)

        const response: PaginatedResponse<Message> = await apiClient.getMessages(conversationId, pageNum, 50)

        // Ensure response.data exists and is an array
        // Backend already returns messages in ascending order (oldest first, newest last)
        let loadedMessages = response.data && Array.isArray(response.data) ? response.data : []

        // Get OTHER participants' lastReadAt to determine if messages were read
        const otherParticipants = conversation?.participants?.filter(p => p.userId !== currentUserId) || []

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
        setError(err instanceof Error ? err : new Error('Failed to load messages'))
        console.error('Error loading messages:', err)
      } finally {
        setIsLoading(false)
        isLoadingMoreRef.current = false
      }
    },
    [apiClient, conversationId, currentUserId, conversation, enabled]
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
        // Replace existing message (especially optimistic ones)
        const updated = [...prev]
        updated[existingIndex] = message
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
    // Use startTransition for status updates as they're not urgent for the UI
    startTransition(() => {
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, status } : m)))
    })
  }, [])

  const bulkUpdateMessagesFromSender = useCallback((senderId: string, status: 'sent' | 'delivered' | 'read') => {
    // Use startTransition for bulk status updates as they're not urgent for the UI
    startTransition(() => {
      setMessages(prev => prev.map(m => (m.senderId === senderId ? { ...m, status } : m)))
    })
  }, [])

  // Load messages when conversation changes or API client becomes available
  useEffect(() => {
    if (conversationId && enabled && apiClient && typeof apiClient.getMessages === 'function') {
      // Don't clear messages immediately - let new messages replace them
      // This prevents flicker when switching conversations
      startTransition(() => {
        setPage(1)
        setHasMore(true)
      })
      // Load new messages which will replace old ones once loaded
      loadMessages(1, false)
    }
  }, [conversationId, enabled, apiClient, conversation, loadMessages])

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
