import React, { useState, useCallback, useEffect } from 'react'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useChatClient } from './hooks/useChatClient'
import { ConversationList } from './components/ConversationList'
import { ConversationHeader } from './components/ConversationHeader'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import type { Conversation, User } from './types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ChatProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Chat: React.FC<ChatProps> = ({ accessToken, prefixDataTestId = 'chat' }) => {
  const [showConversationList, setShowConversationList] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  const chatClient = useChatClient({
    accessToken,
    apiUrl: undefined,
    wsUrl: undefined
  })

  const {
    isConnected,
    currentUser,
    activeConversation,
    activeConversationId,
    error,
    conversations,
    conversationsLoading,
    conversationsLoadingMore,
    conversationsHasMore,
    messages,
    messagesLoading,
    hasMoreMessages,
    typingUsers,
    sendMessage,
    createDirectConversation,
    setActiveConversation,
    closeConversation,
    loadMoreMessages,
    loadMoreConversations,
    startTyping,
    stopTyping
  } = chatClient

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeConversationId) return

      try {
        await sendMessage(activeConversationId, content)
      } catch (err) {
        console.error('Error sending message:', err)
      }
    },
    [activeConversationId, sendMessage]
  )

  const handleCreateConversation = useCallback(
    async (user: User) => {
      try {
        await createDirectConversation(user.id)
        setShowConversationList(false)
      } catch (err) {
        console.error('Error creating conversation:', err)
      }
    },
    [createDirectConversation]
  )

  const handleConversationSelect = useCallback(
    (conversation: Conversation) => {
      setActiveConversation(conversation)
      setShowConversationList(false)
    },
    [setActiveConversation]
  )

  const handleBack = useCallback(() => {
    setShowConversationList(true)
    setActiveConversation(null)
  }, [setActiveConversation])

  const handleCloseConversation = useCallback(() => {
    // Close the active conversation view without removing it
    // The useEffect in useChatClient will handle leaving the WebSocket room
    setActiveConversation(null)
    // Navigate back to conversation list if on mobile
    if (isMobile) {
      setShowConversationList(true)
    }
  }, [setActiveConversation, isMobile])

  const handleRemoveConversation = useCallback(async () => {
    if (!activeConversation) return

    try {
      await closeConversation(activeConversation.id)
      // Navigate back to conversation list if on mobile
      if (isMobile) {
        setShowConversationList(true)
      }
    } catch (error) {
      console.error('Failed to remove conversation:', error)
    }
  }, [activeConversation, closeConversation, isMobile])

  // Mobile view detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (error) {
    return (
      <div
        className="gba:h-full gba:flex gba:items-center gba:justify-center gba:p-4"
        data-testid={`${prefixDataTestId}-error`}
      >
        <Alert variant="destructive">
          <AlertDescription>
            {error.message ||
              getTranslationFromI18nKeyAndLabel('chat.connectionError', 'Failed to connect to chat service')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show loading state initially
  if (!isConnected && conversationsLoading) {
    return (
      <div
        className="gba:h-full gba:flex gba:items-center gba:justify-center"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <div className="gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('chat.connecting', 'Connecting to chat...')}
        </div>
      </div>
    )
  }

  if (isMobile) {
    // Mobile: single view
    if (showConversationList || !activeConversation) {
      return (
        <div className="gba:h-full gba:flex gba:flex-col" data-testid={prefixDataTestId}>
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onConversationSelect={handleConversationSelect}
            onRemoveConversation={conversationId => closeConversation(conversationId)}
            onCreateConversation={handleCreateConversation}
            isLoading={conversationsLoading}
            isLoadingMore={conversationsLoadingMore}
            hasMore={conversationsHasMore}
            onLoadMore={loadMoreConversations}
            currentUserId={currentUser?.id || null}
            accessToken={accessToken}
          />
        </div>
      )
    }

    // Mobile: show active conversation
    return (
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={prefixDataTestId}>
        {activeConversation && (
          <>
            <ConversationHeader
              conversation={activeConversation}
              onBack={handleBack}
              onClose={handleCloseConversation}
              onRemove={handleRemoveConversation}
              showBackButton={true}
              currentUserId={currentUser?.id || null}
            />
            <MessageList
              messages={messages}
              currentUserId={currentUser?.id || null}
              isGroupChat={activeConversation.type === 'group'}
              typingUsers={Object.values(typingUsers).flat()}
              isLoading={messagesLoading}
              hasMore={hasMoreMessages}
              onLoadMore={loadMoreMessages}
              conversationId={activeConversation.id}
            />
            <MessageInput
              onSend={handleSendMessage}
              onTypingStart={() => {
                if (activeConversationId) {
                  startTyping(activeConversationId)
                }
              }}
              onTypingStop={() => {
                if (activeConversationId) {
                  stopTyping(activeConversationId)
                }
              }}
              disabled={!isConnected}
            />
          </>
        )}
      </div>
    )
  }

  // Desktop/sidebar: show both views side by side
  return (
    <div className="gba:h-full gba:flex gba:flex-row" data-testid={prefixDataTestId}>
      {/* Conversation List - Fixed width for sidebar */}
      <div className="gba:w-80 gba:flex-shrink-0 gba:border-r gba:flex gba:flex-col">
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onConversationSelect={handleConversationSelect}
          onRemoveConversation={conversationId => closeConversation(conversationId)}
          onCreateConversation={handleCreateConversation}
          isLoading={conversationsLoading}
          isLoadingMore={conversationsLoadingMore}
          hasMore={conversationsHasMore}
          onLoadMore={loadMoreConversations}
          currentUserId={currentUser?.id || null}
          accessToken={accessToken}
        />
      </div>

      {/* Active Conversation */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0">
        {activeConversation ? (
          <>
            <ConversationHeader
              conversation={activeConversation}
              onClose={handleCloseConversation}
              onRemove={handleRemoveConversation}
              showBackButton={false}
              currentUserId={currentUser?.id || null}
            />
            <MessageList
              messages={messages}
              currentUserId={currentUser?.id || null}
              isGroupChat={activeConversation.type === 'group'}
              typingUsers={Object.values(typingUsers).flat()}
              isLoading={messagesLoading}
              hasMore={hasMoreMessages}
              onLoadMore={loadMoreMessages}
              conversationId={activeConversation.id}
            />
            <MessageInput
              onSend={handleSendMessage}
              onTypingStart={() => {
                if (activeConversationId) {
                  startTyping(activeConversationId)
                }
              }}
              onTypingStop={() => {
                if (activeConversationId) {
                  stopTyping(activeConversationId)
                }
              }}
              disabled={!isConnected}
            />
          </>
        ) : (
          <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('chat.selectConversation', 'Select a conversation to start chatting')}
          </div>
        )}
      </div>
    </div>
  )
}
