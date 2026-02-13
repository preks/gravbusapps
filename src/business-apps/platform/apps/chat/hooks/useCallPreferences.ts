/**
 * useCallPreferences Hook
 *
 * Manages user preferences for video calls using localStorage.
 * Handles video quality, virtual background settings, and active call tracking.
 */

import { useState, useCallback } from 'react'
import type { VideoQuality } from '../services/groupWebrtcClient'

// LocalStorage keys (same as useGroupCall for consistency)
const ACTIVE_CALL_KEY = 'chat_active_call'
const PREF_VIDEO_QUALITY_KEY = 'chat_call_video_quality'
const PREF_BACKGROUND_ENABLED_KEY = 'chat_call_background_enabled'
const PREF_NOISE_SUPPRESSION_ENABLED_KEY = 'chat_call_noise_suppression_enabled'
const PREF_AUTO_GAIN_CONTROL_ENABLED_KEY = 'chat_call_auto_gain_control_enabled'

/**
 * Active call information stored in localStorage
 */
export interface ActiveCallInfo {
  userId: string
  roomId: string
  timestamp: number
}

/**
 * Return type for useCallPreferences hook
 */
export interface UseCallPreferencesReturn {
  videoQuality: VideoQuality
  backgroundEnabled: boolean
  noiseSuppressionEnabled: boolean
  autoGainControlEnabled: boolean
  setVideoQuality: (quality: VideoQuality) => void
  setBackgroundEnabled: (enabled: boolean) => void
  setNoiseSuppressionEnabled: (enabled: boolean) => void
  setAutoGainControlEnabled: (enabled: boolean) => void
  saveActiveCall: (userId: string, roomId: string) => void
  clearActiveCall: () => void
  getActiveCall: () => ActiveCallInfo | null
}

/**
 * Get saved video quality from localStorage
 * @returns Saved quality or 'low' as default
 */
const getSavedVideoQuality = (): VideoQuality => {
  try {
    const saved = localStorage.getItem(PREF_VIDEO_QUALITY_KEY)
    if (saved && ['high', 'medium', 'low'].includes(saved)) {
      return saved as VideoQuality
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'low'
}

/**
 * Get saved background enabled state from localStorage
 * @returns Saved state or false as default (disabled to prevent video flashing)
 */
const getSavedBackgroundEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem(PREF_BACKGROUND_ENABLED_KEY)
    // Default to false if never set (prevents auto-apply feedback loop)
    return saved === null ? false : saved === 'true'
  } catch {
    return false // Default to disabled
  }
}

/**
 * Get saved noise suppression enabled state from localStorage
 * @returns Saved state or true as default (enabled for "nice audio" by default)
 */
const getSavedNoiseSuppressionEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem(PREF_NOISE_SUPPRESSION_ENABLED_KEY)
    return saved === null ? true : saved === 'true'
  } catch {
    return true
  }
}

/**
 * Get saved auto gain control enabled state from localStorage
 * @returns Saved state or false as default (disabled for better quality)
 */
const getSavedAutoGainControlEnabled = (): boolean => {
  try {
    const saved = localStorage.getItem(PREF_AUTO_GAIN_CONTROL_ENABLED_KEY)
    return saved === null ? false : saved === 'true'
  } catch {
    return false
  }
}

/**
 * Hook to manage video call preferences
 *
 * Provides stateful access to user preferences with localStorage persistence:
 * - Video quality (high/medium/low)
 * - Virtual background enabled state
 * - Noise suppression enabled state
 * - Active call tracking for recovery
 *
 * @returns Object with preference state and setter functions
 */
export const useCallPreferences = (): UseCallPreferencesReturn => {
  // Initialize state from localStorage
  const [videoQuality, setVideoQualityState] = useState<VideoQuality>(getSavedVideoQuality())
  const [backgroundEnabled, setBackgroundEnabledState] = useState<boolean>(getSavedBackgroundEnabled())
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabledState] = useState<boolean>(
    getSavedNoiseSuppressionEnabled()
  )
  const [autoGainControlEnabled, setAutoGainControlEnabledState] = useState<boolean>(getSavedAutoGainControlEnabled())

  /**
   * Update video quality preference
   * Persists to localStorage and updates state
   */
  const setVideoQuality = useCallback((quality: VideoQuality) => {
    try {
      localStorage.setItem(PREF_VIDEO_QUALITY_KEY, quality)
      setVideoQualityState(quality)
    } catch {
      // Ignore localStorage errors but still update state
      setVideoQualityState(quality)
    }
  }, [])

  /**
   * Update background enabled preference
   * Persists to localStorage and updates state
   */
  const setBackgroundEnabled = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(PREF_BACKGROUND_ENABLED_KEY, enabled.toString())
      setBackgroundEnabledState(enabled)
    } catch {
      // Ignore localStorage errors but still update state
      setBackgroundEnabledState(enabled)
    }
  }, [])

  /**
   * Update noise suppression enabled preference
   * Persists to localStorage and updates state
   */
  const setNoiseSuppressionEnabled = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(PREF_NOISE_SUPPRESSION_ENABLED_KEY, enabled.toString())
      setNoiseSuppressionEnabledState(enabled)
    } catch {
      setNoiseSuppressionEnabledState(enabled)
    }
  }, [])

  /**
   * Update auto gain control enabled preference
   * Persists to localStorage and updates state
   */
  const setAutoGainControlEnabled = useCallback((enabled: boolean) => {
    try {
      localStorage.setItem(PREF_AUTO_GAIN_CONTROL_ENABLED_KEY, enabled.toString())
      setAutoGainControlEnabledState(enabled)
    } catch {
      setAutoGainControlEnabledState(enabled)
    }
  }, [])

  /**
   * Save active call information to localStorage
   * Used for call recovery if page is refreshed
   */
  const saveActiveCall = useCallback((userId: string, roomId: string) => {
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
      // Ignore localStorage errors
    }
  }, [])

  /**
   * Clear active call information from localStorage
   * Called when user ends the call
   */
  const clearActiveCall = useCallback(() => {
    try {
      localStorage.removeItem(ACTIVE_CALL_KEY)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  /**
   * Get active call information from localStorage
   * Used to check if user has an active call (e.g., after page refresh)
   *
   * @returns Active call info or null if no active call
   */
  const getActiveCall = useCallback((): ActiveCallInfo | null => {
    try {
      const saved = localStorage.getItem(ACTIVE_CALL_KEY)
      if (saved) {
        return JSON.parse(saved) as ActiveCallInfo
      }
    } catch {
      // Ignore localStorage errors
    }
    return null
  }, [])

  return {
    videoQuality,
    backgroundEnabled,
    noiseSuppressionEnabled,
    autoGainControlEnabled,
    setVideoQuality,
    setBackgroundEnabled,
    setNoiseSuppressionEnabled,
    setAutoGainControlEnabled,
    saveActiveCall,
    clearActiveCall,
    getActiveCall
  }
}
