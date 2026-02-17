import { useState, useEffect, useCallback, useRef, startTransition, useMemo } from 'react'
import type { ActiveCall, Conversation, Message, User, TypingIndicator } from '../types'
import { MessageType } from '../types'
import { ChatApiClient } from '../services/chatApiClient'
import { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { useConversations } from './useConversations'
import { useMessages } from './useMessages'
import { useTypingIndicator } from './useTypingIndicator'
import { usePresence, type PresenceState, type PresenceData } from './usePresence'

// Shared WebSocket client to prevent duplicate connections
// Multiple Chat instances (e.g., forceMount tabs) will share ONE WebSocket
let sharedWsClient: ChatWebSocketClient | null = null
let sharedWsKey: string | null = null
let sharedWsRefCount = 0 // Track how many components are using the WebSocket

interface UseChatClientOptions {
  accessToken: string
  apiUrl: string
  wsUrl: string
  wsSocketPath?: string
}

export function useChatClient({ accessToken, apiUrl, wsUrl, wsSocketPath }: UseChatClientOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [activeCalls, setActiveCalls] = useState<Record<string, ActiveCall>>({})

  const apiClientRef = useRef<ChatApiClient | null>(null)
  const wsClientRef = useRef<ChatWebSocketClient | null>(null)
  const currentConversationIdRef = useRef<string | null>(null)
  const activeConversationIdRef = useRef<string | null>(null)
  const activeCallsRef = useRef<Record<string, ActiveCall>>({})

  // Use state for API client to trigger re-renders in hooks
  const [apiClientState, setApiClientState] = useState<ChatApiClient | null>(null)

  // Refs for hooks to avoid stale closures
  const conversationsHookRef = useRef<any>(null)
  const messagesHookRef = useRef<any>(null)
  const typingHookRef = useRef<any>(null)
  const currentUserRef = useRef<User | null>(null)
  const nudgeCallbackRef = useRef<
    ((data: { conversationId: string; fromUserId: string; fromUserName: string }) => void) | null
  >(null)
  const shouldRefreshConversationsOnConnectRef = useRef(false)

  // Track processed message IDs to prevent duplicate processing
  const processedMessageIdsRef = useRef<Set<string>>(new Set())

  // PERFORMANCE: Track the newest message timestamp from API/cache to filter WebSocket duplicates
  // When we load messages via API/cache, WebSocket also sends the same historical messages
  // We can skip WebSocket messages that are older than the newest message we already have
  const newestMessageTimestampRef = useRef<number>(0)

  // Keep refs in sync
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  useEffect(() => {
    activeCallsRef.current = activeCalls
  }, [activeCalls])

  // Initialize API client
  useEffect(() => {
    if (accessToken) {
      const client = new ChatApiClient(apiUrl, accessToken)
      apiClientRef.current = client
      setApiClientState(client)

      // PERFORMANCE FIX: Fetch current user but don't block on it
      // The user data is needed, but conversations can load in parallel
      client
        .getCurrentUser()
        .then(user => {
          setCurrentUser(user)
          setError(null)
        })
        .catch(err => {
          // Detect error type and set appropriate message
          let errorMessage = 'chat.serviceUnavailable'

          if (err?.response?.status === 404) {
            errorMessage = 'chat.serviceNotFound'
          } else if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNREFUSED') {
            errorMessage = 'chat.serviceUnavailable'
          } else if (err?.response?.status === 401 || err?.response?.status === 403) {
            errorMessage = 'chat.authenticationFailed'
          }

          const error = new Error(errorMessage)
          error.name = errorMessage
          setError(error)
        })
    } else {
      apiClientRef.current = null
      setApiClientState(null)
    }
  }, [accessToken, apiUrl])

  // Use hooks for conversations and messages (must be called unconditionally, BEFORE any useEffect that uses them)
  const conversationsHook = useConversations({
    apiClient: apiClientState || undefined,
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
    enabled: !!apiClientState && !!activeConversationId,
    onMessagesLoaded: (messageIds: string[]) => {
      // Mark all loaded message IDs as processed to prevent WebSocket duplicates
      messageIds.forEach(id => processedMessageIdsRef.current.add(id))
    }
  })

  // PERFORMANCE: Update newest message timestamp when messages are loaded
  useEffect(() => {
    if (messagesHook.messages.length > 0 && activeConversationId) {
      const newestTimestamp = Math.max(...messagesHook.messages.map((m: Message) => new Date(m.createdAt).getTime()))
      newestMessageTimestampRef.current = newestTimestamp
    }
    // Don't reset to 0 when empty - keep the timestamp from setActiveConversation
  }, [messagesHook.messages, activeConversationId])

  // Note: Conversations are automatically loaded by useConversations hook when apiClient is ready.
  // Avoid manually calling loadConversations here to prevent duplicate initial requests.

  const typingHook = useTypingIndicator({
    onTypingStart: conversationId => {
      wsClientRef.current?.sendTypingStart(conversationId)
    },
    onTypingStop: conversationId => {
      wsClientRef.current?.sendTypingStop(conversationId)
    }
  })

  // Presence tracking hook (with global cache)
  // IMPORTANT: Reuses the existing WebSocket connection from useChatClient
  const presence = usePresence({
    wsClient: wsClientRef.current,
    currentUserId: currentUser?.id || null
  })

  // Build presence map for efficient lookups (memoized by presenceVersion)
  const presenceMap = useMemo(() => {
    const map = new Map<string, PresenceData>()
    const rawMap = presence.getPresenceMap()

    rawMap.forEach((data, userId) => {
      map.set(userId, {
        state: data.state,
        lastSeen: data.lastSeen,
        userStatus: data.userStatus // Include detailed status information
      })
    })

    return map
  }, [presence.presenceVersion, presence.getPresenceMap])

  // Adapter layer - keep functions for backward compatibility, but recommend using presenceMap
  const presenceHook = {
    // RECOMMENDED: Use presenceMap directly for best performance
    presenceMap,
    presenceVersion: presence.presenceVersion,

    // Legacy methods (kept for backward compatibility, but prefer presenceMap)
    getUserPresence: useCallback(
      (userId: string): PresenceData | { state: 'offline' } => {
        // Direct lookup from memoized map - returns full PresenceData including userStatus
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
        // Handle different input formats for backward compatibility
        if ('state' in presenceStatus) {
          // Has 'state' property - could be PresenceData or simple state object
          const state = presenceStatus.state as PresenceState
          // Use type narrowing to check for optional properties
          const lastSeen = 'lastSeen' in presenceStatus ? presenceStatus.lastSeen : undefined
          const userStatus = 'userStatus' in presenceStatus ? presenceStatus.userStatus : undefined
          presence.updatePresence(userId, state, lastSeen, userStatus)
        } else if ('status' in presenceStatus) {
          // Legacy status object with 'status' property
          const state = presenceStatus.status as PresenceState
          presence.updatePresence(userId, state)
        }
      },
      [presence]
    ),
    // Backward compatibility method
    updatePresenceFromUser: useCallback(
      (userId: string, lastSeen?: Date | string, isOnline?: boolean) => {
        const state: PresenceState = isOnline ? 'online' : 'offline'
        // Convert Date to ISO string if needed
        const lastSeenString = lastSeen instanceof Date ? lastSeen.toISOString() : lastSeen

        if (process.env.NODE_ENV === 'development') {
          // Updating presence from user data
        }

        presence.updatePresence(userId, state, lastSeenString)
      },
      [presence]
    ),
    // Remove legacy empty map
    clearPresence: () => {}
  }

  // Keep hook refs up to date
  useEffect(() => {
    conversationsHookRef.current = conversationsHook
    messagesHookRef.current = messagesHook
    typingHookRef.current = typingHook
  })

  // Initialize WebSocket client (singleton to prevent duplicate connections)
  useEffect(() => {
    if (!accessToken || !apiClientRef.current) {
      return
    }

    const key = `${wsUrl}|${wsSocketPath || '/socket.io'}|${accessToken}`

    // Check if we have an existing WebSocket connection
    if (sharedWsClient) {
      // If the key matches, reuse the existing connection
      if (sharedWsKey === key) {
        wsClientRef.current = sharedWsClient
        sharedWsRefCount++ // Increment reference count

        // CRITICAL: Set isConnected to trigger event listener setup for this instance
        if (sharedWsClient.isConnected()) {
          setIsConnected(true)
        }

        // Return cleanup function that decrements ref count
        return () => {
          sharedWsRefCount--

          // Only disconnect when NO components are using it anymore
          if (sharedWsRefCount <= 0) {
            sharedWsClient?.disconnect()
            sharedWsClient = null
            sharedWsKey = null
            sharedWsRefCount = 0
          }
        }
      } else {
        // Key changed - disconnect old connection before creating new one
        sharedWsClient.disconnect()
        sharedWsClient = null
        sharedWsKey = null
        sharedWsRefCount = 0
      }
    }

    // Create new WebSocket client
    const client = new ChatWebSocketClient(wsUrl, { path: wsSocketPath })
    sharedWsClient = client
    sharedWsKey = key
    sharedWsRefCount = 1 // Initialize ref count to 1
    wsClientRef.current = client
    const socket = client.connect(accessToken)

    // CRITICAL FIX: Define handlers as named functions so we can properly clean them up
    const handleConnect = async () => {
      setIsConnected(true)
      setIsOffline(false)
      setError(null)

      // Refresh conversations after WebSocket connects to get accurate unread counts
      // This ensures unread counts reflect messages received while offline
      // Only refresh on reconnect (avoid duplicate initial load on first connect)
      // Small delay to allow initial connection to stabilize
      if (shouldRefreshConversationsOnConnectRef.current) {
        shouldRefreshConversationsOnConnectRef.current = false
        setTimeout(() => {
          if (conversationsHookRef.current?.conversations?.length) {
            conversationsHookRef.current.loadConversations?.()
          }
        }, 500)
      }
    }

    const handleDisconnect = () => {
      console.warn('[useChatClient] ⚠️ WebSocket disconnected')
      setIsConnected(false)
      setIsOffline(true)
      shouldRefreshConversationsOnConnectRef.current = true
    }

    const handleError = (error: any) => {
      console.error('[useChatClient] ❌ WebSocket error:', error)
      setIsOffline(true)
      // Don't set full error for WebSocket issues, just mark as offline
    }

    // CRITICAL FIX: Remove ALL existing handlers before adding new ones
    // This prevents duplicate handlers when effect re-runs (e.g., activeConversationId changes)
    socket.off('connect')
    socket.off('disconnect')
    socket.off('error')

    // Now register our handlers
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('error', handleError)

    return () => {
      // CRITICAL FIX: Clean up event handlers
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('error', handleError)

      sharedWsRefCount--

      // Only disconnect when NO components are using it anymore
      if (sharedWsRefCount <= 0) {
        wsClientRef.current?.disconnect()
        sharedWsClient = null
        sharedWsKey = null
        sharedWsRefCount = 0
      }
    }
  }, [accessToken, wsUrl, wsSocketPath])

  // Update currentConversationIdRef when activeConversationId changes
  // This doesn't require recreating the WebSocket connection
  useEffect(() => {
    if (activeConversationId && isConnected) {
      currentConversationIdRef.current = activeConversationId
    }
  }, [activeConversationId, isConnected])

  // Setup WebSocket event listeners
  useEffect(() => {
    if (!wsClientRef.current || !isConnected) {
      // Clear processed messages when disconnected
      processedMessageIdsRef.current.clear()
      setActiveCalls({})
      return
    }

    const wsClient = wsClientRef.current

    // Clear processed messages on new connection to allow fresh processing
    processedMessageIdsRef.current.clear()

    // Message handlers
    // OPTIMIZATION: Pre-define status priority outside handler to avoid recreating on every message
    const STATUS_PRIORITY = { sent: 1, delivered: 2, read: 3 } as const

    const handleNewMessage = (message: Message) => {
      // CRITICAL OPTIMIZATION: Immediate duplicate check and early returns
      // Skip if already processed
      if (processedMessageIdsRef.current.has(message.id)) {
        return
      }
      processedMessageIdsRef.current.add(message.id)

      // PERFORMANCE: Skip old WebSocket messages that we already loaded from API/cache
      const currentActiveConversationId = activeConversationIdRef.current
      if (message.conversationId === currentActiveConversationId) {
        const messageTimestamp = new Date(message.createdAt).getTime()
        const newestWeHave = newestMessageTimestampRef.current

        if (messageTimestamp <= newestWeHave && newestWeHave > 0) {
          return // Skip - we already have this message
        }

        // Update the newest timestamp for this conversation
        newestMessageTimestampRef.current = messageTimestamp
      }

      // OPTIMIZATION: Queue ALL logic asynchronously - handler returns immediately
      queueMicrotask(() => {
        // Clean up old message IDs (keep only last 100)
        if (processedMessageIdsRef.current.size > 150) {
          const ids = Array.from(processedMessageIdsRef.current)
          processedMessageIdsRef.current = new Set(ids.slice(-100))
        }

        // Determine status based on context
        let messageStatus = message.status || 'sent'

        const currentUser = currentUserRef.current
        const isOwnMessage = currentUser && message.senderId === currentUser.id
        const isOtherUserMessage = currentUser && message.senderId !== currentUser.id

        // Check if it's a system message (no sender)
        const isSystemMessage = !message.senderId || message.type === 'system'

        // Use ref to get current active conversation (not stale closure value)
        const currentActiveConversationId = activeConversationIdRef.current

        // Handle system messages (call started/ended, meeting minutes, etc.)
        if (isSystemMessage) {
          // System messages don't need status updates or read receipts
          const messageWithStatus = { ...message, status: message.status || 'sent' }

          // OPTIMIZATION: Defer UI updates to not block the message handler
          startTransition(() => {
            // Update conversation list
            conversationsHookRef.current?.updateConversationLastMessage(message.conversationId, messageWithStatus)

            // Add message to chat view if it's for the active conversation
            if (message.conversationId === currentActiveConversationId) {
              messagesHookRef.current?.addMessage(messageWithStatus)
            }
          })

          return // Exit early - system messages don't need further processing
        }

        // Stop typing indicator for this user when they send a message
        if (isOtherUserMessage) {
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
          // OPTIMIZATION: Only search messages if it's for the active conversation
          if (message.conversationId === currentActiveConversationId) {
            const existingMessages = messagesHookRef.current?.messages || []

            // OPTIMIZATION: Use reverse for-loop with early break (faster than find())
            let existingMessage = null

            for (let i = existingMessages.length - 1; i >= 0; i--) {
              const m = existingMessages[i] as any
              // Check real ID match first (most common case)
              if (m.id === message.id) {
                existingMessage = m
                break // Found exact match, stop searching
              }
              // Only check temp ID if we haven't found a real match
              if (
                m.id.startsWith('temp-') &&
                m.content === message.content &&
                m.conversationId === message.conversationId
              ) {
                existingMessage = m
                // Don't break here - keep looking for real ID match
              }
            }

            // If message already exists (either real ID or temp ID match), handle carefully
            if (existingMessage) {
              // If exact ID match and message already has status, it's a duplicate - skip it
              if (existingMessage.id === message.id && existingMessage.status) {
                return
              }
              // If it's a temp message being replaced, we'll let addMessage handle it
              // addMessage has proper logic to replace temp with real message
            }

            // Preserve better status if it exists (delivered > sent, read > delivered)
            if (existingMessage && existingMessage.status) {
              const existingPriority = STATUS_PRIORITY[existingMessage.status as keyof typeof STATUS_PRIORITY] || 0
              const incomingPriority = STATUS_PRIORITY[(message.status || 'sent') as keyof typeof STATUS_PRIORITY] || 1

              if (existingPriority >= incomingPriority) {
                // Keep the better or equal existing status
                messageStatus = existingMessage.status
              } else {
                // Use the new status if it's better
                messageStatus = message.status || 'sent'
              }
            } else {
              // No existing message, use incoming status or default to 'sent'
              messageStatus = message.status || 'sent'
            }
          } else {
            // For background conversations, just use the incoming status
            messageStatus = message.status || 'sent'
          }
        }

        // Create updated message with correct status
        const messageWithStatus = { ...message, status: messageStatus }

        if (process.env.NODE_ENV === 'development' && isOwnMessage) {
          // Processing own message with status
        }

        // OPTIMIZATION: Defer ALL UI updates to not block the message handler
        // Use startTransition to make conversation list updates non-blocking
        startTransition(() => {
          // Update conversation list (now deferred and non-blocking)
          conversationsHookRef.current?.updateConversationLastMessage(message.conversationId, messageWithStatus)

          // Increment unread count ONLY for messages from OTHER users in background conversations
          if (isOtherUserMessage && message.conversationId !== currentActiveConversationId) {
            conversationsHookRef.current?.incrementUnreadCount(message.conversationId)
          }

          // Add message to chat view if it's for the active conversation
          if (message.conversationId === currentActiveConversationId) {
            messagesHookRef.current?.addMessage(messageWithStatus)
          }
        })
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
      if (process.env.NODE_ENV === 'development') {
        // message:delivered event received
      }

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

        if (process.env.NODE_ENV === 'development') {
          // Found message for delivery update
        }

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

          if (process.env.NODE_ENV === 'development') {
            // Updated message status to delivered
          }
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

          // Preserve activeCall state from ref (API doesn't track this)
          const currentActiveCall = activeCallsRef.current[data.conversationId]
          if (currentActiveCall) {
            conversation.activeCall = currentActiveCall
          }

          // Fast enrichment - only add avatars (non-blocking, from cache)
          // getConversationById already returns full user data, so no need for user data fetch
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

      // IMPORTANT: Clear calls that disappeared from the snapshot.
      // If we missed a call-ended event (sleep/disconnect/reconnect), UI would otherwise stay stale until refresh.
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
      // Update unread count to 0 for this conversation
      // This syncs read status across all tabs/devices for the current user
      conversationsHookRef.current?.markConversationAsRead(data.conversationId)
    }

    const handleNudgeReceived = (data: { conversationId: string; fromUserId: string; fromUserName: string }) => {
      // Trigger nudge notification callback if registered
      if (nudgeCallbackRef.current) {
        nudgeCallbackRef.current(data)
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
    wsClient.onConversationRead(handleConversationRead)

    wsClient.onConversationCallStarted(handleConversationCallStarted)
    wsClient.onConversationCallEnded(handleConversationCallEnded)
    wsClient.onConversationActiveCalls(handleConversationActiveCalls)
    wsClient.onNudgeReceived(handleNudgeReceived)

    // Request initial active calls snapshot
    wsClient.requestActiveCalls()

    return () => {
      wsClient.off('new_message', handleNewMessage)
      wsClient.off('message:updated', handleMessageUpdated)
      wsClient.off('message:deleted', handleMessageDeleted)
      wsClient.off('user_typing', handleUserTyping)
      wsClient.off('message:delivered', handleMessageDelivered)
      wsClient.off('message:read', handleMessageRead)
      wsClient.off('conversation_updated', handleConversationUpdated)
      wsClient.off('conversation_created', handleConversationCreated)
      wsClient.off('conversation:read', handleConversationRead)
      wsClient.off('conversation:call-started', handleConversationCallStarted)
      wsClient.off('conversation:call-ended', handleConversationCallEnded)
      wsClient.off('conversation:active-calls', handleConversationActiveCalls)
      wsClient.off('nudge:received', handleNudgeReceived)
    }
  }, [isConnected]) // Only re-register when connection changes, all other values accessed via refs

  // Mark conversation as read when active conversation changes
  // NOTE: We DON'T need to join conversations - the backend automatically joins us to ALL conversations on connect
  // Users stay in all conversation rooms to receive real-time updates
  useEffect(() => {
    if (!wsClientRef.current || !isConnected) {
      return
    }

    if (activeConversationId) {
      currentConversationIdRef.current = activeConversationId
      // Optimistically update UI immediately
      conversationsHookRef.current?.markConversationAsRead(activeConversationId)

      // Mark as read via WebSocket (replaces old API call)
      // This will:
      // 1. Update database via backend
      // 2. Broadcast to all user's connected clients (tabs/devices)
      // 3. Trigger handleConversationRead which updates UI across all sessions
      wsClientRef.current.markConversationAsRead(activeConversationId)
    } else {
      // Back to conversation list
      currentConversationIdRef.current = null
    }
  }, [activeConversationId, isConnected])

  const sendMessage = useCallback(
    async (conversationId: string, content: string, metadata?: Record<string, any>) => {
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
            metadata,
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
          wsClientRef.current.sendMessage(conversationId, content, currentUser.id, undefined, metadata)

          // The real message will be received via WebSocket 'new_message' event
          // and will replace the optimistic one
          // Note: Backend should persist the message to database when received via WebSocket
          // If message doesn't appear after refresh, backend persistence may be failing
          return optimisticMessage
        } catch {
          // Fall through to REST API fallback
        }
      }

      // Fallback to REST API if WebSocket is not available

      if (!apiClientRef.current) {
        throw new Error('Chat client not initialized')
      }

      try {
        const message = await apiClientRef.current.sendMessage(
          conversationId,
          content,
          currentUser.id,
          undefined,
          metadata
        )
        messagesHook.addMessage(message)
        typingHook.stopTyping(conversationId)
        return message
      } catch (err) {
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
        // Add and enrich conversation (fast - avatars only, non-blocking)
        // getConversationById already returns full user data
        const enrichedConversation = await conversationsHook.addConversation(fullConversation, { fastEnrich: true })
        setActiveConversationId(enrichedConversation.id)

        return enrichedConversation
      } catch (err) {
        throw err
      }
    },
    [conversationsHook]
  )

  const createContextConversation = useCallback(
    async (contextEntity: string, contextEntityId: string, name?: string, users?: string[]) => {
      if (!apiClientRef.current) {
        throw new Error('Chat client not initialized')
      }

      try {
        // Create or get existing context conversation
        const conversation = await apiClientRef.current.getOrCreateContextConversation({
          contextEntity,
          contextEntityId,
          name,
          users
        })

        // Reload conversation with full participant data including user objects
        const fullConversation = await apiClientRef.current.getConversationById(conversation.id)
        // Add and enrich conversation (fast - avatars only, non-blocking)
        // getConversationById already returns full user data
        const enrichedConversation = await conversationsHook.addConversation(fullConversation, { fastEnrich: true })
        setActiveConversationId(enrichedConversation.id)

        return enrichedConversation
      } catch (err) {
        throw err
      }
    },
    [conversationsHook]
  )

  const createAiAgentConversation = useCallback(
    async (contextEntity?: string, contextEntityId?: string, name?: string) => {
      if (!apiClientRef.current) {
        throw new Error('Chat client not initialized')
      }

      try {
        // Create or get existing AI agent conversation
        const conversation = await apiClientRef.current.getOrCreateAiAgentConversation({
          contextEntity,
          contextEntityId,
          name
        })

        // Reload conversation with full participant data including user objects
        const fullConversation = await apiClientRef.current.getConversationById(conversation.id)
        // Add and enrich conversation (fast - avatars only, non-blocking)
        // getConversationById already returns full user data
        const enrichedConversation = await conversationsHook.addConversation(fullConversation, { fastEnrich: true })
        setActiveConversationId(enrichedConversation.id)

        return enrichedConversation
      } catch (err) {
        throw err
      }
    },
    [conversationsHook]
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
      if (!apiClientRef.current) {
        throw new Error('Chat client not initialized')
      }

      try {
        // Create new group conversation
        const conversation = await apiClientRef.current.createGroupConversation({
          name,
          participantIds,
          description,
          avatarUrl,
          contextEntity,
          contextEntityId
        })

        // Reload conversation with full participant data including user objects
        const fullConversation = await apiClientRef.current.getConversationById(conversation.id)
        // Add and enrich conversation (fast - avatars only, non-blocking)
        // getConversationById already returns full user data
        const enrichedConversation = await conversationsHook.addConversation(fullConversation, { fastEnrich: true })
        setActiveConversationId(enrichedConversation.id)

        return enrichedConversation
      } catch (err) {
        throw err
      }
    },
    [conversationsHook]
  )

  const setActiveConversation = useCallback(
    async (conversation: Conversation | null) => {
      if (!conversation) {
        setActiveConversationId(null)
        newestMessageTimestampRef.current = 0
        return
      }

      // OPTIMIZATION: Set conversation ID immediately (non-blocking UI update)
      // This allows the UI to show the conversation view instantly
      setActiveConversationId(conversation.id)

      // Set initial timestamp to filter out historical WebSocket messages
      if (conversation.lastMessage?.createdAt) {
        const lastMessageTimestamp = new Date(conversation.lastMessage.createdAt).getTime()
        newestMessageTimestampRef.current = lastMessageTimestamp
      } else {
        // Fallback to already-loaded messages
        const currentMessages = messagesHookRef.current?.messages || []
        if (currentMessages.length > 0) {
          const newestTimestamp = Math.max(...currentMessages.map((m: Message) => new Date(m.createdAt).getTime()))
          newestMessageTimestampRef.current = newestTimestamp
        } else {
          newestMessageTimestampRef.current = 0
        }
      }

      // NOTE: Backend handles read receipts when conversation is opened
      // Frontend relies on participant.lastReadAt timestamps for message status calculation
      // WebSocket events (message:delivered, message:read) update status in real-time

      // OPTIMIZATION: Defer expensive API calls and enrichment
      // Do this in the background without blocking the click handler
      if (apiClientRef.current && conversation.id) {
        // Use setTimeout to defer to next event loop (non-blocking)
        setTimeout(async () => {
          try {
            const fullConversation = await apiClientRef.current!.getConversationById(conversation.id)

            // Preserve activeCall from existing conversation or activeCalls map
            const existingActiveCall = conversation.activeCall || activeCalls[conversation.id]
            if (existingActiveCall) {
              fullConversation.activeCall = existingActiveCall
            }

            // Enrich conversation before updating (background task)
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
    [conversationsHook, activeCalls]
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
        throw err
      }
    },
    [conversationsHook, currentUser, activeConversationId]
  )

  const sendNudge = useCallback((conversationId: string, toUserId: string) => {
    if (!wsClientRef.current || !wsClientRef.current.isConnected()) {
      return false
    }

    wsClientRef.current.sendNudge(conversationId, toUserId)
    return true
  }, [])

  const registerNudgeCallback = useCallback(
    (callback: (data: { conversationId: string; fromUserId: string; fromUserName: string }) => void) => {
      nudgeCallbackRef.current = callback
    },
    []
  )

  // PERFORMANCE: Memoize the return object to prevent unnecessary re-renders in Chat component
  // Only recreate when actual values change, not on every render
  return useMemo(
    () => ({
      // State
      isConnected,
      isOffline,
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
      // Presence
      presenceMap: presenceHook.presenceMap,
      presenceVersion: presenceHook.presenceVersion,
      getUserPresence: presenceHook.getUserPresence,
      isUserOnline: presenceHook.isUserOnline,
      updatePresenceFromUser: presenceHook.updatePresenceFromUser,
      updatePresence: presenceHook.updatePresence,
      // Actions
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
      refreshMessages: messagesHook.refresh,
      startTyping: typingHook.startTyping,
      stopTyping: typingHook.stopTyping,
      sendNudge,
      registerNudgeCallback,
      // Clients (for advanced usage)
      apiClient: apiClientRef.current,
      wsClient: wsClientRef.current,
      activeCalls
    }),
    [
      // State dependencies
      isConnected,
      isOffline,
      currentUser,
      activeConversation,
      activeConversationId,
      error,
      // Conversations
      conversationsHook.conversations,
      conversationsHook.isLoading,
      conversationsHook.isLoadingMore,
      conversationsHook.hasMore,
      conversationsHook.error,
      // Messages
      messagesHook.messages,
      messagesHook.isLoading,
      messagesHook.error,
      messagesHook.hasMore,
      // Typing
      typingHook.typingUsers,
      // Presence (callbacks are stable from useCallback)
      presenceHook.presenceMap,
      presenceHook.presenceVersion,
      presenceHook.getUserPresence,
      presenceHook.isUserOnline,
      presenceHook.updatePresenceFromUser,
      presenceHook.updatePresence,
      // Actions (all are useCallback and stable)
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
      typingHook.startTyping,
      typingHook.stopTyping,
      sendNudge,
      registerNudgeCallback,
      // Clients (refs are stable)
      apiClientRef.current,
      wsClientRef.current,
      activeCalls
    ]
  )
}
