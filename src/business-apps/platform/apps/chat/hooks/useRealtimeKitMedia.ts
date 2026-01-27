/**
 * useRealtimeKitMedia Hook
 *
 * Manages local media streams and controls for RealtimeKit calls.
 * Handles audio/video toggles, quality settings, and virtual background effects.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { VideoQuality } from '../services/groupWebrtcClient'
import type { CallType } from '../services/webrtcClient'
import { QUALITY_TO_RID } from '../services/realtimeKitSimulcast'
import { RTKVirtualBackground } from '../services/rtkVirtualBackground'
import { rtkDebug } from '../utils/rtkDebug'

export interface UseRealtimeKitMediaOptions {
  meeting: any // RealtimeKit meeting object
  callType: CallType
  initialVideoQuality?: VideoQuality
  initialBackgroundEnabled?: boolean
  onMediaStateChange?: (state: { isMuted: boolean; isVideoEnabled: boolean; backgroundEnabled: boolean }) => void
  callStatus?: 'idle' | 'joining' | 'connected' | 'reconnecting' | 'ended'
}

export interface UseRealtimeKitMediaReturn {
  localStream: MediaStream | null
  isMuted: boolean
  isVideoEnabled: boolean
  backgroundEnabled: boolean
  videoQuality: VideoQuality
  toggleMute: () => boolean
  toggleVideo: () => boolean
  setVideoQuality: (quality: VideoQuality) => Promise<void>
  toggleBackground: () => Promise<void>
}

/**
 * Hook to manage local media for RealtimeKit calls
 *
 * Provides:
 * - Local media stream management
 * - Audio mute/unmute
 * - Video enable/disable
 * - Video quality selection
 * - Virtual background toggle
 * - Automatic state synchronization with SDK
 *
 * @param options - Configuration options
 * @returns Media state and control functions
 */
