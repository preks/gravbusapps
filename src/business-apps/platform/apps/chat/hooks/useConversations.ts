import { useState, useEffect, useCallback, useRef } from 'react'
import type { Conversation, Message, ConversationParticipant } from '../types'
import { ChatApiClient } from '../services/chatApiClient'
import { useUserManagementClient } from './useUserManagementClient'
import { useEmployeeAvatars } from './useEmployeeAvatars'

interface UseConversationsOptions {
  apiClient: ChatApiClient
  accessToken: string
  enabled?: boolean
}

export function useConversations({ apiClient, accessToken, enabled = true }: UseConversationsOptions) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const isLoadingRef = useRef(false)
  const LIMIT = 20

  // Use user management client to fetch real user data
  const { getUsersByIds } = useUserManagementClient(accessToken)
  const { fetchAvatarsWithEmployeeIds } = useEmployeeAvatars(accessToken)

  // Helper function to enrich conversations with real user data and avatars
  // Only enriches user data for placeholder users (who haven't logged in yet)
  // But fetches avatars for ALL participants
  const enrichConversations = useCallback(
    async (conversations: Conversation[]): Promise<Conversation[]> => {
      if (!conversations || conversations.length === 0) {
        return conversations
      }

      try {
        // Extract ALL participant user IDs for avatar fetching
        const allParticipantIds = new Set<string>()
        // Extract only placeholder user IDs for user data enrichment
        const placeholderUserIds = new Set<string>()

        conversations.forEach(conv => {
          conv.participants?.forEach(p => {
            if (p.user?.id) {
              allParticipantIds.add(p.user.id)
              // Check for placeholder email pattern
              if (p.user?.email?.includes('@placeholder.local')) {
                placeholderUserIds.add(p.user.id)
              }
            }
          })
        })

        // Fetch avatars and employeeIds for ALL participants (parallel request)
        const employeeInfoMapPromise = fetchAvatarsWithEmployeeIds(Array.from(allParticipantIds))

        // Fetch real user data only for placeholder users (parallel request)
        const userDataMapPromise =
          placeholderUserIds.size > 0 ? getUsersByIds(Array.from(placeholderUserIds)) : Promise.resolve(new Map())

        // Wait for both requests to complete
        const [employeeInfoMap, userDataMap] = await Promise.all([employeeInfoMapPromise, userDataMapPromise])

        // Enrich conversations with user data, avatars, and employeeIds
        const enrichedConversations = conversations.map(
          (conv: Conversation): Conversation => ({
            ...conv,
            participants: conv.participants?.map((p: ConversationParticipant) => {
              const employeeInfo = employeeInfoMap.get(p?.user?.id || '')

              // Enrich placeholder users with real data from user management
              if (p?.user?.email?.includes('@placeholder.local')) {
                const realUserData = userDataMap.get(p?.user?.id || '')
                if (realUserData && p?.user) {
                  return {
                    ...p,
                    user: {
                      ...p.user,
                      // Update UI-relevant fields from user management
                      firstName: realUserData.firstName,
                      lastName: realUserData.lastName,
                      email: realUserData.email,
                      username: realUserData.username,
                      // Add avatar and employeeId from Employee API
                      avatarUrl: employeeInfo?.avatarUrl || p.user.avatarUrl,
                      employeeId: employeeInfo?.employeeId || p.user.employeeId
                    }
                  }
                }
              }

              // For non-placeholder users, update avatar and employeeId
              if (employeeInfo && p?.user) {
                return {
                  ...p,
                  user: {
                    ...p.user,
                    avatarUrl: employeeInfo.avatarUrl || p.user.avatarUrl,
                    employeeId: employeeInfo.employeeId || p.user.employeeId
                  }
                }
              }

              return p
            })
          })
        )

        return enrichedConversations
      } catch {
        return conversations
      }
    },
    [getUsersByIds, fetchAvatarsWithEmployeeIds]
  )

  const loadConversations = useCallback(async () => {
    if (!enabled || isLoadingRef.current || !apiClient) return

    try {
      isLoadingRef.current = true
      setIsLoading(true)
      setError(null)
      setCurrentPage(1)

      const response = await apiClient.getConversations(1, LIMIT)
      // Handle both response structures: { data: [...] } or { conversations: [...] }
      const conversationsData = response.data || (response as any).conversations || []
      const total = response.total || 0

      // Check if there are more conversations to load
      setHasMore(conversationsData.length === LIMIT && conversationsData.length < total)

      // Enrich conversations with real user data from User Management Service
      const enrichedConversations = await enrichConversations(conversationsData)

      // Sort by most recent activity (lastMessage or updatedAt)
      const sortedConversations = enrichedConversations.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt
        const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

      setConversations(sortedConversations)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversations'))
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [apiClient, accessToken, enabled, enrichConversations, LIMIT])

  const loadMoreConversations = useCallback(async () => {
    if (!enabled || isLoadingMore || !hasMore || !apiClient) return

    try {
      setIsLoadingMore(true)
      const nextPage = currentPage + 1

      const response = await apiClient.getConversations(nextPage, LIMIT)
      const conversationsData = response.data || (response as any).conversations || []
      const total = response.total || 0

      // Check if there are more conversations to load
      setHasMore(conversationsData.length === LIMIT && conversations.length + conversationsData.length < total)

      // Enrich new conversations
      const enrichedConversations = await enrichConversations(conversationsData)

      // Append to existing conversations
      setConversations(prev => [...prev, ...enrichedConversations])
      setCurrentPage(nextPage)
    } catch {
      // Error loading more conversations
    } finally {
      setIsLoadingMore(false)
    }
  }, [apiClient, enabled, isLoadingMore, hasMore, currentPage, conversations.length, enrichConversations, LIMIT])

  const updateConversation = useCallback((conversationId: string, updates: Partial<Conversation>) => {
    setConversations(prev => {
      const updated = prev.map(conv => (conv.id === conversationId ? { ...conv, ...updates } : conv))
      // Re-sort if updatedAt changed
      if (updates.updatedAt || updates.lastMessage) {
        return updated.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt
          const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })
      }
      return updated
    })
  }, [])

  const addConversation = useCallback(
    async (conversation: Conversation): Promise<Conversation> => {
      // Enrich the new conversation with real user data
      const enriched = await enrichConversations([conversation])
      const enrichedConversation = enriched[0] || conversation

      setConversations(prev => {
        // Check if conversation already exists
        if (prev.some((c: Conversation) => c.id === conversation.id)) {
          return prev.map((c: Conversation) => (c.id === conversation.id ? enrichedConversation : c))
        }
        return [enrichedConversation, ...prev]
      })

      // Return enriched conversation so caller can use it
      return enrichedConversation
    },
    [enrichConversations]
  )

  const updateConversationLastMessage = useCallback(
    async (conversationId: string, message: Message) => {
      setConversations(prev => {
        // Check if conversation exists
        const convExists = prev.some(c => c.id === conversationId)

        if (!convExists) {
          // Trigger async fetch of the missing conversation
          // This happens when a message arrives for a conversation that's not in the paginated list
          if (apiClient) {
            apiClient
              .getConversationById(conversationId)
              .then(async conversation => {
                // Enrich before adding
                const enriched = await enrichConversations([conversation])
                const enrichedConv = enriched[0] || conversation

                // Add to top of list with the new message
                setConversations(currentConvs => {
                  const withNew = [{ ...enrichedConv, lastMessage: message, unreadCount: 1 }, ...currentConvs]
                  // Sort to ensure correct order
                  return withNew.sort((a, b) => {
                    const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt
                    const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt
                    return new Date(bTime).getTime() - new Date(aTime).getTime()
                  })
                })
              })
              .catch(() => {
                // Failed to fetch missing conversation
              })
          }

          return prev
        }

        // Update the conversation
        const updated = prev.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                lastMessage: message,
                updatedAt: new Date().toISOString()
              }
            : conv
        )

        // Re-sort by most recent activity (move updated conversation to top)
        const sorted = updated.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt
          const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })

        return sorted
      })
    },
    [apiClient, enrichConversations]
  )

  const markConversationAsRead = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(conv => (conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv)))
  }, [])

  const incrementUnreadCount = useCallback((conversationId: string) => {
    setConversations(prev => {
      const convExists = prev.some(c => c.id === conversationId)

      if (!convExists) {
        return prev
      }

      return prev.map(conv => {
        if (conv.id === conversationId) {
          const newCount = (conv.unreadCount || 0) + 1
          return { ...conv, unreadCount: newCount }
        }
        return conv
      })
    })
  }, [])

  const removeConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId))
  }, [])

  // Load conversations on mount
  useEffect(() => {
    if (enabled) {
      loadConversations()
    }
  }, [enabled])

  return {
    conversations,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadConversations,
    loadMoreConversations,
    updateConversation,
    addConversation,
    updateConversationLastMessage,
    markConversationAsRead,
    incrementUnreadCount,
    removeConversation,
    enrichConversations // Export for use in websocket handlers
  }
}
