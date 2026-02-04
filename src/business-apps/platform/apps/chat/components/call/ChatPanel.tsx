/**
 * ChatPanel Component
 *
 * Chat interface for group calls - displays messages and input
 * Reuses existing MessageList and MessageInput components
 */

import React, { useEffect, useCallback } from 'react'
import { MessageList } from '../MessageList'
import { MessageInput } from '../MessageInput'
import { useMessages } from '../../hooks/useMessages'
import { useChatTranslation } from '../../contexts/TranslationContext'
import { useEveryAIChat } from '../../hooks/useEveryAIChat'
import type { ChatApiClient } from '../../services/chatApiClient'
import type { ChatWebSocketClient } from '../../services/chatWebSocketClient'
import type { Conversation, MessageEntityReference } from '../../types'
import type { ActiveExpert } from '../../hooks/useConversationExperts'
import { rtkDebug } from '../../utils/rtkDebug'

export interface ChatPanelProps {
  /** Current conversation */
  conversation: Conversation | null
  /** Chat API client */
  apiClient: ChatApiClient
  /** WebSocket client for real-time updates */
  wsClient: ChatWebSocketClient | null
  /** Current user ID */
  currentUserId: string | null
  /** Current user object for AI context */
  currentUser?: {
    id?: string
    displayName?: string
    firstName?: string
    lastName?: string
    username?: string
    email?: string
    employeeId?: string
  } | null
  /** Access token for API calls */
  accessToken: string
  /** Every AI experts for mentions */
  activeExperts?: ActiveExpert[]
  /** Whether panel is open */
  isOpen: boolean
  /** Callback to close panel */
  onClose?: () => void
  /** Data test ID prefix */
  prefixDataTestId?: string
}

