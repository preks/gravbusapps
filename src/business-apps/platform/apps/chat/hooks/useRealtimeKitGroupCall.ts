/**
 * useRealtimeKitGroupCall Hook - Manages group calls using Cloudflare Realtime Kit
 *
 * This hook provides the same interface as useGroupCall but uses Cloudflare's SFU
 * infrastructure instead of mesh topology, enabling better scalability for group calls.
 *
 * Phase 2: Full SDK integration with media routing through Cloudflare SFU
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
    return saved === 'true'
  } catch {
    return false
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
  backgroundEnabled: getSavedBackgroundEnabled(),
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

  // Refs
  const authTokenRef = useRef<string | null>(null)
  const meetingIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const callStateRoomIdRef = useRef<string | null>(null)
  const isInCallRef = useRef<boolean>(false)
  const joinCallConversationIdRef = useRef<string | null>(null)

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

  /**
   * Start a new group call (host)
   */
  const startCall = useCallback(
    async (roomId: string, callType: CallType, participantsToInvite: CallParticipant[]): Promise<void> => {
      if (!currentUser || !apiClient || !wsClient) {
        console.error('[RTK] Cannot start call: missing requirements')
        return
      }

      try {
        console.log('[RTK] Starting Realtime Kit group call with SDK...')
        console.log('[RTK] Current user (HOST):', {
          id: currentUser.id,
          odId: currentUser.odId,
          odName: currentUser.odName,
          avatarUrl: currentUser.avatarUrl
        })

        setCallState(prev => ({ ...prev, status: 'joining' }))

        // 1. Create meeting via backend and get auth token (sending host display name)
        console.log('[RTK] Sending to createMeeting:', {
          conversationId: roomId,
          callType,
          displayName: currentUser.odName,
          firstName: undefined,
          lastName: undefined
        })
        const meetingResponse = await apiClient.createMeeting(
          roomId,
          callType,
          currentUser.odName, // displayName
          undefined, // firstName
          undefined // lastName
        )
        const { meetingId, hostAuthToken } = meetingResponse.data

        authTokenRef.current = hostAuthToken
        meetingIdRef.current = meetingId

        console.log('[RTK] Initializing SDK with auth token...')

        // 2. Initialize Cloudflare SDK with auth token
        const initializedMeeting = await initMeeting({
          authToken: hostAuthToken,
          defaults: {
            audio: true,
            video: callType === 'video'
          }
        }).catch((err: any) => {
          console.error('[RTK] SDK initialization failed:', err)
          throw new Error(`SDK init failed: ${err.message}`)
        })

        console.log('[RTK] SDK initialized, checking meeting object...', {
          hasInitializedMeeting: !!initializedMeeting,
          hasMeetingHook: !!meeting
        })

        // Wait for meeting object to be available
        // initMeeting might return the meeting or update the hook's meeting state
        const meetingToUse = (initializedMeeting as any) || meeting

        if (!meetingToUse || typeof meetingToUse.join !== 'function') {
          throw new Error('Meeting object not available after initialization')
        }

        console.log('[RTK] Meeting object ready')

        console.log('[RTK] Joining meeting via SDK...', { meetingId })

        // 3. Join the meeting (connects to Cloudflare SFU)
        await meetingToUse.join()

        console.log('[RTK] SDK joined successfully (HOST)', {
          meetingId,
          selfId: meetingToUse.self?.id,
          selfUserId: meetingToUse.self?.userId,
          selfRoomJoined: meetingToUse.self?.roomJoined,
          selfRoomState: meetingToUse.self?.roomState,
          participantsJoined: meetingToUse.participants?.joined?.size || 0
        })

        // ⚠️ CRITICAL: Wait for actual Session connection (roomJoined: true)
        console.log('[RTK] Waiting for Session connection...')
        const sessionTimeout = 10000 // 10 seconds max
        const startTime = Date.now()

        while (!meetingToUse.self?.roomJoined && Date.now() - startTime < sessionTimeout) {
          console.log('[RTK] Waiting for roomJoined... (elapsed:', Date.now() - startTime, 'ms)')
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        if (meetingToUse.self?.roomJoined) {
          console.log('[RTK] ✅ Successfully joined Session!', {
            elapsed: Date.now() - startTime,
            roomState: meetingToUse.self?.roomState
          })
        } else {
          console.error('[RTK] ❌ Failed to join Session - timeout after', sessionTimeout, 'ms')
          throw new Error('Failed to join Cloudflare Session - connection timeout')
        }

        // 4. Listen for disconnect events (to debug why roomJoined flips to false)
        if (typeof meetingToUse.self?.on === 'function') {
          meetingToUse.self.on('roomLeft', (event: any) => {
            console.error('[RTK] ❌ roomLeft event fired!', {
              state: event?.state,
              reason: event?.reason,
              message: event?.message,
              fullEvent: event
            })
          })
          console.log('[RTK] Listening for roomLeft events...')
        }

        // 5. Enable media tracks (publishes to Cloudflare SFU)
        console.log('[RTK] Enabling audio/video tracks...')
        try {
          await meetingToUse.self?.enableAudio()
          console.log('[RTK] ✅ Audio enabled and published to SFU')
        } catch (err) {
          console.error('[RTK] Failed to enable audio:', err)
        }

        if (callType === 'video') {
          try {
            await meetingToUse.self?.enableVideo()
            console.log('[RTK] ✅ Video enabled and published to SFU')
          } catch (err) {
            console.error('[RTK] Failed to enable video:', err)
          }
        }

        // 6. Local media will be automatically set by the useEffect watching SDK tracks
        console.log('[RTK] Local tracks will be set by useEffect:', {
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
          backgroundEnabled: getSavedBackgroundEnabled(),
          startTime: Date.now(),
          duration: 0
        })

        setActiveCallInStorage(currentUser.id, meetingId)

        // Send invites via WebSocket
        emitSocketEvent('rtk-group-call:start', {
          conversationId: roomId,
          meetingId,
          callType,
          from: {
            id: currentUser.id,
            odId: currentUser.odId,
            odName: currentUser.odName,
            avatarUrl: currentUser.avatarUrl
          },
          participants: participantsToInvite
        })

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
            console.log('[RTK] ⏱️ Duration timer tick (HOST):', {
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

        console.log('[RTK] Call started successfully with SDK')
      } catch (error) {
        console.error('[RTK] Failed to start call:', error)
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
        console.error('[RTK] Cannot join call: missing requirements')
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
        console.log('[RTK] Joining Realtime Kit group call with SDK...', { roomId, conversationId })
        console.log('[RTK] Current user (PARTICIPANT):', {
          id: currentUser.id,
          odId: currentUser.odId,
          odName: currentUser.odName,
          avatarUrl: currentUser.avatarUrl
        })

        setCallState(prev => ({ ...prev, status: 'joining' }))

        // 1. Get auth token for this meeting
        console.log('[RTK] Calling addParticipant API with meetingId:', roomId)
        console.log('[RTK] Sending to addParticipant:', {
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
        console.log('[RTK] addParticipant response:', participantResponse)
        const { authToken } = participantResponse.data

        authTokenRef.current = authToken
        meetingIdRef.current = roomId

        console.log('[RTK] Initializing SDK with auth token...')

        // 2. Initialize Cloudflare SDK with auth token
        const initializedMeeting = await initMeeting({
          authToken,
          defaults: {
            audio: true,
            video: callType === 'video'
          }
        })

        console.log('[RTK] SDK initialized, checking meeting object...')

        // Wait for meeting object to be available
        // initMeeting might return the meeting or update the hook's meeting state
        const meetingToUse = (initializedMeeting as any) || meeting

        if (!meetingToUse || typeof meetingToUse.join !== 'function') {
          throw new Error('Meeting object not available after initialization')
        }

        console.log('[RTK] Meeting object ready')

        console.log('[RTK] Joining meeting via SDK...', { meetingId: roomId })

        // 3. Join the meeting (connects to Cloudflare SFU)
        await meetingToUse.join()

        console.log('[RTK] SDK joined successfully (PARTICIPANT)', {
          meetingId: roomId,
          selfId: meetingToUse.self?.id,
          selfUserId: meetingToUse.self?.userId,
          selfRoomJoined: meetingToUse.self?.roomJoined,
          selfRoomState: meetingToUse.self?.roomState,
          participantsJoined: meetingToUse.participants?.joined?.size || 0
        })

        // ⚠️ CRITICAL: Wait for actual Session connection (roomJoined: true)
        console.log('[RTK] Waiting for Session connection...')
        const sessionTimeout = 10000 // 10 seconds max
        const startTime = Date.now()

        while (!meetingToUse.self?.roomJoined && Date.now() - startTime < sessionTimeout) {
          console.log('[RTK] Waiting for roomJoined... (elapsed:', Date.now() - startTime, 'ms)')
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        if (meetingToUse.self?.roomJoined) {
          console.log('[RTK] ✅ Successfully joined Session!', {
            elapsed: Date.now() - startTime,
            roomState: meetingToUse.self?.roomState
          })
        } else {
          console.error('[RTK] ❌ Failed to join Session - timeout after', sessionTimeout, 'ms')
          throw new Error('Failed to join Cloudflare Session - connection timeout')
        }

        // 4. Listen for disconnect events (to debug why roomJoined flips to false)
        if (typeof meetingToUse.self?.on === 'function') {
          meetingToUse.self.on('roomLeft', (event: any) => {
            console.error('[RTK] ❌ roomLeft event fired!', {
              state: event?.state,
              reason: event?.reason,
              message: event?.message,
              fullEvent: event
            })
          })
          console.log('[RTK] Listening for roomLeft events...')
        }

        // 5. Enable media tracks (publishes to Cloudflare SFU)
        console.log('[RTK] Enabling audio/video tracks...')
        try {
          await meetingToUse.self?.enableAudio()
          console.log('[RTK] ✅ Audio enabled and published to SFU')
        } catch (err) {
          console.error('[RTK] Failed to enable audio:', err)
        }

        if (callType === 'video') {
          try {
            await meetingToUse.self?.enableVideo()
            console.log('[RTK] ✅ Video enabled and published to SFU')
          } catch (err) {
            console.error('[RTK] Failed to enable video:', err)
          }
        }

        // 6. Local media will be automatically set by the useEffect watching SDK tracks
        console.log('[RTK] Local tracks will be set by useEffect:', {
          hasAudio: !!meetingToUse.self?.audioTrack,
          hasVideo: !!meetingToUse.self?.videoTrack
        })

        // Update state
        // Try to get global startedAt from activeConversationCalls using conversationId
        const callInfo = conversationId ? activeConversationCalls.get(conversationId) : null
        console.log('[RTK] 🔍 Looking for call info in activeConversationCalls:', {
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
        console.log('[RTK] ⏱️ Join call timer setup:', {
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
          conversationId: roomId,
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
            console.log('[RTK] ⏱️ Duration timer tick (PARTICIPANT):', {
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

        console.log('[RTK] Joined call successfully with SDK')
      } catch (error) {
        console.error('[RTK] Failed to join call:', error)
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

    const { roomId, callType } = incomingInvite
    setIncomingInvite(null)
    await joinCall(roomId, callType)
  }, [incomingInvite, joinCall])

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

    console.log('[RTK] Leaving call via SDK...')
    console.log('[RTK] Leave call state:', {
      roomId: callState.roomId,
      meetingIdRef: meetingIdRef.current,
      currentUserId: currentUser?.id
    })

    try {
      // 1. Leave via Cloudflare SDK
      if (meeting && meeting.self?.roomJoined) {
        await meeting.leave()
        console.log('[RTK] SDK leave successful')
      }
    } catch (error) {
      console.error('[RTK] Error leaving via SDK:', error)
    }

    // 2. Stop local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }

    // 3. Notify via WebSocket that participant left
    if (callState.roomId && currentUser) {
      const leaveEventData = {
        conversationId: callState.roomId,
        meetingId: meetingIdRef.current || callState.roomId,
        participantId: currentUser.id
      }
      console.log('[RTK] 📤 Sending rtk-group-call:participant-left:', leaveEventData)
      emitSocketEvent('rtk-group-call:participant-left', leaveEventData)
    }

    // 4. Clean up
    const duration = callState.duration
    const roomId = callState.roomId

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }

    clearActiveCallFromStorage()
    authTokenRef.current = null
    meetingIdRef.current = null
    setLocalStream(null)
    setRemoteStreams(new Map())
    setParticipants([])
    setCallState(initialCallState)

    onCallEnded?.(roomId, duration)

    console.log('[RTK] Left call')
  }, [callState, localStream, meeting, emitSocketEvent, onCallEnded, currentUser])

  /**
   * Toggle mute (using SDK)
   * Simple approach: Let SDK manage state, just call enable/disable
   */
  const toggleMute = useCallback((): boolean => {
    console.log('[RTK] 🎤 toggleMute called!', {
      hasMeeting: !!meeting,
      hasSelf: !!meeting?.self,
      currentIsMuted: callState.isMuted
    })

    if (!meeting?.self) {
      console.log('[RTK] ⚠️ toggleMute: No meeting.self, returning early')
      return callState.isMuted
    }

    const currentEnabled = meeting.self.audioEnabled ?? false
    const newMuted = currentEnabled // if audio is enabled, we're muting (newMuted = true)

    console.log('[RTK] Toggling audio:', currentEnabled ? 'disable' : 'enable', {
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
    console.log('[RTK] 📹 toggleVideo called!', {
      hasMeeting: !!meeting,
      hasSelf: !!meeting?.self,
      currentIsVideoEnabled: callState.isVideoEnabled
    })

    if (!meeting?.self) {
      console.log('[RTK] ⚠️ toggleVideo: No meeting.self, returning early')
      return callState.isVideoEnabled
    }

    const currentEnabled = meeting.self.videoEnabled ?? false
    const newEnabled = !currentEnabled

    console.log('[RTK] Toggling video:', currentEnabled ? 'disable' : 'enable', {
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
      console.error('[RTK] Cannot toggle screen share: meeting.self not available')
      return false
    }

    try {
      const currentSharing = callState.isScreenSharing

      if (currentSharing) {
        // Stop screen sharing
        await meeting.self.disableScreenShare()
        setCallState(prev => ({ ...prev, isScreenSharing: false }))
        console.log('[RTK] ✅ Screen share stopped via SDK')
        return false
      } else {
        // Start screen sharing
        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          const error = new Error('Screen sharing is not supported in this browser')
          console.error('[RTK] Screen share error:', error.message)
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

        console.log('[RTK] ✅ Screen share started via SDK', {
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
          console.warn('[RTK] ⚠️ Screen share enabled but no tracks available yet - may need more time', {
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
      console.error('[RTK] ❌ Failed to toggle screen share:', error)

      // Reset state on error
      setCallState(prev => ({ ...prev, isScreenSharing: false }))

      // Provide user-friendly error messages
      const errorMessage = error?.message || 'Unknown error'
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        console.error('[RTK] Screen share permission denied by user')
      } else if (errorMessage.includes('NotSupportedError') || errorMessage.includes('not supported')) {
        console.error('[RTK] Screen sharing not supported in this browser')
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('No screen')) {
        console.error('[RTK] No screen or window available for sharing')
      }

      return false
    }
  }, [meeting, callState.isScreenSharing])

  /**
   * Set video quality
   */
  const setVideoQuality = useCallback(async (quality: VideoQuality): Promise<void> => {
    setCallState(prev => ({ ...prev, videoQuality: quality }))
    try {
      localStorage.setItem(PREF_VIDEO_QUALITY_KEY, quality)
    } catch {
      // Ignore
    }
  }, [])

  /**
   * Toggle minimize
   */
  const toggleMinimize = useCallback(() => {
    setCallState(prev => ({ ...prev, isMinimized: !prev.isMinimized }))
  }, [])

  /**
   * Toggle background effects
   */
  const toggleBackground = useCallback(() => {
    setCallState(prev => {
      const newValue = !prev.backgroundEnabled
      try {
        localStorage.setItem(PREF_BACKGROUND_ENABLED_KEY, newValue.toString())
      } catch {
        // Ignore
      }
      return { ...prev, backgroundEnabled: newValue }
    })
  }, [])

  /**
   * Invite additional participants mid-call
   */
  const inviteToCall = useCallback(
    (participantsToInvite: CallParticipant[]) => {
      if (!callState.roomId || !currentUser) {
        return
      }

      console.log('[RTK] Inviting participants to call')

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
    console.log('[RTK] Reconnect not needed for Realtime Kit')
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

  // Recreate localStream whenever SDK tracks OR enabled states change (like the simple test)
  useEffect(() => {
    if (!meeting?.self) return

    const videoTrack = meeting.self.videoTrack
    const audioTrack = meeting.self.audioTrack

    console.log('[RTK] SDK tracks/enabled changed, recreating localStream:', {
      hasVideo: !!videoTrack,
      hasAudio: !!audioTrack,
      videoEnabled: meeting.self.videoEnabled,
      audioEnabled: meeting.self.audioEnabled
    })

    const newStream = new MediaStream()
    if (videoTrack) newStream.addTrack(videoTrack)
    if (audioTrack) newStream.addTrack(audioTrack)

    setLocalStream(newStream)
  }, [meeting?.self?.videoTrack, meeting?.self?.audioTrack, meeting?.self?.videoEnabled, meeting?.self?.audioEnabled])

  // Subscribe to remote participants from SDK (event-driven)
  useEffect(() => {
    if (!meeting?.participants?.joined || callState.status !== 'connected') {
      return
    }

    console.log('[RTK] Setting up participant event listeners...')

    // Helper to update participant list
    const updateParticipantList = () => {
      try {
        const joinedParticipants = meeting.participants?.joined

        if (!joinedParticipants) {
          console.log('[RTK] No participants.joined object available')
          return
        }

        // Use .toArray() method (SDK-specific)
        const allParticipants =
          typeof (joinedParticipants as any).toArray === 'function'
            ? (joinedParticipants as any).toArray()
            : Array.from(joinedParticipants.values())

        const remotePeers = allParticipants.filter((p: any) => p.id !== meeting.self?.id)

        console.log(`[RTK] Found ${remotePeers.length} remote participants`, {
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

          console.log('[RTK] Processing remote peer:', {
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
          if (peer.videoTrack) {
            stream.addTrack(peer.videoTrack)
            console.log('[RTK] Added video track to stream for peer:', peer.id, {
              videoTrackId: peer.videoTrack.id,
              videoTrackLabel: peer.videoTrack.label,
              videoTrackKind: peer.videoTrack.kind
            })
          }

          // Always add audio track if available (microphone audio, separate from screen share)
          // Screen share tracks are handled separately by the component and don't include audio
          if (peer.audioTrack) {
            stream.addTrack(peer.audioTrack)
            const existingStream = remoteStreams.get(peer.id)
            const existingAudioTrack = existingStream?.getAudioTracks()[0]
            const audioTrackChanged = existingAudioTrack?.id !== peer.audioTrack.id

            console.log('[RTK] 🔊 [REMOTE AUDIO DEBUG] Added audio track to stream for peer:', peer.id, {
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

            console.log('[RTK] 🔊 [REMOTE AUDIO DEBUG] ⚠️ No audio track available for peer:', peer.id, {
              hadAudioTrack,
              existingAudioTrackId: existingStream?.getAudioTracks()[0]?.id,
              peerVideoEnabled: peer.videoEnabled,
              peerAudioEnabled: peer.audioEnabled,
              timestamp: new Date().toISOString()
            })
          }

          const streamTracks = stream.getTracks()
          console.log('[RTK] Stream created for peer:', peer.id, {
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
        console.error('[RTK] Error updating remote participants:', error)
      }
    }

    // Listen for participant join events
    const handleParticipantJoined = (participant: any) => {
      console.log('[RTK] Participant joined event:', participant.id, participant.name)

      // Listen to track changes for this new participant
      if (participant && typeof participant.on === 'function') {
        participant.on('trackPublished', () => {
          console.log('[RTK] Remote participant track published:', participant.id)
          updateParticipantList()
        })
        participant.on('trackUnpublished', () => {
          console.log('[RTK] Remote participant track unpublished:', participant.id)
          updateParticipantList()
        })
      }

      updateParticipantList()
    }

    const handleParticipantLeft = (participant: any) => {
      console.log('[RTK] Participant left event:', participant.id, participant.name)
      updateParticipantList()
    }

    // Attach event listeners if SDK supports them
    const joined = meeting.participants.joined as any
    if (typeof joined.on === 'function') {
      joined.on('participantJoined', handleParticipantJoined)
      joined.on('participantLeft', handleParticipantLeft)
      console.log('[RTK] Event listeners attached')
    }

    // Also attach track listeners to existing participants
    if (joined && typeof joined.forEach === 'function') {
      joined.forEach((participant: any) => {
        if (participant.id !== meeting.self?.id && typeof participant.on === 'function') {
          participant.on('trackPublished', () => {
            console.log('[RTK] Remote participant track published:', participant.id)
            updateParticipantList()
          })
          participant.on('trackUnpublished', () => {
            console.log('[RTK] Remote participant track unpublished:', participant.id)
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

      console.log('[RTK] 🎤 audioUpdate event fired:', {
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

      console.log('[RTK] 📹 videoUpdate event fired:', {
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

      console.log('[RTK] 📺 Screen share update event:', {
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
      console.log('[RTK] Audio, video, and screen share event listeners attached')
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

  // Listen for incoming invites
  useEffect(() => {
    if (!wsClient) return

    const socket = wsClient.getSocket()
    if (!socket) return

    const handleInvite = (data: {
      meetingId: string
      conversationId: string
      callType: CallType
      from: { id: string; odId: string; odName: string; avatarUrl?: string }
    }) => {
      console.log('[RTK] Received group call invite', data)

      // ⚠️ CRITICAL: Ignore invite if already in this call (prevents double-join)
      // Check meetingIdRef (synchronous) instead of callState (async)
      if (meetingIdRef.current === data.meetingId) {
        console.log('[RTK] Ignoring invite - already in this call', {
          currentMeetingId: meetingIdRef.current,
          inviteMeetingId: data.meetingId
        })
        return // ← DON'T set incomingInvite state!
      }

      // Also ignore if we're in ANY call (prevents modal from showing)
      if (callStateRoomIdRef.current) {
        console.log('[RTK] Ignoring invite - already in another call', {
          currentRoomId: callStateRoomIdRef.current
        })
        return
      }

      setIncomingInvite({
        roomId: data.meetingId,
        callType: data.callType,
        from: data.from,
        conversationName: data.conversationId
      })
    }

    const handleCallEnded = (data: { meetingId: string; conversationId: string }) => {
      console.log('[RTK] Call ended by host', data)

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
    }) => {
      console.log('[RTK] 📞 Conversation call started/updated:', {
        conversationId: data.conversationId,
        roomId: data.roomId,
        participantCount: data.participantIds.length,
        participantIds: data.participantIds,
        startedAt: data.startedAt,
        startedAtType: typeof data.startedAt,
        startedAtValue: data.startedAt ? new Date(data.startedAt).toISOString() : null
      })

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

      console.log('[RTK] ⏱️ Timer sync check:', {
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
          console.log('[RTK] ⏱️ ✅ Syncing to global call timer:', {
            previousStartTime: startTimeRef.current,
            globalStartTime,
            diff: startTimeRef.current ? (startTimeRef.current - globalStartTime) / 1000 : 0,
            reason: data.roomId === callState.roomId ? 'roomId matches' : 'not in call yet (early event)'
          })
          startTimeRef.current = globalStartTime
        } else {
          console.log('[RTK] ⏱️ ⏭️ Skipping timer sync (already have earlier time):', {
            currentStartTime: startTimeRef.current,
            globalStartTime
          })
        }
      } else if (data.startedAt && data.roomId !== currentRoomId && currentlyInCall) {
        console.log('[RTK] ⏱️ ⚠️ Timer sync skipped - different roomId:', {
          eventRoomId: data.roomId,
          currentRoomId
        })
      }
    }

    const handleConversationCallEnded = (data: { conversationId: string; roomId: string }) => {
      console.log('[RTK] 📴 Conversation call ended:', data)

      setActiveConversationCalls(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.conversationId)
        return newMap
      })
    }

    console.log('[RTK] 🎧 Registering WebSocket listeners for:', {
      hasSocket: !!socket,
      socketId: socket.id
    })

    socket.on('rtk-group-call:invite', handleInvite)
    socket.on('rtk-group-call:ended', handleCallEnded)
    socket.on('conversation:call-started', handleConversationCallStarted)
    socket.on('conversation:call-ended', handleConversationCallEnded)

    console.log('[RTK] ✅ All WebSocket listeners registered')

    return () => {
      socket.off('rtk-group-call:invite', handleInvite)
      socket.off('rtk-group-call:ended', handleCallEnded)
      socket.off('conversation:call-started', handleConversationCallStarted)
      socket.off('conversation:call-ended', handleConversationCallEnded)
    }
  }, [wsClient, leaveCall])

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
          console.log('[RTK] ⏱️ 🔄 Syncing timer from activeConversationCalls:', {
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
          console.log('[RTK] ⏱️ 🔄 Syncing timer from activeConversationCalls update:', {
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
      console.log('[RTK] Component unmounting - final cleanup', {
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
        meeting.leave().catch((err: any) => console.error('[RTK] Final cleanup leave error:', err))
      }
    }
  }, []) // Empty array - only on unmount!

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
    inviteToCall,
    reconnectParticipant,
    getConnectionDiagnostics,
    meeting // Expose meeting object for RealtimeKitProvider
  }
}
