/**
 * Group WebRTC Client - Manages multiple peer connections for group calls
 * Uses mesh topology where each participant connects to every other participant
 *
 * Limitations:
 * - Best for 2-5 participants
 * - Each participant uploads their stream N-1 times
 * - Bandwidth intensive for larger groups
 */

import type { CallParticipant, CallType } from './webrtcClient'
import { getAudioConstraints } from '../config/audioConstraints'

export type VideoQuality = 'high' | 'medium' | 'low'

export interface VideoQualitySettings {
  width: number
  height: number
  frameRate: number
  bitrate: number
}

export const VIDEO_QUALITY_PRESETS: Record<VideoQuality, VideoQualitySettings> = {
  high: { width: 1280, height: 720, frameRate: 30, bitrate: 2500000 },
  medium: { width: 640, height: 480, frameRate: 24, bitrate: 1000000 },
  low: { width: 320, height: 240, frameRate: 15, bitrate: 500000 }
}

export interface GroupCallParticipant extends CallParticipant {
  peerConnection?: RTCPeerConnection
  stream?: MediaStream
  connectionState?: RTCPeerConnectionState
}

export interface GroupCallState {
  roomId: string
  callType: CallType
  status: 'idle' | 'joining' | 'connected' | 'reconnecting' | 'ended'
  participants: Map<string, GroupCallParticipant>
  localStream: MediaStream | null
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  startTime: number | null
}

export type GroupCallEventType =
  | 'participant-joined'
  | 'participant-left'
  | 'participant-stream'
  | 'participant-connection-state'
  | 'ice-candidate'
  | 'local-stream'
  | 'error'
  | 'state-change'

export interface GroupCallEvent {
  type: GroupCallEventType
  participantId?: string
  participant?: GroupCallParticipant
  stream?: MediaStream
  state?: RTCPeerConnectionState
  candidate?: RTCIceCandidateInit
  error?: Error
  callState?: GroupCallState
}

export type GroupCallEventHandler = (event: GroupCallEvent) => void

// Default ICE servers with STUN and public TURN fallback
// TURN servers are essential for users behind symmetric NATs or restrictive firewalls
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  // Google STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Open Relay TURN servers (free, public)
  // These provide relay capability for users who can't connect peer-to-peer
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
  },
  // Additional TURN servers for redundancy
  {
    urls: 'turns:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
]

// Debug logging helper for WebRTC diagnostics
const logWebRTCDebug = (context: string, data: any) => {
  console.debug(`[GroupWebRTC:${context}]`, data)
}

// Log ICE candidate type for debugging
const getIceCandidateInfo = (candidate: RTCIceCandidate | RTCIceCandidateInit): string => {
  const candidateStr = typeof candidate === 'string' ? candidate : (candidate as any).candidate
  if (!candidateStr) return 'null'

  if (candidateStr.includes('typ relay')) return 'TURN (relay)'
  if (candidateStr.includes('typ srflx')) return 'STUN (srflx)'
  if (candidateStr.includes('typ prflx')) return 'Peer Reflexive (prflx)'
  if (candidateStr.includes('typ host')) return 'Host'
  return 'Unknown'
}

export class GroupWebRTCClient {
  private roomId: string | null = null
  private callType: CallType = 'video'
  private localStream: MediaStream | null = null
  private screenStream: MediaStream | null = null
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private remoteStreams: Map<string, MediaStream> = new Map()
  private participants: Map<string, GroupCallParticipant> = new Map()
  private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map()
  private eventHandlers: Map<GroupCallEventType, Set<GroupCallEventHandler>> = new Map()
  private iceServers: RTCIceServer[]
  private isMuted: boolean = false
  private isVideoEnabled: boolean = true
  private isScreenSharing: boolean = false
  private startTime: number | null = null
  private isDestroyed: boolean = false
  private videoQuality: VideoQuality = 'high'
  // Track ICE candidates per participant for debugging
  private iceCandidateStats: Map<string, { sent: number; received: number; types: string[] }> = new Map()
  // Track connection diagnostics
  private connectionDiagnostics: Map<
    string,
    { iceGatheringState: string; iceConnectionState: string; connectionState: string; lastError?: string }
  > = new Map()
  // Track participants who have failed - use TURN relay for them automatically
  private failedParticipants: Set<string> = new Set()

