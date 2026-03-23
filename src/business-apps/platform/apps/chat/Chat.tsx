import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { Alert, AlertDescription, Spinner, Toaster } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useChatClient } from './hooks/useChatClient'
import { useChatEnv } from './hooks/useChatEnv'
import { useChatCallHandlers } from './hooks/useChatCallHandlers'
import { useChatConversationHandlers } from './hooks/useChatConversationHandlers'
import { useChatMessageHandlers, type UseChatMessageHandlersParams } from './hooks/useChatMessageHandlers'
import { useChatPresenceSync } from './hooks/useChatPresenceSync'
import { useChatRejoinCall } from './hooks/useChatRejoinCall'
import { useChatViewMode } from './hooks/useChatViewMode'
import type { Conversation, User } from './types'
import type { UserPresence } from './hooks/usePresence'
import { useRealtimeKitGroupCall } from './hooks/useRealtimeKitGroupCall'
import { useEveryAIChat } from './hooks/useEveryAIChat'
import { useChatExperts } from './hooks/useChatExperts'
import { useOpenChatFromPlatform } from './hooks/useOpenChatFromPlatform'
import { useStartCallFromPlatform } from './hooks/useStartCallFromPlatform'
import { useEmployeeAvatars } from './hooks/useEmployeeAvatars'
import { ChatConversationView } from './components/ChatConversationView'
import { ChatLayout } from './components/ChatLayout'
import { ConversationList } from './components/ConversationList'
import { CallHistory } from './components/CallHistory/CallHistory'
import { ChatModals } from './components/ChatModals'
import { playNudgeSound, applyShakeAnimation, injectNudgeStyles } from './utils/nudgeUtils'
// import { initGlobalMinimizedCallRenderer } from './components/GlobalMinimizedCall'
import type { CallParticipant } from './services/webrtcClient'
import type { GroupCallParticipant } from './services/groupWebrtcClient'
import { TranslationProvider, useChatTranslation } from './contexts/TranslationContext'
import { seedTestParticipants, TestParticipantPresets } from './utils/seedTestParticipants'

// Presence info type for sharing with other components
export interface PresenceInfo {
  state: 'online' | 'offline'
  lastSeen?: string
}

export interface InitialOpenWithUserPayload {
  userId: string
  userName?: string
  prefilledMessage?: string
  metadata?: Record<string, unknown>
}

interface ChatProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  onPresenceMapChange?: (presenceMap: Map<string, PresenceInfo>) => void
  onActiveCallsChange?: (activeCalls: Record<string, any>) => void
  calendarApiClient?: any | null // CalendarApiClient type
  /** When set, open this user's conversation on mount without showing the list (e.g. from sidepanel pending open) */
  initialOpenWithUser?: InitialOpenWithUserPayload | null
}

const MARKED_AS_UNREAD_STORAGE_KEY_PREFIX = 'gba-chat-marked-as-unread'

function getMarkedAsUnreadStorageKey(userId: string): string {
  return `${MARKED_AS_UNREAD_STORAGE_KEY_PREFIX}-${userId}`
}

