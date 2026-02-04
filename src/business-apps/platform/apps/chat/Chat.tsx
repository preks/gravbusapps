import React, { useState, useCallback, useEffect, useRef, useMemo, startTransition, memo } from 'react'
import { Alert, AlertDescription, Spinner, Toaster } from '@newwork/nw-design-system'
import { RealtimeKitProvider } from '@cloudflare/realtimekit-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useChatClient } from './hooks/useChatClient'
import { useCall } from './hooks/useCall'
import { useGroupCall } from './hooks/useGroupCall'
import { useRealtimeKitGroupCall } from './hooks/useRealtimeKitGroupCall'
import { RealtimeKitApiClient } from './services/realtimeKitApiClient'
import { useEveryAIChat } from './hooks/useEveryAIChat'
import { useChatExperts } from './hooks/useChatExperts'
import { useOpenChatFromPlatform } from './hooks/useOpenChatFromPlatform'
import { useStartCallFromPlatform } from './hooks/useStartCallFromPlatform'
import { ConversationList } from './components/ConversationList'
import { ExpertSelectorPanel } from './components/ExpertSelectorPanel.tsx'
import { ActiveExpertsBar } from './components/ActiveExpertsBar.tsx'
import { ConversationHeader, type ActiveCallInfo } from './components/ConversationHeader'
import { MessageList } from './components/MessageList'
import { PerformanceMonitor } from './components/PerformanceMonitor'
import { MessageInput } from './components/MessageInput'
import { CreateGroupModal } from './components/CreateGroupModal'
import { GroupSettingsModal } from './components/GroupSettingsModal'
import { AIThinkingIndicator, AIResponseRenderer, ExpertThinkingIndicator } from './components/AIResponseRenderer'
import { playNudgeSound, applyShakeAnimation, injectNudgeStyles } from './utils/nudgeUtils'
import { IncomingCallDialog } from './components/IncomingCallDialog'
import { IncomingGroupCallDialog } from './components/IncomingGroupCallDialog'
import { PreCallSetupDialog } from './components/PreCallSetupDialog'
import { RejoinCallDialog } from './components/RejoinCallDialog'
import { CallModal } from './components/CallModal'
import { GroupCallModal } from './components/GroupCallModal'
import { GroupCallModalRtk } from './components/GroupCallModalRtk'
// import { initGlobalMinimizedCallRenderer } from './components/GlobalMinimizedCall'
import type { Conversation, User, MessageEntityReference } from './types'
import type { CallParticipant } from './services/webrtcClient'
import type { GroupCallParticipant } from './services/groupWebrtcClient'
import { env } from '@/common/env/EnvUtils'
import { TranslationProvider, useChatTranslation } from './contexts/TranslationContext'
import { rtkDebug } from './utils/rtkDebug'
import { seedTestParticipants, TestParticipantPresets } from './utils/seedTestParticipants'

type ViewMode = 'full' | 'compact' | 'mobile'

