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

// Default ICE servers (STUN only - TURN should be fetched from backend)
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

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

  constructor(iceServers?: RTCIceServer[]) {
    this.iceServers = iceServers || DEFAULT_ICE_SERVERS
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
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
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
   */
  private createPeerConnection(participantId: string): RTCPeerConnection {
    const config: RTCConfiguration = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10
    }

    const pc = new RTCPeerConnection(config)

    // Add local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!)
      })
    }

    // Handle ICE candidates
    pc.onicecandidate = event => {
      if (event.candidate) {
        console.debug(`ICE candidate generated for ${participantId}`)
        // Emit ICE candidate event for the parent to send via signaling
        this.emit({
          type: 'ice-candidate',
          participantId,
          candidate: event.candidate.toJSON()
        })
      }
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.debug(`Connection state for ${participantId}:`, pc.connectionState)

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

      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn(`Connection to ${participantId} ${pc.connectionState}`)
      }
    }

    // Handle incoming tracks (remote streams)
    pc.ontrack = event => {
      console.debug(`Received track from ${participantId}:`, event.track.kind, 'streams:', event.streams.length)

      let stream = event.streams[0]

      // If no stream is associated, create one and add the track
      if (!stream) {
        console.debug(`No stream associated with track, creating new MediaStream for ${participantId}`)
        stream = this.remoteStreams.get(participantId) || new MediaStream()
        stream.addTrack(event.track)
      }

      this.remoteStreams.set(participantId, stream)
      console.debug(
        `Remote stream for ${participantId} now has ${stream.getTracks().length} tracks:`,
        stream.getTracks().map(t => t.kind)
      )

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
      console.debug(`Emitted participant-stream event for ${participantId}`)
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

    // Create peer connection
    const pc = this.createPeerConnection(participant.id)

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

    // Create peer connection if it doesn't exist
    let pc = this.peerConnections.get(participantId)
    if (!pc) {
      pc = this.createPeerConnection(participantId)
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
    const pc = this.peerConnections.get(participantId)

    if (!pc || !pc.remoteDescription) {
      // Queue the candidate for later
      if (!this.pendingIceCandidates.has(participantId)) {
        this.pendingIceCandidates.set(participantId, [])
      }
      this.pendingIceCandidates.get(participantId)!.push(candidate)
      return
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.warn('Failed to add ICE candidate:', err)
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