export const useRealtimeKitMedia = ({
  meeting,
  callType,
  initialVideoQuality = 'low',
  initialBackgroundEnabled = true,
  onMediaStateChange,
  callStatus = 'idle'
}: UseRealtimeKitMediaOptions): UseRealtimeKitMediaReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video')
  const [videoQuality, setVideoQualityState] = useState<VideoQuality>(initialVideoQuality)
  const [backgroundEnabled, setBackgroundEnabled] = useState(initialBackgroundEnabled)

  const virtualBackgroundRef = useRef<RTKVirtualBackground | null>(null)

  // CRITICAL: React to callType changes (e.g., when accepting an invite with different callType)
  useEffect(() => {
    const shouldEnableVideo = callType === 'video'
    rtkDebug.log('[RTK Media] callType changed, updating video state:', {
      callType,
      currentIsVideoEnabled: isVideoEnabled,
      willSetVideoEnabled: shouldEnableVideo,
      hasMeeting: !!meeting,
      hasSelf: !!meeting?.self,
      sdkVideoEnabled: meeting?.self?.videoEnabled
    })

    // Update state
    if (isVideoEnabled !== shouldEnableVideo) {
      setIsVideoEnabled(shouldEnableVideo)

      // CRITICAL: If meeting is already initialized and we need to enable video, do it!
      if (meeting?.self && shouldEnableVideo && !meeting.self.videoEnabled) {
        rtkDebug.log('[RTK Media] Enabling video in SDK due to callType change')
        meeting.self.enableVideo()
      }
    }
  }, [callType, meeting])

  /**
   * Toggle audio mute/unmute
   * Uses SDK methods to control audio state
   *
   * @returns New mute state (true if muted, false if unmuted)
   */
  const toggleMute = useCallback((): boolean => {
    rtkDebug.log('[RTK] 🎤 toggleMute called!', {
      hasMeeting: !!meeting,
      hasSelf: !!meeting?.self,
      currentIsMuted: isMuted
    })

    if (!meeting?.self) {
      rtkDebug.log('[RTK] ⚠️ toggleMute: No meeting.self, returning early')
      return isMuted
    }

    const currentEnabled = meeting.self.audioEnabled ?? false
    const newMuted = currentEnabled // if audio is enabled, we're muting (newMuted = true)

    rtkDebug.log('[RTK] Toggling audio:', currentEnabled ? 'disable' : 'enable', {
      sdkAudioEnabled: meeting.self.audioEnabled,
      stateIsMuted: isMuted,
      willBeMuted: newMuted
    })

    if (currentEnabled) {
      meeting.self.disableAudio()
    } else {
      meeting.self.enableAudio()
    }

    // Return intended new mute state (for optimistic UI update)
    // Actual state will be updated by SDK event listeners
    return newMuted
  }, [meeting, isMuted])

  /**
   * Toggle video on/off
   * Uses SDK methods to control video state
   *
   * @returns New video enabled state (true if enabled, false if disabled)
   */
  const toggleVideo = useCallback((): boolean => {
    rtkDebug.log('[RTK] 📹 toggleVideo called!', {
      hasMeeting: !!meeting,
      hasSelf: !!meeting?.self,
      currentIsVideoEnabled: isVideoEnabled
    })

    if (!meeting?.self) {
      rtkDebug.log('[RTK] ⚠️ toggleVideo: No meeting.self, returning early')
      return isVideoEnabled
    }

    const currentEnabled = meeting.self.videoEnabled ?? false
    const newEnabled = !currentEnabled

    rtkDebug.log('[RTK] Toggling video:', currentEnabled ? 'disable' : 'enable', {
      sdkVideoEnabled: meeting.self.videoEnabled,
      stateVideoEnabled: isVideoEnabled,
      willEnable: newEnabled
    })

    if (currentEnabled) {
      meeting.self.disableVideo()
    } else {
      meeting.self.enableVideo()
    }

    // Return intended new state (for optimistic UI update)
    // Actual state will be updated by SDK event listeners
    return newEnabled
  }, [meeting, isVideoEnabled])

  /**
   * Set video quality preference
   * Attempts to configure subscriber-side quality selection
   *
   * @param quality - Desired video quality (high/medium/low)
   */
  const setVideoQuality = useCallback(
    async (quality: VideoQuality): Promise<void> => {
      const preferredRid = QUALITY_TO_RID[quality]
      rtkDebug.log('[RTK] Setting video quality preference to:', quality, {
        preferredRid,
        note: 'Attempting to configure subscriber-side preferredRid'
      })

      setVideoQualityState(quality)

      // Attempt to configure subscriber-side preferredRid via core SDK
      // The React SDK wraps the core SDK, so meeting object might expose core methods
      if (meeting) {
        try {
          const coreClient = meeting

          // Check if there's a method to update consumer preferences
          if (typeof coreClient.updateConsumerPreferences === 'function') {
            await coreClient.updateConsumerPreferences({
              preferredRid,
              priorityOrdering: 'asciibetical',
              ridNotAvailable: 'asciibetical'
            })
            rtkDebug.log('[RTK] ✅ Configured subscriber preferredRid:', preferredRid)
          } else {
            rtkDebug.log(
              '[RTK] updateConsumerPreferences not available - quality preference saved but SFU controls actual quality'
            )
          }
        } catch (error) {
          rtkDebug.warn('[RTK] Failed to configure subscriber-side quality:', error)
        }
      }
    },
    [meeting]
  )

  /**
   * Toggle virtual background effect
   * Enables/disables blur or image background using video middleware
   */
  const toggleBackground = useCallback(async () => {
    const newValue = !backgroundEnabled

    rtkDebug.log('[RTK] 🎨 Toggling background effect:', { enabled: newValue, hasMeeting: !!meeting })

    if (!meeting?.self) {
      rtkDebug.warn('[RTK] ⚠️ Meeting not available')
      return
    }

    try {
      if (newValue) {
        // Enable background effect
        if (!virtualBackgroundRef.current) {
          virtualBackgroundRef.current = new RTKVirtualBackground()
        }

        // Initialize transformer if not already initialized
        await virtualBackgroundRef.current.initialize(meeting)

        // Apply background with NewWork preset image
        await virtualBackgroundRef.current.enableBackground(meeting)

        rtkDebug.log('[RTK] ✅ Background effect enabled')
      } else {
        // Disable background effect
        if (virtualBackgroundRef.current) {
          virtualBackgroundRef.current.disable(meeting)
          rtkDebug.log('[RTK] ⏸️ Background effect disabled')
        }
      }

      // Update state
      setBackgroundEnabled(newValue)
      onMediaStateChange?.({ isMuted, isVideoEnabled, backgroundEnabled: newValue })
    } catch (error) {
      rtkDebug.error('[RTK] ❌ Failed to toggle background effect:', error)
      // Reset state on error
      setBackgroundEnabled(false)
      onMediaStateChange?.({ isMuted, isVideoEnabled, backgroundEnabled: false })
    }
  }, [backgroundEnabled, meeting, isMuted, isVideoEnabled, onMediaStateChange])

  /**
   * Sync initial state from SDK when meeting.self first becomes available
   * This ensures our state matches the SDK's initial state
   */
  useEffect(() => {
    if (!meeting?.self) return

    const sdkAudioEnabled = meeting.self.audioEnabled ?? false
    const sdkVideoEnabled = meeting.self.videoEnabled ?? false

    rtkDebug.log('[RTK Media] 🔄 Syncing initial state from SDK:', {
      sdkAudioEnabled,
      sdkVideoEnabled,
      currentIsMuted: isMuted,
      currentIsVideoEnabled: isVideoEnabled,
      willUpdateMute: isMuted !== !sdkAudioEnabled,
      willUpdateVideo: isVideoEnabled !== sdkVideoEnabled
    })

    // Sync audio state
    if (isMuted !== !sdkAudioEnabled) {
      setIsMuted(!sdkAudioEnabled)
    }

    // Sync video state
    if (isVideoEnabled !== sdkVideoEnabled) {
      setIsVideoEnabled(sdkVideoEnabled)
    }
  }, [meeting?.self]) // Only run when meeting.self becomes available

  /**
   * Listen to SDK audio/video update events and sync state
   * This ensures our state matches the SDK's internal state when it changes
   */
  useEffect(() => {
    if (!meeting?.self) return

    const handleAudioUpdate = (event: any) => {
      const { audioEnabled } = event
      rtkDebug.log('[RTK] 🎤 audioUpdate event fired:', {
        audioEnabled,
        willBeMuted: !audioEnabled
      })
      setIsMuted(!audioEnabled)
    }

    const handleVideoUpdate = (event: any) => {
      const { videoEnabled } = event
      rtkDebug.log('[RTK] 📹 videoUpdate event fired:', { videoEnabled })
      setIsVideoEnabled(videoEnabled)
    }

    // Attach event listeners if SDK supports them
    const self = meeting.self
    if (self && typeof self.on === 'function') {
      self.on('audioUpdate', handleAudioUpdate)
      self.on('videoUpdate', handleVideoUpdate)
      rtkDebug.log('[RTK] Audio and video event listeners attached')
    }

    return () => {
      if (self && typeof self.off === 'function') {
        try {
          self.off('audioUpdate', handleAudioUpdate)
          self.off('videoUpdate', handleVideoUpdate)
        } catch {
          // Ignore - SDK will handle cleanup
        }
      }
    }
  }, [meeting])

  /**
   * Auto-apply background effect on call connect if enabled
   */
  useEffect(() => {
    if (
      callStatus !== 'connected' ||
      !isVideoEnabled ||
      !backgroundEnabled ||
      !meeting?.self?.videoTrack ||
      virtualBackgroundRef.current !== null
    ) {
      return
    }

    rtkDebug.log('[RTK] 🎨 Auto-applying background effect (enabled by default or user preference)')

    const applyBackground = async () => {
      try {
        if (!virtualBackgroundRef.current) {
          virtualBackgroundRef.current = new RTKVirtualBackground()
        }
        await virtualBackgroundRef.current.initialize(meeting)
        await virtualBackgroundRef.current.enableBackground(meeting)
        rtkDebug.log('[RTK] ✅ Background effect auto-applied successfully')
      } catch (error) {
        rtkDebug.error('[RTK] ❌ Failed to auto-apply background effect:', error)
        setBackgroundEnabled(false)
      }
    }

    applyBackground()
  }, [callStatus, isVideoEnabled, backgroundEnabled, meeting])

  /**
   * Recreate local stream from SDK tracks
   * Updates whenever SDK audio/video tracks change
   */
  useEffect(() => {
    if (!meeting?.self) {
      setLocalStream(null)
      return
    }

    const stream = new MediaStream()

    // Add audio track if available
    if (meeting.self.audioTrack) {
      stream.addTrack(meeting.self.audioTrack)
      rtkDebug.log('[RTK] Added local audio track to stream')
    }

    // Add video track if available
    if (meeting.self.videoTrack) {
      stream.addTrack(meeting.self.videoTrack)
      rtkDebug.log('[RTK] Added local video track to stream')
    }

    if (stream.getTracks().length > 0) {
      setLocalStream(stream)
      rtkDebug.log('[RTK] Local stream updated with', stream.getTracks().length, 'tracks')
    } else {
      setLocalStream(null)
    }
  }, [meeting?.self?.audioTrack, meeting?.self?.videoTrack])

  return {
    localStream,
    isMuted,
    isVideoEnabled,
    backgroundEnabled,
    videoQuality,
    toggleMute,
    toggleVideo,
    setVideoQuality,
    toggleBackground
  }
}