function loadMarkedAsUnreadFromStorage(userId: string): Set<string> {
  try {
    const raw =
      globalThis.localStorage === undefined
        ? null
        : globalThis.localStorage.getItem(getMarkedAsUnreadStorageKey(userId))
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    return Array.isArray(arr) ? new Set(arr.filter((id): id is string => typeof id === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function saveMarkedAsUnreadToStorage(userId: string, ids: Set<string>): void {
  try {
    if (globalThis.localStorage !== undefined) {
      globalThis.localStorage.setItem(getMarkedAsUnreadStorageKey(userId), JSON.stringify([...ids]))
    }
  } catch {
    // ignore
  }
}

const ChatInner: React.FC<ChatProps> = memo(
  ({
    accessToken: accessTokenProp,
    additionalData,
    prefixDataTestId = 'chat',
    onPresenceMapChange,
    onActiveCallsChange,
    calendarApiClient,
    initialOpenWithUser
  }) => {
    const t = useChatTranslation()
    const containerRef = useRef<HTMLDivElement>(null)
    const chatViewRef = useRef<HTMLDivElement>(null)
    const [showConversationList, setShowConversationList] = useState(!initialOpenWithUser)
    const getShowCallHistoryFromUrl = useCallback((): boolean => {
      if (typeof globalThis.window === 'undefined') return false
      return new URLSearchParams(globalThis.window.location.search).get('view') === 'call-history'
    }, [])
    const [showCallHistory, setShowCallHistory] = useState(getShowCallHistoryFromUrl)
    const [missedCallsCount, setMissedCallsCount] = useState(0)
    const [callHistoryRefreshTrigger, setCallHistoryRefreshTrigger] = useState(0)
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
    const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [draftMessage, setDraftMessage] = useState<string>('')
    const [isExpertProcessing, setIsExpertProcessing] = useState(false)
    const [processingExpert, setProcessingExpert] = useState<{ name: string; color?: string } | null>(null)
    const [isStartingCall, setIsStartingCall] = useState(false)
    const [markedAsUnreadIds, setMarkedAsUnreadIds] = useState<Set<string>>(() => new Set())
    const registerMentionEntityRef = useRef<((entity: any, text: string, startIndex: number) => any) | null>(null)
    const focusInputRef = useRef<(() => void) | null>(null)
    const urlContextProcessed = useRef(false)
    const conversationIdFromUrlProcessed = useRef(false)
    const urlCallActionProcessed = useRef(false)
    const [pendingMessageId, setPendingMessageId] = useState<string | null>(null)
    const activeConversationIdRef = useRef<string | null>(null)
    const presenceInitializedUsersRef = useRef<Set<string>>(new Set())
    const lastNudgeTimeRef = useRef<number>(0)
    const NUDGE_COOLDOWN_MS = 30000 // 30 seconds
    const pendingCallFromListRef = useRef<{ conversationId: string; type: 'audio' | 'video' } | null>(null)
    const isEmbeddedMobile = additionalData?.__mobile === true

    // Inject nudge animation styles on mount
    useEffect(() => {
      injectNudgeStyles()
    }, [])

    // Reset URL processing refs on mount to allow restoration after hard refresh
    useEffect(() => {
      // Only reset if there's a conversationId in URL (user refreshed with a conversation open)
      const urlParams = new URLSearchParams(globalThis.window.location.search)
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

    const { apiUrl, wsUrl, wsSocketPath, realtimeKitApiClient } = useChatEnv({ accessToken })

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
      updateConversation,
      updateMessage,
      ensureMessageInList,
      startTyping,
      stopTyping,
      sendNudge,
      registerNudgeCallback,
      markAsUnread,
      apiClient,
      wsClient,
      conversationSearch,
      conversationFilterKind,
      conversationUnreadOnly,
      setConversationSearch,
      setConversationFilterKind,
      setConversationUnreadOnly
      // Note: activeCalls is now provided by useRealtimeKitGroupCall hook as activeConversationCalls
    } = chatClient

    // Fetch unseen missed-calls count for badge (when user and apiClient available)
    useEffect(() => {
      if (!apiClient || !currentUser?.id) return
      apiClient
        .getMissedCallsCount()
        .then(setMissedCallsCount)
        .catch(() => setMissedCallsCount(0))
    }, [apiClient, currentUser?.id])

    const markedAsUnreadHydratedRef = useRef(false)
    useEffect(() => {
      if (currentUser?.id && !markedAsUnreadHydratedRef.current) {
        markedAsUnreadHydratedRef.current = true
        setMarkedAsUnreadIds(loadMarkedAsUnreadFromStorage(currentUser.id))
      }
    }, [currentUser?.id])

    // Subscribe to real-time missed-count updates from WebSocket
    useEffect(() => {
      if (!wsClient) return
      const unsubscribe = wsClient.onCallHistoryMissedCount((data: { count: number }) => {
        setMissedCallsCount(data.count)
        setCallHistoryRefreshTrigger(prev => prev + 1)
      })
      return unsubscribe
    }, [wsClient])

    // Refresh call history list when a call ends (outcomes may have been recorded)
    useEffect(() => {
      if (!wsClient) return
      wsClient.onConversationCallEnded(() => {
        setCallHistoryRefreshTrigger(prev => prev + 1)
      })
    }, [wsClient])

    useChatPresenceSync({
      presenceMap,
      presenceVersion,
      onPresenceMapChange,
      activeCalls: chatClient.activeCalls,
      onActiveCallsChange,
      isConnected,
      presenceInitializedUsersRef,
      conversations,
      currentUserId: currentUser?.id,
      updatePresence
    })

    // Fetch and enrich current user's avatar from Employee table if missing
    const { fetchAvatars } = useEmployeeAvatars(accessToken)
    const [enrichedCurrentUser, setEnrichedCurrentUser] = useState<User | null>(null)

    useEffect(() => {
      const enrichCurrentUserAvatar = async () => {
        if (!currentUser) {
          setEnrichedCurrentUser(null)
          return
        }

        // If avatar already exists, use current user as-is
        if (currentUser.avatarUrl) {
          setEnrichedCurrentUser(currentUser)
          return
        }

        // Fetch avatar from Employee table
        try {
          const avatarMap = await fetchAvatars([currentUser.id])
          const avatarUrl = avatarMap.get(currentUser.id)

          setEnrichedCurrentUser({
            ...currentUser,
            avatarUrl: avatarUrl || undefined
          })
        } catch (error) {
          console.error('[Chat] Failed to fetch current user avatar:', error)
          setEnrichedCurrentUser(currentUser)
        }
      }

      enrichCurrentUserAvatar()
    }, [currentUser, fetchAvatars])

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

    const { viewMode, isSingleViewMode, showListView, showChatView } = useChatViewMode({
      containerRef,
      isEmbeddedMobile,
      showConversationList,
      hasConversation: !!stableActiveConversation || showCallHistory
    })

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

    // Sync call history view with URL (bookmarkable; pushState on open so back closes panel)
    const updateCallHistoryUrl = useCallback((show: boolean, push = false) => {
      if (typeof globalThis.window === 'undefined') return
      const urlParams = new URLSearchParams(globalThis.window.location.search)
      if (show) urlParams.set('view', 'call-history')
      else urlParams.delete('view')
      const query = urlParams.toString()
      const newUrl = query ? `${globalThis.window.location.pathname}?${query}` : globalThis.window.location.pathname
      if (push) globalThis.window.history.pushState({}, '', newUrl)
      else globalThis.window.history.replaceState({}, '', newUrl)
    }, [])
    useEffect(() => {
      const handlePopState = () => setShowCallHistory(getShowCallHistoryFromUrl())
      globalThis.window.addEventListener('popstate', handlePopState)
      return () => globalThis.window.removeEventListener('popstate', handlePopState)
    }, [getShowCallHistoryFromUrl])

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

    // Open conversation on mount when opened from sidepanel (pending open) so user doesn't see list → conversation transition
    const initialOpenProcessedRef = useRef(false)
    useEffect(() => {
      if (!initialOpenWithUser || !isConnected || initialOpenProcessedRef.current) return
      initialOpenProcessedRef.current = true
      const { userId, prefilledMessage } = initialOpenWithUser
      createDirectConversation(userId)
        .then(() => {
          setShowConversationList(false)
          if (prefilledMessage) {
            setTimeout(() => setDraftMessage(prefilledMessage), 200)
          }
          try {
            window.dispatchEvent(new CustomEvent('chat:conversation-ready'))
            if (window.parent !== window) {
              window.parent.postMessage({ type: 'CHAT_CONVERSATION_READY' }, '*')
            }
          } catch {
            // ignore
          }
        })
        .catch(() => {
          initialOpenProcessedRef.current = false
        })
    }, [initialOpenWithUser, isConnected, createDirectConversation, setShowConversationList, setDraftMessage])

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

    // Convert current user to CallParticipant format
    // Use enrichedCurrentUser (with avatar from Employee table) if available
    const currentUserAsParticipant: CallParticipant | null = useMemo(() => {
      const userToUse = enrichedCurrentUser || currentUser
      if (!userToUse) return null
      return {
        id: userToUse.id,
        odId: userToUse.id,
        odName:
          userToUse.displayName ||
          `${userToUse.firstName || ''} ${userToUse.lastName || ''}`.trim() ||
          userToUse.username ||
          'Unknown',
        avatarUrl: userToUse.avatarUrl
      }
    }, [enrichedCurrentUser, currentUser])

    // Group call functionality - Realtime Kit (RTK) only
    const realtimeKitGroupCall = useRealtimeKitGroupCall({
      wsClient: wsClient || null,
      apiClient: realtimeKitApiClient,
      chatApiClient: apiClient, // Pass ChatApiClient for in-call chat functionality
      calendarApiClient: calendarApiClient, // Pass CalendarApiClient for AI transcription settings
      callConversation: null, // Computed in hook's effect using conversationsRef
      activeConversation: activeConversation, // Pass active conversation for in-call chat
      currentUser: currentUserAsParticipant,
      accessToken: stableAccessToken,
      translate: t,
      conversations: conversations // Pass conversations so hook can compute callConversation
    })

    const groupCall = realtimeKitGroupCall

    const {
      callState: groupCallState,
      isInCall: isInGroupCall,
      participants: groupParticipantsRaw,
      incomingInvite: incomingGroupCallInvite,
      initiateCall: initiateGroupCall,
      joinCall: joinGroupCall,
      acceptInvite: acceptGroupInvite,
      declineInvite: declineGroupInvite,
      activeConversationCalls
    } = groupCall

    // NOTE: callConversation is now computed inside the hook based on conversations and roomId
    // The hook syncs it to globalCallManager automatically

    // Listen for platform messages to start calls with specific users (via Cloudflare RealtimeKit)
    useStartCallFromPlatform({
      initiateGroupCall,
      createDirectConversation,
      isConnected
    })

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
          try {
            let participants: GroupCallParticipant[]
            if (typeof countOrPreset === 'number') {
              participants = seedTestParticipants(countOrPreset)
            } else if (
              typeof countOrPreset === 'string' &&
              TestParticipantPresets[countOrPreset as keyof typeof TestParticipantPresets]
            ) {
              const preset = TestParticipantPresets[countOrPreset as keyof typeof TestParticipantPresets]
              participants = preset()
            } else {
              console.error(
                `❌ Invalid preset: ${countOrPreset}. Available: two, four, six, nine, twelve, mixed, allMuted, allVideoOff`
              )
              return
            }
            setTestParticipantsOverrideRef.current(participants)
          } catch (error) {
            console.error('[TEST] Error setting test participants:', error)
          }
        }
        ;(window as any).clearTestParticipants = () => {
          setTestParticipantsOverrideRef.current(null)
        }
        ;(window as any).getTestParticipants = () => {
          return testParticipantsOverride
        }
        ;(window as any).testParticipantsDebug = () => {
          // Test participant debug helper (no logging per plan)
        }
      }
    }, [])

    // Use test participants if override is set, otherwise use real participants
    const groupParticipants = testParticipantsOverride || groupParticipantsRaw

    // Combined in-call state (RTK only; P2P removed)
    const isInAnyCall = isInGroupCall

    // Reset isStartingCall when call actually connects
    useEffect(() => {
      if (isInAnyCall && isStartingCall) {
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

    const {
      sendMessageVoid,
      handleSendMessage,
      handleAISendMessage,
      handleReplyToAI,
      handleTypingStart,
      handleTypingStop
    } = useChatMessageHandlers({
      activeConversationId,
      activeConversation,
      messages,
      currentUser,
      sendMessage,
      apiClient,
      hasEveryMention,
      processEveryAIMessage: processEveryAIMessage as UseChatMessageHandlersParams['processEveryAIMessage'],
      processExpertMention,
      clearStreamingText,
      setDraftMessage,
      setIsExpertProcessing,
      setProcessingExpert,
      activeExperts,
      registerMentionEntityRef,
      focusInputRef,
      activeConversationIdRef,
      startTyping,
      stopTyping
    })

    const { handleAudioCall, handleVideoCall } = useChatCallHandlers({
      activeConversation,
      currentUser,
      initiateGroupCall: initiateGroupCall
        ? (convId, callType, participants, name, meetingId, convType) => {
            void initiateGroupCall(convId, callType, participants, name, meetingId, convType)
          }
        : null,
      joinGroupCall: joinGroupCall
        ? (roomId, callType, initialParticipants) => {
            void joinGroupCall(roomId, callType, initialParticipants)
          }
        : null,
      activeConversationCalls,
      isStartingCall,
      setIsStartingCall,
      isConnected,
      urlCallActionProcessed
    })

    const {
      handleCreateConversation,
      handleConversationSelect,
      handleBack,
      handleCloseConversation,
      handleRemoveConversation,
      handleCreateGroup,
      handleCreateGroupSubmit,
      handleShowGroupSettings,
      handleCloseGroupSettings,
      handleNudge
    } = useChatConversationHandlers({
      setActiveConversation,
      setShowConversationList,
      setShowCreateGroupModal,
      setShowGroupSettingsModal,
      setErrorMessage,
      conversationIdFromUrlProcessed,
      apiClient,
      createDirectConversation,
      createGroupConversation,
      closeConversation,
      viewMode,
      activeConversation,
      currentUser,
      sendNudge,
      refreshConversations: refreshConversations ? () => void refreshConversations() : undefined,
      t,
      lastNudgeTimeRef,
      NUDGE_COOLDOWN_MS
    })

    const handlePinConversation = useCallback(() => {
      const id = activeConversationId
      if (!id || !apiClient || !updateConversation) return
      const currentlyPinned = activeConversation?.isPinned ?? false
      apiClient
        .updateConversationPreferences(id, {
          isPinned: !currentlyPinned,
          pinnedOrder: currentlyPinned ? null : undefined
        })
        .then(prefs => {
          updateConversation(id, {
            isPinned: prefs.isPinned,
            pinnedOrder: prefs.pinnedOrder
          })
          refreshConversations?.()
        })
        .catch(() => {})
    }, [activeConversationId, activeConversation?.isPinned, apiClient, updateConversation, refreshConversations])

    const handleMuteConversation = useCallback(
      (muted: boolean) => {
        const id = activeConversationId
        if (!id || !apiClient || !updateConversation) return
        apiClient
          .updateConversationPreferences(id, { isMuted: muted })
          .then(prefs => {
            updateConversation(id, { isMuted: prefs.isMuted })
          })
          .catch(() => {})
      },
      [activeConversationId, apiClient, updateConversation]
    )

    const handlePinChangeFromList = useCallback(
      (conversationId: string, isPinned: boolean) => {
        if (!apiClient || !updateConversation) return
        apiClient
          .updateConversationPreferences(conversationId, {
            isPinned,
            pinnedOrder: isPinned ? undefined : null
          })
          .then(prefs => {
            updateConversation(conversationId, {
              isPinned: prefs.isPinned,
              pinnedOrder: prefs.pinnedOrder
            })
            refreshConversations?.()
          })
          .catch(() => {})
      },
      [apiClient, updateConversation, refreshConversations]
    )

    const handleMuteChangeFromList = useCallback(
      (conversationId: string, isMuted: boolean) => {
        if (!apiClient || !updateConversation) return
        apiClient
          .updateConversationPreferences(conversationId, { isMuted })
          .then(prefs => {
            updateConversation(conversationId, { isMuted: prefs.isMuted })
          })
          .catch(() => {})
      },
      [apiClient, updateConversation]
    )

    const handleNudgeFromList = useCallback(
      (conversationId: string, toUserId: string) => {
        if (!sendNudge) return
        const now = Date.now()
        const timeSinceLastNudge = now - lastNudgeTimeRef.current
        if (timeSinceLastNudge < NUDGE_COOLDOWN_MS) {
          const secondsRemaining = Math.ceil((NUDGE_COOLDOWN_MS - timeSinceLastNudge) / 1000)
          setErrorMessage(t('chat-nudgeCooldown', { seconds: secondsRemaining }))
          setTimeout(() => setErrorMessage(null), 3000)
          return
        }
        const success = sendNudge(conversationId, toUserId)
        if (success) lastNudgeTimeRef.current = now
      },
      [sendNudge, setErrorMessage, t, NUDGE_COOLDOWN_MS]
    )

    const handleStartAudioCallFromList = useCallback(
      (conversation: Conversation) => {
        setActiveConversation(conversation)
        pendingCallFromListRef.current = { conversationId: conversation.id, type: 'audio' }
      },
      [setActiveConversation]
    )

    const handleStartVideoCallFromList = useCallback(
      (conversation: Conversation) => {
        setActiveConversation(conversation)
        pendingCallFromListRef.current = { conversationId: conversation.id, type: 'video' }
      },
      [setActiveConversation]
    )

    const handleMarkAsUnread = useCallback(() => {
      if (!activeConversationId || !markAsUnread) return
      setMarkedAsUnreadIds(prev => {
        const next = new Set(prev).add(activeConversationId)
        if (currentUser?.id) saveMarkedAsUnreadToStorage(currentUser.id, next)
        return next
      })
      markAsUnread(activeConversationId).catch(err => {
        console.error('[Chat] markAsUnread failed (backend may not have been updated):', err?.message ?? err)
      })
    }, [activeConversationId, markAsUnread, currentUser?.id])

    const handleMarkAsUnreadFromList = useCallback(
      (conversationId: string) => {
        setMarkedAsUnreadIds(prev => {
          const next = new Set(prev).add(conversationId)
          if (currentUser?.id) saveMarkedAsUnreadToStorage(currentUser.id, next)
          return next
        })
        markAsUnread?.(conversationId).catch(err => {
          console.error('[Chat] markAsUnread failed (backend may not have been updated):', err?.message ?? err)
        })
      },
      [markAsUnread, currentUser?.id]
    )

    const clearMarkedAsUnread = useCallback(
      (conversationId: string) => {
        setMarkedAsUnreadIds(prev => {
          const next = new Set(prev)
          next.delete(conversationId)
          if (currentUser?.id) saveMarkedAsUnreadToStorage(currentUser.id, next)
          return next
        })
      },
      [currentUser?.id]
    )

    // Keep ref in sync with activeConversationId for stable callbacks
    useEffect(() => {
      activeConversationIdRef.current = activeConversationId
    }, [activeConversationId])

    // Clear "marked as unread" dot when user opens that conversation (e.g. from URL or list)
    useEffect(() => {
      const conversationId = activeConversationId
      if (!conversationId || !currentUser?.id) return
      setMarkedAsUnreadIds(prev => {
        if (!prev.has(conversationId)) return prev
        const next = new Set(prev)
        next.delete(conversationId)
        saveMarkedAsUnreadToStorage(currentUser.id, next)
        return next
      })
    }, [activeConversationId, currentUser?.id])

    // Start call when active conversation was set from list context menu (audio/video)
    useEffect(() => {
      const pending = pendingCallFromListRef.current
      if (!pending || !activeConversationId || activeConversationId !== pending.conversationId) return
      pendingCallFromListRef.current = null
      if (pending.type === 'audio') {
        handleAudioCall()
      } else {
        handleVideoCall()
      }
    }, [activeConversationId, handleAudioCall, handleVideoCall])

    // Restore active conversation from URL parameter (for panel reopen persistence)
    useEffect(() => {
      // Only process once
      if (conversationIdFromUrlProcessed.current) {
        return
      }

      const urlParams = new URLSearchParams(window.location.search)
      const conversationIdParam = urlParams.get('conversationId')
      const messageIdParam = urlParams.get('messageId')

      if (!conversationIdParam) {
        return
      }

      // First, try to find the conversation in the loaded list
      const conversation = conversations.find(c => c.id === conversationIdParam)
      if (conversation) {
        conversationIdFromUrlProcessed.current = true
        setActiveConversation(conversation)
        setShowConversationList(false)
        if (messageIdParam) setPendingMessageId(messageIdParam)
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
              if (messageIdParam) setPendingMessageId(messageIdParam)
            }
          })
          .catch(() => {
            // Reset the flag so we can retry if conversations reload
            conversationIdFromUrlProcessed.current = false
          })
      }
    }, [conversations, setActiveConversation, activeConversationId, apiClient, conversationsLoading])

    // Handle in-app "open chat with conversation" (e.g. from calendar meeting "Open Chat" - same as dashboard)
    useEffect(() => {
      const handleOpenWithConversation = async (event: Event) => {
        const customEvent = event as CustomEvent<{ conversationId: string }>
        const conversationIdParam = customEvent.detail?.conversationId
        if (!conversationIdParam) return

        const conversation = conversations.find(c => c.id === conversationIdParam)
        if (conversation) {
          setActiveConversation(conversation)
          setShowConversationList(false)
          try {
            globalThis.dispatchEvent(new CustomEvent('chat:conversation-ready'))
            const g = globalThis as unknown as Window
            if (g.parent !== g) {
              g.parent.postMessage({ type: 'CHAT_CONVERSATION_READY' }, '*')
            }
          } catch {
            // ignore
          }
          return
        }

        if (apiClient) {
          try {
            const fetchedConversation = await apiClient.getConversationById(conversationIdParam)
            if (fetchedConversation) {
              setActiveConversation(fetchedConversation)
              setShowConversationList(false)
              try {
                globalThis.dispatchEvent(new CustomEvent('chat:conversation-ready'))
                const g = globalThis as unknown as Window
                if (g.parent !== g) {
                  g.parent.postMessage({ type: 'CHAT_CONVERSATION_READY' }, '*')
                }
              } catch {
                // ignore
              }
            }
          } catch {
            // ignore
          }
        }
      }

      globalThis.addEventListener('chat:open-with-conversation', handleOpenWithConversation)
      return () => {
        globalThis.removeEventListener('chat:open-with-conversation', handleOpenWithConversation)
      }
    }, [conversations, setActiveConversation, setShowConversationList, apiClient])

    // Notify calendar to refresh when a meeting is created (so other participants see it without reload)
    useEffect(() => {
      const socket = wsClient?.getSocket()
      if (!socket) return
      const onMeetingCreated = () => {
        globalThis.dispatchEvent(new CustomEvent('calendar:refresh'))
      }
      const onMeetingUpdated = () => {
        globalThis.dispatchEvent(new CustomEvent('calendar:refresh'))
      }
      const onMeetingDeleted = () => {
        globalThis.dispatchEvent(new CustomEvent('calendar:refresh'))
      }
      socket.on('meeting_created', onMeetingCreated)
      socket.on('meeting_updated', onMeetingUpdated)
      socket.on('meeting_deleted', onMeetingDeleted)
      return () => {
        socket.off('meeting_created', onMeetingCreated)
        socket.off('meeting_updated', onMeetingUpdated)
        socket.off('meeting_deleted', onMeetingDeleted)
      }
    }, [wsClient])

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

    const {
      rejoinModalState,
      activeCallInfo,
      otherUserPresence,
      handleJoinActiveCall,
      handleRejoinWithPreferences,
      handleRejoinCancel
    } = useChatRejoinCall({
      stableActiveConversation,
      activeConversationCalls,
      groupCallState,
      groupParticipants: groupParticipantsRaw,
      joinGroupCall: joinGroupCall as (roomId: string, callType: 'audio' | 'video', prefs?: unknown) => void,
      realtimeKitApiClient,
      calendarApiClient,
      getUserPresence,
      currentUserId: currentUser?.id ?? null
    })

    const connectionError = error
    const isLoading = !isConnected && conversationsLoading

    const getConnectionErrorLabel = (name: string): string => {
      if (name === 'chat.serviceUnavailable') return t('chat-serviceUnavailable')
      if (name === 'chat.serviceNotFound') return t('chat-serviceNotFound')
      if (name === 'chat.authenticationFailed') return t('chat-authenticationFailed')
      return t('chat-connectionError')
    }

    return (
      <div
        ref={containerRef}
        className="gba:h-full gba:flex gba:flex-col gba:bg-background gba:overflow-hidden"
        data-testid={`${prefixDataTestId}-container`}
      >
        {connectionError && (
          <div
            className="gba:h-full gba:flex gba:items-center gba:justify-center gba:p-4 gba:bg-background"
            data-testid={`${prefixDataTestId}-error`}
          >
            <Alert variant="destructive" className="gba:max-w-sm">
              <AlertDescription>{getConnectionErrorLabel(connectionError.name)}</AlertDescription>
            </Alert>
          </div>
        )}
        {!connectionError && isLoading && (
          <div
            className="gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:bg-background"
            data-testid={`${prefixDataTestId}-loading`}
          >
            <Spinner size="lg" />
            <span className="gba:text-sm gba:text-muted-foreground">{t('chat-connecting')}</span>
          </div>
        )}
        {!connectionError && !isLoading && (
          <>
            <ChatLayout
              prefixDataTestId={prefixDataTestId}
              errorMessage={errorMessage}
              onDismissError={() => setErrorMessage(null)}
              isOffline={isOffline}
              offlineLabel={t('chat-offline')}
              conversationId={activeConversationId}
              messageCount={messages.length}
              showListView={showListView}
              showChatView={showChatView}
              isSingleViewMode={isSingleViewMode}
              chatViewRef={chatViewRef}
              listSlot={
                <ConversationList
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onConversationSelect={conv => {
                    setShowCallHistory(false)
                    clearMarkedAsUnread(conv.id)
                    handleConversationSelect(conv)
                  }}
                  onRemoveConversation={async conversationId => {
                    try {
                      setErrorMessage(null)
                      await closeConversation(conversationId)
                    } catch (error: any) {
                      const errorMsg = error?.response?.data?.message || error?.message || ''
                      if (errorMsg.toLowerCase().includes('last owner')) {
                        setErrorMessage(t('chat-cannotLeaveAsLastOwner'))
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
                  onPinChange={handlePinChangeFromList}
                  onMuteChange={handleMuteChangeFromList}
                  onNudge={handleNudgeFromList}
                  onStartAudioCall={handleStartAudioCallFromList}
                  onStartVideoCall={handleStartVideoCallFromList}
                  isCallEnabled={isConnected}
                  onMarkAsUnread={handleMarkAsUnreadFromList}
                  markedAsUnreadConversationIds={markedAsUnreadIds}
                  onCreateConversation={handleCreateConversation}
                  onCreateGroup={handleCreateGroup}
                  isLoading={conversationsLoading}
                  isLoadingMore={conversationsLoadingMore}
                  hasMore={conversationsHasMore}
                  onLoadMore={loadMoreConversations}
                  currentUserId={currentUser?.id || null}
                  accessToken={accessToken}
                  compact={viewMode !== 'full'}
                  presenceMap={presenceMap}
                  presenceVersion={presenceVersion}
                  conversationExpertCounts={conversationExpertCounts}
                  wsClient={wsClient}
                  isConnected={isConnected}
                  search={conversationSearch}
                  filterKind={conversationFilterKind}
                  unreadOnly={conversationUnreadOnly}
                  onSearchChange={setConversationSearch}
                  onFilterKindChange={setConversationFilterKind}
                  onUnreadOnlyChange={setConversationUnreadOnly}
                  missedCallsCount={missedCallsCount}
                  onOpenCallHistory={() => {
                    setShowCallHistory(true)
                    setShowConversationList(false)
                    updateCallHistoryUrl(true, true)
                    if (apiClient) {
                      apiClient.markCallHistorySeen().catch(() => {})
                      setMissedCallsCount(0)
                    }
                  }}
                />
              }
              chatViewSlot={
                showCallHistory && apiClient && currentUser ? (
                  <CallHistory
                    apiClient={apiClient}
                    accessToken={accessToken}
                    currentUserId={currentUser.id}
                    showBackButton={isSingleViewMode}
                    iconOnlyFilters={isSingleViewMode}
                    refreshTrigger={callHistoryRefreshTrigger}
                    presenceMap={presenceMap}
                    onBack={() => {
                      setShowCallHistory(false)
                      setShowConversationList(true)
                      updateCallHistoryUrl(false)
                      if (apiClient) {
                        apiClient
                          .getMissedCallsCount()
                          .then(setMissedCallsCount)
                          .catch(() => {})
                      }
                    }}
                    onOpenConversation={conversationId => {
                      const conv = conversations.find(c => c.id === conversationId)
                      if (conv) {
                        setActiveConversation(conv)
                        setShowConversationList(false)
                      } else {
                        apiClient
                          .getConversationById(conversationId)
                          .then((c: any) => {
                            setActiveConversation(c)
                            setShowConversationList(false)
                          })
                          .catch(() => {})
                      }
                      setShowCallHistory(false)
                      updateCallHistoryUrl(false)
                    }}
                  />
                ) : (
                  <ChatConversationView
                    prefixDataTestId={prefixDataTestId}
                    stableActiveConversation={stableActiveConversation}
                    isPinned={stableActiveConversation?.isPinned}
                    isMuted={stableActiveConversation?.isMuted}
                    onPin={handlePinConversation}
                    onMute={handleMuteConversation}
                    onMarkAsUnread={handleMarkAsUnread}
                    isSingleViewMode={isSingleViewMode}
                    viewMode={viewMode}
                    initialMessageId={pendingMessageId}
                    onBack={handleBack}
                    onCloseConversation={handleCloseConversation}
                    onRemoveConversation={handleRemoveConversation}
                    onShowGroupSettings={handleShowGroupSettings}
                    onShowExpertSelector={() => setShowExpertSelector(true)}
                    onNudge={handleNudge}
                    onAudioCall={handleAudioCall}
                    onVideoCall={handleVideoCall}
                    onJoinCall={handleJoinActiveCall}
                    currentUserId={currentUser?.id || null}
                    otherUserPresence={otherUserPresence as UserPresence | undefined}
                    isCallEnabled={isConnected}
                    isInCall={isInAnyCall}
                    isStartingCall={isStartingCall}
                    activeCall={activeCallInfo}
                    t={t}
                    activeExperts={activeExperts}
                    onRemoveExpert={expertId => removeExpert(expertId, sendMessageVoid)}
                    messages={messages}
                    messagesLoading={messagesLoading}
                    hasMoreMessages={hasMoreMessages}
                    onLoadMoreMessages={loadMoreMessages}
                    activeConversationId={activeConversationId}
                    typingUsers={Object.values(typingUsers || {}).flat()}
                    onReplyToAI={handleReplyToAI}
                    accessToken={accessToken}
                    onSendMessage={handleAISendMessage}
                    apiClient={apiClient}
                    onUpdateMessage={updateMessage}
                    ensureMessageInList={ensureMessageInList}
                    isAIProcessing={isAIProcessing}
                    aiStreamingText={aiStreamingText}
                    isExpertProcessing={isExpertProcessing}
                    processingExpert={processingExpert}
                    onSendMessageInput={handleSendMessage as (content: string, ...args: unknown[]) => Promise<void>}
                    onTypingStart={handleTypingStart}
                    onTypingStop={handleTypingStop}
                    draftMessage={draftMessage}
                    onDraftChange={setDraftMessage}
                    onRegisterMentionReady={fn => {
                      registerMentionEntityRef.current = fn
                    }}
                    onFocusReady={fn => {
                      focusInputRef.current = fn
                    }}
                  />
                )
              }
            />
            <ChatModals
              prefixDataTestId={prefixDataTestId}
              accessToken={accessToken}
              apiClient={apiClient}
              currentUserId={currentUser?.id || null}
              currentUser={currentUser}
              activeConversation={activeConversation}
              showCreateGroupModal={showCreateGroupModal}
              onCloseCreateGroupModal={() => setShowCreateGroupModal(false)}
              onCreateGroup={
                handleCreateGroupSubmit as (
                  name: string,
                  participantIds: string[],
                  description?: string,
                  dimensionContext?: unknown
                ) => Promise<void>
              }
              showGroupSettingsModal={showGroupSettingsModal}
              onCloseGroupSettingsModal={handleCloseGroupSettings}
              onRefreshConversations={refreshConversations}
              showExpertSelector={showExpertSelector}
              onCloseExpertSelector={() => setShowExpertSelector(false)}
              availableExperts={availableExperts}
              expertsLoading={expertsLoading}
              activeExperts={activeExperts}
              onAddExpert={(expert, sendMessageVoid) =>
                addExpert(
                  expert as never,
                  sendMessageVoid as (
                    conversationId: string,
                    content: string,
                    metadata?: Record<string, unknown>
                  ) => Promise<void>
                )
              }
              sendMessageVoid={
                sendMessageVoid as (
                  conversationId: string,
                  content: string,
                  metadata?: Record<string, unknown>
                ) => void | Promise<void>
              }
              incomingGroupCallInvite={incomingGroupCallInvite}
              currentUserAsParticipant={currentUserAsParticipant}
              onAcceptGroupInvite={acceptGroupInvite}
              onDeclineGroupInvite={declineGroupInvite}
              rejoinModalState={rejoinModalState}
              onRejoinWithPreferences={handleRejoinWithPreferences}
              onRejoinCancel={handleRejoinCancel}
              groupCallState={groupCallState}
              realtimeKitGroupCall={realtimeKitGroupCall}
              groupParticipants={groupParticipants}
            />
          </>
        )}
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
