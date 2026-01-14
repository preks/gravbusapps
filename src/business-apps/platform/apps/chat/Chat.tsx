import React, { useState, useCallback, useEffect, useRef, useMemo, startTransition } from 'react'
// TODO V2: Restore 'memo' import when needed for optimization
import { Alert, AlertDescription, Spinner, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useChatClient } from './hooks/useChatClient'
import { useCall } from './hooks/useCall'
import { useGroupCall } from './hooks/useGroupCall'
import { useEveryAIChat } from './hooks/useEveryAIChat'
import { useChatExperts } from './hooks/useChatExperts'
import { useOpenChatFromPlatform } from './hooks/useOpenChatFromPlatform'
import { ConversationList } from './components/ConversationList'
import { ExpertSelectorPanel } from './components/ExpertSelectorPanel.tsx'
import { ActiveExpertsBar } from './components/ActiveExpertsBar.tsx'
import { ConversationHeader, type ActiveCallInfo } from './components/ConversationHeader'
// import { MessageList } from './components/MessageList' // V1 - OLD
import { MessageListV2 } from './components/MessageListV2' // V2 - TESTING
import { PerformanceMonitor } from './components/PerformanceMonitor' // V2 - Performance monitoring
import { MessageInput } from './components/MessageInput'
import { CreateGroupModal } from './components/CreateGroupModal'
import { GroupSettingsModal } from './components/GroupSettingsModal'
import { AIThinkingIndicator, AIResponseRenderer, ExpertThinkingIndicator } from './components/AIResponseRenderer'
import { playNudgeSound, applyShakeAnimation, injectNudgeStyles } from './utils/nudgeUtils'
import { IncomingCallDialog } from './components/IncomingCallDialog'
import { IncomingGroupCallDialog } from './components/IncomingGroupCallDialog'
import { CallModal } from './components/CallModal'
import { GroupCallModal } from './components/GroupCallModal'
// import { initGlobalMinimizedCallRenderer } from './components/GlobalMinimizedCall'
import type { Conversation, User, MessageEntityReference } from './types'
import type { CallParticipant } from './services/webrtcClient'
import { env } from '@/common/env/EnvUtils'
import translations from './_i18n'

type ViewMode = 'full' | 'compact' | 'mobile'

