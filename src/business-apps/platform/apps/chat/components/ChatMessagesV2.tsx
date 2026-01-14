import React, { useEffect } from 'react'
import { MessageListV2 } from './MessageListV2'
import { useMessagesV2 } from '../hooks/useMessagesV2'
import type { ChatApiClient } from '../services/chatApiClient'
import type { Conversation } from '../types'

interface ChatMessagesV2Props {
  conversation: Conversation | null
  apiClient: ChatApiClient
  currentUserId: string | null
  accessToken: string
}

/**
 * Example component showing how to use the simplified V2 message components
 *
 * This demonstrates:
 * - How to integrate useMessagesV2 hook
 * - How to render MessageListV2
 * - How to handle WebSocket updates (simplified)
 * - Clean separation of concerns
 *
 * Usage in your main Chat component:
 * ```tsx
 * <ChatMessagesV2
 *   conversation={selectedConversation}
 *   apiClient={chatApiClient}
 *   currentUserId={currentUser?.id}
 *   accessToken={context.accessToken}
 * />
 * ```
 */
export const ChatMessagesV2: React.FC<ChatMessagesV2Props> = ({ conversation, apiClient, currentUserId }) => {
  // Use the simplified messages hook
  const { messages, isLoading, error, hasMore, loadMore, addMessage } = useMessagesV2({
    apiClient,
    conversationId: conversation?.id || null,
    currentUserId,
    enabled: !!conversation
  })

  /**
   * Handle incoming WebSocket messages
   *
   * In your actual implementation, you would connect this to your
   * WebSocket client and call addMessage() when new messages arrive:
   *
   * ```tsx
   * useEffect(() => {
   *   if (!conversation) return
   *
   *   const handleNewMessage = (message: Message) => {
   *     if (message.conversationId === conversation.id) {
   *       addMessage(message)
   *     }
   *   }
   *
   *   // Subscribe to WebSocket events
   *   wsClient.on('new_message', handleNewMessage)
   *
   *   return () => {
   *     wsClient.off('new_message', handleNewMessage)
   *   }
   * }, [conversation?.id, addMessage, wsClient])
   * ```
   */
  useEffect(() => {
    // TODO: Connect to WebSocket and handle real-time messages
    // For now, this is just a placeholder to show the pattern
  }, [conversation?.id, addMessage])

  if (!conversation) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
        <div className="gba:text-center gba:p-8">
          <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mb-4 gba:mx-auto">
            <svg
              className="gba:w-8 gba:h-8 gba:text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground">Select a conversation to start chatting</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
        <div className="gba:text-center gba:p-8">
          <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-destructive-secondary gba:flex gba:items-center gba:justify-center gba:mb-4 gba:mx-auto">
            <svg className="gba:w-8 gba:h-8 gba:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="gba:text-sm gba:text-destructive gba:font-medium gba:mb-2">Failed to load messages</p>
          <p className="gba:text-xs gba:text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <MessageListV2
      messages={messages}
      currentUserId={currentUserId}
      conversationType={conversation.type}
      conversationId={conversation.id}
      isLoading={isLoading}
      hasMore={hasMore}
      onLoadMore={loadMore}
    />
  )
}
