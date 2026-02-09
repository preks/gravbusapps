/**
 * Global Call Manager - Singleton service to manage call state that persists
 * outside of the React component lifecycle.
 *
 * This allows calls to continue even when the Chat component unmounts
 * (e.g., when closing chat from the platform header while minimized).
 *
 * Uses window object to ensure true persistence across module reloads.
 */

import type { GroupWebRTCClient, GroupCallParticipant, VideoQuality } from './groupWebrtcClient'
import type { ChatWebSocketClient } from './chatWebSocketClient'
import type { CallParticipant, CallType } from './webrtcClient'

const isGlobalCallDebugEnabled = (): boolean => {
  if (typeof globalThis.window === 'undefined') return false
  try {
    // Reuse the same toggle as RealtimeKit debugging
    return localStorage.getItem('RTK_DEBUG') === 'true'
  } catch {
    return false
  }
}

const debug = (...args: unknown[]) => {
  if (isGlobalCallDebugEnabled()) {
    console.debug(...args)
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __GLOBAL_CALL_MANAGER__?: GlobalCallManager
  }
}

export interface GlobalCallState {
  status: 'idle' | 'joining' | 'connected'
  roomId: string | null
  // RealtimeKit identifiers (optional for other implementations)
  meetingId?: string | null
  sessionId?: string | null
  callType: CallType
  callImplementation: 'mesh' | 'realtime-kit' | '1-on-1' // Track which implementation is used
  hostId: string | null
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  isMinimized: boolean
  hasBeenMinimized: boolean
  duration: number
  videoQuality: VideoQuality
  backgroundEnabled: boolean
  startTime: number | null
  participants: GroupCallParticipant[]
  handRaised: boolean // Whether local user has hand raised
  remoteHandsRaised: Record<string, boolean> // Map of participantId -> handRaised for remote participants
  handRaisedOrder?: Record<string, { order: number; timestamp: number }> // Map of participantId -> order and timestamp
  conversationType?: 'direct' | 'group' | 'meeting' // Type of conversation for proper UI behavior
}

interface StoredCallData {
  webrtcClient: GroupWebRTCClient | null
  wsClient: ChatWebSocketClient | null
  callState: GlobalCallState
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  participants: GroupCallParticipant[]
  currentUser: CallParticipant | null
  durationInterval: NodeJS.Timeout | null

  // RealtimeKit meeting object
  realtimeKitMeeting: any | null

  // Active speaker tracking
  activeSpeakerId: string | null
  activeSpeakerHistory: string[]

  // Active conversation for in-call chat (includes participant avatars and details)
  activeConversation?: any | null

  // Callback functions
  leaveCall: (() => Promise<void>) | null
  toggleMute: (() => void) | null
  toggleVideo: (() => void) | null
  toggleScreenShare: (() => void) | null
  toggleMinimize: (() => void) | null
  toggleBackground: (() => void) | null
  toggleRaiseHand: (() => void) | null
  sendReaction: ((reaction: string) => void) | null
  setVideoQuality: ((quality: VideoQuality) => void) | null
  switchAudioDevice: ((deviceId: string) => Promise<void>) | null
  switchVideoDevice: ((deviceId: string) => Promise<void>) | null
  onInviteParticipant: ((participant: any) => void) | null

  // Additional context
  apiClient: any | null
  accessToken: string | null
  currentUserId: string | null
  conversationName: string | null
  pendingInvites: Map<string, any> // Changed from array to Map to match GroupCallModalRtk
  availableParticipants: any[]
  activeExperts: any[]
}

const initialCallState: GlobalCallState = {
  status: 'idle',
  roomId: null,
  meetingId: null,
  sessionId: null,
  callType: 'audio',
  callImplementation: 'mesh',
  hostId: null,
  isMuted: false,
  isVideoEnabled: true,
  isScreenSharing: false,
  isMinimized: false,
  hasBeenMinimized: false,
  duration: 0,
  videoQuality: 'low',
  backgroundEnabled: false,
  startTime: null,
  participants: [],
  handRaised: false,
  remoteHandsRaised: {},
  handRaisedOrder: {},
  conversationType: undefined
}

