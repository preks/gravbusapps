import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import type { Conversation, Message, User, TypingIndicator } from '../types'
import { MessageType } from '../types'
import { ChatApiClient } from '../services/chatApiClient'
import { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { useConversations } from './useConversations'
import { useMessages } from './useMessages'
import { useTypingIndicator } from './useTypingIndicator'

interface UseChatClientOptions {
  accessToken: string
  apiUrl: string
  wsUrl: string
}

export function useChatClient({ accessToken, apiUrl, wsUrl }: UseChatClientOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const apiClientRef = useRef<ChatApiClient | null>(null)
  const wsClientRef = useRef<ChatWebSocketClient | null>(null)
  const currentConversationIdRef = useRef<string | null>(null)
  const activeConversationIdRef = useRef<string | null>(null)

  // Use state for API client to trigger re-renders in hooks
  const [apiClientState, setApiClientState] = useState<ChatApiClient | null>(null)

  // Refs for hooks to avoid stale closures
  const conversationsHookRef = useRef<any>(null)
  const messagesHookRef = useRef<any>(null)
  const typingHookRef = useRef<any>(null)
  const currentUserRef = useRef<User | null>(null)

  // Track processed message IDs to prevent duplicate processing
  const processedMessageIdsRef = useRef<Set<string>>(new Set())

  // Keep refs in sync
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  // Initialize API client
  useEffect(() => {
    if (accessToken) {
      const client = new ChatApiClient(apiUrl, accessToken)
      apiClientRef.current = client
      setApiClientState(client)

      // Get current user
      client
        .getCurrentUser()
        .then(user => {
          setCurrentUser(user)
        })
        .catch(err => {
          console.error('Error getting current user:', err)
          setError(err instanceof Error ? err : new Error('Failed to authenticate'))
        })
    } else {
      apiClientRef.current = null
      setApiClientState(null)
    }
  }, [accessToken, apiUrl])

  // Use hooks for conversations and messages (must be called unconditionally, BEFORE any useEffect that uses them)
  const conversationsHook = useConversations({
    apiClient: apiClientState || ({} as ChatApiClient),
    accessToken,
    enabled: !!apiClientState
  })

  // Compute active conversation from the conversations list
  const activeConversation = conversationsHook.conversations.find(c => c.id === activeConversationId) || null

  const messagesHook = useMessages({
    apiClient: apiClientState || ({} as ChatApiClient),
    conversationId: activeConversationId,
    currentUserId: currentUser?.id || null,
    conversation: activeConversation,
    enabled: !!apiClientState && !!activeConversationId
  })

  // Reload conversations when API client is ready
  useEffect(() => {
    if (apiClientState && conversationsHook) {
      conversationsHook.loadConversations()
    }
  }, [apiClientState])

  const typingHook = useTypingIndicator({
    onTypingStart: conversationId => {
      wsClientRef.current?.sendTypingStart(conversationId)
    },
    onTypingStop: conversationId => {
      wsClientRef.current?.sendTypingStop(conversationId)
    }
  })

  // Keep hook refs up to date
  useEffect(() => {
    conversationsHookRef.current = conversationsHook
    messagesHookRef.current = messagesHook
    typingHookRef.current = typingHook
  })

  // Initialize WebSocket client
  useEffect(() => {
    if (accessToken && apiClientRef.current) {
      wsClientRef.current = new ChatWebSocketClient(wsUrl)

      const socket = wsClientRef.current.connect(accessToken)

      socket.on('connect', async () => {
        setIsConnected(true)
        setError(null)

        // Join all user's conversations when connected
        // The backend automatically joins users to their conversations on connect,
        // but we should also join the active conversation if there is one
        if (activeConversationId && wsClientRef.current) {
          wsClientRef.current.joinConversation(activeConversationId)
          currentConversationIdRef.current = activeConversationId
        }
      })

      socket.on('disconnect', () => {
        setIsConnected(false)
      })

      socket.on('error', err => {
        console.error('WebSocket error:', err)
        setError(err instanceof Error ? err : new Error('WebSocket connection error'))
      })

      return () => {
        wsClientRef.current?.disconnect()
      }
    }
  }, [accessToken, wsUrl])

  // Setup WebSocket event listeners
  useEffect(() => {
    if (!wsClientRef.current || !isConnected) {
      // Clear processed messages when disconnected
      processedMessageIdsRef.current.clear()
      return
    }

    const wsClient = wsClientRef.current

    // Clear processed messages on new connection to allow fresh processing
    processedMessageIdsRef.current.clear()

    // Message handlers
    const handleNewMessage = (message: Message) => {
      // Skip if we've already processed this message ID (prevent duplicate processing)
      if (processedMessageIdsRef.current.has(message.id)) {
        return
      }

      // Mark this message as processed
      processedMessageIdsRef.current.add(message.id)

      // Clean up old message IDs (keep only last 100)
      if (processedMessageIdsRef.current.size > 100) {
        const ids = Array.from(processedMessageIdsRef.current)
        processedMessageIdsRef.current = new Set(ids.slice(-100))
      }

      // Determine status based on context
      let messageStatus = message.status || 'sent'

      const currentUser = currentUserRef.current
      const isOwnMessage = currentUser && message.senderId === currentUser.id
      const isOtherUserMessage = currentUser && message.senderId !== currentUser.id

      // Use ref to get current active conversation (not stale closure value)
      const currentActiveConversationId = activeConversationIdRef.current

      // Stop typing indicator for this user when they send a message
      if (isOtherUserMessage) {
        // Clear typing indicator for the sender
        typingHookRef.current?.handleUserTyping({
          userId: message.senderId,
          conversationId: message.conversationId,
          isTyping: false,
          username: message.sender?.username || message.sender?.firstName || 'User'
        })

        // Receiving someone else's message
        if (message.conversationId === currentActiveConversationId) {
          // In active conversation - mark as read and send read receipt
          messageStatus = 'read'

          // Emit read receipt back to sender via WebSocket
          if (wsClientRef.current && wsClientRef.current.isConnected()) {
            wsClientRef.current.getSocket()?.emit('message:read', {
              messageId: message.id,
              conversationId: message.conversationId,
              readBy: currentUser?.id
            })
          }
        } else {
          // In background conversation - mark as delivered and emit delivery confirmation
          messageStatus = 'delivered'

          // Emit delivery confirmation back to sender
          if (wsClientRef.current && wsClientRef.current.isConnected()) {
            wsClientRef.current.getSocket()?.emit('message:delivered', {
              messageId: message.id,
              conversationId: message.conversationId,
              deliveredTo: currentUser?.id
            })
          }
        }
      } else if (isOwnMessage) {
        // Receiving own message broadcast (after sending)
        // Check if we already have this message to avoid overwriting with worse status
        const existingMessages = messagesHookRef.current?.messages || []
        const existingMessage = existingMessages.find((m: any) => {
          // Match by ID or by temp ID with same content
          if (m.id === message.id) return true
          if (
            m.id.startsWith('temp-') &&
            m.content === message.content &&
            m.conversationId === message.conversationId
          ) {
            return true
          }
          return false
        })

        // If message already exists with same real ID and has a status, skip entirely
        if (existingMessage && existingMessage.id === message.id && existingMessage.status) {
          // Message already exists with real ID - duplicate event, skip it
          return
        }

        // Preserve better status if it exists (delivered > sent, read > delivered)
        if (existingMessage && existingMessage.status) {
          const statusPriority = { sent: 1, delivered: 2, read: 3 }
          const existingPriority = statusPriority[existingMessage.status as keyof typeof statusPriority] || 0
          const incomingStatus = message.status || 'sent'
          const incomingPriority = statusPriority[incomingStatus as keyof typeof statusPriority] || 1

          if (existingPriority >= incomingPriority) {
            // Keep the better or equal existing status
            messageStatus = existingMessage.status
          } else {
            // Use the new status if it's better
            messageStatus = incomingStatus
          }
        } else {
          // No existing message, use incoming status or default to 'sent'
          messageStatus = message.status || 'sent'
        }
      }

      // Create updated message with correct status
      const messageWithStatus = { ...message, status: messageStatus }

      // Batch message and conversation updates to reduce flickering
      startTransition(() => {
        // Always add message if it's for the active conversation
        if (message.conversationId === currentActiveConversationId) {
          messagesHookRef.current?.addMessage(messageWithStatus)
        }

        // Always update conversation last message (this updates the conversation list)
        conversationsHookRef.current?.updateConversationLastMessage(message.conversationId, messageWithStatus)

        // Increment unread count ONLY for messages from OTHER users in background conversations
        if (isOtherUserMessage && message.conversationId !== currentActiveConversationId) {
          conversationsHookRef.current?.incrementUnreadCount(message.conversationId)
        }
      })
    }

    const handleMessageUpdated = (message: Message) => {
      messagesHookRef.current?.updateMessage(message)
    }

    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      messagesHookRef.current?.deleteMessage(data.messageId)
    }

    const handleUserTyping = (data: TypingIndicator) => {
      // Enrich typing indicator with username from conversation participants
      if (!data.username) {
        const conversation = conversationsHookRef.current?.conversations.find((c: any) => c.id === data.conversationId)
        if (conversation?.participants) {
          const participant = conversation.participants.find(
            (p: any) => p.userId === data.userId || p.user?.id === data.userId
          )
          if (participant?.user) {
            const username =
              `${participant.user.firstName || ''} ${participant.user.lastName || ''}`.trim() ||
              participant.user.username ||
              'Someone'
            data = { ...data, username }
          }
        }
      }
      typingHookRef.current?.handleUserTyping(data)
    }

    const handleMessageDelivered = (data: { messageId: string; conversationId: string; deliveredTo: string }) => {
      // When someone receives your message (delivered), update status to 'delivered' (gray double checkmarks)
      const currentUser = currentUserRef.current
      if (currentUser && data.deliveredTo !== currentUser.id) {
        const messages = messagesHookRef.current?.messages || []
        // Find message by real ID or by temp ID (in case this event arrives before new_message)
        const message = messages.find((m: any) => {
          if (m.id === data.messageId) return true
          // Check if this is a temp message that hasn't been replaced yet
          if (m.id.startsWith('temp-') && m.conversationId === data.conversationId && m.senderId === currentUser.id) {
            // This is likely our optimistic message
            // We can't be 100% sure, but it's the best match we have
            return true
          }
          return false
        })

        if (message && message.senderId === currentUser.id) {
          // Update message status immediately (no startTransition for status updates - they're important!)
          // Use the real message ID from the event data, not the found message's ID (which might be temp)
          messagesHookRef.current?.updateMessageStatus(data.messageId, 'delivered')

          // Also update in conversation list (use the found message object but with real ID)
          conversationsHookRef.current?.updateConversationLastMessage(data.conversationId, {
            ...message,
            id: data.messageId, // Use real ID from event
            status: 'delivered'
          })
        }
      }
    }

    const handleMessageRead = (data: { messageId: string; conversationId: string; readBy: string }) => {
      // When someone reads your message, update status to 'read' (blue checkmarks)
      const currentUser = currentUserRef.current
      if (currentUser && data.readBy !== currentUser.id) {
        // Find the message and update its status
        const messages = messagesHookRef.current?.messages || []
        // Find message by real ID or by temp ID (in case this event arrives before new_message)
        const message = messages.find((m: any) => {
          if (m.id === data.messageId) return true
          // Check if this is a temp message that hasn't been replaced yet
          if (m.id.startsWith('temp-') && m.conversationId === data.conversationId && m.senderId === currentUser.id) {
            // This is likely our optimistic message
            // We can't be 100% sure, but it's the best match we have
            return true
          }
          return false
        })

        if (message && message.senderId === currentUser.id) {
          // Update message status immediately (no startTransition for status updates - they're important!)
          // This is your message being read by someone else
          // Update from 'sent'/'delivered' to 'read' (blue ✓✓)
          // Use the real message ID from the event data, not the found message's ID (which might be temp)
          messagesHookRef.current?.updateMessageStatus(data.messageId, 'read')

          // Also update ALL previous messages from this sender in this conversation to 'read'
          // (if someone reads message X, they've also read all messages before X)
          const messageTime = new Date(message.createdAt).getTime()
          messages.forEach((msg: any) => {
            if (
              msg.senderId === currentUser.id &&
              new Date(msg.createdAt).getTime() <= messageTime &&
              msg.status !== 'read'
            ) {
              messagesHookRef.current?.updateMessageStatus(msg.id, 'read')
            }
          })

          // Also update in conversation list (use the found message object but with real ID)
          conversationsHookRef.current?.updateConversationLastMessage(data.conversationId, {
            ...message,
            id: data.messageId, // Use real ID from event
            status: 'read'
          })
        }
      }
    }

    const handleConversationUpdated = async (data: { conversationId: string }) => {
      // Refetch this specific conversation to get updated unread count
      if (apiClientRef.current && conversationsHookRef.current) {
        try {
          const conversation = await apiClientRef.current.getConversationById(data.conversationId)

          // Enrich conversation with real user data before updating
          if (conversationsHookRef.current.enrichConversations) {
            const enriched = await conversationsHookRef.current.enrichConversations([conversation])
            conversationsHookRef.current.updateConversation(data.conversationId, enriched[0])
          } else {
            conversationsHookRef.current.updateConversation(data.conversationId, conversation)
          }
        } catch (err) {
          console.error('Error refreshing conversation:', err)
        }
      }
    }

    const handleConversationCreated = async (data: { conversation: any }) => {
      // New conversation was created and this user is a participant
      if (conversationsHookRef.current) {
        try {
          // Enrich conversation with real user data before adding
          if (conversationsHookRef.current.enrichConversations) {
            const enriched = await conversationsHookRef.current.enrichConversations([data.conversation])
            conversationsHookRef.current.addConversation(enriched[0])
          } else {
            conversationsHookRef.current.addConversation(data.conversation)
          }
        } catch (err) {
          console.error('Error adding new conversation:', err)
        }
      }
    }

    // Register listeners
    wsClient.onNewMessage(handleNewMessage)
    wsClient.onMessageUpdated(handleMessageUpdated)
    wsClient.onMessageDeleted(handleMessageDeleted)
    wsClient.onUserTyping(handleUserTyping)
    wsClient.onMessageDelivered(handleMessageDelivered)
    wsClient.onMessageRead(handleMessageRead)
    wsClient.onConversationUpdated(handleConversationUpdated)
    wsClient.onConversationCreated(handleConversationCreated)

    return () => {
      wsClient.off('new_message', handleNewMessage)
      wsClient.off('message:updated', handleMessageUpdated)
      wsClient.off('message:deleted', handleMessageDeleted)
      wsClient.off('user_typing', handleUserTyping)
      wsClient.off('message:delivered', handleMessageDelivered)
      wsClient.off('message:read', handleMessageRead)
      wsClient.off('conversation_updated', handleConversationUpdated)
      wsClient.off('conversation_created', handleConversationCreated)
    }
  }, [isConnected]) // Only re-register when connection changes, all other values accessed via refs

  // Join/leave conversation when active conversation changes
  useEffect(() => {
    if (!wsClientRef.current || !isConnected) {
      return
    }

    // Leave previous conversation if switching or going back
    if (currentConversationIdRef.current && currentConversationIdRef.current !== activeConversationId) {
      wsClientRef.current.leaveConversation(currentConversationIdRef.current)
    }

    // Join new conversation
    if (activeConversationId) {
      wsClientRef.current.joinConversation(activeConversationId)
      currentConversationIdRef.current = activeConversationId
      conversationsHookRef.current?.markConversationAsRead(activeConversationId)

      // Mark as read via API and reload conversation data after a short delay
      // to ensure backend has updated lastReadAt
      if (apiClientRef.current) {
        const conversationIdToMarkRead = activeConversationId
        apiClientRef.current
          .markAsRead(conversationIdToMarkRead)
          .then(() => {
            // Reload conversation after marking as read to get updated participant data
            // Only reload if conversation is still active - don't overwrite data if user has moved on
            setTimeout(async () => {
              if (
                apiClientRef.current &&
                conversationIdToMarkRead === currentConversationIdRef.current &&
                conversationsHookRef.current
              ) {
                try {
                  const fullConversation = await apiClientRef.current.getConversationById(conversationIdToMarkRead)

                  // Double-check conversation is still active
                  if (conversationIdToMarkRead === currentConversationIdRef.current) {
                    // Enrich conversation before updating
                    if (conversationsHookRef.current.enrichConversations) {
                      const enriched = await conversationsHookRef.current.enrichConversations([fullConversation])
                      conversationsHookRef.current.updateConversation(conversationIdToMarkRead, enriched[0])
                    } else {
                      conversationsHookRef.current.updateConversation(conversationIdToMarkRead, fullConversation)
                    }
                  }
                } catch (error) {
                  console.error('Error updating conversation after marking read:', error)
                }
              }
            }, 200)
          })
          .catch(console.error)
      }
    } else {
      // We've left the room, backend will send conversation_updated events instead
      currentConversationIdRef.current = null
    }
  }, [activeConversationId, isConnected])

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // Prefer WebSocket for real-time delivery, fallback to REST API
      if (wsClientRef.current && isConnected) {
        try {
          // Create optimistic message for immediate UI feedback
          const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            conversationId,
            senderId: currentUser.id,
            content,
            type: MessageType.TEXT,
            isEdited: false,
            isDeleted: false,
            status: 'sent',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sender: {
              id: currentUser.id,
              keycloakId: currentUser.keycloakId || '',
              username: currentUser.username,
              email: currentUser.email,
              firstName: currentUser.firstName,
              lastName: currentUser.lastName,
              avatarUrl: currentUser.avatarUrl,
              isActive: true,
              createdAt: currentUser.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }

          // Batch optimistic message add and typing stop to reduce flickering
          startTransition(() => {
            // Add optimistic message immediately
            messagesHook.addMessage(optimisticMessage)
            typingHook.stopTyping(conversationId)
          })

          // Send via WebSocket - the gateway will create the message and broadcast it
          wsClientRef.current.sendMessage(conversationId, content, currentUser.id)

          // The real message will be received via WebSocket 'new_message' event
          // and will replace the optimistic one
          return optimisticMessage
        } catch (err) {
          console.error('Error sending message via WebSocket:', err)
          // Fall through to REST API fallback
        }
      }

      // Fallback to REST API if WebSocket is not available
      if (!apiClientRef.current) {
        throw new Error('Chat client not initialized')
      }

      try {
        const message = await apiClientRef.current.sendMessage(conversationId, content, currentUser.id)
        messagesHook.addMessage(message)
        typingHook.stopTyping(conversationId)
        return message
      } catch (err) {
        console.error('Error sending message:', err)
        throw err
      }
    },
    [messagesHook, typingHook, currentUser, isConnected]
  )

  const createDirectConversation = useCallback(
    async (userId: string) => {
      if (!apiClientRef.current) {
        throw new Error('Chat client not initialized')
      }

      try {
        let conversation: Conversation
        try {
          conversation = await apiClientRef.current.getOrCreateDirectConversation(userId)
        } catch (err: any) {
          // Try with keycloakId if regular ID fails
          const user = await apiClientRef.current.getUserById(userId).catch(() => null)
          if (user?.keycloakId) {
            conversation = await apiClientRef.current.getOrCreateDirectConversationByKeycloakId(user.keycloakId)
          } else {
            throw err
          }
        }

        // Reload conversation with full participant data including user objects
        const fullConversation = await apiClientRef.current.getConversationById(conversation.id)
        // Add and enrich conversation - this returns the enriched version
        const enrichedConversation = await conversationsHook.addConversation(fullConversation)
        setActiveConversationId(enrichedConversation.id)

        return enrichedConversation
      } catch (err) {
        console.error('Error creating conversation:', err)
        throw err
      }
    },
    [conversationsHook]
  )

  const setActiveConversation = useCallback(
    async (conversation: Conversation | null) => {
      if (!conversation) {
        setActiveConversationId(null)
        return
      }

      setActiveConversationId(conversation.id)

      // Reload conversation with full participant data to ensure we have user objects
      if (apiClientRef.current && conversation.id) {
        try {
          const fullConversation = await apiClientRef.current.getConversationById(conversation.id)

          // Enrich conversation before updating
          if (conversationsHook.enrichConversations) {
            const enriched = await conversationsHook.enrichConversations([fullConversation])
            conversationsHook.updateConversation(conversation.id, enriched[0])
          } else {
            conversationsHook.updateConversation(conversation.id, fullConversation)
          }
        } catch (err) {
          console.error('Error reloading conversation:', err)
          // Continue with the conversation we have
        }
      }
    },
    [conversationsHook]
  )

  const closeConversation = useCallback(
    async (conversationId: string) => {
      if (!apiClientRef.current || !currentUser) {
        throw new Error('Chat client not initialized')
      }

      try {
        // Remove current user as participant (leave conversation)
        await apiClientRef.current.removeParticipant(conversationId, currentUser.id)

        // Clear active conversation if it's the one being closed
        if (activeConversationId === conversationId) {
          setActiveConversationId(null)
        }

        // Reload conversations from backend to ensure consistency
        // This ensures the backend's state (user no longer a participant) is reflected in the UI
        await conversationsHook.loadConversations()

        return true
      } catch (err) {
        console.error('Error removing conversation:', err)
        throw err
      }
    },
    [conversationsHook, currentUser, activeConversationId]
  )

  return {
    // State
    isConnected,
    currentUser,
    activeConversation,
    activeConversationId,
    error,
    // Conversations
    conversations: conversationsHook.conversations,
    conversationsLoading: conversationsHook.isLoading,
    conversationsLoadingMore: conversationsHook.isLoadingMore,
    conversationsHasMore: conversationsHook.hasMore,
    conversationsError: conversationsHook.error,
    // Messages
    messages: messagesHook.messages,
    messagesLoading: messagesHook.isLoading,
    messagesError: messagesHook.error,
    hasMoreMessages: messagesHook.hasMore,
    // Typing
    typingUsers: typingHook.typingUsers,
    // Actions
    sendMessage,
    createDirectConversation,
    setActiveConversation,
    closeConversation,
    loadMoreMessages: messagesHook.loadMoreMessages,
    loadMoreConversations: conversationsHook.loadMoreConversations,
    refreshConversations: conversationsHook.loadConversations,
    refreshMessages: messagesHook.refresh,
    startTyping: typingHook.startTyping,
    stopTyping: typingHook.stopTyping,
    // Clients (for advanced usage)
    apiClient: apiClientRef.current,
    wsClient: wsClientRef.current
  }
}
