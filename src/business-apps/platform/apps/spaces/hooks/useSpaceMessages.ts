/**
 * useSpaceMessages Hook
 *
 * Fetches recent messages from a linked group chat for display in the Space.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { useChatClient } from '@/common/network/chat/useChatClient'
import translations from '../_i18n'

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
  const { t } = useTranslation(translations)
  const chatClient = useChatClient(accessToken)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lastFetchRef = useRef<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !accessToken) {
      setMessages([])
      return
    }

    if (lastFetchRef.current === conversationId && messages.length > 0) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await chatClient.getMessages<{ data: any[] }>(conversationId, 1, limit)
      const rawMessages = response?.data || []

      const transformedMessages: ChatMessage[] = rawMessages
        .map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId || msg.sender?.id || msg.metadata?.userId,
          senderName: msg.sender?.displayName || msg.sender?.firstName || msg.senderName,
          senderAvatar: msg.sender?.avatarUrl,
          createdAt: msg.createdAt,
          type: msg.type || 'text'
        }))
        .slice(0, limit)

      setMessages(transformedMessages)
      lastFetchRef.current = conversationId
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error-load-messages')
      setError(message)
      console.error('[useSpaceMessages] Error:', err)
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, chatClient, conversationId, limit, messages.length, t])

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