class GlobalCallManager {
  private callData: StoredCallData = {
    webrtcClient: null,
    wsClient: null,
    callState: { ...initialCallState },
    localStream: null,
    remoteStreams: new Map(),
    participants: [],
    currentUser: null,
    durationInterval: null,
    realtimeKitMeeting: null,
    activeSpeakerId: null,
    activeSpeakerHistory: [],
    leaveCall: null,
    toggleMute: null,
    toggleVideo: null,
    toggleScreenShare: null,
    toggleMinimize: null,
    toggleBackground: null,
    toggleRaiseHand: null,
    sendReaction: null,
    setVideoQuality: null,
    switchAudioDevice: null,
    switchVideoDevice: null,
    onInviteParticipant: null,
    apiClient: null,
    accessToken: null,
    currentUserId: null,
    conversationName: null,
    pendingInvites: new Map(), // Changed from [] to new Map()
    availableParticipants: [],
    activeExperts: []
  }
  private listeners: Set<() => void> = new Set()
  // UI ownership lock for call UI rendering across multiple mounted chat modules.
  // This is needed because the chat screen can be loaded/mounted multiple times (remote loader),
  // which would otherwise render duplicate call modals/minimized widgets.
  private uiOwnerId: string | null = null

  constructor() {
    // Check if there's existing call data from a previous instance
    debug('GlobalCallManager: Constructor called')
  }

  static getInstance(): GlobalCallManager {
    // Use window object to ensure singleton persists across module reloads
    if (!window.__GLOBAL_CALL_MANAGER__) {
      window.__GLOBAL_CALL_MANAGER__ = new GlobalCallManager()
      debug('GlobalCallManager: Created new instance on window')
    }
    return window.__GLOBAL_CALL_MANAGER__
  }

  // Check if there's an active call that should persist
  hasActiveCall(): boolean {
    return (
      this.callData.callState.status !== 'idle' &&
      (this.callData.webrtcClient !== null || this.callData.realtimeKitMeeting !== null)
    )
  }

  // Check if call is minimized (should persist across unmounts)
  isMinimized(): boolean {
    return this.callData.callState.isMinimized && this.hasActiveCall()
  }

  // Store call data when minimizing
  storeCall(data: {
    webrtcClient: GroupWebRTCClient
    wsClient: ChatWebSocketClient
    callState: GlobalCallState
    localStream: MediaStream | null
    remoteStreams: Map<string, MediaStream>
    participants: GroupCallParticipant[]
    currentUser: CallParticipant | null
    leaveCall?: () => Promise<void> // NEW: Optional leave function
  }) {
    debug('GlobalCallManager: Storing call data')
    this.callData = {
      ...this.callData, // Preserve all existing properties
      ...data, // Override with new data
      leaveCall: data.leaveCall || this.callData.leaveCall // Handle optional leaveCall
    }

    // Start duration tracking if not already started
    if (!this.callData.durationInterval && data.callState.status === 'connected') {
      this.startDurationTracking()
    }

    this.notifyListeners()
  }

  // Set call data with all callbacks and context (new method for RealtimeKit)
  setCall(data: Partial<StoredCallData>) {
    debug('[GlobalCallManager] setCall called with:', {
      status: data.callState?.status,
      implementation: data.callState?.callImplementation,
      hasMeeting: !!data.realtimeKitMeeting,
      hasLocalStream: !!data.localStream,
      participantCount: data.participants?.length || 0,
      roomId: data.callState?.roomId,
      dataKeys: Object.keys(data)
    })

    this.callData = {
      ...this.callData,
      ...data
    }

    debug('[GlobalCallManager] Call data updated, final state:', {
      status: this.callData.callState.status,
      implementation: this.callData.callState.callImplementation,
      hasMeeting: !!this.callData.realtimeKitMeeting,
      hasLocalStream: !!this.callData.localStream,
      participantCount: this.callData.participants.length
    })

    // Start duration tracking if connected
    if (!this.callData.durationInterval && data.callState?.status === 'connected') {
      this.startDurationTracking()
    }

    this.notifyListeners()
  }