interface ChatProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const Chat: React.FC<ChatProps> = ({ accessToken: accessTokenProp, prefixDataTestId = 'chat' }) => {
  const { t } = useTranslation(translations)
  const containerRef = useRef<HTMLDivElement>(null)
  const chatViewRef = useRef<HTMLDivElement>(null)
  const [showConversationList, setShowConversationList] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('full')
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draftMessage, setDraftMessage] = useState<string>('')
  const [isExpertProcessing, setIsExpertProcessing] = useState(false)
  const [processingExpert, setProcessingExpert] = useState<{ name: string; color?: string } | null>(null)
  const registerMentionEntityRef = useRef<((entity: any, text: string, startIndex: number) => any) | null>(null)
  const focusInputRef = useRef<(() => void) | null>(null)
  const urlContextProcessed = useRef(false)
  const conversationIdFromUrlProcessed = useRef(false)
  const activeConversationIdRef = useRef<string | null>(null)
  const presenceInitializedUsersRef = useRef<Set<string>>(new Set())
  const lastNudgeTimeRef = useRef<number>(0)
  const NUDGE_COOLDOWN_MS = 30000 // 30 seconds

  // V2 startup log
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Chat V2 Active - Performance logging enabled')
      console.log('   Look for [V2] prefixed logs in console')
      console.log('   Measuring: load times, re-renders, memory usage')
    }
  }, [])

  // Inject nudge animation styles on mount
  useEffect(() => {
    injectNudgeStyles()
  }, [])

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

  // If platform is running on localhost (baseUrl includes localhost), connect to DEV environment
  // This handles the case where Chat is loaded from CDN but platform is running locally
  const isLocalPlatform = baseUrl.includes('localhost')
  if (isLocalPlatform) {
    baseUrl = 'https://newwork-dev.newwork.com'
  }

  // Normalize API and WS endpoints; connect to chat-service namespace with default socket path
  let apiUrl = env('NEXT_PUBLIC_CHAT_API') || `${baseUrl}/chat-service/api/v1` || ''

  // Override if NEXT_PUBLIC_CHAT_API is pointing to localhost when running on local platform
  if (apiUrl.includes('localhost')) {
    apiUrl = `${baseUrl}/chat-service/api/v1`
  }

  const wsUrl = `${baseUrl}/chat-service` // namespace in URL (matches gateway)
  // Ensure Socket.IO path keeps /chat-service prefix (Kong strip-path=true compatible)
  const wsSocketPath = env('NEXT_PUBLIC_CHAT_WS_PATH') || '/chat-service/socket.io'

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
    // typingUsers, // TODO V2: Restore when implementing typing indicators
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
    sendNudge,
    registerNudgeCallback,
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

  // V2 render tracking (after stableActiveConversation is defined)
  const renderCountRef = useRef(0)
  const prevRenderDataRef = useRef({ conversationId: '', messageCount: 0, isLoading: false })
  renderCountRef.current++

  if (process.env.NODE_ENV === 'development') {
    const currentData = {
      conversationId: stableActiveConversation?.id || '',
      messageCount: messages.length,
      isLoading: messagesLoading
    }

    const prevData = prevRenderDataRef.current
    const changes: string[] = []

    if (prevData.conversationId !== currentData.conversationId) changes.push('conversationId')
    if (prevData.messageCount !== currentData.messageCount)
      changes.push(`messages(${prevData.messageCount}→${currentData.messageCount})`)
    if (prevData.isLoading !== currentData.isLoading) changes.push(`loading(${currentData.isLoading})`)
    if (changes.length === 0) changes.push('no state change - likely parent/context re-render')

    console.log(`[V2 Chat] Render #${renderCountRef.current} - Changed: ${changes.join(', ')}`, {
      hasConversation: !!stableActiveConversation,
      conversationId: stableActiveConversation?.id,
      messageCount: messages.length,
      isLoading: messagesLoading
    })

    prevRenderDataRef.current = currentData
  }

  // Track active conversation changes
  useEffect(() => {
    // Diagnostics removed
  }, [stableActiveConversation?.id])

  // Listen for platform messages to open chat with specific users
  useOpenChatFromPlatform({
    createDirectConversation,
    setDraftMessage,
    isConnected,
    setShowConversationList
  })

  // Register nudge callback to handle incoming nudges from OTHER users
  useEffect(() => {
    if (!registerNudgeCallback || !currentUser) return

    registerNudgeCallback(data => {
      // Ignore nudges from yourself (shouldn't happen, but safety check)
      if (data.fromUserId === currentUser.id) {
        return
      }

      // Play sound
      playNudgeSound()

      // Shake animation on the whole chat container
      if (containerRef.current) {
        applyShakeAnimation(containerRef.current)
      }

      // System message will arrive via normal new_message WebSocket event
      // Backend creates it and sends it ONLY to the receiver
    })
  }, [registerNudgeCallback, currentUser, activeConversationId])

  // Clear presence initialization tracking when connection drops
  // RESILIENCE FIX: Add SHORT delay (500ms) to handle rapid reconnects from platform remounting
  // This prevents losing presence data during brief component lifecycle changes
  // Longer disconnects still clear cache to ensure fresh data on next load
  const isConnectedRef = useRef(isConnected)
  const disconnectTimeRef = useRef<number | null>(null)

  useEffect(() => {
    isConnectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    if (!isConnected) {
      // Record when we disconnected
      disconnectTimeRef.current = Date.now()

      const timeout = setTimeout(() => {
        // Only clear if still disconnected after 500ms
        // This handles platform remounting (< 500ms) but clears for real disconnects
        if (!isConnectedRef.current) {
          presenceInitializedUsersRef.current.clear()
          disconnectTimeRef.current = null
        }
      }, 500) // 500ms grace period - fast enough for remounting, slow enough for stability

      return () => clearTimeout(timeout)
    } else {
      // Reset disconnect timestamp on reconnect
      disconnectTimeRef.current = null
    }
  }, [isConnected])

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
    currentUser: currentUserAsParticipant
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
    currentUser: currentUserAsParticipant
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

  // Every Experts integration
  const {
    availableExperts,
    expertsLoading,
    activeExperts,
    addExpert,
    removeExpert,
    processExpertMention,
    showExpertSelector,
    setShowExpertSelector
  } = useChatExperts({
    accessToken,
    conversationId: activeConversationId,
    currentUserId: currentUser?.id || null,
    apiClient
  })

  // Track active experts count for all conversations
  // Use data directly from conversation.activeExperts (no API calls needed!)
  const conversationExpertCounts = useMemo(() => {
    const counts = new Map<string, number>()

    conversations.forEach(conv => {
      if (conv.type === 'group' && conv.activeExperts && conv.activeExperts.length > 0) {
        counts.set(conv.id, conv.activeExperts.length)
      }
    })

    return counts
  }, [conversations])

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
      startGroupCall(roomId, callType, callParticipants, activeConversation.name)
    }, 100)
  }

  // Initialize presence status from conversation participants' user data
  // Only initialize each user once from API data, then rely on WebSocket updates
  useEffect(() => {
    try {
      if (!conversations || conversations.length === 0 || !updatePresenceFromUser) return

      // Extract all users from conversations and initialize their presence
      conversations.forEach(conv => {
        conv.participants?.forEach(p => {
          if (p.user && p.userId !== currentUser?.id && p.user.id !== currentUser?.id) {
            const userId = p.user.id

            // Only initialize this user's presence once from API data
            // After that, WebSocket events will keep it updated
            if (!presenceInitializedUsersRef.current.has(userId)) {
              presenceInitializedUsersRef.current.add(userId)

              // The API returns isOnline (boolean) and lastSeen on user object
              const lastSeen = p.user.lastSeen || p.user.lastSeenAt

              // If we have isOnline directly from API, use it
              if (typeof p.user.isOnline === 'boolean') {
                updatePresenceFromUser(userId, lastSeen, p.user.isOnline)
              } else {
                // Fallback to calculating from lastSeen/lastSeenAt
                updatePresenceFromUser(userId, lastSeen, p.user.isActive)
              }
            }
          }
        })
      })
    } catch {
      // Error initializing presence
    }
  }, [conversations, currentUser?.id, updatePresenceFromUser])

  // Wrap sendMessage to match the expected signature (Promise<void> instead of Promise<Message>)
  const sendMessageVoid = useCallback(
    async (conversationId: string, content: string, metadata?: Record<string, any>): Promise<void> => {
      await sendMessage(conversationId, content, metadata)
    },
    [sendMessage]
  )

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
        let uploadedAttachments: Array<{
          id: string
          name: string
          url: string
          type?: string
          mimeType?: string
          size?: number
        }> = []
        if (attachments?.length && apiClient) {
          try {
            const files = attachments.map(a => a.file)
            uploadedAttachments = await apiClient.uploadFiles(activeConversationId, files)
            metadata.attachments = uploadedAttachments
          } catch {
            // Continue sending message without attachments if upload fails
          }
        }

        // Send the user's message first
        await sendMessage(activeConversationId, content, Object.keys(metadata).length > 0 ? metadata : undefined)
        setDraftMessage('') // clear draft after successful send

        // Check for expert mention FIRST (before @Every)
        // Detect expert mention to show loading indicator
        const expertMention = entityReferences?.find(ref => ref.type === 'every_expert')
        const mentionedExpert = expertMention ? activeExperts.find(e => e.expertId === expertMention.id) : null

        // Show expert processing indicator if expert is mentioned
        if (mentionedExpert) {
          setIsExpertProcessing(true)
          setProcessingExpert({ name: mentionedExpert.expertName, color: mentionedExpert.color })
        }

        // Pass uploaded attachments so the expert can access them
        const expertResult = await processExpertMention(content, entityReferences, uploadedAttachments)

        // Clear expert processing indicator
        setIsExpertProcessing(false)
        setProcessingExpert(null)

        if (expertResult.isExpertMention && expertResult.expertResponse) {
          // Expert handled the message, send expert's response
          await new Promise(resolve => setTimeout(resolve, 100))

          await sendMessage(activeConversationId, expertResult.expertResponse.text, {
            isEveryExpertResponse: true,
            expertId: expertResult.expertResponse.expertId,
            expertName: expertResult.expertResponse.expertName,
            expertColor: expertResult.expertResponse.expertColor,
            citations: expertResult.expertResponse.citations,
            confidence: expertResult.expertResponse.confidence
          })

          // Check if this is a Document Reviewer response with annotations
          // Look for the expert name containing "Document" or "Review" and try to parse annotations
          const expertName = expertResult.expertResponse.expertName?.toLowerCase() || ''
          const isDocumentReviewer = expertName.includes('document') || expertName.includes('review')

          if (isDocumentReviewer) {
            try {
              // Try to extract JSON from the response
              const responseText = expertResult.expertResponse.text
              const jsonMatch = responseText.match(/\{[\s\S]*"annotations"[\s\S]*\}/m)

              if (jsonMatch) {
                const reviewData = JSON.parse(jsonMatch[0])

                if (
                  reviewData.annotations &&
                  Array.isArray(reviewData.annotations) &&
                  reviewData.annotations.length > 0
                ) {
                  // Get current document context
                  const docContext = (globalThis as any).__currentDocumentContext

                  if (docContext?.documentId) {
                    // Transform annotations to expected format
                    const annotations = reviewData.annotations.map((ann: any, idx: number) => ({
                      id: ann.id || `ann-${idx}`,
                      type: ann.type || 'error',
                      severity: ann.severity || 'warning',
                      category: ann.category || 'grammar',
                      startOffset: ann.startOffset ?? ann.start_offset ?? 0,
                      endOffset: ann.endOffset ?? ann.end_offset ?? 0,
                      originalText: ann.originalText || ann.original_text || '',
                      message: ann.message || '',
                      suggestion: ann.suggestedText || ann.suggested_text || ann.suggestion || '',
                      resolved: false
                    }))

                    // Dispatch annotations to document view
                    globalThis.dispatchEvent(
                      new CustomEvent('document-review-annotations', {
                        detail: {
                          documentId: docContext.documentId,
                          annotations,
                          isLoading: false
                        }
                      })
                    )
                  }
                }
              }
            } catch {
              // Not an error - expert may not have returned JSON annotations
            }
          }

          clearStreamingText()
          return // Stop here, don't process with generic Every
        }

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

            // Extract file attachments to send to Every AI
            // Note: File size limits and security validations are handled by the backend
            // when files are uploaded via apiClient.uploadFiles() above
            const fileAttachments = attachments?.map(a => a.file) || []

            // Process the message with Every AI
            const aiResponse = await processEveryAIMessage(
              content,
              entityReferences,
              conversationContext,
              fileAttachments
            )

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

                // Include full outputs for rich rendering
                if (aiResponse.outputs && aiResponse.outputs.length > 0) {
                  aiMetadata.outputs = aiResponse.outputs
                }

                await sendMessage(activeConversationId, responseText, aiMetadata)

                // Clear streaming text after message is sent
                clearStreamingText()
              }
            }
          } catch {
            // Don't crash the chat if AI fails - just continue
          }
        }
      } catch {
        // Error sending message
      }
    },
    [
      activeConversationId,
      sendMessage,
      apiClient,
      hasEveryMention,
      processEveryAIMessage,
      processExpertMention,
      activeConversation,
      clearStreamingText,
      setDraftMessage
    ]
  )

  // TODO V2: Restore handleAISendMessage when implementing EveryAI form interactions
  // Handler for sending messages from inline EveryAI forms and interactions
  // const handleAISendMessage = useCallback(
  //   async (content: string, metadata?: Record<string, any>) => {
  //     if (!activeConversationId) return
  //
  //     try {
  //       // Check if this is a form submission to EveryAI
  //       if (metadata?.isFormSubmission) {
  //         // Send the form submission to EveryAI and process the response
  //         const conversationContext = {
  //           conversationId: activeConversationId,
  //           conversationName: activeConversation?.name,
  //           participants: activeConversation?.participants
  //             ?.filter(p => p.user)
  //             .map(p => {
  //               const user = p.user!
  //               const name =
  //                 user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || ''
  //               return {
  //                 id: p.userId || user.id,
  //                 odId: p.userId || user.id,
  //                 name,
  //                 email: user.email,
  //                 employeeId: user.employeeId
  //               }
  //             })
  //             .filter(p => p.name),
  //           existingSessionId: messages
  //             .filter(m => m.metadata?.isAIResponse && m.metadata?.everyAiSessionId)
  //             .map(m => m.metadata?.everyAiSessionId as string)
  //             .pop(),
  //           currentUserId: currentUser?.id,
  //           currentUserName: currentUser
  //             ? currentUser.displayName ||
  //               `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
  //               currentUser.username ||
  //               ''
  //             : ''
  //         }
  //
  //         // Process through EveryAI (no file attachments for form submissions)
  //         const aiResponse = await processEveryAIMessage(content, [], conversationContext, [])
  //
  //         if (aiResponse && !aiResponse.error) {
  //           // Check if we have any content to display (text OR outputs)
  //           const responseText = aiResponse.text?.trim() || ''
  //           const hasOutputs = aiResponse.outputs && aiResponse.outputs.length > 0
  //
  //           if (responseText || hasOutputs) {
  //             await new Promise(resolve => setTimeout(resolve, 100))
  //
  //             const aiMetadata: Record<string, any> = {
  //               isAIResponse: true,
  //               aiAssistant: 'Every',
  //               originalQuestion: content,
  //               everyAiSessionId: aiResponse.sessionId,
  //               isFormResult: true // Mark this as a result from form submission
  //             }
  //
  //             if (aiResponse.scheduledMeeting) {
  //               aiMetadata.scheduledMeeting = aiResponse.scheduledMeeting
  //             }
  //
  //             if (hasOutputs) {
  //               aiMetadata.outputs = aiResponse.outputs
  //             }
  //
  //             // If we have outputs but no text, use a default message
  //             const messageText = responseText || 'Processing your request...'
  //
  //             await sendMessage(activeConversationId, messageText, aiMetadata)
  //             clearStreamingText()
  //           }
  //         }
  //       } else {
  //         // Regular message send
  //         await sendMessage(activeConversationId, content, metadata)
  //       }
  //     } catch {
  //       // Error sending AI message
  //     }
  //   },
  //   [
  //     activeConversationId,
  //     activeConversation,
  //     messages,
  //     currentUser,
  //     processEveryAIMessage,
  //     sendMessage,
  //     clearStreamingText
  //   ]
  // )

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
      } catch {
        // Error creating conversation
      }
    },
    [createDirectConversation]
  )

  const handleConversationSelect = useCallback(
    (conversation: Conversation) => {
      // Mark as processed to prevent URL restoration effect from re-triggering
      conversationIdFromUrlProcessed.current = true

      // CRITICAL FIX: Use startTransition to make this entire operation non-blocking
      // This prevents the 9-second click handler violation
      startTransition(() => {
        setActiveConversation(conversation)
        setShowConversationList(false)

        // Persist conversation ID in URL for panel reopen persistence
        const url = new URL(window.location.href)
        url.searchParams.set('conversationId', conversation.id)
        window.history.replaceState({}, '', url.toString())
      })
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
      // Failed to remove conversation

      // Check for "last owner" error
      const errorMsg = error?.response?.data?.message || error?.message || ''
      if (errorMsg.toLowerCase().includes('last owner')) {
        setErrorMessage(t('chat-cannotLeaveAsLastOwner'))
        // Open group settings to let user manage the group
        setShowGroupSettingsModal(true)
      } else {
        setErrorMessage(t('chat-failedToLeave'))
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
        throw error
      }
    },
    [createGroupConversation]
  )

  const handleShowGroupSettings = useCallback(() => {
    setShowGroupSettingsModal(true)
  }, [])

  const handleNudge = useCallback(() => {
    if (!activeConversation || activeConversation.type !== 'direct' || !currentUser) return

    // Check cooldown
    const now = Date.now()
    const timeSinceLastNudge = now - lastNudgeTimeRef.current

    if (timeSinceLastNudge < NUDGE_COOLDOWN_MS) {
      const secondsRemaining = Math.ceil((NUDGE_COOLDOWN_MS - timeSinceLastNudge) / 1000)
      setErrorMessage(t('chat-nudgeCooldown', { seconds: secondsRemaining }))
      // Auto-dismiss after 3 seconds
      setTimeout(() => setErrorMessage(null), 3000)
      return
    }

    // Get the other participant
    const otherParticipant = activeConversation.participants?.find(
      p => p.userId !== currentUser.id && p.user?.id !== currentUser.id
    )

    if (!otherParticipant?.userId) {
      return
    }

    // Send nudge via WebSocket
    const success = sendNudge(activeConversation.id, otherParticipant.userId)

    if (success) {
      // Update last nudge time
      lastNudgeTimeRef.current = now

      // Don't create a system message for the sender
      // The receiver will see the nudge message via the callback
      // The sender just gets visual feedback from the cooldown reset
    }
  }, [activeConversation, currentUser, sendNudge, sendMessage])

  const handleCloseGroupSettings = useCallback(() => {
    setShowGroupSettingsModal(false)
    // Refresh conversations to get updated participant data
    if (refreshConversations) {
      refreshConversations()
    }
  }, [refreshConversations])

  // TODO V2: Restore handleReplyToAI when implementing @Every AI mentions
  // Handle reply to AI - prepopulate draft with @Every and register it as a mention
  // const handleReplyToAI = useCallback(() => {
  //   setDraftMessage(prev => {
  //     if (prev.startsWith('@Every ')) {
  //       return prev
  //     }
  //     const newText = `@Every ${prev}`
  //     // Register @Every as a mention entity if registerMentionEntity is available
  //     if (registerMentionEntityRef.current) {
  //       const EVERY_AI_ENTITY = {
  //         id: 'every-ai-assistant',
  //         type: 'ai_assistant' as const,
  //         name: 'Every',
  //         subtitle: 'AI Assistant • Ask me anything'
  //       }
  //       registerMentionEntityRef.current(EVERY_AI_ENTITY, newText, 0)
  //     }
  //     // Restore focus after a brief delay to ensure DOM is updated
  //     setTimeout(() => {
  //       if (focusInputRef.current) {
  //         focusInputRef.current()
  //       }
  //     }, 0)
  //     return newText
  //   })
  // }, [])

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
        .catch(() => {
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
        .catch(() => {
          // Error opening AI agent conversation from URL
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
          .catch(() => {
            // Error opening context conversation from URL
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
        'chat.serviceUnavailable': t('chat-serviceUnavailable'),
        'chat.serviceNotFound': t('chat-serviceNotFound'),
        'chat.authenticationFailed': t('chat-authenticationFailed'),
        'chat.connectionError': t('chat-connectionError')
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
        <span className="gba:text-sm gba:text-muted-foreground">{t('chat-connecting')}</span>
      </div>
    )
  }

  // Offline banner component
  const OfflineBanner = () =>
    isOffline ? (
      <div className="gba:px-3 gba:py-2 gba:bg-warning/10 gba:border-b gba:border-warning/20">
        <p className="gba:text-xs gba:text-warning-foreground gba:text-center">{t('chat-offline')}</p>
      </div>
    ) : null

  return (
    <div
      ref={containerRef}
      className="gba:h-full gba:flex gba:flex-col gba:bg-background gba:overflow-hidden"
      data-testid={prefixDataTestId}
    >
      {/* V2 Performance Monitor - dev only */}
      <PerformanceMonitor conversationId={activeConversationId} messageCount={messages.length} />

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
                  const errorMsg = error?.response?.data?.message || error?.message || ''
                  if (errorMsg.toLowerCase().includes('last owner')) {
                    setErrorMessage(t('chat-cannotLeaveAsLastOwner'))
                    // Select the conversation and open group settings
                    const conv = conversations.find(c => c.id === conversationId)
                    if (conv) {
                      handleConversationSelect(conv)
                      setShowGroupSettingsModal(true)
                    }
                  } else {
                    setErrorMessage(t('chat-failedToLeave'))
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
              conversationExpertCounts={conversationExpertCounts}
            />
          </div>
        )}

        {/* Active Conversation */}
        {showChatView && (
          <div
            ref={chatViewRef}
            className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:h-full gba:max-h-full gba:overflow-hidden gba:relative"
          >
            {stableActiveConversation ? (
              <>
                <ConversationHeader
                  conversation={stableActiveConversation}
                  onBack={isSingleViewMode ? handleBack : undefined}
                  onClose={handleCloseConversation}
                  onRemove={handleRemoveConversation}
                  onGroupSettings={handleShowGroupSettings}
                  onAddExpert={
                    stableActiveConversation.type === 'group' ? () => setShowExpertSelector(true) : undefined
                  }
                  onNudge={stableActiveConversation.type === 'direct' ? handleNudge : undefined}
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
                  t={t}
                />

                {/* Active Experts Bar */}
                {activeExperts.length > 0 && (
                  <ActiveExpertsBar
                    experts={activeExperts}
                    onRemoveExpert={expertId => {
                      removeExpert(expertId, sendMessageVoid)
                    }}
                    data-testid={`${prefixDataTestId}-active-experts`}
                  />
                )}

                {/* V2 - Simplified message list for performance testing */}
                <MessageListV2
                  messages={messages}
                  currentUserId={currentUser?.id || null}
                  conversationType={stableActiveConversation.type}
                  isLoading={messagesLoading}
                  hasMore={hasMoreMessages}
                  onLoadMore={loadMoreMessages}
                />

                {/* V1 - Old implementation (commented for testing)
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
                  onSendMessage={handleAISendMessage}
                />
                */}

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
                            <AIResponseRenderer content={aiStreamingText} accessToken={accessToken} />
                          </div>
                        ) : (
                          <AIThinkingIndicator />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Expert Processing Indicator */}
                {isExpertProcessing && processingExpert && (
                  <div
                    className="gba:px-4 gba:py-3 gba:border-t gba:border-border/30"
                    style={{ backgroundColor: `${processingExpert.color}10` || 'var(--nw-muted)' }}
                  >
                    <div className="gba:flex gba:gap-3 gba:items-center">
                      {/* Expert Avatar */}
                      <div
                        className="gba:w-8 gba:h-8 gba:flex-shrink-0 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-bold gba:text-xs"
                        style={{ backgroundColor: processingExpert.color || 'var(--nw-primary)' }}
                      >
                        {processingExpert.name.charAt(0).toUpperCase()}
                      </div>
                      <ExpertThinkingIndicator
                        expertName={processingExpert.name}
                        expertColor={processingExpert.color}
                      />
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
                  {t('chat-selectConversation')}
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
                activeExperts={activeExperts}
                t={t}
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

      {/* Expert Selector Panel */}
      <ExpertSelectorPanel
        isOpen={showExpertSelector}
        onClose={() => setShowExpertSelector(false)}
        experts={availableExperts}
        activeExpertIds={activeExperts.map(e => e.expertId)}
        isLoading={expertsLoading}
        onAddExpert={expert => {
          addExpert(expert, sendMessageVoid)
        }}
        data-testid={`${prefixDataTestId}-expert-selector`}
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