  constructor(iceServers?: RTCIceServer[]) {
    this.iceServers = iceServers || DEFAULT_ICE_SERVERS

    // Log ICE server configuration for debugging
    const hasTurn = iceServers?.some(
      s =>
        (typeof s.urls === 'string' && s.urls.startsWith('turn:')) ||
        (Array.isArray(s.urls) && s.urls.some(u => u.startsWith('turn:')))
    )
    logWebRTCDebug('constructor', {
      iceServerCount: this.iceServers.length,
      hasTurnServer: hasTurn,
      servers: this.iceServers.map(s => ({
        urls: s.urls,
        hasCredentials: !!(s.username && s.credential)
      }))
    })

    if (!hasTurn) {
      console.warn(
        '[GroupWebRTC] ⚠️ No TURN servers configured! Users behind restrictive NATs may not be able to connect.'
      )
    }
  }

  /**
   * Get connection diagnostics for debugging
   */
  getConnectionDiagnostics(): Map<string, any> {
    const diagnostics = new Map<string, any>()

    this.peerConnections.forEach((pc, participantId) => {
      const stats = this.iceCandidateStats.get(participantId) || { sent: 0, received: 0, types: [] }
      diagnostics.set(participantId, {
        iceGatheringState: pc.iceGatheringState,
        iceConnectionState: pc.iceConnectionState,
        connectionState: pc.connectionState,
        signalingState: pc.signalingState,
        iceCandidatesSent: stats.sent,
        iceCandidatesReceived: stats.received,
        iceCandidateTypes: stats.types,
        hasRemoteDescription: !!pc.remoteDescription,
        hasLocalDescription: !!pc.localDescription,
        ...this.connectionDiagnostics.get(participantId)
      })
    })

    return diagnostics
  }

  /**
   * Update ICE servers configuration
   */
  setIceServers(iceServers: RTCIceServer[]): void {
    this.iceServers = iceServers
  }

  /**
   * Subscribe to events
   */
  on(event: GroupCallEventType, handler: GroupCallEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  /**
   * Unsubscribe from events
   */
  off(event: GroupCallEventType, handler: GroupCallEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler)
  }

