import { useState, useEffect, useCallback, useRef } from 'react'
import { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { ChatApiClient } from '../services/chatApiClient'

// Generate a unique call ID using crypto API (available in all modern browsers)
const generateCallId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'call-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 15)
}
import { WebRTCClient, CallType, CallParticipant, CallState, CallSignal } from '../services/webrtcClient'

const RING_TIMEOUT = 30000 // 30 seconds ring timeout

// LocalStorage key for tracking active calls across tabs (shared with useGroupCall)
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
const setActiveCallInStorage = (userId: string, callId: string) => {
  try {
    localStorage.setItem(
      ACTIVE_CALL_KEY,
      JSON.stringify({
        userId,
        roomId: callId,
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

export interface UseCallOptions {
  wsClient: ChatWebSocketClient | null
  apiClient?: ChatApiClient | null
  currentUser: CallParticipant | null
  onCallStarted?: (callId: string, participant: CallParticipant) => void
  onCallEnded?: (callId: string, duration: number) => void
}

export interface UseCallReturn {
  // State
  callState: CallState
  isInCall: boolean
  hasIncomingCall: boolean
  // Actions
  initiateCall: (participant: CallParticipant, type: CallType, conversationId?: string) => Promise<void>
  acceptCall: () => Promise<void>
  rejectCall: () => void
  endCall: () => void
  toggleMute: () => void
  toggleVideo: () => void
  toggleScreenShare: () => Promise<void>
  // Streams
  localStream: MediaStream | null
  remoteStream: MediaStream | null
}

const initialCallState: CallState = {
  callId: null,
  status: 'idle',
  direction: null,
  type: 'audio',
  localStream: null,
  remoteStream: null,
  localParticipant: null,
  remoteParticipant: null,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  error: null,
  startTime: null
}

export const useCall = ({
  wsClient,
  apiClient,
  currentUser,
  onCallStarted,
  onCallEnded
}: UseCallOptions): UseCallReturn => {
  const [callState, setCallState] = useState<CallState>(initialCallState)
  const webrtcRef = useRef<WebRTCClient | null>(null)
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSignalRef = useRef<CallSignal | null>(null)
  const iceServersRef = useRef<RTCIceServer[] | null>(null)

  // Use refs to avoid stale closures in WebRTC callbacks
  const callStateRef = useRef<CallState>(initialCallState)
  const wsClientRef = useRef<ChatWebSocketClient | null>(null)
  const currentUserRef = useRef<CallParticipant | null>(null)
  const apiClientRef = useRef<ChatApiClient | null>(null)

  // Keep refs in sync with state/props
  callStateRef.current = callState
  wsClientRef.current = wsClient
  currentUserRef.current = currentUser
  apiClientRef.current = apiClient || null

  // Update call state helper
  const updateCallState = useCallback((updates: Partial<CallState>) => {
    setCallState(prev => ({ ...prev, ...updates }))
  }, [])

  // Clear ring timeout
  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current)
      ringTimeoutRef.current = null
    }
  }, [])

  // Cleanup call resources - use refs to avoid dependency on changing state
  const cleanupCall = useCallback(
    (reportDuration = true) => {
      clearRingTimeout()

      // Use ref to get latest values without triggering effect re-runs
      const callId = callStateRef.current.callId
      const startTime = callStateRef.current.startTime
      const remoteParticipant = callStateRef.current.remoteParticipant

      if (webrtcRef.current) {
        webrtcRef.current.endCall()
        webrtcRef.current.destroy()
        webrtcRef.current = null
      }

      // Clear active call from localStorage for multi-tab detection
      clearActiveCallFromStorage()

      setCallState(initialCallState)
      pendingSignalRef.current = null

      // Report call ended with duration
      if (reportDuration && callId && startTime && remoteParticipant) {
        const duration = Date.now() - startTime
        onCallEnded?.(callId, duration)
      }
    },
    [clearRingTimeout, onCallEnded]
  )

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

  // Fetch ICE servers from backend (with caching and TURN fallback)
  const fetchIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
    // Only use cache if it has TURN servers
    if (iceServersRef.current && hasTurnServers(iceServersRef.current)) {
      console.log('[useCall] ✅ Using cached ICE servers with TURN')
      return iceServersRef.current
    }

    // Clear stale cache without TURN
    if (iceServersRef.current) {
      console.log('[useCall] 🔄 Cached servers have no TURN, refreshing...')
      iceServersRef.current = null
    }

    let backendServers: RTCIceServer[] = []

    // Try to fetch from backend
    if (apiClientRef.current) {
      try {
        console.log('[useCall] 📡 Fetching ICE servers from backend...')
        const response = await apiClientRef.current.getIceServers()
        backendServers = response.iceServers.map(server => ({
          urls: server.urls,
          username: server.username,
          credential: server.credential
        }))
        console.log('[useCall] Backend returned:', backendServers.length, 'servers')
      } catch (error) {
        console.warn('[useCall] Failed to fetch ICE servers from backend:', error)
      }
    }

    // Check if backend provided TURN servers
    const hasTurnFromBackend = hasTurnServers(backendServers)

    // ALWAYS add fallback TURN servers if backend doesn't have any
    let finalServers: RTCIceServer[]
    if (!hasTurnFromBackend) {
      console.log('[useCall] ⚠️ Backend has NO TURN servers! Adding fallback TURN relay...')
      finalServers = [...backendServers, ...FALLBACK_TURN_SERVERS]
    } else {
      console.log('[useCall] ✅ Backend provided TURN servers')
      finalServers = backendServers
    }

    const hasTurn = hasTurnServers(finalServers)
    console.log('[useCall] 🌐 Final ICE servers configuration:', {
      serverCount: finalServers.length,
      hasTurn,
      fromBackend: backendServers.length,
      fallbackAdded: !hasTurnFromBackend,
      servers: finalServers.map(s => ({
        urls: s.urls,
        hasCredentials: !!(s.username && s.credential)
      }))
    })

    if (!hasTurn) {
      console.error('[useCall] ❌ CRITICAL: No TURN servers! Some users WILL NOT be able to connect!')
    }

    iceServersRef.current = finalServers
    return finalServers
  }, [])

  // Initialize WebRTC and set up event handlers
  const initializeWebRTC = useCallback(async (): Promise<WebRTCClient> => {
    if (webrtcRef.current) {
      webrtcRef.current.destroy()
    }

    // Fetch ICE servers (TURN credentials) from backend
    const iceServers = await fetchIceServers()

    const webrtc = new WebRTCClient(iceServers.length > 0 ? iceServers : undefined)
    webrtcRef.current = webrtc

    // Handle local stream ready
    webrtc.on('localStreamReady', (stream: MediaStream) => {
      const videoTracks = stream.getVideoTracks()
      const audioTracks = stream.getAudioTracks()
      console.log('[useCall] 📹 Local stream ready:', {
        audioTracks: audioTracks.length,
        videoTracks: videoTracks.length,
        videoEnabled: videoTracks[0]?.enabled,
        videoLabel: videoTracks[0]?.label,
        callType: callStateRef.current.type
      })
      updateCallState({ localStream: stream })
    })

    // Handle remote stream ready
    webrtc.on('remoteStreamReady', (stream: MediaStream) => {
      console.log('[useCall] 📺 Remote stream ready:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length
      })
      updateCallState({ remoteStream: stream })
    })

    // Handle ICE connection state changes
    webrtc.on('iceConnectionStateChanged', (state: RTCIceConnectionState) => {
      console.log('[useCall] 🧊 ICE connection state:', state)
      if (state === 'connected' || state === 'completed') {
        console.log('[useCall] ✅ Call connected!')
        updateCallState({ status: 'connected', startTime: Date.now() })
        // Mark active call in localStorage for multi-tab detection
        if (currentUserRef.current && callStateRef.current.callId) {
          setActiveCallInStorage(currentUserRef.current.id, callStateRef.current.callId)
        }
      } else if (state === 'failed') {
        console.error('[useCall] ❌ ICE connection failed')
        updateCallState({ status: 'failed', error: 'Connection failed' })
        clearActiveCallFromStorage()
        // Auto-cleanup after failure
        setTimeout(() => cleanupCall(false), 3000)
      } else if (state === 'disconnected') {
        // Could be temporary, wait a bit
        console.warn('[useCall] ⚠️ ICE disconnected, waiting for reconnection...')
      } else if (state === 'checking') {
        console.log('[useCall] 🔍 ICE checking connectivity...')
      }
    })

    // Handle signals ready (ICE candidates, etc.)
    // Use refs to avoid stale closures
    webrtc.on('signalReady', (signal: { type: string; payload: any }) => {
      if (signal.type === 'ice-candidate' && wsClientRef.current && currentUserRef.current) {
        const remoteParticipant = callStateRef.current.remoteParticipant || pendingSignalRef.current?.from
        const callId = callStateRef.current.callId
        if (remoteParticipant && callId) {
          wsClientRef.current.sendIceCandidate({
            callId,
            from: currentUserRef.current,
            to: remoteParticipant,
            payload: signal.payload
          })
        }
      }
    })

    // Handle errors
    webrtc.on('error', (error: { type: string; message: string }) => {
      console.error('WebRTC error:', error)
      updateCallState({ error: error.message })
    })

    return webrtc
  }, [updateCallState, cleanupCall, fetchIceServers])

  // Initiate a call
  const initiateCall = useCallback(
    async (participant: CallParticipant, type: CallType, conversationId?: string) => {
      console.log('[useCall] 📞 Initiating call:', {
        type,
        to: participant.odName,
        conversationId
      })

      if (!wsClient || !currentUser) {
        console.error('[useCall] ❌ Cannot initiate call: WebSocket or user not available')
        return
      }

      if (callState.status !== 'idle') {
        console.warn('[useCall] ⚠️ Already in a call, status:', callState.status)
        return
      }

      const callId = generateCallId()
      console.log('[useCall] 🆔 Generated call ID:', callId)

      try {
        // Update state
        console.log('[useCall] 🔄 Updating state to initiating')
        updateCallState({
          callId,
          status: 'initiating',
          direction: 'outgoing',
          type,
          localParticipant: currentUser,
          remoteParticipant: participant,
          error: null
        })

        // Initialize WebRTC (fetches ICE servers from backend)
        console.log('[useCall] 🌐 Initializing WebRTC...')
        const webrtc = await initializeWebRTC()
        console.log('[useCall] ✅ WebRTC initialized')

        // Get local media stream
        console.log('[useCall] 🎥 Getting local media stream...')
        await webrtc.initializeLocalStream(type)
        console.log('[useCall] ✅ Local stream ready')

        // Create peer connection
        console.log('[useCall] 🔗 Creating peer connection...')
        webrtc.createPeerConnection()
        console.log('[useCall] ✅ Peer connection created')

        // Send call initiation signal
        console.log('[useCall] 📡 Sending call initiation signal via WebSocket')
        wsClient.initiateCall({
          callId,
          callType: type,
          from: currentUser,
          to: participant,
          conversationId
        })

        // Update status to ringing
        console.log('[useCall] 🔔 Call ringing...')
        updateCallState({ status: 'ringing' })

        // Set ring timeout
        ringTimeoutRef.current = setTimeout(() => {
          console.warn('[useCall] ⏰ Call ring timeout - no answer')
          updateCallState({ status: 'ended', error: 'No answer' })
          wsClient.endCall({
            callId,
            from: currentUser,
            to: participant
          })
          setTimeout(() => cleanupCall(false), 2000)
        }, RING_TIMEOUT)
      } catch (error) {
        console.error('[useCall] ❌ Failed to initiate call:', error)
        updateCallState({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Failed to start call'
        })
        cleanupCall(false)
      }
    },
    [wsClient, currentUser, callState.status, updateCallState, initializeWebRTC, cleanupCall]
  )

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    console.log('[useCall] ✅ Accepting incoming call')

    if (!wsClient || !currentUser || !pendingSignalRef.current) {
      console.error('[useCall] ❌ Cannot accept call: missing requirements')
      return
    }

    const signal = pendingSignalRef.current
    console.log('[useCall] 📞 Call details:', {
      callId: signal.callId,
      type: signal.callType,
      from: signal.from.odName
    })
    clearRingTimeout()

    try {
      console.log('[useCall] 🔄 Status: connecting')
      updateCallState({ status: 'connecting' })

      // Initialize WebRTC (fetches ICE servers from backend)
      console.log('[useCall] 🌐 Initializing WebRTC...')
      const webrtc = await initializeWebRTC()
      console.log('[useCall] ✅ WebRTC initialized')

      // Get local media stream
      console.log('[useCall] 🎥 Getting local media stream...')
      await webrtc.initializeLocalStream(signal.callType)
      console.log('[useCall] ✅ Local stream ready')

      // Create peer connection
      console.log('[useCall] 🔗 Creating peer connection...')
      webrtc.createPeerConnection()
      console.log('[useCall] ✅ Peer connection created')

      // Send accept signal
      console.log('[useCall] 📡 Sending accept signal via WebSocket')
      wsClient.acceptCall({
        callId: signal.callId,
        callType: signal.callType,
        from: currentUser,
        to: signal.from
      })

      console.log('[useCall] 🎉 Call accepted successfully')
      onCallStarted?.(signal.callId, signal.from)
    } catch (error) {
      console.error('[useCall] ❌ Failed to accept call:', error)
      updateCallState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to accept call'
      })
      cleanupCall(false)
    }
  }, [wsClient, currentUser, updateCallState, initializeWebRTC, clearRingTimeout, cleanupCall, onCallStarted])

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!wsClient || !currentUser || !pendingSignalRef.current) {
      return
    }

    const signal = pendingSignalRef.current
    clearRingTimeout()

    wsClient.rejectCall({
      callId: signal.callId,
      from: currentUser,
      to: signal.from,
      reason: 'rejected'
    })

    cleanupCall(false)
  }, [wsClient, currentUser, clearRingTimeout, cleanupCall])

  // End active call
  const endCall = useCallback(() => {
    if (!wsClient || !currentUser || !callState.callId) {
      cleanupCall(false)
      return
    }

    const remoteParticipant = callState.remoteParticipant
    if (remoteParticipant) {
      wsClient.endCall({
        callId: callState.callId,
        from: currentUser,
        to: remoteParticipant
      })
    }

    cleanupCall(true)
  }, [wsClient, currentUser, callState.callId, callState.remoteParticipant, cleanupCall])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (webrtcRef.current) {
      const isMuted = webrtcRef.current.toggleMute()
      updateCallState({ isMuted })
    }
  }, [updateCallState])

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (webrtcRef.current) {
      const isVideoOff = webrtcRef.current.toggleVideo()
      updateCallState({ isVideoOff })
    }
  }, [updateCallState])

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (!webrtcRef.current) return

    try {
      if (webrtcRef.current.isScreenSharing()) {
        await webrtcRef.current.stopScreenShare()
        updateCallState({ isScreenSharing: false })
      } else {
        await webrtcRef.current.startScreenShare()
        updateCallState({ isScreenSharing: true })
      }
    } catch (error) {
      console.error('Screen share error:', error)
    }
  }, [updateCallState])

  // Handle incoming call signals
  // Using refs to avoid recreating handlers on every state change
  useEffect(() => {
    if (!wsClient || !currentUser) {
      // Skip setup until both are available (expected during initialization)
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[useCall] 🎧 Setting up call event listeners', {
        hasWsClient: !!wsClient,
        hasCurrentUser: !!currentUser,
        currentUserId: currentUser?.id
      })
    }

    // Handle incoming call initiation
    const handleCallInitiate = (signal: CallSignal) => {
      console.log('[useCall] 📞 Incoming call received:', {
        callId: signal.callId,
        type: signal.callType,
        from: signal.from.odName
      })

      // Ignore if already in a call (use ref to get latest status)
      if (callStateRef.current.status !== 'idle') {
        console.log('[useCall] ⚠️ Already in a call, sending busy signal')
        wsClientRef.current?.sendBusy({
          callId: signal.callId,
          from: currentUserRef.current!,
          to: signal.from
        })
        return
      }

      // Ignore if user is in a call in another tab
      if (currentUserRef.current && isInCallInAnotherTab(currentUserRef.current.id)) {
        console.log('[useCall] ⚠️ User is in call in another tab, sending busy signal')
        wsClientRef.current?.sendBusy({
          callId: signal.callId,
          from: currentUserRef.current!,
          to: signal.from
        })
        return
      }

      // Store pending signal
      pendingSignalRef.current = signal

      // Update state for incoming call
      console.log('[useCall] 🔔 Showing incoming call dialog')
      updateCallState({
        callId: signal.callId,
        status: 'ringing',
        direction: 'incoming',
        type: signal.callType,
        localParticipant: currentUserRef.current,
        remoteParticipant: signal.from
      })

      // Set ring timeout
      ringTimeoutRef.current = setTimeout(() => {
        console.warn('[useCall] ⏰ Incoming call ring timeout')
        cleanupCall(false)
      }, RING_TIMEOUT)
    }

    // Handle call accepted
    const handleCallAccept = async (signal: CallSignal) => {
      console.debug('Received call:accept', signal)

      if (callStateRef.current.callId !== signal.callId) return
      clearRingTimeout()

      updateCallState({ status: 'connecting' })

      try {
        if (!webrtcRef.current) {
          console.error('WebRTC client not initialized when receiving call:accept')
          updateCallState({ status: 'failed', error: 'WebRTC not ready' })
          return
        }

        // Create and send offer
        const offer = await webrtcRef.current.createOffer()
        wsClientRef.current?.sendCallOffer({
          callId: signal.callId,
          callType: callStateRef.current.type,
          from: currentUserRef.current!,
          to: signal.from,
          payload: offer
        })

        onCallStarted?.(signal.callId, signal.from)
      } catch (error) {
        console.error('Failed to create offer:', error)
        updateCallState({ status: 'failed', error: 'Failed to connect' })
        cleanupCall(false)
      }
    }

    // Handle call rejected
    const handleCallReject = (signal: CallSignal) => {
      console.debug('Received call:reject', signal)

      if (callStateRef.current.callId !== signal.callId) return

      updateCallState({ status: 'ended', error: signal.payload?.toString() || 'Call rejected' })
      setTimeout(() => cleanupCall(false), 2000)
    }

    // Handle call ended
    const handleCallEnd = (signal: CallSignal) => {
      console.debug('Received call:end', signal)

      if (callStateRef.current.callId !== signal.callId) return

      updateCallState({ status: 'ended' })
      cleanupCall(true)
    }

    // Handle WebRTC offer
    const handleCallOffer = async (signal: CallSignal) => {
      console.debug('Received call:offer', signal)

      if (callStateRef.current.callId !== signal.callId || !signal.payload) return

      try {
        if (!webrtcRef.current) {
          console.error('WebRTC client not initialized when receiving call:offer')
          updateCallState({ status: 'failed', error: 'WebRTC not ready' })
          return
        }

        const answer = await webrtcRef.current.handleOffer(signal.payload as RTCSessionDescriptionInit)
        wsClientRef.current?.sendCallAnswer({
          callId: signal.callId,
          callType: callStateRef.current.type,
          from: currentUserRef.current!,
          to: signal.from,
          payload: answer
        })
      } catch (error) {
        console.error('Failed to handle offer:', error)
        updateCallState({ status: 'failed', error: 'Failed to connect' })
        cleanupCall(false)
      }
    }

    // Handle WebRTC answer
    const handleCallAnswer = async (signal: CallSignal) => {
      console.debug('Received call:answer', signal)

      if (callStateRef.current.callId !== signal.callId || !signal.payload) return

      try {
        if (!webrtcRef.current) {
          console.error('WebRTC client not initialized when receiving call:answer')
          updateCallState({ status: 'failed', error: 'WebRTC not ready' })
          return
        }

        await webrtcRef.current.handleAnswer(signal.payload as RTCSessionDescriptionInit)
      } catch (error) {
        console.error('Failed to handle answer:', error)
        updateCallState({ status: 'failed', error: 'Failed to connect' })
        cleanupCall(false)
      }
    }

    // Handle ICE candidate
    const handleIceCandidate = async (signal: CallSignal) => {
      if (callStateRef.current.callId !== signal.callId || !signal.payload) return

      try {
        if (!webrtcRef.current) {
          console.warn('WebRTC client not ready for ICE candidate, ignoring')
          return
        }

        await webrtcRef.current.addIceCandidate(signal.payload as RTCIceCandidateInit)
      } catch (error) {
        console.error('Failed to add ICE candidate:', error)
      }
    }

    // Handle busy signal
    const handleCallBusy = (signal: CallSignal) => {
      console.debug('Received call:busy', signal)

      if (callStateRef.current.callId !== signal.callId) return

      updateCallState({ status: 'ended', error: 'User is busy' })
      setTimeout(() => cleanupCall(false), 2000)
    }

    // Register listeners
    console.log('[useCall] 📝 Registering all call event listeners...')
    wsClient.onCallInitiate(handleCallInitiate)
    wsClient.onCallAccept(handleCallAccept)
    wsClient.onCallReject(handleCallReject)
    wsClient.onCallEnd(handleCallEnd)
    wsClient.onCallOffer(handleCallOffer)
    wsClient.onCallAnswer(handleCallAnswer)
    wsClient.onCallIceCandidate(handleIceCandidate)
    wsClient.onCallBusy(handleCallBusy)
    console.log('[useCall] ✅ All call event listeners registered')

    return () => {
      console.log('[useCall] 🧹 Cleaning up call event listeners')
      wsClient.removeCallListeners()
    }
    // Using refs for most values to avoid effect re-runs during call flow
    // CRITICAL: Only depend on wsClient and currentUser - functions use refs internally
  }, [wsClient, currentUser])

  // Listen for storage changes to detect when user accepts call in another tab
  // This allows us to dismiss the incoming call dialog in other tabs
  useEffect(() => {
    const hasIncomingCall = callState.status === 'ringing' && callState.direction === 'incoming'

    const handleStorageChange = (event: StorageEvent) => {
      // Only handle changes to our active call key
      if (event.key !== ACTIVE_CALL_KEY) return

      // If there's now an active call and we have an incoming call, dismiss it
      if (event.newValue && hasIncomingCall && currentUserRef.current) {
        try {
          const data = JSON.parse(event.newValue)
          // If the active call is for the same user and it's recent, dismiss the incoming call
          if (data.userId === currentUserRef.current.id && Date.now() - data.timestamp < 5000) {
            console.debug('User accepted call in another tab, dismissing incoming call')
            cleanupCall(false)
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [callState.status, callState.direction, cleanupCall])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearRingTimeout()
      if (webrtcRef.current) {
        webrtcRef.current.destroy()
      }
    }
  }, [clearRingTimeout])

  return {
    callState,
    isInCall: callState.status === 'connected' || callState.status === 'connecting',
    hasIncomingCall: callState.status === 'ringing' && callState.direction === 'incoming',
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    localStream: callState.localStream,
    remoteStream: callState.remoteStream
  }
}
