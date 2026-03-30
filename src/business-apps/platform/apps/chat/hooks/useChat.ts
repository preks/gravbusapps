import { useState, useEffect, useCallback, useRef, startTransition, useMemo } from 'react'
import type { ActiveCall, Conversation, Message, User, TypingIndicator } from '../types'
import { MessageType } from '../types'
import { useChatClient } from '@/common/network/chat/useChatClient'
import { useChatWebSocketClient } from '@/common/network/chat/useChatWebSocketClient'
import { useConversations } from './useConversations'
import { useMessages } from './useMessages'
import { useTypingIndicator } from './useTypingIndicator'
import { usePresence, type PresenceState, type PresenceData } from './usePresence'

interface UseChatOptions {
  accessToken: string
}

export function useChat({ accessToken }: UseChatOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [activeCalls, setActiveCalls] = useState<Record<string, ActiveCall>>({})

  const apiClient = useChatClient(accessToken)
  const wsClient = useChatWebSocketClient(accessToken)

  const apiClientRef = useRef(apiClient)
  const wsClientRef = useRef(wsClient)
  const currentConversationIdRef = useRef<string | null>(null)
  const activeConversationIdRef = useRef<string | null>(null)
  const activeCallsRef = useRef<Record<string, ActiveCall>>({})

  const [apiClientReady, setApiClientReady] = useState(false)

  const conversationsHookRef = useRef<any>(null)
  const messagesHookRef = useRef<any>(null)
  const typingHookRef = useRef<any>(null)
  const currentUserRef = useRef<User | null>(null)
  const nudgeCallbackRef = useRef<
    ((data: { conversationId: string; fromUserId: string; fromUserName: string }) => void) | null
  >(null)
  const shouldRefreshConversationsOnConnectRef = useRef(false)

  const processedMessageIdsRef = useRef<Set<string>>(new Set())
  const newestMessageTimestampRef = useRef<number>(0)

  // Keep refs in sync
  apiClientRef.current = apiClient
  wsClientRef.current = wsClient

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  useEffect(() => {
    activeCallsRef.current = activeCalls
  }, [activeCalls])

  // Fetch current user when token is available
  useEffect(() => {
    if (!accessToken) {
      setApiClientReady(false)
      return
    }

    setApiClientReady(true)

    apiClient
      .getCurrentUser<User>()
      .then(user => {
        setCurrentUser(user)
        setError(null)
      })
      .catch((err: any) => {
        let errorMessage = 'chat.serviceUnavailable'

        if (err?.status === 404) {
          errorMessage = 'chat.serviceNotFound'
        } else if (err?.message?.includes('fetch') || err?.message?.includes('network')) {
          errorMessage = 'chat.serviceUnavailable'
        } else if (err?.status === 401 || err?.status === 403) {
          errorMessage = 'chat.authenticationFailed'
        }

        const error = new Error(errorMessage)
        error.name = errorMessage
        setError(error)
      })
  }, [accessToken, apiClient])

  // Use hooks for conversations and messages
  const conversationsHook = useConversations({
    apiClient: apiClientReady ? apiClient : undefined,
    accessToken,
    enabled: apiClientReady
  })

  const activeConversation = conversationsHook.conversations.find(c => c.id === activeConversationId) || null

  const messagesHook = useMessages({
    apiClient,
    conversationId: activeConversationId,
    currentUserId: currentUser?.id || null,
    conversation: activeConversation,
    enabled: apiClientReady && !!activeConversationId,
    onMessagesLoaded: (messageIds: string[]) => {
      messageIds.forEach(id => processedMessageIdsRef.current.add(id))
    }
  })

  useEffect(() => {
    if (messagesHook.messages.length > 0 && activeConversationId) {
      const newestTimestamp = Math.max(...messagesHook.messages.map((m: Message) => new Date(m.createdAt).getTime()))
      newestMessageTimestampRef.current = newestTimestamp
    }
  }, [messagesHook.messages, activeConversationId])

  const typingHook = useTypingIndicator({
    onTypingStart: conversationId => {
      wsClientRef.current?.sendTypingStart(conversationId)
    },
    onTypingStop: conversationId => {
      wsClientRef.current?.sendTypingStop(conversationId)
    }
  })

  const presence = usePresence({
    wsClient,
    currentUserId: currentUser?.id || null
  })

  const presenceMap = useMemo(() => {
    const map = new Map<string, PresenceData>()
    const rawMap = presence.getPresenceMap()

    rawMap.forEach((data, userId) => {
      map.set(userId, {
        state: data.state,
        lastSeen: data.lastSeen,
        userStatus: data.userStatus
      })
    })

    return map
  }, [presence.presenceVersion, presence.getPresenceMap])

  const presenceHook = {
    presenceMap,
    presenceVersion: presence.presenceVersion,

    getUserPresence: useCallback(
      (userId: string): PresenceData | { state: 'offline' } => {
        return presenceMap.get(userId) || { state: 'offline' }
      },
      [presenceMap]
    ),
    isUserOnline: useCallback(
      (userId: string): boolean => {
        const data = presenceMap.get(userId)
        return data?.state === 'online'
      },
      [presenceMap]
    ),
    updatePresence: useCallback(
      (
        userId: string,
        presenceStatus: { status: 'online' | 'offline' } | { state: 'online' | 'offline' } | PresenceData
      ) => {
        if ('state' in presenceStatus) {
          const state = presenceStatus.state as PresenceState
          const lastSeen = 'lastSeen' in presenceStatus ? presenceStatus.lastSeen : undefined
          const userStatus = 'userStatus' in presenceStatus ? presenceStatus.userStatus : undefined
          presence.updatePresence(userId, state, lastSeen, userStatus)
        } else if ('status' in presenceStatus) {
          const state = presenceStatus.status as PresenceState
          presence.updatePresence(userId, state)
        }
      },
      [presence]
    ),
    updatePresenceFromUser: useCallback(
      (userId: string, lastSeen?: Date | string, isOnline?: boolean) => {
        const state: PresenceState = isOnline ? 'online' : 'offline'
        const lastSeenString = lastSeen instanceof Date ? lastSeen.toISOString() : lastSeen
        presence.updatePresence(userId, state, lastSeenString)
      },
      [presence]
    ),
    clearPresence: () => {}
  }

  // Keep hook refs up to date
  useEffect(() => {
    conversationsHookRef.current = conversationsHook
    messagesHookRef.current = messagesHook
    typingHookRef.current = typingHook
  })

  // WebSocket connection lifecycle via central hook
  useEffect(() => {
    if (!accessToken || !wsClient) {
      return
    }

    const unsubConnect = wsClient.onConnect(() => {
      setIsConnected(true)
      setIsOffline(false)
      setError(null)

      if (shouldRefreshConversationsOnConnectRef.current) {
        shouldRefreshConversationsOnConnectRef.current = false
        setTimeout(() => {
          if (conversationsHookRef.current?.conversations?.length) {
            conversationsHookRef.current.loadConversations?.()
          }
        }, 500)
      }
    })

    const unsubDisconnect = wsClient.onDisconnect(() => {
      setIsConnected(false)
      setIsOffline(true)
      shouldRefreshConversationsOnConnectRef.current = true
    })

    const unsubError = wsClient.onConnectError(() => {
      setIsOffline(true)
    })

    if (wsClient.isConnected()) {
      setIsConnected(true)
    }

    return () => {
      unsubConnect()
      unsubDisconnect()
      unsubError()
    }
  }, [accessToken, wsClient])

  // Update currentConversationIdRef when activeConversationId changes
  useEffect(() => {
    if (activeConversationId && isConnected) {
      currentConversationIdRef.current = activeConversationId
    }
  }, [activeConversationId, isConnected])

  // Setup WebSocket event listeners
  useEffect(() => {
    if (!wsClient || !isConnected) {
      processedMessageIdsRef.current.clear()
      setActiveCalls({})
      return
    }

    processedMessageIdsRef.current.clear()

    const STATUS_PRIORITY = { sent: 1, delivered: 2, read: 3 } as const

    const handleNewMessage = (raw: Message) => {
      const messageId = raw.id
      if (messageId != null && processedMessageIdsRef.current.has(messageId)) {
        return
      }
      if (messageId != null) processedMessageIdsRef.current.add(messageId)

      const currentActiveConversationId = activeConversationIdRef.current
      if (raw.conversationId === currentActiveConversationId) {
        const messageTimestamp = new Date(raw.createdAt).getTime()
        newestMessageTimestampRef.current = messageTimestamp
      }

      queueMicrotask(() => {
        if (processedMessageIdsRef.current.size > 150) {
          const ids = Array.from(processedMessageIdsRef.current)
          processedMessageIdsRef.current = new Set(ids.slice(-100))
        }

        let messageStatus = raw.status || 'sent'

        const currentUser = currentUserRef.current
        const isOwnMessage = raw.senderId === currentUser?.id
        const isOtherUserMessage = currentUser != null && raw.senderId !== currentUser.id
        const isSystemMessage = !raw.senderId || raw.type === 'system'

        const currentActiveConversationId = activeConversationIdRef.current

        if (isSystemMessage) {
          const messageWithStatus = { ...raw, status: raw.status || 'sent' }

          if (raw.conversationId) {
            conversationsHookRef.current?.updateConversationLastMessage(raw.conversationId, messageWithStatus)
          }
          startTransition(() => {
            if (raw.conversationId === currentActiveConversationId) {
              messagesHookRef.current?.addMessage(messageWithStatus)
            }
          })

          return
        }

        if (isOtherUserMessage) {
          typingHookRef.current?.handleUserTyping({
            userId: raw.senderId,
            conversationId: raw.conversationId,
            isTyping: false,
            username: raw.sender?.username || raw.sender?.firstName || 'User'
          })

          if (raw.conversationId === currentActiveConversationId) {
            messageStatus = 'read'

            const ws = wsClientRef.current
            if (ws && ws.isConnected()) {
              ws.emit('message:read', {
                messageId: raw.id,
                conversationId: raw.conversationId,
                readBy: currentUser?.id
              })
            }
          } else {
            messageStatus = 'delivered'

            const ws = wsClientRef.current
            if (ws && ws.isConnected()) {
              ws.emit('message:delivered', {
                messageId: raw.id,
                conversationId: raw.conversationId,
                deliveredTo: currentUser?.id
              })
            }
          }
        } else if (isOwnMessage) {
          if (raw.conversationId === currentActiveConversationId) {
            const existingMessages = messagesHookRef.current?.messages || []
            let existingMessage = null

            for (let i = existingMessages.length - 1; i >= 0; i--) {
              const m = existingMessages[i] as any
              if (m.id === raw.id) {
                existingMessage = m
                break
              }
              if (m.id.startsWith('temp-') && m.content === raw.content && m.conversationId === raw.conversationId) {
                existingMessage = m
              }
            }

            if (existingMessage) {
              if (existingMessage.id === raw.id && existingMessage.status) {
                return
              }
            }

            if (existingMessage && existingMessage.status) {
              const existingPriority = STATUS_PRIORITY[existingMessage.status as keyof typeof STATUS_PRIORITY] || 0
              const incomingPriority = STATUS_PRIORITY[(raw.status || 'sent') as keyof typeof STATUS_PRIORITY] || 1

              if (existingPriority >= incomingPriority) {
                messageStatus = existingMessage.status
              } else {
                messageStatus = raw.status || 'sent'
              }
            } else {
              messageStatus = raw.status || 'sent'
            }
          } else {
            messageStatus = raw.status || 'sent'
          }
        }

        const messageWithStatus = { ...raw, status: messageStatus }

        conversationsHookRef.current?.updateConversationLastMessage(raw.conversationId, messageWithStatus)
        if (isOtherUserMessage && raw.conversationId !== currentActiveConversationId) {
          conversationsHookRef.current?.incrementUnreadCount(raw.conversationId)
        }
        startTransition(() => {
          if (raw.conversationId === currentActiveConversationId) {
            messagesHookRef.current?.addMessage(messageWithStatus)
          }
        })
      })
    }

    const handleMessageUpdated = (message: Message) => {
      messagesHookRef.current?.updateMessage(message.id, message)
    }

    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      messagesHookRef.current?.deleteMessage(data.messageId)
    }

    const handleUserTyping = (data: TypingIndicator) => {
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
      const currentUser = currentUserRef.current
      if (currentUser && data.deliveredTo !== currentUser.id) {
        const messages = messagesHookRef.current?.messages || []
        const message = messages.find((m: any) => {
          if (m.id === data.messageId) return true
          if (m.id.startsWith('temp-') && m.conversationId === data.conversationId && m.senderId === currentUser.id) {
            return true
          }
          return false
        })

        if (message && message.senderId === currentUser.id) {
          messagesHookRef.current?.updateMessageStatus(data.messageId, 'delivered')
          conversationsHookRef.current?.updateConversationLastMessage(data.conversationId, {
            ...message,
            id: data.messageId,
            status: 'delivered'
          })
        }
      }
    }

    const handleMessageRead = (data: { messageId: string; conversationId: string; readBy: string }) => {
      const currentUser = currentUserRef.current
      if (currentUser && data.readBy !== currentUser.id) {
        const messages = messagesHookRef.current?.messages || []
        const message = messages.find((m: any) => {
          if (m.id === data.messageId) return true
          if (m.id.startsWith('temp-') && m.conversationId === data.conversationId && m.senderId === currentUser.id) {
            return true
          }
          return false
        })

        if (message && message.senderId === currentUser.id) {
          messagesHookRef.current?.updateMessageStatus(data.messageId, 'read')
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
          conversationsHookRef.current?.updateConversationLastMessage(data.conversationId, {
            ...message,
            id: data.messageId,
            status: 'read'
          })
        }
      }
    }

    const handleConversationUpdated = async (data: { conversationId: string }) => {
      if (apiClientRef.current && conversationsHookRef.current) {
        try {
          const conversation = await apiClientRef.current.getConversationById<Conversation>(data.conversationId)

          const currentActiveCall = activeCallsRef.current[data.conversationId]
          if (currentActiveCall) {
            conversation.activeCall = currentActiveCall
          }

          if (conversationsHookRef.current.enrichConversationsWithAvatarsOnly) {
            const enriched = conversationsHookRef.current.enrichConversationsWithAvatarsOnly([conversation])
            conversationsHookRef.current.updateConversation(data.conversationId, enriched[0])
          } else {
            conversationsHookRef.current.updateConversation(data.conversationId, conversation)
          }
        } catch {
          // Error refreshing conversation
        }
      }
    }

    const handleParticipantRemoved = (data: { conversationId: string }) => {
      conversationsHookRef.current?.removeConversation?.(data.conversationId)
      if (activeConversationIdRef.current === data.conversationId) {
        setActiveConversationId(null)
      }
    }

    const handleConversationCreated = async (data: { conversation: any }) => {
      if (conversationsHookRef.current) {
        try {
          if (conversationsHookRef.current.enrichConversations) {
            const enriched = await conversationsHookRef.current.enrichConversations([data.conversation])
            conversationsHookRef.current.addConversation(enriched[0])
          } else {
            conversationsHookRef.current.addConversation(data.conversation)
          }
          const conversationId = data.conversation?.id
          if (conversationId && activeConversationIdRef.current === conversationId) {
            setTimeout(() => messagesHookRef.current?.refresh?.(), 0)
          }
        } catch {
          // Error adding new conversation
        }
      }
    }

    const handleConversationCallStarted = (data: ActiveCall) => {
      setActiveCalls(prev => ({ ...prev, [data.conversationId]: data }))
      conversationsHookRef.current?.updateConversation?.(data.conversationId, {
        activeCall: data
      } as Partial<Conversation>)
    }

    const handleConversationCallEnded = (data: { conversationId: string; roomId: string }) => {
      setActiveCalls(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [data.conversationId]: _removed, ...rest } = prev
        return rest
      })
      conversationsHookRef.current?.updateConversation?.(data.conversationId, {
        activeCall: null
      } as Partial<Conversation>)
      if (data.conversationId === activeConversationIdRef.current) {
        setTimeout(() => messagesHookRef.current?.refresh?.(), 300)
      }
    }

    const handleConversationActiveCalls = (calls: ActiveCall[]) => {
      const next: Record<string, ActiveCall> = {}
      ;(calls || []).forEach(call => {
        if (!call?.conversationId) return
        next[call.conversationId] = call
        conversationsHookRef.current?.updateConversation?.(call.conversationId, {
          activeCall: call
        } as Partial<Conversation>)
      })

      const prev = activeCallsRef.current || {}
      Object.keys(prev).forEach(conversationId => {
        if (!next[conversationId]) {
          conversationsHookRef.current?.updateConversation?.(conversationId, {
            activeCall: null
          } as Partial<Conversation>)
        }
      })

      setActiveCalls(next)
    }

    const handleConversationRead = (data: { conversationId: string; userId: string; readAt: string }) => {
      conversationsHookRef.current?.markConversationAsRead(data.conversationId)
    }

    const handleConversationUnread = () => {
      conversationsHookRef.current?.loadConversations?.()
    }

    const handleNudgeReceived = (data: { conversationId: string; fromUserId: string; fromUserName: string }) => {
      if (nudgeCallbackRef.current) {
        nudgeCallbackRef.current(data)
      }
    }

    const unsubs = [
      wsClient.onNewMessage(handleNewMessage),
      wsClient.onMessageUpdated(handleMessageUpdated),
      wsClient.onMessageDeleted(handleMessageDeleted),
      wsClient.onUserTyping(handleUserTyping),
      wsClient.onMessageDelivered(handleMessageDelivered),
      wsClient.onMessageRead(handleMessageRead),
      wsClient.onConversationUpdated(handleConversationUpdated),
      wsClient.onConversationCreated(handleConversationCreated),
      wsClient.onParticipantRemoved(handleParticipantRemoved),
      wsClient.onConversationRead(handleConversationRead),
      wsClient.onConversationUnread(handleConversationUnread),
      wsClient.onConversationCallStarted(handleConversationCallStarted),
      wsClient.onConversationCallEnded(handleConversationCallEnded),
      wsClient.onConversationActiveCalls(handleConversationActiveCalls),
      wsClient.onNudgeReceived(handleNudgeReceived)
    ]

    wsClient.requestActiveCalls()

    return () => {
      unsubs.forEach(unsub => unsub())
    }
  }, [isConnected, wsClient])

  // Mark conversation as read when active conversation changes
  useEffect(() => {
    if (!wsClient || !isConnected) {
      return
    }

    if (activeConversationId) {
      currentConversationIdRef.current = activeConversationId
      conversationsHookRef.current?.markConversationAsRead(activeConversationId)
      wsClient.markConversationAsRead(activeConversationId)
    } else {
      currentConversationIdRef.current = null
    }
  }, [activeConversationId, isConnected, wsClient])

  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      metadata?: Record<string, any>,
      parentId?: string,
      quotedMessageId?: string
    ) => {
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      if (wsClient && isConnected) {
        try {
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
            metadata,
            ...(quotedMessageId && { quotedMessageId }),
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

          startTransition(() => {
            messagesHook.addMessage(optimisticMessage)
            typingHook.stopTyping(conversationId)
          })

          wsClient.sendMessage(conversationId, content, currentUser.id, parentId, metadata, quotedMessageId)

          return optimisticMessage
        } catch {
          // Fall through to REST API fallback
        }
      }

      try {
        const message = await apiClient.sendMessage<Message>(
          conversationId,
          content,
          currentUser.id,
          parentId,
          metadata,
          quotedMessageId
        )
        messagesHook.addMessage(message)
        typingHook.stopTyping(conversationId)
        return message
      } catch (err) {
        throw err
      }
    },
    [messagesHook, typingHook, currentUser, isConnected, wsClient, apiClient]
  )

  const createDirectConversation = useCallback(
    async (userId: string) => {
      try {
        let conversation: Conversation
        try {
          conversation = await apiClient.getOrCreateDirectConversation<Conversation>(userId)
        } catch (err: any) {
          const user = await apiClient.getUserById<User>(userId).catch(() => null)
          if (user?.keycloakId) {
            conversation = await apiClient.getOrCreateDirectConversationByKeycloakId<Conversation>(user.keycloakId)
          } else {
            throw err
          }
        }

        const fullConversation = await apiClient.getConversationById<Conversation>(conversation.id)
        const enrichedConversation = await conversationsHook.addConversation(fullConversation, { fastEnrich: true })
        setActiveConversationId(enrichedConversation.id)

        return enrichedConversation
      } catch (err) {
        throw err
      }
    },
    [conversationsHook, apiClient]
  )

  const createContextConversation = useCallback(
    async (contextEntity: string, contextEntityId: string, name?: string, users?: string[]) => {
      try {
        const conversation = await apiClient.getOrCreateContextConversation<Conversation>({
          contextEntity,
          contextEntityId,
          name,
          users
        })

        const fullConversation = await apiClient.getConversationById<Conversation>(conversation.id)
        const enrichedConversation = await conversationsHook.addConversation(fullConversation, { fastEnrich: true })
        setActiveConversationId(enrichedConversation.id)

        return enrichedConversation
      } catch (err) {
        throw err
      }
    },
    [conversationsHook, apiClient]
  )

  const createAiAgentConversation = useCallback(
    async (contextEntity?: string, contextEntityId?: string, name?: string) => {
      try {
        const conversation = await apiClient.getOrCreateAiAgentConversation<Conversation>({
          contextEntity,
          contextEntityId,
          name
        })

        const fullConversation = await apiClient.getConversationById<Conversation>(conversation.id)
        const enrichedConversation = await conversationsHook.addConversation(fullConversation, { fastEnrich: true })
        setActiveConversationId(enrichedConversation.id)

        return enrichedConversation
      } catch (err) {
        throw err
      }
    },
    [conversationsHook, apiClient]
  )

  const createGroupConversation = useCallback(
    async (
      name: string,
      participantIds: string[],
      description?: string,
      avatarUrl?: string,
      contextEntity?: string,
      contextEntityId?: string
    ) => {
      try {
        const conversation = await apiClient.createGroupConversation<Conversation>({
          name,
          participantIds,
          description,
          avatarUrl,
          contextEntity,
          contextEntityId
        })

        const fullConversation = await apiClient.getConversationById<Conversation>(conversation.id)
        const enrichedConversation = await conversationsHook.addConversation(fullConversation, { fastEnrich: true })
        setActiveConversationId(enrichedConversation.id)

        return enrichedConversation
      } catch (err) {
        throw err
      }
    },
    [conversationsHook, apiClient]
  )

  const setActiveConversation = useCallback(
    async (conversation: Conversation | null) => {
      if (!conversation) {
        setActiveConversationId(null)
        newestMessageTimestampRef.current = 0
        return
      }

      setActiveConversationId(conversation.id)

      const lastMessageTimestamp = conversation.lastMessage?.createdAt
        ? new Date(conversation.lastMessage.createdAt).getTime()
        : 0
      wsClient?.joinConversation(conversation.id, lastMessageTimestamp)

      if (conversation.lastMessage?.createdAt) {
        newestMessageTimestampRef.current = lastMessageTimestamp
      } else {
        const currentMessages = messagesHookRef.current?.messages || []
        if (currentMessages.length > 0) {
          const newestTimestamp = Math.max(...currentMessages.map((m: Message) => new Date(m.createdAt).getTime()))
          newestMessageTimestampRef.current = newestTimestamp
        } else {
          newestMessageTimestampRef.current = 0
        }
      }

      setTimeout(() => {
        messagesHookRef.current?.refresh?.()
      }, 0)

      if (conversation.id) {
        setTimeout(async () => {
          try {
            const fullConversation = await apiClientRef.current!.getConversationById<Conversation>(conversation.id)

            const existingActiveCall = conversation.activeCall || activeCalls[conversation.id]
            if (existingActiveCall) {
              fullConversation.activeCall = existingActiveCall
            }

            if (conversationsHook.enrichConversations) {
              const enriched = await conversationsHook.enrichConversations([fullConversation])
              conversationsHook.updateConversation(conversation.id, enriched[0])
            } else {
              conversationsHook.updateConversation(conversation.id, fullConversation)
            }
          } catch {
            // Continue with the conversation we have
          }
        }, 0)
      }
    },
    [conversationsHook, activeCalls, wsClient]
  )

  const closeConversation = useCallback(
    async (conversationId: string) => {
      if (!currentUser) {
        throw new Error('Chat client not initialized')
      }

      try {
        await apiClient.removeParticipant(conversationId, currentUser.id)

        wsClient?.leaveConversation(conversationId)

        if (activeConversationId === conversationId) {
          setActiveConversationId(null)
        }

        await conversationsHook.loadConversations()

        return true
      } catch (err) {
        throw err
      }
    },
    [conversationsHook, currentUser, activeConversationId, apiClient, wsClient]
  )

  const sendNudge = useCallback(
    (conversationId: string, toUserId: string) => {
      if (!wsClient || !wsClient.isConnected()) {
        return false
      }

      wsClient.sendNudge(conversationId, toUserId)
      return true
    },
    [wsClient]
  )

  const registerNudgeCallback = useCallback(
    (callback: (data: { conversationId: string; fromUserId: string; fromUserName: string }) => void) => {
      nudgeCallbackRef.current = callback
    },
    []
  )

  const markAsUnread = useCallback(
    async (conversationId: string) => {
      await apiClient.markConversationUnread(conversationId)
      if (wsClient && isConnected) {
        wsClient.markConversationAsUnread(conversationId)
      }
      conversationsHook.loadConversations()
    },
    [isConnected, conversationsHook, apiClient, wsClient]
  )

  const clearActiveCallForConversation = useCallback((conversationId: string) => {
    setActiveCalls(prev => {
      if (!(conversationId in prev)) return prev
      const next = { ...prev }
      delete next[conversationId]
      return next
    })
    conversationsHookRef.current?.updateConversation?.(conversationId, {
      activeCall: null
    } as Partial<Conversation>)
  }, [])

  return useMemo(
    () => ({
      isConnected,
      isOffline,
      currentUser,
      activeConversation,
      activeConversationId,
      error,
      conversations: conversationsHook.conversations,
      conversationsLoading: conversationsHook.isLoading,
      conversationsLoadingMore: conversationsHook.isLoadingMore,
      conversationsHasMore: conversationsHook.hasMore,
      conversationsError: conversationsHook.error,
      conversationSearch: conversationsHook.search,
      conversationFilterKind: conversationsHook.filterKind,
      conversationUnreadOnly: conversationsHook.unreadOnly,
      setConversationSearch: conversationsHook.setSearch,
      setConversationFilterKind: conversationsHook.setFilterKind,
      setConversationUnreadOnly: conversationsHook.setUnreadOnly,
      messages: messagesHook.messages,
      messagesLoading: messagesHook.isLoading,
      messagesError: messagesHook.error,
      hasMoreMessages: messagesHook.hasMore,
      typingUsers: typingHook.typingUsers,
      presenceMap: presenceHook.presenceMap,
      presenceVersion: presenceHook.presenceVersion,
      getUserPresence: presenceHook.getUserPresence,
      isUserOnline: presenceHook.isUserOnline,
      updatePresenceFromUser: presenceHook.updatePresenceFromUser,
      updatePresence: presenceHook.updatePresence,
      sendMessage,
      createDirectConversation,
      createContextConversation,
      createAiAgentConversation,
      createGroupConversation,
      setActiveConversation,
      closeConversation,
      loadMoreMessages: messagesHook.loadMore,
      loadMoreConversations: conversationsHook.loadMoreConversations,
      refreshConversations: conversationsHook.loadConversations,
      updateConversation: conversationsHook.updateConversation,
      refreshMessages: messagesHook.refresh,
      updateMessage: messagesHook.updateMessage,
      ensureMessageInList: messagesHook.ensureMessageInList,
      startTyping: typingHook.startTyping,
      stopTyping: typingHook.stopTyping,
      sendNudge,
      registerNudgeCallback,
      markAsUnread,
      clearActiveCallForConversation,
      apiClient,
      wsClient,
      activeCalls
    }),
    [
      isConnected,
      isOffline,
      currentUser,
      activeConversation,
      activeConversationId,
      error,
      conversationsHook.conversations,
      conversationsHook.isLoading,
      conversationsHook.isLoadingMore,
      conversationsHook.hasMore,
      conversationsHook.error,
      conversationsHook.search,
      conversationsHook.filterKind,
      conversationsHook.unreadOnly,
      conversationsHook.updateConversation,
      messagesHook.messages,
      messagesHook.isLoading,
      messagesHook.error,
      messagesHook.hasMore,
      typingHook.typingUsers,
      presenceHook.presenceMap,
      presenceHook.presenceVersion,
      presenceHook.getUserPresence,
      presenceHook.isUserOnline,
      presenceHook.updatePresenceFromUser,
      presenceHook.updatePresence,
      sendMessage,
      createDirectConversation,
      createContextConversation,
      createAiAgentConversation,
      createGroupConversation,
      setActiveConversation,
      closeConversation,
      messagesHook.loadMore,
      conversationsHook.loadMoreConversations,
      conversationsHook.loadConversations,
      messagesHook.refresh,
      messagesHook.updateMessage,
      messagesHook.ensureMessageInList,
      typingHook.startTyping,
      typingHook.stopTyping,
      sendNudge,
      registerNudgeCallback,
      markAsUnread,
      clearActiveCallForConversation,
      apiClient,
      wsClient,
      activeCalls
    ]
  )
}
