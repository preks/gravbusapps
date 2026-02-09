/**
 * WebRTC Client for Audio/Video Calls
 * Handles peer connection, media streams, and call signaling
 */

export type CallType = 'audio' | 'video'
export type CallStatus = 'idle' | 'initiating' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed'
export type CallDirection = 'outgoing' | 'incoming'

export interface CallParticipant {
  id: string
  odId: string
  odName: string
  avatarUrl?: string
  stream?: MediaStream
  isMuted?: boolean
  isVideoOff?: boolean
}

export interface CallState {
  callId: string | null
  status: CallStatus
  direction: CallDirection | null
  type: CallType
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  localParticipant: CallParticipant | null
  remoteParticipant: CallParticipant | null
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  error: string | null
  startTime: number | null
}

export interface CallSignal {
  callId: string
  type: 'offer' | 'answer' | 'ice-candidate' | 'initiate' | 'accept' | 'reject' | 'end' | 'busy'
  callType: CallType
  from: CallParticipant
  to: CallParticipant
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | null
  conversationId?: string
}

// STUN/TURN server configuration with public TURN fallback
// TURN servers are essential for users behind symmetric NATs or restrictive firewalls
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  // Google STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Open Relay TURN servers (free, public)
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
  {
    urls: 'turns:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
]

export type WebRTCEventType =
  | 'localStreamReady'
  | 'remoteStreamReady'
  | 'callStateChanged'
  | 'error'
  | 'iceConnectionStateChanged'
  | 'signalReady'

export type WebRTCEventHandler = (data: any) => void

export class WebRTCClient {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private screenStream: MediaStream | null = null
  private eventHandlers: Map<WebRTCEventType, Set<WebRTCEventHandler>> = new Map()
  private iceServers: RTCIceServer[]
  private pendingIceCandidates: RTCIceCandidateInit[] = []
  private isRemoteDescriptionSet = false

  constructor(iceServers?: RTCIceServer[]) {
    this.iceServers = iceServers || DEFAULT_ICE_SERVERS
  }

  /**
   * Update ICE servers configuration (e.g., with TURN credentials from backend)
   */
  setIceServers(iceServers: RTCIceServer[]): void {
    this.iceServers = iceServers
  }

  /**
   * Get current ICE servers configuration
   */
  getIceServers(): RTCIceServer[] {
    return this.iceServers
  }

  /**
   * Initialize local media stream
   */
  async initializeLocalStream(
    type: CallType,
    options?: { audioDeviceId?: string | null; videoDeviceId?: string | null }
  ): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          ...(options?.audioDeviceId ? { deviceId: { exact: options.audioDeviceId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video:
          type === 'video'
            ? {
                ...(options?.videoDeviceId ? { deviceId: { exact: options.videoDeviceId } } : {}),
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
              }
            : false
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)

      this.emit('localStreamReady', this.localStream)
      return this.localStream
    } catch (error) {
      console.error('[WebRTC] ❌ Failed to get local media stream:', error)
      this.emit('error', { type: 'media', message: 'Failed to access camera/microphone', error })
      throw error
    }
  }

