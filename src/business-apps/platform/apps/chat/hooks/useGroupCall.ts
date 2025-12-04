/**
 * useGroupCall Hook - Manages group call state and WebRTC connections
 *
 * This hook provides all the functionality needed for group video/audio calls
 * using mesh topology (each participant connects to all others).
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { GroupWebRTCClient, GroupCallParticipant } from '../services/groupWebrtcClient'
import { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { ChatApiClient } from '../services/chatApiClient'
import type { CallParticipant, CallType } from '../services/webrtcClient'

export interface UseGroupCallOptions {
  wsClient: ChatWebSocketClient | null
  apiClient?: ChatApiClient | null
  currentUser: CallParticipant | null
  onCallStarted?: (roomId: string, participants: CallParticipant[]) => void
  onCallEnded?: (roomId: string, duration: number) => void
  onParticipantJoined?: (participant: CallParticipant) => void
  onParticipantLeft?: (participantId: string) => void
}

export interface GroupCallUIState {
  roomId: string | null
  callType: CallType
  status: 'idle' | 'joining' | 'connected' | 'reconnecting' | 'ended'
  participants: GroupCallParticipant[]
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  startTime: number | null
  duration: number
}

export interface UseGroupCallReturn {
  callState: GroupCallUIState
  isInCall: boolean
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  participants: GroupCallParticipant[]
  joinCall: (roomId: string, callType: CallType, initialParticipants?: CallParticipant[]) => Promise<void>
  leaveCall: () => void
  toggleMute: () => boolean
  toggleVideo: () => boolean
  toggleScreenShare: () => Promise<boolean>
}

const initialCallState: GroupCallUIState = {
  roomId: null,
  callType: 'video',
  status: 'idle',
  participants: [],
  isMuted: false,
  isVideoEnabled: true,
  isScreenSharing: false,
  startTime: null,
  duration: 0
}

export const useGroupCall = ({
  wsClient,
  apiClient,
  currentUser,
  onCallStarted,
  onCallEnded,
  onParticipantJoined,
  onParticipantLeft
}: UseGroupCallOptions): UseGroupCallReturn => {
  // State
  const [callState, setCallState] = useState<GroupCallUIState>(initialCallState)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [participants, setParticipants] = useState<GroupCallParticipant[]>([])

  // Refs to avoid stale closures
  const webrtcRef = useRef<GroupWebRTCClient | null>(null)
  const wsClientRef = useRef<ChatWebSocketClient | null>(null)
  const currentUserRef = useRef<CallParticipant | null>(null)
  const callStateRef = useRef<GroupCallUIState>(initialCallState)
  const iceServersRef = useRef<RTCIceServer[] | null>(null)
  const apiClientRef = useRef<ChatApiClient | null>(null)

  // Keep refs in sync
  wsClientRef.current = wsClient
  currentUserRef.current = currentUser
  callStateRef.current = callState
  apiClientRef.current = apiClient || null

  // Update call state helper
  const updateCallState = useCallback((updates: Partial<GroupCallUIState>) => {
    setCallState(prev => {
      const newState = { ...prev, ...updates }
      callStateRef.current = newState
      return newState
    })
  }, [])

  // Fetch ICE servers from backend
  const fetchIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
    if (iceServersRef.current) {
      return iceServersRef.current
    }

    if (apiClientRef.current) {
      try {
        const response = await apiClientRef.current.getIceServers()
        const iceServers = response.iceServers.map(server => ({
          urls: server.urls,
          username: server.username,
          credential: server.credential
        }))
        iceServersRef.current = iceServers
        console.debug('Fetched ICE servers for group call:', iceServers.length, 'servers')
        return iceServers
      } catch (error) {
        console.warn('Failed to fetch ICE servers, using defaults:', error)
      }
    }

    return []
  }, [])

  // Initialize WebRTC client
  const initializeWebRTC = useCallback(async (): Promise<GroupWebRTCClient> => {
    if (webrtcRef.current) {
      webrtcRef.current.destroy()
    }

    const iceServers = await fetchIceServers()
    const webrtc = new GroupWebRTCClient(iceServers.length > 0 ? iceServers : undefined)

    // Set up event handlers
    webrtc.on('local-stream', event => {
      if (event.stream) {
        setLocalStream(event.stream)
      }
    })

    webrtc.on('participant-stream', event => {
      if (event.participantId && event.stream) {
        setRemoteStreams(prev => {
          const updated = new Map(prev)
          updated.set(event.participantId!, event.stream!)
          return updated
        })
      }
    })

    webrtc.on('participant-joined', event => {
      if (event.participant) {
        setParticipants(prev => {
          const exists = prev.find(p => p.id === event.participant!.id)
          if (exists) return prev
          return [...prev, event.participant!]
        })
        onParticipantJoined?.(event.participant)
      }
    })

    webrtc.on('participant-left', event => {
      if (event.participantId) {
        setParticipants(prev => prev.filter(p => p.id !== event.participantId))
        setRemoteStreams(prev => {
          const updated = new Map(prev)
          updated.delete(event.participantId!)
          return updated
        })
        onParticipantLeft?.(event.participantId)
      }
    })

    webrtc.on('error', event => {
      console.error('Group WebRTC error:', event.error)
    })

    webrtcRef.current = webrtc
    return webrtc
  }, [fetchIceServers, onParticipantJoined, onParticipantLeft])

  // Join a group call
  const joinCall = useCallback(
    async (roomId: string, callType: CallType, initialParticipants?: CallParticipant[]) => {
      if (!currentUserRef.current || !wsClientRef.current) {
        console.error('Cannot join call: missing user or WebSocket client')
        return
      }

      try {
        updateCallState({
          status: 'joining',
          roomId,
          callType
        })

        // Initialize WebRTC
        const webrtc = await initializeWebRTC()

        // Initialize local stream
        await webrtc.initializeLocalStream(callType)
        setLocalStream(webrtc.getLocalStream())

        // Join the room
        await webrtc.joinRoom(roomId, callType, currentUserRef.current)

        // Notify server that we're joining
        wsClientRef.current.joinGroupCall({
          roomId,
          callType,
          participant: {
            id: currentUserRef.current.id,
            odId: currentUserRef.current.odId,
            odName: currentUserRef.current.odName,
            avatarUrl: currentUserRef.current.avatarUrl
          }
        })

        // If we have initial participants, send offers to them
        if (initialParticipants && initialParticipants.length > 0) {
          for (const participant of initialParticipants) {
            if (participant.id !== currentUserRef.current.id) {
              try {
                const offer = await webrtc.addParticipant(participant)

                wsClientRef.current.sendGroupCallOffer({
                  roomId,
                  fromParticipantId: currentUserRef.current.id,
                  toParticipantId: participant.id,
                  payload: offer
                })
              } catch (err) {
                console.error('Failed to send offer to participant:', participant.id, err)
              }
            }
          }
        }

        updateCallState({
          status: 'connected',
          startTime: Date.now(),
          isMuted: false,
          isVideoEnabled: callType === 'video',
          isScreenSharing: false
        })

        // Update participants list
        setParticipants(Array.from(webrtc.getParticipants().values()))

        onCallStarted?.(roomId, initialParticipants || [])
      } catch (error) {
        console.error('Failed to join group call:', error)
        updateCallState({ status: 'idle', roomId: null })
      }
    },
    [initializeWebRTC, updateCallState, onCallStarted]
  )

  // Leave the call
  const leaveCall = useCallback(() => {
    if (!webrtcRef.current) return

    const roomId = callStateRef.current.roomId
    const duration = callStateRef.current.startTime ? Date.now() - callStateRef.current.startTime : 0

    // Notify server
    if (wsClientRef.current && roomId && currentUserRef.current) {
      wsClientRef.current.leaveGroupCall({
        roomId,
        participantId: currentUserRef.current.id
      })
    }

    // Clean up WebRTC
    webrtcRef.current.leaveRoom()
    webrtcRef.current = null

    // Reset state
    setLocalStream(null)
    setRemoteStreams(new Map())
    setParticipants([])
    updateCallState(initialCallState)

    onCallEnded?.(roomId || '', duration)
  }, [updateCallState, onCallEnded])

  // Toggle mute
  const toggleMute = useCallback((): boolean => {
    if (!webrtcRef.current) return callStateRef.current.isMuted

    const isMuted = webrtcRef.current.toggleMute()
    updateCallState({ isMuted })
    return isMuted
  }, [updateCallState])

  // Toggle video
  const toggleVideo = useCallback((): boolean => {
    if (!webrtcRef.current) return callStateRef.current.isVideoEnabled

    const isVideoEnabled = webrtcRef.current.toggleVideo()
    updateCallState({ isVideoEnabled })
    return isVideoEnabled
  }, [updateCallState])

  // Toggle screen share
  const toggleScreenShare = useCallback(async (): Promise<boolean> => {
    if (!webrtcRef.current) return callStateRef.current.isScreenSharing

    const isScreenSharing = await webrtcRef.current.toggleScreenShare()
    updateCallState({ isScreenSharing })
    return isScreenSharing
  }, [updateCallState])

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!wsClient) return

    // Handle new participant joining
    wsClient.onGroupCallParticipantJoined(async signal => {
      if (!webrtcRef.current || !currentUserRef.current) return
      if (signal.roomId !== callStateRef.current.roomId) return
      if (signal.participant.id === currentUserRef.current.id) return

      console.debug('Participant joined group call:', signal.participant.odName)

      // Send offer to the new participant
      try {
        const offer = await webrtcRef.current.addParticipant({
          id: signal.participant.id,
          odId: signal.participant.odId,
          odName: signal.participant.odName,
          avatarUrl: signal.participant.avatarUrl
        })

        wsClientRef.current?.sendGroupCallOffer({
          roomId: signal.roomId,
          fromParticipantId: currentUserRef.current.id,
          toParticipantId: signal.participant.id,
          payload: offer
        })
      } catch (err) {
        console.error('Failed to send offer to new participant:', err)
      }
    })

    // Handle participant leaving
    wsClient.onGroupCallParticipantLeft(signal => {
      if (!webrtcRef.current) return
      if (signal.roomId !== callStateRef.current.roomId) return

      console.debug('Participant left group call:', signal.participantId)
      webrtcRef.current.removeParticipant(signal.participantId)
    })

    // Handle incoming offer
    wsClient.onGroupCallOffer(async signal => {
      if (!webrtcRef.current || !currentUserRef.current) return
      if (signal.roomId !== callStateRef.current.roomId) return

      console.debug('Received offer from:', signal.fromParticipant.odName)

      try {
        const answer = await webrtcRef.current.handleOffer(
          signal.fromParticipantId,
          signal.fromParticipant,
          signal.payload
        )

        wsClientRef.current?.sendGroupCallAnswer({
          roomId: signal.roomId,
          fromParticipantId: currentUserRef.current.id,
          toParticipantId: signal.fromParticipantId,
          payload: answer
        })
      } catch (err) {
        console.error('Failed to handle offer:', err)
      }
    })

    // Handle incoming answer
    wsClient.onGroupCallAnswer(async signal => {
      if (!webrtcRef.current) return
      if (signal.roomId !== callStateRef.current.roomId) return

      console.debug('Received answer from:', signal.fromParticipantId)

      try {
        await webrtcRef.current.handleAnswer(signal.fromParticipantId, signal.payload)
      } catch (err) {
        console.error('Failed to handle answer:', err)
      }
    })

    // Handle incoming ICE candidate
    wsClient.onGroupCallIceCandidate(async signal => {
      if (!webrtcRef.current) return
      if (signal.roomId !== callStateRef.current.roomId) return

      try {
        await webrtcRef.current.handleIceCandidate(signal.fromParticipantId, signal.payload)
      } catch (err) {
        console.error('Failed to handle ICE candidate:', err)
      }
    })

    return () => {
      wsClient.removeGroupCallListeners()
    }
  }, [wsClient])

  // Update duration periodically
  useEffect(() => {
    if (callState.status !== 'connected' || !callState.startTime) return

    const interval = setInterval(() => {
      updateCallState({
        duration: Math.floor((Date.now() - callState.startTime!) / 1000)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [callState.status, callState.startTime, updateCallState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.destroy()
        webrtcRef.current = null
      }
    }
  }, [])

  return {
    callState,
    isInCall: callState.status === 'connected' || callState.status === 'joining',
    localStream,
    remoteStreams,
    participants,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare
  }
}
