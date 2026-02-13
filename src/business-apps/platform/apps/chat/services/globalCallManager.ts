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
import type { RTKRnnoiseMiddleware } from './rtkRnnoiseMiddleware'

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
  rnnoiseEnabled: boolean // Whether RNNoise AI noise suppression is enabled
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

  // RNNoise middleware instance (must outlive React component lifecycle)
  rnnoiseMiddlewareInstance: RTKRnnoiseMiddleware | null

  // Active speaker tracking
  activeSpeakerId: string | null
  activeSpeakerHistory: string[]

  // FIXED: Separate call conversation from active conversation
  // callConversation: The conversation where the call was initiated (based on roomId) - used for participant avatars
  // activeConversation: Currently active conversation for in-call chat (can change as user navigates)
  callConversation?: any | null
  activeConversation?: any | null

  // Callback functions
  leaveCall: (() => Promise<void>) | null
  toggleMute: (() => void) | null
  toggleVideo: (() => void) | null
  toggleScreenShare: (() => void) | null
  toggleMinimize: (() => void) | null
  toggleBackground: (() => void) | null
  toggleRnnoise: (() => Promise<void>) | null
  setRnnoiseMode: ((mode: 'gentle' | 'moderate' | 'aggressive') => void) | null
  toggleRaiseHand: (() => void) | null
  sendReaction: ((reaction: string) => void) | null
  setVideoQuality: ((quality: VideoQuality) => void) | null
  switchAudioDevice: ((deviceId: string) => Promise<void>) | null
  switchVideoDevice: ((deviceId: string) => Promise<void>) | null
  setNoiseSuppressionEnabled: ((enabled: boolean) => Promise<void>) | null
  setAutoGainControlEnabled: ((enabled: boolean) => Promise<void>) | null
  onInviteParticipant: ((participant: any) => void) | null

  // Additional context
  apiClient: any | null
  accessToken: string | null
  currentUserId: string | null
  conversationName: string | null
  rnnoiseEnabled: boolean
  rnnoiseMode: 'gentle' | 'moderate' | 'aggressive'
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
  rnnoiseEnabled: true, // Default to enabled
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
    rnnoiseMiddlewareInstance: null,
    activeSpeakerId: null,
    activeSpeakerHistory: [],
    callConversation: null,
    activeConversation: null,
    leaveCall: null,
    toggleMute: null,
    toggleVideo: null,
    toggleScreenShare: null,
    toggleMinimize: null,
    toggleBackground: null,
    toggleRnnoise: null,
    setRnnoiseMode: null,
    toggleRaiseHand: null,
    sendReaction: null,
    setVideoQuality: null,
    switchAudioDevice: null,
    switchVideoDevice: null,
    setNoiseSuppressionEnabled: null,
    setAutoGainControlEnabled: null,
    onInviteParticipant: null,
    apiClient: null,
    accessToken: null,
    currentUserId: null,
    conversationName: null,
    rnnoiseEnabled: true, // Default to enabled
    rnnoiseMode: 'aggressive', // Default to aggressive mode
    pendingInvites: new Map(), // Changed from [] to new Map()
    availableParticipants: [],
    activeExperts: []
  }
  private listeners: Set<() => void> = new Set()
  // UI ownership lock for call UI rendering across multiple mounted chat modules.
  // This is needed because the chat screen can be loaded/mounted multiple times (remote loader),
  // which would otherwise render duplicate call modals/minimized widgets.
  private uiOwnerId: string | null = null

  // Subscription ownership lock to prevent duplicate event processing.
  // Only one instance is allowed to subscribe to state changes at a time.
  // Other instances will be passive (no subscription) and rely on direct state queries.
  private subscriptionOwnerId: string | null = null

  // Single-flight guard for RTK audio operations (disableAudio/enableAudio)
  // RTK SDK throws error on concurrent calls: "Unsupported concurrent calls on method: meeting.self.disableAudio"
  private audioOperationInFlight: Promise<void> | null = null

  // Track active container instances to detect duplicates
  private activeInstances: Set<string> = new Set()

  constructor() {
    // Check if there's existing call data from a previous instance
  }

  static getInstance(): GlobalCallManager {
    // Use window object to ensure singleton persists across module reloads
    if (!window.__GLOBAL_CALL_MANAGER__) {
      window.__GLOBAL_CALL_MANAGER__ = new GlobalCallManager()
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
    this.callData = {
      ...this.callData,
      ...data
    }

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

  // Update callbacks (useful when component remounts and needs to refresh stale closures)
  updateCallbacks(
    callbacks: Partial<
      Pick<
        StoredCallData,
        | 'leaveCall'
        | 'toggleMute'
        | 'toggleVideo'
        | 'toggleScreenShare'
        | 'toggleMinimize'
        | 'toggleBackground'
        | 'toggleRnnoise'
        | 'setRnnoiseMode'
        | 'toggleRaiseHand'
        | 'sendReaction'
        | 'setVideoQuality'
        | 'switchAudioDevice'
        | 'switchVideoDevice'
        | 'setNoiseSuppressionEnabled'
        | 'setAutoGainControlEnabled'
        | 'onInviteParticipant'
      >
    >
  ) {
    this.callData = {
      ...this.callData,
      ...callbacks
    }
    // Don't notify listeners for callback updates (no visual changes)
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

  // ---- Subscription Owner Lock -----------------------------------------------
  // Ensures only one instance subscribes to state changes to prevent duplicate event processing.
  getSubscriptionOwnerId(): string | null {
    return this.subscriptionOwnerId
  }

  claimSubscriptionOwner(instanceId: string): boolean {
    if (!this.subscriptionOwnerId || this.subscriptionOwnerId === instanceId) {
      this.subscriptionOwnerId = instanceId
      return true
    }
    return false
  }

  releaseSubscriptionOwner(instanceId: string) {
    if (this.subscriptionOwnerId === instanceId) {
      this.subscriptionOwnerId = null
    }
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
    if (this.callData.durationInterval) {
      clearInterval(this.callData.durationInterval)
    }

    // Best-effort cleanup of RNNoise middleware (can be left attached across navigation).
    try {
      this.callData.rnnoiseMiddlewareInstance?.destroy(this.callData.realtimeKitMeeting)
    } catch {
      // Best-effort
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
      rnnoiseMiddlewareInstance: null,
      activeSpeakerId: null,
      activeSpeakerHistory: [],
      leaveCall: null,
      toggleMute: null,
      toggleVideo: null,
      toggleScreenShare: null,
      toggleMinimize: null,
      toggleBackground: null,
      toggleRnnoise: null,
      setRnnoiseMode: null,
      toggleRaiseHand: null,
      sendReaction: null,
      setVideoQuality: null,
      switchAudioDevice: null,
      switchVideoDevice: null,
      setNoiseSuppressionEnabled: null,
      setAutoGainControlEnabled: null,
      onInviteParticipant: null,
      apiClient: null,
      accessToken: null,
      currentUserId: null,
      conversationName: null,
      rnnoiseEnabled: true,
      rnnoiseMode: 'aggressive',
      pendingInvites: new Map(), // Changed from [] to new Map()
      availableParticipants: [],
      activeExperts: []
    }

    // Reset both ownership locks so the next call can be claimed by any mounted instance
    this.uiOwnerId = null
    this.subscriptionOwnerId = null

    // Clear any stale instance registrations (they should have unsubscribed, but just in case)
    if (this.activeInstances.size > 0) {
      this.activeInstances.clear()
    }

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

  /**
   * Execute RTK audio operation (disableAudio/enableAudio) with single-flight guard.
   * RTK SDK throws error on concurrent calls: "Unsupported concurrent calls on method: meeting.self.disableAudio"
   */
  async executeAudioOperation(fn: () => Promise<void>): Promise<void> {
    // Wait for any in-flight operation to complete first
    if (this.audioOperationInFlight) {
      try {
        await this.audioOperationInFlight
      } catch {
        // Ignore errors from previous operation
      }
    }

    // Execute this operation and track it
    this.audioOperationInFlight = (async () => {
      try {
        await fn()
      } catch (error) {
        console.error('[GlobalCallManager] ❌ Audio operation failed:', error)
        throw error
      } finally {
        // Clear in-flight flag after completion
        this.audioOperationInFlight = null
      }
    })()

    return this.audioOperationInFlight
  }

  // Subscribe to changes with subscription ownership locking
  subscribe(listener: () => void, instanceId?: string): () => void {
    // Track instance registration
    if (instanceId) {
      this.activeInstances.add(instanceId)

      // Try to claim subscription ownership
      const canSubscribe = this.claimSubscriptionOwner(instanceId)

      if (!canSubscribe) {
        // Return a cleanup function that only handles instance tracking
        return () => {
          this.activeInstances.delete(instanceId)
        }
      }
    }

    // Add listener and notify immediately
    this.listeners.add(listener)
    listener()

    // Return cleanup function
    return () => {
      this.listeners.delete(listener)
      if (instanceId) {
        this.releaseSubscriptionOwner(instanceId)
        this.activeInstances.delete(instanceId)
      }
    }
  }

  // Get count of active instances for debugging
  getActiveInstanceCount(): number {
    return this.activeInstances.size
  }

  // Get active listener count for debugging
  getActiveListenerCount(): number {
    return this.listeners.size
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener())
  }
}

// Export singleton instance
export const globalCallManager = GlobalCallManager.getInstance()