const ChatPanelComponent: React.FC<ChatPanelProps> = ({
  conversation,
  apiClient,
  wsClient,
  currentUserId,
  currentUser,
  accessToken,
  activeExperts,
  isOpen,
  prefixDataTestId = 'group-call-chat'
}) => {
  const t = useChatTranslation()

  // Use the messages hook to handle message loading
  const { messages, isLoading, error, hasMore, loadMore, addMessage } = useMessages({
    apiClient,
    conversationId: conversation?.id || null,
    currentUserId,
    conversation,
    enabled: isOpen && !!conversation
  })

  // Every AI integration
  const {
    hasEveryMention,
    processMessage: processEveryAIMessage,
    clearStreamingText
  } = useEveryAIChat({
    accessToken
  })

  // Handle incoming WebSocket messages when panel is open
  useEffect(() => {
    if (!conversation || !wsClient || !isOpen) return

    const handleNewMessage = (message: any) => {
      if (message.conversationId === conversation.id) {
        addMessage(message)
      }
    }

    // Subscribe to WebSocket events
    wsClient.on('new_message', handleNewMessage)

    return () => {
      wsClient.off('new_message', handleNewMessage)
    }
  }, [conversation?.id, addMessage, wsClient, isOpen])

  // Handle sending messages
  const handleSendMessage = useCallback(
    async (content: string, entityReferences?: MessageEntityReference[], attachments?: any[]) => {
      if (!conversation?.id || !content.trim() || !currentUserId) {
        console.warn('[ChatPanel] Cannot send message:', {
          hasConversation: !!conversation?.id,
          hasContent: !!content.trim(),
          hasCurrentUserId: !!currentUserId
        })
        return
      }

      try {
        // Build metadata with entity references and attachments
        const metadata: Record<string, any> = {}
        if (entityReferences && entityReferences.length > 0) {
          metadata.entityReferences = entityReferences
        }
        if (attachments && attachments.length > 0) {
          metadata.attachments = attachments
        }

        rtkDebug.log('[ChatPanel] Sending message:', {
          conversationId: conversation.id,
          contentLength: content.trim().length,
          senderId: currentUserId,
          hasMetadata: Object.keys(metadata).length > 0,
          viaWebSocket: !!wsClient
        })

        // Send via WebSocket for real-time delivery (preferred)
        if (wsClient) {
          wsClient.sendMessage(
            conversation.id,
            content.trim(),
            currentUserId,
            undefined, // parentId
            Object.keys(metadata).length > 0 ? metadata : undefined
          )
        } else {
          // Fallback to REST API if WebSocket not available
          await apiClient.sendMessage(
            conversation.id,
            content.trim(),
            currentUserId,
            undefined, // parentId
            Object.keys(metadata).length > 0 ? metadata : undefined
          )
        }

        // Check for @Every AI mention
        if (hasEveryMention(entityReferences)) {
          rtkDebug.log('[ChatPanel] @Every mention detected, processing AI request')

          // Build conversation context
          const participants = conversation.participants
            ?.filter(p => p.userId || p.user)
            .map(p => {
              const user = p.user
              const name = user
                ? user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || ''
                : ''
              return {
                id: p.userId || user?.id || '',
                odId: p.userId || user?.id || '',
                name,
                email: user?.email || '',
                employeeId: user?.employeeId
              }
            })
            .filter(p => p.name)

          const currentUserName = currentUser
            ? currentUser.displayName ||
              `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
              currentUser.username ||
              ''
            : ''

          // Find existing AI session ID from previous AI messages
          const existingSessionId = messages
            .filter(m => m.metadata?.isAIResponse && m.metadata?.everyAiSessionId)
            .map(m => m.metadata?.everyAiSessionId as string)
            .pop()

          const conversationContext = {
            conversationId: conversation.id,
            conversationName: conversation.name,
            participants,
            existingSessionId,
            currentUserId,
            currentUserName,
            lastScheduledMeeting: undefined,
            mentionedUsers: []
          }

          // Process with Every AI
          const aiResponse = await processEveryAIMessage(
            content,
            entityReferences,
            conversationContext,
            attachments?.map(a => a.file) || []
          )

          if (aiResponse && aiResponse.text && !aiResponse.error) {
            const responseText = aiResponse.text.trim()

            if (responseText) {
              // Small delay to let the first message settle
              await new Promise(resolve => setTimeout(resolve, 100))

              // Build AI response metadata
              const aiMetadata: Record<string, any> = {
                isAIResponse: true,
                aiAssistant: 'Every',
                originalQuestion: content,
                everyAiSessionId: aiResponse.sessionId,
                initiatedBy: currentUserId
              }

              if (aiResponse.scheduledMeeting) {
                aiMetadata.scheduledMeeting = aiResponse.scheduledMeeting
              }

              if (aiResponse.outputs && aiResponse.outputs.length > 0) {
                aiMetadata.outputs = aiResponse.outputs
              }

              // Send AI response via WebSocket or REST
              if (wsClient) {
                wsClient.sendMessage(conversation.id, responseText, currentUserId, undefined, aiMetadata)
              } else {
                await apiClient.sendMessage(conversation.id, responseText, currentUserId, undefined, aiMetadata)
              }

              clearStreamingText()
            }
          }
        }
      } catch (err) {
        console.error('[ChatPanel] Failed to send message:', err)
        // TODO: Show error toast
      }
    },
    [
      conversation,
      currentUserId,
      currentUser,
      apiClient,
      wsClient,
      hasEveryMention,
      processEveryAIMessage,
      clearStreamingText,
      messages
    ]
  )

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (conversation?.id && wsClient) {
      wsClient.sendTypingStart(conversation.id)
    }
  }, [conversation?.id, wsClient])

  const handleTypingStop = useCallback(() => {
    if (conversation?.id && wsClient) {
      wsClient.sendTypingStop(conversation.id)
    }
  }, [conversation?.id, wsClient])

  if (!conversation) {
    return (
      <div
        className="gba:flex gba:flex-col gba:h-full gba:items-center gba:justify-center gba:p-8"
        data-testid={`${prefixDataTestId}-empty`}
      >
        <div className="gba:text-center">
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
          <p className="gba:text-sm gba:text-muted-foreground">{t('chat-no-conversation')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:h-full gba:items-center gba:justify-center gba:p-8"
        data-testid={`${prefixDataTestId}-error`}
      >
        <div className="gba:text-center">
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
          <p className="gba:text-sm gba:text-destructive gba:font-medium gba:mb-2">{t('chat-error-loading')}</p>
          <p className="gba:text-xs gba:text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid={prefixDataTestId}>
      {/* Header - Call-specific design with live indicator */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2.5 gba:border-b gba:bg-gradient-to-r gba:from-primary/5 gba:to-transparent gba:backdrop-blur-sm gba:flex-shrink-0">
        <div className="gba:flex gba:items-center gba:gap-2">
          {/* Live indicator */}
          <div className="gba:h-2 gba:w-2 gba:rounded-full gba:bg-success gba:animate-pulse" />
          <h3 className="gba:font-semibold gba:text-sm">{t('groupCall-chat') || 'Chat'}</h3>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        conversationType={conversation.type}
        conversationId={conversation.id}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        accessToken={accessToken}
        participants={conversation.participants}
        compact={true}
      />

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        accessToken={accessToken}
        activeExperts={activeExperts}
        compact={true}
        t={t}
      />
    </div>
  )
}

// Memoize to prevent remounting when parent re-renders
export const ChatPanel = React.memo(ChatPanelComponent, (prev, next) => {
  // Only re-render if these essential props change
  const conversationSame = prev.conversation?.id === next.conversation?.id
  const isOpenSame = prev.isOpen === next.isOpen
  const userIdSame = prev.currentUserId === next.currentUserId
  const accessTokenSame = prev.accessToken === next.accessToken

  // Skip re-render if essential props haven't changed
  const shouldSkipRender = conversationSame && isOpenSame && userIdSame && accessTokenSame

  if (!shouldSkipRender) {
    console.debug('[ChatPanel] Re-rendering:', {
      conversationSame,
      isOpenSame,
      userIdSame,
      accessTokenSame,
      prevConvId: prev.conversation?.id,
      nextConvId: next.conversation?.id
    })
  }

  return shouldSkipRender
})
