/**
 * useLinkedGroupChat Hook
 *
 * Finds a group chat that was created for the same organizational dimension as a space.
 * This enables linking spaces to their team group chats.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { SpaceDimension, LinkedConversation } from '../types/space.types'
import { env } from '@/common/env/EnvUtils'

// Re-export for convenience
export type { LinkedConversation } from '../types/space.types'

/**
 * Get the chat service API URL
 */
function getChatServiceApiUrl(): string {
  // Check for explicit chat service URL override
  const chatServiceOverride = env('NEXT_PUBLIC_CHAT_SERVICE_URL')
  if (chatServiceOverride) {
    return chatServiceOverride
  }

  // Check for explicit API URL
  const chatApiUrl = env('NEXT_PUBLIC_CHAT_API')
  if (chatApiUrl && !chatApiUrl.includes('localhost')) {
    return chatApiUrl
  }

  // Build from base URL
  let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  // Handle local development platform
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : ''
  const currentPort = typeof window !== 'undefined' ? window.location.port : ''
  const isLocalPlatform = currentHost === 'localhost' && ['3000', '5173'].includes(currentPort)

  if (isLocalPlatform) {
    baseUrl = 'https://newwork-dev.newwork.com'
  }

  return `${baseUrl}/chat-service/api/v1`
}

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
  const [conversation, setConversation] = useState<LinkedConversation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track the last query to avoid duplicate requests
  const lastQueryRef = useRef<string | null>(null)

  const fetchLinkedConversation = useCallback(async () => {
    if (!dimension || !accessToken) {
      setConversation(null)
      setIsLoading(false)
      return
    }

    // Create a unique key for this query
    const queryKey = `${dimension.type}:${dimension.id}`

    // Skip if we already have results for this query
    if (lastQueryRef.current === queryKey && conversation) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = getChatServiceApiUrl()
      const params = new URLSearchParams({
        contextEntity: dimension.type,
        contextEntityId: dimension.id,
        type: 'group'
      })

      const response = await fetch(`${apiUrl}/conversations?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch linked conversation: ${response.statusText}`)
      }

      const data = await response.json()

      // Handle both response formats: { conversations: [...] } or array directly
      const conversations = Array.isArray(data) ? data : data.conversations || data.data || []

      // Find the first group conversation that matches
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
  }, [dimension, accessToken, conversation])

  // Refresh function that clears cache and refetches
  const refresh = useCallback(async () => {
    lastQueryRef.current = null
    await fetchLinkedConversation()
  }, [fetchLinkedConversation])

  // Fetch when dimension or token changes
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
