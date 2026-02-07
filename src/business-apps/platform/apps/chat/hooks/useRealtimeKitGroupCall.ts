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
import { globalCallManager } from '../services/globalCallManager'

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
  calendarApiClient?: any // CalendarApiClient type
  currentUser: CallParticipant | null
  onCallStarted?: (roomId: string, participants: CallParticipant[]) => void
  onCallEnded?: (roomId: string, duration: number) => void
  onParticipantJoined?: (participant: CallParticipant) => void
  onParticipantLeft?: (participantId: string) => void
  accessToken?: string | null
  translate?: (key: string, params?: Record<string, any>) => string
}

interface CallState extends GroupCallUIState {
  status: 'idle' | 'setup' | 'joining' | 'connected' | 'reconnecting' | 'ended'
  roomId: string | null
  meetingId: string | null
  sessionId: string | null // Database call session ID from backend
  callType: CallType
  callStartTime: number | null
  conversationName?: string
  transcriptionEnabled: boolean
  calendarMeetingId?: string | null // Calendar meeting ID for AI transcription linking
}

export const useRealtimeKitGroupCall = (options: UseRealtimeKitGroupCallOptions): UseGroupCallReturn => {
  const { wsClient, apiClient, currentUser, onCallStarted, onCallEnded, translate } = options

  // Core call state
  const [callState, setCallState] = useState<CallState>({
    isMinimized: false,
    hasBeenMinimized: false,
    status: 'idle',
    roomId: null,
    meetingId: null,
    sessionId: null,
    callType: 'audio',
    callStartTime: null,
    transcriptionEnabled: false,
    calendarMeetingId: null,
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
    handRaisedOrder: {},
    startTime: null,
    duration: 0,
    callImplementation: 'realtime-kit'
  })

  const [incomingInvite, setIncomingInvite] = useState<GroupCallInvite | null>(null)

  const [activeConversationCalls, setActiveConversationCalls] = useState<Map<string, ActiveConversationCall>>(new Map())

  /**
   * CRITICAL: Restore call state from globalCallManager on mount
   * This ensures that when navigating back to chat, the component starts with the correct state
   * BEFORE any callbacks (like toggleMinimize) are created
   */
  useEffect(() => {
    const globalCallData = globalCallManager.getCallData()
    if (globalCallData.callState.status !== 'idle' && globalCallData.callState.callImplementation === 'realtime-kit') {
      console.log('[useRealtimeKitGroupCall] 🔄 Restoring call state from globalCallManager on mount:', {
        status: globalCallData.callState.status,
        isMinimized: globalCallData.callState.isMinimized,
        hasBeenMinimized: globalCallData.callState.hasBeenMinimized,
        roomId: globalCallData.callState.roomId,
        meetingId: globalCallData.callState.meetingId,
        sessionId: globalCallData.callState.sessionId
      })

      setCallState(prev => ({
        ...prev,
        status: globalCallData.callState.status as CallState['status'],
        isMinimized: globalCallData.callState.isMinimized,
        hasBeenMinimized: globalCallData.callState.hasBeenMinimized,
        roomId: globalCallData.callState.roomId,
        meetingId: globalCallData.callState.meetingId ?? prev.meetingId ?? null,
        sessionId: globalCallData.callState.sessionId ?? prev.sessionId ?? null,
        callType: globalCallData.callState.callType || 'audio',
        callStartTime: globalCallData.callState.startTime,
        hostId: globalCallData.callState.hostId || null,
        isMuted: globalCallData.callState.isMuted,
        isVideoEnabled: globalCallData.callState.isVideoEnabled,
        isScreenSharing: globalCallData.callState.isScreenSharing,
        videoQuality: globalCallData.callState.videoQuality,
        backgroundEnabled: globalCallData.callState.backgroundEnabled,
        duration: globalCallData.callState.duration,
        handRaised: globalCallData.callState.handRaised,
        remoteHandsRaised: globalCallData.callState.remoteHandsRaised || {}
      }))
    }
  }, []) // Empty deps - only run on mount

  // Refs for synchronous checks in WebSocket handlers
  const meetingIdRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null) // Track sessionId for leaveCall
  const callStateRoomIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isInCallRef = useRef<boolean>(false)
  const conversationIdRef = useRef<string | null>(null)
  const joinCallConversationIdRef = useRef<string | null>(null)
  const wasIdleRef = useRef<boolean>(true)
  const isLeavingRef = useRef<boolean>(false) // Prevent duplicate leave calls
  const isCancelledRef = useRef<boolean>(false) // Track if call was cancelled during setup
  const abortControllerRef = useRef<AbortController | null>(null) // Abort in-flight call creation
  const calendarMeetingIdRef = useRef<string | null>(null) // Track calendar meeting ID for AI transcription
  const pendingCallParticipantsRef = useRef<CallParticipant[]>([]) // Store participants for confirmStartCall

  // CRITICAL: Refs for hook objects to avoid infinite loops in useEffect dependencies
  // These refs always point to the latest hook instances
  const mediaRef = useRef<typeof media | null>(null)
  const screenShareRef = useRef<typeof screenShare | null>(null)
  const websocketRef = useRef<typeof websocket | null>(null)
  const participantsHookRef = useRef<typeof participantsHook | null>(null)
  const toggleMinimizeRef = useRef<(() => void) | null>(null)
  const leaveCallRef = useRef<(() => Promise<void>) | null>(null)

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
  const callPreferences = useCallPreferences()

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
    initialVideoQuality: callPreferences.videoQuality,
    initialBackgroundEnabled: callPreferences.backgroundEnabled,
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
    onReactionReceived: handleReactionReceived,
    translate
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

  // CRITICAL: Keep ref in sync with callPreferences to avoid leaveCall recreation
  const preferencesRef = useRef(callPreferences)
  preferencesRef.current = callPreferences

  // CRITICAL: Keep refs in sync to avoid leaveCall recreation
  const wsClientRef = useRef(wsClient)
  wsClientRef.current = wsClient
  const onCallEndedRef = useRef(onCallEnded)
  onCallEndedRef.current = onCallEnded
  const currentUserRef = useRef(currentUser)
  currentUserRef.current = currentUser
  // NOTE: leaveCallRef is already declared with other refs above

  // CRITICAL: Keep hook refs in sync to avoid infinite loops in globalCallManager useEffect
  mediaRef.current = media
  screenShareRef.current = screenShare
  websocketRef.current = websocket
  participantsHookRef.current = participantsHook

  // Update wasIdleRef: mark as not idle when call starts
  if (callState.status !== 'idle' && callState.status !== 'ended') {
    wasIdleRef.current = false
  } else if (callState.status === 'idle') {
    wasIdleRef.current = true
  }

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
      handRaised: websocket.handRaised,
      remoteHandsRaised: websocket.remoteHandsRaised || {},
      handRaisedOrder: websocket.handRaisedOrder || {},
      participants: participantsHook.participants,
      hostId: callState.hostId,
      startTime: callState.callStartTime,
      duration: callState.duration,
      callImplementation: 'realtime-kit' as const
    }

    rtkDebug.log('[RTK] 🔄 combinedCallState recomputed:', {
      handRaised: state.handRaised,
      remoteHandsRaisedKeys: Object.keys(state.remoteHandsRaised),
      remoteHandsRaisedValues: state.remoteHandsRaised,
      handRaisedOrderKeys: Object.keys(state.handRaisedOrder)
    })

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
    websocket.handRaised,
    websocket.remoteHandsRaised,
    websocket.handRaisedOrder,
    participantsHook.participants
  ])

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
        callStartTime: startTimeRef.current,
        startTime: startTimeRef.current // CRITICAL: Also update startTime for GlobalCallManager
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
        rtkDebug.error('[RTK] Cannot initiate call: missing currentUser or apiClient')
        return
      }

      rtkDebug.log('[RTK] 📋 Initiating call setup...', {
        conversationId,
        callType,
        participantCount: participants.length,
        conversationName,
        calendarMeetingId,
        conversationType
      })

      // CRITICAL: Reset cancellation flag for new call attempt
      isCancelledRef.current = false

      // Show setup dialog
      setCallState(prev => ({
        ...prev,
        status: 'setup' as const,
        roomId: conversationId,
        callType,
        conversationName,
        conversationType // Store conversation type in state
      }))

      // Store participants and calendar meeting ID for when user confirms
      callStateRoomIdRef.current = conversationId
      conversationIdRef.current = conversationId
      calendarMeetingIdRef.current = calendarMeetingId || null
      pendingCallParticipantsRef.current = participants // CRITICAL: Store participants for confirmStartCall
    },
    [currentUser, apiClient]
  )

  /**
   * Confirm and start call with user preferences
   */
  const confirmStartCall = useCallback(
    async (preferences: { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled: boolean }) => {
      if (!currentUser || !apiClient) {
        rtkDebug.error('[RTK] Cannot start call: missing currentUser or apiClient')
        return
      }

      const conversationId = callStateRoomIdRef.current
      const calendarMeetingId = calendarMeetingIdRef.current
      const callType = callState.callType
      const conversationName = callState.conversationName
      const conversationType = callState.conversationType // Get conversation type from state

      if (!conversationId) {
        rtkDebug.error('[RTK] Cannot start call: missing conversationId')
        return
      }

      // CRITICAL: Get participants from ref (stored during initiateCall)
      const participants = pendingCallParticipantsRef.current

      try {
        rtkDebug.log('[RTK] 🚀 Starting call with preferences...', {
          conversationId,
          callType,
          conversationName,
          calendarMeetingId,
          conversationType,
          preferences,
          currentStatus: callState.status
        })

        // CRITICAL: Check if we were in setup BEFORE changing state
        // This is used to determine if we should send invites
        const wasIdleBeforeStart = callState.status === 'setup'

        rtkDebug.log('[RTK] Checking setup state before starting call:', {
          callStateStatus: callState.status,
          wasIdleBeforeStart
        })

        // Reset cancellation flag at the start of a new call
        isCancelledRef.current = false

        // Create new AbortController for this call
        abortControllerRef.current = new AbortController()

        // CRITICAL: Set status to 'joining' IMMEDIATELY
        // This gives instant UI feedback before any backend calls
        setCallState(prev => ({
          ...prev,
          status: 'joining' as const
        }))

        // Also set refs immediately for cancel to work
        callStateRoomIdRef.current = conversationId
        conversationIdRef.current = conversationId

        // Generate session ID from backend with display name
        rtkDebug.log('[RTK] Requesting meeting creation from backend...', {
          conversationId,
          callType,
          displayName: currentUser?.odName,
          conversationName,
          calendarMeetingId
        })

        // Check if AI transcription should be enabled (from calendar meeting metadata)
        let transcriptionEnabled = false
        if (calendarMeetingId && options.calendarApiClient) {
          try {
            rtkDebug.log('[RTK] Fetching meeting metadata for transcription setting...', { calendarMeetingId })
            const meetingDetails = await options.calendarApiClient.getMeeting(calendarMeetingId)

            // Check if cancelled after async operation
            if (abortControllerRef.current?.signal.aborted) {
              rtkDebug.log('[RTK] ❌ Call cancelled after fetching meeting metadata - aborting')
              return
            }

            if (meetingDetails?.metadata?.aiTranscriptionEnabled === true) {
              transcriptionEnabled = true
              rtkDebug.log('[RTK] 🎙️  AI Transcription ENABLED from calendar meeting settings')
            } else {
              rtkDebug.log('[RTK] AI Transcription not enabled in calendar meeting metadata')
            }
          } catch (error) {
            rtkDebug.warn('[RTK] Error fetching meeting metadata for transcription:', error)
          }
        }

        const sessionResponse = await apiClient.createMeeting(
          conversationId,
          callType,
          currentUser?.odName, // displayName
          undefined, // firstName
          undefined, // lastName
          conversationName, // meetingName
          transcriptionEnabled,
          calendarMeetingId, // Pass calendar meeting ID for linking
          // Pass participants (including host) for 1-on-1 naming ONLY for direct conversations
          conversationType === 'direct' && participants && participants.length > 0
            ? [
                { id: currentUser.id, odName: currentUser.odName }, // Host
                ...participants.map(p => ({ id: p.id, odName: p.odName })) // Other participants
              ]
            : undefined,
          conversationType // Pass conversation type to determine naming strategy
        )

        // CRITICAL: Check if cancelled after backend meeting creation
        if (abortControllerRef.current?.signal.aborted) {
          rtkDebug.log('[RTK] ❌ Call cancelled after backend meeting creation - aborting and cleaning up')
          // Meeting was created but user cancelled - we should clean it up
          // The backend will handle cleanup when no one joins
          return
        }

        const sessionId = sessionResponse.data.sessionId // Database call session ID
        const meetingId = sessionResponse.data.meetingId // Cloudflare meeting ID
        const authToken = sessionResponse.data.hostAuthToken
        const generatedMeetingName = sessionResponse.data.meetingName // Backend-generated meeting name

        rtkDebug.log('[RTK] ✅ Backend meeting created:', {
          conversationId,
          sessionId,
          meetingId,
          hasAuthToken: !!authToken,
          authTokenLength: authToken?.length,
          callType,
          conversationName,
          generatedMeetingName
        })

        // Link Cloudflare meeting to calendar meeting for transcript polling
        if (calendarMeetingId && options.calendarApiClient) {
          try {
            rtkDebug.log('[RTK] 🔗 Linking Cloudflare meeting to calendar meeting...', {
              cloudFlareMeetingId: meetingId,
              calendarMeetingId
            })
            await options.calendarApiClient.linkWebrtcSession(calendarMeetingId, meetingId)
            rtkDebug.log('[RTK] ✅ Successfully linked meeting for transcript polling')
          } catch (error) {
            rtkDebug.error('[RTK] ❌ Failed to link meeting:', error)
          }
        }

        // Initialize meeting with user preferences from setup dialog
        const shouldEnableAudio = preferences.micEnabled
        const shouldEnableVideo = preferences.cameraEnabled
        const shouldEnableBackground = preferences.backgroundEnabled

        // Save background preference (persists for future calls)
        callPreferences.setBackgroundEnabled(preferences.backgroundEnabled)

        rtkDebug.log('[RTK] Initializing meeting with preferences:', {
          hasAuthToken: !!authToken,
          authTokenLength: authToken?.length,
          callType,
          audio: shouldEnableAudio,
          video: shouldEnableVideo,
          background: shouldEnableBackground
        })

        // CRITICAL: Check if cancelled before initializing SDK (this triggers camera/mic access)
        if (abortControllerRef.current?.signal.aborted) {
          rtkDebug.log('[RTK] ❌ Call cancelled before SDK initialization - aborting WITHOUT triggering camera/mic')
          return
        }

        const initializedMeeting = await initMeeting({
          authToken,
          defaults: {
            audio: shouldEnableAudio,
            video: shouldEnableVideo
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

        // CRITICAL: Check if cancelled after SDK initialization (camera/mic already accessed)
        if (abortControllerRef.current?.signal.aborted) {
          rtkDebug.log('[RTK] ❌ Call cancelled after SDK initialization - cleaning up media')
          try {
            await initializedMeeting.leave()
            media.stopAllTracks()
            rtkDebug.log('[RTK] ✅ Cleaned up SDK meeting and media after cancellation')
          } catch (err) {
            rtkDebug.error('[RTK] ⚠️ Error cleaning up after cancellation:', err)
          }
          return
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

        // Resolve and store Cloudflare Session ID from Meeting ID (for transcript fetching)
        // PRIMARY: WebSocket events (chat.gateway.ts) automatically store it
        // BACKUP: This HTTP call only runs if WebSocket didn't set it
        // LAST RESORT: Polling service resolves it when fetching transcript
        if (calendarMeetingId) {
          const resolveWithRetry = async (retries = 3, delayMs = 2000, initialDelayMs = 3000) => {
            // Wait for WebSocket to have a chance to set it first (PRIMARY method)
            rtkDebug.log(`[RTK] ⏳ Waiting ${initialDelayMs}ms for WebSocket to store Session ID (primary method)...`)
            await new Promise(resolve => setTimeout(resolve, initialDelayMs))

            // Check if WebSocket already stored it
            try {
              const checkResponse = await options.calendarApiClient.getMeeting(calendarMeetingId)
              const callSession = checkResponse.meeting?.callSessions?.[0]

              if (callSession?.cloudflareSessionId) {
                rtkDebug.log(
                  '[RTK] ✅ Session ID already stored by WebSocket (primary method):',
                  callSession.cloudflareSessionId
                )
                return true
              }

              rtkDebug.log('[RTK] ℹ️ WebSocket did not store Session ID, trying HTTP API (backup method)...')
            } catch (error) {
              rtkDebug.error('[RTK] Failed to check if Session ID exists:', error)
            }

            // WebSocket didn't set it, use HTTP API as BACKUP
            for (let i = 0; i < retries; i++) {
              try {
                rtkDebug.log(`[RTK] 🔗 [BACKUP] Resolving via HTTP API (attempt ${i + 1}/${retries})...`, {
                  cloudFlareMeetingId: meetingId,
                  calendarMeetingId
                })

                const { sessionId } = await options.calendarApiClient.resolveAndLinkSession(calendarMeetingId)

                if (sessionId) {
                  // ✅ CRITICAL: Store the sessionId in BOTH callState AND ref so it's available when leaving!
                  sessionIdRef.current = sessionId
                  setCallState(prev => ({
                    ...prev,
                    sessionId: sessionId
                  }))
                  rtkDebug.log('[RTK] ✅ [BACKUP] Successfully resolved and stored Session ID via HTTP:', sessionId)
                  return true
                }

                rtkDebug.log(`[RTK] ⚠️ No active session found yet, retrying in ${delayMs}ms...`)
                if (i < retries - 1) {
                  await new Promise(resolve => setTimeout(resolve, delayMs))
                }
              } catch (error) {
                rtkDebug.error(`[RTK] ❌ Failed to resolve Session ID (attempt ${i + 1}):`, error)
                if (i < retries - 1) {
                  await new Promise(resolve => setTimeout(resolve, delayMs))
                }
              }
            }
            rtkDebug.log(
              '[RTK] ⚠️ Could not resolve Session ID after retries (polling service will handle it as last resort)'
            )
            return false
          }

          // Run retry logic without blocking call setup
          resolveWithRetry()
        }

        // DEBUG: Log all properties of initializedMeeting to find session ID
        rtkDebug.log('[RTK] 🔍 DEBUG: initializedMeeting properties:', {
          allKeys: Object.keys(initializedMeeting),
          selfKeys: initializedMeeting.self ? Object.keys(initializedMeeting.self) : [],
          selfSessionId: (initializedMeeting.self as any)?.sessionId,
          selfSessionState: (initializedMeeting.self as any)?.sessionState,
          rawInitializedMeeting: JSON.stringify(
            initializedMeeting,
            (key, value) => {
              // Filter out functions and large objects
              if (typeof value === 'function') return '[Function]'
              if (key === 'mediaStream') return '[MediaStream]'
              if (key === 'videoTrack') return '[VideoTrack]'
              if (key === 'audioTrack') return '[AudioTrack]'
              return value
            },
            2
          ).substring(0, 1000) // First 1000 chars
        })

        // Store conversationId and calendarMeetingId for tracking
        conversationIdRef.current = conversationId
        calendarMeetingIdRef.current = calendarMeetingId || null
        sessionIdRef.current = sessionId // CRITICAL: Store sessionId in ref for leaveCall

        // Update state with backend response data
        // CRITICAL: Do NOT set startTimeRef here for the initiator
        // The backend will send conversation:call-started with the authoritative start time
        // Setting it here causes timer desync between initiator and other participants
        // Start duration timer (will use startTimeRef once synced from backend)
        startDurationTimer()

        rtkDebug.log('[RTK] Updating call state with backend data:', {
          meetingId,
          sessionId,
          calendarMeetingId,
          transcriptionEnabled,
          note: 'callStartTime will be synced from backend via conversation:call-started event'
        })

        // Update state with meeting details from backend
        setCallState(prev => ({
          ...prev,
          meetingId,
          sessionId,
          callStartTime: null, // Will be synced from backend via conversation:call-started
          calendarMeetingId,
          transcriptionEnabled,
          conversationName: generatedMeetingName || prev.conversationName // Use backend-generated name
        }))

        // Save to localStorage for recovery
        callPreferences.saveActiveCall(currentUser.id, conversationId)

        // CRITICAL: Check if call was cancelled before sending invites
        // Don't return early - let it continue to cleanup checkpoint below
        const wasCancelledBeforeInvites = isCancelledRef.current
        if (wasCancelledBeforeInvites) {
          rtkDebug.log('[RTK] ❌ Call was cancelled during setup - will skip invites and clean up')
        }

        // Send invites when starting a new call with participants
        // wasIdleBeforeStart ensures we don't send duplicate invites when rejoining
        // NOTE: We don't call participantsHook.inviteToCall here because
        // the rtk-group-call:start event below already includes all participants
        // and will trigger invites on the backend. Calling inviteToCall here
        // would cause duplicate invites to be sent.
        // However, we DO need to populate pendingInvites for the UI to show invited participants
        if (participants.length > 0) {
          participantsHook.addPendingInvites(participants)
          rtkDebug.log('[RTK] 📨 Added participants to pending invites for UI:', {
            participantsCount: participants.length,
            participants: participants.map(p => ({ id: p.id, name: p.odName }))
          })
        }

        rtkDebug.log('[RTK] 📨 Participants will be invited via rtk-group-call:start event:', {
          participantsCount: participants.length,
          conversationId,
          meetingId,
          callType,
          participants: participants.map(p => ({ id: p.id, name: p.odName }))
        })

        // CRITICAL: Check again if call was cancelled (user might have clicked cancel during SDK initialization)
        if (isCancelledRef.current) {
          rtkDebug.log('[RTK] ❌ Call was cancelled after SDK join - cleaning up and aborting')

          // Clean up the meeting we just created
          if (initializedMeeting) {
            try {
              await initializedMeeting.leave()
              rtkDebug.log('[RTK] ✅ Left meeting after cancellation')
            } catch (err) {
              rtkDebug.error('[RTK] ⚠️ Error leaving meeting after cancellation:', err)
            }
          }

          // Stop media tracks
          try {
            media.stopAllTracks()
            rtkDebug.log('[RTK] ✅ Stopped media tracks after cancellation')
          } catch (err) {
            rtkDebug.error('[RTK] ⚠️ Error stopping media after cancellation:', err)
          }

          // Reset state
          setCallState(prev => ({
            ...prev,
            status: 'idle',
            roomId: null,
            meetingId: null,
            sessionId: null
          }))

          return
        }

        // CRITICAL: Emit start event FIRST so backend creates activeCalls entry
        // This must happen before joined event so backend knows about the call
        if (wsClient?.getSocket()) {
          rtkDebug.log('[RTK] 📤 About to emit rtk-group-call:start:', {
            conversationId,
            sessionId,
            calendarMeetingId,
            hasCalendarMeetingId: !!calendarMeetingId,
            refValue: calendarMeetingIdRef.current
          })

          wsClient.getSocket()?.emit('rtk-group-call:start', {
            conversationId,
            meetingId,
            sessionId,
            callType,
            conversationName: generatedMeetingName || conversationName, // Use backend-generated name
            conversationType, // Include conversation type for proper invite display
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
            sessionId, // Pass database session ID
            isMeeting: !!calendarMeetingId, // True if scheduled meeting, false for ad-hoc call
            participant: {
              id: currentUser.id,
              odId: currentUser.id,
              odName: currentUser.odName,
              avatarUrl: currentUser.avatarUrl,
              isMuted: !shouldEnableAudio,
              isVideoEnabled: shouldEnableVideo
            }
          })
          rtkDebug.log('[RTK] Emitted rtk-group-call:joined event with sessionId and isMeeting:', !!calendarMeetingId)
        }

        onCallStarted?.(conversationId, participants)
      } catch (error) {
        rtkDebug.error('[RTK] Failed to start call:', error)

        // CRITICAL: Stop all media tracks on error to release camera/microphone
        try {
          media.stopAllTracks()
          rtkDebug.log('[RTK] ✅ Media tracks stopped after start call error')
        } catch (cleanupErr) {
          rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks during error cleanup:', cleanupErr)
        }

        setCallState(prev => ({ ...prev, status: 'idle' }))
      }
    },
    [
      currentUser,
      apiClient,
      initMeeting,
      callPreferences,
      participantsHook,
      onCallStarted,
      startDurationTimer,
      wsClient,
      callState.status,
      callState.roomId,
      conversationIdRef,
      media,
      callState.callType,
      callState.conversationName
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

  /**
   * Join an existing call
   */
  const joinCall = useCallback(
    async (
      roomId: string,
      callType: CallType,
      meetingId?: string,
      conversationName?: string,
      initialPreferences?: { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled?: boolean },
      conversationType?: 'direct' | 'group' | 'meeting'
    ) => {
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
          conversationType,
          currentStatus: callState.status,
          preferences: initialPreferences
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
                false // transcriptionEnabled (joining call, not creating from calendar)
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

        // Initialize meeting with initial preferences
        // If preferences provided from invite dialog, use those; otherwise use call type defaults
        const shouldEnableAudio = initialPreferences?.micEnabled ?? true
        const shouldEnableVideo = initialPreferences?.cameraEnabled ?? callType === 'video'
        const shouldEnableBackground = initialPreferences?.backgroundEnabled ?? callPreferences.backgroundEnabled

        // Save background preference if explicitly provided (persists for future calls)
        if (initialPreferences?.backgroundEnabled !== undefined) {
          callPreferences.setBackgroundEnabled(initialPreferences.backgroundEnabled)
        }

        rtkDebug.log('[RTK] Initializing meeting with preferences:', {
          audio: shouldEnableAudio,
          video: shouldEnableVideo,
          background: shouldEnableBackground,
          fromPreferences: !!initialPreferences,
          callType
        })

        const initializedMeeting = await initMeeting({
          authToken,
          defaults: {
            audio: shouldEnableAudio,
            video: shouldEnableVideo
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

        // Look up calendarMeetingId from activeConversationCalls (set by first user who started the call)
        // CRITICAL: Check calendarMeetingIdRef FIRST (set by acceptInvite before joinCall)
        // This fixes timing issue where activeConversationCalls state hasn't updated yet
        rtkDebug.log('[RTK] 🔍 Checking sources for calendarMeetingId:', {
          roomId,
          refValue: calendarMeetingIdRef.current,
          hasActiveCallEntry: activeConversationCalls.has(roomId),
          activeCallsSize: activeConversationCalls.size,
          activeCallsKeys: Array.from(activeConversationCalls.keys())
        })

        const calendarMeetingIdForJoin = calendarMeetingIdRef.current || null

        rtkDebug.log('[RTK] Joining with calendarMeetingId:', {
          roomId,
          fromRef: calendarMeetingIdRef.current,
          finalCalendarMeetingId: calendarMeetingIdForJoin,
          isCalendarMeeting: !!calendarMeetingIdForJoin
        })

        // Start duration timer (only set startTime if not already synced from global)
        joinCallConversationIdRef.current = roomId

        // CRITICAL: Try to get start time from activeConversationCalls FIRST (if available)
        // This ensures we use the backend's start time instead of current time for ongoing calls
        let callStartTime: number | null = null
        for (const [conversationId, callInfo] of activeConversationCalls.entries()) {
          if ((conversationId === roomId || callInfo.roomId === roomId) && callInfo.startedAt) {
            callStartTime = new Date(callInfo.startedAt).getTime()
            rtkDebug.log('[RTK] ⏱️ Found existing call start time in activeConversationCalls:', {
              conversationId,
              roomId,
              backendRoomId: callInfo.roomId,
              startedAt: callInfo.startedAt,
              callStartTime
            })
            break
          }
        }

        // If no existing call found, use current time (new call)
        if (!callStartTime) {
          callStartTime = Date.now()
          rtkDebug.log('[RTK] ⏱️ No existing call found, using current time as start time')
        }

        if (!startTimeRef.current) {
          startTimeRef.current = callStartTime
          rtkDebug.log('[RTK] ⏱️ Set start time:', {
            startTime: callStartTime,
            source: callStartTime === Date.now() ? 'local-new-call' : 'backend-existing-call'
          })
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
          conversationName,
          conversationType, // Include conversation type for proper header display
          callStartTime: startTimeRef.current, // Use the ref, not Date.now()!
          startTime: startTimeRef.current, // CRITICAL: Also update startTime for GlobalCallManager
          calendarMeetingId: calendarMeetingIdForJoin
        }))

        // Save to localStorage
        callPreferences.saveActiveCall(currentUser.id, roomId)

        // Mark active call in localStorage for cross-tab detection
        setActiveCallInStorage(currentUser.id, roomId)

        // Emit WebSocket join event to notify backend we joined
        if (wsClient?.getSocket()) {
          wsClient.getSocket()?.emit('rtk-group-call:joined', {
            conversationId: roomId,
            meetingId: finalMeetingId,
            sessionId: callState.sessionId, // Pass sessionId from state
            isMeeting: !!callState.calendarMeetingId, // True if scheduled meeting, false for ad-hoc call
            participant: {
              id: currentUser.id,
              odId: currentUser.id,
              odName: currentUser.odName,
              avatarUrl: currentUser.avatarUrl,
              isMuted: !shouldEnableAudio,
              isVideoEnabled: shouldEnableVideo
            }
          })
          rtkDebug.log(
            '[RTK] Emitted rtk-group-call:joined event (joining existing call) with sessionId and isMeeting:',
            !!callState.calendarMeetingId
          )
        }
      } catch (error) {
        rtkDebug.error('[RTK] Failed to join call:', error)

        // CRITICAL: Stop all media tracks on error to release camera/microphone
        try {
          media.stopAllTracks()
          rtkDebug.log('[RTK] ✅ Media tracks stopped after join call error')
        } catch (cleanupErr) {
          rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks during error cleanup:', cleanupErr)
        }

        setCallState(prev => ({ ...prev, status: 'idle' }))
      }
    },
    [currentUser, apiClient, initMeeting, callPreferences, wsClient, startDurationTimer, conversationIdRef, media]
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
      calendarMeetingIdRef.current = null

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
      await joinCall(
        invite.conversationId || invite.roomId, // conversationId
        invite.callType,
        invite.roomId, // meetingId (stored in roomId field of invite)
        invite.conversationName, // conversationName
        initialPreferences, // initial mic/camera/background settings
        invite.conversationType // conversation type for proper header display
      )
      setIncomingInvite(null)
    },
    [joinCall]
  )

  /**
   * Cancel pre-call setup
   */
  const cancelSetup = useCallback(() => {
    rtkDebug.log('[RTK] 🚫 Canceling call setup')

    // CRITICAL: Mark as cancelled BEFORE resetting state
    // This prevents race conditions with confirmStartCall
    isCancelledRef.current = true

    // Reset state to idle
    setCallState(prev => ({
      ...prev,
      status: 'idle',
      roomId: null,
      callType: 'audio',
      conversationName: undefined
    }))

    // Clear refs
    callStateRoomIdRef.current = null
    conversationIdRef.current = null
    calendarMeetingIdRef.current = null
    pendingCallParticipantsRef.current = [] // Clear pending participants

    // CRITICAL: Reset cancellation flag after a short delay
    // This allows the current call attempt to be properly cancelled
    // but ensures the next call attempt starts fresh
    setTimeout(() => {
      isCancelledRef.current = false
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
    startTimeRef.current = null
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

  /**
   * Leave the current call
   */
  const leaveCall = useCallback(async () => {
    console.log('[useRealtimeKitGroupCall] 🚪 leaveCall START:', {
      isLeaving: isLeavingRef.current,
      roomId: callStateRoomIdRef.current,
      meetingId: meetingIdRef.current,
      sessionId: sessionIdRef.current,
      status: callState.status,
      isMinimized: callState.isMinimized
    })

    // Use refs instead of callState to avoid dependency on callState object
    const roomId = callStateRoomIdRef.current
    const meetingId = meetingIdRef.current
    const callStartTime = callStartTimeRef.current
    const currentStatus = callState.status

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
        hasMeeting: !!stableMeeting,
        status: currentStatus,
        wasCancelled: isCancelledRef.current
      })

      // CRITICAL: Detect if this is a cancellation during setup
      // This happens when user clicks cancel before the call is fully established
      // Check: no stable meeting connection AND not already marked as cancelled
      const isEarlyCancellation = !stableMeeting && !isCancelledRef.current

      if (isEarlyCancellation) {
        // CRITICAL: Abort any in-flight async operations (API calls, SDK initialization)
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
          rtkDebug.log('[RTK] 🚫 Aborted in-flight call creation')
        }

        // Set cancellation flag to prevent invites from being sent
        isCancelledRef.current = true

        rtkDebug.log('[RTK] 🚫 Detected early cancellation during setup', {
          roomId,
          meetingId: meetingId || 'not-yet-created',
          hasMeeting: !!stableMeeting,
          status: currentStatus
        })

        // Emit cancellation event ONLY if we have a meetingId
        // If meetingId doesn't exist yet, the backend meeting wasn't created,
        // so no invites were sent and we don't need to notify anyone
        if (meetingId) {
          const user = currentUserRef.current
          const socket = wsClientRef.current?.getSocket()
          if (user && socket) {
            socket.emit('rtk-group-call:cancelled', {
              conversationId: roomId,
              meetingId: meetingId,
              hostId: user.id
            })
            rtkDebug.log('[RTK] 📤 Emitted rtk-group-call:cancelled event', {
              conversationId: roomId,
              meetingId: meetingId
            })
          }
        } else {
          rtkDebug.log('[RTK] ⏭️ Skipping cancellation event - meeting not created yet, no invites sent')
        }
      }

      // CRITICAL: Stop all media tracks FIRST (camera and microphone) to release resources
      // This is especially important during 'joining' phase when stableMeeting doesn't exist yet
      // This MUST happen early to prevent browser showing "in use" indicator
      try {
        media.stopAllTracks()
        rtkDebug.log('[RTK] ✅ All media tracks stopped', {
          phase: currentStatus,
          hadMeeting: !!stableMeeting
        })
      } catch (err) {
        rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks during cleanup:', err)
      }

      // Stop duration timer
      stopDurationTimer()
      startTimeRef.current = null
      conversationIdRef.current = null
      callStateRoomIdRef.current = null
      meetingIdRef.current = null // CRITICAL: Clear meeting ID ref to allow re-invites
      sessionIdRef.current = null // Clear sessionId ref
      wasIdleRef.current = true // Mark as idle for next call
      abortControllerRef.current = null // Clear abort controller
      pendingCallParticipantsRef.current = [] // CRITICAL: Clear pending participants for next call
      calendarMeetingIdRef.current = null // Clear calendar meeting ID

      // CRITICAL: Clear any stale incoming invite
      // This ensures a fresh invite dialog can appear if user is re-invited
      setIncomingInvite(null)

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
      const sessionId = sessionIdRef.current // ✅ Use ref instead of callState to avoid stale closure
      const isMeeting = !!calendarMeetingIdRef.current // ✅ Use ref instead of callState to avoid stale closure

      console.log('[useRealtimeKitGroupCall] 📤 Emitting rtk-group-call:left:', {
        hasUser: !!user,
        hasSocket: !!socket,
        roomId,
        meetingId,
        sessionId,
        isMeeting,
        participantId: user?.id
      })

      if (user && socket) {
        socket.emit('rtk-group-call:left', {
          conversationId: roomId,
          meetingId: meetingId,
          sessionId: sessionId, // Pass sessionId
          isMeeting: isMeeting, // True if scheduled meeting, false for ad-hoc call
          participantId: user.id
        })
        rtkDebug.log('[RTK] 📤 Emitted rtk-group-call:left event with sessionId and isMeeting', {
          conversationId: roomId,
          meetingId: meetingId,
          sessionId: sessionId,
          isMeeting: isMeeting,
          participantId: user.id
        })
      } else {
        console.warn('[useRealtimeKitGroupCall] ⚠️ Cannot emit leave event - missing user or socket')
      }

      console.log('[useRealtimeKitGroupCall] 🧹 Clearing globalCallManager')
      // Reset state
      setCallState(prev => ({
        ...prev,
        isMinimized: false,
        status: 'ended',
        roomId: null,
        meetingId: null,
        sessionId: null,
        callType: 'audio',
        callStartTime: null,
        participants: [],
        hostId: null
      }))

      // CRITICAL: Clear globalCallManager to remove persistent call UI
      globalCallManager.clearCall()
      rtkDebug.log('[RTK] 🧹 Cleared globalCallManager on leave')
      console.log('[useRealtimeKitGroupCall] ✅ globalCallManager cleared')

      // CRITICAL: Clear the activeConversationCalls entry for this conversation
      // This prevents stale data when restarting a call after everyone has left
      if (roomId) {
        console.log('[useRealtimeKitGroupCall] 🧹 Clearing activeConversationCalls for:', roomId)
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
        isCancelledRef.current = false // Reset cancellation flag for next call
      }, 100)
    } catch (error) {
      console.error('[useRealtimeKitGroupCall] ❌ Error leaving call:', error)
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

  // Store leaveCall in ref for WebSocket effect
  leaveCallRef.current = leaveCall

  /**
   * Toggle minimized state
   */
  const toggleMinimize = useCallback(() => {
    setCallState(prev => {
      const nextIsMinimized = !prev.isMinimized

      console.log('[useRealtimeKitGroupCall] 🔄 toggleMinimize called:', {
        currentIsMinimized: prev.isMinimized,
        currentHasBeenMinimized: prev.hasBeenMinimized,
        newIsMinimized: nextIsMinimized,
        status: prev.status
      })

      // CRITICAL: persist minimize state to the global source-of-truth
      // so navigation/remount cannot "restore" the old minimized value.
      globalCallManager.updateCallState({ isMinimized: nextIsMinimized, hasBeenMinimized: true })

      return {
        ...prev,
        isMinimized: nextIsMinimized,
        hasBeenMinimized: true // Set flag when minimizing
      }
    })
  }, [])

  // CRITICAL: Update ref so globalCallManager callbacks always have latest version
  toggleMinimizeRef.current = toggleMinimize

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
        callImplementation: 'realtime-kit',
        hostId: callState.hostId,
        isMuted: callState.isMuted,
        isVideoEnabled: callState.isVideoEnabled,
        isScreenSharing: screenShare.isScreenSharing,
        duration: callState.duration,
        videoQuality: callState.videoQuality,
        backgroundEnabled: callState.backgroundEnabled,
        startTime: callState.startTime,
        participants: participantsHook.participants,
        handRaised: callState.handRaised,
        remoteHandsRaised: callState.remoteHandsRaised
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
        mediaRef.current?.toggleMute()
      },
      toggleVideo: () => {
        mediaRef.current?.toggleVideo()
      },
      toggleScreenShare: () => {
        screenShareRef.current?.toggleScreenShare()
      },
      toggleMinimize: () => {
        if (toggleMinimizeRef.current) {
          toggleMinimizeRef.current()
        }
      },
      toggleBackground: () => {
        mediaRef.current?.toggleBackground()
      },
      toggleRaiseHand: () => {
        websocketRef.current?.toggleRaiseHand(callState.handRaised)
      },
      sendReaction: (reaction: string) => {
        websocketRef.current?.sendReaction(reaction)
      },
      setVideoQuality: quality => {
        mediaRef.current?.setVideoQuality(quality)
      },
      switchAudioDevice: async (deviceId: string) => {
        // TODO: Implement device switching in useRealtimeKitMedia hook
        console.warn('switchAudioDevice not yet implemented for RealtimeKit', deviceId)
      },
      switchVideoDevice: async (deviceId: string) => {
        // TODO: Implement device switching in useRealtimeKitMedia hook
        console.warn('switchVideoDevice not yet implemented for RealtimeKit', deviceId)
      },
      onInviteParticipant: (participant: any) => {
        // inviteToCall expects an array, so wrap the single participant
        participantsHookRef.current?.inviteToCall([participant])
      },

      // Store context
      apiClient: apiClient || null,
      wsClient: wsClient,
      accessToken: options.accessToken || null,
      currentUserId: currentUser?.id || null,
      conversationName: callState.conversationName || null,
      pendingInvites: participantsHook.pendingInvites, // Keep as Map
      availableParticipants: [], // Will be passed from Chat component
      activeExperts: [] // Will be passed from Chat component
    })
  }, [
    callState.status,
    callState.roomId,
    callState.callType,
    callState.hostId,
    callState.isMuted,
    callState.isVideoEnabled,
    callState.duration,
    callState.videoQuality,
    callState.backgroundEnabled,
    callState.startTime,
    callState.conversationName,
    callState.handRaised,
    callState.remoteHandsRaised,
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
    options.accessToken
    // NOTE: leaveCall, media, screenShare, websocket, participantsHook, toggleMinimize removed
    // to prevent infinite loops - they are accessed via refs instead
  ])

  /**
   * Listen to WebSocket incoming call invites and lifecycle events
   */
  useEffect(() => {
    const socket = wsClient?.getSocket()
    if (!socket || !currentUser) return

    const handleInvite = (data: any) => {
      rtkDebug.log('[RTK] 📨 Received call invite:', {
        meetingId: data.meetingId,
        conversationId: data.conversationId,
        from: data.from,
        currentStatus: callState.status,
        meetingIdRef: meetingIdRef.current,
        callStateRoomIdRef: callStateRoomIdRef.current,
        wasIdleRef: wasIdleRef.current
      })

      // ⚠️ CRITICAL: Ignore invite if already in this call (prevents double-join)
      // Check meetingIdRef (synchronous) instead of callState (async)
      // BUT: Allow invite if call state is idle (even if refs have stale values)
      const isInActiveCall = callState.status !== 'idle' && meetingIdRef.current === data.meetingId
      if (isInActiveCall) {
        rtkDebug.log('[RTK] ❌ Ignoring invite - already in this call', {
          currentMeetingId: meetingIdRef.current,
          inviteMeetingId: data.meetingId,
          callStatus: callState.status
        })
        return
      }

      // Also ignore if we're in ANY active call
      const isInAnyActiveCall = callState.status !== 'idle' && callStateRoomIdRef.current
      if (isInAnyActiveCall) {
        rtkDebug.log('[RTK] ❌ Ignoring invite - already in another call', {
          currentRoomId: callStateRoomIdRef.current,
          callStatus: callState.status
        })
        return
      }

      // Ignore if this is our own invite
      const isFromSelf = data.from?.id === currentUser?.id || data.from?.odId === currentUser?.odId
      if (isFromSelf) {
        rtkDebug.log('[RTK] ❌ Ignoring invite - from self', {
          fromId: data.from?.id,
          fromOdId: data.from?.odId,
          currentUserId: currentUser?.id,
          currentUserOdId: currentUser?.odId
        })
        return
      }

      // Ignore if user is in a call in another tab
      if (currentUser && isInCallInAnotherTab(currentUser.id)) {
        rtkDebug.log('[RTK] ❌ Ignoring invite - user is in call in another tab')
        return
      }

      // Check wasIdleRef to ensure we're truly idle (prevents race conditions)
      if (!wasIdleRef.current && callState.status !== 'idle') {
        rtkDebug.log('[RTK] ❌ Ignoring invite - not in idle state', {
          wasIdleRef: wasIdleRef.current,
          callStatus: callState.status
        })
        return
      }

      rtkDebug.log('[RTK] ✅ Accepting invite - call is idle', {
        meetingId: data.meetingId,
        conversationId: data.conversationId,
        callStatus: callState.status,
        wasIdleRef: wasIdleRef.current
      })

      // Since linkedConversationId is no longer sent by backend, we can just update the invite
      setIncomingInvite(prev => {
        rtkDebug.log('[RTK] 📥 Setting incoming invite:', {
          hasPrevious: !!prev,
          conversationId: data.conversationId,
          meetingId: data.meetingId
        })

        const newInvite = {
          roomId: data.meetingId,
          callType: data.callType,
          from: data.from,
          conversationId: data.conversationId,
          conversationName: data.conversationName || data.conversationId,
          conversationType: data.conversationType as 'direct' | 'group' | 'meeting' | undefined
        }

        rtkDebug.log('[RTK] ✅ Setting incoming invite:', newInvite)

        return newInvite
      })
    }

    const handleCallEnded = (data: { meetingId: string; conversationId: string }) => {
      rtkDebug.log('[RTK] Call ended by host', data)
      rtkDebug.log('[RTK] Current incomingInvite state:', {
        hasInvite: !!incomingInvite,
        inviteRoomId: incomingInvite?.roomId,
        inviteConversationId: incomingInvite?.conversationId,
        eventMeetingId: data.meetingId,
        eventConversationId: data.conversationId
      })

      // If we're in this call, leave it
      if (callStateRoomIdRef.current === data.meetingId) {
        leaveCallRef.current?.()
      }

      // If we have an incoming invite for this call, dismiss it (call ended before we could answer)
      if (
        incomingInvite &&
        (incomingInvite.roomId === data.meetingId || incomingInvite.conversationId === data.conversationId)
      ) {
        rtkDebug.log('[RTK] 📵 Dismissing incoming invite - call ended')

        // CRITICAL: Stop all media tracks when dismissing invite
        // User might have opened pre-call dialog which requested camera/mic permissions
        try {
          media.stopAllTracks()
          rtkDebug.log('[RTK] ✅ Media tracks stopped when dismissing expired invite')
        } catch (err) {
          rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks when dismissing invite:', err)
        }

        // CRITICAL: Clear start time so we can sync to fresh time on next invite
        startTimeRef.current = null
        rtkDebug.log('[RTK] ⏱️ Cleared start time when dismissing invite (call ended)')

        setIncomingInvite(null)
      } else if (incomingInvite) {
        rtkDebug.log("[RTK] ⚠️ Have incoming invite but IDs don't match - NOT dismissing")
      } else {
        rtkDebug.log('[RTK] ℹ️ No incoming invite to dismiss')
      }
    }

    const handleCallCancelled = (data: { meetingId: string; conversationId: string; hostId: string }) => {
      rtkDebug.log('[RTK] Call cancelled by host', data)

      // If we have an incoming invite for this call, dismiss it (call was cancelled before we could answer)
      if (
        incomingInvite &&
        (incomingInvite.roomId === data.meetingId || incomingInvite.conversationId === data.conversationId)
      ) {
        rtkDebug.log('[RTK] 📵 Dismissing incoming invite - call cancelled by host')

        // CRITICAL: Stop all media tracks when dismissing invite
        try {
          media.stopAllTracks()
          rtkDebug.log('[RTK] ✅ Media tracks stopped when dismissing cancelled invite')
        } catch (err) {
          rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks when dismissing invite:', err)
        }

        // Clear start time
        startTimeRef.current = null
        rtkDebug.log('[RTK] ⏱️ Cleared start time when dismissing invite (call cancelled)')

        setIncomingInvite(null)
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
      // CRITICAL: Also check conversationIdRef which is set synchronously before state updates
      if (
        data.startedAt &&
        (data.roomId === callStateRoomIdRef.current ||
          data.roomId === meetingIdRef.current ||
          data.conversationId === callStateRoomIdRef.current ||
          data.conversationId === conversationIdRef.current || // Sync check - catches early events
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

        // CRITICAL: Sync to backend's start time, but ONLY if:
        // 1. We don't have a start time yet (first sync)
        // 2. Backend's time is EARLIER (we're a late joiner catching up)
        // NEVER accept a later time - that would reset the timer forward!
        const shouldUpdate =
          !startTimeRef.current || // No local start time yet
          globalStartTime < startTimeRef.current // Backend time is earlier (late joiner)

        if (shouldUpdate) {
          const previousTime = startTimeRef.current
          startTimeRef.current = globalStartTime

          // Also update state so UI reflects the synced time
          setCallState(prev => ({
            ...prev,
            callStartTime: globalStartTime,
            startTime: globalStartTime // CRITICAL: Also update startTime for GlobalCallManager
          }))

          rtkDebug.log('[RTK] ⏱️ Synced to backend start time:', {
            previousStartTime: previousTime,
            newStartTime: globalStartTime,
            diff: previousTime ? (previousTime - globalStartTime) / 1000 : 0,
            reason: !previousTime ? 'first-sync' : 'catching-up-to-earlier-time'
          })
        } else {
          rtkDebug.log('[RTK] ⏱️ Keeping current start time (backend time is same or later):', {
            currentStartTime: startTimeRef.current,
            backendStartTime: globalStartTime,
            diff: startTimeRef.current ? (startTimeRef.current - globalStartTime) / 1000 : 0,
            reason: 'already-have-earlier-or-equal-time'
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

    const handleDeclined = (data: { conversationId: string; meetingId: string; participantId: string }) => {
      rtkDebug.log('[RTK] 📵 Participant declined invite:', data)

      // Update pending invite status to 'declined'
      participantsHook.handleDeclinedInvite(data.participantId, 'declined')
    }

    const handleNotAnswered = (data: {
      conversationId: string
      meetingId: string
      participantId: string
      participantName: string
    }) => {
      rtkDebug.log('[RTK] ⏱️ Participant did not answer invite:', data)

      // Update pending invite status to 'not-answered'
      participantsHook.handleDeclinedInvite(data.participantId, 'not-answered')

      // If this is the current user's invite, dismiss it
      if (currentUser && data.participantId === currentUser.id) {
        rtkDebug.log('[RTK] ⏱️ Current user did not answer - dismissing invite')

        // CRITICAL: Stop all media tracks when dismissing timed-out invite
        // User might have opened pre-call dialog which requested camera/mic permissions
        try {
          media.stopAllTracks()
          rtkDebug.log('[RTK] ✅ Media tracks stopped when dismissing timed-out invite')
        } catch (err) {
          rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks when dismissing timed-out invite:', err)
        }

        // CRITICAL: Clear start time so we can sync to fresh time on next invite
        startTimeRef.current = null
        rtkDebug.log('[RTK] ⏱️ Cleared start time when dismissing invite (timeout)')

        setIncomingInvite(null)
      }
    }

    rtkDebug.log('[RTK] 🎧 Registering WebSocket listeners')

    socket.on('rtk-group-call:invite', handleInvite)
    socket.on('rtk-group-call:ended', handleCallEnded)
    socket.on('rtk-group-call:cancelled', handleCallCancelled)
    socket.on('rtk-group-call:declined', handleDeclined)
    socket.on('rtk-group-call:not-answered', handleNotAnswered)
    socket.on('conversation:call-started', handleConversationCallStarted)
    socket.on('conversation:call-ended', handleConversationCallEnded)

    return () => {
      socket.off('rtk-group-call:invite', handleInvite)
      socket.off('rtk-group-call:ended', handleCallEnded)
      socket.off('rtk-group-call:cancelled', handleCallCancelled)
      socket.off('rtk-group-call:declined', handleDeclined)
      socket.off('rtk-group-call:not-answered', handleNotAnswered)
      socket.off('conversation:call-started', handleConversationCallStarted)
      socket.off('conversation:call-ended', handleConversationCallEnded)
    }
  }, [wsClient, currentUser, callState.status, incomingInvite, media])

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
        duration: 1000000 // 10 seconds
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

            // CRITICAL: Stop all media tracks when dismissing invite due to other tab join
            // User might have opened pre-call dialog which requested camera/mic permissions
            try {
              media.stopAllTracks()
              rtkDebug.log('[RTK] ✅ Media tracks stopped when dismissing invite (other tab joined)')
            } catch (err) {
              rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks when dismissing invite:', err)
            }

            // CRITICAL: Clear start time so we can sync to fresh time on next invite
            startTimeRef.current = null
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
    // Wrap joinCall to match interface signature from old useGroupCall
    // IMPORTANT: When joining existing call, Chat.tsx passes:
    //   - roomId = existingCall.roomId (which is actually the backend meetingId from activeCalls)
    //   - initialParticipants = undefined OR preferences object
    //
    // We need to resolve this to get BOTH conversationId AND meetingId AND conversationName
    // because the internal joinCall needs conversationId for WebSocket events
    joinCall: async (
      roomIdOrMeetingId: string,
      callType: CallType,
      initialParticipantsOrPreferences?:
        | CallParticipant[]
        | { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled?: boolean }
    ) => {
      // Check if third parameter is preferences object or participants array
      const isPreferencesObject =
        initialParticipantsOrPreferences &&
        !Array.isArray(initialParticipantsOrPreferences) &&
        'micEnabled' in initialParticipantsOrPreferences

      const preferences = isPreferencesObject
        ? (initialParticipantsOrPreferences as {
            micEnabled: boolean
            cameraEnabled: boolean
            backgroundEnabled?: boolean
          })
        : undefined
      const _initialParticipants = !isPreferencesObject
        ? (initialParticipantsOrPreferences as CallParticipant[] | undefined)
        : undefined

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
          callType,
          preferences
        })

        await joinCall(
          resolvedConversationId,
          callType,
          resolvedMeetingId,
          resolvedConversationName,
          preferences // Pass preferences to internal joinCall
        )
      } else {
        // This path shouldn't be used for RealtimeKit (use startCall instead)
        rtkDebug.warn('[RTK] joinCall called with initialParticipants - this is not supported. Use startCall instead.')
        throw new Error('joinCall with initialParticipants not supported - use startCall')
      }
    },
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
    toggleTranscription
  }
}
