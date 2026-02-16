/**
 * useRealtimeKitGroupCall Hook - Refactored Composition Version
 *
 * This hook provides the same interface as the original but composes
 * all functionality from extracted, reusable hooks.
 *
 * Manages group calls using Cloudflare Realtime Kit with SFU infrastructure.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react'
import { toast } from '@newwork/nw-design-system'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { RealtimeKitApiClient } from '../services/realtimeKitApiClient'
import type { CallParticipant, CallType } from '../services/webrtcClient'
import type { GroupCallUIState, GroupCallInvite, UseGroupCallReturn } from '../services/callTypes'
import { useCallPreferences } from './useCallPreferences'
import { useRealtimeKitDiagnostics } from './useRealtimeKitDiagnostics'
import { useRealtimeKitWebSocket } from './useRealtimeKitWebSocket'
import { useRealtimeKitParticipants } from './useRealtimeKitParticipants'
import { useRealtimeKitScreenShare } from './useRealtimeKitScreenShare'
import { useRealtimeKitMedia } from './useRealtimeKitMedia'
import { useRealtimeKitActiveSpeaker } from './useRealtimeKitActiveSpeaker'
import { rtkDebug } from '../utils/rtkDebug'
import { globalCallManager } from '../services/globalCallManager'
import { ACTIVE_CALL_KEY, setActiveCallInStorage, clearActiveCallFromStorage } from '../utils/activeCallStorage'
import { useRealtimeKitCallState } from './useRealtimeKitGroupCall/useRealtimeKitCallState'
import { runLeaveCall } from './useRealtimeKitGroupCall/runLeaveCall'
import { runJoinCall } from './useRealtimeKitGroupCall/runJoinCall'
import { runConfirmStartCall } from './useRealtimeKitGroupCall/runConfirmStartCall'
import { useRealtimeKitInviteListeners } from './useRealtimeKitGroupCall/useRealtimeKitInviteListeners'
import { buildJoinCallWrapper } from './useRealtimeKitGroupCall/buildJoinCallWrapper'

export interface UseRealtimeKitGroupCallOptions {
  wsClient: ChatWebSocketClient | null
  apiClient?: RealtimeKitApiClient | null
  chatApiClient?: any // ChatApiClient type for in-call chat
  calendarApiClient?: any // CalendarApiClient type
  currentUser: CallParticipant | null
  callConversation?: any | null // Conversation where call was initiated (for participant avatars)
  activeConversation?: any | null // Currently active conversation (for in-call chat)
  conversations?: any[] | null // All conversations (for looking up call conversation by roomId)
  onCallStarted?: (roomId: string, participants: CallParticipant[]) => void
  onCallEnded?: (roomId: string, duration: number) => void
  onParticipantJoined?: (participant: CallParticipant) => void
  onParticipantLeft?: (participantId: string) => void
  accessToken?: string | null
  translate?: (key: string, params?: Record<string, any>) => string
}

export const useRealtimeKitGroupCall = (options: UseRealtimeKitGroupCallOptions): UseGroupCallReturn => {
  const {
    wsClient,
    apiClient,
    chatApiClient,
    callConversation,
    activeConversation,
    currentUser,
    onCallStarted,
    onCallEnded,
    translate
  } = options

  const {
    callState,
    setCallState,
    incomingInvite,
    setIncomingInvite,
    activeConversationCalls,
    setActiveConversationCalls,
    refs,
    restoredStateRef,
    clearInviteDedupeFor
  } = useRealtimeKitCallState()

  const joinMeetingWithTimeout = async (initializedMeeting: any, timeoutMs: number, context?: any) => {
    return await new Promise<void>((resolve, reject) => {
      let finished = false
      const timeoutId = setTimeout(() => {
        if (finished) return
        finished = true
        reject(new Error(`Failed to join meeting: join() timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      Promise.resolve()
        .then(() => initializedMeeting.join())
        .then(() => {
          if (finished) return
          finished = true
          clearTimeout(timeoutId)
          resolve()
        })
        .catch(err => {
          if (finished) return
          finished = true
          clearTimeout(timeoutId)
          reject(err)
        })
        .catch(err => {
          // This should never happen, but keep it safe
          rtkDebug.error('[RTK] Unexpected error in joinMeetingWithTimeout:', err, context)
        })
    })
  }

  const handleRnnoiseStateChange = useCallback((enabled: boolean) => {
    globalCallManager.updateCallState({ rnnoiseEnabled: enabled })
    globalCallManager.setCall({ rnnoiseEnabled: enabled })
  }, [])

  const participantsHookRef = useRef<any>(null)
  const toggleMinimizeRef = useRef<(() => void) | null>(null)
  const leaveCallRef = useRef<(() => Promise<void>) | null>(null)
  const websocketRef = useRef<any>(null)

  // Initialize RealtimeKit SDK - returns tuple [meeting, initMeeting]
  const [meeting, initMeeting] = useRealtimeKitClient()

  // CRITICAL: Stabilize meeting reference for RealtimeKitProvider to prevent constant re-renders
  // The SDK's useRealtimeKitClient returns a new object reference on every internal update,
  // but we need a stable reference for the Provider to avoid unmounting/remounting all children.
  // We memoize based on the connection state - only change when actually joining/leaving
  const stableMeeting = useMemo(() => {
    // Return the meeting object, but only update the memo when the connection state actually changes
    return meeting
  }, [
    // Only recreate when fundamental properties change, not on every SDK update
    meeting?.self?.roomState,
    meeting?.self?.roomJoined,
    callState.status // Also depend on our call status to sync with connection state
  ])

  // Preferences management (localStorage)
  const callPreferences = useCallPreferences()

  const getResolvedNoiseSuppressionEnabled = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem('chat_call_noise_suppression_enabled')
      return saved === null ? true : saved === 'true'
    } catch {
      return true
    }
  }, [])

  const getResolvedAutoGainControlEnabled = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem('chat_call_auto_gain_control_enabled')
      return saved === null ? false : saved === 'true'
    } catch {
      return false
    }
  }, [])

  // CRITICAL: Stable callbacks for child hooks to prevent their useCallbacks from recreating
  const handleScreenShareStateChange = useCallback((isSharing: boolean) => {
    rtkDebug.log('[RTK] Screen share state changed:', isSharing)
  }, [])

  const handleReactionReceived = useCallback((reaction: any) => {
    rtkDebug.log('[RTK] Reaction received:', reaction)
    // Could emit to UI layer if needed
  }, [])

  // Media management (audio, video, quality, background)
  // CRITICAL: Pass stableMeeting to prevent child hooks from recreating callbacks every render
  // CRITICAL: Pass restored state from globalCallManager to prevent reset after minimize/maximize
  const media = useRealtimeKitMedia({
    meeting: stableMeeting,
    callType: callState.callType,
    initialVideoQuality: callPreferences.videoQuality,
    initialBackgroundEnabled: callPreferences.backgroundEnabled,
    initialNoiseSuppressionEnabled: getResolvedNoiseSuppressionEnabled(),
    initialAutoGainControlEnabled: getResolvedAutoGainControlEnabled(),
    initialRnnoiseEnabled: restoredStateRef.current?.rnnoiseEnabled,
    onRnnoiseStateChange: handleRnnoiseStateChange,
    callStatus: callState.status,
    initialIsMuted: restoredStateRef.current?.isMuted,
    initialIsVideoEnabled: restoredStateRef.current?.isVideoEnabled
  })

  // Screen share management
  // CRITICAL: Pass stableMeeting and stable callback
  const screenShare = useRealtimeKitScreenShare({
    meeting: stableMeeting,
    onScreenShareStateChange: handleScreenShareStateChange
  })

  // WebSocket coordination (raise hand, reactions)
  // CRITICAL: Pass stableMeeting and stable callback
  // CRITICAL: Pass restored state from globalCallManager to prevent reset after minimize/maximize
  const websocket = useRealtimeKitWebSocket({
    wsClient,
    roomId: callState.roomId,
    meetingId: callState.meetingId,
    currentUser,
    meeting: stableMeeting, // Pass stable meeting reference
    onReactionReceived: handleReactionReceived,
    translate,
    initialHandRaised: restoredStateRef.current?.handRaised,
    initialRemoteHandsRaised: restoredStateRef.current?.remoteHandsRaised,
    initialHandRaisedOrder: restoredStateRef.current?.handRaisedOrder
  })

  // Participant management
  // CRITICAL: Pass stableMeeting to prevent callbacks from recreating every render
  const participantsHook = useRealtimeKitParticipants({
    meeting: stableMeeting,
    wsClient,
    roomId: callState.roomId,
    meetingId: callState.meetingId, // Pass actual meeting ID for invites
    callType: callState.callType,
    currentUser,
    localStream: media.localStream,
    callStatus: callState.status,
    emitSocketEvent: websocket.emitSocketEvent,
    cleanupParticipantHandState: websocket.cleanupParticipantHandState,
    calendarMeetingId: callState.calendarMeetingId
  })

  // Diagnostics and monitoring
  // CRITICAL: Pass stableMeeting to prevent callbacks from recreating every render
  const diagnostics = useRealtimeKitDiagnostics({
    meeting: stableMeeting,
    participants: participantsHook.participants,
    isInCall: callState.status === 'connected',
    callStatus: callState.status
  })

  // Active speaker tracking
  // CRITICAL: Pass stableMeeting to prevent unnecessary re-calculations
  const activeSpeaker = useRealtimeKitActiveSpeaker({
    meeting: stableMeeting
  })

  // Derived state
  const isInCall = callState.status !== 'idle' && callState.status !== 'ended'
  const isHost = !!callState.hostId && callState.hostId === currentUser?.id

  refs.mediaRef.current = media
  refs.screenShareRef.current = screenShare
  refs.isScreenSharingRef.current = screenShare.isScreenSharing
  refs.wsClientRef.current = wsClient
  refs.currentUserRef.current = currentUser
  refs.onCallEndedRef.current = onCallEnded
  participantsHookRef.current = participantsHook
  websocketRef.current = websocket

  // Combined call state for compatibility
  const combinedCallState: GroupCallUIState = useMemo(() => {
    const state = {
      roomId: callState.roomId,
      callType: callState.callType,
      status: callState.status,
      isMinimized: callState.isMinimized,
      hasBeenMinimized: callState.hasBeenMinimized,
      isMuted: media.isMuted,
      isVideoEnabled: media.isVideoEnabled,
      isScreenSharing: screenShare.isScreenSharing,
      videoQuality: media.videoQuality,
      backgroundEnabled: media.backgroundEnabled,
      rnnoiseEnabled: media.rnnoiseEnabled,
      handRaised: websocket.handRaised,
      remoteHandsRaised: websocket.remoteHandsRaised || {},
      handRaisedOrder: websocket.handRaisedOrder || {},
      participants: participantsHook.participants,
      hostId: callState.hostId,
      startTime: callState.callStartTime,
      duration: callState.duration,
      callImplementation: 'realtime-kit' as const
    }

    return state
  }, [
    callState.roomId,
    callState.callType,
    callState.status,
    callState.isMinimized,
    callState.hostId,
    callState.callStartTime,
    // CRITICAL: callState.duration REMOVED - it updates every second and would cause
    // combinedCallState to be recreated every second, triggering re-renders
    media.isMuted,
    media.isVideoEnabled,
    screenShare.isScreenSharing,
    media.videoQuality,
    media.backgroundEnabled,
    media.rnnoiseEnabled,
    websocket.handRaised,
    websocket.remoteHandsRaised,
    websocket.handRaisedOrder,
    participantsHook.participants
  ])

  /**
   * Start the duration timer - updates every second
   */
  const startDurationTimer = useCallback(() => {
    if (refs.durationTimerRef.current) {
      clearInterval(refs.durationTimerRef.current)
    }

    refs.durationTimerRef.current = setInterval(() => {
      if (!refs.startTimeRef.current) return

      const now = Date.now()
      const elapsed = Math.floor((now - refs.startTimeRef.current) / 1000)

      setCallState(prev => ({
        ...prev,
        duration: elapsed,
        callStartTime: refs.startTimeRef.current,
        startTime: refs.startTimeRef.current
      }))
    }, 1000)
  }, [])

  /**
   * Stop the duration timer
   */
  const stopDurationTimer = useCallback(() => {
    if (refs.durationTimerRef.current) {
      clearInterval(refs.durationTimerRef.current)
      refs.durationTimerRef.current = null
    }
  }, [])

  /**
   * Initiate call - Shows pre-call setup dialog
   */
  const initiateCall = useCallback(
    (
      conversationId: string,
      callType: CallType,
      participants: CallParticipant[],
      conversationName?: string,
      calendarMeetingId?: string | null,
      conversationType?: 'direct' | 'group' | 'meeting'
    ) => {
      if (!currentUser || !apiClient) {
        return
      }

      // CRITICAL: Reset cancellation flag for new call attempt
      refs.isCancelledRef.current = false

      // Show setup dialog
      setCallState(prev => ({
        ...prev,
        status: 'setup' as const,
        roomId: conversationId,
        callType,
        conversationName,
        conversationType, // Store conversation type in state
        hostId: currentUser.id // Initiator becomes host for this call attempt
      }))

      // Store participants and calendar meeting ID for when user confirms
      refs.callStateRoomIdRef.current = conversationId
      refs.conversationIdRef.current = conversationId
      refs.calendarMeetingIdRef.current = calendarMeetingId || null
      refs.pendingCallParticipantsRef.current = participants
    },
    [currentUser, apiClient]
  )

  const confirmStartCall = useCallback(
    async (preferences: {
      micEnabled: boolean
      cameraEnabled: boolean
      backgroundEnabled: boolean
      audioInputDeviceId?: string | null
      videoInputDeviceId?: string | null
    }) => {
      await runConfirmStartCall(
        {
          refs,
          options,
          apiClient: apiClient!,
          initMeeting,
          callPreferences,
          getResolvedNoiseSuppressionEnabled,
          getResolvedAutoGainControlEnabled,
          media,
          participantsHook,
          wsClient,
          onCallStarted,
          startDurationTimer,
          setCallState,
          joinMeetingWithTimeout,
          rtkDebug,
          currentUser: currentUser!
        },
        preferences
      )
    },
    [
      currentUser,
      apiClient,
      initMeeting,
      callPreferences,
      getResolvedNoiseSuppressionEnabled,
      getResolvedAutoGainControlEnabled,
      participantsHook,
      onCallStarted,
      startDurationTimer,
      wsClient,
      refs,
      setCallState,
      joinMeetingWithTimeout,
      media,
      options
    ]
  )

  /**
   * Legacy startCall - directly starts call without setup dialog
   * @deprecated Use initiateCall + confirmStartCall for better UX
   */
  const startCall = useCallback(
    async (
      conversationId: string,
      callType: CallType,
      participants: CallParticipant[],
      conversationName?: string,
      calendarMeetingId?: string | null
    ) => {
      // For backward compatibility, directly start with default preferences
      initiateCall(conversationId, callType, participants, conversationName, calendarMeetingId)

      // Immediately confirm with default preferences
      await confirmStartCall({
        micEnabled: true,
        cameraEnabled: callType === 'video',
        backgroundEnabled: true
      })
    },
    [initiateCall, confirmStartCall]
  )

  const internalJoinCall = useCallback(
    async (
      roomId: string,
      callType: CallType,
      meetingId?: string,
      conversationName?: string,
      initialPreferences?: {
        micEnabled: boolean
        cameraEnabled: boolean
        backgroundEnabled?: boolean
        audioInputDeviceId?: string | null
        videoInputDeviceId?: string | null
      },
      conversationType?: 'direct' | 'group' | 'meeting'
    ) => {
      await runJoinCall(
        {
          refs,
          options,
          apiClient: apiClient!,
          initMeeting,
          callPreferences,
          media,
          wsClient,
          startDurationTimer,
          setCallState,
          setActiveConversationCalls,
          getActiveConversationCalls: () => activeConversationCalls,
          currentUser: currentUser!,
          joinMeetingWithTimeout,
          setActiveCallInStorage,
          rtkDebug
        },
        {
          roomId,
          callType,
          meetingId,
          conversationName,
          initialPreferences,
          conversationType
        }
      )
    },
    [
      currentUser,
      apiClient,
      initMeeting,
      callPreferences,
      wsClient,
      startDurationTimer,
      refs,
      setCallState,
      setActiveConversationCalls,
      activeConversationCalls,
      joinMeetingWithTimeout,
      media,
      options
    ]
  )

  const joinCall = useMemo(
    () =>
      buildJoinCallWrapper({
        internalJoinCall,
        getActiveConversationCalls: () => activeConversationCalls,
        getConversations: () => options.conversations,
        rtkDebug
      }),
    [internalJoinCall, activeConversationCalls, options.conversations, rtkDebug]
  )

  /**
   * Accept incoming invite
   */
  const acceptInvite = useCallback(
    async (initialPreferences?: { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled: boolean }) => {
      // CRITICAL: Read LATEST state using functional update, not closure value!
      // The closure may have stale state if invites arrived while React was batching
      let latestInvite: GroupCallInvite | null = null
      setIncomingInvite(prev => {
        latestInvite = prev
        return prev // Don't modify, just read
      })

      if (!latestInvite) return

      // Create a const reference for TypeScript type narrowing
      // Explicit type assertion needed because TS control flow analysis doesn't work across callback boundaries
      const invite: GroupCallInvite = latestInvite

      rtkDebug.log('[RTK] 🎯 Reading LATEST incomingInvite state:', {
        hasLatestInvite: !!invite,
        latestInviteObject: invite
      })

      rtkDebug.log('[RTK] Accepting invite with preferences:', {
        conversationId: invite.conversationId,
        meetingId: invite.roomId,
        callType: invite.callType,
        conversationName: invite.conversationName,
        from: invite.from.odName,
        preferences: initialPreferences
      })

      // Note: calendarMeetingId is not available from invites since backend doesn't send it
      // It's only available when starting a call from calendar
      refs.calendarMeetingIdRef.current = null

      rtkDebug.log('[RTK] 🔗 Cleared calendarMeetingId ref for invite (not available in invites)')

      // Also update activeConversationCalls
      setActiveConversationCalls(prev => {
        const newMap = new Map(prev)
        const key = invite.conversationId || invite.roomId
        newMap.set(key, {
          roomId: invite.roomId,
          callType: invite.callType,
          participantIds: [],
          startedBy: invite.from.id,
          conversationName: invite.conversationName
        })
        rtkDebug.log('[RTK] 🗺️ Updated activeConversationCalls:', {
          key,
          hasEntry: newMap.has(key)
        })
        return newMap
      })

      // CRITICAL: Call internal joinCall directly with proper IDs from invite
      // - conversationId from invite.conversationId
      // - meetingId from invite.roomId (backend meeting ID)
      // - conversationName from invite.conversationName
      // - initial preferences from pre-call dialog (mic/camera/background)
      // - conversationType from invite for proper header display
      // Don't use the wrapper because invite has all the info we need!
      await internalJoinCall(
        invite.conversationId || invite.roomId, // conversationId
        invite.callType,
        invite.roomId, // meetingId (stored in roomId field of invite)
        invite.conversationName, // conversationName
        initialPreferences, // initial mic/camera/background settings
        invite.conversationType // conversation type for proper header display
      )
      setIncomingInvite(null)
    },
    [internalJoinCall]
  )

  /**
   * Cancel pre-call setup
   */
  const cancelSetup = useCallback(() => {
    rtkDebug.log('[RTK] 🚫 Canceling call setup')

    // CRITICAL: Mark as cancelled BEFORE resetting state
    // This prevents race conditions with confirmStartCall
    refs.isCancelledRef.current = true

    // Reset state to idle
    setCallState(prev => ({
      ...prev,
      status: 'idle',
      roomId: null,
      callType: 'audio',
      conversationName: undefined
    }))

    // Clear refs
    refs.callStateRoomIdRef.current = null
    refs.conversationIdRef.current = null
    refs.calendarMeetingIdRef.current = null
    refs.pendingCallParticipantsRef.current = [] // Clear pending participants

    // CRITICAL: Reset cancellation flag after a short delay
    // This allows the current call attempt to be properly cancelled
    // but ensures the next call attempt starts fresh
    setTimeout(() => {
      refs.isCancelledRef.current = false
      rtkDebug.log('[RTK] ✅ Reset cancellation flag - ready for new call')
    }, 100)
  }, [])

  /**
   * Decline incoming invite
   */
  const declineInvite = useCallback(() => {
    if (!incomingInvite) return

    rtkDebug.log('[RTK] 🚫 Declining invite:', {
      meetingId: incomingInvite.roomId,
      conversationId: incomingInvite.conversationId
    })

    // CRITICAL: Stop all media tracks before declining
    // User might have opened pre-call dialog which requested camera/mic permissions
    try {
      media.stopAllTracks()
      rtkDebug.log('[RTK] ✅ Media tracks stopped when declining invite')
    } catch (err) {
      rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks when declining:', err)
    }

    // CRITICAL: Clear start time so we can sync to fresh time on next invite
    // Without this, if user declines and gets re-invited, they'll keep the old start time
    refs.startTimeRef.current = null
    rtkDebug.log('[RTK] ⏱️ Cleared start time when declining invite')

    // Notify backend that invite was declined
    if (currentUser && wsClient?.getSocket()) {
      wsClient.getSocket()?.emit('rtk-group-call:declined', {
        conversationId: incomingInvite.conversationId || incomingInvite.roomId,
        meetingId: incomingInvite.roomId,
        participantId: currentUser.id
      })
      rtkDebug.log('[RTK] 📤 Emitted rtk-group-call:declined event')
    }

    setIncomingInvite(null)
  }, [incomingInvite, currentUser, wsClient, media])

  const leaveCall = useCallback(async () => {
    await runLeaveCall({
      refs,
      stableMeeting,
      globalCallManager,
      stopDurationTimer,
      setCallState,
      setIncomingInvite,
      setActiveConversationCalls,
      clearActiveCallFromStorage,
      callPreferences,
      clearInviteDedupeFor,
      media,
      rtkDebug,
      accessToken: options.accessToken ?? undefined
    })
  }, [
    stableMeeting,
    stopDurationTimer,
    refs,
    setCallState,
    setIncomingInvite,
    setActiveConversationCalls,
    callPreferences,
    clearInviteDedupeFor,
    media,
    options.accessToken
  ])

  // Store leaveCall in ref for WebSocket effect
  leaveCallRef.current = leaveCall

  // Used to pass the next minimized value from the state updater to the deferred global update
  const nextMinimizedForGlobalRef = useRef<boolean | null>(null)

  /**
   * Toggle minimized state
   */
  const toggleMinimize = useCallback(() => {
    // IMPORTANT: Do not call globalCallManager.updateCallState inside the setState updater.
    // React may execute the updater during render in concurrent/StrictMode, which would
    // trigger cross-component updates and cause the "Cannot update a component while
    // rendering a different component" warning.
    setCallState(prev => {
      const nextIsMinimized = !prev.isMinimized
      // Store computed value for the deferred global update
      nextMinimizedForGlobalRef.current = nextIsMinimized

      return {
        ...prev,
        isMinimized: nextIsMinimized,
        hasBeenMinimized: true // Set flag when minimizing
      }
    })

    // Persist minimize state to the global source-of-truth after state update scheduling.
    // Use a macrotask to ensure we're out of React's render phase.
    setTimeout(() => {
      const next = nextMinimizedForGlobalRef.current
      if (typeof next === 'boolean') {
        globalCallManager.updateCallState({ isMinimized: next, hasBeenMinimized: true })
      }
    }, 0)
  }, [])

  // CRITICAL: Update ref so globalCallManager callbacks always have latest version
  toggleMinimizeRef.current = toggleMinimize

  /**
   * Ensure callbacks in globalCallManager are always fresh after component remounts
   * This fixes the stale closure issue when navigating away and back
   */
  useEffect(() => {
    // Only update callbacks if there's an active call (not idle)
    const currentCallData = globalCallManager.getCallData()
    if (currentCallData.callState.status === 'idle') {
      return
    }

    // Update only the callbacks without touching the rest of the state
    globalCallManager.updateCallbacks({
      leaveCall: async () => {
        if (leaveCallRef.current) {
          await leaveCallRef.current()
        }
      },
      toggleMute: () => {
        refs.mediaRef.current?.toggleMute()
      },
      toggleVideo: () => {
        refs.mediaRef.current?.toggleVideo()
      },
      toggleScreenShare: () => {
        refs.screenShareRef.current?.toggleScreenShare()
      },
      toggleMinimize: () => {
        if (toggleMinimizeRef.current) {
          toggleMinimizeRef.current()
        }
      },
      toggleBackground: () => {
        refs.mediaRef.current?.toggleBackground()
      },
      toggleRnnoise: async () => {
        await refs.mediaRef.current?.toggleRnnoise()
      },
      setRnnoiseMode: (mode: 'gentle' | 'moderate' | 'aggressive') => {
        refs.mediaRef.current?.setRnnoiseMode(mode)
      },
      setNoiseSuppressionEnabled: async (enabled: boolean) => {
        callPreferences.setNoiseSuppressionEnabled(enabled)
        await refs.mediaRef.current?.setNoiseSuppressionEnabled(enabled)
      },
      setAutoGainControlEnabled: async (enabled: boolean) => {
        callPreferences.setAutoGainControlEnabled(enabled)
        await refs.mediaRef.current?.setAutoGainControlEnabled(enabled)
      }
    })

    rtkDebug.log('[RTK] ✅ Updated callbacks in globalCallManager after remount')
  }, [callState.status, toggleMinimize]) // Include toggleMinimize to ensure callback is updated after it's created

  /**
   * Toggle transcription enabled/disabled
   */
  const toggleTranscription = useCallback(() => {
    setCallState(prev => ({ ...prev, transcriptionEnabled: !prev.transcriptionEnabled }))
  }, [])

  /**
   * Sync media states (from useRealtimeKitMedia) to callState
   * This ensures UI reflects the actual media device states
   */
  useEffect(() => {
    setCallState(prev => {
      // Only update if values actually changed to prevent unnecessary re-renders
      if (
        prev.isMuted !== media.isMuted ||
        prev.isVideoEnabled !== media.isVideoEnabled ||
        prev.backgroundEnabled !== media.backgroundEnabled ||
        prev.videoQuality !== media.videoQuality
      ) {
        return {
          ...prev,
          isMuted: media.isMuted,
          isVideoEnabled: media.isVideoEnabled,
          backgroundEnabled: media.backgroundEnabled,
          videoQuality: media.videoQuality
        }
      }
      return prev
    })
  }, [media.isMuted, media.isVideoEnabled, media.backgroundEnabled, media.videoQuality])

  /**
   * Listen to SDK meeting join completion
   */
  useEffect(() => {
    if (!meeting || callState.status !== 'joining') return

    // Meeting joined successfully
    if (meeting.self?.id) {
      rtkDebug.log('[RTK] Meeting joined successfully')
      setCallState(prev => ({ ...prev, status: 'connected' }))
    }
  }, [meeting, callState.status])

  // REMOVED: The useEffect that updated callbacks was causing infinite re-renders
  // The callbacks are now created using useCallback and stored in globalCallManager
  // when the call first connects (in the useEffect below that monitors callState.status)

  /**
   * Log call session start when connected
   */
  useEffect(() => {
    if (callState.status !== 'connected') {
      return
    }
  }, [
    callState.status,
    callState.sessionId,
    callState.meetingId,
    callState.roomId,
    callState.callType,
    media,
    participantsHook.participants
  ])

  /**
   * Log periodic call quality metrics
   */
  useEffect(() => {
    if (callState.status !== 'connected') {
      return
    }

    const logInterval = setInterval(() => {
      const stats = media.rnnoiseStats
      const callDuration = Date.now() - (callState.callStartTime ?? Date.now())

      console.log('[RTK Session] Call quality metrics', {
        duration: (callDuration / 1000).toFixed(0) + 's',
        rnnoiseEnabled: media.rnnoiseEnabled,
        rnnoiseStats: stats
          ? {
              framesProcessed: stats.framesProcessed,
              averageLatency: stats.averageLatency.toFixed(2) + 'ms',
              isActive: stats.isActive
            }
          : null,
        participants: participantsHook.participants.length
      })
    }, 30000) // Every 30 seconds

    return () => clearInterval(logInterval)
  }, [callState.status, callState.callStartTime, media, participantsHook.participants])

  /**
   * Store call data in globalCallManager when connected (for persistent UI)
   */
  useEffect(() => {
    if (callState.status !== 'connected' || !meeting || meeting.self?.roomState !== 'joined') {
      return
    }

    rtkDebug.log('[RTK] Storing call data in globalCallManager for persistent UI')

    // Build remoteStreams map from participants
    const remoteStreamsMap = new Map<string, MediaStream>()
    participantsHook.remoteStreams.forEach((stream, peerId) => {
      remoteStreamsMap.set(peerId, stream)
    })

    globalCallManager.setCall({
      realtimeKitMeeting: meeting,
      callState: {
        // IMPORTANT: preserve global minimized state as the source of truth
        // (otherwise this effect can overwrite minimize/maximize coming from GlobalCallContainer)
        ...(() => {
          const globalState = globalCallManager.getCallData().callState
          const isSameCall =
            globalState.callImplementation === 'realtime-kit' &&
            globalState.status !== 'idle' &&
            globalState.roomId === callState.roomId

          return {
            isMinimized: isSameCall ? globalState.isMinimized : callState.isMinimized,
            hasBeenMinimized: isSameCall ? globalState.hasBeenMinimized : callState.hasBeenMinimized
          }
        })(),
        status: 'connected',
        roomId: callState.roomId,
        meetingId: callState.meetingId ?? null,
        sessionId: callState.sessionId ?? null,
        callType: callState.callType,
        conversationType: callState.conversationType,
        callImplementation: 'realtime-kit',
        hostId: callState.hostId,
        // CRITICAL: Use media hook state (SDK-derived) as source of truth.
        // callState can be stale after navigation if globalCallManager state was restored incorrectly.
        isMuted: media.isMuted,
        isVideoEnabled: media.isVideoEnabled,
        isScreenSharing: screenShare.isScreenSharing,
        duration: callState.duration,
        videoQuality: media.videoQuality,
        backgroundEnabled: media.backgroundEnabled,
        rnnoiseEnabled: media.rnnoiseEnabled,
        startTime: callState.startTime,
        participants: participantsHook.participants,
        handRaised: websocket.handRaised, // CRITICAL: Use websocket.handRaised (source of truth), not callState.handRaised
        remoteHandsRaised: websocket.remoteHandsRaised || {}, // CRITICAL: Use websocket.remoteHandsRaised (source of truth), not callState.remoteHandsRaised
        handRaisedOrder: websocket.handRaisedOrder || {} // CRITICAL: Use websocket.handRaisedOrder (source of truth) for displaying order numbers
      },
      localStream: media.localStream,
      remoteStreams: remoteStreamsMap,
      participants: participantsHook.participants,
      currentUser: currentUser,
      activeSpeakerId: activeSpeaker.activeSpeakerId,
      activeSpeakerHistory: activeSpeaker.activeSpeakerHistory,

      // Store all callbacks - use refs to avoid infinite loops
      leaveCall: async () => {
        if (leaveCallRef.current) {
          await leaveCallRef.current()
        }
      },
      toggleMute: () => {
        refs.mediaRef.current?.toggleMute()
      },
      toggleVideo: () => {
        refs.mediaRef.current?.toggleVideo()
      },
      toggleScreenShare: () => {
        refs.screenShareRef.current?.toggleScreenShare()
      },
      toggleMinimize: () => {
        if (toggleMinimizeRef.current) {
          toggleMinimizeRef.current()
        }
      },
      toggleBackground: () => {
        refs.mediaRef.current?.toggleBackground()
      },
      toggleRnnoise: async () => {
        await refs.mediaRef.current?.toggleRnnoise()
      },
      setRnnoiseMode: (mode: 'gentle' | 'moderate' | 'aggressive') => {
        refs.mediaRef.current?.setRnnoiseMode(mode)
      },
      toggleRaiseHand: () => {
        // CRITICAL: Get current state from websocket ref, not captured callState
        // callState.handRaised is stale - websocketRef.current.handRaised is the source of truth
        const currentHandRaised = websocketRef.current?.handRaised ?? false
        rtkDebug.log('[RTK GlobalCallManager] toggleRaiseHand callback invoked:', {
          currentHandRaised,
          hasWebsocketRef: !!websocketRef.current,
          websocketHandRaised: websocketRef.current?.handRaised
        })
        websocketRef.current?.toggleRaiseHand(currentHandRaised)
      },
      sendReaction: (reaction: string) => {
        websocketRef.current?.sendReaction(reaction)
      },
      setVideoQuality: quality => {
        refs.mediaRef.current?.setVideoQuality(quality)
      },
      switchAudioDevice: async (deviceId: string) => {
        await refs.mediaRef.current?.switchAudioDevice(deviceId)
      },
      switchVideoDevice: async (deviceId: string) => {
        await refs.mediaRef.current?.switchVideoDevice(deviceId)
      },
      setNoiseSuppressionEnabled: async (enabled: boolean) => {
        callPreferences.setNoiseSuppressionEnabled(enabled)
        await refs.mediaRef.current?.setNoiseSuppressionEnabled(enabled)
      },
      setAutoGainControlEnabled: async (enabled: boolean) => {
        callPreferences.setAutoGainControlEnabled(enabled)
        await refs.mediaRef.current?.setAutoGainControlEnabled(enabled)
      },
      onInviteParticipant: (participant: any) => {
        // inviteToCall expects an array, so wrap the single participant
        participantsHookRef.current?.inviteToCall([participant])
      },

      // Store context
      apiClient: chatApiClient || null,
      wsClient: wsClient,
      accessToken: options.accessToken || null,
      currentUserId: currentUser?.id || null,
      conversationName: callState.conversationName || null,
      rnnoiseEnabled: media.rnnoiseEnabled,
      rnnoiseMode: media.rnnoiseMode,
      activeConversation: activeConversation || null, // Currently active conversation for in-call chat
      // CRITICAL: Compute callConversation from conversations list based on roomId
      // This ensures we always use the conversation where the call was initiated
      callConversation: (() => {
        const roomId = callState.roomId
        if (!roomId || !options.conversations) return callConversation || activeConversation || null
        const foundConversation = options.conversations.find((c: any) => c.id === roomId)
        rtkDebug.log('[RTK Hook] 🔍 Computing callConversation for globalCallManager:', {
          roomId,
          foundConversationId: foundConversation?.id,
          foundConversationName: foundConversation?.name,
          participantCount: foundConversation?.participants?.length,
          fallbackToActive: !foundConversation && !!activeConversation
        })
        return foundConversation || activeConversation || null
      })(),
      pendingInvites: participantsHook.pendingInvites, // Keep as Map
      availableParticipants: [], // Will be passed from Chat component
      activeExperts: [] // Will be passed from Chat component
    })
  }, [
    callState.status,
    callState.roomId,
    callState.callType,
    callState.hostId,
    callState.duration,
    callState.startTime,
    callState.conversationName,
    media.isMuted,
    media.isVideoEnabled,
    media.videoQuality,
    media.backgroundEnabled,
    media.rnnoiseEnabled,
    media.rnnoiseMode,
    websocket.handRaised, // CRITICAL: Use websocket.handRaised (source of truth), not callState.handRaised
    websocket.remoteHandsRaised, // CRITICAL: Use websocket.remoteHandsRaised (source of truth), not callState.remoteHandsRaised
    websocket.handRaisedOrder, // CRITICAL: Use websocket.handRaisedOrder (source of truth) for displaying order numbers
    meeting,
    media.localStream,
    participantsHook.remoteStreams,
    participantsHook.participants,
    participantsHook.pendingInvites,
    activeSpeaker.activeSpeakerId,
    activeSpeaker.activeSpeakerHistory,
    screenShare.isScreenSharing,
    currentUser,
    apiClient,
    wsClient,
    options.accessToken,
    options.conversations, // CRITICAL: Sync when conversations change to recompute callConversation
    activeConversation // CRITICAL: Sync when active conversation changes (for in-call chat)
    // NOTE: leaveCall, media, screenShare, websocket, participantsHook, toggleMinimize, callConversation removed
    // to prevent infinite loops - they are accessed via refs or computed inline instead
  ])

  const inviteSocket = wsClient?.getSocket()
  useRealtimeKitInviteListeners({
    inviteSocket: inviteSocket ?? null,
    currentUser,
    refs,
    setIncomingInvite,
    setActiveConversationCalls,
    setCallState,
    clearInviteDedupeFor,
    leaveCallRef,
    media,
    participantsHook,
    rtkDebug
  })

  /**
   * Listen for transcript-ready WebSocket events
   */
  const transcriptSocket = wsClient?.getSocket()
  useEffect(() => {
    const socket = transcriptSocket
    if (!socket) return

    const handleTranscriptReady = (data: { noteId: string; meetingId: string; meetingTitle: string }) => {
      rtkDebug.log('[RTK] 📝 Transcript ready:', data)

      // Show toast notification
      // Note: All meeting participants receive this notification automatically
      toast.success('Meeting Transcript Ready', {
        description: `${data.meetingTitle} - Transcript has been saved and shared with all participants`,
        duration: 1000000 // 10 seconds
      })

      // Log note ID for easy access
      rtkDebug.log('[RTK] 📝 View transcript at:', `/note-apps?noteId=${data.noteId}`)
    }

    rtkDebug.log('[RTK] 🎧 Registering transcript-ready listener', {
      socketId: socket.id ?? 'pending',
      connected: socket.connected
    })
    // Idempotent registration (avoid stacked handlers in dev/reconnect)
    socket.off('transcript-ready')
    socket.on('transcript-ready', handleTranscriptReady)

    return () => {
      socket.off('transcript-ready', handleTranscriptReady)
    }
  }, [transcriptSocket])

  /**
   * Heartbeat: Keep localStorage updated so other tabs know we're still in a call
   */
  useEffect(() => {
    if (callState.status !== 'connected' || !currentUser || !callState.roomId) return

    // Update immediately
    setActiveCallInStorage(currentUser.id, callState.roomId)

    // Update every second
    const interval = setInterval(() => {
      if (currentUser && callState.roomId) {
        setActiveCallInStorage(currentUser.id, callState.roomId)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [callState.status, callState.roomId, currentUser])

  /**
   * Listen for storage changes to detect when user joins call in another tab
   * This allows us to dismiss the incoming call dialog in other tabs
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Only handle changes to our active call key
      if (event.key !== ACTIVE_CALL_KEY) return

      // If there's now an active call and we have an incoming invite, dismiss it
      if (event.newValue && incomingInvite && currentUser) {
        try {
          const data = JSON.parse(event.newValue)
          // If the active call is for the same user and it's recent, dismiss the incoming invite
          if (data.userId === currentUser.id && Date.now() - data.timestamp < 5000) {
            rtkDebug.log('[RTK] User joined call in another tab, dismissing incoming invite')

            // CRITICAL: Stop all media tracks when dismissing invite due to other tab join
            // User might have opened pre-call dialog which requested camera/mic permissions
            try {
              media.stopAllTracks()
              rtkDebug.log('[RTK] ✅ Media tracks stopped when dismissing invite (other tab joined)')
            } catch (err) {
              rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks when dismissing invite:', err)
            }

            // CRITICAL: Clear start time so we can sync to fresh time on next invite
            refs.startTimeRef.current = null
            rtkDebug.log('[RTK] ⏱️ Cleared start time when dismissing invite (other tab joined)')

            setIncomingInvite(null)
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [incomingInvite, currentUser, media])

  /**
   * Sync timer when callState.roomId is set and we have activeConversationCalls data
   */
  useEffect(() => {
    if (!callState.roomId || !isInCall) return

    // Find the call info by matching conversationId (callState.roomId) OR backend roomId
    for (const [conversationId, callInfo] of activeConversationCalls.entries()) {
      // Match by conversationId OR by backend's roomId
      if ((conversationId === callState.roomId || callInfo.roomId === callState.roomId) && callInfo.startedAt) {
        const globalStartTime = new Date(callInfo.startedAt).getTime()
        if (!refs.startTimeRef.current || globalStartTime < refs.startTimeRef.current) {
          rtkDebug.log('[RTK] ⏱️ 🔄 Syncing timer from activeConversationCalls:', {
            conversationId,
            roomId: callState.roomId,
            backendRoomId: callInfo.roomId,
            previousStartTime: refs.startTimeRef.current,
            globalStartTime
          })
          refs.startTimeRef.current = globalStartTime
        }
        break
      }
    }
  }, [callState.roomId, isInCall, activeConversationCalls])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopDurationTimer()
      refs.startTimeRef.current = null
    }
  }, [stopDurationTimer])

  /**
   * Debug helpers (expose to window in development)
   */
  useEffect(() => {
    if (typeof globalThis.window !== 'undefined' && process.env.NODE_ENV === 'development') {
      ;(globalThis as any).rtkLeaveCall = leaveCall
      ;(globalThis as any).rtkToggleMute = media.toggleMute
      ;(globalThis as any).rtkToggleVideo = media.toggleVideo
      ;(globalThis as any).rtkCallState = combinedCallState
      ;(globalThis as any).rtkLogSimulcastInfo = diagnostics.logSimulcastInfo
      rtkDebug.log('[RTK] 🔧 Debug functions exposed to console')
    }
    return () => {
      if (typeof globalThis.window !== 'undefined') {
        delete (globalThis as any).rtkLeaveCall
        delete (globalThis as any).rtkToggleMute
        delete (globalThis as any).rtkToggleVideo
        delete (globalThis as any).rtkCallState
        delete (globalThis as any).rtkLogSimulcastInfo
      }
    }
  }, [leaveCall, media.toggleMute, media.toggleVideo, combinedCallState, diagnostics.logSimulcastInfo])

  /**
   * Stable callbacks - wrap in useCallback to prevent re-creating on every render
   * CRITICAL: These wrappers prevent video element destruction/recreation
   */
  const stableToggleMute = useCallback(() => {
    return media.toggleMute()
  }, [media.toggleMute])

  const stableToggleVideo = useCallback(() => {
    return media.toggleVideo()
  }, [media.toggleVideo])

  const stableToggleBackground = useCallback(() => {
    return media.toggleBackground()
  }, [media.toggleBackground])

  const stableToggleRaiseHand = useCallback(async () => {
    // Pass the current hand raised state from callState, not websocket.handRaised
    return await websocket.toggleRaiseHand(combinedCallState.handRaised)
  }, [websocket.toggleRaiseHand, combinedCallState.handRaised])

  const stableGetConnectionDiagnostics = useCallback(() => {
    return diagnostics.getConnectionDiagnostics()
  }, [diagnostics.getConnectionDiagnostics])

  // Return the complete interface
  return {
    meeting: stableMeeting, // Stable meeting reference for RealtimeKitProvider
    callState: combinedCallState,
    isInCall,
    isHost,
    localStream: media.localStream,
    remoteStreams: participantsHook.remoteStreams,
    participants: participantsHook.participants,
    pendingInvites: participantsHook.pendingInvites,
    incomingInvite,
    activeConversationCalls,
    currentCallConversationName: callState.conversationName,
    activeSpeakerId: activeSpeaker.activeSpeakerId, // Active speaker tracking
    activeSpeakerHistory: activeSpeaker.activeSpeakerHistory, // Recent speakers for sorting
    initiateCall, // Show pre-call setup dialog
    confirmStartCall, // Start call with user preferences
    cancelSetup, // Cancel pre-call setup
    startCall, // Legacy: directly start call (deprecated, use initiateCall + confirmStartCall)
    joinCall,
    acceptInvite,
    declineInvite,
    leaveCall,
    toggleMute: stableToggleMute, // Stable callback - prevents video flashing
    toggleVideo: stableToggleVideo, // Stable callback - prevents video flashing
    toggleScreenShare: screenShare.toggleScreenShare,
    setVideoQuality: media.setVideoQuality,
    toggleMinimize,
    toggleBackground: () => void stableToggleBackground(), // Stable callback - prevents video flashing
    toggleRaiseHand: stableToggleRaiseHand, // Stable callback
    sendReaction: websocket.sendReaction,
    inviteToCall: participantsHook.inviteToCall,
    reconnectParticipant: participantsHook.reconnectParticipant,
    getConnectionDiagnostics: stableGetConnectionDiagnostics, // Stable callback
    transcriptionEnabled: callState.transcriptionEnabled,
    toggleTranscription,
    toggleRnnoise: media.toggleRnnoise,
    setRnnoiseMode: media.setRnnoiseMode,
    switchAudioDevice: media.switchAudioDevice,
    switchVideoDevice: media.switchVideoDevice
  }
}
