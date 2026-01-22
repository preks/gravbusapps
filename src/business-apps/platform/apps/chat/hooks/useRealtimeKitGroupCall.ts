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

        // 6. Get local media from SDK (after enabling)
        const localVideoTrack = meetingToUse.self?.videoTrack
        const localAudioTrack = meetingToUse.self?.audioTrack

        console.log('[RTK] Local tracks:', {
          hasAudio: !!localAudioTrack,
          hasVideo: !!localVideoTrack
        })

        // Create MediaStream from SDK tracks
        const stream = new MediaStream()
        if (localAudioTrack) stream.addTrack(localAudioTrack)
        if (localVideoTrack) stream.addTrack(localVideoTrack)

        setLocalStream(stream)

        // Update state
        startTimeRef.current = Date.now()
        setCallState({
          roomId: meetingId,
          callType,
          status: 'connected',
          participants: [
            {
              ...currentUser,
              stream
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
          setCallState(prev => ({
            ...prev,
            duration: Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000)
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
   */
  const joinCall = useCallback(
    async (roomId: string, callType: CallType): Promise<void> => {
      if (!currentUser || !apiClient) {
        console.error('[RTK] Cannot join call: missing requirements')
        return
      }

      try {
        console.log('[RTK] Joining Realtime Kit group call with SDK...', { roomId })
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

        // 6. Get local media from SDK (after enabling)
        const localVideoTrack = meetingToUse.self?.videoTrack
        const localAudioTrack = meetingToUse.self?.audioTrack

        console.log('[RTK] Local tracks:', {
          hasAudio: !!localAudioTrack,
          hasVideo: !!localVideoTrack
        })

        // Create MediaStream from SDK tracks
        const stream = new MediaStream()
        if (localAudioTrack) stream.addTrack(localAudioTrack)
        if (localVideoTrack) stream.addTrack(localVideoTrack)

        setLocalStream(stream)

        // Update state
        startTimeRef.current = Date.now()
        setCallState(prev => ({
          ...prev,
          roomId,
          callType,
          status: 'connected',
          participants: [
            {
              ...currentUser,
              stream
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
          setCallState(prev => ({
            ...prev,
            duration: Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000)
          }))
        }, 1000)

        console.log('[RTK] Joined call successfully with SDK')
      } catch (error) {
        console.error('[RTK] Failed to join call:', error)
        setCallState(initialCallState)
      }
    },
    [currentUser, apiClient, initMeeting, meeting, emitSocketEvent]
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
      emitSocketEvent('rtk-group-call:left', {
        conversationId: callState.roomId,
        meetingId: callState.roomId,
        participantId: currentUser.id
      })
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
   */
  const toggleMute = useCallback((): boolean => {
    if (!meeting?.self) return callState.isMuted

    const currentMuted = callState.isMuted
    const newMuted = !currentMuted

    // Update state immediately for responsive UI
    setCallState(prev => ({ ...prev, isMuted: newMuted }))

    // Call SDK in background
    if (newMuted) {
      meeting.self.disableAudio().catch((error: any) => {
        console.error('[RTK] Failed to disable audio:', error)
        setCallState(prev => ({ ...prev, isMuted: false })) // Revert on error
      })
    } else {
      meeting.self.enableAudio().catch((error: any) => {
        console.error('[RTK] Failed to enable audio:', error)
        setCallState(prev => ({ ...prev, isMuted: true })) // Revert on error
      })
    }

    return newMuted
  }, [meeting, callState.isMuted])

  /**
   * Toggle video (using SDK)
   */
  const toggleVideo = useCallback((): boolean => {
    if (!meeting?.self || !localStream) {
      console.log('[RTK] toggleVideo: no meeting.self or localStream')
      return callState.isVideoEnabled
    }

    const currentEnabled = callState.isVideoEnabled
    const newEnabled = !currentEnabled

    console.log('[RTK] toggleVideo:', {
      currentEnabled,
      newEnabled,
      hasVideoTrack: !!meeting.self.videoTrack,
      videoTrackEnabled: meeting.self.videoTrack?.enabled,
      localStreamVideoTracks: localStream.getVideoTracks().length
    })

    // Update state immediately for responsive UI
    setCallState(prev => ({ ...prev, isVideoEnabled: newEnabled }))

    if (newEnabled) {
      console.log('[RTK] Enabling video via SDK...')
      console.log('[RTK] LocalStream BEFORE enableVideo:', {
        hasStream: !!localStream,
        videoTracks: localStream?.getVideoTracks().length || 0,
        audioTracks: localStream?.getAudioTracks().length || 0
      })

      meeting.self
        .enableVideo()
        .then(async () => {
          console.log('[RTK] ✅ Video enabled and published to SFU')
          console.log('[RTK] LocalStream AFTER enableVideo:', {
            hasStream: !!localStream,
            videoTracks: localStream?.getVideoTracks().length || 0,
            audioTracks: localStream?.getAudioTracks().length || 0,
            videoTrackId: localStream?.getVideoTracks()[0]?.id,
            hasSDKVideoTrack: !!meeting.self?.videoTrack,
            sdkVideoTrackId: meeting.self?.videoTrack?.id
          })

          /**
           * CRITICAL WORKAROUND: Cloudflare SDK Video Track Synchronization
           *
           * Issue: When enableVideo() is called, the SDK creates a NEW MediaStreamTrack
           * but doesn't update the localStream reference. This causes the HTML <video>
           * element to still reference the OLD stopped track, resulting in black screen.
           *
           * Root Cause: The SDK manages its own track lifecycle internally, but our
           * localStream state reference becomes stale after disableVideo()/enableVideo().
           *
           * Solution: Manually synchronize localStream with SDK's meeting.self.videoTrack
           * by removing old tracks and adding the new SDK track. IMPORTANT: We must NOT
           * call track.stop() on the old track as the SDK manages its lifecycle - calling
           * stop() would kill the track that might still be in use by the video element.
           *
           * Then we force a React state update by creating a NEW MediaStream object with
           * the same tracks. This triggers React's re-render cycle, which updates the
           * HTML <video> element's srcObject with the fresh stream containing the new track.
           */
          if (meeting.self?.videoTrack && localStream) {
            const currentVideoTracks = localStream.getVideoTracks()
            const sdkVideoTrack = meeting.self.videoTrack

            // Check if SDK's video track is already in localStream
            const trackInStream = currentVideoTracks.some(t => t.id === sdkVideoTrack.id)

            if (!trackInStream) {
              console.log('[RTK] 🔧 Syncing SDK video track to localStream...')

              // Remove old video tracks WITHOUT stopping them
              // (SDK manages track lifecycle - stopping here would kill the track prematurely)
              currentVideoTracks.forEach(track => {
                console.log('[RTK] Removing old video track from stream:', track.id)
                localStream.removeTrack(track)
              })

              // Add new video track from SDK
              localStream.addTrack(sdkVideoTrack)
              console.log('[RTK] ✅ Added new video track to localStream:', sdkVideoTrack.id)

              // Force React state update by creating a NEW MediaStream object
              // This triggers re-render and updates the HTML video element's srcObject
              setLocalStream(prev => {
                if (!prev) return prev
                const newStream = new MediaStream()
                prev.getTracks().forEach(track => newStream.addTrack(track))
                console.log('[RTK] 🔄 Created new localStream object for React refresh')
                return newStream
              })
            }
          }

          /**
           * CRITICAL WORKAROUND: Cloudflare SDK Audio Republish After Video Toggle
           *
           * Issue: When disableVideo() is called, the Cloudflare SDK internally unpublishes
           * BOTH video AND audio tracks from the SFU, even though only video was disabled.
           * When enableVideo() is subsequently called, the SDK republishes the video track
           * but FAILS to automatically republish the audio track to the SFU.
           *
           * Result: Local user can see their audio track enabled and working locally, but
           * remote participants receive NO audio stream because the SFU never forwarded it.
           *
           * Root Cause: This appears to be a bug/limitation in the Cloudflare Realtime Kit
           * SDK where disableVideo() affects both media types at the SFU level, but
           * enableVideo() only restores video forwarding.
           *
           * Solution: After successfully calling enableVideo(), force an audio cycle:
           * 1. disableAudio() - Explicitly unpublish audio from SFU
           * 2. Wait 100ms - Give SFU time to process the unpublish
           * 3. enableAudio() - Republish audio to SFU
           *
           * This ensures audio is properly forwarded to remote participants even after
           * video has been toggled OFF then back ON.
           *
           * Note: Only do this if user is NOT muted (isMuted = false). If user is muted,
           * audio should remain unpublished as expected.
           */
          if (!callState.isMuted && meeting.self?.audioTrack) {
            console.log('[RTK] 🔧 WORKAROUND: Force audio republish after video enable...')
            try {
              const audioTrack = meeting.self.audioTrack
              console.log('[RTK] Audio track state:', {
                id: audioTrack.id,
                enabled: audioTrack.enabled,
                readyState: audioTrack.readyState
              })

              // Force audio unpublish/republish cycle to SFU
              await meeting.self.disableAudio()
              console.log('[RTK] 1️⃣ Temporarily disabled audio')

              await new Promise(resolve => setTimeout(resolve, 100))

              await meeting.self.enableAudio()
              console.log('[RTK] 2️⃣ ✅ Audio re-published to SFU!')
            } catch (error) {
              console.error('[RTK] ❌ Failed to republish audio:', error)
            }
          }
        })
        .catch((error: any) => {
          console.error('[RTK] Failed to enable video:', error)
          setCallState(prev => ({ ...prev, isVideoEnabled: false }))
        })
    } else {
      /**
       * Disable Video Path
       *
       * Note: Cloudflare SDK's disableVideo() also unpublishes audio from the SFU
       * as a side effect (see detailed explanation in enableVideo path above).
       * This is expected behavior from the SDK, but results in remote participants
       * not hearing audio when local user has video OFF.
       *
       * The workaround (audio republish) is applied when video is turned back ON,
       * not here, because:
       * 1. We don't want to republish audio immediately after unpublishing it
       * 2. The audio should remain unpublished while video is OFF (SDK's intention)
       * 3. Only when enableVideo() is called do we need to restore audio forwarding
       */
      console.log('[RTK] Disabling video via SDK...')
      meeting.self
        .disableVideo()
        .then(() => {
          console.log('[RTK] ✅ Video disabled via SDK')
          console.log('[RTK] ⚠️ NOTE: Cloudflare SDK unpublishes audio along with video')
        })
        .catch((error: any) => {
          console.error('[RTK] Failed to disable video:', error)
          setCallState(prev => ({ ...prev, isVideoEnabled: true }))
        })
    }

    return newEnabled
  }, [meeting, callState.isVideoEnabled, localStream])

  /**
   * Toggle screen share (using SDK)
   */
  const toggleScreenShare = useCallback(async (): Promise<boolean> => {
    if (!meeting?.self) return false

    try {
      const currentSharing = callState.isScreenSharing

      if (currentSharing) {
        await meeting.self.stopScreenShare()
        setCallState(prev => ({ ...prev, isScreenSharing: false }))
        console.log('[RTK] Screen share stopped via SDK')
        return false
      } else {
        await meeting.self.startScreenShare()
        setCallState(prev => ({ ...prev, isScreenSharing: true }))
        console.log('[RTK] Screen share started via SDK')
        return true
      }
    } catch (error) {
      console.error('[RTK] Failed to toggle screen share:', error)
      return callState.isScreenSharing
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
          participantIds: allParticipants.map((p: any) => ({ id: p.id, name: p.name, roomJoined: p.roomJoined }))
        })

        // Update remote streams
        const newRemoteStreams = new Map<string, MediaStream>()
        const newParticipants: GroupCallParticipant[] = []

        remotePeers.forEach((peer: any) => {
          console.log('[RTK] Processing remote peer:', {
            id: peer.id,
            name: peer.name,
            displayName: peer.displayName,
            customParticipantId: peer.customParticipantId,
            userId: peer.userId,
            hasVideoTrack: !!peer.videoTrack,
            hasAudioTrack: !!peer.audioTrack
          })

          const stream = new MediaStream()

          if (peer.videoTrack) {
            stream.addTrack(peer.videoTrack)
          }
          if (peer.audioTrack) {
            stream.addTrack(peer.audioTrack)
          }

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

    // Initial update
    updateParticipantList()

    // Fallback: Also poll every 2 seconds in case events don't fire
    const intervalId = setInterval(updateParticipantList, 2000)

    return () => {
      clearInterval(intervalId)
      const joined = meeting.participants?.joined as any
      if (typeof joined?.off === 'function') {
        joined.off('participantJoined', handleParticipantJoined)
        joined.off('participantLeft', handleParticipantLeft)
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
      if (callState.status !== 'idle' && callState.roomId) {
        console.log('[RTK] Ignoring invite - already in another call', {
          currentStatus: callState.status,
          currentRoomId: callState.roomId
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

      if (callState.roomId === data.meetingId) {
        leaveCall()
      }
    }

    const handleConversationCallStarted = (data: {
      conversationId: string
      roomId: string
      callType: 'audio' | 'video'
      startedBy: { id: string; odId: string; odName: string; avatarUrl?: string }
      participantIds: string[]
    }) => {
      console.log('[RTK] 📞 Conversation call started/updated:', {
        conversationId: data.conversationId,
        participantCount: data.participantIds.length,
        participantIds: data.participantIds
      })

      setActiveConversationCalls(prev => {
        const newMap = new Map(prev)
        newMap.set(data.conversationId, {
          roomId: data.roomId,
          callType: data.callType,
          participantIds: data.participantIds,
          startedBy: data.startedBy.id
        })
        return newMap
      })
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
  }, [wsClient, callState.roomId, leaveCall])

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
    joinCall,
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
