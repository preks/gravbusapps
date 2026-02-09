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
  callStatus?: 'idle' | 'setup' | 'joining' | 'connected' | 'reconnecting' | 'ended'
  // Initial state for restoring from globalCallManager after minimize/maximize
  initialIsMuted?: boolean
  initialIsVideoEnabled?: boolean
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
  stopAllTracks: () => void
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
  initialBackgroundEnabled = false, // Disabled by default to prevent feedback loop
  onMediaStateChange,
  callStatus = 'idle',
  initialIsMuted,
  initialIsVideoEnabled
}: UseRealtimeKitMediaOptions): UseRealtimeKitMediaReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)

  // CRITICAL: Initialize mute state with correct priority:
  // 1) SDK state (if available) - SOURCE OF TRUTH
  // 2) Restored state from globalCallManager (if SDK not ready yet)
  // 3) Default to false
  const [isMuted, setIsMuted] = useState(() => {
    // If SDK is already available, use its state (highest priority)
    if (meeting?.self?.audioEnabled !== undefined) {
      return !meeting.self.audioEnabled // isMuted is inverse of audioEnabled
    }
    // Otherwise use restored state if available
    if (initialIsMuted !== undefined) {
      return initialIsMuted
    }
    // Default to unmuted
    return false
  })

  // CRITICAL: Initialize video state with correct priority:
  // 1) SDK state (if available) - SOURCE OF TRUTH
  // 2) Restored state from globalCallManager (if SDK not ready yet)
  // 3) callType default
  const [isVideoEnabled, setIsVideoEnabled] = useState(() => {
    // If SDK is already available, use its state (highest priority)
    if (meeting?.self?.videoEnabled !== undefined) {
      return meeting.self.videoEnabled
    }
    // Otherwise use restored state if available
    if (initialIsVideoEnabled !== undefined) {
      return initialIsVideoEnabled
    }
    // Default to callType
    return callType === 'video'
  })

  const [videoQuality, setVideoQualityState] = useState<VideoQuality>(initialVideoQuality)
  const [backgroundEnabled, setBackgroundEnabled] = useState(initialBackgroundEnabled)

  const virtualBackgroundRef = useRef<RTKVirtualBackground | null>(null)
  const hasJustJoinedRef = useRef(false)
  const hasAppliedInitialBackgroundRef = useRef(false)
  const previousCallTypeRef = useRef<'audio' | 'video'>(callType)
  const hasInitializedFromSDKRef = useRef(false)
  const previousMeetingRef = useRef(meeting)

  // CRITICAL: Reset initialization flag when meeting changes (component remount or new call)
  // This ensures we re-sync from SDK when navigating back to chat
  useEffect(() => {
    if (previousMeetingRef.current !== meeting) {
      rtkDebug.log('[RTK Media] Meeting changed, resetting initialization flag')
      hasInitializedFromSDKRef.current = false
      previousMeetingRef.current = meeting
    }
  }, [meeting])

  // CRITICAL: Sync audio state from SDK when meeting becomes available
  // Only sync if SDK state differs from current state to avoid unnecessary updates
  // Video state is handled by the main callType sync effect below
  useEffect(() => {
    if (!meeting?.self || hasInitializedFromSDKRef.current) {
      return
    }

    const sdkAudioEnabled = meeting.self.audioEnabled ?? true
    const sdkIsMuted = !sdkAudioEnabled

    rtkDebug.log('[RTK Media] Syncing initial audio state from SDK:', {
      sdkAudioEnabled,
      sdkIsMuted,
      currentIsMuted: isMuted,
      restoredIsMuted: initialIsMuted
    })

    // Sync audio state (isMuted is inverse of audioEnabled)
    if (isMuted !== sdkIsMuted) {
      rtkDebug.log('[RTK Media] Syncing audio state from SDK:', { from: isMuted, to: sdkIsMuted })
      setIsMuted(sdkIsMuted)
    }

    hasInitializedFromSDKRef.current = true
  }, [meeting?.self, isMuted, initialIsMuted])

  // CRITICAL: Continuously sync audio state from SDK (not just on initial mount)
  // This ensures UI buttons reflect actual SDK state when navigating back
  useEffect(() => {
    if (!meeting?.self) {
      return
    }

    const sdkAudioEnabled = meeting.self.audioEnabled ?? true
    const sdkIsMuted = !sdkAudioEnabled

    // Only update if SDK state differs from React state
    if (isMuted !== sdkIsMuted) {
      rtkDebug.log('[RTK Media] Continuous sync: SDK audio state changed, updating React state:', {
        sdkAudioEnabled,
        sdkIsMuted,
        currentIsMuted: isMuted
      })
      setIsMuted(sdkIsMuted)
    }
  }, [meeting?.self?.audioEnabled, isMuted])

  // CRITICAL: React to callType changes and synchronize video state
  // Handles three scenarios:
  // 1. Setup phase: Initialize video state from callType (for preview dialogs)
  // 2. Initial join: Trust SDK state (user preferences from pre-call dialog)
  // 3. Mid-call: React to callType changes (e.g., audio→video upgrade)
  useEffect(() => {
    const shouldEnableVideo = callType === 'video'
    const isSetup = callStatus === 'setup'
    const isJoining = callStatus === 'joining'
    const isConnected = callStatus === 'connected'
    const sdkVideoEnabled = meeting?.self?.videoEnabled ?? false
    const callTypeChanged = previousCallTypeRef.current !== callType

    rtkDebug.log('[RTK Media] Video state sync check:', {
      callType,
      previousCallType: previousCallTypeRef.current,
      callTypeChanged,
      currentIsVideoEnabled: isVideoEnabled,
      shouldEnableVideo,
      hasMeeting: !!meeting,
      hasSelf: !!meeting?.self,
      sdkVideoEnabled,
      callStatus,
      isSetup,
      isJoining,
      isConnected,
      hasJustJoined: hasJustJoinedRef.current
    })

    // Update the ref for next comparison
    previousCallTypeRef.current = callType

    // SCENARIO 1: Setup phase (pre-call dialog)
    // Initialize video state from callType so the UI shows correct default
    // This runs BEFORE the SDK is initialized
    if (isSetup && !meeting?.self) {
      rtkDebug.log('[RTK Media] Setup phase - setting video state from callType:', {
        callType,
        shouldEnableVideo,
        currentIsVideoEnabled: isVideoEnabled
      })
      if (isVideoEnabled !== shouldEnableVideo) {
        setIsVideoEnabled(shouldEnableVideo)
      }
      return
    }

    // SCENARIO 2: Initial join (joining or just connected)
    // Trust SDK state completely - user may have toggled camera in pre-call dialog
    // Mark that we're in "initial join" mode to prevent overriding user preferences
    if ((isJoining || isConnected) && meeting?.self && !hasJustJoinedRef.current) {
      hasJustJoinedRef.current = true

      rtkDebug.log('[RTK Media] Initial join - syncing from SDK state (user preferences):', {
        sdkVideoEnabled,
        callType,
        currentIsVideoEnabled: isVideoEnabled
      })

      // Sync React state from SDK - this respects user's choice in pre-call dialog
      if (isVideoEnabled !== sdkVideoEnabled) {
        setIsVideoEnabled(sdkVideoEnabled)
      }

      // Clear the flag after a delay to allow mid-call upgrades later
      setTimeout(() => {
        rtkDebug.log('[RTK Media] Clearing hasJustJoined flag - mid-call upgrades now allowed')
        hasJustJoinedRef.current = false
      }, 3000)
      return
    }

    // SCENARIO 3: Mid-call callType change (e.g., audio→video upgrade)
    // Only react when callType actually changes AND we're in a stable connected state
    if (!isConnected || !meeting?.self) {
      return
    }

    if (!callTypeChanged) {
      return
    }

    // CallType changed mid-call - update video state to match
    if (isVideoEnabled !== shouldEnableVideo) {
      rtkDebug.log('[RTK Media] Mid-call callType change - updating video:', {
        from: isVideoEnabled,
        to: shouldEnableVideo,
        callType
      })
      setIsVideoEnabled(shouldEnableVideo)

      // Enable video in SDK if upgrading to video call
      if (shouldEnableVideo && !sdkVideoEnabled) {
        try {
          rtkDebug.log('[RTK Media] Enabling video in SDK (mid-call upgrade)')
          meeting.self.enableVideo()
        } catch (error) {
          rtkDebug.warn('[RTK Media] Failed to enable video:', error)
        }
      }
    }
  }, [callType, meeting, callStatus, isVideoEnabled])

  // CRITICAL: Continuously sync video state from SDK (not just on initial mount)
  // This ensures UI buttons reflect actual SDK state when navigating back
  useEffect(() => {
    if (!meeting?.self) {
      return
    }

    const sdkVideoEnabled = meeting.self.videoEnabled ?? false

    // Only update if SDK state differs from React state AND we're not in setup/joining phase
    // (to avoid overriding user preferences during initial join)
    const isStablePhase = callStatus === 'connected' || callStatus === 'reconnecting'

    if (isStablePhase && isVideoEnabled !== sdkVideoEnabled) {
      rtkDebug.log('[RTK Media] Continuous sync: SDK video state changed, updating React state:', {
        sdkVideoEnabled,
        currentIsVideoEnabled: isVideoEnabled,
        callStatus
      })
      setIsVideoEnabled(sdkVideoEnabled)
    }
  }, [meeting?.self?.videoEnabled, isVideoEnabled, callStatus])

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
   * ONE-TIME background application when call first connects
   * Only applies if backgroundEnabled is true initially (e.g., for call initiator)
   * Does NOT re-apply on track changes (which would cause infinite loop)
   */
  useEffect(() => {
    // Only run when call transitions to connected for the first time
    if (
      callStatus !== 'connected' ||
      !isVideoEnabled ||
      !backgroundEnabled ||
      !meeting?.self?.videoTrack ||
      hasAppliedInitialBackgroundRef.current
    ) {
      return
    }

    // Mark as applied to prevent re-running
    hasAppliedInitialBackgroundRef.current = true

    const applyInitialBackground = async () => {
      try {
        if (!virtualBackgroundRef.current) {
          virtualBackgroundRef.current = new RTKVirtualBackground()
        }
        await virtualBackgroundRef.current.initialize(meeting)
        await virtualBackgroundRef.current.enableBackground(meeting)
      } catch (error) {
        rtkDebug.error('[RTK] ❌ Failed to apply initial background:', error)
        setBackgroundEnabled(false)
      }
    }

    applyInitialBackground()
  }, [callStatus, isVideoEnabled, backgroundEnabled, meeting])

  /**
   * Reset flags when call ends or is cancelled
   */
  useEffect(() => {
    if (callStatus === 'idle' || callStatus === 'ended') {
      hasAppliedInitialBackgroundRef.current = false
      hasJustJoinedRef.current = false
      hasInitializedFromSDKRef.current = false
      rtkDebug.log('[RTK Media] Reset flags on call end/cancel')
    }
  }, [callStatus])

  /**
   * Manage local stream with optimized track updates
   * Updates tracks dynamically instead of recreating stream to prevent video flashing
   */
  useEffect(() => {
    if (!meeting?.self) {
      setLocalStream(null)
      return
    }

    const currentAudioTrack = meeting.self.audioTrack
    const currentVideoTrack = meeting.self.videoTrack

    // Update existing stream if we have one, otherwise create new
    setLocalStream(prevStream => {
      // If no tracks available, clear stream
      if (!currentAudioTrack && !currentVideoTrack) {
        rtkDebug.log('[RTK Media] No tracks available, clearing local stream')
        return null
      }

      // If we don't have a stream yet, create one
      if (!prevStream) {
        const newStream = new MediaStream()
        if (currentVideoTrack) {
          newStream.addTrack(currentVideoTrack)
          rtkDebug.log('[RTK Media] Added local video track to new stream')
        }
        if (currentAudioTrack) {
          newStream.addTrack(currentAudioTrack)
          rtkDebug.log('[RTK Media] Added local audio track to new stream')
        }
        rtkDebug.log('[RTK Media] Created new local stream with', newStream.getTracks().length, 'tracks')
        return newStream
      }

      // We have an existing stream - update tracks dynamically to prevent flashing
      const existingVideoTrack = prevStream.getVideoTracks()[0]
      const existingAudioTrack = prevStream.getAudioTracks()[0]

      let streamUpdated = false

      // Update video track if changed
      if (existingVideoTrack?.id !== currentVideoTrack?.id) {
        // Remove old video track
        if (existingVideoTrack) {
          prevStream.removeTrack(existingVideoTrack)
          rtkDebug.log('[RTK Media] Removed old video track:', existingVideoTrack.id)
        }

        // Add new video track
        if (currentVideoTrack) {
          prevStream.addTrack(currentVideoTrack)
          rtkDebug.log('[RTK Media] Added new video track:', currentVideoTrack.id)
        }

        streamUpdated = true
      }

      // Update audio track if changed
      if (existingAudioTrack?.id !== currentAudioTrack?.id) {
        // Remove old audio track
        if (existingAudioTrack) {
          prevStream.removeTrack(existingAudioTrack)
          rtkDebug.log('[RTK Media] Removed old audio track:', existingAudioTrack.id)
        }

        // Add new audio track
        if (currentAudioTrack) {
          prevStream.addTrack(currentAudioTrack)
          rtkDebug.log('[RTK Media] Added new audio track:', currentAudioTrack.id)
        }

        streamUpdated = true
      }

      if (streamUpdated) {
        rtkDebug.log('[RTK Media] Local stream tracks updated dynamically', {
          videoTracks: prevStream.getVideoTracks().length,
          audioTracks: prevStream.getAudioTracks().length
        })
      }

      // Return the same stream reference (updated in place) to prevent unnecessary re-renders
      return prevStream
    })
  }, [meeting?.self?.audioTrack, meeting?.self?.videoTrack])

  /**
   * Cleanup virtual background resources on unmount or when call ends
   */
  useEffect(() => {
    return () => {
      if (virtualBackgroundRef.current && meeting) {
        virtualBackgroundRef.current.destroy(meeting)
        virtualBackgroundRef.current = null
      }
    }
  }, [meeting])

  /**
   * Stop all media tracks (audio and video)
   * CRITICAL: Must be called when leaving call to release camera/microphone
   */
  const stopAllTracks = useCallback(() => {
    if (!localStream) {
      rtkDebug.log('[RTK Media] No local stream to stop')
      return
    }

    rtkDebug.log('[RTK Media] 🛑 Stopping all media tracks:', {
      audioTracks: localStream.getAudioTracks().length,
      videoTracks: localStream.getVideoTracks().length
    })

    // Stop all tracks
    localStream.getTracks().forEach(track => {
      track.stop()
      rtkDebug.log('[RTK Media] Stopped track:', {
        kind: track.kind,
        id: track.id,
        readyState: track.readyState
      })
    })

    // Clear the stream
    setLocalStream(null)
    rtkDebug.log('[RTK Media] ✅ All media tracks stopped and stream cleared')
  }, [localStream])

  return {
    localStream,
    isMuted,
    isVideoEnabled,
    backgroundEnabled,
    videoQuality,
    toggleMute,
    toggleVideo,
    setVideoQuality,
    toggleBackground,
    stopAllTracks
  }
}