interface ChatProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const ChatInner: React.FC<ChatProps> = memo(
  ({ accessToken: accessTokenProp, additionalData, prefixDataTestId = 'chat' }) => {
    const t = useChatTranslation()
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
    const [isStartingCall, setIsStartingCall] = useState(false)
    const [rejoinModalState, setRejoinModalState] = useState<{
      roomId: string
      callType: 'audio' | 'video'
      conversationName?: string
      participantCount?: number
    } | null>(null)
    const registerMentionEntityRef = useRef<((entity: any, text: string, startIndex: number) => any) | null>(null)
    const focusInputRef = useRef<(() => void) | null>(null)
    const urlContextProcessed = useRef(false)
    const conversationIdFromUrlProcessed = useRef(false)
    const activeConversationIdRef = useRef<string | null>(null)
    const presenceInitializedUsersRef = useRef<Set<string>>(new Set())
    const lastNudgeTimeRef = useRef<number>(0)
    const NUDGE_COOLDOWN_MS = 30000 // 30 seconds
    const isEmbeddedMobile = additionalData?.__mobile === true

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

    // Check if we have an explicit chat service URL override (for local development)
    const chatServiceOverride = env('NEXT_PUBLIC_CHAT_SERVICE_URL')

    let apiUrl: string
    let wsUrl: string
    let wsSocketPath: string

    if (chatServiceOverride) {
      // Local development: chat-service running directly
      const localUrl = chatServiceOverride.endsWith('/') ? chatServiceOverride.slice(0, -1) : chatServiceOverride
      apiUrl = `${localUrl}/api/v1`
      wsUrl = `${localUrl}/chat-service` // MUST include namespace
      wsSocketPath = '/socket.io' // Local chat-service uses /socket.io directly (no /chat-service prefix)
    } else {
      // Production/Dev environment: chat-service behind Kong gateway with /chat-service prefix
      // If platform is running on localhost (baseUrl includes localhost), connect to DEV environment
      // This handles the case where Chat is loaded from CDN but platform is running locally
      const isLocalPlatform = baseUrl.includes('localhost')
      if (isLocalPlatform) {
        baseUrl = 'https://newwork-dev.newwork.com'
      }

      // Normalize API and WS endpoints; connect to chat-service namespace with default socket path
      apiUrl = env('NEXT_PUBLIC_CHAT_API') || `${baseUrl}/chat-service/api/v1` || ''

      // Override if NEXT_PUBLIC_CHAT_API is pointing to localhost when running on local platform
      if (apiUrl.includes('localhost')) {
        apiUrl = `${baseUrl}/chat-service/api/v1`
      }

      wsUrl = `${baseUrl}/chat-service` // namespace in URL (matches gateway)
      // Ensure Socket.IO path keeps /chat-service prefix (Kong strip-path=true compatible)
      wsSocketPath = env('NEXT_PUBLIC_CHAT_WS_PATH') || '/chat-service/socket.io'
    }

    const chatClient = useChatClient({
      accessToken,
      apiUrl,
      wsUrl,
      wsSocketPath
    })

    // Initialize Realtime Kit API client
    // For RealtimeKitApiClient, we need the base URL without /api/v1 suffix
    // because it adds /api/v1/realtimekit internally
    const realtimeKitBaseUrl = useMemo(() => {
      if (chatServiceOverride) {
        // Local: http://localhost:3000
        return chatServiceOverride.endsWith('/') ? chatServiceOverride.slice(0, -1) : chatServiceOverride
      } else {
        // Remote: https://newwork-dev.newwork.com/chat-service
        return `${baseUrl}/chat-service`
      }
    }, [chatServiceOverride, baseUrl])

    const realtimeKitApiClient = useMemo(() => {
      if (accessToken && realtimeKitBaseUrl) {
        return new RealtimeKitApiClient(realtimeKitBaseUrl, accessToken)
      }
      return null
    }, [accessToken, realtimeKitBaseUrl])

    // Feature flag for Realtime Kit group calls
    // Default: Use RealtimeKit (no env var needed)
    // Set NEXT_PUBLIC_ENABLE_REALTIME_KIT_GROUP_CALLS=false to use old mesh implementation
    const useRealtimeKitForGroupCalls = env('NEXT_PUBLIC_ENABLE_REALTIME_KIT_GROUP_CALLS') !== 'false'

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
      presenceVersion,
      getUserPresence,
      updatePresence,
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

    // Render tracking (after stableActiveConversation is defined)
    const renderCountRef = useRef(0)
    const prevRenderDataRef = useRef({ conversationId: '', messageCount: 0, isLoading: false })
    renderCountRef.current++

    if (process.env.NODE_ENV === 'development') {
      const currentData = {
        conversationId: stableActiveConversation?.id || '',
        messageCount: messages.length,
        isLoading: messagesLoading
      }

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
        .filter(p => p.userId || p.user) // Include if userId exists OR user object exists
        .map(p => {
          // Prefer user object details, fallback to userId only
          const user = p.user
          return {
            id: user?.id || p.userId,
            odId: user?.id || p.userId,
            odName: user
              ? user.displayName ||
                `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                user.username ||
                'Unknown'
              : 'User',
            avatarUrl: user?.avatarUrl
          }
        })
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

    // Listen for platform messages to start calls with specific users
    useStartCallFromPlatform({
      initiateCall,
      createDirectConversation,
      isConnected
    })

    // Group Call functionality - Conditionally use Realtime Kit or Mesh topology
    // Default: Use RealtimeKit. Set NEXT_PUBLIC_ENABLE_REALTIME_KIT_GROUP_CALLS=false to use old mesh implementation
    const meshGroupCall = useGroupCall({
      wsClient: wsClient || null,
      apiClient: apiClient || null,
      currentUser: currentUserAsParticipant,
      accessToken: stableAccessToken
    })

    const realtimeKitGroupCall = useRealtimeKitGroupCall({
      wsClient: wsClient || null,
      apiClient: realtimeKitApiClient,
      currentUser: currentUserAsParticipant,
      accessToken: stableAccessToken,
      translate: t
    })

    // Route to appropriate implementation based on feature flag
    const groupCall = useRealtimeKitForGroupCalls ? realtimeKitGroupCall : meshGroupCall

    const {
      callState: groupCallState,
      isInCall: isInGroupCall,
      localStream: groupLocalStream,
      remoteStreams: groupRemoteStreams,
      participants: groupParticipantsRaw,
      incomingInvite: incomingGroupCallInvite,
      initiateCall: initiateGroupCall,
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
      toggleRaiseHand: toggleGroupRaiseHand,
      sendReaction: sendGroupReaction,
      inviteToCall: inviteToGroupCall,
      reconnectParticipant: reconnectGroupParticipant,
      getConnectionDiagnostics: getGroupConnectionDiagnostics,
      pendingInvites: groupPendingInvites,
      transcriptionEnabled
      // toggleTranscription - Available but not used here (should be in pre-call UI)
    } = groupCall

    // TEST MODE: Allow overriding participants from browser console
    // Usage in console: window.setTestParticipants(5) or window.setTestParticipants('nine')
    const [testParticipantsOverride, setTestParticipantsOverride] = useState<GroupCallParticipant[] | null>(null)

    // Store setter in ref so it's always accessible from window functions
    const setTestParticipantsOverrideRef = useRef(setTestParticipantsOverride)
    setTestParticipantsOverrideRef.current = setTestParticipantsOverride

    // Expose test utilities to window for console access
    useEffect(() => {
      if (typeof window !== 'undefined') {
        ;(window as any).TestParticipantPresets = TestParticipantPresets
        ;(window as any).seedTestParticipants = seedTestParticipants
        ;(window as any).setTestParticipants = (countOrPreset: number | string) => {
          rtkDebug.log('[TEST] setTestParticipants called with:', countOrPreset)
          try {
            let participants: GroupCallParticipant[]
            if (typeof countOrPreset === 'number') {
              participants = seedTestParticipants(countOrPreset)
              rtkDebug.log(
                `✅ Test participants set to ${countOrPreset}, generated ${participants.length} participants`
              )
            } else if (
              typeof countOrPreset === 'string' &&
              TestParticipantPresets[countOrPreset as keyof typeof TestParticipantPresets]
            ) {
              const preset = TestParticipantPresets[countOrPreset as keyof typeof TestParticipantPresets]
              participants = preset()
              rtkDebug.log(
                `✅ Test participants set to preset: ${countOrPreset}, generated ${participants.length} participants`
              )
            } else {
              console.error(
                `❌ Invalid preset: ${countOrPreset}. Available: two, four, six, nine, twelve, mixed, allMuted, allVideoOff`
              )
              return
            }
            // Use ref to ensure we have the latest setter
            setTestParticipantsOverrideRef.current(participants)
            rtkDebug.log(
              '[TEST] State updated, participants:',
              participants.map(p => p.odName)
            )
          } catch (error) {
            console.error('[TEST] Error setting test participants:', error)
          }
        }
        ;(window as any).clearTestParticipants = () => {
          rtkDebug.log('[TEST] Clearing test participants')
          setTestParticipantsOverrideRef.current(null)
          rtkDebug.log('✅ Test participants cleared, using real participants')
        }
        ;(window as any).getTestParticipants = () => {
          rtkDebug.log('[TEST] Current test participants override:', testParticipantsOverride)
          rtkDebug.log('[TEST] Current real participants count:', groupParticipantsRaw.length)
          return testParticipantsOverride
        }
        ;(window as any).testParticipantsDebug = () => {
          rtkDebug.log('🔍 Test Participants Debug Info:')
          rtkDebug.log('  - Function exists:', typeof (window as any).setTestParticipants === 'function')
          rtkDebug.log('  - Current override:', testParticipantsOverride)
          rtkDebug.log('  - Current override count:', testParticipantsOverride?.length || 0)
          rtkDebug.log('  - Real participants count:', groupParticipantsRaw.length)
          rtkDebug.log('  - Is in call:', groupCallState.status !== 'idle')
          rtkDebug.log('  - Call status:', groupCallState.status)
        }
        rtkDebug.log('🎮 Test participant utilities available:')
        rtkDebug.log('  - window.setTestParticipants(5)')
        rtkDebug.log('  - window.setTestParticipants("nine")')
        rtkDebug.log('  - window.clearTestParticipants()')
        rtkDebug.log('  - window.getTestParticipants()')
        rtkDebug.log('  - window.testParticipantsDebug()')
      }
    }, [])

    // Use test participants if override is set, otherwise use real participants
    const groupParticipants = testParticipantsOverride || groupParticipantsRaw

    // Debug log when participants change
    useEffect(() => {
      if (testParticipantsOverride) {
        rtkDebug.log(
          '[TEST] ✅ Using test participants:',
          testParticipantsOverride.length,
          testParticipantsOverride.map(p => p.odName)
        )
      } else {
        rtkDebug.log('[TEST] Using real participants:', groupParticipantsRaw.length)
      }
    }, [testParticipantsOverride, groupParticipantsRaw.length])

    // Stable callback for inviting participants - prevents GroupCallModalRtk re-renders
    const handleInviteParticipant = useCallback(
      (participant: CallParticipant) => {
        inviteToGroupCall([participant], activeConversation?.name)
      },
      [inviteToGroupCall, activeConversation?.name]
    )

    // Combined in-call state
    const isInAnyCall = isInCall || isInGroupCall

    // Reset isStartingCall when call actually connects
    useEffect(() => {
      if (isInAnyCall && isStartingCall) {
        rtkDebug.log('[CHAT] Call connected, resetting isStartingCall flag')
        setIsStartingCall(false)
      }
    }, [isInAnyCall, isStartingCall])

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
      // Guard: prevent duplicate call initiation
      if (isStartingCall) {
        rtkDebug.log('[CHAT] Already starting a call, ignoring duplicate request')
        return
      }

      if (!activeConversation) return

      setIsStartingCall(true)

      try {
        // For direct conversations
        if (activeConversation.type === 'direct') {
          const otherParticipant = activeConversation.participants?.find(
            p => p.userId !== currentUser?.id && p.user?.id !== currentUser?.id
          )
          if (!otherParticipant?.user) {
            setIsStartingCall(false)
            return
          }
          const user = otherParticipant.user
          const participant = {
            id: user.id,
            odId: user.id,
            odName:
              user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
            avatarUrl: user.avatarUrl
          }

          // Use RTK for 1-on-1 calls if feature flag enabled
          if (useRealtimeKitForGroupCalls) {
            rtkDebug.log('[CHAT] Starting 1-on-1 audio call with RTK for direct conversation')
            if (initiateGroupCall) {
              initiateGroupCall(
                activeConversation.id,
                'audio',
                [participant], // Single participant array
                undefined, // Don't pass participant name as conversationName for direct calls
                null, // No calendar meeting
                'direct' // Mark as direct conversation for 1-on-1 naming
              )
            }
          } else {
            // Legacy mesh P2P
            initiateCall(participant, 'audio', activeConversation.id)
          }
        } else if (activeConversation.type === 'group') {
          // For group conversations, use group call
          handleGroupCall('audio')
        }

        // State will be reset when call connects (see useEffect with isInAnyCall)
        // Or after 3 seconds as fallback for failed calls
        setTimeout(() => setIsStartingCall(false), 3000)
      } catch (error) {
        console.error('[CHAT] Error starting audio call:', error)
        setIsStartingCall(false)
      }
    }

    const handleVideoCall = () => {
      // Guard: prevent duplicate call initiation
      if (isStartingCall) {
        rtkDebug.log('[CHAT] Already starting a call, ignoring duplicate request')
        return
      }

      if (!activeConversation) return

      setIsStartingCall(true)

      try {
        // For direct conversations
        if (activeConversation.type === 'direct') {
          const otherParticipant = activeConversation.participants?.find(
            p => p.userId !== currentUser?.id && p.user?.id !== currentUser?.id
          )
          if (!otherParticipant?.user) {
            setIsStartingCall(false)
            return
          }
          const user = otherParticipant.user
          const participant = {
            id: user.id,
            odId: user.id,
            odName:
              user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
            avatarUrl: user.avatarUrl
          }

          // Use RTK for 1-on-1 calls if feature flag enabled
          if (useRealtimeKitForGroupCalls) {
            rtkDebug.log('[CHAT] Starting 1-on-1 video call with RTK for direct conversation')
            if (initiateGroupCall) {
              initiateGroupCall(
                activeConversation.id,
                'video',
                [participant], // Single participant array
                undefined, // Don't pass participant name as conversationName for direct calls
                null, // No calendar meeting
                'direct' // Mark as direct conversation for 1-on-1 naming
              )
            }
          } else {
            // Legacy mesh P2P
            initiateCall(participant, 'video', activeConversation.id)
          }
        } else if (activeConversation.type === 'group') {
          // For group conversations, use group call
          handleGroupCall('video')
        }

        // State will be reset when call connects (see useEffect with isInAnyCall)
        // Or after 3 seconds as fallback for failed calls
        setTimeout(() => setIsStartingCall(false), 3000)
      } catch (error) {
        console.error('[CHAT] Error starting video call:', error)
        setIsStartingCall(false)
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

      rtkDebug.log('[CHAT] handleGroupCall check:', {
        conversationId: activeConversation.id,
        existingCall,
        activeCalls,
        shouldJoinExisting
      })

      if (shouldJoinExisting) {
        // Join the existing call using the roomId (meetingId) from activeCalls
        if (!existingCall?.roomId) {
          rtkDebug.error('[CHAT] Cannot join - no roomId in existingCall!')
          return
        }
        rtkDebug.log(
          '[CHAT] Joining existing call with roomId:',
          existingCall.roomId,
          'conversationId:',
          activeConversation.id
        )
        // Pass undefined for initialParticipants - conversationId is handled internally by the hook
        // The hook will find conversationId from activeConversationCalls using roomId
        joinGroupCall(existingCall.roomId, callType, undefined)
      } else {
        // Get all participants including current user
        const callParticipants: CallParticipant[] =
          activeConversation.participants
            ?.filter(p => p.userId || p.user) // Include if userId exists OR user object exists
            .map(p => {
              // Prefer user object details, fallback to userId only
              const user = p.user
              return {
                id: user?.id || p.userId,
                odId: user?.id || p.userId,
                odName: user
                  ? user.displayName ||
                    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                    user.username ||
                    'Unknown'
                  : 'User',
                avatarUrl: user?.avatarUrl
              }
            }) || []

        // Use conversation ID as the room ID, pass conversation name for the invite
        if (initiateGroupCall) {
          initiateGroupCall(
            activeConversation.id,
            callType,
            callParticipants,
            activeConversation.name,
            null, // No calendar meeting
            'group' // Mark as group conversation
          )
        }
      }
    }

    // Handler for adding a participant to a 1:1 call (upgrades to group call)
    const handleUpgradeToGroupCall = (newParticipant: CallParticipant) => {
      if (!activeConversation || !currentUserAsParticipant || !callState.remoteParticipant) return

      // Build participant list: current user + current remote + new participant
      const callParticipants: CallParticipant[] = [
        currentUserAsParticipant,
        callState.remoteParticipant,
        newParticipant
      ]

      // End the current 1:1 call first
      endCall()

      // Small delay to ensure clean transition
      setTimeout(() => {
        // Generate a new room ID for the group call (use conversation ID or create new)
        const roomId = activeConversation.id
        const callType = callState.type || 'video'
        if (initiateGroupCall) {
          initiateGroupCall(roomId, callType, callParticipants, activeConversation.name)
        }
      }, 100)
    }

    // Initialize presence status from conversation participants' user data
    // Only initialize each user once from API data, then rely on WebSocket updates
    useEffect(() => {
      try {
        if (!conversations || conversations.length === 0 || !updatePresence) return

        // Extract all users from conversations and initialize their presence
        conversations.forEach(conv => {
          conv.participants?.forEach(p => {
            if (p.user && p.userId !== currentUser?.id && p.user.id !== currentUser?.id) {
              const userId = p.user.id

              // Only initialize this user's presence once from API data
              // After that, WebSocket events will keep it updated
              if (!presenceInitializedUsersRef.current.has(userId)) {
                presenceInitializedUsersRef.current.add(userId)

                // Extract presence data from API response
                const lastSeen = p.user.lastSeen || p.user.lastSeenAt
                const isOnline = typeof p.user.isOnline === 'boolean' ? p.user.isOnline : p.user.isActive
                const state = isOnline ? 'online' : 'offline'
                const lastSeenString = lastSeen instanceof Date ? lastSeen.toISOString() : lastSeen

                // Extract detailed user status from API response
                const userStatus = p.user.currentStatus
                  ? {
                      status: p.user.currentStatus,
                      isSystemStatus: p.user.isSystemStatus || false,
                      statusMessage: p.user.statusMessage,
                      isOnline: isOnline || false
                    }
                  : undefined

                // Initialize presence with full status details
                updatePresence(userId, { state, lastSeen: lastSeenString, userStatus })

                rtkDebug.log('[Chat] Initialized presence from API for user:', userId, { state, userStatus })
              }
            }
          })
        })
      } catch (error) {
        console.error('[Chat] Error initializing presence:', error)
      }
    }, [conversations, currentUser?.id, updatePresence])

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
              confidence: expertResult.expertResponse.confidence,
              initiatedBy: currentUser?.id // Track who initiated this expert interaction
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
                ?.filter(p => p.userId || p.user) // Include if userId exists OR user object exists
                .map(p => {
                  const user = p.user
                  const name = user
                    ? user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || ''
                    : ''
                  return {
                    id: p.userId || user?.id || '',
                    odId: p.userId || user?.id || '', // Open Directory ID for calendar/meetings
                    name,
                    email: user?.email || '',
                    employeeId: user?.employeeId
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
                    everyAiSessionId: aiResponse.sessionId,
                    initiatedBy: currentUser?.id // Track who initiated this AI interaction
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

    // Handler for sending messages from inline EveryAI forms and interactions
    const handleAISendMessage = useCallback(
      async (content: string, metadata?: Record<string, any>) => {
        if (!activeConversationId) return

        try {
          // Check if this is a form submission to EveryAI
          if (metadata?.isFormSubmission) {
            // Send the form submission to EveryAI and process the response
            const conversationContext = {
              conversationId: activeConversationId,
              conversationName: activeConversation?.name,
              participants: activeConversation?.participants
                ?.filter(p => p.user)
                .map(p => {
                  const user = p.user!
                  const name =
                    user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || ''
                  return {
                    id: p.userId || user.id,
                    odId: p.userId || user.id,
                    name,
                    email: user.email,
                    employeeId: user.employeeId
                  }
                })
                .filter(p => p.name),
              existingSessionId: messages
                .filter(m => m.metadata?.isAIResponse && m.metadata?.everyAiSessionId)
                .map(m => m.metadata?.everyAiSessionId as string)
                .pop(),
              currentUserId: currentUser?.id,
              currentUserName: currentUser
                ? currentUser.displayName ||
                  `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
                  currentUser.username ||
                  ''
                : ''
            }

            // Process through EveryAI (no file attachments for form submissions)
            const aiResponse = await processEveryAIMessage(content, [], conversationContext, [])

            if (aiResponse && !aiResponse.error) {
              // Check if we have any content to display (text OR outputs)
              const responseText = aiResponse.text?.trim() || ''
              const hasOutputs = aiResponse.outputs && aiResponse.outputs.length > 0

              if (responseText || hasOutputs) {
                await new Promise(resolve => setTimeout(resolve, 100))

                const aiMetadata: Record<string, any> = {
                  isAIResponse: true,
                  aiAssistant: 'Every',
                  originalQuestion: content,
                  everyAiSessionId: aiResponse.sessionId,
                  isFormResult: true, // Mark this as a result from form submission
                  initiatedBy: currentUser?.id // Track who initiated this AI interaction
                }

                if (aiResponse.scheduledMeeting) {
                  aiMetadata.scheduledMeeting = aiResponse.scheduledMeeting
                }

                if (hasOutputs) {
                  aiMetadata.outputs = aiResponse.outputs
                }

                // If we have outputs but no text, use a default message
                const messageText = responseText || 'Processing your request...'

                await sendMessage(activeConversationId, messageText, aiMetadata)
                clearStreamingText()
              }
            }
          } else {
            // Regular message send
            await sendMessage(activeConversationId, content, metadata)
          }
        } catch {
          // Error sending AI message
        }
      },
      [
        activeConversationId,
        activeConversation,
        messages,
        currentUser,
        processEveryAIMessage,
        sendMessage,
        clearStreamingText
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
      // If this chat is rendered via the mobile WebView entrypoint (/platform/mobile/**),
      // always force single-column mode. Android WebView can occasionally report a ~980px
      // layout viewport, which would otherwise trigger split-pane desktop layout.
      if (isEmbeddedMobile) {
        setViewMode('mobile')
        return
      }

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
    }, [isEmbeddedMobile])

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

      rtkDebug.log('[CHAT] Building activeCallInfo:', {
        conversationId: stableActiveConversation.id,
        hasActiveCall: !!activeCall,
        activeCall
      })

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
      rtkDebug.log('[CHAT] handleJoinActiveCall - showing rejoin modal:', activeCallInfo)

      // Show pre-join modal to let user set up mic/camera before joining
      setRejoinModalState({
        roomId: activeCallInfo.roomId,
        callType: activeCallInfo.callType,
        conversationName: stableActiveConversation.name,
        participantCount: activeCallInfo.participantCount
      })
    }, [activeCallInfo, stableActiveConversation])

    // Handle rejoin with user preferences
    const handleRejoinWithPreferences = useCallback(
      (preferences: { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled: boolean }) => {
        if (!rejoinModalState) return

        rtkDebug.log('[CHAT] Rejoining call with preferences:', preferences, rejoinModalState)

        // Don't close modal immediately - let it show "Joining..." state
        // It will be closed when the call actually starts (via useEffect watching groupCallState)

        // Store preferences for the join
        // The hook will apply these when joining
        // For now, we pass them through handleGroupCall which will need to be updated
        // to accept preferences

        // Pass true to indicate we're joining an existing call (don't ring everyone)
        handleGroupCall(rejoinModalState.callType, true)
      },
      [rejoinModalState, handleGroupCall]
    )

    // Close rejoin modal when call actually starts
    useEffect(() => {
      if (rejoinModalState && groupCallState.status !== 'idle') {
        rtkDebug.log('[CHAT] Call started, closing rejoin modal')
        setRejoinModalState(null)
      }
    }, [rejoinModalState, groupCallState.status])

    // Handle rejoin cancel
    const handleRejoinCancel = useCallback(() => {
      rtkDebug.log('[CHAT] Rejoin cancelled')
      setRejoinModalState(null)
    }, [])

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
        {/* Performance Monitor - dev only */}
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
                presenceMap={presenceMap}
                presenceVersion={presenceVersion}
                conversationExpertCounts={conversationExpertCounts}
                wsClient={wsClient}
                isConnected={isConnected}
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
                    isStartingCall={isStartingCall}
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

                  {/* Message list */}
                  <MessageList
                    messages={messages}
                    currentUserId={currentUser?.id || null}
                    conversationType={stableActiveConversation.type}
                    isLoading={messagesLoading}
                    hasMore={hasMoreMessages}
                    onLoadMore={loadMoreMessages}
                    conversationId={activeConversationId}
                    typingUsers={Object.values(typingUsers || {}).flat()}
                    onReplyToAI={handleReplyToAI}
                    accessToken={accessToken}
                    onSendMessage={handleAISendMessage}
                    participants={stableActiveConversation.participants}
                    apiClient={apiClient}
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
            userName={currentUserAsParticipant?.odName}
            userAvatarUrl={currentUserAsParticipant?.avatarUrl}
            onAccept={acceptGroupInvite}
            onDecline={declineGroupInvite}
            prefixDataTestId={`${prefixDataTestId}-incoming-group-call`}
          />
        )}

        {/* Rejoin Call Dialog - Pre-join setup for rejoining existing calls */}
        <RejoinCallDialog
          isOpen={!!rejoinModalState}
          callType={rejoinModalState?.callType || 'video'}
          conversationName={rejoinModalState?.conversationName}
          participantCount={rejoinModalState?.participantCount}
          userName={currentUserAsParticipant?.odName}
          userAvatarUrl={currentUserAsParticipant?.avatarUrl}
          onJoin={handleRejoinWithPreferences}
          onCancel={handleRejoinCancel}
          prefixDataTestId={`${prefixDataTestId}-rejoin-call`}
        />

        {/* Pre-Call Setup Dialog - Show during setup and joining, and connected until room is joined (outgoing calls only) */}
        <PreCallSetupDialog
          isOpen={
            (groupCallState.status === 'setup' ||
              groupCallState.status === 'joining' ||
              (groupCallState.status === 'connected' && realtimeKitGroupCall.meeting?.self?.roomState !== 'joined')) &&
            !groupCallState.isMinimized &&
            !incomingGroupCallInvite
          }
          callType={groupCallState.callType}
          conversationName={
            activeConversation?.type === 'direct'
              ? undefined // For direct calls, don't pass conversation name (will show "Call")
              : activeConversation?.name // For group/meeting, use conversation name
          }
          participantCount={groupParticipants.length}
          userName={
            activeConversation?.type === 'direct'
              ? // For direct calls, show the OTHER participant's name
                activeConversation.participants?.find(
                  p => p.userId !== currentUser?.id && p.user?.id !== currentUser?.id
                )?.user?.displayName ||
                activeConversation.participants?.find(
                  p => p.userId !== currentUser?.id && p.user?.id !== currentUser?.id
                )?.user?.username ||
                'Unknown'
              : currentUserAsParticipant?.odName // For group calls, show your name
          }
          userAvatarUrl={
            activeConversation?.type === 'direct'
              ? // For direct calls, show the OTHER participant's avatar
                activeConversation.participants?.find(
                  p => p.userId !== currentUser?.id && p.user?.id !== currentUser?.id
                )?.user?.avatarUrl
              : currentUserAsParticipant?.avatarUrl // For group calls, show your avatar
          }
          conversationType={activeConversation?.type as 'direct' | 'group' | 'meeting'}
          onStart={preferences => {
            if (realtimeKitGroupCall.confirmStartCall) {
              realtimeKitGroupCall.confirmStartCall(preferences)
            }
          }}
          onCancel={() => {
            if (realtimeKitGroupCall.cancelSetup) {
              realtimeKitGroupCall.cancelSetup()
            }
          }}
          prefixDataTestId={`${prefixDataTestId}-pre-call-setup`}
        />

        {/* Group Call Modal - Use Realtime Kit or Mesh based on feature flag */}
        {groupCallState.status === 'connected' &&
          realtimeKitGroupCall.meeting?.self?.roomState === 'joined' &&
          (useRealtimeKitForGroupCalls ? (
            <RealtimeKitProvider value={realtimeKitGroupCall.meeting}>
              <GroupCallModalRtk
                key={testParticipantsOverride ? `test-${testParticipantsOverride.length}` : 'real'}
                callState={groupCallState}
                localStream={groupLocalStream}
                remoteStreams={groupRemoteStreams}
                participants={groupParticipants}
                pendingInvites={groupPendingInvites}
                activeSpeakerId={realtimeKitGroupCall.activeSpeakerId}
                activeSpeakerHistory={realtimeKitGroupCall.activeSpeakerHistory}
                onEndCall={leaveGroupCall}
                onToggleMute={toggleGroupMute}
                onToggleVideo={toggleGroupVideo}
                onToggleScreenShare={toggleGroupScreenShare}
                onSetVideoQuality={setGroupVideoQuality}
                onToggleMinimize={toggleGroupMinimize}
                onToggleBackground={toggleGroupBackground}
                onToggleRaiseHand={toggleGroupRaiseHand}
                onSendReaction={sendGroupReaction}
                backgroundEnabled={groupCallState.backgroundEnabled}
                prefixDataTestId={`${prefixDataTestId}-rtk-group-call`}
                availableParticipants={availableParticipantsForCall}
                onInviteParticipant={handleInviteParticipant}
                onReconnectParticipant={reconnectGroupParticipant}
                getConnectionDiagnostics={getGroupConnectionDiagnostics}
                apiClient={apiClient || undefined}
                accessToken={accessToken}
                currentUserId={currentUser?.id || null}
                currentUser={currentUser}
                conversationName={realtimeKitGroupCall.currentCallConversationName || activeConversation?.name}
                wsClient={wsClient}
                transcriptionEnabled={transcriptionEnabled}
                activeConversation={activeConversation}
                activeExperts={activeConversation?.activeExperts || activeExperts || []}
                hideReactionsAndHandRaise={activeConversation?.type === 'direct' && groupParticipants.length <= 2}
              />
            </RealtimeKitProvider>
          ) : (
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
          ))}
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if accessToken or prefixDataTestId changes
    return prevProps.accessToken === nextProps.accessToken && prevProps.prefixDataTestId === nextProps.prefixDataTestId
  }
)

// Wrap Chat component with TranslationProvider for performance optimization
export const Chat: React.FC<ChatProps> = props => {
  return (
    <TranslationProvider>
      <Toaster />
      <ChatInner {...props} />
    </TranslationProvider>
  )
}
