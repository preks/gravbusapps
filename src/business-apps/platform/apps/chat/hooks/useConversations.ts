import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { Conversation, Message, ConversationParticipant } from '../types'
import { ChatApiClient } from '../services/chatApiClient'
import { useUserManagementClient } from './useUserManagementClient'
import { useEmployeeAvatarsCache } from './useEmployeeAvatarsCache'

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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const LIMIT = 20

  // Use user management client to fetch real user data
  const { getUsersByIds } = useUserManagementClient(accessToken)
  const { requestAvatars, cacheVersion } = useEmployeeAvatarsCache(accessToken)

  // Helper function to enrich conversations with real user data and avatars
  // Only enriches user data for placeholder users (who haven't logged in yet)
  // Avatars are loaded non-blocking from cache or fetched in background
  const enrichConversations = useCallback(
    async (conversations: Conversation[], options: { skipUserDataFetch?: boolean } = {}): Promise<Conversation[]> => {
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
              // Check for placeholder email pattern (only if not skipping)
              if (!options.skipUserDataFetch && p.user?.email?.includes('@placeholder.local')) {
                placeholderUserIds.add(p.user.id)
              }
            }
          })
        })

        // Get avatars and employeeIds non-blocking (returns cached + triggers background fetch)
        const employeeInfoMap = requestAvatars(Array.from(allParticipantIds))

        // Fetch real user data only for placeholder users
        // Skip entirely if flag is set or no placeholder users found
        const userDataMap =
          !options.skipUserDataFetch && placeholderUserIds.size > 0
            ? await getUsersByIds(Array.from(placeholderUserIds))
            : new Map()

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
    [getUsersByIds, requestAvatars]
  )

  // Fast enrichment - only adds avatars (non-blocking), no user data fetch
  // Use this when conversation already has complete user data (e.g., from getConversationById)
  const enrichConversationsWithAvatarsOnly = useCallback(
    (conversations: Conversation[]): Conversation[] => {
      if (!conversations || conversations.length === 0) {
        return conversations
      }

      try {
        // Extract all participant user IDs
        const allParticipantIds = new Set<string>()
        conversations.forEach(conv => {
          conv.participants?.forEach(p => {
            if (p.user?.id) {
              allParticipantIds.add(p.user.id)
            }
          })
        })

        // Get avatars non-blocking (returns cached + triggers background fetch)
        const employeeInfoMap = requestAvatars(Array.from(allParticipantIds))

        // Enrich conversations with avatars and employeeIds (synchronous, from cache)
        return conversations.map(
          (conv: Conversation): Conversation => ({
            ...conv,
            participants: conv.participants?.map((p: ConversationParticipant) => {
              const employeeInfo = employeeInfoMap.get(p?.user?.id || '')
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
      } catch {
        return conversations
      }
    },
    [requestAvatars]
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

      // For initial load, use fast avatar-only enrichment (synchronous, no blocking)
      // The API returns full user data, so we don't need to fetch placeholder users
      // This prevents the "no conversation" flash while waiting for enrichment
      const enrichedConversations = !hasLoadedOnce
        ? enrichConversationsWithAvatarsOnly(conversationsData)
        : await enrichConversations(conversationsData)

      // Sort by most recent activity (lastMessage or updatedAt)
      const sortedConversations = enrichedConversations.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt
        const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

      // Set conversations and clear loading in same tick to prevent flash
      setConversations(sortedConversations)
      setHasLoadedOnce(true)
      setIsLoading(false)
      isLoadingRef.current = false
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversations'))
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
    async (conversation: Conversation, options: { fastEnrich?: boolean } = {}): Promise<Conversation> => {
      // Fast enrichment (avatars only, non-blocking) or full enrichment (with user data fetch)
      const enrichedConversation = options.fastEnrich
        ? enrichConversationsWithAvatarsOnly([conversation])[0] || conversation
        : (await enrichConversations([conversation]))[0] || conversation

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
    [enrichConversations, enrichConversationsWithAvatarsOnly]
  )

  const updateConversationLastMessage = useCallback(
    async (conversationId: string, message: Message) => {
      setConversations(prev => {
        // OPTIMIZATION: Find conversation index in single pass (faster than some() + map())
        let convIndex = -1
        for (let i = 0; i < prev.length; i++) {
          if (prev[i].id === conversationId) {
            convIndex = i
            break
          }
        }

        if (convIndex === -1) {
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

        // OPTIMIZATION: Instead of map() + sort(), manually reorder
        // If conversation is already at top (index 0), just update it - no sorting needed
        if (convIndex === 0) {
          const newArray = [...prev]
          newArray[0] = {
            ...prev[0],
            lastMessage: message,
            updatedAt: new Date().toISOString()
          }
          return newArray
        }

        // Otherwise, move conversation to top (it's the most recent now)
        const updatedConv = {
          ...prev[convIndex],
          lastMessage: message,
          updatedAt: new Date().toISOString()
        }

        // Create new array with updated conversation at top, preserving order of others
        const newArray = [updatedConv, ...prev.slice(0, convIndex), ...prev.slice(convIndex + 1)]
        return newArray
      })
    },
    [apiClient, enrichConversations]
  )

  const markConversationAsRead = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(conv => (conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv)))
  }, [])

  const incrementUnreadCount = useCallback((conversationId: string) => {
    setConversations(prev => {
      // OPTIMIZATION: Find and update in single pass (no some() + map())
      let convIndex = -1
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].id === conversationId) {
          convIndex = i
          break
        }
      }

      if (convIndex === -1) {
        return prev
      }

      // Update only the found conversation (avoids full array map)
      const newArray = [...prev]
      newArray[convIndex] = {
        ...prev[convIndex],
        unreadCount: (prev[convIndex].unreadCount || 0) + 1
      }
      return newArray
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

  // Re-enrich conversations when avatars are loaded from cache
  // Use fast enrichment to avoid re-fetching user data
  useEffect(() => {
    if (conversations.length > 0 && cacheVersion > 0) {
      // Use fast avatar-only enrichment to avoid slow user data fetch
      const enriched = enrichConversationsWithAvatarsOnly(conversations)
      setConversations(enriched)
    }
  }, [cacheVersion, enrichConversationsWithAvatarsOnly])

  // PERFORMANCE: Memoize return object to prevent cascade re-renders
  return useMemo(
    () => ({
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
      enrichConversations, // Export for use in websocket handlers (full enrichment with user data fetch)
      enrichConversationsWithAvatarsOnly // Export for fast enrichment (avatars only, no blocking)
    }),
    [
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
      enrichConversations,
      enrichConversationsWithAvatarsOnly
    ]
  )
}