  /**
   * Switch active microphone device during an ongoing call.
   * Replaces the outbound audio sender track and updates localStream.
   */
  async switchAudioInputDevice(deviceId: string): Promise<void> {
    if (!this.localStream) {
      throw new Error('Local stream not initialized')
    }

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    })

    const newTrack = newStream.getAudioTracks()[0]
    if (!newTrack) {
      newStream.getTracks().forEach(t => t.stop())
      throw new Error('No audio track from selected device')
    }

    const oldTrack = this.localStream.getAudioTracks()[0]
    if (oldTrack) {
      try {
        this.localStream.removeTrack(oldTrack)
      } catch {
        // ignore
      }
      try {
        oldTrack.stop()
      } catch {
        // ignore
      }
    }

    this.localStream.addTrack(newTrack)

    const sender = this.peerConnection?.getSenders().find(s => s.track?.kind === 'audio')
    if (sender) {
      await sender.replaceTrack(newTrack)
    }

    this.emit('localStreamReady', this.localStream)
  }

  /**
   * Switch active camera device during an ongoing call.
   * Replaces the outbound video sender track and updates localStream.
   */
  async switchVideoInputDevice(deviceId: string): Promise<void> {
    if (!this.localStream) {
      throw new Error('Local stream not initialized')
    }

    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })

    const newTrack = newStream.getVideoTracks()[0]
    if (!newTrack) {
      newStream.getTracks().forEach(t => t.stop())
      throw new Error('No video track from selected device')
    }

    const oldTrack = this.localStream.getVideoTracks()[0]
    if (oldTrack) {
      try {
        this.localStream.removeTrack(oldTrack)
      } catch {
        // ignore
      }
      try {
        oldTrack.stop()
      } catch {
        // ignore
      }
    }

    this.localStream.addTrack(newTrack)

    const sender = this.peerConnection?.getSenders().find(s => s.track?.kind === 'video')
    if (sender) {
      await sender.replaceTrack(newTrack)
    }

    this.emit('localStreamReady', this.localStream)
  }

  /**
   * Create and configure RTCPeerConnection
   */
  createPeerConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      this.peerConnection.close()
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10
    })

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream)
        }
      })
    }

    // Handle incoming tracks (remote stream)
    this.peerConnection.ontrack = event => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream()
      }
      this.remoteStream.addTrack(event.track)
      this.emit('remoteStreamReady', this.remoteStream)
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        this.emit('signalReady', {
          type: 'ice-candidate',
          payload: event.candidate.toJSON()
        })
      }
    }

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState
      this.emit('iceConnectionStateChanged', state)

      if (state === 'failed') {
        this.emit('error', { type: 'ice', message: 'Connection failed' })
      } else if (state === 'disconnected') {
        // Could attempt reconnection here
        console.warn('ICE connection disconnected')
      }
    }

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState
      this.emit('callStateChanged', state)
    }

    this.isRemoteDescriptionSet = false
    this.pendingIceCandidates = []

    return this.peerConnection
  }

  /**
   * Create an offer (caller side)
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    })

    await this.peerConnection.setLocalDescription(offer)
    return offer
  }

  /**
   * Handle incoming offer and create answer (callee side)
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      this.createPeerConnection()
    }

    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer))
    this.isRemoteDescriptionSet = true

    // Process any pending ICE candidates
    await this.processPendingIceCandidates()

    const answer = await this.peerConnection!.createAnswer()
    await this.peerConnection!.setLocalDescription(answer)
    return answer
  }

  /**
   * Handle incoming answer (caller side)
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized')
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    this.isRemoteDescriptionSet = true

    // Process any pending ICE candidates
    await this.processPendingIceCandidates()
  }

  /**
   * Add ICE candidate from remote peer
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      console.warn('Peer connection not ready, queuing ICE candidate')
      this.pendingIceCandidates.push(candidate)
      return
    }

    if (!this.isRemoteDescriptionSet) {
      this.pendingIceCandidates.push(candidate)
      return
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('Failed to add ICE candidate:', error)
    }
  }

  /**
   * Process queued ICE candidates
   */
  private async processPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection || !this.isRemoteDescriptionSet) return

    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        console.error('Failed to add pending ICE candidate:', error)
      }
    }

    this.pendingIceCandidates = []
  }

  /**
   * Toggle local audio mute
   */
  toggleMute(): boolean {
    if (!this.localStream) return false

    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      return !audioTrack.enabled // Returns true if now muted
    }
    return false
  }

  /**
   * Toggle local video
   */
  toggleVideo(): boolean {
    if (!this.localStream) {
      console.warn('[WebRTC] ⚠️ No local stream available for toggle')
      return false
    }

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      const isVideoOff = !videoTrack.enabled
      return isVideoOff // Returns true if video is now off
    }
    console.warn('[WebRTC] ⚠️ No video track found in local stream')
    return false
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<MediaStream> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      } as DisplayMediaStreamOptions)

      // Replace video track with screen share
      if (this.peerConnection && this.localStream) {
        const videoTrack = this.screenStream.getVideoTracks()[0]
        const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video')

        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack)
        }

        // Handle when user stops sharing via browser UI
        videoTrack.onended = () => {
          this.stopScreenShare()
        }
      }

      return this.screenStream
    } catch (error) {
      console.error('Failed to start screen share:', error)
      throw error
    }
  }

  /**
   * Stop screen sharing and restore camera
   */
  async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop())
      this.screenStream = null
    }

    // Restore camera video track
    if (this.peerConnection && this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      const sender = this.peerConnection.getSenders().find(s => s.track?.kind === 'video')

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack)
      }
    }
  }

  /**
   * End call and cleanup resources
   */
  endCall(): void {
    // Stop all local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    // Stop screen share if active
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop())
      this.screenStream = null
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    // Clear remote stream reference
    this.remoteStream = null
    this.isRemoteDescriptionSet = false
    this.pendingIceCandidates = []
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream
  }

  /**
   * Check if screen sharing is active
   */
  isScreenSharing(): boolean {
    return this.screenStream !== null
  }

  /**
   * Event handling
   */
  on(event: WebRTCEventType, handler: WebRTCEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  off(event: WebRTCEventType, handler: WebRTCEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler)
  }

  private emit(event: WebRTCEventType, data: any): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in WebRTC event handler for ${event}:`, error)
      }
    })
  }

  /**
   * Cleanup all resources
   */
  destroy(): void {
    this.endCall()
    this.eventHandlers.clear()
  }
}

// Singleton instance for the application
let webrtcClientInstance: WebRTCClient | null = null

export const getWebRTCClient = (iceServers?: RTCIceServer[]): WebRTCClient => {
  if (!webrtcClientInstance) {
    webrtcClientInstance = new WebRTCClient(iceServers)
  }
  return webrtcClientInstance
}

export const destroyWebRTCClient = (): void => {
  if (webrtcClientInstance) {
    webrtcClientInstance.destroy()
    webrtcClientInstance = null
  }
}
