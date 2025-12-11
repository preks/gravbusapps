import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useChatClient } from './hooks/useChatClient'
import { useCall } from './hooks/useCall'
import { useGroupCall } from './hooks/useGroupCall'
import { useEveryAIChat } from './hooks/useEveryAIChat'
import { ConversationList } from './components/ConversationList'
import { ConversationHeader, type ActiveCallInfo } from './components/ConversationHeader'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import { CreateGroupModal } from './components/CreateGroupModal'
import { GroupSettingsModal } from './components/GroupSettingsModal'
import { AIThinkingIndicator, AIResponseRenderer } from './components/AIResponseRenderer'
import { IncomingCallDialog } from './components/IncomingCallDialog'
import { IncomingGroupCallDialog } from './components/IncomingGroupCallDialog'
import { CallModal } from './components/CallModal'
import { GroupCallModal } from './components/GroupCallModal'
// import { initGlobalMinimizedCallRenderer } from './components/GlobalMinimizedCall'
import type { Conversation, User, MessageEntityReference } from './types'
import type { CallParticipant } from './services/webrtcClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { env } from '@/common/env/EnvUtils'

type ViewMode = 'full' | 'compact' | 'mobile'

interface ChatProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Chat: React.FC<ChatProps> = ({ accessToken: accessTokenProp, prefixDataTestId = 'chat' }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showConversationList, setShowConversationList] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('full')
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draftMessage, setDraftMessage] = useState<string>('')
  const registerMentionEntityRef = useRef<((entity: any, text: string, startIndex: number) => any) | null>(null)
  const focusInputRef = useRef<(() => void) | null>(null)
  const urlContextProcessed = useRef(false)
  const conversationIdFromUrlProcessed = useRef(false)
  const activeConversationIdRef = useRef<string | null>(null)

  // Reset URL processing refs on mount to allow restoration after hard refresh
  useEffect(() => {
    // Only reset if there's a conversationId in URL (user refreshed with a conversation open)
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('conversationId')) {
      conversationIdFromUrlProcessed.current = false
    }
  }, [])

  // Initialize global minimized call renderer once on mount
  // This ensures the minimized call persists even when Chat unmounts
  // TEMPORARILY DISABLED - causing portal conflicts
  // useEffect(() => {
  //   initGlobalMinimizedCallRenderer()
  // }, [])

  // Stabilize accessToken - only update state when VALUE actually changes
  // This prevents re-renders caused by the platform passing new string references
  const [stableAccessToken, setStableAccessToken] = useState(accessTokenProp)
  const prevAccessTokenRef = useRef(accessTokenProp)

  useEffect(() => {
    // Only update if the actual value changed, not just the reference
    if (accessTokenProp !== prevAccessTokenRef.current) {
      prevAccessTokenRef.current = accessTokenProp
      setStableAccessToken(accessTokenProp)
    }
  }, [accessTokenProp])

  // Use the stable token throughout the component
  const accessToken = stableAccessToken

  let baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

  // If running on localhost, connect to DEV environment
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  if (isLocalhost) {
    baseUrl = 'https://newwork-dev.newwork.com'
    console.log('🔄 [Chat] Local development detected - connecting to DEV environment:', baseUrl)
  }

  // Normalize API and WS endpoints; connect to chat-service namespace with default socket path
  let apiUrl = env('NEXT_PUBLIC_CHAT_API') || `${baseUrl}/chat-service/api/v1` || ''

  // Override if NEXT_PUBLIC_CHAT_API is pointing to localhost when running locally
  if (isLocalhost && apiUrl.includes('localhost')) {
    apiUrl = `${baseUrl}/chat-service/api/v1`
    console.log('🔄 [Chat] Overriding localhost CHAT_API to use DEV environment:', apiUrl)
  }

  const wsUrl = `${baseUrl}/chat-service` // namespace in URL (matches gateway)
  // Ensure Socket.IO path keeps /chat-service prefix (Kong strip-path=true compatible)
  const wsSocketPath = env('NEXT_PUBLIC_CHAT_WS_PATH') || '/chat-service/socket.io'

  console.log('📍 [Chat] Final connection URLs:', { apiUrl, wsUrl, wsSocketPath })

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
    presenceMap,
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
    apiClient,
    wsClient,
    activeCalls
  } = chatClient

  // Keep last known active conversation to avoid transient unmounts when list refreshes
  const lastActiveConversationRef = useRef<typeof activeConversation>(null)
  const stableActiveConversation =
    activeConversation ||
    (activeConversationId && lastActiveConversationRef.current?.id === activeConversationId
      ? lastActiveConversationRef.current
      : null)
  useEffect(() => {
    if (activeConversation) {
      lastActiveConversationRef.current = activeConversation
    }
  }, [activeConversation])

  // Log for diagnostics
  useEffect(() => {
    console.debug('[Chat] stableActiveConversation', stableActiveConversation?.id)
  }, [stableActiveConversation?.id])

  // Convert current user to CallParticipant format
  const currentUserAsParticipant: CallParticipant | null = useMemo(() => {
    if (!currentUser) return null
    return {
      id: currentUser.id,
      odId: currentUser.id,
      odName:
        currentUser.displayName ||
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
        currentUser.username ||
        'Unknown',
      avatarUrl: currentUser.avatarUrl
    }
  }, [currentUser])

  // Available participants for adding to a call (from the active conversation)
  const availableParticipantsForCall = useMemo(() => {
    if (!activeConversation?.participants) return []
    return activeConversation.participants
      .filter(p => p.user) // Only include participants with user data
      .map(p => ({
        id: p.user!.id,
        odId: p.user!.id,
        odName:
          p.user!.displayName ||
          `${p.user!.firstName || ''} ${p.user!.lastName || ''}`.trim() ||
          p.user!.username ||
          'Unknown',
        avatarUrl: p.user!.avatarUrl
      }))
  }, [activeConversation?.participants])

  // 1:1 Call functionality
  const {
    callState,
    isInCall,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    localStream,
    remoteStream
  } = useCall({
    wsClient: wsClient || null,
    apiClient: apiClient || null,
    currentUser: currentUserAsParticipant,
    onCallStarted: (callId, participant) => {
      console.debug('1:1 Call started:', callId, participant)
    },
    onCallEnded: (callId, duration) => {
      console.debug('1:1 Call ended:', callId, 'Duration:', duration, 'ms')
    }
  })

  // Group Call functionality
  const {
    callState: groupCallState,
    isInCall: isInGroupCall,
    localStream: groupLocalStream,
    remoteStreams: groupRemoteStreams,
    participants: groupParticipants,
    incomingInvite: incomingGroupCallInvite,
    startCall: startGroupCall,
    joinCall: joinGroupCall,
    acceptInvite: acceptGroupInvite,
    declineInvite: declineGroupInvite,
    leaveCall: leaveGroupCall,
    toggleMute: toggleGroupMute,
    toggleVideo: toggleGroupVideo,
    toggleScreenShare: toggleGroupScreenShare,
    setVideoQuality: setGroupVideoQuality,
    toggleMinimize: toggleGroupMinimize,
    toggleBackground: toggleGroupBackground,
    inviteToCall: inviteToGroupCall,
    reconnectParticipant: reconnectGroupParticipant,
    getConnectionDiagnostics: getGroupConnectionDiagnostics,
    pendingInvites: groupPendingInvites
  } = useGroupCall({
    wsClient: wsClient || null,
    apiClient: apiClient || null,
    currentUser: currentUserAsParticipant,
    onCallStarted: (roomId, participants) => {
      console.debug('Group call started:', roomId, participants.length, 'participants')
    },
    onCallEnded: (roomId, duration) => {
      console.debug('Group call ended:', roomId, 'Duration:', duration, 'ms')
    },
    onParticipantJoined: participant => {
      console.debug('Participant joined group call:', participant.odName)
    },
    onParticipantLeft: participantId => {
      console.debug('Participant left group call:', participantId)
    }
  })

  // Combined in-call state
  const isInAnyCall = isInCall || isInGroupCall

  // Every AI integration for @Every mentions in group chats
  const {
    hasEveryMention,
    processMessage: processEveryAIMessage,
    isProcessing: isAIProcessing,
    streamingText: aiStreamingText,
    clearStreamingText
  } = useEveryAIChat({
    accessToken
  })

  // Call handlers for both direct (1:1) and group conversations
  const handleAudioCall = () => {
    if (!activeConversation) return

    // For direct conversations, use 1:1 call
    if (activeConversation.type === 'direct') {
      const otherParticipant = activeConversation.participants?.find(
        p => p.userId !== currentUser?.id && p.user?.id !== currentUser?.id
      )
      if (!otherParticipant?.user) return
      const user = otherParticipant.user
      initiateCall(
        {
          id: user.id,
          odId: user.id,
          odName:
            user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
          avatarUrl: user.avatarUrl
        },
        'audio',
        activeConversation.id
      )
    } else if (activeConversation.type === 'group') {
      // For group conversations, use group call
      handleGroupCall('audio')
    }
  }

  const handleVideoCall = () => {
    if (!activeConversation) return

    // For direct conversations, use 1:1 call
    if (activeConversation.type === 'direct') {
      const otherParticipant = activeConversation.participants?.find(
        p => p.userId !== currentUser?.id && p.user?.id !== currentUser?.id
      )
      if (!otherParticipant?.user) return
      const user = otherParticipant.user
      initiateCall(
        {
          id: user.id,
          odId: user.id,
          odName:
            user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
          avatarUrl: user.avatarUrl
        },
        'video',
        activeConversation.id
      )
    } else if (activeConversation.type === 'group') {
      // For group conversations, use group call
      handleGroupCall('video')
    }
  }

  // Handler for group calls (from group conversations)
  // isJoiningExisting: true when joining an existing active call (don't ring others)
  const handleGroupCall = (callType: 'audio' | 'video', isJoiningExisting: boolean = false) => {
    if (!activeConversation || activeConversation.type !== 'group') return
    if (!currentUser) return

    // Check if there's already an active call in this conversation
    const existingCall = activeCalls[activeConversation.id]
    const shouldJoinExisting = isJoiningExisting || !!existingCall

    if (shouldJoinExisting) {
      // Join the existing call without ringing everyone
      console.debug('Joining existing group call in conversation:', activeConversation.id)
      joinGroupCall(activeConversation.id, callType)
    } else {
      // Get all participants including current user
      const callParticipants: CallParticipant[] =
        activeConversation.participants
          ?.filter(p => p.user)
          .map(p => ({
            id: p.user!.id,
            odId: p.user!.id,
            odName:
              p.user!.displayName ||
              `${p.user!.firstName || ''} ${p.user!.lastName || ''}`.trim() ||
              p.user!.username ||
              'Unknown',
            avatarUrl: p.user!.avatarUrl
          })) || []

      // Use conversation ID as the room ID, pass conversation name for the invite
      startGroupCall(activeConversation.id, callType, callParticipants, activeConversation.name)
    }
  }

  // Handler for adding a participant to a 1:1 call (upgrades to group call)
  const handleUpgradeToGroupCall = (newParticipant: CallParticipant) => {
    if (!activeConversation || !currentUserAsParticipant || !callState.remoteParticipant) return

    // Build participant list: current user + current remote + new participant
    const callParticipants: CallParticipant[] = [currentUserAsParticipant, callState.remoteParticipant, newParticipant]

    // End the current 1:1 call first
    endCall()

    // Small delay to ensure clean transition
    setTimeout(() => {
      // Generate a new room ID for the group call (use conversation ID or create new)
      const roomId = activeConversation.id
      const callType = callState.type || 'video'

      console.debug(
        'Upgrading 1:1 call to group call with participants:',
        callParticipants.map(p => p.odName)
      )
      startGroupCall(roomId, callType, callParticipants, activeConversation.name)
    }, 100)
  }

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

      // Note: Agent creation detection removed - backend handles this now

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

        // Send the user's message first
        await sendMessage(activeConversationId, content, Object.keys(metadata).length > 0 ? metadata : undefined)
        setDraftMessage('') // clear draft after successful send

        // Check if message contains @Every mention and process it
        if (hasEveryMention(entityReferences) && activeConversation) {
          try {
            // Build full participant details for the AI context
            // This allows AI to know all participants and schedule meetings for them
            const participants = activeConversation.participants
              ?.filter(p => p.user)
              .map(p => {
                const user = p.user!
                const name =
                  user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || ''
                return {
                  id: p.userId || user.id,
                  odId: p.userId || user.id, // Open Directory ID for calendar/meetings
                  name,
                  email: user.email,
                  employeeId: user.employeeId
                }
              })
              .filter(p => p.name)

            // Get current user info
            const currentUserName = currentUser
              ? currentUser.displayName ||
                `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
                currentUser.username ||
                ''
              : ''

            // Find existing AI session ID from previous AI messages in this conversation
            // This allows all users to share the same AI context
            const existingSessionId = messages
              .filter(m => m.metadata?.isAIResponse && m.metadata?.everyAiSessionId)
              .map(m => m.metadata?.everyAiSessionId as string)
              .pop() // Get the most recent session ID

            // Find the last scheduled meeting from previous AI messages
            // This allows AI to update existing meetings instead of creating new ones
            const lastScheduledMeeting = messages
              .filter(m => m.metadata?.isAIResponse && m.metadata?.scheduledMeeting)
              .map(m => m.metadata?.scheduledMeeting)
              .pop()

            // Extract mentioned users from entity references (people mentioned with @ who might not be in the chat)
            // For employees, use userId (Open Directory ID) which the calendar API expects
            const mentionedUsers =
              entityReferences
                ?.filter(ref => ref.type === 'employee' || ref.type === 'contact')
                .map(ref => ({
                  id: ref.id,
                  odId: ref.userId || ref.id, // Use userId (OD ID) for employees, fallback to id
                  name: ref.name || 'Unknown',
                  email: undefined,
                  employeeId: ref.type === 'employee' ? ref.id : undefined
                })) || []

            const conversationContext = {
              conversationId: activeConversationId,
              conversationName: activeConversation.name,
              participants,
              existingSessionId,
              currentUserId: currentUser?.id,
              currentUserName,
              lastScheduledMeeting,
              mentionedUsers
            }

            // Process the message with Every AI
            const aiResponse = await processEveryAIMessage(content, entityReferences, conversationContext)

            if (aiResponse && aiResponse.text && !aiResponse.error) {
              // Keep the original text with entity links intact (don't sanitize them)
              const responseText = aiResponse.text.trim()

              if (responseText) {
                // Small delay to let the first message settle in the UI
                await new Promise(resolve => setTimeout(resolve, 100))

                // Send the AI response as a message
                // The visual styling (avatar, name) is handled by MessageItem based on isAIResponse metadata
                const aiMetadata: Record<string, any> = {
                  isAIResponse: true,
                  aiAssistant: 'Every',
                  originalQuestion: content,
                  everyAiSessionId: aiResponse.sessionId
                }

                // Include scheduled meeting data if present
                if (aiResponse.scheduledMeeting) {
                  aiMetadata.scheduledMeeting = aiResponse.scheduledMeeting
                }

                await sendMessage(activeConversationId, responseText, aiMetadata)

                // Clear streaming text after message is sent
                clearStreamingText()
              }
            }
          } catch (aiError) {
            console.error('Error processing Every AI response:', aiError)
            // Don't crash the chat if AI fails - just log and continue
          }
        }
      } catch (err) {
        console.error('Error sending message:', err)
      }
    },
    [
      activeConversationId,
      sendMessage,
      apiClient,
      hasEveryMention,
      processEveryAIMessage,
      activeConversation,
      clearStreamingText,
      setDraftMessage
    ]
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
      setErrorMessage(null)
      await closeConversation(activeConversation.id)
      // Navigate back to conversation list if in compact/mobile mode
      if (viewMode !== 'full') {
        setShowConversationList(true)
      }

      // Clear conversation ID from URL
      const url = new URL(window.location.href)
      url.searchParams.delete('conversationId')
      window.history.replaceState({}, '', url.toString())
    } catch (error: any) {
      console.error('Failed to remove conversation:', error)

      // Check for "last owner" error
      const errorMsg = error?.response?.data?.message || error?.message || ''
      if (errorMsg.toLowerCase().includes('last owner')) {
        setErrorMessage(
          getTranslationFromI18nKeyAndLabel(
            'chat.cannotLeaveAsLastOwner',
            'You are the only owner of this group. Please transfer ownership to another member or delete the group from Group Settings.'
          )
        )
        // Open group settings to let user manage the group
        setShowGroupSettingsModal(true)
      } else {
        setErrorMessage(
          getTranslationFromI18nKeyAndLabel('chat.failedToLeave', 'Failed to leave the conversation. Please try again.')
        )
      }
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

  // Handle reply to AI - prepopulate draft with @Every and register it as a mention
  const handleReplyToAI = useCallback(() => {
    setDraftMessage(prev => {
      if (prev.startsWith('@Every ')) {
        return prev
      }
      const newText = `@Every ${prev}`
      // Register @Every as a mention entity if registerMentionEntity is available
      if (registerMentionEntityRef.current) {
        const EVERY_AI_ENTITY = {
          id: 'every-ai-assistant',
          type: 'ai_assistant' as const,
          name: 'Every',
          subtitle: 'AI Assistant • Ask me anything'
        }
        registerMentionEntityRef.current(EVERY_AI_ENTITY, newText, 0)
      }
      // Restore focus after a brief delay to ensure DOM is updated
      setTimeout(() => {
        if (focusInputRef.current) {
          focusInputRef.current()
        }
      }, 0)
      return newText
    })
  }, [])

  // Keep ref in sync with activeConversationId for stable callbacks
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId
  }, [activeConversationId])

  // Stable typing callbacks that use ref instead of direct state
  const handleTypingStart = useCallback(() => {
    if (activeConversationIdRef.current) {
      startTyping(activeConversationIdRef.current)
    }
  }, [startTyping])

  const handleTypingStop = useCallback(() => {
    if (activeConversationIdRef.current) {
      stopTyping(activeConversationIdRef.current)
    }
  }, [stopTyping])

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
    // Only process once
    if (conversationIdFromUrlProcessed.current) {
      return
    }

    const urlParams = new URLSearchParams(window.location.search)
    const conversationIdParam = urlParams.get('conversationId')

    if (!conversationIdParam) {
      return
    }

    // First, try to find the conversation in the loaded list
    const conversation = conversations.find(c => c.id === conversationIdParam)
    if (conversation) {
      conversationIdFromUrlProcessed.current = true
      setActiveConversation(conversation)
      setShowConversationList(false)
      return
    }

    // If conversation not in list but conversations have loaded, try fetching it directly
    // This handles cases where the conversation might not be in the first page
    if (conversations.length > 0 && apiClient && !conversationsLoading) {
      conversationIdFromUrlProcessed.current = true
      // Fetch conversation directly from API
      apiClient
        .getConversationById(conversationIdParam)
        .then(fetchedConversation => {
          // Add to conversations list and set as active
          if (fetchedConversation) {
            setActiveConversation(fetchedConversation)
            setShowConversationList(false)
          }
        })
        .catch(err => {
          console.error('Error fetching conversation from URL:', err)
          // Reset the flag so we can retry if conversations reload
          conversationIdFromUrlProcessed.current = false
        })
    }
  }, [conversations, setActiveConversation, activeConversationId, apiClient, conversationsLoading])

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

  // Get presence for the other user in direct conversations
  const otherUserId = stableActiveConversation ? getOtherParticipantUserId(stableActiveConversation) : null
  const otherUserPresence = otherUserId ? getUserPresence(otherUserId) : undefined

  // Check if there's an active call in this conversation (for group chats)
  const activeCallInfo: ActiveCallInfo | null = useMemo(() => {
    if (!stableActiveConversation || stableActiveConversation.type !== 'group') return null

    const activeCall = activeCalls[stableActiveConversation.id]

    if (activeCall) {
      const participantNames =
        stableActiveConversation.participants
          ?.filter(p => activeCall.participantIds.includes(p.userId || p.user?.id || ''))
          .map(p => {
            const user = p.user
            return user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown'
          }) || []

      return {
        roomId: activeCall.roomId,
        callType: activeCall.callType,
        participantCount: activeCall.participantIds.length,
        participantNames:
          participantNames.length > 0 ? participantNames : [`${activeCall.participantIds.length} participant(s)`]
      }
    }

    if (groupCallState.status !== 'idle' && groupCallState.roomId === stableActiveConversation.id) {
      return {
        roomId: groupCallState.roomId,
        callType: groupCallState.callType,
        participantCount: groupParticipants.length,
        participantNames: groupParticipants.map(p => p.odName)
      }
    }

    return null
  }, [
    stableActiveConversation,
    activeCalls,
    groupCallState.status,
    groupCallState.roomId,
    groupCallState.callType,
    groupParticipants
  ])

  // Handler to join an active call
  const handleJoinActiveCall = useCallback(() => {
    if (!activeCallInfo || !stableActiveConversation) return
    // Pass true to indicate we're joining an existing call (don't ring everyone)
    handleGroupCall(activeCallInfo.callType, true)
  }, [activeCallInfo, stableActiveConversation, handleGroupCall])

  // Determine if we should show single-view mode (list OR chat, not both)
  const isSingleViewMode = viewMode === 'mobile' || viewMode === 'compact'
  const hasConversation = !!stableActiveConversation
  const showListView = isSingleViewMode ? showConversationList || !hasConversation : true
  const showChatView = isSingleViewMode ? !showConversationList && hasConversation : true

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

  return (
    <div
      ref={containerRef}
      className="gba:h-full gba:flex gba:flex-col gba:bg-background gba:overflow-hidden"
      data-testid={prefixDataTestId}
    >
      <OfflineBanner />

      {/* Error Message Alert */}
      {errorMessage && (
        <Alert variant="destructive" className="gba:mx-2 gba:mt-2 gba:mb-0">
          <AlertDescription className="gba:flex gba:items-center gba:justify-between gba:gap-2">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="gba:text-destructive-foreground gba:hover:opacity-70 gba:text-lg gba:font-bold gba:px-2"
              aria-label="Dismiss"
            >
              ×
            </button>
          </AlertDescription>
        </Alert>
      )}

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
              onRemoveConversation={async conversationId => {
                try {
                  setErrorMessage(null)
                  await closeConversation(conversationId)
                } catch (error: any) {
                  console.error('Failed to remove conversation:', error)
                  const errorMsg = error?.response?.data?.message || error?.message || ''
                  if (errorMsg.toLowerCase().includes('last owner')) {
                    setErrorMessage(
                      getTranslationFromI18nKeyAndLabel(
                        'chat.cannotLeaveAsLastOwner',
                        'You are the only owner of this group. Please transfer ownership to another member or delete the group from Group Settings.'
                      )
                    )
                    // Select the conversation and open group settings
                    const conv = conversations.find(c => c.id === conversationId)
                    if (conv) {
                      handleConversationSelect(conv)
                      setShowGroupSettingsModal(true)
                    }
                  } else {
                    setErrorMessage(
                      getTranslationFromI18nKeyAndLabel(
                        'chat.failedToLeave',
                        'Failed to leave the conversation. Please try again.'
                      )
                    )
                  }
                }
              }}
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
              presenceMap={presenceMap}
            />
          </div>
        )}

        {/* Active Conversation */}
        {showChatView && (
          <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:h-full gba:max-h-full gba:overflow-hidden">
            {stableActiveConversation ? (
              <>
                <ConversationHeader
                  conversation={stableActiveConversation}
                  onBack={isSingleViewMode ? handleBack : undefined}
                  onClose={handleCloseConversation}
                  onRemove={handleRemoveConversation}
                  onGroupSettings={handleShowGroupSettings}
                  onAudioCall={handleAudioCall}
                  onVideoCall={handleVideoCall}
                  onJoinCall={handleJoinActiveCall}
                  showBackButton={isSingleViewMode}
                  currentUserId={currentUser?.id || null}
                  compact={viewMode === 'compact'}
                  otherUserPresence={otherUserPresence}
                  isCallEnabled={isConnected}
                  isInCall={isInAnyCall}
                  activeCall={activeCallInfo}
                />
                <MessageList
                  messages={messages}
                  currentUserId={currentUser?.id || null}
                  isGroupChat={stableActiveConversation.type === 'group'}
                  typingUsers={Object.values(typingUsers).flat()}
                  isLoading={messagesLoading}
                  hasMore={hasMoreMessages}
                  onLoadMore={loadMoreMessages}
                  conversationId={stableActiveConversation.id}
                  accessToken={accessToken}
                  participants={stableActiveConversation.participants}
                  onReplyToAI={handleReplyToAI}
                />

                {/* AI Processing Indicator */}
                {isAIProcessing && (
                  <div className="gba:px-4 gba:py-2 gba:border-t gba:border-border/30 gba:bg-muted/20">
                    <div className="gba:flex gba:gap-2">
                      {/* AI Avatar */}
                      <div className="gba:w-7 gba:h-7 gba:flex-shrink-0 gba:rounded-full gba:bg-gradient-to-br gba:from-primary gba:to-accent gba:flex gba:items-center gba:justify-center">
                        <span className="gba:text-[10px] gba:text-primary-foreground gba:font-bold">AI</span>
                      </div>
                      <div className="gba:flex-1">
                        <div className="gba:text-xs gba:font-semibold gba:text-primary gba:mb-1">✨ Every AI</div>
                        {aiStreamingText ? (
                          <div className="gba:text-sm gba:text-foreground gba:bg-gradient-to-br gba:from-muted gba:to-accent/10 gba:rounded-lg gba:p-2 gba:border gba:border-primary/20">
                            <AIResponseRenderer content={aiStreamingText} />
                          </div>
                        ) : (
                          <AIThinkingIndicator />
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                  {getTranslationFromI18nKeyAndLabel(
                    'chat.selectConversation',
                    'Select a conversation to start chatting'
                  )}
                </p>
              </div>
            )}

            {stableActiveConversation && (
              <MessageInput
                onSend={handleSendMessage}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
                disabled={false}
                compact={viewMode !== 'full'}
                accessToken={accessToken}
                value={draftMessage}
                onChange={setDraftMessage}
                onRegisterMentionReady={registerFn => {
                  registerMentionEntityRef.current = registerFn
                }}
                onFocusReady={focusFn => {
                  focusInputRef.current = focusFn
                }}
              />
            )}
          </div>
        )}
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

      {/* Call Components */}
      {callState.status === 'ringing' && callState.direction === 'incoming' && (
        <IncomingCallDialog
          callState={callState}
          onAccept={acceptCall}
          onReject={rejectCall}
          prefixDataTestId={`${prefixDataTestId}-incoming-call`}
        />
      )}

      {callState.status !== 'idle' && !(callState.status === 'ringing' && callState.direction === 'incoming') && (
        <CallModal
          callState={callState}
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          prefixDataTestId={`${prefixDataTestId}-call`}
          availableParticipants={availableParticipantsForCall}
          onAddParticipant={handleUpgradeToGroupCall}
          accessToken={accessToken}
          currentUserId={currentUser?.id || null}
        />
      )}

      {/* Incoming Group Call Dialog */}
      {incomingGroupCallInvite && (
        <IncomingGroupCallDialog
          invite={incomingGroupCallInvite}
          onAccept={acceptGroupInvite}
          onDecline={declineGroupInvite}
          prefixDataTestId={`${prefixDataTestId}-incoming-group-call`}
        />
      )}

      {/* Group Call Modal */}
      {groupCallState.status !== 'idle' && (
        <GroupCallModal
          callState={groupCallState}
          localStream={groupLocalStream}
          remoteStreams={groupRemoteStreams}
          participants={groupParticipants}
          pendingInvites={groupPendingInvites}
          onEndCall={leaveGroupCall}
          onToggleMute={toggleGroupMute}
          onToggleVideo={toggleGroupVideo}
          onToggleScreenShare={toggleGroupScreenShare}
          onSetVideoQuality={setGroupVideoQuality}
          onToggleMinimize={toggleGroupMinimize}
          onToggleBackground={toggleGroupBackground}
          backgroundEnabled={groupCallState.backgroundEnabled}
          prefixDataTestId={`${prefixDataTestId}-group-call`}
          availableParticipants={availableParticipantsForCall}
          onInviteParticipant={participant => inviteToGroupCall([participant], activeConversation?.name)}
          onReconnectParticipant={reconnectGroupParticipant}
          getConnectionDiagnostics={getGroupConnectionDiagnostics}
          accessToken={accessToken}
          currentUserId={currentUser?.id || null}
        />
      )}
    </div>
  )
}
