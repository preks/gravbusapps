import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useChatClient } from './hooks/useChatClient'
import { ConversationList } from './components/ConversationList'
import { ConversationHeader } from './components/ConversationHeader'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import { CreateGroupModal } from './components/CreateGroupModal'
import { GroupSettingsModal } from './components/GroupSettingsModal'
import type { Conversation, User, MessageEntityReference } from './types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { env } from '@/common/env/EnvUtils'

type ViewMode = 'full' | 'compact' | 'mobile'

interface ChatProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Chat: React.FC<ChatProps> = ({ accessToken, prefixDataTestId = 'chat' }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showConversationList, setShowConversationList] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('full')
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false)
  const urlContextProcessed = useRef(false)
  const conversationIdFromUrlProcessed = useRef(false)

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
    getUserPresence,
    updatePresenceFromUser,
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

  // Initialize presence status from conversation participants' user data
  useEffect(() => {
    if (!conversations || conversations.length === 0 || !updatePresenceFromUser) return

    // Extract all users from conversations and update their presence
    conversations.forEach(conv => {
      conv.participants?.forEach(p => {
        if (p.user && p.userId !== currentUser?.id && p.user.id !== currentUser?.id) {
          // The API returns isOnline (boolean) and lastSeen on user object
          const lastSeen = p.user.lastSeen || p.user.lastSeenAt

          // If we have isOnline directly from API, use it
          if (typeof p.user.isOnline === 'boolean') {
            updatePresenceFromUser(p.user.id, lastSeen, p.user.isOnline)
          } else {
            // Fallback to calculating from lastSeen/lastSeenAt
            updatePresenceFromUser(p.user.id, lastSeen, p.user.isActive)
          }
        }
      })
    })
  }, [conversations, currentUser?.id, updatePresenceFromUser])

  const handleSendMessage = useCallback(
    async (content: string, entityReferences?: MessageEntityReference[], attachments?: any[]) => {
      if (!activeConversationId) return

      try {
        // Build metadata with entity references and attachments if present
        const metadata: Record<string, any> = {}
        if (entityReferences?.length) {
          metadata.entityReferences = entityReferences
        }

        // Upload attachments to backend and get URLs
        if (attachments?.length && apiClient) {
          try {
            const files = attachments.map(a => a.file)
            const uploadedFiles = await apiClient.uploadFiles(activeConversationId, files)
            metadata.attachments = uploadedFiles
          } catch (uploadErr) {
            console.error('Error uploading attachments:', uploadErr)
            // Continue sending message without attachments if upload fails
          }
        }

        await sendMessage(activeConversationId, content, Object.keys(metadata).length > 0 ? metadata : undefined)
      } catch (err) {
        console.error('Error sending message:', err)
      }
    },
    [activeConversationId, sendMessage, apiClient]
  )

  const handleCreateConversation = useCallback(
    async (user: User) => {
      try {
        // Mark as processed to prevent URL restoration effect from re-triggering
        conversationIdFromUrlProcessed.current = true

        const conversation = await createDirectConversation(user.id)
        setShowConversationList(false)

        // Persist conversation ID in URL for panel reopen persistence
        if (conversation?.id) {
          const url = new URL(window.location.href)
          url.searchParams.set('conversationId', conversation.id)
          window.history.replaceState({}, '', url.toString())
        }
      } catch (err) {
        console.error('Error creating conversation:', err)
      }
    },
    [createDirectConversation]
  )

  const handleConversationSelect = useCallback(
    (conversation: Conversation) => {
      // Mark as processed to prevent URL restoration effect from re-triggering
      conversationIdFromUrlProcessed.current = true

      setActiveConversation(conversation)
      setShowConversationList(false)

      // Persist conversation ID in URL for panel reopen persistence
      const url = new URL(window.location.href)
      url.searchParams.set('conversationId', conversation.id)
      window.history.replaceState({}, '', url.toString())
    },
    [setActiveConversation]
  )

  const handleBack = useCallback(() => {
    setShowConversationList(true)
    setActiveConversation(null)

    // Clear conversation ID from URL when going back to list
    const url = new URL(window.location.href)
    url.searchParams.delete('conversationId')
    window.history.replaceState({}, '', url.toString())
  }, [setActiveConversation])

  const handleCloseConversation = useCallback(() => {
    // Close the active conversation view without removing it
    // The useEffect in useChatClient will handle leaving the WebSocket room
    setActiveConversation(null)
    // Navigate back to conversation list if in compact/mobile mode
    if (viewMode !== 'full') {
      setShowConversationList(true)
    }

    // Clear conversation ID from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('conversationId')
    window.history.replaceState({}, '', url.toString())
  }, [setActiveConversation, viewMode])

  const handleRemoveConversation = useCallback(async () => {
    if (!activeConversation) return

    try {
      await closeConversation(activeConversation.id)
      // Navigate back to conversation list if in compact/mobile mode
      if (viewMode !== 'full') {
        setShowConversationList(true)
      }

      // Clear conversation ID from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('conversationId')
      window.history.replaceState({}, '', url.toString())
    } catch (error) {
      console.error('Failed to remove conversation:', error)
    }
  }, [activeConversation, closeConversation, viewMode])

  const handleCreateGroup = useCallback(() => {
    setShowCreateGroupModal(true)
  }, [])

  const handleCreateGroupSubmit = useCallback(
    async (name: string, participantIds: string[], description?: string) => {
      try {
        // Mark as processed to prevent URL restoration effect from re-triggering
        conversationIdFromUrlProcessed.current = true

        const conversation = await createGroupConversation(name, participantIds, description)
        setShowCreateGroupModal(false)

        // Persist conversation ID in URL for panel reopen persistence
        if (conversation?.id) {
          const url = new URL(window.location.href)
          url.searchParams.set('conversationId', conversation.id)
          window.history.replaceState({}, '', url.toString())
        }
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

  // Container-aware responsive view detection
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const checkViewMode = () => {
      const containerWidth = container.offsetWidth
      // Mobile: very narrow (< 480px) - single view only
      // Compact: sidepanel mode (480-700px) - collapsible list, single view when chatting
      // Full: wide enough for side-by-side (> 700px)
      if (containerWidth < 480) {
        setViewMode('mobile')
      } else if (containerWidth < 700) {
        setViewMode('compact')
      } else {
        setViewMode('full')
      }
    }

    // Initial check
    checkViewMode()

    // Use ResizeObserver for container-aware responsiveness
    const resizeObserver = new ResizeObserver(checkViewMode)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [])

  // Restore active conversation from URL parameter (for panel reopen persistence)
  useEffect(() => {
    // Only process once when conversations are loaded, and only if no conversation is already active
    if (conversationIdFromUrlProcessed.current || !conversations.length || activeConversationId) {
      return
    }

    const urlParams = new URLSearchParams(window.location.search)
    const conversationIdParam = urlParams.get('conversationId')

    if (conversationIdParam) {
      // Find the conversation in the loaded list
      const conversation = conversations.find(c => c.id === conversationIdParam)
      if (conversation) {
        conversationIdFromUrlProcessed.current = true
        setActiveConversation(conversation)
        setShowConversationList(false)
      }
    }
  }, [conversations, setActiveConversation, activeConversationId])

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
      conversationIdFromUrlProcessed.current = true

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
        .then(conversation => {
          // Hide conversation list in compact/mobile modes after opening AI chat
          if (viewMode !== 'full') {
            setShowConversationList(false)
          }

          // Persist conversation ID in URL for panel reopen persistence
          if (conversation?.id) {
            const url = new URL(window.location.href)
            url.searchParams.set('conversationId', conversation.id)
            window.history.replaceState({}, '', url.toString())
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
        conversationIdFromUrlProcessed.current = true

        // Parse users if provided
        const users = usersParam ? usersParam.split(',').filter(Boolean) : undefined

        // Auto-open context conversation
        createContextConversation(
          contextEntity,
          contextEntityId,
          undefined, // Let backend generate default name
          users
        )
          .then(conversation => {
            // Hide conversation list in compact/mobile modes after opening context chat
            if (viewMode !== 'full') {
              setShowConversationList(false)
            }

            // Persist conversation ID in URL for panel reopen persistence
            if (conversation?.id) {
              const url = new URL(window.location.href)
              url.searchParams.set('conversationId', conversation.id)
              window.history.replaceState({}, '', url.toString())
            }
          })
          .catch(err => {
            console.error('Error opening context conversation from URL:', err)
          })
      }
    }
  }, [currentUser, isConnected, createContextConversation, createAiAgentConversation, viewMode])

  // Determine if we should show single-view mode (list OR chat, not both)
  const isSingleViewMode = viewMode === 'mobile' || viewMode === 'compact'
  const showListView = isSingleViewMode ? showConversationList || !activeConversation : true
  const showChatView = isSingleViewMode ? !showConversationList && !!activeConversation : true

  // Error state
  if (error) {
    const getErrorMessage = () => {
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
        ref={containerRef}
        className="gba:h-full gba:flex gba:items-center gba:justify-center gba:p-4 gba:bg-background"
        data-testid={`${prefixDataTestId}-error`}
      >
        <Alert variant="destructive" className="gba:max-w-sm">
          <AlertDescription>{getErrorMessage()}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Loading state
  if (!isConnected && conversationsLoading) {
    return (
      <div
        ref={containerRef}
        className="gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:bg-background"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('chat.connecting', 'Connecting to chat...')}
        </span>
      </div>
    )
  }

  // Offline banner component
  const OfflineBanner = () =>
    isOffline ? (
      <div className="gba:px-3 gba:py-2 gba:bg-warning/10 gba:border-b gba:border-warning/20">
        <p className="gba:text-xs gba:text-warning-foreground gba:text-center">
          {getTranslationFromI18nKeyAndLabel('chat.offline', 'Reconnecting...')}
        </p>
      </div>
    ) : null

  // Helper to get the other participant's user ID from a direct conversation
  const getOtherParticipantUserId = (conversation: Conversation): string | null => {
    if (conversation.type !== 'direct' || !conversation.participants) {
      return null
    }
    const otherParticipant = conversation.participants.find(
      p => p.userId !== currentUser?.id && p.user?.id !== currentUser?.id
    )
    return otherParticipant?.userId || otherParticipant?.user?.id || null
  }

  // Chat view component (header + messages + input)
  const ChatView = () => {
    // Get presence for the other user in direct conversations
    const otherUserId = activeConversation ? getOtherParticipantUserId(activeConversation) : null
    const otherUserPresence = otherUserId ? getUserPresence(otherUserId) : undefined

    return (
      <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:h-full gba:max-h-full gba:overflow-hidden">
        {activeConversation ? (
          <>
            <ConversationHeader
              conversation={activeConversation}
              onBack={isSingleViewMode ? handleBack : undefined}
              onClose={handleCloseConversation}
              onRemove={handleRemoveConversation}
              onGroupSettings={handleShowGroupSettings}
              showBackButton={isSingleViewMode}
              currentUserId={currentUser?.id || null}
              compact={viewMode === 'compact'}
              otherUserPresence={otherUserPresence}
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
              accessToken={accessToken}
            />
            <MessageInput
              onSend={handleSendMessage}
              onTypingStart={() => {
                if (activeConversationId) startTyping(activeConversationId)
              }}
              onTypingStop={() => {
                if (activeConversationId) stopTyping(activeConversationId)
              }}
              disabled={!isConnected}
              compact={viewMode !== 'full'}
              accessToken={accessToken}
            />
          </>
        ) : (
          <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-6 gba:text-center">
            <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:mb-4">
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
            <p className="gba:text-sm gba:text-muted-foreground gba:max-w-[200px]">
              {getTranslationFromI18nKeyAndLabel('chat.selectConversation', 'Select a conversation to start chatting')}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="gba:h-full gba:flex gba:flex-col gba:bg-background gba:overflow-hidden"
      data-testid={prefixDataTestId}
    >
      <OfflineBanner />

      <div className="gba:flex-1 gba:flex gba:flex-row gba:min-h-0 gba:h-full gba:overflow-hidden">
        {/* Conversation List */}
        {showListView && (
          <div
            className={`gba:flex gba:flex-col gba:h-full gba:border-r gba:border-border/50 gba:bg-muted/30 ${
              isSingleViewMode ? 'gba:w-full' : 'gba:w-72 gba:flex-shrink-0'
            }`}
          >
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
              compact={viewMode === 'compact'}
              getUserPresence={getUserPresence}
            />
          </div>
        )}

        {/* Active Conversation */}
        {showChatView && <ChatView />}
      </div>

      {/* Group Chat Modals */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreateGroup={handleCreateGroupSubmit}
        apiClient={apiClient}
        currentUserId={currentUser?.id || null}
        prefixDataTestId={`${prefixDataTestId}-create-group-modal`}
        accessToken={accessToken}
      />
      <GroupSettingsModal
        isOpen={showGroupSettingsModal}
        onClose={handleCloseGroupSettings}
        conversation={activeConversation}
        currentUserId={currentUser?.id || null}
        accessToken={accessToken}
        apiClient={apiClient}
        onRefresh={refreshConversations}
        prefixDataTestId={`${prefixDataTestId}-group-settings-modal`}
      />
    </div>
  )
}
