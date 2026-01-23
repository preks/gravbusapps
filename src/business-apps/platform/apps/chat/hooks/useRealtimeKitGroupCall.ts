/**
 * useRealtimeKitGroupCall Hook - Manages group calls using Cloudflare Realtime Kit
 *
 * This hook provides the same interface as useGroupCall but uses Cloudflare's SFU
 * infrastructure instead of mesh topology, enabling better scalability for group calls.
 *
 * Simulcast Implementation:
 * - Publisher sends 3 quality streams simultaneously (high/medium/low) via simulcast
 * - SFU automatically forwards appropriate quality to each receiver based on network conditions
 * - Simulcast is configured when initializing meetings with SIMULCAST_ENCODINGS
 * - Subscriber-side preferredRid configuration is not directly accessible via React SDK
 *   (SFU handles quality selection automatically based on bandwidth)
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { RealtimeKitApiClient } from '../services/realtimeKitApiClient'
import type { CallParticipant, CallType } from '../services/webrtcClient'
import type {
  GroupCallUIState,
  GroupCallInvite,
  ActiveConversationCall,
  PendingInvite,
  UseGroupCallReturn
} from './useGroupCall'
import type { GroupCallParticipant, VideoQuality } from '../services/groupWebrtcClient'
import { RTKVirtualBackground } from '../services/rtkVirtualBackground'
import { rtkDebug } from '../utils/rtkDebug'

// Quality to RID mapping for simulcast
// RIDs should be ordered alphabetically where 'a' = highest quality
const QUALITY_TO_RID: Record<VideoQuality, string> = {
  high: 'a', // Highest quality (1280x720 @ 30fps)
  medium: 'b', // Medium quality (640x480 @ 24fps)
  low: 'c' // Lowest quality (320x240 @ 15fps)
}

// Simulcast encoding configurations
// These define the 3 quality layers that will be sent simultaneously
const SIMULCAST_ENCODINGS: RTCRtpEncodingParameters[] = [
  { rid: 'a', scaleResolutionDownBy: 1, maxBitrate: 2500000 }, // High: 1280x720 @ 30fps
  { rid: 'b', scaleResolutionDownBy: 2, maxBitrate: 1000000 }, // Medium: 640x360 @ 24fps
  { rid: 'c', scaleResolutionDownBy: 4, maxBitrate: 500000 } // Low: 320x180 @ 15fps
]

export interface UseRealtimeKitGroupCallOptions {
  wsClient: ChatWebSocketClient | null
  apiClient?: RealtimeKitApiClient | null
  currentUser: CallParticipant | null
  onCallStarted?: (roomId: string, participants: CallParticipant[]) => void
  onCallEnded?: (roomId: string, duration: number) => void
  onParticipantJoined?: (participant: CallParticipant) => void
  onParticipantLeft?: (participantId: string) => void
}

// LocalStorage keys (same as useGroupCall for consistency)
const ACTIVE_CALL_KEY = 'chat_active_call'
const PREF_VIDEO_QUALITY_KEY = 'chat_call_video_quality'
const PREF_BACKGROUND_ENABLED_KEY = 'chat_call_background_enabled'

// Helper functions
const getSavedVideoQuality = (): VideoQuality => {
  try {
    const saved = localStorage.getItem(PREF_VIDEO_QUALITY_KEY)
    if (saved && ['high', 'medium', 'low'].includes(saved)) {
      return saved as VideoQuality
    }
  } catch {
    // Ignore
  }
  return 'low'
}

const getSavedBackgroundEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem(PREF_BACKGROUND_ENABLED_KEY)
    // Default to true if never set (first time), otherwise respect user preference
    return saved === null ? true : saved === 'true'
  } catch {
    return true // Default to enabled
  }
}

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
    // Ignore
  }
}

const clearActiveCallFromStorage = () => {
  try {
    localStorage.removeItem(ACTIVE_CALL_KEY)
  } catch {
    // Ignore
  }
}

const initialCallState: GroupCallUIState = {
  roomId: null,
  callType: 'video',
  status: 'idle',
  participants: [],
  hostId: null,
  callImplementation: 'realtime-kit',
  isMuted: false,
  isVideoEnabled: true,
  isScreenSharing: false,
  isMinimized: false,
  videoQuality: getSavedVideoQuality(),
  backgroundEnabled: getSavedBackgroundEnabled(), // Default true on first use, respect preference after
  handRaised: false,
  remoteHandsRaised: {}, // Map of participantId -> handRaised for remote participants
  startTime: null,
  duration: 0
}

export const useRealtimeKitGroupCall = ({
  wsClient,
  apiClient,
  currentUser,
  onCallStarted,
  onCallEnded
}: UseRealtimeKitGroupCallOptions): UseGroupCallReturn & { meeting: any } => {
  // Cloudflare SDK
  const [meeting, initMeeting] = useRealtimeKitClient()

  // State
  const [callState, setCallState] = useState<GroupCallUIState>(initialCallState)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [participants, setParticipants] = useState<GroupCallParticipant[]>([])
  const [pendingInvites] = useState<Map<string, PendingInvite>>(new Map())
  const [incomingInvite, setIncomingInvite] = useState<GroupCallInvite | null>(null)
  const [activeConversationCalls, setActiveConversationCalls] = useState<Map<string, ActiveConversationCall>>(new Map())
  const [currentCallConversationName, setCurrentCallConversationName] = useState<string | undefined>(undefined) // Store conversation name for the current call

  // Refs
  const authTokenRef = useRef<string | null>(null)
  const meetingIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const callStateRoomIdRef = useRef<string | null>(null)
  const isInCallRef = useRef<boolean>(false)
  const joinCallConversationIdRef = useRef<string | null>(null)
  const conversationIdRef = useRef<string | null>(null) // Store actual conversationId (not meetingId)
  const virtualBackgroundRef = useRef<RTKVirtualBackground | null>(null) // Virtual background service
  const wasIdleRef = useRef<boolean>(true) // Track if we were idle before starting a call (for invite logic)

  // Helper to emit WebSocket events
  const emitSocketEvent = useCallback(
    (event: string, data: any) => {
      const socket = wsClient?.getSocket()
      if (socket) {
        socket.emit(event, data)
      }
    },
    [wsClient]
  )

  // Computed
  const isInCall = callState.status === 'connected' || callState.status === 'reconnecting'
  const isHost = currentUser ? callState.hostId === currentUser.id : false

  // Keep refs in sync with state
  callStateRoomIdRef.current = callState.roomId
  isInCallRef.current = isInCall
  // Track idle state synchronously (React state updates are async)
  if (callState.status === 'idle') {
    wasIdleRef.current = true
  } else if (
    callState.status === 'connected' ||
    callState.status === 'joining' ||
    callState.status === 'reconnecting'
  ) {
    wasIdleRef.current = false
  }

  /**
   * Start a new group call (host)
   */
  const startCall = useCallback(
    async (
      roomId: string,
      callType: CallType,
      participantsToInvite: CallParticipant[],
      conversationName?: string
    ): Promise<void> => {
      if (!currentUser || !apiClient || !wsClient) {
        rtkDebug.error('[RTK] Cannot start call: missing requirements')
        return
      }

      try {
        rtkDebug.log('[RTK] Starting Realtime Kit group call with SDK...')
        rtkDebug.log('[RTK] Current user (HOST):', {
          id: currentUser.id,
          odId: currentUser.odId,
          odName: currentUser.odName,
          avatarUrl: currentUser.avatarUrl
        })

        // CRITICAL: Check if we were idle BEFORE changing state
        // Use both state and ref to handle async state updates
        // The ref is updated when we leave a call, so it's more reliable
        const wasIdleBeforeStart = callState.status === 'idle' || wasIdleRef.current

        rtkDebug.log('[RTK] Checking idle state before starting call:', {
          callStateStatus: callState.status,
          wasIdleRef: wasIdleRef.current,
          wasIdleBeforeStart
        })

        // Mark as not idle since we're starting a call
        wasIdleRef.current = false

        setCallState(prev => ({ ...prev, status: 'joining' }))

        // 1. Create meeting via backend and get auth token (sending host display name and meeting name)
        rtkDebug.log('[RTK] Sending to createMeeting:', {
          conversationId: roomId,
          callType,
          displayName: currentUser.odName,
          firstName: undefined,
          lastName: undefined,
          meetingName: conversationName
        })
        const meetingResponse = await apiClient.createMeeting(
          roomId,
          callType,
          currentUser.odName, // displayName
          undefined, // firstName
          undefined, // lastName
          conversationName // meetingName - pass to backend for storage
        )
        const { meetingId, hostAuthToken } = meetingResponse.data

        authTokenRef.current = hostAuthToken
        meetingIdRef.current = meetingId
        conversationIdRef.current = roomId // Store the actual conversationId

        rtkDebug.log('[RTK] Initializing SDK with auth token and simulcast configuration...')

        // 2. Initialize Cloudflare SDK with auth token and simulcast configuration
        // Simulcast enables sending 3 quality streams simultaneously (high/medium/low)
        // The SFU will automatically forward the appropriate quality to each receiver
        rtkDebug.log('[RTK] 📡 Configuring simulcast with 3 quality layers:', {
          high: 'RID=a, 1280x720 @ 2.5Mbps',
          medium: 'RID=b, 640x360 @ 1Mbps',
          low: 'RID=c, 320x180 @ 500Kbps'
        })

        const initializedMeeting = await initMeeting({
          authToken: hostAuthToken,
          defaults: {
            audio: true,
            video: callType === 'video'
          },
          overrides: {
            simulcastConfig: {
              disable: false, // Explicitly enable simulcast (default, but being explicit)
              encodings: SIMULCAST_ENCODINGS // Send 3 quality layers simultaneously
            }
          }
        }).catch((err: any) => {
          rtkDebug.error('[RTK] SDK initialization failed:', err)
          throw new Error(`SDK init failed: ${err.message}`)
        })

        rtkDebug.log('[RTK] SDK initialized, checking meeting object...', {
          hasInitializedMeeting: !!initializedMeeting,
          hasMeetingHook: !!meeting
        })

        // Wait for meeting object to be available
        // initMeeting might return the meeting or update the hook's meeting state
        const meetingToUse = (initializedMeeting as any) || meeting

        if (!meetingToUse || typeof meetingToUse.join !== 'function') {
          throw new Error('Meeting object not available after initialization')
        }

        rtkDebug.log('[RTK] Meeting object ready')

        // ⚠️ CRITICAL: Configure video middleware BEFORE joining/enabling video
        // This MUST be called before video is enabled to allow background effects to work.
        // If video is already enabled when this is called, the video pipeline has already
        // been initialized in automatic rendering mode and cannot be switched to middleware mode.
        // This is why background effects worked for late joiners (who called this before their
        // video started) but not for initiators (who enabled video first then tried to configure).
        if (meetingToUse.self?.setVideoMiddlewareGlobalConfig) {
          try {
            await meetingToUse.self.setVideoMiddlewareGlobalConfig({
              disablePerFrameCanvasRendering: true
            })
            rtkDebug.log('[RTK] ✅ Video middleware configured globally (disablePerFrameCanvasRendering)')
          } catch (err) {
            rtkDebug.warn('[RTK] ⚠️ Failed to configure video middleware:', err)
          }
        }

        rtkDebug.log('[RTK] Joining meeting via SDK...', { meetingId })

        // 3. Join the meeting (connects to Cloudflare SFU)
        await meetingToUse.join()

        // ⚠️ CRITICAL: Wait for actual Session connection (roomJoined: true)
        rtkDebug.log('[RTK] Waiting for Session connection...')
        const sessionTimeout = 10000 // 10 seconds max
        const startTime = Date.now()

        while (!meetingToUse.self?.roomJoined && Date.now() - startTime < sessionTimeout) {
          rtkDebug.log('[RTK] Waiting for roomJoined... (elapsed:', Date.now() - startTime, 'ms)')
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        if (meetingToUse.self?.roomJoined) {
          rtkDebug.log('[RTK] ✅ Successfully joined Session!', {
            elapsed: Date.now() - startTime,
            roomState: meetingToUse.self?.roomState
          })
        } else {
          rtkDebug.error('[RTK] ❌ Failed to join Session - timeout after', sessionTimeout, 'ms')
          throw new Error('Failed to join Cloudflare Session - connection timeout')
        }

        // Check if this is an existing meeting (has other participants already)
        // Wait a moment for participant list to sync after joining
        await new Promise(resolve => setTimeout(resolve, 1000)) // Increased delay to allow participant list to sync
        const existingParticipantsCount = meetingToUse.participants?.joined?.size || 0
        // If there are any participants already (excluding ourselves), it's an existing meeting
        // Note: The SDK's participants.joined includes ourselves, so we need to check if count > 1
        // Also check if activeConversationCalls already has an entry for this conversationId (indicates existing call)
        const hasActiveCallForConversation = activeConversationCalls.has(roomId)
        const isAlreadyInCall = conversationIdRef.current === roomId && callState.roomId === meetingId
        const isExistingMeeting = existingParticipantsCount > 1 || hasActiveCallForConversation || isAlreadyInCall

        rtkDebug.log('[RTK] SDK joined successfully (HOST)', {
          meetingId,
          selfId: meetingToUse.self?.id,
          selfUserId: meetingToUse.self?.userId,
          selfRoomJoined: meetingToUse.self?.roomJoined,
          selfRoomState: meetingToUse.self?.roomState,
          participantsJoined: existingParticipantsCount,
          isExistingMeeting,
          hasActiveCallForConversation,
          isAlreadyInCall
        })

        // 4. Listen for disconnect events (to debug why roomJoined flips to false)
        if (typeof meetingToUse.self?.on === 'function') {
          meetingToUse.self.on('roomLeft', (event: any) => {
            rtkDebug.error('[RTK] ❌ roomLeft event fired!', {
              state: event?.state,
              reason: event?.reason,
              message: event?.message,
              fullEvent: event
            })
          })
          rtkDebug.log('[RTK] Listening for roomLeft events...')
        }

        // 5. Enable media tracks (publishes to Cloudflare SFU)
        rtkDebug.log('[RTK] Enabling audio/video tracks...')
        try {
          await meetingToUse.self?.enableAudio()
          rtkDebug.log('[RTK] ✅ Audio enabled and published to SFU')
        } catch (err) {
          rtkDebug.error('[RTK] Failed to enable audio:', err)
        }

        if (callType === 'video') {
          try {
            await meetingToUse.self?.enableVideo()
            rtkDebug.log('[RTK] ✅ Video enabled and published to SFU')

            // Log publisher-side simulcast information (HOST)
            // Wait a bit for track to be ready, then check stats
            setTimeout(async () => {
              try {
                const videoTrack = meetingToUse.self?.videoTrack
                if (videoTrack) {
                  const settings = videoTrack.getSettings?.()
                  const capabilities = videoTrack.getCapabilities?.()

                  rtkDebug.log('[RTK] 📤 PUBLISHER (HOST): Video track enabled with simulcast:', {
                    trackId: videoTrack.id,
                    trackLabel: videoTrack.label,
                    trackSettings: settings
                      ? {
                          width: settings.width,
                          height: settings.height,
                          frameRate: settings.frameRate,
                          aspectRatio: settings.aspectRatio
                        }
                      : null,
                    trackCapabilities: capabilities
                      ? {
                          width: capabilities.width,
                          height: capabilities.height,
                          frameRate: capabilities.frameRate
                        }
                      : null,
                    simulcastConfig: '3 layers configured (RID=a:high, RID=b:medium, RID=c:low)',
                    note: 'All 3 simulcast layers should be sent to SFU simultaneously'
                  })

                  // Try to get WebRTC stats to verify simulcast layers are being sent
                  try {
                    // Access RTCRtpSender stats if available via core SDK
                    const coreClient = meetingToUse as any
                    if (coreClient.self?._mediaManager || coreClient.self?.mediaManager) {
                      rtkDebug.log('[RTK] 📊 Attempting to get publisher WebRTC stats for simulcast verification...')
                      // Note: Actual stats access depends on SDK internals
                    }
                  } catch (statsErr) {
                    rtkDebug.debug('[RTK] Publisher stats check (optional):', statsErr)
                  }
                }
              } catch (err) {
                rtkDebug.warn('[RTK] Could not log publisher simulcast info:', err)
              }
            }, 2000) // Wait 2s for track to be ready
          } catch (err) {
            rtkDebug.error('[RTK] Failed to enable video:', err)
          }
        }

        // 6. Local media will be automatically set by the useEffect watching SDK tracks
        rtkDebug.log('[RTK] Local tracks will be set by useEffect:', {
          hasAudio: !!meetingToUse.self?.audioTrack,
          hasVideo: !!meetingToUse.self?.videoTrack
        })

        // Update state
        // Use current time as temp start time (will be overwritten by conversation:call-started event)
        startTimeRef.current = Date.now()
        setCallState({
          roomId: meetingId,
          callType,
          status: 'connected',
          callImplementation: 'realtime-kit',
          participants: [
            {
              ...currentUser,
              stream: undefined // Will be set by useEffect
            }
          ],
          hostId: currentUser.id,
          isMuted: false,
          isVideoEnabled: callType === 'video',
          isScreenSharing: false,
          isMinimized: false,
          videoQuality: getSavedVideoQuality(),
          backgroundEnabled: getSavedBackgroundEnabled(), // Default true on first use, respect preference after
          handRaised: false,
          remoteHandsRaised: {},
          startTime: Date.now(),
          duration: 0
        })

        // Store conversation name for the current call
        setCurrentCallConversationName(conversationName)

        setActiveCallInStorage(currentUser.id, meetingId)

        // Send rtk-group-call:start event when starting a new call (from idle state)
        // This ensures invites are sent even if the backend returned an existing meeting
        // (e.g., if a previous call ended but the meeting wasn't cleaned up)
        // The backend will check if there are active participants and decide whether to send invites
        // Also check if we're already in a call for this conversationId (shouldn't happen, but safety check)
        // Use wasIdleBeforeStart (checked before state change) instead of current callState.status
        const isAlreadyInCallForThisConversation =
          conversationIdRef.current === roomId && callState.roomId === meetingId && callState.status !== 'idle'
        const shouldSendStartEvent =
          wasIdleBeforeStart && !isAlreadyInCallForThisConversation && participantsToInvite.length > 0

        rtkDebug.log('[RTK] 📨 Start event decision:', {
          wasIdleBeforeStart,
          currentCallStateStatus: callState.status,
          isAlreadyInCallForThisConversation,
          conversationIdRef: conversationIdRef.current,
          roomId,
          callStateRoomId: callState.roomId,
          meetingId,
          participantsToInviteCount: participantsToInvite.length,
          shouldSendStartEvent,
          isExistingMeeting,
          existingParticipantsCount
        })

        if (shouldSendStartEvent) {
          // Send invites via WebSocket
          rtkDebug.log('[RTK] Sending rtk-group-call:start event with participants (starting new call):', {
            conversationId: roomId,
            meetingId,
            callType,
            fromUserId: currentUser.id,
            fromUserName: currentUser.odName,
            participantsCount: participantsToInvite.length,
            participants: participantsToInvite.map(p => ({ id: p.id, name: p.odName })),
            wasIdleBeforeStart: wasIdleBeforeStart,
            isExistingMeeting: isExistingMeeting,
            note: 'Sending start event even if meeting existed - backend will check for active participants'
          })
          emitSocketEvent('rtk-group-call:start', {
            conversationId: roomId,
            meetingId,
            callType,
            conversationName: conversationName || roomId, // Use provided name or fallback to roomId
            from: {
              id: currentUser.id,
              odId: currentUser.odId,
              odName: currentUser.odName,
              avatarUrl: currentUser.avatarUrl
            },
            participants: participantsToInvite
          })
        } else {
          rtkDebug.log('[RTK] Skipping rtk-group-call:start event:', {
            conversationId: roomId,
            meetingId,
            existingParticipantsCount,
            isExistingMeeting,
            wasIdleBeforeStart,
            isAlreadyInCallForThisConversation,
            participantsToInviteCount: participantsToInvite.length,
            currentCallState: {
              conversationId: conversationIdRef.current,
              roomId: callState.roomId,
              status: callState.status
            },
            reason: !wasIdleBeforeStart
              ? 'Not starting from idle state'
              : isAlreadyInCallForThisConversation
                ? 'Already in call for this conversation'
                : participantsToInvite.length === 0
                  ? 'No participants to invite'
                  : 'Unknown'
          })
        }

        // Notify backend that HOST joined
        emitSocketEvent('rtk-group-call:joined', {
          conversationId: roomId,
          meetingId,
          participant: {
            id: currentUser.id,
            odId: currentUser.odId,
            odName: currentUser.odName,
            avatarUrl: currentUser.avatarUrl
          }
        })

        // Start duration timer
        durationTimerRef.current = setInterval(() => {
          const currentTime = Date.now()
          const startTime = startTimeRef.current || currentTime
          const duration = Math.floor((currentTime - startTime) / 1000)
          if (duration % 5 === 0) {
            // Log every 5 seconds
            rtkDebug.log('[RTK] ⏱️ Duration timer tick (HOST):', {
              duration,
              startTime,
              currentTime,
              diff: (currentTime - startTime) / 1000
            })
          }
          setCallState(prev => ({
            ...prev,
            duration
          }))
        }, 1000)

        onCallStarted?.(meetingId, participantsToInvite)

        rtkDebug.log('[RTK] Call started successfully with SDK')
      } catch (error) {
        rtkDebug.error('[RTK] Failed to start call:', error)
        conversationIdRef.current = null
        setCallState(initialCallState)
      }
    },
    [currentUser, apiClient, wsClient, onCallStarted, initMeeting, meeting, emitSocketEvent]
  )

  /**
   * Join an existing call (participant)
   *
   * Note: The interface expects (roomId, callType, initialParticipants?) but we need conversationId.
   * We store conversationId in a ref before calling this, or look it up from activeConversationCalls by roomId.
   */
  const joinCall = useCallback(
    async (roomId: string, callType: CallType): Promise<void> => {
      if (!currentUser || !apiClient) {
        rtkDebug.error('[RTK] Cannot join call: missing requirements')
        return
      }

      // Try to find conversationId from activeConversationCalls by roomId
      let conversationId = joinCallConversationIdRef.current
      if (!conversationId) {
        for (const [convId, callInfo] of activeConversationCalls.entries()) {
          if (callInfo.roomId === roomId) {
            conversationId = convId
            break
          }
        }
      }

      try {
        rtkDebug.log('[RTK] Joining Realtime Kit group call with SDK...', { roomId, conversationId })
        rtkDebug.log('[RTK] Current user (PARTICIPANT):', {
          id: currentUser.id,
          odId: currentUser.odId,
          odName: currentUser.odName,
          avatarUrl: currentUser.avatarUrl
        })

        setCallState(prev => ({ ...prev, status: 'joining' }))

        // 1. Get auth token for this meeting
        rtkDebug.log('[RTK] Calling addParticipant API with meetingId:', roomId)
        rtkDebug.log('[RTK] Sending to addParticipant:', {
          meetingId: roomId,
          userId: undefined,
          role: 'participant',
          displayName: currentUser?.odName,
          firstName: undefined,
          lastName: undefined
        })
        const participantResponse = await apiClient.addParticipant(
          roomId,
          undefined, // userId (optional - backend uses requesting user)
          'participant',
          currentUser?.odName, // displayName
          undefined, // firstName (could parse from odName if needed)
          undefined // lastName
        )
        rtkDebug.log('[RTK] addParticipant response:', participantResponse)
        const { authToken } = participantResponse.data

        authTokenRef.current = authToken
        meetingIdRef.current = roomId

        rtkDebug.log('[RTK] Initializing SDK with auth token and simulcast configuration...')

        // 2. Initialize Cloudflare SDK with auth token and simulcast configuration
        // Simulcast enables sending 3 quality streams simultaneously (high/medium/low)
        // The SFU will automatically forward the appropriate quality to each receiver
        rtkDebug.log('[RTK] 📡 Configuring simulcast with 3 quality layers:', {
          high: 'RID=a, 1280x720 @ 2.5Mbps',
          medium: 'RID=b, 640x360 @ 1Mbps',
          low: 'RID=c, 320x180 @ 500Kbps'
        })

        const initializedMeeting = await initMeeting({
          authToken,
          defaults: {
            audio: true,
            video: callType === 'video'
          },
          overrides: {
            simulcastConfig: {
              disable: false, // Explicitly enable simulcast (default, but being explicit)
              encodings: SIMULCAST_ENCODINGS // Send 3 quality layers simultaneously
            }
          }
        })

        rtkDebug.log('[RTK] SDK initialized, checking meeting object...')

        // Wait for meeting object to be available
        // initMeeting might return the meeting or update the hook's meeting state
        const meetingToUse = (initializedMeeting as any) || meeting

        if (!meetingToUse || typeof meetingToUse.join !== 'function') {
          throw new Error('Meeting object not available after initialization')
        }

        rtkDebug.log('[RTK] Meeting object ready')

        // ⚠️ CRITICAL: Configure video middleware BEFORE joining/enabling video
        // This MUST be called before video is enabled to allow background effects to work.
        // If video is already enabled when this is called, the video pipeline has already
        // been initialized in automatic rendering mode and cannot be switched to middleware mode.
        if (meetingToUse.self?.setVideoMiddlewareGlobalConfig) {
          try {
            await meetingToUse.self.setVideoMiddlewareGlobalConfig({
              disablePerFrameCanvasRendering: true
            })
            rtkDebug.log('[RTK] ✅ Video middleware configured globally (disablePerFrameCanvasRendering)')
          } catch (err) {
            rtkDebug.warn('[RTK] ⚠️ Failed to configure video middleware:', err)
          }
        }

        rtkDebug.log('[RTK] Joining meeting via SDK...', { meetingId: roomId })

        // 3. Join the meeting (connects to Cloudflare SFU)
        await meetingToUse.join()

        rtkDebug.log('[RTK] SDK joined successfully (PARTICIPANT)', {
          meetingId: roomId,
          selfId: meetingToUse.self?.id,
          selfUserId: meetingToUse.self?.userId,
          selfRoomJoined: meetingToUse.self?.roomJoined,
          selfRoomState: meetingToUse.self?.roomState,
          participantsJoined: meetingToUse.participants?.joined?.size || 0
        })

        // ⚠️ CRITICAL: Wait for actual Session connection (roomJoined: true)
        rtkDebug.log('[RTK] Waiting for Session connection...')
        const sessionTimeout = 10000 // 10 seconds max
        const startTime = Date.now()

        while (!meetingToUse.self?.roomJoined && Date.now() - startTime < sessionTimeout) {
          rtkDebug.log('[RTK] Waiting for roomJoined... (elapsed:', Date.now() - startTime, 'ms)')
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        if (meetingToUse.self?.roomJoined) {
          rtkDebug.log('[RTK] ✅ Successfully joined Session!', {
            elapsed: Date.now() - startTime,
            roomState: meetingToUse.self?.roomState
          })
        } else {
          rtkDebug.error('[RTK] ❌ Failed to join Session - timeout after', sessionTimeout, 'ms')
          throw new Error('Failed to join Cloudflare Session - connection timeout')
        }

        // 4. Listen for disconnect events (to debug why roomJoined flips to false)
        if (typeof meetingToUse.self?.on === 'function') {
          meetingToUse.self.on('roomLeft', (event: any) => {
            rtkDebug.error('[RTK] ❌ roomLeft event fired!', {
              state: event?.state,
              reason: event?.reason,
              message: event?.message,
              fullEvent: event
            })
          })
          rtkDebug.log('[RTK] Listening for roomLeft events...')
        }

        // 5. Enable media tracks (publishes to Cloudflare SFU)
        rtkDebug.log('[RTK] Enabling audio/video tracks...')
        try {
          await meetingToUse.self?.enableAudio()
          rtkDebug.log('[RTK] ✅ Audio enabled and published to SFU')
        } catch (err) {
          rtkDebug.error('[RTK] Failed to enable audio:', err)
        }

        if (callType === 'video') {
          try {
            await meetingToUse.self?.enableVideo()
            rtkDebug.log('[RTK] ✅ Video enabled and published to SFU')

            // Log publisher-side simulcast information (PARTICIPANT)
            setTimeout(async () => {
              try {
                const videoTrack = meetingToUse.self?.videoTrack
                if (videoTrack) {
                  const settings = videoTrack.getSettings?.()
                  const capabilities = videoTrack.getCapabilities?.()

                  rtkDebug.log('[RTK] 📤 PUBLISHER (PARTICIPANT): Video track enabled with simulcast:', {
                    trackId: videoTrack.id,
                    trackLabel: videoTrack.label,
                    trackSettings: settings
                      ? {
                          width: settings.width,
                          height: settings.height,
                          frameRate: settings.frameRate,
                          aspectRatio: settings.aspectRatio
                        }
                      : null,
                    trackCapabilities: capabilities
                      ? {
                          width: capabilities.width,
                          height: capabilities.height,
                          frameRate: capabilities.frameRate
                        }
                      : null,
                    simulcastConfig: '3 layers configured (RID=a:high, RID=b:medium, RID=c:low)',
                    note: 'All 3 simulcast layers should be sent to SFU simultaneously'
                  })
                }
              } catch (err) {
                rtkDebug.warn('[RTK] Could not log publisher simulcast info:', err)
              }
            }, 2000)
          } catch (err) {
            rtkDebug.error('[RTK] Failed to enable video:', err)
          }
        }

        // 6. Local media will be automatically set by the useEffect watching SDK tracks
        rtkDebug.log('[RTK] Local tracks will be set by useEffect:', {
          hasAudio: !!meetingToUse.self?.audioTrack,
          hasVideo: !!meetingToUse.self?.videoTrack
        })

        // Update state
        // Store the conversationId for leaveCall to use
        if (conversationId) {
          conversationIdRef.current = conversationId
        }

        // Try to get global startedAt from activeConversationCalls using conversationId
        const callInfo = conversationId ? activeConversationCalls.get(conversationId) : null
        rtkDebug.log('[RTK] 🔍 Looking for call info in activeConversationCalls:', {
          conversationId,
          roomId,
          hasConversationId: !!conversationId,
          activeConversationCallsSize: activeConversationCalls.size,
          activeConversationCallsKeys: Array.from(activeConversationCalls.keys()),
          foundCallInfo: !!callInfo,
          callInfoStartedAt: callInfo?.startedAt
        })

        const globalStartTime = callInfo?.startedAt ? new Date(callInfo.startedAt).getTime() : Date.now()
        startTimeRef.current = globalStartTime
        rtkDebug.log('[RTK] ⏱️ Join call timer setup:', {
          roomId,
          conversationId,
          hasCallInfo: !!callInfo,
          startedAt: callInfo?.startedAt,
          startedAtType: callInfo?.startedAt ? typeof callInfo.startedAt : null,
          globalStartTime,
          now: Date.now(),
          diff: callInfo?.startedAt ? (Date.now() - globalStartTime) / 1000 : 0,
          willUseGlobal: !!callInfo?.startedAt
        })

        setCallState(prev => ({
          ...prev,
          roomId,
          callType,
          status: 'connected',
          participants: [
            {
              ...currentUser,
              stream: undefined // Will be set by useEffect
            }
          ],
          startTime: Date.now()
        }))

        setActiveCallInStorage(currentUser.id, roomId)

        // Notify backend that PARTICIPANT joined
        emitSocketEvent('rtk-group-call:joined', {
          conversationId: conversationIdRef.current || roomId, // Use actual conversationId, fallback to roomId
          meetingId: roomId,
          participant: {
            id: currentUser.id,
            odId: currentUser.odId,
            odName: currentUser.odName,
            avatarUrl: currentUser.avatarUrl
          }
        })

        // Start duration timer
        durationTimerRef.current = setInterval(() => {
          const currentTime = Date.now()
          const startTime = startTimeRef.current || currentTime
          const duration = Math.floor((currentTime - startTime) / 1000)
          if (duration % 5 === 0) {
            // Log every 5 seconds
            rtkDebug.log('[RTK] ⏱️ Duration timer tick (PARTICIPANT):', {
              duration,
              startTime,
              currentTime,
              diff: (currentTime - startTime) / 1000
            })
          }
          setCallState(prev => ({
            ...prev,
            duration
          }))
        }, 1000)

        rtkDebug.log('[RTK] Joined call successfully with SDK')
      } catch (error) {
        rtkDebug.error('[RTK] Failed to join call:', error)
        conversationIdRef.current = null
        setCallState(initialCallState)
      } finally {
        // Clear conversationId ref after use
        joinCallConversationIdRef.current = null
      }
    },
    [currentUser, apiClient, initMeeting, meeting, emitSocketEvent, activeConversationCalls]
  )

  // Wrapper for joinCall that accepts conversationId
  // This maintains interface compatibility while allowing conversationId to be passed
  // Chat.tsx passes conversationId as string, but interface expects CallParticipant[]
  const joinCallWrapper = useCallback(
    async (roomId: string, callType: CallType, conversationIdOrParticipants?: CallParticipant[]): Promise<void> => {
      // Chat.tsx passes conversationId as string in the 3rd parameter
      // We need to handle this by checking if it's actually a string
      // Since TypeScript interface expects CallParticipant[], we'll use a type assertion
      const param = conversationIdOrParticipants as any
      if (typeof param === 'string') {
        // It's actually a conversationId string
        joinCallConversationIdRef.current = param
        return joinCall(roomId, callType)
      } else {
        // It's CallParticipant[] or undefined (from interface)
        // Try to find conversationId from activeConversationCalls by roomId
        return joinCall(roomId, callType)
      }
    },
    [joinCall]
  )

  /**
   * Accept incoming invite
   */
  const acceptInvite = useCallback(async (): Promise<void> => {
    if (!incomingInvite) {
      return
    }

    const { roomId, callType, conversationId, conversationName } = incomingInvite

    // Store conversation name before clearing invite
    if (conversationName) {
      setCurrentCallConversationName(conversationName)
    }

    setIncomingInvite(null)

    rtkDebug.log('[RTK] Accepting invite with conversationId:', { roomId, conversationId, callType, conversationName })

    // Use joinCallWrapper to properly pass conversationId (as 3rd param, despite type mismatch)
    await joinCallWrapper(roomId, callType, conversationId as any)
  }, [incomingInvite, joinCallWrapper])

  /**
   * Decline incoming invite
   */
  const declineInvite = useCallback(() => {
    setIncomingInvite(null)
  }, [])

  /**
   * Leave the call
   */
  const leaveCall = useCallback(async () => {
    if (!callState.roomId) {
      return
    }

    rtkDebug.log('[RTK] Leaving call via SDK...')
    rtkDebug.log('[RTK] Leave call state:', {
      conversationId: conversationIdRef.current,
      roomId: callState.roomId,
      meetingIdRef: meetingIdRef.current,
      currentUserId: currentUser?.id,
      isScreenSharing: callState.isScreenSharing
    })

    try {
      // 1. Stop screen sharing if active (must happen before leaving)
      if (callState.isScreenSharing && meeting?.self) {
        rtkDebug.log('[RTK] 🖥️ Stopping screen share before leaving...')
        try {
          await meeting.self.disableScreenShare()
          rtkDebug.log('[RTK] ✅ Screen share stopped before leaving')
        } catch (error) {
          rtkDebug.error('[RTK] ⚠️ Error stopping screen share:', error)
        }
      }

      // 2. Leave via Cloudflare SDK
      if (meeting && meeting.self?.roomJoined) {
        await meeting.leave()
        rtkDebug.log('[RTK] SDK leave successful')
      }
    } catch (error) {
      rtkDebug.error('[RTK] Error leaving via SDK:', error)
    }

    // 3. Stop local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }

    // Clean up quality monitoring intervals
    if ((window as any).rtkQualityMonitors) {
      const monitors = (window as any).rtkQualityMonitors as Map<string, NodeJS.Timeout>
      monitors.forEach((interval, peerId) => {
        clearInterval(interval)
        rtkDebug.log('[RTK] Cleaned up quality monitor for peer:', peerId)
      })
      monitors.clear()
    }

    // 4. Notify via WebSocket that participant left
    const conversationId = conversationIdRef.current
    if (conversationId && callState.roomId && currentUser) {
      const leaveEventData = {
        conversationId, // Use the actual conversationId, not the meetingId!
        meetingId: meetingIdRef.current || callState.roomId,
        participantId: currentUser.id
      }
      rtkDebug.log('[RTK] 📤 Sending rtk-group-call:left:', leaveEventData)
      emitSocketEvent('rtk-group-call:left', leaveEventData)
    }

    // 5. Clean up virtual background
    if (virtualBackgroundRef.current) {
      virtualBackgroundRef.current.destroy(meeting!)
      virtualBackgroundRef.current = null
    }

    // 6. Clean up state
    const duration = callState.duration
    const roomId = callState.roomId

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }

    clearActiveCallFromStorage()
    authTokenRef.current = null
    meetingIdRef.current = null
    conversationIdRef.current = null
    callStateRoomIdRef.current = null // Explicitly clear to allow new invites
    wasIdleRef.current = true // Mark as idle so next call will send invites
    setLocalStream(null)
    setRemoteStreams(new Map())
    setParticipants([])
    setCallState(initialCallState)
    setCurrentCallConversationName(undefined) // Clear conversation name when leaving

    onCallEnded?.(roomId, duration)

    rtkDebug.log('[RTK] Left call')
  }, [callState, localStream, meeting, emitSocketEvent, onCallEnded, currentUser])

  /**
   * Toggle mute (using SDK)
   * Simple approach: Let SDK manage state, just call enable/disable
   */
  const toggleMute = useCallback((): boolean => {
    rtkDebug.log('[RTK] 🎤 toggleMute called!', {
      hasMeeting: !!meeting,
      hasSelf: !!meeting?.self,
      currentIsMuted: callState.isMuted
    })

    if (!meeting?.self) {
      rtkDebug.log('[RTK] ⚠️ toggleMute: No meeting.self, returning early')
      return callState.isMuted
    }

    const currentEnabled = meeting.self.audioEnabled ?? false
    const newMuted = currentEnabled // if audio is enabled, we're muting (newMuted = true)

    rtkDebug.log('[RTK] Toggling audio:', currentEnabled ? 'disable' : 'enable', {
      sdkAudioEnabled: meeting.self.audioEnabled,
      stateIsMuted: callState.isMuted,
      willBeMuted: newMuted
    })

    if (currentEnabled) {
      meeting.self.disableAudio()
    } else {
      meeting.self.enableAudio()
    }

    // Return intended new mute state (for optimistic UI update)
    return newMuted
  }, [meeting])

  /**
   * Toggle video (using SDK)
   * Simple approach: Let SDK manage state, just call enable/disable
   */
  const toggleVideo = useCallback((): boolean => {
    rtkDebug.log('[RTK] 📹 toggleVideo called!', {
      hasMeeting: !!meeting,
      hasSelf: !!meeting?.self,
      currentIsVideoEnabled: callState.isVideoEnabled
    })

    if (!meeting?.self) {
      rtkDebug.log('[RTK] ⚠️ toggleVideo: No meeting.self, returning early')
      return callState.isVideoEnabled
    }

    const currentEnabled = meeting.self.videoEnabled ?? false
    const newEnabled = !currentEnabled

    rtkDebug.log('[RTK] Toggling video:', currentEnabled ? 'disable' : 'enable', {
      sdkVideoEnabled: meeting.self.videoEnabled,
      stateVideoEnabled: callState.isVideoEnabled,
      willEnable: newEnabled
    })

    if (currentEnabled) {
      meeting.self.disableVideo()
    } else {
      meeting.self.enableVideo()
    }

    // Return intended new state (for optimistic UI update)
    return newEnabled
  }, [meeting])

  /**
   * Toggle screen share (using SDK)
   *
   * Handles screen sharing with comprehensive error handling for:
   * - Browser permission denial
   * - No screen/window available
   * - Browser compatibility issues
   */
  const toggleScreenShare = useCallback(async (): Promise<boolean> => {
    if (!meeting?.self) {
      rtkDebug.error('[RTK] Cannot toggle screen share: meeting.self not available')
      return false
    }

    try {
      const currentSharing = callState.isScreenSharing

      if (currentSharing) {
        // Stop screen sharing
        await meeting.self.disableScreenShare()
        setCallState(prev => ({ ...prev, isScreenSharing: false }))
        rtkDebug.log('[RTK] ✅ Screen share stopped via SDK')
        return false
      } else {
        // Start screen sharing
        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          const error = new Error('Screen sharing is not supported in this browser')
          rtkDebug.error('[RTK] Screen share error:', error.message)
          throw error
        }

        await meeting.self.enableScreenShare()

        // Wait a bit for SDK to process and publish the screen share track
        await new Promise(resolve => setTimeout(resolve, 500))

        // Check if screen share tracks are available
        // screenShareTracks might be a Map, Set, Array, or object - handle all cases
        const screenShareTracksRaw = meeting.self?.screenShareTracks
        let screenShareTracks: MediaStreamTrack[] = []

        if (screenShareTracksRaw) {
          // If it's an array
          if (Array.isArray(screenShareTracksRaw)) {
            screenShareTracks = screenShareTracksRaw.filter(
              (t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack
            )
          }
          // If it's a Map
          else if (
            screenShareTracksRaw &&
            typeof screenShareTracksRaw === 'object' &&
            'get' in screenShareTracksRaw &&
            'set' in screenShareTracksRaw
          ) {
            // Type guard for Map-like structure
            const mapLike = screenShareTracksRaw as Map<any, any>
            if (mapLike instanceof Map) {
              screenShareTracks = Array.from(mapLike.values()).filter(
                (t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack
              )
            }
          }
          // If it's a Set
          else if (
            screenShareTracksRaw &&
            typeof screenShareTracksRaw === 'object' &&
            'has' in screenShareTracksRaw &&
            'add' in screenShareTracksRaw
          ) {
            // Type guard for Set-like structure
            const setLike = screenShareTracksRaw as Set<any>
            if (setLike instanceof Set) {
              screenShareTracks = Array.from(setLike).filter(
                (t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack
              )
            }
          }
          // If it's an object
          else if (typeof screenShareTracksRaw === 'object' && screenShareTracksRaw !== null) {
            // Try Object.values first
            const values = Object.values(screenShareTracksRaw)
            screenShareTracks = values.filter((t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack)

            // If that didn't work, try forEach if available
            if (screenShareTracks.length === 0 && typeof (screenShareTracksRaw as any).forEach === 'function') {
              ;(screenShareTracksRaw as any).forEach((value: any) => {
                if (value instanceof MediaStreamTrack) {
                  screenShareTracks.push(value)
                }
              })
            }

            // If still nothing, try iterating
            if (
              screenShareTracks.length === 0 &&
              typeof (screenShareTracksRaw as any)[Symbol.iterator] === 'function'
            ) {
              try {
                for (const value of screenShareTracksRaw as Iterable<any>) {
                  if (value instanceof MediaStreamTrack) {
                    screenShareTracks.push(value)
                  }
                }
              } catch {
                // Ignore iteration errors
              }
            }
          }
        }

        const screenShareEnabled = meeting.self?.screenShareEnabled

        rtkDebug.log('[RTK] ✅ Screen share started via SDK', {
          screenShareEnabled,
          screenShareTracksCount: screenShareTracks.length,
          screenShareTrackIds: screenShareTracks.map(t => t.id),
          screenShareTrackKinds: screenShareTracks.map(t => t.kind),
          screenShareTrackLabels: screenShareTracks.map(t => t.label),
          screenShareTracksRawType: typeof screenShareTracksRaw,
          screenShareTracksRawIsArray: Array.isArray(screenShareTracksRaw),
          screenShareTracksRawIsMap: screenShareTracksRaw instanceof Map,
          screenShareTracksRawIsSet: screenShareTracksRaw instanceof Set,
          screenShareTracksRawKeys:
            screenShareTracksRaw && typeof screenShareTracksRaw === 'object' ? Object.keys(screenShareTracksRaw) : [],
          screenShareTracksRawValue: screenShareTracksRaw, // Full object for inspection
          meetingSelf: {
            id: meeting.self?.id,
            screenShareEnabled: meeting.self?.screenShareEnabled,
            hasScreenShareTracks: !!meeting.self?.screenShareTracks,
            screenShareTracksType: typeof meeting.self?.screenShareTracks
          }
        })

        if (screenShareTracks.length === 0) {
          rtkDebug.warn('[RTK] ⚠️ Screen share enabled but no tracks available yet - may need more time', {
            screenShareTracksRaw,
            screenShareTracksRawType: typeof screenShareTracksRaw,
            screenShareTracksRawIsMap: screenShareTracksRaw instanceof Map,
            screenShareTracksRawIsSet: screenShareTracksRaw instanceof Set,
            screenShareTracksRawKeys:
              screenShareTracksRaw && typeof screenShareTracksRaw === 'object' ? Object.keys(screenShareTracksRaw) : [],
            screenShareTracksRawValue: screenShareTracksRaw
          })
        }

        setCallState(prev => ({ ...prev, isScreenSharing: true }))
        return true
      }
    } catch (error: any) {
      rtkDebug.error('[RTK] ❌ Failed to toggle screen share:', error)

      // Reset state on error
      setCallState(prev => ({ ...prev, isScreenSharing: false }))

      // Provide user-friendly error messages
      const errorMessage = error?.message || 'Unknown error'
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        rtkDebug.error('[RTK] Screen share permission denied by user')
      } else if (errorMessage.includes('NotSupportedError') || errorMessage.includes('not supported')) {
        rtkDebug.error('[RTK] Screen sharing not supported in this browser')
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('No screen')) {
        rtkDebug.error('[RTK] No screen or window available for sharing')
      }

      return false
    }
  }, [meeting, callState.isScreenSharing])

  /**
   * Set video quality
   */
  /**
   * Set video quality preference
   *
   * Publisher-side: ✅ We control what we send
   * - Simulcast is configured when initializing the meeting
   * - We send 3 quality layers (high/medium/low) simultaneously
   *
   * Subscriber-side: ⚠️ Limited control via React SDK
   * - The React SDK doesn't expose preferredRid configuration
   * - SFU automatically selects quality based on network conditions
   * - We attempt to configure via core SDK if accessible
   */
  const setVideoQuality = useCallback(
    async (quality: VideoQuality): Promise<void> => {
      const preferredRid = QUALITY_TO_RID[quality]
      rtkDebug.log('[RTK] Setting video quality preference to:', quality, {
        preferredRid,
        note: 'Attempting to configure subscriber-side preferredRid'
      })

      setCallState(prev => ({ ...prev, videoQuality: quality }))

      try {
        localStorage.setItem(PREF_VIDEO_QUALITY_KEY, quality)
      } catch {
        // Ignore
      }

      // Attempt to configure subscriber-side preferredRid via core SDK
      // The React SDK wraps the core SDK, so meeting object might expose core methods
      if (meeting) {
        try {
          // Try to access core SDK methods (if available)
          const coreClient = meeting as any

          // Check if there's a method to update consumer preferences
          // This is experimental - the React SDK might not expose this
          if (typeof coreClient.updateConsumerPreferences === 'function') {
            // If such a method exists, use it
            await coreClient.updateConsumerPreferences({
              preferredRid,
              priorityOrdering: 'asciibetical',
              ridNotAvailable: 'asciibetical'
            })
            rtkDebug.log('[RTK] ✅ Configured subscriber preferredRid:', preferredRid)
          } else if (coreClient.participants?.joined) {
            // Try to configure for each remote participant's video consumers
            const joined = coreClient.participants.joined as any
            const allParticipants =
              typeof joined.toArray === 'function' ? joined.toArray() : Array.from(joined.values())

            for (const peer of allParticipants) {
              if (peer.id !== meeting.self?.id && peer.videoTrack) {
                // Try to access consumer and update preferredRid
                // This is highly experimental and may not work
                const peerInternal = peer as any
                if (peerInternal._consumerId || peerInternal.consumerId) {
                  rtkDebug.log('[RTK] Attempting to configure preferredRid for peer:', peer.id)
                  // Note: This would require core SDK methods that may not be exposed
                }
              }
            }
          }
        } catch (err) {
          rtkDebug.warn(
            "[RTK] ⚠️ Could not configure subscriber preferredRid (expected if React SDK doesn't expose this):",
            err
          )
          rtkDebug.log('[RTK] SFU will automatically select quality based on network conditions')
        }
      }
    },
    [meeting]
  )

  /**
   * Toggle minimize
   */
  const toggleMinimize = useCallback(() => {
    setCallState(prev => ({ ...prev, isMinimized: !prev.isMinimized }))
  }, [])

  /**
   * Toggle background effects using official Cloudflare virtual background package
   */
  const toggleBackground = useCallback(async () => {
    const newValue = !callState.backgroundEnabled

    rtkDebug.log('[RTK] 🎨 Toggling background effect:', { enabled: newValue, hasMeeting: !!meeting })

    if (!meeting?.self) {
      rtkDebug.warn('[RTK] ⚠️ Meeting not available')
      return
    }

    try {
      if (newValue) {
        // Enable background effect
        if (!virtualBackgroundRef.current) {
          virtualBackgroundRef.current = new RTKVirtualBackground()
        }

        // Initialize transformer if not already initialized
        // This MUST be done before adding any middleware
        await virtualBackgroundRef.current.initialize(meeting)

        // Apply background with NewWork preset image
        await virtualBackgroundRef.current.enableBackground(meeting)

        rtkDebug.log('[RTK] ✅ Background effect enabled')
      } else {
        // Disable background effect
        if (virtualBackgroundRef.current) {
          virtualBackgroundRef.current.disable(meeting)
          rtkDebug.log('[RTK] ⏸️ Background effect disabled')
        }
      }

      // Update state and save preference
      setCallState(prev => ({ ...prev, backgroundEnabled: newValue }))
      try {
        localStorage.setItem(PREF_BACKGROUND_ENABLED_KEY, newValue.toString())
      } catch {
        // Ignore
      }
    } catch (error) {
      rtkDebug.error('[RTK] ❌ Failed to toggle background effect:', error)
      // Reset state on error
      setCallState(prev => ({ ...prev, backgroundEnabled: false }))
    }
  }, [callState.backgroundEnabled, meeting])

  /**
   * Toggle raise hand
   */
  const toggleRaiseHand = useCallback(async (): Promise<boolean> => {
    rtkDebug.log('[RTK] 🖐️ toggleRaiseHand called', {
      roomId: callState.roomId,
      userId: currentUser?.id,
      currentHandRaised: callState.handRaised
    })

    if (!callState.roomId || !currentUser) {
      rtkDebug.warn('[RTK] ⚠️ Cannot toggle raise hand: missing roomId or currentUser', {
        hasRoomId: !!callState.roomId,
        hasCurrentUser: !!currentUser
      })
      return callState.handRaised
    }

    try {
      const newHandRaisedState = !callState.handRaised

      rtkDebug.log('[RTK] ✋ Emitting raise-hand WebSocket event', {
        roomId: callState.roomId,
        participantId: currentUser.id,
        handRaised: newHandRaisedState
      })

      // Send WebSocket event to broadcast raise hand state
      emitSocketEvent('group-call:raise-hand', {
        roomId: callState.roomId,
        participantId: currentUser.id,
        handRaised: newHandRaisedState
      })

      rtkDebug.log(`[RTK] ✋ Hand ${newHandRaisedState ? 'raised' : 'lowered'} - event sent`)

      // Return the new state (optimistic update - will be confirmed by WebSocket event)
      return newHandRaisedState
    } catch (error) {
      rtkDebug.error('[RTK] ❌ Failed to toggle raise hand:', error)
      return callState.handRaised
    }
  }, [callState.roomId, callState.handRaised, currentUser, emitSocketEvent])

  /**
   * Send a reaction emoji
   */
  const sendReaction = useCallback(
    async (emoji: string): Promise<void> => {
      rtkDebug.log('[RTK] 😊 sendReaction called', {
        emoji,
        roomId: callState.roomId,
        userId: currentUser?.id
      })

      if (!callState.roomId || !currentUser) {
        rtkDebug.warn('[RTK] ⚠️ Cannot send reaction: missing roomId or currentUser', {
          hasRoomId: !!callState.roomId,
          hasCurrentUser: !!currentUser
        })
        return
      }

      try {
        rtkDebug.log('[RTK] 😊 Emitting send-reaction WebSocket event', {
          roomId: callState.roomId,
          participantId: currentUser.id,
          participantName: currentUser.odName,
          emoji
        })

        // Send WebSocket event to broadcast reaction
        emitSocketEvent('group-call:send-reaction', {
          roomId: callState.roomId,
          participantId: currentUser.id,
          participantName: currentUser.odName,
          emoji
        })

        rtkDebug.log('[RTK] 😊 Reaction sent:', emoji)
      } catch (error) {
        rtkDebug.error('[RTK] ❌ Failed to send reaction:', error)
      }
    },
    [callState.roomId, currentUser, emitSocketEvent]
  )

  /**
   * Invite additional participants mid-call
   */
  const inviteToCall = useCallback(
    (participantsToInvite: CallParticipant[]) => {
      if (!callState.roomId || !currentUser) {
        return
      }

      rtkDebug.log('[RTK] Inviting participants to call')

      emitSocketEvent('rtk-group-call:start', {
        conversationId: callState.roomId,
        meetingId: callState.roomId,
        callType: callState.callType,
        from: {
          id: currentUser.id,
          odId: currentUser.odId,
          odName: currentUser.odName,
          avatarUrl: currentUser.avatarUrl
        },
        participants: participantsToInvite
      })
    },
    [emitSocketEvent, callState.roomId, callState.callType, currentUser]
  )

  /**
   * Reconnect participant (not applicable for Realtime Kit)
   */
  const reconnectParticipant = useCallback(async (): Promise<void> => {
    rtkDebug.log('[RTK] Reconnect not needed for Realtime Kit')
  }, [])

  /**
   * Get connection diagnostics
   */
  const getConnectionDiagnostics = useCallback((): Map<string, any> => {
    return new Map<string, any>([
      ['status', callState.status],
      ['participants', participants.length],
      ['implementation', 'cloudflare-realtime-kit']
    ])
  }, [callState.status, participants.length])

  /**
   * Log comprehensive simulcast information for debugging
   * Shows what we're sending (publisher) and receiving (subscriber)
   */
  const logSimulcastInfo = useCallback(async () => {
    if (!meeting || callState.status !== 'connected') {
      rtkDebug.log('[RTK] 📊 Simulcast Info: Not in active call')
      return
    }

    rtkDebug.log('[RTK] 📊 ========== SIMULCAST STATUS REPORT ==========')

    // Publisher info (what we're sending)
    const selfVideoTrack = meeting.self?.videoTrack
    if (selfVideoTrack) {
      const settings = selfVideoTrack.getSettings?.()
      rtkDebug.log('[RTK] 📤 PUBLISHER (YOU):', {
        trackId: selfVideoTrack.id,
        trackLabel: selfVideoTrack.label,
        sendingResolution: settings ? `${settings.width}x${settings.height} @ ${settings.frameRate}fps` : 'unknown',
        simulcastLayers: '3 layers configured (RID=a:high, RID=b:medium, RID=c:low)',
        configuredEncodings: SIMULCAST_ENCODINGS.map(e => ({
          rid: e.rid,
          maxBitrate: `${(e.maxBitrate || 0) / 1000}Kbps`,
          scaleDown: e.scaleResolutionDownBy
        }))
      })
    } else {
      rtkDebug.log('[RTK] 📤 PUBLISHER (YOU): Video not enabled')
    }

    // Subscriber info (what we're receiving from each peer)
    const joined = meeting.participants?.joined
    if (joined) {
      const allParticipants =
        typeof (joined as any).toArray === 'function' ? (joined as any).toArray() : Array.from(joined.values())

      const remotePeers = allParticipants.filter((p: any) => p.id !== meeting.self?.id)

      rtkDebug.log('[RTK] 📥 SUBSCRIBERS (Receiving from):', {
        totalRemotePeers: remotePeers.length,
        peers: remotePeers.map((peer: any) => {
          const track = peer.videoTrack
          if (!track) return { peerId: peer.id, peerName: peer.name, status: 'no video' }

          const settings = track.getSettings?.()
          const pixels = settings?.width && settings?.height ? settings.width * settings.height : 0
          let quality: string = 'unknown'
          if (pixels >= 900000) quality = 'high'
          else if (pixels >= 300000) quality = 'medium'
          else if (pixels >= 50000) quality = 'low'

          return {
            peerId: peer.id,
            peerName: peer.name || peer.displayName,
            receivingQuality: quality,
            receivingResolution: settings
              ? `${settings.width}x${settings.height} @ ${settings.frameRate}fps`
              : 'unknown',
            trackId: track.id
          }
        })
      })
    }

    rtkDebug.log('[RTK] 📊 ==============================================')
  }, [meeting, callState.status, participants])

  // Log simulcast info periodically when in call (every 30 seconds)
  useEffect(() => {
    if (callState.status !== 'connected' || !meeting) {
      return
    }

    // Initial log after 5 seconds
    const initialTimeout = setTimeout(() => {
      logSimulcastInfo()
    }, 5000)

    // Then log every 30 seconds
    const interval = setInterval(() => {
      logSimulcastInfo()
    }, 30000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [callState.status, meeting, logSimulcastInfo])

  // Recreate localStream whenever SDK tracks change (not enabled states)
  // Enabled states (mute/unmute) don't require stream recreation - tracks are same objects
  useEffect(() => {
    if (!meeting?.self) return

    const videoTrack = meeting.self.videoTrack
    const audioTrack = meeting.self.audioTrack

    rtkDebug.log('[RTK] SDK tracks changed, recreating localStream:', {
      hasVideo: !!videoTrack,
      hasAudio: !!audioTrack,
      videoEnabled: meeting.self.videoEnabled,
      audioEnabled: meeting.self.audioEnabled
    })

    const newStream = new MediaStream()
    if (videoTrack) newStream.addTrack(videoTrack)
    if (audioTrack) newStream.addTrack(audioTrack)

    setLocalStream(newStream)
  }, [meeting?.self?.videoTrack, meeting?.self?.audioTrack])

  // Subscribe to remote participants from SDK (event-driven)
  useEffect(() => {
    if (!meeting?.participants?.joined || callState.status !== 'connected') {
      return
    }

    rtkDebug.log('[RTK] Setting up participant event listeners...')

    // Helper to update participant list
    const updateParticipantList = () => {
      try {
        const joinedParticipants = meeting.participants?.joined

        if (!joinedParticipants) {
          rtkDebug.log('[RTK] No participants.joined object available')
          return
        }

        // Use .toArray() method (SDK-specific)
        const allParticipants =
          typeof (joinedParticipants as any).toArray === 'function'
            ? (joinedParticipants as any).toArray()
            : Array.from(joinedParticipants.values())

        const remotePeers = allParticipants.filter((p: any) => p.id !== meeting.self?.id)

        rtkDebug.log(`[RTK] Found ${remotePeers.length} remote participants`, {
          totalParticipants: allParticipants.length,
          selfId: meeting.self?.id,
          selfRoomJoined: meeting.self?.roomJoined,
          participantIds: allParticipants.map((p: any) => ({ id: p.id, name: p.name, roomJoined: p.roomJoined })),
          // Debug: check self screen share state
          selfScreenShareEnabled: meeting.self?.screenShareEnabled,
          selfScreenShareTracksRaw: meeting.self?.screenShareTracks,
          selfScreenShareTracksType: typeof meeting.self?.screenShareTracks,
          selfScreenShareTracksIsArray: Array.isArray(meeting.self?.screenShareTracks),
          selfScreenShareTracksCount: Array.isArray(meeting.self?.screenShareTracks)
            ? meeting.self.screenShareTracks.length
            : 0,
          selfScreenShareTracks: Array.isArray(meeting.self?.screenShareTracks)
            ? meeting.self.screenShareTracks.map((t: MediaStreamTrack) => ({
                id: t.id,
                kind: t.kind,
                label: t.label,
                enabled: t.enabled
              }))
            : null
        })

        // Update remote streams
        const newRemoteStreams = new Map<string, MediaStream>()
        const newParticipants: GroupCallParticipant[] = []

        remotePeers.forEach((peer: any) => {
          // Get all keys from peer object to see what's available
          const peerKeys = Object.keys(peer)
          const screenShareKeys = peerKeys.filter(
            k =>
              k.toLowerCase().includes('screen') ||
              k.toLowerCase().includes('share') ||
              k.toLowerCase().includes('display')
          )

          rtkDebug.log('[RTK] Processing remote peer:', {
            id: peer.id,
            name: peer.name,
            displayName: peer.displayName,
            customParticipantId: peer.customParticipantId,
            userId: peer.userId,
            hasVideoTrack: !!peer.videoTrack,
            hasAudioTrack: !!peer.audioTrack,
            // Screen share debugging
            screenShareEnabled: peer.screenShareEnabled,
            screenShareTracks: peer.screenShareTracks,
            screenShareTracksLength: peer.screenShareTracks?.length,
            screenShareKeys,
            allPeerKeys: peerKeys,
            // Check video track details (might be screen share)
            videoTrack: peer.videoTrack
              ? {
                  id: peer.videoTrack.id,
                  kind: peer.videoTrack.kind,
                  label: peer.videoTrack.label,
                  enabled: peer.videoTrack.enabled,
                  readyState: peer.videoTrack.readyState
                }
              : null
          })

          const stream = new MediaStream()

          // Add video track (regular camera, not screen share - screen shares are in peer.screenShareTracks)
          // Note: This track is automatically provided by the SDK with simulcast support.
          // The SFU selects the appropriate quality layer based on network conditions.
          // We can't directly configure preferredRid via React SDK, but the SFU handles this automatically.
          if (peer.videoTrack) {
            stream.addTrack(peer.videoTrack)

            // Log subscriber-side received quality information
            const trackSettings = peer.videoTrack.getSettings?.()
            const trackCapabilities = peer.videoTrack.getCapabilities?.()

            // Determine quality level based on resolution
            let estimatedQuality: 'high' | 'medium' | 'low' | 'unknown' = 'unknown'
            if (trackSettings?.width && trackSettings?.height) {
              const pixels = trackSettings.width * trackSettings.height
              if (pixels >= 900000)
                estimatedQuality = 'high' // ~1280x720 or higher
              else if (pixels >= 300000)
                estimatedQuality = 'medium' // ~640x480
              else if (pixels >= 50000) estimatedQuality = 'low' // ~320x240 or lower
            }

            rtkDebug.log('[RTK] 📥 SUBSCRIBER: Receiving video from peer:', {
              peerId: peer.id,
              peerName: peer.name || peer.displayName,
              videoTrackId: peer.videoTrack.id,
              videoTrackLabel: peer.videoTrack.label,
              receivedQuality: estimatedQuality,
              trackSettings: trackSettings
                ? {
                    width: trackSettings.width,
                    height: trackSettings.height,
                    frameRate: trackSettings.frameRate,
                    aspectRatio: trackSettings.aspectRatio
                  }
                : null,
              trackCapabilities: trackCapabilities
                ? {
                    width: trackCapabilities.width,
                    height: trackCapabilities.height,
                    frameRate: trackCapabilities.frameRate
                  }
                : null,
              note: `SFU selected ${estimatedQuality} quality layer from peer's simulcast streams`
            })

            // Try to get WebRTC stats to see actual RID being received
            // This requires access to RTCRtpReceiver stats
            setTimeout(async () => {
              try {
                // Try to access stats via the track's underlying receiver
                // Note: This might not be directly accessible via React SDK
                const track = peer.videoTrack
                if (track && typeof track.getStats === 'function') {
                  const stats = await track.getStats()
                  if (stats) {
                    const statsEntries = Array.from(stats.entries()) as Array<[string, RTCStats]>
                    const statsArray = statsEntries.map(([id, stat]) => {
                      const statAny = stat as any
                      const statObj: any = {
                        id,
                        type: statAny.type,
                        kind: statAny.kind
                      }

                      // Look for RID information (simulcast layer identifier)
                      if (statAny.rid) statObj.rid = statAny.rid

                      // Look for frame dimensions (actual received quality)
                      if (statAny.frameWidth) {
                        statObj.receivedResolution = {
                          width: statAny.frameWidth,
                          height: statAny.frameHeight,
                          framesPerSecond: statAny.framesPerSecond
                        }
                      }

                      // Look for bitrate information
                      if (statAny.bytesReceived) {
                        statObj.bytesReceived = statAny.bytesReceived
                        statObj.bytesReceivedPerSecond = statAny.bytesReceivedPerSecond
                      }

                      return statObj
                    })

                    // Find the video receiver stats
                    const videoStats = statsArray.find((s: any) => s.kind === 'video' || s.type === 'inbound-rtp')

                    rtkDebug.log('[RTK] 📊 SUBSCRIBER WebRTC Stats for peer:', peer.id, {
                      peerName: peer.name || peer.displayName,
                      allStats: statsArray,
                      videoStats: videoStats,
                      receivedRid: videoStats?.rid || 'unknown',
                      receivedResolution: videoStats?.receivedResolution || 'unknown',
                      note: videoStats?.rid
                        ? `Receiving RID=${videoStats.rid} (${videoStats.rid === 'a' ? 'high' : videoStats.rid === 'b' ? 'medium' : 'low'})`
                        : 'RID not available in stats (may be SFU-internal)'
                    })
                  }
                } else {
                  // Try alternative: access via RTCRtpReceiver if track has receiver property
                  const trackWithReceiver = track as any
                  if (trackWithReceiver._receiver || trackWithReceiver.receiver) {
                    const receiver = trackWithReceiver._receiver || trackWithReceiver.receiver
                    if (receiver && typeof receiver.getStats === 'function') {
                      const stats = await receiver.getStats()
                      const statsEntries = Array.from(stats.entries()) as Array<[string, RTCStats]>
                      rtkDebug.log('[RTK] 📊 SUBSCRIBER WebRTC Stats (via receiver) for peer:', peer.id, {
                        stats: statsEntries.map(([id, stat]) => {
                          const statAny = stat as any
                          return {
                            id,
                            type: statAny.type,
                            ...(statAny.rid && { rid: statAny.rid }),
                            ...(statAny.frameWidth && {
                              width: statAny.frameWidth,
                              height: statAny.frameHeight
                            })
                          }
                        })
                      })
                    }
                  }
                }
              } catch (err) {
                // Stats might not be accessible - that's okay
                rtkDebug.debug('[RTK] Could not get WebRTC stats for received track (expected):', err)
              }
            }, 3000) // Wait 3s for track to be fully established

            // Set up periodic quality monitoring for this peer
            const qualityMonitorInterval = setInterval(async () => {
              try {
                const track = peer.videoTrack
                if (!track || track.readyState === 'ended') {
                  clearInterval(qualityMonitorInterval)
                  return
                }

                const settings = track.getSettings?.()
                if (settings) {
                  const pixels = (settings.width || 0) * (settings.height || 0)
                  let quality: string = 'unknown'
                  if (pixels >= 900000) quality = 'high'
                  else if (pixels >= 300000) quality = 'medium'
                  else if (pixels >= 50000) quality = 'low'

                  rtkDebug.log('[RTK] 📥 SUBSCRIBER Quality Monitor - Peer:', peer.id, {
                    peerName: peer.name || peer.displayName,
                    currentQuality: quality,
                    resolution: `${settings.width}x${settings.height}`,
                    frameRate: settings.frameRate,
                    timestamp: new Date().toISOString()
                  })
                }
              } catch {
                clearInterval(qualityMonitorInterval)
              }
            }, 10000) // Monitor every 10 seconds

            // Store interval for cleanup
            if (!(window as any).rtkQualityMonitors) {
              ;(window as any).rtkQualityMonitors = new Map()
            }
            ;(window as any).rtkQualityMonitors.set(peer.id, qualityMonitorInterval)
          }

          // Always add audio track if available (microphone audio, separate from screen share)
          // Screen share tracks are handled separately by the component and don't include audio
          if (peer.audioTrack) {
            stream.addTrack(peer.audioTrack)
            const existingStream = remoteStreams.get(peer.id)
            const existingAudioTrack = existingStream?.getAudioTracks()[0]
            const audioTrackChanged = existingAudioTrack?.id !== peer.audioTrack.id

            rtkDebug.log('[RTK] 🔊 [REMOTE AUDIO DEBUG] Added audio track to stream for peer:', peer.id, {
              audioTrackId: peer.audioTrack.id,
              audioTrackLabel: peer.audioTrack.label,
              audioTrackEnabled: peer.audioTrack.enabled,
              audioTrackReadyState: peer.audioTrack.readyState,
              audioTrackMuted: peer.audioTrack.muted,
              hadExistingAudioTrack: !!existingAudioTrack,
              existingAudioTrackId: existingAudioTrack?.id,
              audioTrackChanged,
              peerVideoEnabled: peer.videoEnabled,
              peerAudioEnabled: peer.audioEnabled,
              timestamp: new Date().toISOString()
            })
          } else {
            const existingStream = remoteStreams.get(peer.id)
            const hadAudioTrack = !!existingStream?.getAudioTracks()[0]

            rtkDebug.log('[RTK] 🔊 [REMOTE AUDIO DEBUG] ⚠️ No audio track available for peer:', peer.id, {
              hadAudioTrack,
              existingAudioTrackId: existingStream?.getAudioTracks()[0]?.id,
              peerVideoEnabled: peer.videoEnabled,
              peerAudioEnabled: peer.audioEnabled,
              timestamp: new Date().toISOString()
            })
          }

          const streamTracks = stream.getTracks()
          rtkDebug.log('[RTK] Stream created for peer:', peer.id, {
            totalTracks: streamTracks.length,
            videoTracks: streamTracks.filter(t => t.kind === 'video').length,
            audioTracks: streamTracks.filter(t => t.kind === 'audio').length,
            trackIds: streamTracks.map(t => ({ id: t.id, kind: t.kind, label: t.label }))
          })

          if (stream.getTracks().length > 0) {
            newRemoteStreams.set(peer.id, stream)

            newParticipants.push({
              id: peer.customParticipantId || peer.id,
              odId: peer.customParticipantId || peer.id,
              odName: peer.name || 'Unknown',
              avatarUrl: peer.picture,
              stream
            })
          }
        })

        setRemoteStreams(newRemoteStreams)

        // Add local participant to list
        if (currentUser) {
          setParticipants([
            {
              ...currentUser,
              stream: localStream || undefined
            },
            ...newParticipants
          ])
        }
      } catch (error) {
        rtkDebug.error('[RTK] Error updating remote participants:', error)
      }
    }

    // Listen for participant join events
    const handleParticipantJoined = (participant: any) => {
      rtkDebug.log('[RTK] Participant joined event:', participant.id, participant.name)

      // Listen to track changes for this new participant
      if (participant && typeof participant.on === 'function') {
        participant.on('trackPublished', () => {
          rtkDebug.log('[RTK] Remote participant track published:', participant.id)
          updateParticipantList()
        })
        participant.on('trackUnpublished', () => {
          rtkDebug.log('[RTK] Remote participant track unpublished:', participant.id)
          updateParticipantList()
        })
      }

      updateParticipantList()
    }

    const handleParticipantLeft = (participant: any) => {
      rtkDebug.log('[RTK] Participant left event:', participant.id, participant.name)
      updateParticipantList()

      // Clean up hand-raised state for this participant
      setCallState(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [participant.userId || participant.customParticipantId || participant.id]: _removed, ...rest } =
          prev.remoteHandsRaised
        return { ...prev, remoteHandsRaised: rest }
      })
    }

    // Attach event listeners if SDK supports them
    const joined = meeting.participants.joined as any
    if (typeof joined.on === 'function') {
      joined.on('participantJoined', handleParticipantJoined)
      joined.on('participantLeft', handleParticipantLeft)
      rtkDebug.log('[RTK] Event listeners attached')
    }

    // Also attach track listeners to existing participants
    if (joined && typeof joined.forEach === 'function') {
      joined.forEach((participant: any) => {
        if (participant.id !== meeting.self?.id && typeof participant.on === 'function') {
          participant.on('trackPublished', () => {
            rtkDebug.log('[RTK] Remote participant track published:', participant.id)
            updateParticipantList()
          })
          participant.on('trackUnpublished', () => {
            rtkDebug.log('[RTK] Remote participant track unpublished:', participant.id)
            updateParticipantList()
          })
        }
      })
    }

    // Define event handlers (outside if block so they're accessible in cleanup)
    // Listen to audioUpdate event - sync our state with SDK state
    const handleAudioUpdate = (event: any) => {
      if (!meeting?.self) return

      const { audioEnabled } = event

      rtkDebug.log('[RTK] 🎤 audioUpdate event fired:', {
        audioEnabled,
        sdkAudioEnabled: meeting.self.audioEnabled,
        currentStateIsMuted: callState.isMuted
      })

      // Update our state to match SDK state
      setCallState(prev => ({ ...prev, isMuted: !audioEnabled }))
    }

    // Listen to videoUpdate event - sync our state with SDK state
    const handleVideoUpdate = (event: any) => {
      if (!meeting?.self) return

      const { videoEnabled } = event

      rtkDebug.log('[RTK] 📹 videoUpdate event fired:', {
        videoEnabled,
        sdkVideoEnabled: meeting.self.videoEnabled,
        currentStateVideoEnabled: callState.isVideoEnabled
      })

      // Update our state to match SDK state
      setCallState(prev => ({ ...prev, isVideoEnabled: videoEnabled }))
    }

    const handleScreenShareUpdate = (event: any) => {
      // Extract tracks from event (might be various structures)
      let tracks: MediaStreamTrack[] = []
      if (event?.screenShareTracks) {
        const tracksRaw = event.screenShareTracks
        if (Array.isArray(tracksRaw)) {
          tracks = tracksRaw.filter((t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack)
        } else if (tracksRaw && typeof tracksRaw === 'object' && 'get' in tracksRaw && 'set' in tracksRaw) {
          const mapLike = tracksRaw as Map<any, any>
          if (mapLike instanceof Map) {
            tracks = Array.from(mapLike.values()).filter(
              (t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack
            )
          }
        } else if (tracksRaw && typeof tracksRaw === 'object' && 'has' in tracksRaw && 'add' in tracksRaw) {
          const setLike = tracksRaw as Set<any>
          if (setLike instanceof Set) {
            tracks = Array.from(setLike).filter((t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack)
          }
        } else if (typeof tracksRaw === 'object' && tracksRaw !== null) {
          tracks = Object.values(tracksRaw).filter((t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack)
        }
      }

      rtkDebug.log('[RTK] 📺 Screen share update event:', {
        screenShareEnabled: event?.screenShareEnabled,
        screenShareTracksCount: tracks.length,
        screenShareTrackIds: tracks.map(t => t.id),
        screenShareTracksRaw: event?.screenShareTracks,
        screenShareTracksRawType: typeof event?.screenShareTracks,
        screenShareTracksRawIsArray: Array.isArray(event?.screenShareTracks),
        screenShareTracksRawIsMap: event?.screenShareTracks instanceof Map,
        screenShareTracksRawIsSet: event?.screenShareTracks instanceof Set,
        fullEvent: event
      })

      // Update state based on event
      if (event?.screenShareEnabled !== undefined) {
        setCallState(prev => ({ ...prev, isScreenSharing: event.screenShareEnabled }))
      }
    }

    // Attach event listeners if SDK supports them
    const self = meeting.self as any
    if (self && typeof self.on === 'function') {
      self.on('audioUpdate', handleAudioUpdate)
      self.on('videoUpdate', handleVideoUpdate)
      self.on('screenShareUpdate', handleScreenShareUpdate)
      rtkDebug.log('[RTK] Audio, video, and screen share event listeners attached')
    }

    // Initial update
    updateParticipantList()

    return () => {
      const joined = meeting.participants?.joined as any
      if (typeof joined?.off === 'function') {
        joined.off('participantJoined', handleParticipantJoined)
        joined.off('participantLeft', handleParticipantLeft)
      }

      // Remove event listeners
      const self = meeting.self as any
      if (self && typeof self.off === 'function') {
        try {
          self.off('audioUpdate', handleAudioUpdate)
          self.off('videoUpdate', handleVideoUpdate)
          self.off('screenShareUpdate', handleScreenShareUpdate)
        } catch {
          // Ignore - SDK will handle cleanup
        }
      }
    }
  }, [meeting, callState.status, localStream, currentUser])

  // WebSocket event listeners for raise hand and reactions
  useEffect(() => {
    rtkDebug.log('[RTK] Raise hand useEffect triggered', {
      hasSocket: !!wsClient?.getSocket(),
      roomId: callState.roomId,
      userId: currentUser?.id
    })

    const socket = wsClient?.getSocket()
    if (!socket || !callState.roomId || !currentUser) {
      rtkDebug.warn('[RTK] ⚠️ Cannot attach raise hand listener', {
        hasSocket: !!socket,
        hasRoomId: !!callState.roomId,
        hasCurrentUser: !!currentUser
      })
      return
    }

    // Handle raise hand state updates
    const handleHandUpdate = (data: { participantId: string; handRaised: boolean }) => {
      rtkDebug.log('[RTK] ✋ Received hand-update event:', data)

      if (data.participantId === currentUser.id) {
        // Update local user's hand state
        rtkDebug.log('[RTK] ✋ Updating own hand raise state:', data.handRaised)
        setCallState(prev => ({ ...prev, handRaised: data.handRaised }))
      } else {
        // Update remote participant's hand state
        rtkDebug.log('[RTK] ✋ Updating remote participant hand state:', {
          participantId: data.participantId,
          handRaised: data.handRaised
        })
        setCallState(prev => ({
          ...prev,
          remoteHandsRaised: {
            ...prev.remoteHandsRaised,
            [data.participantId]: data.handRaised
          }
        }))
      }
    }

    // Listen for events
    socket.on('group-call:hand-update', handleHandUpdate)
    rtkDebug.log('[RTK] ✅ WebSocket listener attached for raise hand')

    return () => {
      socket.off('group-call:hand-update', handleHandUpdate)
      rtkDebug.log('[RTK] WebSocket listener removed for raise hand')
    }
  }, [wsClient, callState.roomId, currentUser])

  // Auto-apply background effect on call connect if enabled
  useEffect(() => {
    // Only run when call becomes connected AND video is enabled AND background is enabled in state
    if (
      callState.status !== 'connected' ||
      !callState.isVideoEnabled ||
      !callState.backgroundEnabled ||
      !meeting?.self?.videoTrack
    ) {
      return
    }

    // Check if background is already applied (to avoid re-applying)
    const hasActiveMiddleware = virtualBackgroundRef.current !== null

    if (hasActiveMiddleware) {
      rtkDebug.log('[RTK] 🎨 Background effect already active, skipping auto-apply')
      return
    }

    // Apply background effect automatically when enabled
    rtkDebug.log('[RTK] 🎨 Auto-applying background effect (enabled by default or user preference)')

    const applyBackground = async () => {
      try {
        if (!virtualBackgroundRef.current) {
          virtualBackgroundRef.current = new RTKVirtualBackground()
        }
        await virtualBackgroundRef.current.initialize(meeting)
        await virtualBackgroundRef.current.enableBackground(meeting)
        rtkDebug.log('[RTK] ✅ Background effect auto-applied successfully')

        // Ensure localStorage reflects the enabled state
        try {
          localStorage.setItem(PREF_BACKGROUND_ENABLED_KEY, 'true')
        } catch {
          // Ignore storage errors
        }
      } catch (error) {
        rtkDebug.error('[RTK] ❌ Failed to auto-apply background effect:', error)
        // Disable the state if auto-apply fails
        setCallState(prev => ({ ...prev, backgroundEnabled: false }))
        try {
          localStorage.setItem(PREF_BACKGROUND_ENABLED_KEY, 'false')
        } catch {
          // Ignore storage errors
        }
      }
    }

    applyBackground()
  }, [callState.status, callState.isVideoEnabled, callState.backgroundEnabled, meeting?.self?.videoTrack])

  // Listen for incoming invites
  useEffect(() => {
    if (!wsClient) return

    const socket = wsClient.getSocket()
    if (!socket) return

    const handleInvite = (data: {
      meetingId: string
      conversationId: string
      callType: CallType
      conversationName?: string
      from: { id: string; odId: string; odName: string; avatarUrl?: string }
    }) => {
      rtkDebug.log('[RTK] Received group call invite', data)

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
        return // ← DON'T set incomingInvite state!
      }

      // Also ignore if we're in ANY active call (prevents modal from showing)
      // BUT: Allow invite if call state is idle (refs might be stale after call ends)
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

      rtkDebug.log('[RTK] Accepting invite - call is idle', {
        meetingId: data.meetingId,
        conversationId: data.conversationId,
        callStatus: callState.status,
        meetingIdRef: meetingIdRef.current,
        roomIdRef: callStateRoomIdRef.current
      })

      setIncomingInvite({
        roomId: data.meetingId,
        callType: data.callType,
        from: data.from,
        conversationId: data.conversationId, // Store the actual conversationId
        conversationName: data.conversationName || data.conversationId // Use provided name or fallback to conversationId
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
      conversationName?: string // Meeting title from backend
    }) => {
      rtkDebug.log('[RTK] 📞 Conversation call started/updated:', {
        conversationId: data.conversationId,
        roomId: data.roomId,
        participantCount: data.participantIds.length,
        participantIds: data.participantIds,
        startedAt: data.startedAt,
        startedAtType: typeof data.startedAt,
        startedAtValue: data.startedAt ? new Date(data.startedAt).toISOString() : null
      })

      // Update activeConversationCalls FIRST so we can check it below
      setActiveConversationCalls(prev => {
        const newMap = new Map(prev)
        newMap.set(data.conversationId, {
          roomId: data.roomId,
          callType: data.callType,
          participantIds: data.participantIds,
          startedBy: data.startedBy.id,
          startedAt: data.startedAt
        })
        return newMap
      })

      // If conversationName is provided, update currentCallConversationName if we're related to this conversation:
      // 1. We're in this call (roomId matches), OR
      // 2. We're joining this conversation (conversationId matches), OR
      // 3. We're not in any other call (idle/joining with no roomId) - catches joiners before refs are set
      // This ensures joiners see the correct meeting title instead of conversation name
      const isInThisCall = callState.roomId === data.roomId
      const isJoiningThisConversation =
        conversationIdRef.current === data.conversationId || joinCallConversationIdRef.current === data.conversationId
      const isNotInOtherCall = (callState.status === 'idle' || callState.status === 'joining') && !callState.roomId
      const hasIncomingInviteForConversation = incomingInvite?.conversationId === data.conversationId

      // Update if conversationName is provided and we're related to this conversation
      // This ensures joiners get the correct name even if refs aren't set yet
      const shouldUpdate =
        data.conversationName &&
        (isInThisCall || isJoiningThisConversation || isNotInOtherCall || hasIncomingInviteForConversation)

      if (shouldUpdate) {
        setCurrentCallConversationName(data.conversationName)
        rtkDebug.log('[RTK] ✅ Updated conversation name from conversation:call-started:', {
          conversationName: data.conversationName,
          roomId: data.roomId,
          conversationId: data.conversationId,
          isInThisCall,
          isJoiningThisConversation,
          isNotInOtherCall,
          hasIncomingInviteForConversation,
          callStateStatus: callState.status,
          callStateRoomId: callState.roomId,
          conversationIdRef: conversationIdRef.current,
          joinCallConversationIdRef: joinCallConversationIdRef.current
        })
      } else if (data.conversationName) {
        rtkDebug.log('[RTK] ⚠️ Skipped updating conversation name (not related to this conversation):', {
          conversationName: data.conversationName,
          roomId: data.roomId,
          conversationId: data.conversationId,
          isInThisCall,
          isJoiningThisConversation,
          isNotInOtherCall,
          hasIncomingInviteForConversation,
          callStateStatus: callState.status,
          callStateRoomId: callState.roomId,
          conversationIdRef: conversationIdRef.current,
          joinCallConversationIdRef: joinCallConversationIdRef.current
        })
      }

      /**
       * Global Call Timer Synchronization
       *
       * Update startTimeRef with the global call start time from backend.
       * This ensures all participants see the same call duration, matching
       * behavior in MS Teams, Slack, Zoom (global timer, not per-user).
       *
       * Sync timer if:
       * 1. Backend provided a startedAt timestamp
       * 2. Either this is for the current active call OR we're not in a call yet (event arrived early)
       * 3. We don't already have a more accurate local start time
       */
      const currentRoomId = callStateRoomIdRef.current
      const currentlyInCall = isInCallRef.current

      rtkDebug.log('[RTK] ⏱️ Timer sync check:', {
        dataRoomId: data.roomId,
        currentRoomId,
        matches: data.roomId === currentRoomId,
        hasStartedAt: !!data.startedAt,
        currentStartTime: startTimeRef.current,
        isInCall: currentlyInCall
      })

      // Sync timer if we have startedAt and either:
      // - This is for the current call (roomId matches), OR
      // - We're not in a call yet (event arrived before joinCall/startCall completed)
      if (data.startedAt && (data.roomId === currentRoomId || !currentlyInCall)) {
        const globalStartTime = new Date(data.startedAt).getTime()
        // Only update if we don't have a start time yet or if backend time is earlier
        if (!startTimeRef.current || globalStartTime < startTimeRef.current) {
          rtkDebug.log('[RTK] ⏱️ ✅ Syncing to global call timer:', {
            previousStartTime: startTimeRef.current,
            globalStartTime,
            diff: startTimeRef.current ? (startTimeRef.current - globalStartTime) / 1000 : 0,
            reason: data.roomId === callState.roomId ? 'roomId matches' : 'not in call yet (early event)'
          })
          startTimeRef.current = globalStartTime
        } else {
          rtkDebug.log('[RTK] ⏱️ ⏭️ Skipping timer sync (already have earlier time):', {
            currentStartTime: startTimeRef.current,
            globalStartTime
          })
        }
      } else if (data.startedAt && data.roomId !== currentRoomId && currentlyInCall) {
        rtkDebug.log('[RTK] ⏱️ ⚠️ Timer sync skipped - different roomId:', {
          eventRoomId: data.roomId,
          currentRoomId
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

    rtkDebug.log('[RTK] 🎧 Registering WebSocket listeners for:', {
      hasSocket: !!socket,
      socketId: socket.id
    })

    socket.on('rtk-group-call:invite', handleInvite)
    socket.on('rtk-group-call:ended', handleCallEnded)
    socket.on('conversation:call-started', handleConversationCallStarted)
    socket.on('conversation:call-ended', handleConversationCallEnded)

    rtkDebug.log('[RTK] ✅ All WebSocket listeners registered')

    return () => {
      socket.off('rtk-group-call:invite', handleInvite)
      socket.off('rtk-group-call:ended', handleCallEnded)
      socket.off('conversation:call-started', handleConversationCallStarted)
      socket.off('conversation:call-ended', handleConversationCallEnded)
    }
  }, [wsClient, leaveCall, currentUser, callState.status])

  /**
   * Sync timer when callState.roomId is set and we have activeConversationCalls data
   * This handles the case where conversation:call-started event arrived before joinCall/startCall completed
   */
  useEffect(() => {
    if (!callState.roomId || !isInCall) return

    // Find the call info by roomId (meetingId) in activeConversationCalls
    for (const [conversationId, callInfo] of activeConversationCalls.entries()) {
      if (callInfo.roomId === callState.roomId && callInfo.startedAt) {
        const globalStartTime = new Date(callInfo.startedAt).getTime()
        // Only update if we don't have a start time yet or if backend time is earlier
        if (!startTimeRef.current || globalStartTime < startTimeRef.current) {
          rtkDebug.log('[RTK] ⏱️ 🔄 Syncing timer from activeConversationCalls:', {
            conversationId,
            roomId: callState.roomId,
            previousStartTime: startTimeRef.current,
            globalStartTime,
            diff: startTimeRef.current ? (startTimeRef.current - globalStartTime) / 1000 : 0
          })
          startTimeRef.current = globalStartTime
        }
        break
      }
    }
  }, [callState.roomId, isInCall, activeConversationCalls])

  /**
   * Sync timer when activeConversationCalls updates (event arrived)
   * This handles the case where event arrives after joinCall/startCall completed
   */
  useEffect(() => {
    if (!callState.roomId || !isInCall) return

    // Find the call info by roomId (meetingId) in activeConversationCalls
    for (const [conversationId, callInfo] of activeConversationCalls.entries()) {
      if (callInfo.roomId === callState.roomId && callInfo.startedAt) {
        const globalStartTime = new Date(callInfo.startedAt).getTime()
        // Only update if we don't have a start time yet or if backend time is earlier
        if (!startTimeRef.current || globalStartTime < startTimeRef.current) {
          rtkDebug.log('[RTK] ⏱️ 🔄 Syncing timer from activeConversationCalls update:', {
            conversationId,
            roomId: callState.roomId,
            previousStartTime: startTimeRef.current,
            globalStartTime,
            diff: startTimeRef.current ? (startTimeRef.current - globalStartTime) / 1000 : 0
          })
          startTimeRef.current = globalStartTime
        }
        break
      }
    }
  }, [activeConversationCalls, callState.roomId, isInCall])

  // Cleanup on unmount
  // Cleanup ONLY on component unmount
  // NOTE: Empty dependency array = only runs on mount/unmount
  // NOTE: 'meeting' and 'localStream' are intentionally NOT in dependencies
  // to prevent premature cleanup when they change during normal operation
  useEffect(() => {
    return () => {
      rtkDebug.log('[RTK] Component unmounting - final cleanup', {
        hasTimer: !!durationTimerRef.current,
        hasMeeting: !!meeting,
        meetingId: meetingIdRef.current
      })

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
      }

      // Stop local media tracks
      const currentLocalStream = localStream
      if (currentLocalStream) {
        currentLocalStream.getTracks().forEach(track => track.stop())
      }

      // Leave meeting if still connected
      if (meeting && meeting.self?.roomJoined) {
        meeting.leave().catch((err: any) => rtkDebug.error('[RTK] Final cleanup leave error:', err))
      }
    }
  }, []) // Empty array - only on unmount!

  // [DEBUG] Expose functions to console for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).rtkLeaveCall = leaveCall
      ;(window as any).rtkToggleMute = toggleMute
      ;(window as any).rtkToggleVideo = toggleVideo
      ;(window as any).rtkCallState = callState
      ;(window as any).rtkLogSimulcastInfo = logSimulcastInfo
      rtkDebug.log('[RTK] 🔧 Debug functions exposed to console:', {
        rtkLeaveCall: 'Leave the current call',
        rtkToggleMute: 'Toggle audio mute',
        rtkToggleVideo: 'Toggle video on/off',
        rtkCallState: 'Current call state',
        rtkLogSimulcastInfo: 'Log comprehensive simulcast status (publisher & subscriber info)'
      })
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).rtkLeaveCall
        delete (window as any).rtkToggleMute
        delete (window as any).rtkToggleVideo
        delete (window as any).rtkCallState
        delete (window as any).rtkLogSimulcastInfo
      }
    }
  }, [leaveCall, toggleMute, toggleVideo, callState])

  return {
    callState,
    isInCall,
    isHost,
    localStream,
    remoteStreams,
    participants,
    pendingInvites,
    incomingInvite,
    activeConversationCalls,
    currentCallConversationName, // Return stored conversation name for current call
    startCall,
    joinCall: joinCallWrapper,
    acceptInvite,
    declineInvite,
    leaveCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    setVideoQuality,
    toggleMinimize,
    toggleBackground,
    toggleRaiseHand,
    sendReaction,
    inviteToCall,
    reconnectParticipant,
    getConnectionDiagnostics,
    meeting // Expose meeting object for RealtimeKitProvider
  }
}
