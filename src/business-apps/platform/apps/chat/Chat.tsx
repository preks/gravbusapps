import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useChatClient } from './hooks/useChatClient'
import { ConversationList } from './components/ConversationList'
import { ConversationHeader } from './components/ConversationHeader'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import { CreateGroupModal } from './components/CreateGroupModal'
import { GroupSettingsModal } from './components/GroupSettingsModal'
import type { Conversation, User } from './types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { env } from '@/common/env/EnvUtils'

interface ChatProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Chat: React.FC<ChatProps> = ({ accessToken, prefixDataTestId = 'chat' }) => {
  const [showConversationList, setShowConversationList] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false)
  const urlContextProcessed = useRef(false)

  let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  const apiUrl = env('NEXT_PUBLIC_CHAT_API') || `${baseUrl}/chat-service/api/v1` || ''
  const wsUrl = env('NEXT_PUBLIC_CHAT_WEB_SOCKET') || `${baseUrl}/chat-service` || ''
  const wsSocketPath = env('NEXT_PUBLIC_CHAT_WEB_SOCKET') ? undefined : '/chat-service/socket.io'

  const chatClient = useChatClient({
    accessToken,
    apiUrl,
    wsUrl,
    wsSocketPath
  })

  const {
    isConnected,
    isOffline,
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
    createContextConversation,
    createAiAgentConversation,
    createGroupConversation,
    setActiveConversation,
    closeConversation,
    loadMoreMessages,
    loadMoreConversations,
    refreshConversations,
    startTyping,
    stopTyping,
    apiClient
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

  const handleCreateGroup = useCallback(() => {
    setShowCreateGroupModal(true)
  }, [])

  const handleCreateGroupSubmit = useCallback(
    async (name: string, participantIds: string[], description?: string) => {
      try {
        await createGroupConversation(name, participantIds, description)
        setShowCreateGroupModal(false)
      } catch (error) {
        console.error('Failed to create group:', error)
        throw error
      }
    },
    [createGroupConversation]
  )

  const handleShowGroupSettings = useCallback(() => {
    setShowGroupSettingsModal(true)
  }, [])

  const handleCloseGroupSettings = useCallback(() => {
    setShowGroupSettingsModal(false)
    // Refresh conversations to get updated participant data
    if (refreshConversations) {
      refreshConversations()
    }
  }, [refreshConversations])

  // Mobile view detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle URL parameters for context and AI agent conversations (only once)
  useEffect(() => {
    // Only process URL params once when user is connected
    if (urlContextProcessed.current || !currentUser || !isConnected) {
      return
    }

    const urlParams = new URLSearchParams(window.location.search)
    const contextParam = urlParams.get('context') // Format: "entityType:entityId"
    const usersParam = urlParams.get('users') // Optional: comma-separated user IDs
    const aiAgentParam = urlParams.get('aiAgent') // "true" to open AI agent conversation
    const typeParam = urlParams.get('type') // "ai-agent" to open AI agent conversation

    // Handle AI agent conversation
    if ((aiAgentParam === 'true' || typeParam === 'ai-agent') && createAiAgentConversation) {
      // Mark as processed immediately to prevent duplicate calls
      urlContextProcessed.current = true

      // Parse context if provided for AI agent
      let contextEntity: string | undefined
      let contextEntityId: string | undefined
      if (contextParam) {
        const [entity, entityId] = contextParam.split(':')
        if (entity && entityId) {
          contextEntity = entity
          contextEntityId = entityId
        }
      }

      createAiAgentConversation(contextEntity, contextEntityId)
        .then(() => {
          // Hide conversation list on mobile after opening AI chat
          if (isMobile) {
            setShowConversationList(false)
          }
        })
        .catch(err => {
          console.error('Error opening AI agent conversation from URL:', err)
        })
    }
    // Handle context conversation
    else if (contextParam && createContextConversation) {
      const [contextEntity, contextEntityId] = contextParam.split(':')

      if (contextEntity && contextEntityId) {
        // Mark as processed immediately to prevent duplicate calls
        urlContextProcessed.current = true

        // Parse users if provided
        const users = usersParam ? usersParam.split(',').filter(Boolean) : undefined

        // Auto-open context conversation
        createContextConversation(
          contextEntity,
          contextEntityId,
          undefined, // Let backend generate default name
          users
        )
          .then(() => {
            // Hide conversation list on mobile after opening context chat
            if (isMobile) {
              setShowConversationList(false)
            }
          })
          .catch(err => {
            console.error('Error opening context conversation from URL:', err)
          })
      }
    }
  }, [currentUser, isConnected, createContextConversation, createAiAgentConversation, isMobile])

  if (error) {
    const getErrorMessage = () => {
      // Use the error name as the i18n key
      const errorKey = error.name || 'chat.connectionError'

      const errorMessages: Record<string, string> = {
        'chat.serviceUnavailable': getTranslationFromI18nKeyAndLabel(
          'chat.serviceUnavailable',
          'The chat service is currently unavailable. Please try again later.'
        ),
        'chat.serviceNotFound': getTranslationFromI18nKeyAndLabel(
          'chat.serviceNotFound',
          'The chat service could not be found. Please contact your administrator.'
        ),
        'chat.authenticationFailed': getTranslationFromI18nKeyAndLabel(
          'chat.authenticationFailed',
          'Authentication failed. Please log in again.'
        ),
        'chat.connectionError': getTranslationFromI18nKeyAndLabel(
          'chat.connectionError',
          'Failed to connect to the chat service. Please check your internet connection.'
        )
      }

      return errorMessages[errorKey] || errorMessages['chat.connectionError']
    }

    return (
      <div
        className="gba:h-full gba:flex gba:items-center gba:justify-center gba:p-4"
        data-testid={`${prefixDataTestId}-error`}
      >
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage()}</AlertDescription>
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
          {isOffline && (
            <Alert className="gba:m-4 gba:mb-0 gba:bg-warning gba:text-warning-foreground gba:border-warning">
              <AlertDescription>
                {getTranslationFromI18nKeyAndLabel('chat.offline', 'Chat service is offline. Reconnecting...')}
              </AlertDescription>
            </Alert>
          )}
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onConversationSelect={handleConversationSelect}
            onRemoveConversation={conversationId => closeConversation(conversationId)}
            onCreateConversation={handleCreateConversation}
            onCreateGroup={handleCreateGroup}
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
            {isOffline && (
              <Alert className="gba:m-4 gba:mb-0 gba:bg-warning gba:text-warning-foreground gba:border-warning">
                <AlertDescription>
                  {getTranslationFromI18nKeyAndLabel('chat.offline', 'Chat service is offline. Reconnecting...')}
                </AlertDescription>
              </Alert>
            )}
            <ConversationHeader
              conversation={activeConversation}
              onBack={handleBack}
              onClose={handleCloseConversation}
              onRemove={handleRemoveConversation}
              onGroupSettings={handleShowGroupSettings}
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
    <div className="gba:h-full gba:flex gba:flex-col" data-testid={prefixDataTestId}>
      {isOffline && (
        <Alert className="gba:m-4 gba:mb-0 gba:bg-warning gba:text-warning-foreground gba:border-warning">
          <AlertDescription>
            {getTranslationFromI18nKeyAndLabel('chat.offline', 'Chat service is offline. Reconnecting...')}
          </AlertDescription>
        </Alert>
      )}
      <div className="gba:flex-1 gba:flex gba:flex-row gba:overflow-hidden">
        {/* Conversation List - Fixed width for sidebar */}
        <div className="gba:w-80 gba:flex-shrink-0 gba:border-r gba:flex gba:flex-col">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onConversationSelect={handleConversationSelect}
            onRemoveConversation={conversationId => closeConversation(conversationId)}
            onCreateConversation={handleCreateConversation}
            onCreateGroup={handleCreateGroup}
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
                onGroupSettings={handleShowGroupSettings}
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

      {/* Group Chat Modals */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreateGroup={handleCreateGroupSubmit}
        apiClient={apiClient}
        currentUserId={currentUser?.id || null}
        prefixDataTestId={`${prefixDataTestId}-create-group-modal`}
      />
      <GroupSettingsModal
        isOpen={showGroupSettingsModal}
        onClose={handleCloseGroupSettings}
        conversation={activeConversation}
        currentUserId={currentUser?.id || null}
        apiClient={apiClient}
        onRefresh={refreshConversations}
        prefixDataTestId={`${prefixDataTestId}-group-settings-modal`}
      />
    </div>
  )
}
