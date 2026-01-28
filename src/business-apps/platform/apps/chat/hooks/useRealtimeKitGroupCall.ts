/**
 * useRealtimeKitGroupCall Hook - Refactored Composition Version
 *
 * This hook provides the same interface as the original but composes
 * all functionality from extracted, reusable hooks.
 *
 * Manages group calls using Cloudflare Realtime Kit with SFU infrastructure.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react'
import { toast } from '@newwork/nw-design-system'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { RealtimeKitApiClient } from '../services/realtimeKitApiClient'
import type { CallParticipant, CallType } from '../services/webrtcClient'
import type { GroupCallUIState, GroupCallInvite, ActiveConversationCall, UseGroupCallReturn } from './useGroupCall'
import { SIMULCAST_ENCODINGS } from '../services/realtimeKitSimulcast'
import { useCallPreferences } from './useCallPreferences'
import { useRealtimeKitDiagnostics } from './useRealtimeKitDiagnostics'
import { useRealtimeKitWebSocket } from './useRealtimeKitWebSocket'
import { useRealtimeKitParticipants } from './useRealtimeKitParticipants'
import { useRealtimeKitScreenShare } from './useRealtimeKitScreenShare'
import { useRealtimeKitMedia } from './useRealtimeKitMedia'
import { useRealtimeKitActiveSpeaker } from './useRealtimeKitActiveSpeaker'
import { rtkDebug } from '../utils/rtkDebug'

// LocalStorage key for tracking active calls across tabs
const ACTIVE_CALL_KEY = 'chat_active_call'

// Helper to check if user is in a call in another tab
const isInCallInAnotherTab = (currentUserId: string): boolean => {
  try {
    const stored = localStorage.getItem(ACTIVE_CALL_KEY)
    if (!stored) return false
    const data = JSON.parse(stored)
    // Check if the call is still active (within last 5 seconds)
    const isRecent = Date.now() - data.timestamp < 5000
    return data.userId === currentUserId && isRecent
  } catch {
    return false
  }
}

// Helper to set active call in localStorage
const setActiveCallInStorage = (userId: string, roomId: string) => {
  try {
    localStorage.setItem(
      ACTIVE_CALL_KEY,
      JSON.stringify({
        userId,
        roomId,
        timestamp: Date.now()
      })
    )
  } catch {
    // Ignore storage errors
  }
}

// Helper to clear active call from localStorage
const clearActiveCallFromStorage = () => {
  try {
    localStorage.removeItem(ACTIVE_CALL_KEY)
  } catch {
    // Ignore storage errors
  }
}

export interface UseRealtimeKitGroupCallOptions {
  wsClient: ChatWebSocketClient | null
  apiClient?: RealtimeKitApiClient | null
  currentUser: CallParticipant | null
  onCallStarted?: (roomId: string, participants: CallParticipant[]) => void
  onCallEnded?: (roomId: string, duration: number) => void
  onParticipantJoined?: (participant: CallParticipant) => void
  onParticipantLeft?: (participantId: string) => void
}

interface CallState extends GroupCallUIState {
  status: 'idle' | 'joining' | 'connected' | 'reconnecting' | 'ended'
  roomId: string | null
  meetingId: string | null
  callType: CallType
  callStartTime: number | null
  conversationName?: string
  transcriptionEnabled: boolean
}

export const useRealtimeKitGroupCall = (options: UseRealtimeKitGroupCallOptions): UseGroupCallReturn => {
  const { wsClient, apiClient, currentUser, onCallStarted, onCallEnded } = options

  // Core call state
  const [callState, setCallState] = useState<CallState>({
    isMinimized: false,
    status: 'idle',
    roomId: null,
    meetingId: null,
    callType: 'audio',
    callStartTime: null,
    transcriptionEnabled: false,
    // GroupCallUIState required properties
    participants: [],
    hostId: null,
    isMuted: false,
    isVideoEnabled: false,
    isScreenSharing: false,
    videoQuality: 'low',
    backgroundEnabled: false,
    handRaised: false,
    remoteHandsRaised: {},
    startTime: null,
    duration: 0,
    callImplementation: 'realtime-kit'
  })

  const [incomingInvite, setIncomingInvite] = useState<GroupCallInvite | null>(null)

  const [activeConversationCalls, setActiveConversationCalls] = useState<Map<string, ActiveConversationCall>>(new Map())

  // Refs for synchronous checks in WebSocket handlers
  const meetingIdRef = useRef<string | null>(null)
  const callStateRoomIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isInCallRef = useRef<boolean>(false)
  const conversationIdRef = useRef<string | null>(null)
  const joinCallConversationIdRef = useRef<string | null>(null)
  const wasIdleRef = useRef<boolean>(true)
  const isLeavingRef = useRef<boolean>(false) // Prevent duplicate leave calls

  // Initialize RealtimeKit SDK - returns tuple [meeting, initMeeting]
  const [meeting, initMeeting] = useRealtimeKitClient()

  // CRITICAL: Stabilize meeting reference for RealtimeKitProvider to prevent constant re-renders
  // The SDK's useRealtimeKitClient returns a new object reference on every internal update,
  // but we need a stable reference for the Provider to avoid unmounting/remounting all children.
  // We memoize based on the connection state - only change when actually joining/leaving
  const stableMeeting = useMemo(() => {
    rtkDebug.log('[RTK] 🔄 stableMeeting recomputed:', {
      roomState: meeting?.self?.roomState,
      roomJoined: meeting?.self?.roomJoined,
      callStatus: callState.status,
      hasMeeting: !!meeting,
      timestamp: Date.now()
    })
    // Return the meeting object, but only update the memo when the connection state actually changes
    return meeting
  }, [
    // Only recreate when fundamental properties change, not on every SDK update
    meeting?.self?.roomState,
    meeting?.self?.roomJoined,
    callState.status // Also depend on our call status to sync with connection state
  ])

  // Preferences management (localStorage)
  const preferences = useCallPreferences()

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
  const media = useRealtimeKitMedia({
    meeting: stableMeeting,
    callType: callState.callType,
    initialVideoQuality: preferences.videoQuality,
    initialBackgroundEnabled: preferences.backgroundEnabled,
    callStatus: callState.status
  })

  // Screen share management
  // CRITICAL: Pass stableMeeting and stable callback
  const screenShare = useRealtimeKitScreenShare({
    meeting: stableMeeting,
    onScreenShareStateChange: handleScreenShareStateChange
  })

  // WebSocket coordination (raise hand, reactions)
  // CRITICAL: Pass stableMeeting and stable callback
  const websocket = useRealtimeKitWebSocket({
    wsClient,
    roomId: callState.roomId,
    meetingId: callState.meetingId,
    currentUser,
    meeting: stableMeeting, // Pass stable meeting reference
    onReactionReceived: handleReactionReceived
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
    emitSocketEvent: websocket.emitSocketEvent
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
  const isHost = callState.roomId === currentUser?.id

  // Keep refs in sync with state (inline for synchronous access in WebSocket handlers)
  meetingIdRef.current = callState.meetingId
  callStateRoomIdRef.current = callState.roomId
  isInCallRef.current = isInCall

  // CRITICAL: Keep ref in sync with screenShare state to avoid leaveCall recreation
  const isScreenSharingRef = useRef(screenShare.isScreenSharing)
  isScreenSharingRef.current = screenShare.isScreenSharing

  // CRITICAL: Keep ref in sync with callStartTime to avoid leaveCall recreation
  const callStartTimeRef = useRef(callState.callStartTime)
  callStartTimeRef.current = callState.callStartTime

  // CRITICAL: Keep ref in sync with preferences to avoid leaveCall recreation
  const preferencesRef = useRef(preferences)
  preferencesRef.current = preferences

  // CRITICAL: Keep refs in sync to avoid leaveCall recreation
  const wsClientRef = useRef(wsClient)
  wsClientRef.current = wsClient
  const onCallEndedRef = useRef(onCallEnded)
  onCallEndedRef.current = onCallEnded
  const currentUserRef = useRef(currentUser)
  currentUserRef.current = currentUser

  // Update wasIdleRef: mark as not idle when call starts
  if (callState.status !== 'idle' && callState.status !== 'ended') {
    wasIdleRef.current = false
  } else if (callState.status === 'idle') {
    wasIdleRef.current = true
  }

  // Combined call state for compatibility
  const combinedCallState: GroupCallUIState = useMemo(
    () => ({
      roomId: callState.roomId,
      callType: callState.callType,
      status: callState.status,
      isMinimized: callState.isMinimized,
      isMuted: media.isMuted,
      isVideoEnabled: media.isVideoEnabled,
      isScreenSharing: screenShare.isScreenSharing,
      videoQuality: media.videoQuality,
      backgroundEnabled: media.backgroundEnabled,
      handRaised: websocket.handRaised,
      remoteHandsRaised: websocket.remoteHandsRaised || {},
      participants: participantsHook.participants,
      hostId: callState.hostId,
      startTime: callState.callStartTime,
      duration: callState.duration,
      callImplementation: 'realtime-kit'
    }),
    [
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
      websocket.handRaised,
      websocket.remoteHandsRaised,
      participantsHook.participants
    ]
  )

  /**
   * Start the duration timer - updates every second
   */
  const startDurationTimer = useCallback(() => {
    // Clear any existing timer
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
    }

    durationTimerRef.current = setInterval(() => {
      if (!startTimeRef.current) return

      const now = Date.now()
      const elapsed = Math.floor((now - startTimeRef.current) / 1000)

      setCallState(prev => ({
        ...prev,
        duration: elapsed,
        callStartTime: startTimeRef.current
      }))
    }, 1000)

    rtkDebug.log('[RTK] ⏱️ Duration timer started')
  }, [])

  /**
   * Stop the duration timer
   */
  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
      rtkDebug.log('[RTK] ⏱️ Duration timer stopped')
    }
  }, [])

  /**
   * Start a new call
   */
  const startCall = useCallback(
    async (conversationId: string, callType: CallType, participants: CallParticipant[], conversationName?: string) => {
      if (!currentUser || !apiClient) {
        rtkDebug.error('[RTK] Cannot start call: missing currentUser or apiClient')
        return
      }

      try {
        rtkDebug.log('[RTK] 🚀 Starting call...', {
          conversationId,
          callType,
          participantCount: participants.length,
          conversationName,
          currentStatus: callState.status
        })

        // CRITICAL: Check if we were idle BEFORE changing state
        // This is used to determine if we should send invites
        const wasIdleBeforeStart = callState.status === 'idle'

        rtkDebug.log('[RTK] Checking idle state before starting call:', {
          callStateStatus: callState.status,
          wasIdleBeforeStart
        })

        // Generate session ID from backend with display name
        rtkDebug.log('[RTK] Requesting meeting creation from backend...', {
          conversationId,
          callType,
          displayName: currentUser?.odName,
          conversationName
        })

        const sessionResponse = await apiClient.createMeeting(
          conversationId,
          callType,
          currentUser?.odName, // displayName
          undefined, // firstName
          undefined, // lastName
          conversationName, // meetingName
          callState.transcriptionEnabled // transcription_enabled
        )
        const meetingId = sessionResponse.data.meetingId
        const authToken = sessionResponse.data.hostAuthToken

        rtkDebug.log('[RTK] ✅ Backend meeting created:', {
          conversationId,
          meetingId,
          hasAuthToken: !!authToken,
          authTokenLength: authToken?.length,
          callType,
          conversationName
        })

        // Initialize meeting with SDK
        rtkDebug.log('[RTK] Initializing meeting with SDK...', {
          hasAuthToken: !!authToken,
          authTokenLength: authToken?.length,
          callType,
          audioEnabled: true,
          videoEnabled: callType === 'video'
        })

        const initializedMeeting = await initMeeting({
          authToken,
          defaults: {
            audio: true,
            video: callType === 'video'
          },
          overrides: {
            simulcastConfig: {
              encodings: SIMULCAST_ENCODINGS
            }
          }
        })

        rtkDebug.log('[RTK] initMeeting result:', {
          hasInitializedMeeting: !!initializedMeeting,
          meetingType: typeof initializedMeeting,
          meetingKeys: initializedMeeting ? Object.keys(initializedMeeting) : []
        })

        if (!initializedMeeting) {
          rtkDebug.error('[RTK] ❌ initMeeting returned null/undefined')
          throw new Error('Failed to initialize meeting')
        }

        // CRITICAL: Configure video middleware before video is enabled (for background effects)
        if (initializedMeeting?.self?.setVideoMiddlewareGlobalConfig) {
          try {
            await initializedMeeting.self.setVideoMiddlewareGlobalConfig({
              disablePerFrameCanvasRendering: true
            })
            rtkDebug.log('[RTK] ✅ Video middleware configured globally')
          } catch (err) {
            rtkDebug.warn('[RTK] ⚠️ Failed to configure video middleware:', err)
          }
        }

        rtkDebug.log('[RTK] Joining meeting via SDK...', { meetingId })

        // CRITICAL: Join the meeting (connects to Cloudflare SFU)
        await initializedMeeting.join()

        // CRITICAL: Wait for actual Session connection (roomJoined: true)
        rtkDebug.log('[RTK] Waiting for Session connection...')
        const sessionTimeout = 10000 // 10 seconds max
        const startTime = Date.now()

        while (!initializedMeeting?.self?.roomJoined && Date.now() - startTime < sessionTimeout) {
          rtkDebug.log('[RTK] Waiting for roomJoined... (elapsed:', Date.now() - startTime, 'ms)')
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        if (!initializedMeeting?.self?.roomJoined) {
          rtkDebug.error('[RTK] ❌ Timeout waiting for roomJoined after', sessionTimeout, 'ms')
          throw new Error('Failed to join meeting: timeout')
        }

        rtkDebug.log('[RTK] ✅ Session connected (roomJoined: true)', {
          elapsed: Date.now() - startTime,
          roomState: initializedMeeting.self?.roomState
        })

        // Store conversationId for tracking
        conversationIdRef.current = conversationId

        // Update state
        // Start duration timer
        const callStartTime = Date.now()
        startTimeRef.current = callStartTime
        startDurationTimer()

        setCallState(prev => ({
          ...prev,
          status: 'joining',
          roomId: conversationId,
          meetingId,
          callType,
          callStartTime,
          conversationName
        }))

        // Save to localStorage for recovery
        preferences.saveActiveCall(currentUser.id, conversationId)

        // Send invites when starting a new call with participants
        // wasIdleBeforeStart ensures we don't send duplicate invites when rejoining
        const shouldSendInvites = wasIdleBeforeStart && participants.length > 0

        rtkDebug.log('[RTK] 📨 Invite decision:', {
          wasIdleBeforeStart,
          participantsCount: participants.length,
          shouldSendInvites,
          conversationId,
          meetingId,
          callType,
          participants: participants.map(p => ({ id: p.id, name: p.odName }))
        })

        if (shouldSendInvites) {
          // CRITICAL: Pass callType explicitly to avoid stale closure from React state
          rtkDebug.log('[RTK] 📤 Sending invites to participants:', {
            count: participants.length,
            meetingId,
            conversationId,
            callType
          })
          participantsHook.inviteToCall(participants, conversationName, meetingId, conversationId, callType)
        } else {
          rtkDebug.log('[RTK] ⏭️ Skipping invites:', {
            reason: !wasIdleBeforeStart ? 'Not starting from idle state' : 'No participants to invite',
            wasIdleBeforeStart,
            participantsCount: participants.length
          })
        }

        // CRITICAL: Emit start event FIRST so backend creates activeCalls entry
        // This must happen before joined event so backend knows about the call
        if (wsClient?.getSocket()) {
          wsClient.getSocket()?.emit('rtk-group-call:start', {
            conversationId,
            meetingId,
            callType,
            conversationName,
            from: {
              id: currentUser.id,
              odId: currentUser.id,
              odName: currentUser.odName,
              avatarUrl: currentUser.avatarUrl
            },
            participants: participants.map(p => ({
              id: p.id,
              odId: p.odId,
              odName: p.odName,
              avatarUrl: p.avatarUrl
            }))
          })
          rtkDebug.log('[RTK] Emitted rtk-group-call:start event')
        }

        // Then emit joined event to notify backend we joined
        if (wsClient?.getSocket()) {
          wsClient.getSocket()?.emit('rtk-group-call:joined', {
            conversationId,
            meetingId,
            participant: {
              id: currentUser.id,
              odId: currentUser.id,
              odName: currentUser.odName,
              avatarUrl: currentUser.avatarUrl
            }
          })
          rtkDebug.log('[RTK] Emitted rtk-group-call:joined event')
        }

        onCallStarted?.(conversationId, participants)
      } catch (error) {
        rtkDebug.error('[RTK] Failed to start call:', error)
        setCallState(prev => ({ ...prev, status: 'idle' }))
      }
    },
    [
      currentUser,
      apiClient,
      initMeeting,
      preferences,
      participantsHook,
      onCallStarted,
      startDurationTimer,
      wsClient,
      callState.status,
      callState.roomId,
      conversationIdRef
    ]
  )

  /**
   * Join an existing call
   */
  const joinCall = useCallback(
    async (roomId: string, callType: CallType, meetingId?: string, conversationName?: string) => {
      if (!currentUser || !apiClient) {
        rtkDebug.error('[RTK] Cannot join call: missing currentUser or apiClient')
        return
      }

      try {
        rtkDebug.log('[RTK] 📞 Joining existing call...', {
          roomId,
          callType,
          meetingId: meetingId || 'will-generate',
          conversationName,
          currentStatus: callState.status
        })

        // When joining an existing meeting, we need to call addParticipant to get participant auth token
        // When meetingId is provided, it means we're joining an existing meeting (not creating one)
        rtkDebug.log('[RTK] Getting auth token...', {
          hasExistingMeetingId: !!meetingId,
          path: meetingId ? 'addParticipant' : 'createMeeting',
          meetingId: meetingId || 'none',
          roomId
        })

        const authToken = meetingId
          ? (
              await apiClient.addParticipant(
                meetingId,
                undefined, // userId (optional - backend uses requesting user)
                'host', // Give all participants host permissions for moderation
                currentUser?.odName, // displayName
                undefined, // firstName
                undefined // lastName
              )
            ).data.authToken
          : (
              await apiClient.createMeeting(
                roomId,
                callType,
                currentUser?.odName, // displayName
                undefined, // firstName
                undefined, // lastName
                undefined, // meetingName
                false // transcription_enabled - joining existing call, don't change transcription
              )
            ).data.hostAuthToken

        rtkDebug.log('[RTK] Auth token received:', {
          hasToken: !!authToken,
          tokenLength: authToken?.length
        })

        const finalMeetingId = meetingId || roomId

        rtkDebug.log('[RTK] ✅ Auth token received:', {
          hasToken: !!authToken,
          tokenLength: authToken?.length,
          finalMeetingId,
          roomId,
          callType,
          willEnableVideo: callType === 'video'
        })

        // Initialize meeting
        const initializedMeeting = await initMeeting({
          authToken,
          defaults: {
            audio: true,
            video: callType === 'video'
          },
          overrides: {
            simulcastConfig: {
              encodings: SIMULCAST_ENCODINGS
            }
          }
        })

        rtkDebug.log('[RTK] initMeeting result:', {
          hasInitializedMeeting: !!initializedMeeting,
          meetingType: typeof initializedMeeting
        })

        if (!initializedMeeting) {
          rtkDebug.error('[RTK] ❌ initMeeting returned null/undefined', {
            authToken: authToken ? 'present' : 'missing',
            finalMeetingId
          })
          throw new Error('Failed to initialize meeting')
        }

        // CRITICAL: Configure video middleware before video is enabled (for background effects)
        if (initializedMeeting?.self?.setVideoMiddlewareGlobalConfig) {
          try {
            await initializedMeeting.self.setVideoMiddlewareGlobalConfig({
              disablePerFrameCanvasRendering: true
            })
            rtkDebug.log('[RTK] ✅ Video middleware configured globally')
          } catch (err) {
            rtkDebug.warn('[RTK] ⚠️ Failed to configure video middleware:', err)
          }
        }

        rtkDebug.log('[RTK] Joining meeting via SDK...', { meetingId })

        // CRITICAL: Join the meeting (connects to Cloudflare SFU)
        await initializedMeeting.join()

        // CRITICAL: Wait for actual Session connection (roomJoined: true)
        rtkDebug.log('[RTK] Waiting for Session connection...')
        const sessionTimeout = 10000 // 10 seconds max
        const startTime = Date.now()

        while (!initializedMeeting?.self?.roomJoined && Date.now() - startTime < sessionTimeout) {
          rtkDebug.log('[RTK] Waiting for roomJoined... (elapsed:', Date.now() - startTime, 'ms)')
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        if (!initializedMeeting?.self?.roomJoined) {
          rtkDebug.error('[RTK] ❌ Timeout waiting for roomJoined after', sessionTimeout, 'ms')
          throw new Error('Failed to join meeting: timeout')
        }

        rtkDebug.log('[RTK] ✅ Session connected (roomJoined: true)', {
          elapsed: Date.now() - startTime,
          roomState: initializedMeeting.self?.roomState
        })

        // Store conversationId for tracking
        conversationIdRef.current = roomId

        // Start duration timer (only set startTime if not already synced from global)
        joinCallConversationIdRef.current = roomId
        const callStartTime = Date.now()
        if (!startTimeRef.current) {
          startTimeRef.current = callStartTime
          rtkDebug.log('[RTK] ⏱️ Set local start time (no global sync yet)')
        } else {
          rtkDebug.log('[RTK] ⏱️ Keeping synced global start time:', {
            globalStartTime: startTimeRef.current,
            diff: (Date.now() - startTimeRef.current) / 1000
          })
        }
        startDurationTimer()

        // Update state
        setCallState(prev => ({
          ...prev,
          status: 'joining',
          roomId,
          meetingId: finalMeetingId,
          callType,
          callStartTime: startTimeRef.current, // Use the ref, not Date.now()!
          conversationName
        }))

        // Save to localStorage
        preferences.saveActiveCall(currentUser.id, roomId)

        // Mark active call in localStorage for cross-tab detection
        setActiveCallInStorage(currentUser.id, roomId)

        // Emit WebSocket join event to notify backend we joined
        if (wsClient?.getSocket()) {
          wsClient.getSocket()?.emit('rtk-group-call:joined', {
            conversationId: roomId,
            meetingId: finalMeetingId,
            participant: {
              id: currentUser.id,
              odId: currentUser.id,
              odName: currentUser.odName,
              avatarUrl: currentUser.avatarUrl
            }
          })
          rtkDebug.log('[RTK] Emitted rtk-group-call:joined event (joining existing call)')
        }
      } catch (error) {
        rtkDebug.error('[RTK] Failed to join call:', error)
        setCallState(prev => ({ ...prev, status: 'idle' }))
      }
    },
    [currentUser, apiClient, initMeeting, preferences, wsClient, startDurationTimer, conversationIdRef]
  )

  /**
   * Accept incoming invite
   */
  const acceptInvite = useCallback(async () => {
    if (!incomingInvite) return

    rtkDebug.log('[RTK] Accepting invite:', {
      conversationId: incomingInvite.conversationId,
      meetingId: incomingInvite.roomId,
      callType: incomingInvite.callType,
      conversationName: incomingInvite.conversationName,
      from: incomingInvite.from.odName
    })

    // CRITICAL: Call internal joinCall directly with proper IDs from invite
    // - conversationId from invite.conversationId
    // - meetingId from invite.roomId (backend meeting ID)
    // - conversationName from invite.conversationName
    // Don't use the wrapper because invite has all the info we need!
    await joinCall(
      incomingInvite.conversationId || incomingInvite.roomId, // conversationId
      incomingInvite.callType,
      incomingInvite.roomId, // meetingId (stored in roomId field of invite)
      incomingInvite.conversationName // conversationName
    )
    setIncomingInvite(null)
  }, [incomingInvite, joinCall])

  /**
   * Decline incoming invite
   */
  const declineInvite = useCallback(() => {
    if (!incomingInvite) return

    rtkDebug.log('[RTK] 🚫 Declining invite:', {
      meetingId: incomingInvite.roomId,
      conversationId: incomingInvite.conversationId
    })

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
  }, [incomingInvite, currentUser, wsClient])

  /**
   * Leave the current call
   */
  const leaveCall = useCallback(async () => {
    // Use refs instead of callState to avoid dependency on callState object
    const roomId = callStateRoomIdRef.current
    const meetingId = meetingIdRef.current
    const callStartTime = callStartTimeRef.current

    if (!roomId) return

    // Prevent duplicate leave calls
    if (isLeavingRef.current) {
      rtkDebug.warn('[RTK] ⚠️ leaveCall already in progress, ignoring duplicate call')
      return
    }

    try {
      isLeavingRef.current = true

      rtkDebug.log('[RTK] 🚪 Leaving call...', {
        roomId,
        meetingId,
        hasMeeting: !!stableMeeting
      })

      // Stop duration timer
      stopDurationTimer()
      startTimeRef.current = null
      conversationIdRef.current = null
      callStateRoomIdRef.current = null
      wasIdleRef.current = true // Mark as idle for next call

      // Calculate duration
      const duration = callStartTime ? Date.now() - callStartTime : 0

      // CRITICAL: Clean up screen share before leaving
      // Use ref to avoid dependency on screenShare object
      if (isScreenSharingRef.current && stableMeeting?.self) {
        try {
          await stableMeeting.self.disableScreenShare()
          rtkDebug.log('[RTK] ✅ Screen share stopped during cleanup')
        } catch (err) {
          rtkDebug.error('[RTK] ⚠️ Failed to stop screen share during cleanup:', err)
        }
      }

      // CRITICAL: Disconnect from RealtimeKit SFU
      if (stableMeeting) {
        try {
          await stableMeeting.leave()
          rtkDebug.log('[RTK] ✅ SDK meeting.leave() completed')
        } catch (err) {
          rtkDebug.error('[RTK] ❌ SDK meeting.leave() error:', err)
        }
      }

      // Emit WebSocket leave event to notify backend and other participants (use refs)
      const user = currentUserRef.current
      const socket = wsClientRef.current?.getSocket()
      if (user && socket) {
        socket.emit('rtk-group-call:left', {
          conversationId: roomId,
          meetingId: meetingId,
          participantId: user.id
        })
        rtkDebug.log('[RTK] 📤 Emitted rtk-group-call:left event', {
          conversationId: roomId,
          meetingId: meetingId,
          participantId: user.id
        })
      }

      // Reset state
      setCallState(prev => ({
        ...prev,
        isMinimized: false,
        status: 'ended',
        roomId: null,
        meetingId: null,
        callType: 'audio',
        callStartTime: null,
        participants: [],
        hostId: null
      }))

      // CRITICAL: Clear the activeConversationCalls entry for this conversation
      // This prevents stale data when restarting a call after everyone has left
      if (roomId) {
        setActiveConversationCalls(prev => {
          const newMap = new Map(prev)
          newMap.delete(roomId)
          rtkDebug.log('[RTK] 🧹 Cleared activeConversationCalls entry on leave:', {
            conversationId: roomId,
            hadEntry: prev.has(roomId),
            remainingEntries: newMap.size
          })
          return newMap
        })
      }

      // Clear localStorage (use ref to avoid dependency)
      preferencesRef.current.clearActiveCall()

      // Clear active call from localStorage for cross-tab detection
      clearActiveCallFromStorage()

      // Call the callback (use ref to avoid dependency)
      onCallEndedRef.current?.(roomId, duration)

      // Final state reset after callback
      setTimeout(() => {
        setCallState(prev => ({ ...prev, status: 'idle' }))
        isLeavingRef.current = false // Reset the flag after cleanup
      }, 100)
    } catch (error) {
      rtkDebug.error('[RTK] Error leaving call:', error)
      isLeavingRef.current = false // Reset on error
    }
  }, [
    stableMeeting, // Use stable meeting reference
    stopDurationTimer
    // NOTE: All volatile dependencies accessed via refs to prevent recreation:
    // - roomId, meetingId, callStartTime, isScreenSharing
    // - preferences, wsClient, onCallEnded, currentUser
  ])

  /**
   * Toggle minimized state
   */
  const toggleMinimize = useCallback(() => {
    setCallState(prev => ({ ...prev, isMinimized: !prev.isMinimized }))
  }, [])

  /**
   * Toggle transcription enabled/disabled
   */
  const toggleTranscription = useCallback(() => {
    setCallState(prev => ({ ...prev, transcriptionEnabled: !prev.transcriptionEnabled }))
  }, [])

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

  /**
   * Listen to WebSocket incoming call invites and lifecycle events
   */
  useEffect(() => {
    const socket = wsClient?.getSocket()
    if (!socket || !currentUser) return

    const handleInvite = (data: any) => {
      rtkDebug.log('[RTK] Received call invite:', data)

      // ⚠️ CRITICAL: Ignore invite if already in this call (prevents double-join)
      // Check meetingIdRef (synchronous) instead of callState (async)
      // BUT: Allow invite if call state is idle (even if refs have stale values)
      const isInActiveCall = callState.status !== 'idle' && meetingIdRef.current === data.meetingId
      if (isInActiveCall) {
        rtkDebug.log('[RTK] Ignoring invite - already in this call', {
          currentMeetingId: meetingIdRef.current,
          inviteMeetingId: data.meetingId,
          callStatus: callState.status
        })
        return
      }

      // Also ignore if we're in ANY active call
      const isInAnyActiveCall = callState.status !== 'idle' && callStateRoomIdRef.current
      if (isInAnyActiveCall) {
        rtkDebug.log('[RTK] Ignoring invite - already in another call', {
          currentRoomId: callStateRoomIdRef.current,
          callStatus: callState.status
        })
        return
      }

      // Ignore if this is our own invite
      if (data.from.id === currentUser?.id) {
        rtkDebug.log('[RTK] Ignoring invite - from self')
        return
      }

      // Ignore if user is in a call in another tab
      if (currentUser && isInCallInAnotherTab(currentUser.id)) {
        rtkDebug.log('[RTK] Ignoring invite - user is in call in another tab')
        return
      }

      // Check wasIdleRef to ensure we're truly idle (prevents race conditions)
      if (!wasIdleRef.current && callState.status !== 'idle') {
        rtkDebug.log('[RTK] Ignoring invite - not in idle state', {
          wasIdleRef: wasIdleRef.current,
          callStatus: callState.status
        })
        return
      }

      rtkDebug.log('[RTK] Accepting invite - call is idle', {
        meetingId: data.meetingId,
        conversationId: data.conversationId,
        callStatus: callState.status,
        wasIdleRef: wasIdleRef.current
      })

      setIncomingInvite({
        roomId: data.meetingId,
        callType: data.callType,
        from: data.from,
        conversationId: data.conversationId,
        conversationName: data.conversationName || data.conversationId
      })
    }

    const handleCallEnded = (data: { meetingId: string; conversationId: string }) => {
      rtkDebug.log('[RTK] Call ended by host', data)

      if (callStateRoomIdRef.current === data.meetingId) {
        leaveCall()
      }
    }

    const handleConversationCallStarted = (data: {
      conversationId: string
      roomId: string
      callType: 'audio' | 'video'
      startedBy: { id: string; odId: string; odName: string; avatarUrl?: string }
      participantIds: string[]
      startedAt?: Date | string
      conversationName?: string
    }) => {
      rtkDebug.log('[RTK] 📞 Conversation call started/updated:', {
        conversationId: data.conversationId,
        roomId: data.roomId,
        callType: data.callType,
        participantCount: data.participantIds.length,
        startedAt: data.startedAt,
        currentStartTimeRef: startTimeRef.current,
        isInCall: isInCallRef.current
      })

      // Update activeConversationCalls
      setActiveConversationCalls(prev => {
        const newMap = new Map(prev)
        newMap.set(data.conversationId, {
          roomId: data.roomId,
          callType: data.callType,
          participantIds: data.participantIds,
          startedBy: data.startedBy.id,
          startedAt: data.startedAt,
          conversationName: data.conversationName
        })
        return newMap
      })

      // Global Call Timer Synchronization
      // Sync timer if we have startedAt and this event is for the current call
      // Check both roomId (conversationId) and meetingId to handle different call scenarios
      if (
        data.startedAt &&
        (data.roomId === callStateRoomIdRef.current ||
          data.roomId === meetingIdRef.current ||
          data.conversationId === callStateRoomIdRef.current ||
          !isInCallRef.current)
      ) {
        const globalStartTime = new Date(data.startedAt).getTime()

        rtkDebug.log('[RTK] 📥 Received conversation:call-started event', {
          roomId: data.roomId,
          conversationId: data.conversationId,
          startedAt: data.startedAt,
          globalStartTime,
          currentRoomId: callStateRoomIdRef.current,
          currentMeetingId: meetingIdRef.current,
          currentStartTime: startTimeRef.current,
          isInCall: isInCallRef.current,
          matchesCurrentCall:
            data.roomId === callStateRoomIdRef.current ||
            data.roomId === meetingIdRef.current ||
            data.conversationId === callStateRoomIdRef.current
        })

        // CRITICAL FIX: Always update to the backend's time for this call
        // Don't keep old timer from previous calls!
        const shouldUpdate =
          !startTimeRef.current ||
          globalStartTime < startTimeRef.current ||
          Math.abs(globalStartTime - startTimeRef.current) > 60000 // More than 1 minute difference = different call

        if (shouldUpdate) {
          rtkDebug.log('[RTK] ⏱️ Synced global start time:', {
            previousStartTime: startTimeRef.current,
            globalStartTime,
            diff: startTimeRef.current ? (startTimeRef.current - globalStartTime) / 1000 : 0,
            reason: !startTimeRef.current
              ? 'no-current-time'
              : globalStartTime < startTimeRef.current
                ? 'backend-earlier'
                : 'time-gap-detected'
          })
          startTimeRef.current = globalStartTime
        } else {
          rtkDebug.log('[RTK] ⏱️ ⏭️ Skipping timer sync - within acceptable range:', {
            currentStartTime: startTimeRef.current,
            globalStartTime,
            diff: startTimeRef.current ? (startTimeRef.current - globalStartTime) / 1000 : 0
          })
        }
      } else {
        rtkDebug.log('[RTK] ⏱️ ⏭️ Skipping timer sync - not for current call or no startedAt:', {
          hasStartedAt: !!data.startedAt,
          eventRoomId: data.roomId,
          eventConversationId: data.conversationId,
          currentRoomId: callStateRoomIdRef.current,
          currentMeetingId: meetingIdRef.current,
          isInCall: isInCallRef.current
        })
      }
    }

    const handleConversationCallEnded = (data: { conversationId: string; roomId: string }) => {
      rtkDebug.log('[RTK] 📴 Conversation call ended:', data)

      setActiveConversationCalls(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.conversationId)
        return newMap
      })
    }

    rtkDebug.log('[RTK] 🎧 Registering WebSocket listeners')

    socket.on('rtk-group-call:invite', handleInvite)
    socket.on('rtk-group-call:ended', handleCallEnded)
    socket.on('conversation:call-started', handleConversationCallStarted)
    socket.on('conversation:call-ended', handleConversationCallEnded)

    return () => {
      socket.off('rtk-group-call:invite', handleInvite)
      socket.off('rtk-group-call:ended', handleCallEnded)
      socket.off('conversation:call-started', handleConversationCallStarted)
      socket.off('conversation:call-ended', handleConversationCallEnded)
    }
  }, [wsClient, currentUser, callState.status, leaveCall])

  /**
   * Listen for transcript-ready WebSocket events
   */
  useEffect(() => {
    if (!wsClient) return

    const socket = wsClient.getSocket()
    if (!socket) return

    const handleTranscriptReady = (data: { noteId: string; meetingId: string; meetingTitle: string }) => {
      rtkDebug.log('[RTK] 📝 Transcript ready:', data)

      // Show toast notification
      // Note: All meeting participants receive this notification automatically
      toast.success('Meeting Transcript Ready', {
        description: `${data.meetingTitle} - Transcript has been saved and shared with all participants`,
        duration: 10000 // 10 seconds
      })

      // Log note ID for easy access
      rtkDebug.log('[RTK] 📝 View transcript at:', `/note-apps?noteId=${data.noteId}`)
    }

    rtkDebug.log('[RTK] 🎧 Registering transcript-ready listener')
    socket.on('transcript-ready', handleTranscriptReady)

    return () => {
      socket.off('transcript-ready', handleTranscriptReady)
    }
  }, [wsClient])

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
            setIncomingInvite(null)
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [incomingInvite, currentUser])

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
        if (!startTimeRef.current || globalStartTime < startTimeRef.current) {
          rtkDebug.log('[RTK] ⏱️ 🔄 Syncing timer from activeConversationCalls:', {
            conversationId,
            roomId: callState.roomId,
            backendRoomId: callInfo.roomId,
            previousStartTime: startTimeRef.current,
            globalStartTime
          })
          startTimeRef.current = globalStartTime
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
      startTimeRef.current = null
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
   */
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
    startCall,
    // Wrap joinCall to match interface signature from old useGroupCall
    // IMPORTANT: When joining existing call, Chat.tsx passes:
    //   - roomId = existingCall.roomId (which is actually the backend meetingId from activeCalls)
    //   - initialParticipants = undefined
    //
    // We need to resolve this to get BOTH conversationId AND meetingId AND conversationName
    // because the internal joinCall needs conversationId for WebSocket events
    joinCall: async (roomIdOrMeetingId: string, callType: CallType, _initialParticipants?: CallParticipant[]) => {
      if (_initialParticipants === undefined) {
        // Joining existing call: need to resolve conversationId, meetingId, and conversationName
        let resolvedConversationId: string = roomIdOrMeetingId
        let resolvedMeetingId: string | undefined = undefined
        let resolvedConversationName: string | undefined = undefined

        // Strategy: Check activeConversationCalls to map between IDs
        // activeConversationCalls: Map<conversationId, { roomId: meetingId, ... }>
        activeConversationCalls.forEach((call, convId) => {
          if (call.roomId === roomIdOrMeetingId) {
            // Input is a meeting ID → resolve to conversation ID
            resolvedConversationId = convId
            resolvedMeetingId = roomIdOrMeetingId
            resolvedConversationName = call.conversationName
            rtkDebug.log('[RTK] joinCall wrapper: Resolved meetingId to conversationId', {
              input: roomIdOrMeetingId,
              conversationId: convId,
              meetingId: call.roomId,
              conversationName: call.conversationName
            })
          } else if (convId === roomIdOrMeetingId) {
            // Input is a conversation ID → resolve to meeting ID
            resolvedConversationId = convId
            resolvedMeetingId = call.roomId
            resolvedConversationName = call.conversationName
            rtkDebug.log('[RTK] joinCall wrapper: Resolved conversationId to meetingId', {
              input: roomIdOrMeetingId,
              conversationId: convId,
              meetingId: call.roomId,
              conversationName: call.conversationName
            })
          }
        })

        // Fallback: If not found in activeConversationCalls, assume input is conversationId
        // This handles edge case where call hasn't been registered yet (e.g., late joiner accepting invite)
        // In this case, let the backend API figure out the meetingId by passing undefined
        if (!resolvedMeetingId) {
          rtkDebug.warn(
            '[RTK] joinCall wrapper: Could not resolve meetingId from activeConversationCalls, using input as conversationId',
            {
              input: roomIdOrMeetingId,
              activeConversationCallsSize: activeConversationCalls.size,
              activeConversationCallsKeys: Array.from(activeConversationCalls.keys())
            }
          )
          resolvedConversationId = roomIdOrMeetingId
          // CRITICAL: Don't set resolvedMeetingId = input! That creates duplicate meetings!
          // Pass undefined to let backend find existing meeting by conversationId
          resolvedMeetingId = undefined
        }

        rtkDebug.log('[RTK] joinCall wrapper: Final resolved IDs', {
          input: roomIdOrMeetingId,
          conversationId: resolvedConversationId,
          meetingId: resolvedMeetingId || 'undefined',
          conversationName: resolvedConversationName,
          callType
        })

        await joinCall(resolvedConversationId, callType, resolvedMeetingId, resolvedConversationName)
      } else {
        // This path shouldn't be used for RealtimeKit (use startCall instead)
        rtkDebug.warn('[RTK] joinCall called with initialParticipants - this is not supported. Use startCall instead.')
        throw new Error('joinCall with initialParticipants not supported - use startCall')
      }
    },
    acceptInvite,
    declineInvite,
    leaveCall,
    toggleMute: media.toggleMute,
    toggleVideo: media.toggleVideo,
    toggleScreenShare: screenShare.toggleScreenShare,
    setVideoQuality: media.setVideoQuality,
    toggleMinimize,
    toggleBackground: media.toggleBackground,
    toggleRaiseHand: stableToggleRaiseHand, // Stable callback
    sendReaction: websocket.sendReaction,
    inviteToCall: participantsHook.inviteToCall,
    reconnectParticipant: participantsHook.reconnectParticipant,
    getConnectionDiagnostics: stableGetConnectionDiagnostics, // Stable callback
    transcriptionEnabled: callState.transcriptionEnabled,
    toggleTranscription
  }
}
