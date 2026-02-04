/**
 * useSpaceMessages Hook
 *
 * Fetches recent messages from a linked group chat for display in the Space.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { env } from '@/common/env/EnvUtils'

export interface ChatMessage {
  id: string
  content: string
  senderId: string
  senderName?: string
  senderAvatar?: string
  createdAt: string
  type?: 'text' | 'file' | 'system'
}

export interface UseSpaceMessagesResult {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Get the chat service API URL
 */
function getChatServiceApiUrl(): string {
  const chatServiceOverride = env('NEXT_PUBLIC_CHAT_SERVICE_URL')
  if (chatServiceOverride) {
    return chatServiceOverride
  }

  const chatApiUrl = env('NEXT_PUBLIC_CHAT_API')
  if (chatApiUrl && !chatApiUrl.includes('localhost')) {
    return chatApiUrl
  }

  let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : ''
  const currentPort = typeof window !== 'undefined' ? window.location.port : ''
  const isLocalPlatform = currentHost === 'localhost' && ['3000', '5173'].includes(currentPort)

  if (isLocalPlatform) {
    baseUrl = 'https://newwork-dev.newwork.com'
  }

  return `${baseUrl}/chat-service/api/v1`
}

/**
 * Hook to fetch recent messages from a conversation
 *
 * @param conversationId - The conversation to fetch messages from
 * @param accessToken - Access token for API authentication
 * @param limit - Maximum number of messages to fetch (default: 5)
 */
export function useSpaceMessages(
  conversationId: string | undefined,
  accessToken: string | undefined,
  limit: number = 5
): UseSpaceMessagesResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastFetchRef = useRef<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !accessToken) {
      setMessages([])
      return
    }

    // Avoid duplicate fetches for the same conversation
    if (lastFetchRef.current === conversationId && messages.length > 0) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const apiUrl = getChatServiceApiUrl()
      const response = await fetch(`${apiUrl}/messages/conversation/${conversationId}?page=1&limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`)
      }

      const data = await response.json()

      // Handle both response formats
      const rawMessages = Array.isArray(data) ? data : data.messages || data.data || []

      // Transform and reverse to show newest at bottom (or keep as-is for newest first)
      const transformedMessages: ChatMessage[] = rawMessages
        .map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId || msg.sender?.id,
          senderName: msg.sender?.displayName || msg.sender?.firstName || msg.senderName,
          senderAvatar: msg.sender?.avatarUrl,
          createdAt: msg.createdAt,
          type: msg.type || 'text'
        }))
        .slice(0, limit)

      setMessages(transformedMessages)
      lastFetchRef.current = conversationId
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch messages'
      setError(message)
      console.error('[useSpaceMessages] Error:', err)
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, accessToken, limit, messages.length])

  const refresh = useCallback(async () => {
    lastFetchRef.current = null
    await fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  return {
    messages,
    isLoading,
    error,
    refresh
  }
}

export default useSpaceMessages
