/**
 * Global Pre-Call Setup Manager - Singleton service to manage pre-call setup dialog state
 * that persists outside of the React component lifecycle.
 *
 * This prevents duplicate pre-call setup dialogs when multiple Chat instances are mounted
 * (e.g., in sidepanel + fullscreen, or due to React StrictMode).
 *
 * Uses window object to ensure true persistence across module reloads.
 */

import type { CallType } from './webrtcClient'

const isDebugEnabled = (): boolean => {
  if (typeof globalThis.window === 'undefined') return false
  try {
    return localStorage.getItem('RTK_DEBUG') === 'true'
  } catch {
    return false
  }
}

const debug = (...args: unknown[]) => {
  if (isDebugEnabled()) {
    console.debug('[GlobalPreCallSetupManager]', ...args)
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    __GLOBAL_PRE_CALL_SETUP_MANAGER__?: GlobalPreCallSetupManager
    __GLOBAL_PRE_CALL_SETUP_UI_OWNER_ID__?: string | null
    __GLOBAL_PRE_CALL_SETUP_SOURCE_OWNER_ID__?: string | null
  }
}

export interface PreCallSetupState {
  isOpen: boolean
  callType: CallType
  conversationName?: string
  participantCount: number
  userName?: string
  userAvatarUrl?: string
  conversationType?: 'direct' | 'group' | 'meeting'
}

interface StoredPreCallSetupData {
  state: PreCallSetupState
  onStart: ((preferences: { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled: boolean }) => void) | null
  onCancel: (() => void) | null
}

const initialState: PreCallSetupState = {
  isOpen: false,
  callType: 'audio',
  conversationName: undefined,
  participantCount: 0,
  userName: undefined,
  userAvatarUrl: undefined,
  conversationType: undefined
}

class GlobalPreCallSetupManager {
  private data: StoredPreCallSetupData = {
    state: { ...initialState },
    onStart: null,
    onCancel: null
  }
  private listeners: Set<() => void> = new Set()
  private uiOwnerId: string | null = null
  private sourceOwnerId: string | null = null

  constructor() {
    debug('Constructor called')

    // Initialize UI owner ID from window if it exists
    if (typeof globalThis.window !== 'undefined') {
      if (!globalThis.window.__GLOBAL_PRE_CALL_SETUP_UI_OWNER_ID__) {
        globalThis.window.__GLOBAL_PRE_CALL_SETUP_UI_OWNER_ID__ = null
      }
      this.uiOwnerId = globalThis.window.__GLOBAL_PRE_CALL_SETUP_UI_OWNER_ID__

      if (!globalThis.window.__GLOBAL_PRE_CALL_SETUP_SOURCE_OWNER_ID__) {
        globalThis.window.__GLOBAL_PRE_CALL_SETUP_SOURCE_OWNER_ID__ = null
      }
      this.sourceOwnerId = globalThis.window.__GLOBAL_PRE_CALL_SETUP_SOURCE_OWNER_ID__
    }
  }

  /**
   * Set pre-call setup dialog state
   */
  setState(state: Partial<PreCallSetupState>): void {
    this.data.state = {
      ...this.data.state,
      ...state
    }
    debug('State updated:', this.data.state)
    this.notifyListeners()
  }

  /**
   * Set callbacks
   */
  setCallbacks(
    onStart:
      | ((preferences: { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled: boolean }) => void)
      | null,
    onCancel: (() => void) | null
  ): void {
    this.data.onStart = onStart
    this.data.onCancel = onCancel
    debug('Callbacks updated:', { hasOnStart: !!onStart, hasOnCancel: !!onCancel })
  }

  /**
   * Get current state
   */
  getState(): PreCallSetupState {
    return { ...this.data.state }
  }

  /**
   * Get callbacks
   */
  getCallbacks(): { onStart: StoredPreCallSetupData['onStart']; onCancel: StoredPreCallSetupData['onCancel'] } {
    return {
      onStart: this.data.onStart,
      onCancel: this.data.onCancel
    }
  }