  private emit(event: GroupCallEvent): void {
    const handlers = this.eventHandlers.get(event.type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event)
        } catch (err) {
          console.error('Error in event handler:', err)
        }
      })
    }
  }

  /**
   * Get current call state
   */
  getState(): GroupCallState {
    return {
      roomId: this.roomId || '',
      callType: this.callType,
      status: this.roomId ? 'connected' : 'idle',
      participants: new Map(this.participants),
      localStream: this.localStream,
      isMuted: this.isMuted,
      isVideoEnabled: this.isVideoEnabled,
      isScreenSharing: this.isScreenSharing,
      startTime: this.startTime
    }
  }

  /**
   * Initialize local media stream
   */
  async initializeLocalStream(callType: CallType, quality: VideoQuality = 'low'): Promise<MediaStream> {
    this.callType = callType
    this.videoQuality = quality
    const settings = VIDEO_QUALITY_PRESETS[quality]

    const constraints: MediaStreamConstraints = {
      audio: getAudioConstraints(),
      video:
        callType === 'video'
          ? {
              width: { ideal: settings.width },
              height: { ideal: settings.height },
              frameRate: { ideal: settings.frameRate }
            }
          : false
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      this.isVideoEnabled = callType === 'video'
      this.emit({ type: 'local-stream', stream: this.localStream })
      return this.localStream
    } catch (error) {
      console.error('Failed to get local media:', error)
      this.emit({ type: 'error', error: error as Error })
      throw error
    }
  }

  /**
   * Join a group call room
   */
  async joinRoom(roomId: string, callType: CallType, currentUser: CallParticipant): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Client has been destroyed')
    }

    this.roomId = roomId
    this.callType = callType
    this.startTime = Date.now()

    // Add current user to participants
    this.participants.set(currentUser.id, {
      ...currentUser,
      stream: this.localStream || undefined,
      connectionState: 'connected' // Local user is always "connected"
    })

    // Initialize local stream if not already done
    if (!this.localStream) {
      await this.initializeLocalStream(callType)
    }

    this.emit({
      type: 'state-change',
      callState: this.getState()
    })
  }

  /**
   * Create a peer connection for a specific participant
   * @param participantId - ID of the remote participant
   * @param forceRelay - If true, forces TURN relay only (no direct P2P). Use for users who fail with STUN.
   */
  private createPeerConnection(participantId: string, forceRelay: boolean = false): RTCPeerConnection {
    const iceTransportPolicy = forceRelay ? 'relay' : 'all'

    const config: RTCConfiguration = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
      // Force relay mode for users who can't connect with STUN (symmetric NAT, restrictive firewall)
      iceTransportPolicy
    }

    // Always log the transport policy

    if (forceRelay) {
    }

    logWebRTCDebug('createPeerConnection', {
      participantId,
      iceServerCount: this.iceServers.length,
      forceRelay,
      iceTransportPolicy
    })

    // Initialize ICE stats for this participant
    this.iceCandidateStats.set(participantId, { sent: 0, received: 0, types: [] })
    this.connectionDiagnostics.set(participantId, {
      iceGatheringState: 'new',
      iceConnectionState: 'new',
      connectionState: 'new'
    })

    const pc = new RTCPeerConnection(config)

    // Add local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!)
      })
      logWebRTCDebug('addTracks', {
        participantId,
        trackCount: this.localStream.getTracks().length,
        tracks: this.localStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled }))
      })
    }

    // Handle ICE candidates
    pc.onicecandidate = event => {
      if (event.candidate) {
        const candidateType = getIceCandidateInfo(event.candidate)
        const stats = this.iceCandidateStats.get(participantId)!
        stats.sent++
        if (!stats.types.includes(candidateType)) {
          stats.types.push(candidateType)
        }

        logWebRTCDebug('iceCandidate:local', {
          participantId,
          type: candidateType,
          totalSent: stats.sent,
          candidate: event.candidate.candidate?.substring(0, 80) + '...'
        })

        // Emit ICE candidate event for the parent to send via signaling
        this.emit({
          type: 'ice-candidate',
          participantId,
          candidate: event.candidate.toJSON()
        })
      } else {
        // Null candidate means ICE gathering is complete
        logWebRTCDebug('iceGathering:complete', {
          participantId,
          stats: this.iceCandidateStats.get(participantId)
        })
      }
    }

    // Handle ICE gathering state changes
    pc.onicegatheringstatechange = () => {
      const diag = this.connectionDiagnostics.get(participantId)!
      diag.iceGatheringState = pc.iceGatheringState

      logWebRTCDebug('iceGatheringState', {
        participantId,
        state: pc.iceGatheringState
      })
    }

    // Handle ICE connection state changes (more granular than connectionState)
    pc.oniceconnectionstatechange = () => {
      const diag = this.connectionDiagnostics.get(participantId)!
      diag.iceConnectionState = pc.iceConnectionState

      logWebRTCDebug('iceConnectionState', {
        participantId,
        state: pc.iceConnectionState,
        iceCandidateStats: this.iceCandidateStats.get(participantId)
      })

      if (pc.iceConnectionState === 'failed') {
        const stats = this.iceCandidateStats.get(participantId)
        console.error(`[GroupWebRTC] ❌ ICE connection FAILED for ${participantId}`, {
          iceCandidatesSent: stats?.sent,
          iceCandidatesReceived: stats?.received,
          candidateTypes: stats?.types,
          hasTurnServer: this.iceServers.some(
            s =>
              (typeof s.urls === 'string' && s.urls.startsWith('turn:')) ||
              (Array.isArray(s.urls) && s.urls.some(u => u.startsWith('turn:')))
          )
        })
        diag.lastError = 'ICE connection failed - check NAT/firewall or TURN server'
      }

      if (pc.iceConnectionState === 'disconnected') {
        console.warn(`[GroupWebRTC] ⚠️ ICE connection disconnected for ${participantId} - may reconnect`)
      }

      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        logWebRTCDebug('iceConnection:success', {
          participantId,
          stats: this.iceCandidateStats.get(participantId)
        })
      }
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      const diag = this.connectionDiagnostics.get(participantId)!
      diag.connectionState = pc.connectionState

      logWebRTCDebug('connectionState', {
        participantId,
        state: pc.connectionState
      })

      const participant = this.participants.get(participantId)
      if (participant) {
        participant.connectionState = pc.connectionState
        this.participants.set(participantId, participant)
      }

      this.emit({
        type: 'participant-connection-state',
        participantId,
        state: pc.connectionState
      })

      if (pc.connectionState === 'failed') {
        console.error(`[GroupWebRTC] ❌ Connection FAILED to ${participantId}`)
        diag.lastError = 'Peer connection failed'
        // Track this participant as failed - next reconnect will use TURN relay
        this.failedParticipants.add(participantId)
      } else if (pc.connectionState === 'disconnected') {
        console.warn(`[GroupWebRTC] ⚠️ Connection to ${participantId} disconnected`)
      } else if (pc.connectionState === 'connected') {
        // Remove from failed list if previously failed but now connected
        if (this.failedParticipants.has(participantId)) {
          this.failedParticipants.delete(participantId)
        }
      }
    }

    // Handle incoming tracks (remote streams)
    pc.ontrack = event => {
      logWebRTCDebug('track:received', {
        participantId,
        kind: event.track.kind,
        streamCount: event.streams.length,
        trackId: event.track.id
      })

      let stream = event.streams[0]

      // If no stream is associated, create one and add the track
      if (!stream) {
        logWebRTCDebug('track:noStream', { participantId, message: 'Creating new MediaStream' })
        stream = this.remoteStreams.get(participantId) || new MediaStream()
        stream.addTrack(event.track)
      }

      this.remoteStreams.set(participantId, stream)
      logWebRTCDebug('stream:updated', {
        participantId,
        trackCount: stream.getTracks().length,
        tracks: stream.getTracks().map(t => t.kind)
      })

      const participant = this.participants.get(participantId)
      if (participant) {
        participant.stream = stream
        this.participants.set(participantId, participant)
      }

      this.emit({
        type: 'participant-stream',
        participantId,
        stream
      })
    }

    this.peerConnections.set(participantId, pc)
    return pc
  }

  /**
   * Add a new participant to the call and create offer
   */
  async addParticipant(participant: CallParticipant): Promise<RTCSessionDescriptionInit> {
    console.debug('Adding participant to group call:', participant.odName)

    // Store participant info
    this.participants.set(participant.id, {
      ...participant,
      connectionState: 'new'
    })

    // Check if this participant previously failed - use relay mode if so
    const forceRelay = this.failedParticipants.has(participant.id)
    if (forceRelay) {
    }

    // Create peer connection (with relay mode if previously failed)
    const pc = this.createPeerConnection(participant.id, forceRelay)

    // Create and set local description (offer)
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.callType === 'video'
    })
    await pc.setLocalDescription(offer)

    this.emit({
      type: 'participant-joined',
      participantId: participant.id,
      participant: this.participants.get(participant.id)
    })

    return offer
  }

  /**
   * Handle incoming offer from a participant (they are calling us)
   */
  async handleOffer(
    participantId: string,
    participant: CallParticipant,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    console.debug('Handling offer from:', participant.odName)

    // Store participant info
    this.participants.set(participantId, {
      ...participant,
      connectionState: 'connecting'
    })

    // Check if this participant previously failed - use relay mode if so
    const forceRelay = this.failedParticipants.has(participantId)
    if (forceRelay) {
    }

    // Create peer connection if it doesn't exist (with relay mode if previously failed)
    let pc = this.peerConnections.get(participantId)
    if (!pc) {
      pc = this.createPeerConnection(participantId, forceRelay)
    }

    // Set remote description
    await pc.setRemoteDescription(new RTCSessionDescription(offer))

    // Apply any pending ICE candidates
    const pendingCandidates = this.pendingIceCandidates.get(participantId)
    if (pendingCandidates) {
      for (const candidate of pendingCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.warn('Failed to add pending ICE candidate:', err)
        }
      }
      this.pendingIceCandidates.delete(participantId)
    }

    // Create and set local description (answer)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    this.emit({
      type: 'participant-joined',
      participantId,
      participant: this.participants.get(participantId)
    })

    return answer
  }

  /**
   * Handle incoming answer from a participant
   */
  async handleAnswer(participantId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    console.debug('Handling answer from participant:', participantId)

    const pc = this.peerConnections.get(participantId)
    if (!pc) {
      console.warn('No peer connection for participant:', participantId)
      return
    }

    await pc.setRemoteDescription(new RTCSessionDescription(answer))

    // Apply any pending ICE candidates
    const pendingCandidates = this.pendingIceCandidates.get(participantId)
    if (pendingCandidates) {
      for (const candidate of pendingCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.warn('Failed to add pending ICE candidate:', err)
        }
      }
      this.pendingIceCandidates.delete(participantId)
    }
  }

  /**
   * Handle incoming ICE candidate from a participant
   */
  async handleIceCandidate(participantId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const candidateType = getIceCandidateInfo(candidate)

    // Track received candidates
    let stats = this.iceCandidateStats.get(participantId)
    if (!stats) {
      stats = { sent: 0, received: 0, types: [] }
      this.iceCandidateStats.set(participantId, stats)
    }
    stats.received++
    if (!stats.types.includes(candidateType + ' (remote)')) {
      stats.types.push(candidateType + ' (remote)')
    }

    logWebRTCDebug('iceCandidate:remote', {
      participantId,
      type: candidateType,
      totalReceived: stats.received
    })

    const pc = this.peerConnections.get(participantId)

    if (!pc || !pc.remoteDescription) {
      // Queue the candidate for later
      if (!this.pendingIceCandidates.has(participantId)) {
        this.pendingIceCandidates.set(participantId, [])
      }
      this.pendingIceCandidates.get(participantId)!.push(candidate)
      logWebRTCDebug('iceCandidate:queued', {
        participantId,
        reason: !pc ? 'no peer connection' : 'no remote description',
        queueLength: this.pendingIceCandidates.get(participantId)!.length
      })
      return
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
      logWebRTCDebug('iceCandidate:added', { participantId, type: candidateType })
    } catch (err) {
      console.warn(`[GroupWebRTC] Failed to add ICE candidate for ${participantId}:`, err)
      const diag = this.connectionDiagnostics.get(participantId)
      if (diag) {
        diag.lastError = `Failed to add ICE candidate: ${err}`
      }
    }
  }

  /**
   * Remove a participant from the call
   */
  removeParticipant(participantId: string): void {
    console.debug('Removing participant:', participantId)

    // Close peer connection
    const pc = this.peerConnections.get(participantId)
    if (pc) {
      pc.close()
      this.peerConnections.delete(participantId)
    }

    // Remove streams
    this.remoteStreams.delete(participantId)
    this.pendingIceCandidates.delete(participantId)

    // Remove from participants
    const participant = this.participants.get(participantId)
    this.participants.delete(participantId)

    this.emit({
      type: 'participant-left',
      participantId,
      participant
    })
  }

  /**
   * Get all remote streams
   */
  getRemoteStreams(): Map<string, MediaStream> {
    return new Map(this.remoteStreams)
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  /**
   * Get participant by ID
   */
  getParticipant(participantId: string): GroupCallParticipant | undefined {
    return this.participants.get(participantId)
  }

  /**
   * Get all participants
   */
  getParticipants(): Map<string, GroupCallParticipant> {
    return new Map(this.participants)
  }

  /**
   * Get ICE candidate for a participant (for signaling)
   */
  getIceCandidate(participantId: string): RTCIceCandidate | null {
    const pc = this.peerConnections.get(participantId)
    return (pc as any)?._pendingCandidate || null
  }

  /**
   * Toggle audio mute
   */
  toggleMute(): boolean {
    if (!this.localStream) return this.isMuted

    const audioTracks = this.localStream.getAudioTracks()
    this.isMuted = !this.isMuted

    audioTracks.forEach(track => {
      track.enabled = !this.isMuted
    })

    return this.isMuted
  }

  /**
   * Toggle video
   */
  toggleVideo(): boolean {
    if (!this.localStream) return !this.isVideoEnabled

    const videoTracks = this.localStream.getVideoTracks()
    this.isVideoEnabled = !this.isVideoEnabled

    videoTracks.forEach(track => {
      track.enabled = this.isVideoEnabled
    })

    return this.isVideoEnabled
  }

  /**
   * Replace the video track in all peer connections (used for background processing)
   */
  replaceVideoTrack(newTrack: MediaStreamTrack): void {
    console.debug('Replacing video track in all peer connections')

    this.peerConnections.forEach(async (pc, participantId) => {
      const senders = pc.getSenders()
      for (const sender of senders) {
        if (sender.track?.kind === 'video') {
          try {
            await sender.replaceTrack(newTrack)
            console.debug(`Replaced video track for participant ${participantId}`)
          } catch (err) {
            console.error(`Failed to replace video track for participant ${participantId}:`, err)
          }
        }
      }
    })
  }

  /**
   * Get current video quality
   */
  getVideoQuality(): VideoQuality {
    return this.videoQuality
  }

  /**
   * Set video quality and apply to all connections
   */
  async setVideoQuality(quality: VideoQuality): Promise<void> {
    this.videoQuality = quality
    const settings = VIDEO_QUALITY_PRESETS[quality]
    console.debug('Setting video quality to:', quality, settings)

    // Apply constraints to local stream
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        try {
          await videoTrack.applyConstraints({
            width: { ideal: settings.width },
            height: { ideal: settings.height },
            frameRate: { ideal: settings.frameRate }
          })
        } catch (err) {
          console.warn('Failed to apply video constraints:', err)
        }
      }
    }

    // Apply bitrate to all peer connections
    this.peerConnections.forEach(async pc => {
      const senders = pc.getSenders()
      for (const sender of senders) {
        if (sender.track?.kind === 'video') {
          const params = sender.getParameters()
          if (!params.encodings) {
            params.encodings = [{}]
          }
          params.encodings.forEach(encoding => {
            encoding.maxBitrate = settings.bitrate
            encoding.maxFramerate = settings.frameRate
          })
          try {
            await sender.setParameters(params)
          } catch (err) {
            console.warn('Failed to set sender parameters:', err)
          }
        }
      }
    })
  }

  /**
   * Toggle screen sharing
   */
  async toggleScreenShare(): Promise<boolean> {
    if (this.isScreenSharing) {
      // Stop screen sharing
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop())
        this.screenStream = null
      }

      // Replace screen track with camera track
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0]
        if (videoTrack) {
          this.peerConnections.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video')
            if (sender) {
              sender.replaceTrack(videoTrack)
            }
          })
        }
      }

      this.isScreenSharing = false
    } else {
      // Start screen sharing
      try {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
          audio: false
        })

        const screenTrack = this.screenStream.getVideoTracks()[0]

        // Replace camera track with screen track for all connections
        this.peerConnections.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) {
            sender.replaceTrack(screenTrack)
          }
        })

        // Handle screen share stop
        screenTrack.onended = () => {
          this.toggleScreenShare()
        }

        this.isScreenSharing = true
      } catch (error) {
        console.error('Failed to start screen sharing:', error)
        return this.isScreenSharing
      }
    }

    return this.isScreenSharing
  }

  /**
   * Leave the room and clean up
   */
  leaveRoom(): void {
    console.debug('Leaving room:', this.roomId)

    // Close all peer connections
    this.peerConnections.forEach((pc, participantId) => {
      pc.close()
      this.emit({
        type: 'participant-left',
        participantId,
        participant: this.participants.get(participantId)
      })
    })
    this.peerConnections.clear()

    // Stop local streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop())
      this.screenStream = null
    }

    // Clear state
    this.remoteStreams.clear()
    this.participants.clear()
    this.pendingIceCandidates.clear()
    this.roomId = null
    this.startTime = null

    this.emit({
      type: 'state-change',
      callState: this.getState()
    })
  }

  /**
   * Reconnect to a specific participant whose connection failed
   * Forces TURN relay mode since the previous direct connection failed
   * Returns the new offer that needs to be sent via signaling
   */
  async reconnectParticipant(participantId: string): Promise<RTCSessionDescriptionInit | null> {
    const participant = this.participants.get(participantId)
    if (!participant) {
      console.warn(`[GroupWebRTC] Cannot reconnect: participant ${participantId} not found`)
      return null
    }

    // Close existing peer connection if it exists
    const existingPc = this.peerConnections.get(participantId)
    if (existingPc) {
      existingPc.close()
      this.peerConnections.delete(participantId)
    }

    // Clear old state
    this.remoteStreams.delete(participantId)
    this.pendingIceCandidates.delete(participantId)
    this.iceCandidateStats.delete(participantId)
    this.connectionDiagnostics.delete(participantId)

    // Update participant state
    participant.connectionState = 'connecting'
    this.participants.set(participantId, participant)

    // Emit state change
    this.emit({
      type: 'participant-connection-state',
      participantId,
      state: 'connecting'
    })

    try {
      // Create new peer connection with FORCED RELAY MODE
      // Since the previous connection failed, we force TURN relay to bypass NAT/firewall issues
      const pc = this.createPeerConnection(participantId, true) // forceRelay = true

      // Create and set local description (offer)
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callType === 'video',
        iceRestart: true // Important: request ICE restart
      })
      await pc.setLocalDescription(offer)

      return offer
    } catch (error) {
      console.error(`[GroupWebRTC] ❌ Failed to create reconnect offer for ${participantId}:`, error)
      participant.connectionState = 'failed'
      this.participants.set(participantId, participant)
      this.emit({
        type: 'participant-connection-state',
        participantId,
        state: 'failed'
      })
      return null
    }
  }

  /**
   * Get the connection state for a specific participant
   */
  getParticipantConnectionState(participantId: string): RTCPeerConnectionState | null {
    const pc = this.peerConnections.get(participantId)
    return pc?.connectionState || null
  }

  /**
   * Check if a participant needs reconnection (failed or disconnected)
   */
  needsReconnection(participantId: string): boolean {
    const pc = this.peerConnections.get(participantId)
    if (!pc) return false
    return pc.connectionState === 'failed' || pc.connectionState === 'disconnected'
  }

  /**
   * Destroy the client
   */
  destroy(): void {
    this.leaveRoom()
    this.eventHandlers.clear()
    this.isDestroyed = true
  }
}

// Factory function
export const createGroupWebRTCClient = (iceServers?: RTCIceServer[]): GroupWebRTCClient => {
  return new GroupWebRTCClient(iceServers)
}
