/**
 * useLinkedGroupChat Hook
 *
 * Finds a group chat that was created for the same organizational dimension as a space.
 * This enables linking spaces to their team group chats.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useChatClient } from '@/common/network/chat/useChatClient'
import type { SpaceDimension, LinkedConversation } from '../types/space.types'

// Re-export for convenience
export type { LinkedConversation } from '../types/space.types'

export interface UseLinkedGroupChatResult {
  /** The linked conversation if found */
  conversation: LinkedConversation | null
  /** Whether the query is in progress */
  isLoading: boolean
  /** Error message if query failed */
  error: string | null
  /** Refresh the linked conversation query */
  refresh: () => Promise<void>
}

/**
 * Hook to find a linked group chat by dimension context
 *
 * @param dimension - The space dimension to search for (optional)
 * @param accessToken - Access token for API authentication
 * @returns LinkedConversation if found, or null
 */
export function useLinkedGroupChat(
  dimension: SpaceDimension | undefined,
  accessToken: string | undefined
): UseLinkedGroupChatResult {
  const chatClient = useChatClient(accessToken)
  const [conversation, setConversation] = useState<LinkedConversation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastQueryRef = useRef<string | null>(null)

  const fetchLinkedConversation = useCallback(async () => {
    if (!dimension || !accessToken) {
      setConversation(null)
      setIsLoading(false)
      return
    }

    const queryKey = `${dimension.type}:${dimension.id}`

    if (lastQueryRef.current === queryKey && conversation) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await chatClient.getConversations<{ data: LinkedConversation[] }>(1, 20, {
        filter: 'group',
        contextEntity: dimension.type,
        contextEntityId: dimension.id
      })

      const conversations = response?.data || []

      const linkedConv = conversations.find(
        (conv: LinkedConversation) =>
          conv.type === 'group' && conv.contextEntity === dimension.type && conv.contextEntityId === dimension.id
      )

      setConversation(linkedConv || null)
      lastQueryRef.current = queryKey
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find linked conversation'
      setError(message)
      console.error('[useLinkedGroupChat] Error:', err)
      setConversation(null)
    } finally {
      setIsLoading(false)
    }
  }, [dimension, accessToken, conversation, chatClient])

  const refresh = useCallback(async () => {
    lastQueryRef.current = null
    await fetchLinkedConversation()
  }, [fetchLinkedConversation])

  useEffect(() => {
    fetchLinkedConversation()
  }, [fetchLinkedConversation])

  return {
    conversation,
    isLoading,
    error,
    refresh
  }
}

export default useLinkedGroupChat