  /**
   * Clear state (reset to initial)
   */
  clearState(): void {
    this.data.state = { ...initialState }
    this.data.onStart = null
    this.data.onCancel = null
    this.sourceOwnerId = null
    debug('State cleared')
    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.__GLOBAL_PRE_CALL_SETUP_SOURCE_OWNER_ID__ = null
    }
    this.notifyListeners()
  }

  /**
   * Check if dialog is open
   */
  isDialogOpen(): boolean {
    return this.data.state.isOpen
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    debug('Listener added, total listeners:', this.listeners.size)
    return () => {
      this.listeners.delete(listener)
      debug('Listener removed, total listeners:', this.listeners.size)
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    debug('Notifying', this.listeners.size, 'listeners')
    this.listeners.forEach(listener => {
      try {
        listener()
      } catch (err) {
        console.error('[GlobalPreCallSetupManager] Error in listener:', err)
      }
    })
  }

  /**
   * Get current UI owner ID
   */
  getUiOwnerId(): string | null {
    return this.uiOwnerId
  }

  /**
   * Get current SOURCE owner ID (the instance allowed to write state/callbacks)
   */
  getSourceOwnerId(): string | null {
    return this.sourceOwnerId
  }

  /**
   * Claim UI ownership for an instance
   * Returns true if ownership was claimed, false if another instance owns it
   */
  claimUiOwner(instanceId: string): boolean {
    if (this.uiOwnerId === null || this.uiOwnerId === instanceId) {
      this.uiOwnerId = instanceId
      if (typeof globalThis.window !== 'undefined') {
        globalThis.window.__GLOBAL_PRE_CALL_SETUP_UI_OWNER_ID__ = instanceId
      }
      debug('✅ UI Ownership claimed by:', instanceId)
      this.notifyListeners() // Notify listeners of ownership change
      return true
    }
    debug('❌ UI Ownership NOT claimed by:', instanceId, 'Owner:', this.uiOwnerId)
    return false
  }

  /**
   * Release UI ownership for an instance
   * Returns true if ownership was released, false if this instance didn't own it
   */
  releaseUiOwner(instanceId: string): boolean {
    if (this.uiOwnerId === instanceId) {
      this.uiOwnerId = null
      if (typeof globalThis.window !== 'undefined') {
        globalThis.window.__GLOBAL_PRE_CALL_SETUP_UI_OWNER_ID__ = null
      }
      debug('🗑️ UI Ownership released by:', instanceId)
      this.notifyListeners() // Notify listeners of ownership change
      return true
    }
    return false
  }

  /**
   * Claim SOURCE ownership for an instance (writer lock)
   * Returns true if ownership was claimed, false if another instance owns it
   */
  claimSourceOwner(instanceId: string): boolean {
    // If dialog is closed, allow a new instance to take ownership (prevents stale locks after HMR)
    if (!this.data.state.isOpen && this.sourceOwnerId && this.sourceOwnerId !== instanceId) {
      this.sourceOwnerId = null
      if (typeof globalThis.window !== 'undefined') {
        globalThis.window.__GLOBAL_PRE_CALL_SETUP_SOURCE_OWNER_ID__ = null
      }
    }

    if (this.sourceOwnerId === null || this.sourceOwnerId === instanceId) {
      this.sourceOwnerId = instanceId
      if (typeof globalThis.window !== 'undefined') {
        globalThis.window.__GLOBAL_PRE_CALL_SETUP_SOURCE_OWNER_ID__ = instanceId
      }
      debug('✅ SOURCE Ownership claimed by:', instanceId)
      this.notifyListeners()
      return true
    }
    debug('❌ SOURCE Ownership NOT claimed by:', instanceId, 'Owner:', this.sourceOwnerId)
    return false
  }

  /**
   * Release SOURCE ownership for an instance (writer lock)
   * Returns true if ownership was released, false if this instance didn't own it
   */
  releaseSourceOwner(instanceId: string): boolean {
    if (this.sourceOwnerId === instanceId) {
      this.sourceOwnerId = null
      if (typeof globalThis.window !== 'undefined') {
        globalThis.window.__GLOBAL_PRE_CALL_SETUP_SOURCE_OWNER_ID__ = null
      }
      debug('🗑️ SOURCE Ownership released by:', instanceId)
      this.notifyListeners()
      return true
    }
    return false
  }

  /**
   * Set state only if caller owns SOURCE ownership (or no owner)
   */
  setStateFrom(instanceId: string, state: Partial<PreCallSetupState>): void {
    if (this.sourceOwnerId !== null && this.sourceOwnerId !== instanceId) {
      return
    }
    this.data.state = {
      ...this.data.state,
      ...state
    }
    debug('State updated from:', instanceId, this.data.state)
    this.notifyListeners()
  }

  /**
   * Set callbacks only if caller owns SOURCE ownership (or no owner)
   */
  setCallbacksFrom(
    instanceId: string,
    onStart:
      | ((preferences: { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled: boolean }) => void)
      | null,
    onCancel: (() => void) | null
  ): void {
    if (this.sourceOwnerId !== null && this.sourceOwnerId !== instanceId) {
      return
    }
    this.data.onStart = onStart
    this.data.onCancel = onCancel
    debug('Callbacks updated from:', instanceId, { hasOnStart: !!onStart, hasOnCancel: !!onCancel })
  }
}

// Create singleton instance on window to persist across module reloads
const getGlobalPreCallSetupManager = (): GlobalPreCallSetupManager => {
  if (typeof globalThis.window === 'undefined') {
    // SSR fallback - create a temporary instance that won't persist
    return new GlobalPreCallSetupManager()
  }

  if (!globalThis.window.__GLOBAL_PRE_CALL_SETUP_MANAGER__) {
    debug('Creating new instance on window')
    globalThis.window.__GLOBAL_PRE_CALL_SETUP_MANAGER__ = new GlobalPreCallSetupManager()
  }

  return globalThis.window.__GLOBAL_PRE_CALL_SETUP_MANAGER__
}

export const globalPreCallSetupManager = getGlobalPreCallSetupManager()
