/**
 * useGroupCall Hook - Manages group call state and WebRTC connections
 *
 * This hook provides all the functionality needed for group video/audio calls
 * using mesh topology (each participant connects to all others).
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { GroupWebRTCClient, GroupCallParticipant, VideoQuality } from '../services/groupWebrtcClient'
import { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { ChatApiClient } from '../services/chatApiClient'
import { BackgroundProcessor } from '../services/backgroundProcessor'
import { globalCallManager, type GlobalCallState } from '../services/globalCallManager'
import type { CallParticipant, CallType } from '../services/webrtcClient'
import { rtkDebug } from '../utils/rtkDebug'

export interface UseGroupCallOptions {
  wsClient: ChatWebSocketClient | null
  apiClient?: ChatApiClient | null
  currentUser: CallParticipant | null
  onCallStarted?: (roomId: string, participants: CallParticipant[]) => void
  onCallEnded?: (roomId: string, duration: number) => void
  onParticipantJoined?: (participant: CallParticipant) => void
  onParticipantLeft?: (participantId: string) => void
}

export interface GroupCallInvite {
  roomId: string
  callType: CallType
  from: { id: string; odId: string; odName: string; avatarUrl?: string }
  conversationName?: string
  conversationId?: string // The actual conversation ID for backend tracking
}

export interface GroupCallUIState {
  roomId: string | null
  callType: CallType
  status: 'idle' | 'joining' | 'connected' | 'reconnecting' | 'ended'
  participants: GroupCallParticipant[]
  hostId: string | null // ID of the user who started the call
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  isMinimized: boolean
  videoQuality: VideoQuality
  backgroundEnabled: boolean
  handRaised: boolean // Whether local user has hand raised
  remoteHandsRaised: Record<string, boolean> // Map of participantId -> handRaised for remote participants
  handRaisedOrder?: Record<string, { order: number; timestamp: number }> // Map of participantId -> order and timestamp
  startTime: number | null
  duration: number
  callImplementation: 'mesh' | 'realtime-kit' | '1-on-1' // Track which implementation is used
}

export interface ActiveConversationCall {
  roomId: string
  callType: CallType
  participantIds: string[]
  startedBy: string
  startedAt?: Date | string // Global call start timestamp from backend
  conversationName?: string
}

export type InviteStatus = 'pending' | 'declined' | 'not-answered'

export interface PendingInvite {
  id: string
  odId: string
  odName: string
  avatarUrl?: string
  invitedAt: number
  status?: InviteStatus
}

export interface UseGroupCallReturn {
  meeting?: any // RealtimeKit meeting object (only for RTK implementation)
  callState: GroupCallUIState
  isInCall: boolean
  isHost: boolean
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  participants: GroupCallParticipant[]
  pendingInvites: Map<string, PendingInvite> // Participants who have been invited but haven't joined yet
  incomingInvite: GroupCallInvite | null
  activeConversationCalls: Map<string, ActiveConversationCall> // roomId -> call info
  currentCallConversationName?: string // Conversation name for the current active call
  activeSpeakerId?: string | null // Current active speaker ID (RTK only)
  activeSpeakerHistory?: string[] // Recent speakers for sorting (RTK only)
  startCall: (
    roomId: string,
    callType: CallType,
    participants: CallParticipant[],
    conversationName?: string
  ) => Promise<void>
  joinCall: (roomId: string, callType: CallType, initialParticipants?: CallParticipant[]) => Promise<void>
  acceptInvite: () => Promise<void>
  declineInvite: () => void
  leaveCall: () => void
  toggleMute: () => boolean
  toggleVideo: () => boolean
  toggleScreenShare: () => Promise<boolean>
  setVideoQuality: (quality: VideoQuality) => Promise<void>
  toggleMinimize: () => void
  toggleBackground: () => void
  toggleRaiseHand?: () => Promise<boolean>
  sendReaction?: (emoji: string) => Promise<void>
  inviteToCall: (participants: CallParticipant[], conversationName?: string) => void
  reconnectParticipant: (participantId: string) => Promise<void>
  // Debugging
  getConnectionDiagnostics: () => Map<string, any>
}

// LocalStorage keys for user preferences
const PREF_VIDEO_QUALITY_KEY = 'chat_call_video_quality'
const PREF_BACKGROUND_ENABLED_KEY = 'chat_call_background_enabled'

// Helper to get saved video quality preference
const getSavedVideoQuality = (): VideoQuality => {
  try {
    const saved = localStorage.getItem(PREF_VIDEO_QUALITY_KEY)
    if (saved && ['high', 'medium', 'low'].includes(saved)) {
      return saved as VideoQuality
    }
  } catch {
    // Ignore storage errors
  }
  return 'low' // Default
}

// Helper to get saved background preference
const getSavedBackgroundEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem(PREF_BACKGROUND_ENABLED_KEY)
    return saved === 'true'
  } catch {
    // Ignore storage errors
  }
  return false // Default
}

// Helper to save video quality preference
const saveVideoQualityPreference = (quality: VideoQuality) => {
  try {
    localStorage.setItem(PREF_VIDEO_QUALITY_KEY, quality)
  } catch {
    // Ignore storage errors
  }
}

// Helper to save background preference
const saveBackgroundPreference = (enabled: boolean) => {
  try {
    localStorage.setItem(PREF_BACKGROUND_ENABLED_KEY, enabled.toString())
  } catch {
    // Ignore storage errors
  }
}

const initialCallState: GroupCallUIState = {
  roomId: null,
  callType: 'video',
  status: 'idle',
  participants: [],
  hostId: null,
  isMuted: false,
  callImplementation: 'mesh',
  isVideoEnabled: true,
  isScreenSharing: false,
  isMinimized: false,
  videoQuality: getSavedVideoQuality(),
  backgroundEnabled: getSavedBackgroundEnabled(),
  handRaised: false,
  remoteHandsRaised: {},
  startTime: null,
  duration: 0
}

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
  const [pendingInvites, setPendingInvites] = useState<Map<string, PendingInvite>>(new Map())
  const [incomingInvite, setIncomingInvite] = useState<GroupCallInvite | null>(null)
  const [activeConversationCalls, setActiveConversationCalls] = useState<Map<string, ActiveConversationCall>>(new Map())

  // Auto-expire pending invites after 60 seconds
  useEffect(() => {
    if (pendingInvites.size === 0) return

    const INVITE_TIMEOUT_MS = 60000 // 60 seconds

    const interval = setInterval(() => {
      const now = Date.now()
      setPendingInvites(prev => {
        const updated = new Map(prev)
        let removed = false
        prev.forEach((invite, id) => {
          if (now - invite.invitedAt > INVITE_TIMEOUT_MS) {
            updated.delete(id)
            removed = true
          }
        })
        return removed ? updated : prev
      })
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [pendingInvites.size])

  // Refs to avoid stale closures
  const webrtcRef = useRef<GroupWebRTCClient | null>(null)
  const wsClientRef = useRef<ChatWebSocketClient | null>(null)
  const currentUserRef = useRef<CallParticipant | null>(null)
  const callStateRef = useRef<GroupCallUIState>(initialCallState)
  const iceServersRef = useRef<RTCIceServer[] | null>(null)
  const apiClientRef = useRef<ChatApiClient | null>(null)
  const backgroundProcessorRef = useRef<BackgroundProcessor | null>(null)
  const originalLocalStreamRef = useRef<MediaStream | null>(null)

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

  // On mount, check if there's an active call in the global manager and restore it
  useEffect(() => {
    const storedData = globalCallManager.getCallData()

    // If there's an active call in the global manager, restore it
    if (storedData.callState.status !== 'idle' && storedData.webrtcClient) {
      rtkDebug.debug('useGroupCall: Restoring call from global manager', storedData.callState)

      // Restore refs
      webrtcRef.current = storedData.webrtcClient

      // Restore state - set isMinimized to false since Chat is handling it now
      // Convert GlobalCallState back to GroupCallUIState
      // Map GlobalCallState status to GroupCallUIState status (GlobalCallState doesn't have 'reconnecting' or 'ended')
      const globalStatus = storedData.callState.status as 'idle' | 'joining' | 'connected'
      let uiStatus: 'idle' | 'joining' | 'connected' | 'reconnecting' | 'ended'
      if (globalStatus === 'idle') {
        uiStatus = 'idle'
      } else if (globalStatus === 'joining') {
        uiStatus = 'joining'
      } else {
        // TypeScript knows this must be 'connected' at this point
        uiStatus = 'connected' // 'connected' is the only other option in GlobalCallState
      }

      const restoredState: GroupCallUIState = {
        roomId: storedData.callState.roomId,
        callType: storedData.callState.callType,
        status: uiStatus,
        participants: storedData.participants || [],
        hostId: storedData.callState.hostId,
        isMuted: storedData.callState.isMuted,
        isVideoEnabled: storedData.callState.isVideoEnabled,
        isScreenSharing: storedData.callState.isScreenSharing,
        isMinimized: false, // Chat is handling it now
        videoQuality: storedData.callState.videoQuality,
        backgroundEnabled: storedData.callState.backgroundEnabled,
        handRaised: false,
        remoteHandsRaised: {},
        startTime: storedData.callState.startTime,
        duration: storedData.callState.duration,
        callImplementation: storedData.callState.callImplementation || 'mesh'
      }
      setCallState(restoredState)
      setLocalStream(storedData.localStream)
      setRemoteStreams(new Map(storedData.remoteStreams))
      setParticipants([...storedData.participants])

      // Update refs
      callStateRef.current = restoredState

      // Clear the global manager since Chat is now handling the call
      // This stops the vanilla DOM UI from showing
      globalCallManager.clearCall()
    }
  }, []) // Only run on mount

  // Also subscribe to global call manager for expand events
  useEffect(() => {
    const unsubscribe = globalCallManager.subscribe(() => {
      const storedData = globalCallManager.getCallData()

      // If expand was triggered (isMinimized changed to false) and we have an active call
      if (
        storedData.callState.status !== 'idle' &&
        storedData.webrtcClient &&
        !storedData.callState.isMinimized &&
        callStateRef.current.status === 'idle' // Only if we don't already have a call
      ) {
        rtkDebug.debug('useGroupCall: Expand triggered, restoring call')

        // Restore refs
        webrtcRef.current = storedData.webrtcClient

        // Restore state - convert GlobalCallState back to GroupCallUIState
        // Map GlobalCallState status to GroupCallUIState status (GlobalCallState doesn't have 'reconnecting' or 'ended')
        const globalStatus = storedData.callState.status as 'idle' | 'joining' | 'connected'
        let uiStatus: 'idle' | 'joining' | 'connected' | 'reconnecting' | 'ended'
        if (globalStatus === 'idle') {
          uiStatus = 'idle'
        } else if (globalStatus === 'joining') {
          uiStatus = 'joining'
        } else {
          // TypeScript knows this must be 'connected' at this point
          uiStatus = 'connected' // 'connected' is the only other option in GlobalCallState
        }

        const restoredState: GroupCallUIState = {
          roomId: storedData.callState.roomId,
          callType: storedData.callState.callType,
          status: uiStatus,
          participants: storedData.participants || [],
          hostId: storedData.callState.hostId,
          isMuted: storedData.callState.isMuted,
          isVideoEnabled: storedData.callState.isVideoEnabled,
          isScreenSharing: storedData.callState.isScreenSharing,
          isMinimized: false, // Chat is handling it now
          videoQuality: storedData.callState.videoQuality,
          backgroundEnabled: storedData.callState.backgroundEnabled,
          handRaised: false,
          remoteHandsRaised: {},
          startTime: storedData.callState.startTime,
          duration: storedData.callState.duration,
          callImplementation: storedData.callState.callImplementation || 'mesh'
        }
        setCallState(restoredState)
        setLocalStream(storedData.localStream)
        setRemoteStreams(new Map(storedData.remoteStreams))
        setParticipants([...storedData.participants])

        // Update refs
        callStateRef.current = restoredState

        // Clear the global manager
        globalCallManager.clearCall()
      }
    })

    return unsubscribe
  }, [])

  // Fallback TURN servers for when backend doesn't provide them
  const FALLBACK_TURN_SERVERS: RTCIceServer[] = [
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]

  // Helper to check if server list has TURN
  const hasTurnServers = (servers: RTCIceServer[]): boolean => {
    return servers.some(
      s =>
        (typeof s.urls === 'string' && (s.urls.startsWith('turn:') || s.urls.startsWith('turns:'))) ||
        (Array.isArray(s.urls) && s.urls.some(u => u.startsWith('turn:') || u.startsWith('turns:')))
    )
  }

  // Fetch ICE servers from backend
  const fetchIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
    // Only use cache if it has TURN servers
    if (iceServersRef.current && hasTurnServers(iceServersRef.current)) {
      return iceServersRef.current
    }

    // Clear stale cache without TURN
    if (iceServersRef.current) {
      iceServersRef.current = null
    }

    let backendServers: RTCIceServer[] = []

    if (apiClientRef.current) {
      try {
        const response = await apiClientRef.current.getIceServers()
        backendServers = response.iceServers.map(server => ({
          urls: server.urls,
          username: server.username,
          credential: server.credential
        }))
      } catch (error) {
        console.error('[useGroupCall] ❌ Failed to fetch ICE servers from backend:', error)
      }
    } else {
      console.warn('[useGroupCall] No API client available for ICE servers')
    }

    // Check if backend provided TURN servers
    const hasTurnFromBackend = hasTurnServers(backendServers)

    // ALWAYS add fallback TURN servers if backend doesn't have any
    let finalServers: RTCIceServer[]
    if (!hasTurnFromBackend) {
      finalServers = [...backendServers, ...FALLBACK_TURN_SERVERS]
    } else {
      finalServers = backendServers
    }

    // Log final configuration
    const hasTurn = hasTurnServers(finalServers)

    if (!hasTurn) {
      console.error('[useGroupCall] ❌ CRITICAL: No TURN servers! Some users WILL NOT be able to connect!')
    }

    iceServersRef.current = finalServers
    return finalServers
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
      rtkDebug.debug(
        'participant-stream event received:',
        event.participantId,
        'tracks:',
        event.stream?.getTracks().length
      )
      if (event.participantId && event.stream) {
        setRemoteStreams(prev => {
          const updated = new Map(prev)
          updated.set(event.participantId!, event.stream!)
          rtkDebug.debug('Updated remoteStreams, now has', updated.size, 'streams')
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
        // Remove from pending invites when they join
        setPendingInvites(prev => {
          if (prev.has(event.participant!.id)) {
            const updated = new Map(prev)
            updated.delete(event.participant!.id)
            return updated
          }
          return prev
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

    // Handle ICE candidates - send them via WebSocket
    webrtc.on('ice-candidate', event => {
      if (
        event.participantId &&
        event.candidate &&
        wsClientRef.current &&
        currentUserRef.current &&
        callStateRef.current.roomId
      ) {
        rtkDebug.debug('Sending ICE candidate to:', event.participantId)
        wsClientRef.current.sendGroupCallIceCandidate({
          roomId: callStateRef.current.roomId,
          fromParticipantId: currentUserRef.current.id,
          toParticipantId: event.participantId,
          payload: event.candidate
        })
      }
    })

    webrtcRef.current = webrtc
    return webrtc
  }, [fetchIceServers, onParticipantJoined, onParticipantLeft])

  // Start a group call and invite participants
  const startCall = useCallback(
    async (roomId: string, callType: CallType, participants: CallParticipant[], conversationName?: string) => {
      if (!currentUserRef.current || !wsClientRef.current) {
        console.error('Cannot start call: missing user or WebSocket client')
        return
      }

      try {
        updateCallState({
          status: 'joining',
          roomId,
          callType,
          hostId: currentUserRef.current.id // The person starting the call is the host
        })

        // Initialize WebRTC
        const webrtc = await initializeWebRTC()

        // Initialize local stream with saved quality preference
        const savedQuality = getSavedVideoQuality()
        await webrtc.initializeLocalStream(callType, savedQuality)
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

        // Send invites to all participants
        const otherParticipants = participants.filter(p => p.id !== currentUserRef.current!.id)
        rtkDebug.debug(
          'Sending group call invites to',
          otherParticipants.length,
          'participants:',
          otherParticipants.map(p => p.odName)
        )

        if (otherParticipants.length > 0) {
          // Add to pending invites for visual feedback
          const now = Date.now()
          setPendingInvites(prev => {
            const updated = new Map(prev)
            for (const p of otherParticipants) {
              updated.set(p.id, {
                id: p.id,
                odId: p.odId,
                odName: p.odName,
                avatarUrl: p.avatarUrl,
                invitedAt: now
              })
            }
            return updated
          })

          const invitePayload = {
            roomId,
            callType,
            from: {
              id: currentUserRef.current.id,
              odId: currentUserRef.current.odId,
              odName: currentUserRef.current.odName,
              avatarUrl: currentUserRef.current.avatarUrl
            },
            participants: otherParticipants.map(p => ({
              id: p.id,
              odId: p.odId,
              odName: p.odName,
              avatarUrl: p.avatarUrl
            })),
            conversationName
          }
          rtkDebug.debug('Invite payload:', invitePayload)
          wsClientRef.current.inviteToGroupCall(invitePayload)
        } else {
          console.warn('No other participants to invite!')
        }

        // Set connected state with saved preferences
        const savedBackgroundPref = getSavedBackgroundEnabled()
        updateCallState({
          status: 'connected',
          startTime: Date.now(),
          isMuted: false,
          isVideoEnabled: callType === 'video',
          isScreenSharing: false,
          videoQuality: savedQuality,
          backgroundEnabled: false // Will be enabled below if needed
        })

        // Mark this tab as having an active call
        if (currentUserRef.current) {
          setActiveCallInStorage(currentUserRef.current.id, roomId)
        }

        // Track this call as active for the conversation
        setActiveConversationCalls(prev => {
          const updated = new Map(prev)
          updated.set(roomId, {
            roomId,
            callType,
            participantIds: [currentUserRef.current!.id],
            startedBy: currentUserRef.current!.id
          })
          return updated
        })

        // Notify ALL conversation members about the active call
        wsClientRef.current.notifyConversationCallStarted({
          conversationId: roomId,
          roomId,
          callType,
          startedBy: {
            id: currentUserRef.current.id,
            odId: currentUserRef.current.odId,
            odName: currentUserRef.current.odName,
            avatarUrl: currentUserRef.current.avatarUrl
          },
          participantIds: [currentUserRef.current.id],
          startedAt: new Date().toISOString()
        })

        // Update participants list
        setParticipants(Array.from(webrtc.getParticipants().values()))

        onCallStarted?.(roomId, participants)

        // Apply saved background preference if enabled (do this after call is fully connected)
        if (savedBackgroundPref && callType === 'video') {
          rtkDebug.debug('[useGroupCall] Applying saved background preference')
          // Use setTimeout to ensure state is settled before applying background
          setTimeout(async () => {
            try {
              const stream = webrtc.getLocalStream()
              if (stream && !backgroundProcessorRef.current) {
                backgroundProcessorRef.current = new BackgroundProcessor()
              }
              if (stream && backgroundProcessorRef.current) {
                originalLocalStreamRef.current = stream
                const processedStream = await backgroundProcessorRef.current.startProcessing(stream)
                setLocalStream(processedStream)
                // Replace video track in peer connections
                const videoTrack = processedStream.getVideoTracks()[0]
                if (videoTrack && webrtcRef.current) {
                  webrtcRef.current.replaceVideoTrack(videoTrack)
                }
                updateCallState({ backgroundEnabled: true })
              }
            } catch (err) {
              console.error('[useGroupCall] Failed to apply saved background:', err)
            }
          }, 500)
        }
      } catch (error) {
        console.error('Failed to start group call:', error)
        updateCallState({ status: 'idle', roomId: null })
        clearActiveCallFromStorage()
      }
    },
    [initializeWebRTC, updateCallState, onCallStarted]
  )

  // Join a group call (when accepting an invite or joining an ongoing call)
  const joinCall = useCallback(
    async (roomId: string, callType: CallType, initialParticipants?: CallParticipant[]) => {
      if (!currentUserRef.current || !wsClientRef.current) {
        console.error('Cannot join call: missing user or WebSocket client')
        return
      }

      // Clear any pending invites since we're joining an existing call
      // (people who were "invited" are already in the call)
      setPendingInvites(new Map())

      try {
        updateCallState({
          status: 'joining',
          roomId,
          callType
        })

        // Initialize WebRTC
        const webrtc = await initializeWebRTC()

        // Initialize local stream with saved quality preference
        const savedQuality = getSavedVideoQuality()
        await webrtc.initializeLocalStream(callType, savedQuality)
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

        // Set connected state with saved preferences
        const savedBackgroundPref = getSavedBackgroundEnabled()
        updateCallState({
          status: 'connected',
          startTime: Date.now(),
          isMuted: false,
          isVideoEnabled: callType === 'video',
          isScreenSharing: false,
          videoQuality: savedQuality,
          backgroundEnabled: false // Will be enabled below if needed
        })

        // Mark this tab as having an active call
        if (currentUserRef.current) {
          setActiveCallInStorage(currentUserRef.current.id, roomId)
        }

        // Track this call as active for the conversation
        setActiveConversationCalls(prev => {
          const updated = new Map(prev)
          const existing = updated.get(roomId)
          if (existing) {
            const newParticipants = [...existing.participantIds]
            if (!newParticipants.includes(currentUserRef.current!.id)) {
              newParticipants.push(currentUserRef.current!.id)
            }
            updated.set(roomId, { ...existing, participantIds: newParticipants })
          } else {
            updated.set(roomId, {
              roomId,
              callType,
              participantIds: [currentUserRef.current!.id],
              startedBy: currentUserRef.current!.id
            })
          }
          return updated
        })

        // Update participants list
        setParticipants(Array.from(webrtc.getParticipants().values()))

        onCallStarted?.(roomId, initialParticipants || [])

        // Apply saved background preference if enabled (do this after call is fully connected)
        if (savedBackgroundPref && callType === 'video') {
          rtkDebug.debug('[useGroupCall] Applying saved background preference on join')
          setTimeout(async () => {
            try {
              const stream = webrtc.getLocalStream()
              if (stream && !backgroundProcessorRef.current) {
                backgroundProcessorRef.current = new BackgroundProcessor()
              }
              if (stream && backgroundProcessorRef.current) {
                originalLocalStreamRef.current = stream
                const processedStream = await backgroundProcessorRef.current.startProcessing(stream)
                setLocalStream(processedStream)
                const videoTrack = processedStream.getVideoTracks()[0]
                if (videoTrack && webrtcRef.current) {
                  webrtcRef.current.replaceVideoTrack(videoTrack)
                }
                updateCallState({ backgroundEnabled: true })
              }
            } catch (err) {
              console.error('[useGroupCall] Failed to apply saved background on join:', err)
            }
          }, 500)
        }
      } catch (error) {
        console.error('Failed to join group call:', error)
        updateCallState({ status: 'idle', roomId: null })
        clearActiveCallFromStorage()
      }
    },
    [initializeWebRTC, updateCallState, onCallStarted]
  )

  // Accept incoming group call invite
  const acceptInvite = useCallback(async () => {
    if (!incomingInvite) return

    const { roomId, callType } = incomingInvite
    setIncomingInvite(null)

    await joinCall(roomId, callType)
  }, [incomingInvite, joinCall])

  // Decline incoming group call invite
  const declineInvite = useCallback(() => {
    setIncomingInvite(null)
  }, [])

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

    // Clean up background processor
    if (backgroundProcessorRef.current) {
      backgroundProcessorRef.current.destroy()
      backgroundProcessorRef.current = null
    }
    originalLocalStreamRef.current = null

    // Clear active call from storage
    clearActiveCallFromStorage()

    // Remove ourselves from active conversation calls
    if (roomId && currentUserRef.current) {
      setActiveConversationCalls(prev => {
        const updated = new Map(prev)
        const existing = updated.get(roomId)
        if (existing) {
          const newParticipants = existing.participantIds.filter(id => id !== currentUserRef.current!.id)
          if (newParticipants.length === 0) {
            updated.delete(roomId)
          } else {
            updated.set(roomId, { ...existing, participantIds: newParticipants })
          }
        }
        return updated
      })
    }

    // Reset state
    setLocalStream(null)
    setRemoteStreams(new Map())
    setParticipants([])
    setPendingInvites(new Map())
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

  // Set video quality
  const setVideoQuality = useCallback(
    async (quality: VideoQuality): Promise<void> => {
      if (!webrtcRef.current) return

      await webrtcRef.current.setVideoQuality(quality)
      updateCallState({ videoQuality: quality })

      // Save preference for next call
      saveVideoQualityPreference(quality)
    },
    [updateCallState]
  )

  // Toggle minimize
  const toggleMinimize = useCallback(() => {
    updateCallState({ isMinimized: !callStateRef.current.isMinimized })
  }, [updateCallState])

  // Toggle background with real ML processing
  const toggleBackground = useCallback(async () => {
    const newBackgroundEnabled = !callStateRef.current.backgroundEnabled

    if (newBackgroundEnabled) {
      // Enable background processing
      try {
        // Store original stream if not already stored
        if (!originalLocalStreamRef.current && localStream) {
          originalLocalStreamRef.current = localStream
        }

        if (!backgroundProcessorRef.current) {
          backgroundProcessorRef.current = new BackgroundProcessor()
        }

        const streamToProcess = originalLocalStreamRef.current || localStream
        if (streamToProcess) {
          rtkDebug.debug('Starting background processing')
          const processedStream = await backgroundProcessorRef.current.startProcessing(streamToProcess)
          setLocalStream(processedStream)

          // Update the WebRTC client with the processed stream
          if (webrtcRef.current) {
            // Replace the local stream in peer connections
            const videoTrack = processedStream.getVideoTracks()[0]
            if (videoTrack) {
              webrtcRef.current.replaceVideoTrack(videoTrack)
            }
          }
        }
      } catch (error) {
        console.error('Failed to enable background processing:', error)
        updateCallState({ backgroundEnabled: false })
        return
      }
    } else {
      // Disable background processing
      if (backgroundProcessorRef.current) {
        backgroundProcessorRef.current.stopProcessing()
      }

      // Restore original stream
      if (originalLocalStreamRef.current) {
        setLocalStream(originalLocalStreamRef.current)

        // Update the WebRTC client with the original stream
        if (webrtcRef.current) {
          const videoTrack = originalLocalStreamRef.current.getVideoTracks()[0]
          if (videoTrack) {
            webrtcRef.current.replaceVideoTrack(videoTrack)
          }
        }
      }
    }

    updateCallState({ backgroundEnabled: newBackgroundEnabled })

    // Save preference for next call
    saveBackgroundPreference(newBackgroundEnabled)
  }, [localStream, updateCallState])

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!wsClient) return

    rtkDebug.debug('Setting up group call WebSocket listeners')

    // Handle incoming group call invite
    wsClient.onGroupCallInvite(signal => {
      rtkDebug.debug('RAW group-call:invite received:', signal)

      // Always track this as an active call for the conversation
      rtkDebug.debug('Tracking active call for room:', signal.roomId, 'from:', signal.from.odName)
      setActiveConversationCalls(prev => {
        const updated = new Map(prev)
        updated.set(signal.roomId, {
          roomId: signal.roomId,
          callType: signal.callType,
          participantIds: [signal.from.id],
          startedBy: signal.from.id
        })
        rtkDebug.debug('Updated activeConversationCalls, new size:', updated.size)
        return updated
      })

      // Ignore if already in a call
      if (callStateRef.current.status !== 'idle') {
        rtkDebug.debug('Ignoring group call invite - already in call')
        return
      }

      // Ignore if this is our own invite
      if (signal.from.id === currentUserRef.current?.id) {
        rtkDebug.debug('Ignoring group call invite - from self')
        return
      }

      // Ignore if user is in a call in another tab
      if (currentUserRef.current && isInCallInAnotherTab(currentUserRef.current.id)) {
        rtkDebug.debug('Ignoring group call invite - user is in call in another tab')
        return
      }

      rtkDebug.debug('Processing group call invite from:', signal.from.odName, 'room:', signal.roomId)
      setIncomingInvite({
        roomId: signal.roomId,
        callType: signal.callType,
        from: signal.from,
        conversationName: signal.conversationName
      })
    })

    // Handle new participant joining
    wsClient.onGroupCallParticipantJoined(async signal => {
      // Track this participant in active calls
      setActiveConversationCalls(prev => {
        const updated = new Map(prev)
        const existing = updated.get(signal.roomId)
        if (existing) {
          const newParticipants = [...existing.participantIds]
          if (!newParticipants.includes(signal.participant.id)) {
            newParticipants.push(signal.participant.id)
          }
          updated.set(signal.roomId, { ...existing, participantIds: newParticipants })
        } else {
          updated.set(signal.roomId, {
            roomId: signal.roomId,
            callType: 'video',
            participantIds: [signal.participant.id],
            startedBy: signal.participant.id
          })
        }
        return updated
      })

      if (!webrtcRef.current || !currentUserRef.current) return
      if (signal.roomId !== callStateRef.current.roomId) return
      if (signal.participant.id === currentUserRef.current.id) return

      rtkDebug.debug('Participant joined group call:', signal.participant.odName)

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
      // Update active calls tracking
      setActiveConversationCalls(prev => {
        const updated = new Map(prev)
        const existing = updated.get(signal.roomId)
        if (existing) {
          const newParticipants = existing.participantIds.filter(id => id !== signal.participantId)
          if (newParticipants.length === 0) {
            // No more participants, call has ended
            updated.delete(signal.roomId)
          } else {
            updated.set(signal.roomId, { ...existing, participantIds: newParticipants })
          }
        }
        return updated
      })

      if (!webrtcRef.current) return
      if (signal.roomId !== callStateRef.current.roomId) return

      rtkDebug.debug('Participant left group call:', signal.participantId)
      webrtcRef.current.removeParticipant(signal.participantId)
    })

    // Handle incoming offer
    wsClient.onGroupCallOffer(async signal => {
      if (!webrtcRef.current || !currentUserRef.current) return
      if (signal.roomId !== callStateRef.current.roomId) return

      rtkDebug.debug('Received offer from:', signal.fromParticipant.odName)

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

      rtkDebug.debug('Received answer from:', signal.fromParticipantId)

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

    // Request active calls when WebSocket connects
    // NOTE: conversation:call-started, conversation:call-ended, and conversation:active-calls
    // are handled by useChatClient which properly waits for connection.
    // useChatClient updates conversation.activeCall which ConversationItem uses.

    return () => {
      wsClient.removeGroupCallListeners()
    }
  }, [wsClient])

  // Update duration periodically and keep localStorage heartbeat for multi-tab detection
  useEffect(() => {
    if (callState.status !== 'connected' || !callState.startTime) return

    const interval = setInterval(() => {
      // Update duration
      updateCallState({
        duration: Math.floor((Date.now() - callState.startTime!) / 1000)
      })

      // Heartbeat: Keep localStorage updated so other tabs know we're still in a call
      if (currentUserRef.current && callStateRef.current.roomId) {
        setActiveCallInStorage(currentUserRef.current.id, callStateRef.current.roomId)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [callState.status, callState.startTime, updateCallState])

  // Listen for storage changes to detect when user joins call in another tab
  // This allows us to dismiss the incoming call dialog in other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Only handle changes to our active call key
      if (event.key !== ACTIVE_CALL_KEY) return

      // If there's now an active call and we have an incoming invite, dismiss it
      if (event.newValue && incomingInvite && currentUserRef.current) {
        try {
          const data = JSON.parse(event.newValue)
          // If the active call is for the same user and it's recent, dismiss the incoming invite
          if (data.userId === currentUserRef.current.id && Date.now() - data.timestamp < 5000) {
            rtkDebug.debug('User joined call in another tab, dismissing incoming invite')
            setIncomingInvite(null)
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [incomingInvite])

  // Store call data in global manager when minimized (for persistence across unmounts)
  // Clear it when maximized to prevent duplicate UIs
  useEffect(() => {
    if (callState.isMinimized && callState.status !== 'idle' && webrtcRef.current && wsClientRef.current) {
      rtkDebug.debug('useGroupCall: Storing call data in global manager')
      // Convert GroupCallUIState to GlobalCallState
      // Map GroupCallUIState status to GlobalCallState status (GlobalCallState doesn't support 'reconnecting' or 'ended')
      const uiStatus = callState.status as 'idle' | 'joining' | 'connected' | 'reconnecting' | 'ended'
      let globalStatus: 'idle' | 'joining' | 'connected'
      if (uiStatus === 'idle') {
        globalStatus = 'idle'
      } else if (uiStatus === 'joining') {
        globalStatus = 'joining'
      } else if (uiStatus === 'ended') {
        globalStatus = 'idle' // Map 'ended' to 'idle'
      } else {
        // TypeScript knows this must be 'connected' or 'reconnecting' at this point
        globalStatus = 'connected' // 'connected', 'reconnecting' both map to 'connected'
      }

      const globalCallState: GlobalCallState = {
        status: globalStatus,
        roomId: callState.roomId,
        callType: callState.callType,
        callImplementation: callState.callImplementation || 'mesh',
        hostId: callState.hostId,
        isMuted: callState.isMuted,
        isVideoEnabled: callState.isVideoEnabled,
        isScreenSharing: callState.isScreenSharing,
        isMinimized: callState.isMinimized,
        duration: callState.duration,
        videoQuality: callState.videoQuality,
        backgroundEnabled: callState.backgroundEnabled,
        startTime: callState.startTime
      }
      globalCallManager.storeCall({
        webrtcClient: webrtcRef.current,
        wsClient: wsClientRef.current,
        callState: globalCallState,
        localStream,
        remoteStreams: new Map(remoteStreams), // Clone the Map
        participants: [...participants], // Clone the array
        currentUser: currentUserRef.current
      })
    } else if (!callState.isMinimized && callState.status !== 'idle' && globalCallManager.hasActiveCall()) {
      // When maximizing, clear the global manager since React is handling the call now
      rtkDebug.debug('useGroupCall: Clearing global manager - call is maximized')
      globalCallManager.clearCall()
    }
  }, [callState, localStream, remoteStreams, participants])

  // Keep refs updated for cleanup check
  const localStreamRef = useRef(localStream)
  const remoteStreamsRef = useRef(remoteStreams)
  const participantsRef = useRef(participants)

  useEffect(() => {
    localStreamRef.current = localStream
    remoteStreamsRef.current = remoteStreams
    participantsRef.current = participants
  }, [localStream, remoteStreams, participants])

  // Cleanup on unmount - skip if call is minimized (let global manager handle it)
  useEffect(() => {
    return () => {
      // If call is minimized, store final state and skip cleanup
      if (callStateRef.current.isMinimized && callStateRef.current.status !== 'idle') {
        rtkDebug.debug('useGroupCall: Skipping cleanup - call is minimized and will persist')

        // Store final state before unmount
        if (webrtcRef.current && wsClientRef.current) {
          // Convert GroupCallUIState to GlobalCallState
          // Map GroupCallUIState status to GlobalCallState status (GlobalCallState doesn't support 'reconnecting' or 'ended')
          // Use type assertion to preserve full union type and avoid narrowing issues
          const currentStatus = callStateRef.current.status as
            | 'idle'
            | 'joining'
            | 'connected'
            | 'reconnecting'
            | 'ended'
          let globalStatus: 'idle' | 'joining' | 'connected'
          // Use switch to avoid TypeScript narrowing issues with if/else chains
          switch (currentStatus) {
            case 'idle':
              globalStatus = 'idle'
              break
            case 'joining':
              globalStatus = 'joining'
              break
            case 'ended':
              globalStatus = 'idle' // Map 'ended' to 'idle'
              break
            case 'connected':
            case 'reconnecting':
            default:
              globalStatus = 'connected' // 'connected', 'reconnecting' both map to 'connected'
              break
          }

          const globalCallState: GlobalCallState = {
            status: globalStatus,
            roomId: callStateRef.current.roomId,
            callType: callStateRef.current.callType,
            callImplementation: callStateRef.current.callImplementation || 'mesh',
            hostId: callStateRef.current.hostId,
            isMuted: callStateRef.current.isMuted,
            isVideoEnabled: callStateRef.current.isVideoEnabled,
            isScreenSharing: callStateRef.current.isScreenSharing,
            isMinimized: callStateRef.current.isMinimized,
            duration: callStateRef.current.duration,
            videoQuality: callStateRef.current.videoQuality,
            backgroundEnabled: callStateRef.current.backgroundEnabled,
            startTime: callStateRef.current.startTime
          }
          globalCallManager.storeCall({
            webrtcClient: webrtcRef.current,
            wsClient: wsClientRef.current,
            callState: globalCallState,
            localStream: localStreamRef.current,
            remoteStreams: new Map(remoteStreamsRef.current),
            participants: [...participantsRef.current],
            currentUser: currentUserRef.current
          })
        }
        return
      }

      if (webrtcRef.current) {
        webrtcRef.current.destroy()
        webrtcRef.current = null
      }
      if (backgroundProcessorRef.current) {
        backgroundProcessorRef.current.destroy()
        backgroundProcessorRef.current = null
      }
      originalLocalStreamRef.current = null
    }
  }, [])

  // Check if current user is the host
  const isHost = currentUser?.id === callState.hostId

  // Get connection diagnostics for debugging
  const getConnectionDiagnostics = useCallback((): Map<string, any> => {
    if (!webrtcRef.current) {
      return new Map()
    }
    return webrtcRef.current.getConnectionDiagnostics()
  }, [])

  // Invite additional participants to an ongoing call
  const inviteToCall = useCallback(
    (newParticipants: CallParticipant[], conversationName?: string) => {
      if (!currentUserRef.current || !wsClientRef.current || !callStateRef.current.roomId) {
        console.error('Cannot invite: missing user, WebSocket client, or active call')
        return
      }

      // Filter out participants already in the call or already pending
      const currentParticipantIds = new Set(participants.map(p => p.id))
      const participantsToInvite = newParticipants.filter(
        p => p.id !== currentUserRef.current!.id && !currentParticipantIds.has(p.id)
      )

      if (participantsToInvite.length === 0) {
        rtkDebug.debug('No new participants to invite')
        return
      }

      rtkDebug.debug(
        'Inviting',
        participantsToInvite.length,
        'new participants to call:',
        participantsToInvite.map(p => p.odName)
      )

      // Add to pending invites
      const now = Date.now()
      setPendingInvites(prev => {
        const updated = new Map(prev)
        for (const p of participantsToInvite) {
          updated.set(p.id, {
            id: p.id,
            odId: p.odId,
            odName: p.odName,
            avatarUrl: p.avatarUrl,
            invitedAt: now
          })
        }
        return updated
      })

      const invitePayload = {
        roomId: callStateRef.current.roomId,
        callType: callStateRef.current.callType,
        from: {
          id: currentUserRef.current.id,
          odId: currentUserRef.current.odId,
          odName: currentUserRef.current.odName,
          avatarUrl: currentUserRef.current.avatarUrl
        },
        participants: participantsToInvite.map(p => ({
          id: p.id,
          odId: p.odId,
          odName: p.odName,
          avatarUrl: p.avatarUrl
        })),
        conversationName
      }

      wsClientRef.current.inviteToGroupCall(invitePayload)
    },
    [participants]
  )

  // Reconnect to a participant whose connection failed
  const reconnectParticipant = useCallback(
    async (participantId: string): Promise<void> => {
      if (!webrtcRef.current || !wsClientRef.current || !currentUserRef.current || !callStateRef.current.roomId) {
        console.error('Cannot reconnect: missing WebRTC client, WebSocket client, or active call')
        return
      }

      const participant = participants.find(p => p.id === participantId)
      if (!participant) {
        console.error('Cannot reconnect: participant not found')
        return
      }

      try {
        // Get a new offer with ICE restart from the WebRTC client
        const offer = await webrtcRef.current.reconnectParticipant(participantId)
        if (!offer) {
          console.error('Failed to create reconnect offer')
          return
        }

        // Send the offer via WebSocket signaling
        wsClientRef.current.sendGroupCallOffer({
          roomId: callStateRef.current.roomId,
          fromParticipantId: currentUserRef.current.id,
          toParticipantId: participantId,
          payload: offer
        })
      } catch (error) {
        console.error(`[useGroupCall] ❌ Failed to reconnect to ${participantId}:`, error)
      }
    },
    [participants]
  )

  return {
    callState,
    isInCall: callState.status === 'connected' || callState.status === 'joining',
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
    getConnectionDiagnostics
  }
}
