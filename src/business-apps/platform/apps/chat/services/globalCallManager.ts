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

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __GLOBAL_CALL_MANAGER__?: GlobalCallManager
    __GLOBAL_CALL_UI_CONTAINER__?: HTMLElement
  }
}

export interface GlobalCallState {
  status: 'idle' | 'joining' | 'connected'
  roomId: string | null
  callType: CallType
  callImplementation: 'mesh' | 'realtime-kit' | '1-on-1' // Track which implementation is used
  hostId: string | null
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  isMinimized: boolean
  duration: number
  videoQuality: VideoQuality
  backgroundEnabled: boolean
  startTime: number | null
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
  leaveCall: (() => Promise<void>) | null // NEW: Store the proper leave function
}

const initialCallState: GlobalCallState = {
  status: 'idle',
  roomId: null,
  callType: 'audio',
  callImplementation: 'mesh',
  hostId: null,
  isMuted: false,
  isVideoEnabled: true,
  isScreenSharing: false,
  isMinimized: false,
  duration: 0,
  videoQuality: 'low',
  backgroundEnabled: false,
  startTime: null
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
    leaveCall: null // NEW: Initialize leave function
  }
  private listeners: Set<() => void> = new Set()

  constructor() {
    // Check if there's existing call data from a previous instance
    console.debug('GlobalCallManager: Constructor called')
  }

  static getInstance(): GlobalCallManager {
    // Use window object to ensure singleton persists across module reloads
    if (!window.__GLOBAL_CALL_MANAGER__) {
      window.__GLOBAL_CALL_MANAGER__ = new GlobalCallManager()
      console.debug('GlobalCallManager: Created new instance on window')
    }
    return window.__GLOBAL_CALL_MANAGER__
  }

  // Check if there's an active call that should persist
  hasActiveCall(): boolean {
    return this.callData.callState.status !== 'idle' && this.callData.webrtcClient !== null
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
    console.debug('GlobalCallManager: Storing call data')
    this.callData = {
      ...data,
      durationInterval: this.callData.durationInterval,
      leaveCall: data.leaveCall || null // NEW: Store the leave function
    }

    // Start duration tracking if not already started
    if (!this.callData.durationInterval && data.callState.status === 'connected') {
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

  // Clear call data
  clearCall() {
    console.debug('GlobalCallManager: Clearing call data')

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
      leaveCall: null // NEW: Clear the leave function
    }

    // Immediately clear the vanilla DOM UI container
    const container = window.__GLOBAL_CALL_UI_CONTAINER__
    if (container) {
      container.innerHTML = ''
    }

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
    console.debug(
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