  // Update call state
  updateCallState(updates: Partial<GlobalCallState>) {
    this.callData.callState = { ...this.callData.callState, ...updates }
    this.notifyListeners()
  }

  // Update streams
  updateStreams(localStream: MediaStream | null, remoteStreams: Map<string, MediaStream>) {
    this.callData.localStream = localStream
    this.callData.remoteStreams = remoteStreams
    this.notifyListeners()
  }

  // Update participants
  updateParticipants(participants: GroupCallParticipant[]) {
    this.callData.participants = participants
    this.notifyListeners()
  }

  // Get stored call data
  getCallData() {
    return this.callData
  }

  // ---- UI Owner Lock -------------------------------------------------------
  // NOTE: This lock is intentionally managed here (and this manager is stored on `window`)
  // so it works across module reloads / duplicate mounts.
  getUiOwnerId(): string | null {
    return this.uiOwnerId
  }

  claimUiOwner(instanceId: string): boolean {
    if (!this.uiOwnerId || this.uiOwnerId === instanceId) {
      const changed = this.uiOwnerId !== instanceId
      this.uiOwnerId = instanceId
      if (changed) this.notifyListeners()
      return true
    }
    return false
  }

  releaseUiOwner(instanceId: string) {
    if (this.uiOwnerId === instanceId) {
      this.uiOwnerId = null
      this.notifyListeners()
    }
  }

  // Clear call data
  clearCall() {
    debug('GlobalCallManager: Clearing call data')

    if (this.callData.durationInterval) {
      clearInterval(this.callData.durationInterval)
    }

    this.callData = {
      webrtcClient: null,
      wsClient: null,
      callState: { ...initialCallState },
      localStream: null,
      remoteStreams: new Map(),
      participants: [],
      currentUser: null,
      durationInterval: null,
      realtimeKitMeeting: null,
      activeSpeakerId: null,
      activeSpeakerHistory: [],
      leaveCall: null,
      toggleMute: null,
      toggleVideo: null,
      toggleScreenShare: null,
      toggleMinimize: null,
      toggleBackground: null,
      toggleRaiseHand: null,
      sendReaction: null,
      setVideoQuality: null,
      switchAudioDevice: null,
      switchVideoDevice: null,
      onInviteParticipant: null,
      apiClient: null,
      accessToken: null,
      currentUserId: null,
      conversationName: null,
      pendingInvites: new Map(), // Changed from [] to new Map()
      availableParticipants: [],
      activeExperts: []
    }

    // Reset UI owner so the next call can be claimed by any mounted instance
    this.uiOwnerId = null

    // No more DOM manipulation - React handles all UI through GlobalCallContainer
    this.notifyListeners()
  }

  // Start duration tracking
  private startDurationTracking() {
    if (this.callData.durationInterval) {
      clearInterval(this.callData.durationInterval)
    }

    this.callData.durationInterval = setInterval(() => {
      if (this.callData.callState.startTime) {
        const duration = Math.floor((Date.now() - this.callData.callState.startTime) / 1000)
        this.callData.callState = { ...this.callData.callState, duration }
        this.notifyListeners()
      }
    }, 1000)
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    // Immediately notify the new listener of current state
    listener()
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    debug(
      'GlobalCallManager: Notifying',
      this.listeners.size,
      'listeners, status:',
      this.callData.callState.status,
      'isMinimized:',
      this.callData.callState.isMinimized
    )
    this.listeners.forEach(listener => listener())
  }
}

// Export singleton instance
export const globalCallManager = GlobalCallManager.getInstance()
