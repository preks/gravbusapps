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
import { RTKRnnoiseMiddleware, type RnnoiseStats } from '../services/rtkRnnoiseMiddleware'
import { globalCallManager } from '../services/globalCallManager'
import { getAudioConstraints } from '../config/audioConstraints'

export interface UseRealtimeKitMediaOptions {
  meeting: any // RealtimeKit meeting object
  callType: CallType
  initialVideoQuality?: VideoQuality
  initialBackgroundEnabled?: boolean
  initialNoiseSuppressionEnabled?: boolean
  initialAutoGainControlEnabled?: boolean
  initialRnnoiseEnabled?: boolean
  onMediaStateChange?: (state: { isMuted: boolean; isVideoEnabled: boolean; backgroundEnabled: boolean }) => void
  onRnnoiseStateChange?: (enabled: boolean) => void
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
  noiseSuppressionEnabled: boolean
  autoGainControlEnabled: boolean
  rnnoiseEnabled: boolean
  rnnoiseMode: 'gentle' | 'moderate' | 'aggressive'
  rnnoiseStats: RnnoiseStats | null
  videoQuality: VideoQuality
  toggleMute: () => boolean
  toggleVideo: () => boolean
  setVideoQuality: (quality: VideoQuality) => Promise<void>
  toggleBackground: () => Promise<void>
  toggleRnnoise: () => Promise<void>
  setRnnoiseMode: (mode: 'gentle' | 'moderate' | 'aggressive') => void
  setNoiseSuppressionEnabled: (enabled: boolean) => Promise<void>
  setAutoGainControlEnabled: (enabled: boolean) => Promise<void>
  switchAudioDevice: (deviceId: string) => Promise<void>
  switchVideoDevice: (deviceId: string) => Promise<void>
  stopAllTracks: () => void
}

const getEffectiveAudioEnabled = (self: any): boolean => {
  if (!self) return false

  const sdkAudioEnabled: boolean | undefined = self.audioEnabled
  if (sdkAudioEnabled === true) return true

  const track: MediaStreamTrack | undefined = self.audioTrack
  if (!track) return false

  const trackLive = track.readyState === 'live'
  const trackEnabled = (track as any).enabled !== false

  // RTK can report audioEnabled=false while a live track is publishing
  // (observed after RNNoise toggles). In that case treat audio as enabled
  // so the mic button can correctly disable audio.
  if (sdkAudioEnabled === false && trackLive && trackEnabled) return true

  if (sdkAudioEnabled === false) return false
  return trackLive && trackEnabled
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
  initialBackgroundEnabled = true, // Disabled by default to prevent feedback loop
  initialNoiseSuppressionEnabled = true, // Disabled - causes voice cutoff
  initialAutoGainControlEnabled = true,
  initialRnnoiseEnabled = true,
  onMediaStateChange,
  onRnnoiseStateChange,
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
    // If SDK is already available, use its state (highest priority).
    // Use audio track as fallback when RTK's audioEnabled flag gets stale.
    if (meeting?.self && (meeting.self.audioEnabled !== undefined || meeting.self.audioTrack)) {
      return !getEffectiveAudioEnabled(meeting.self)
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
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabledState] = useState(initialNoiseSuppressionEnabled)
  const [autoGainControlEnabled, setAutoGainControlEnabledState] = useState(initialAutoGainControlEnabled)
  const [rnnoiseEnabled, setRnnoiseEnabled] = useState(initialRnnoiseEnabled)

  const virtualBackgroundRef = useRef<RTKVirtualBackground | null>(null)
  const rnnoiseMiddlewareRef = useRef<RTKRnnoiseMiddleware | null>(null)
  const rnnoiseToggleInFlightRef = useRef<Promise<void> | null>(null)
  const rnnoiseNeedsPrimeOnUnmuteRef = useRef(false)
  const isTogglingRnnoiseRef = useRef(false) // Prevent continuous sync from interfering during toggle
  const hasJustJoinedRef = useRef(false)
  const hasAppliedInitialBackgroundRef = useRef(false)
  const previousCallTypeRef = useRef<'audio' | 'video'>(callType)
  const hasInitializedFromSDKRef = useRef(false)
  const previousMeetingRef = useRef(meeting)

  // If the chat module unmounts during navigation, we must keep RNNoise alive.
  // Restore a previously created middleware instance from globalCallManager.
  if (!rnnoiseMiddlewareRef.current) {
    const globalData = globalCallManager.getCallData()
    if (globalData.rnnoiseMiddlewareInstance && globalData.realtimeKitMeeting === meeting) {
      rnnoiseMiddlewareRef.current = globalData.rnnoiseMiddlewareInstance as RTKRnnoiseMiddleware
    }
  }

  // CRITICAL: Reset initialization flag when meeting changes (component remount or new call)
  // This ensures we re-sync from SDK when navigating back to chat
  useEffect(() => {
    if (previousMeetingRef.current !== meeting) {
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

    const sdkAudioEnabled = getEffectiveAudioEnabled(meeting.self)
    const sdkIsMuted = !sdkAudioEnabled

    // Sync audio state (isMuted is inverse of audioEnabled)
    if (isMuted !== sdkIsMuted) {
      setIsMuted(sdkIsMuted)
    }

    hasInitializedFromSDKRef.current = true
  }, [meeting?.self, isMuted, initialIsMuted])

  // CRITICAL: Continuously sync audio state from SDK (not just on initial mount)
  // This ensures UI buttons reflect actual SDK state when navigating back
  // CRITICAL: Skip during RNNoise toggle to prevent race conditions
  useEffect(() => {
    if (!meeting?.self) {
      return
    }

    // CRITICAL: Skip sync during RNNoise toggle to prevent interference
    if (isTogglingRnnoiseRef.current) {
      return
    }

    const sdkAudioEnabled = getEffectiveAudioEnabled(meeting.self)
    const sdkIsMuted = !sdkAudioEnabled

    // Only update if SDK state differs from React state
    if (isMuted !== sdkIsMuted) {
      setIsMuted(sdkIsMuted)
    }
  }, [meeting?.self?.audioEnabled, meeting?.self?.audioTrack?.id, meeting?.self?.audioTrack?.readyState, isMuted])

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

    // Update the ref for next comparison
    previousCallTypeRef.current = callType

    // SCENARIO 1: Setup phase (pre-call dialog)
    // Initialize video state from callType so the UI shows correct default
    // This runs BEFORE the SDK is initialized
    if (isSetup && !meeting?.self) {
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

      // Sync React state from SDK - this respects user's choice in pre-call dialog
      if (isVideoEnabled !== sdkVideoEnabled) {
        setIsVideoEnabled(sdkVideoEnabled)
      }

      // Clear the flag after a delay to allow mid-call upgrades later
      setTimeout(() => {
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
      setIsVideoEnabled(shouldEnableVideo)

      // Enable video in SDK if upgrading to video call
      if (shouldEnableVideo && !sdkVideoEnabled) {
        try {
          meeting.self.enableVideo()
        } catch {
          // Video enable failed, but state is updated
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
    if (!meeting?.self) {
      return isMuted
    }

    const currentEnabled = getEffectiveAudioEnabled(meeting.self)
    const newMuted = currentEnabled // if audio is enabled, we're muting (newMuted = true)

    if (currentEnabled) {
      void globalCallManager.executeAudioOperation(async () => {
        await meeting.self!.disableAudio()
      })
    } else {
      void globalCallManager.executeAudioOperation(async () => {
        await meeting.self!.enableAudio()

        const shouldPrime = rnnoiseNeedsPrimeOnUnmuteRef.current && rnnoiseEnabled && !!rnnoiseMiddlewareRef.current

        if (shouldPrime) {
          rnnoiseNeedsPrimeOnUnmuteRef.current = false

          const middleware = rnnoiseMiddlewareRef.current
          const baselineFrames = middleware?.getStats().framesProcessed ?? 0

          await new Promise(resolve => setTimeout(resolve, 250))

          const framesAfterUnmute = middleware?.getStats().framesProcessed ?? 0
          const hasProcessing = framesAfterUnmute > baselineFrames

          if (!hasProcessing) {
            try {
              if (middleware && meeting.self) {
                middleware.disable(meeting as any)
                await middleware.enable(meeting as any)
              }
            } catch {
              // Re-registration failed, will retry on next unmute
            }

            await new Promise(resolve => setTimeout(resolve, 150))

            await meeting.self!.disableAudio()
            await new Promise(resolve => setTimeout(resolve, 100))
            await meeting.self!.enableAudio()

            await new Promise(resolve => setTimeout(resolve, 250))

            const framesAfterRestart = middleware?.getStats().framesProcessed ?? 0

            if (framesAfterRestart <= baselineFrames) {
              rnnoiseNeedsPrimeOnUnmuteRef.current = true
            }
          }
        }
      })
    }

    // Return intended new mute state (for optimistic UI update)
    // Actual state will be updated by SDK event listeners
    return newMuted
  }, [meeting, isMuted, rnnoiseEnabled])

  /**
   * Toggle video on/off
   * Uses SDK methods to control video state
   *
   * @returns New video enabled state (true if enabled, false if disabled)
   */
  const toggleVideo = useCallback((): boolean => {
    if (!meeting?.self) {
      return isVideoEnabled
    }

    const currentEnabled = meeting.self.videoEnabled ?? false
    const newEnabled = !currentEnabled

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

      setVideoQualityState(quality)

      // Attempt to configure subscriber-side preferredRid via core SDK
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
          }
        } catch {
          // Failed to configure subscriber-side quality
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

    if (!meeting?.self) {
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
      } else {
        // Disable background effect
        if (virtualBackgroundRef.current) {
          virtualBackgroundRef.current.disable(meeting)
        }
      }

      setBackgroundEnabled(newValue)
      onMediaStateChange?.({ isMuted, isVideoEnabled, backgroundEnabled: newValue })
    } catch {
      // Reset state on error
      setBackgroundEnabled(false)
      onMediaStateChange?.({ isMuted, isVideoEnabled, backgroundEnabled: false })
    }
  }, [backgroundEnabled, meeting, isMuted, isVideoEnabled, onMediaStateChange])

  /**
   * Toggle RNNoise AI noise suppression
   * Enables/disables RNNoise audio middleware for background noise removal
   */
  const toggleRnnoise = useCallback(async (): Promise<void> => {
    if (rnnoiseToggleInFlightRef.current) {
      await rnnoiseToggleInFlightRef.current
      return
    }

    const latestCallData = globalCallManager.getCallData()
    const currentEnabled =
      latestCallData.callState.callImplementation === 'realtime-kit'
        ? latestCallData.callState.rnnoiseEnabled
        : rnnoiseEnabled

    const newState = !currentEnabled

    const meetingForToggle = meeting?.self ? meeting : globalCallManager.getCallData().realtimeKitMeeting

    if (!meetingForToggle || !meetingForToggle.self) {
      return
    }

    const togglePromise = (async () => {
      isTogglingRnnoiseRef.current = true

      try {
        if (newState) {
          const wasMuted = !getEffectiveAudioEnabled(meetingForToggle.self)

          if (rnnoiseMiddlewareRef.current) {
            rnnoiseMiddlewareRef.current.destroy(meetingForToggle)
            rnnoiseMiddlewareRef.current = null
          }

          rnnoiseMiddlewareRef.current = new RTKRnnoiseMiddleware()
          globalCallManager.setCall({ rnnoiseMiddlewareInstance: rnnoiseMiddlewareRef.current })

          if (!rnnoiseMiddlewareRef.current.isSupported()) {
            return
          }

          await rnnoiseMiddlewareRef.current.initialize()
          await rnnoiseMiddlewareRef.current.enable(meetingForToggle)
          globalCallManager.setCall({ rnnoiseMiddlewareInstance: rnnoiseMiddlewareRef.current })

          if (wasMuted) {
            rnnoiseNeedsPrimeOnUnmuteRef.current = true
          }

          if (wasMuted && getEffectiveAudioEnabled(meetingForToggle.self)) {
            await globalCallManager.executeAudioOperation(async () => {
              await meetingForToggle.self.disableAudio()
            })
          }

          const audioTrack = meetingForToggle.self.audioTrack
          const videoTrack = meetingForToggle.self.videoTrack
          if (audioTrack || videoTrack) {
            const tracks: MediaStreamTrack[] = []
            if (audioTrack) tracks.push(audioTrack)
            if (videoTrack) tracks.push(videoTrack)
            setLocalStream(new MediaStream(tracks))
          }
        } else {
          const wasMuted = !getEffectiveAudioEnabled(meetingForToggle.self)
          rnnoiseNeedsPrimeOnUnmuteRef.current = false

          if (rnnoiseMiddlewareRef.current) {
            rnnoiseMiddlewareRef.current.disable(meetingForToggle)
            globalCallManager.setCall({ rnnoiseMiddlewareInstance: rnnoiseMiddlewareRef.current })
          }

          if (wasMuted && getEffectiveAudioEnabled(meetingForToggle.self)) {
            await globalCallManager.executeAudioOperation(async () => {
              await meetingForToggle.self.disableAudio()
            })
          }

          const audioTrack = meetingForToggle.self.audioTrack
          const videoTrack = meetingForToggle.self.videoTrack
          if (audioTrack || videoTrack) {
            const tracks: MediaStreamTrack[] = []
            if (audioTrack) tracks.push(audioTrack)
            if (videoTrack) tracks.push(videoTrack)
            setLocalStream(new MediaStream(tracks))
          }
        }

        setRnnoiseEnabled(newState)
        onRnnoiseStateChange?.(newState)

        isTogglingRnnoiseRef.current = false
      } catch {
        setRnnoiseEnabled(false)
        onRnnoiseStateChange?.(false)

        isTogglingRnnoiseRef.current = false
      }
    })()

    rnnoiseToggleInFlightRef.current = togglePromise
    try {
      await togglePromise
    } finally {
      rnnoiseToggleInFlightRef.current = null
    }
  }, [meeting, rnnoiseEnabled, onRnnoiseStateChange])

  /**
   * Set RNNoise suppression mode (gentle, moderate, aggressive)
   */
  const setRnnoiseMode = useCallback((mode: 'gentle' | 'moderate' | 'aggressive'): void => {
    if (!rnnoiseMiddlewareRef.current) {
      return
    }

    rnnoiseMiddlewareRef.current.setMode(mode)
  }, [])

  /**
   * Initialize RNNoise middleware when meeting connects.
   * Cloudflare applies audio middlewares to the outgoing mic track when the mic is turned on
   * after the middleware is added, so we should register as early as possible.
   * Only initialize once per meeting instance to prevent audio glitches
   */
  useEffect(() => {
    if (callStatus === 'idle' || callStatus === 'ended') {
      if (rnnoiseMiddlewareRef.current && meeting) {
        rnnoiseMiddlewareRef.current.destroy(meeting)
        rnnoiseMiddlewareRef.current = null
        globalCallManager.setCall({ rnnoiseMiddlewareInstance: null })
      }
      return
    }

    if (!meeting?.self || !rnnoiseEnabled) {
      return
    }

    if (rnnoiseMiddlewareRef.current) {
      return () => {
        const globalData = globalCallManager.getCallData()
        const shouldPersist =
          globalData.callState.status !== 'idle' &&
          globalData.callState.callImplementation === 'realtime-kit' &&
          globalData.realtimeKitMeeting === meeting

        if (shouldPersist) {
          globalCallManager.setCall({ rnnoiseMiddlewareInstance: rnnoiseMiddlewareRef.current })
          return
        }

        if (rnnoiseMiddlewareRef.current && meeting) {
          rnnoiseMiddlewareRef.current.destroy(meeting)
          rnnoiseMiddlewareRef.current = null
          globalCallManager.setCall({ rnnoiseMiddlewareInstance: null })
        }
      }
    }

    const initRnnoise = async () => {
      try {
        rnnoiseMiddlewareRef.current = new RTKRnnoiseMiddleware()
        globalCallManager.setCall({ rnnoiseMiddlewareInstance: rnnoiseMiddlewareRef.current })

        if (!rnnoiseMiddlewareRef.current.isSupported()) {
          setRnnoiseEnabled(false)
          onRnnoiseStateChange?.(false)
          return
        }

        await rnnoiseMiddlewareRef.current.initialize()

        await rnnoiseMiddlewareRef.current.enable(meeting)
        globalCallManager.setCall({ rnnoiseMiddlewareInstance: rnnoiseMiddlewareRef.current })
      } catch {
        setRnnoiseEnabled(false)
        onRnnoiseStateChange?.(false)
      }
    }

    initRnnoise()

    return () => {
      const globalData = globalCallManager.getCallData()
      const shouldPersist =
        globalData.callState.status !== 'idle' &&
        globalData.callState.callImplementation === 'realtime-kit' &&
        globalData.realtimeKitMeeting === meeting

      if (shouldPersist) {
        globalCallManager.setCall({ rnnoiseMiddlewareInstance: rnnoiseMiddlewareRef.current })
        return
      }

      if (rnnoiseMiddlewareRef.current && meeting) {
        rnnoiseMiddlewareRef.current.destroy(meeting)
        rnnoiseMiddlewareRef.current = null
        globalCallManager.setCall({ rnnoiseMiddlewareInstance: null })
      }
    }
  }, [meeting?.self, rnnoiseEnabled, callStatus, onRnnoiseStateChange])

  useEffect(() => {
    if (!meeting?.self) return

    const sdkAudioEnabled = getEffectiveAudioEnabled(meeting.self)
    const sdkVideoEnabled = meeting.self.videoEnabled ?? false

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
      setIsMuted(!audioEnabled)
    }

    const handleVideoUpdate = (event: any) => {
      const { videoEnabled } = event
      setIsVideoEnabled(videoEnabled)
    }

    // Attach event listeners if SDK supports them
    const self = meeting.self
    if (self && typeof self.on === 'function') {
      self.on('audioUpdate', handleAudioUpdate)
      self.on('videoUpdate', handleVideoUpdate)
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
      } catch {
        setBackgroundEnabled(false)
      }
    }

    applyInitialBackground()
  }, [callStatus, isVideoEnabled, backgroundEnabled, meeting])

  useEffect(() => {
    if (callStatus === 'idle' || callStatus === 'ended') {
      if (rnnoiseMiddlewareRef.current && meeting) {
        rnnoiseMiddlewareRef.current.destroy(meeting)
        rnnoiseMiddlewareRef.current = null
      }
    }
  }, [callStatus, meeting])

  /**
   * Reset flags when call ends or is cancelled
   */
  useEffect(() => {
    if (callStatus === 'idle' || callStatus === 'ended') {
      hasAppliedInitialBackgroundRef.current = false
      hasJustJoinedRef.current = false
      hasInitializedFromSDKRef.current = false
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
        return null
      }

      // If we don't have a stream yet, create one
      if (!prevStream) {
        const newStream = new MediaStream()
        if (currentVideoTrack) {
          newStream.addTrack(currentVideoTrack)
        }
        if (currentAudioTrack) {
          newStream.addTrack(currentAudioTrack)
        }
        return newStream
      }

      // We have an existing stream - update tracks dynamically to prevent flashing
      const existingVideoTrack = prevStream.getVideoTracks()[0]
      const existingAudioTrack = prevStream.getAudioTracks()[0]

      // Update video track if changed
      if (existingVideoTrack?.id !== currentVideoTrack?.id) {
        // Remove old video track
        if (existingVideoTrack) {
          prevStream.removeTrack(existingVideoTrack)
        }

        // Add new video track
        if (currentVideoTrack) {
          prevStream.addTrack(currentVideoTrack)
        }
      }

      // Update audio track if changed
      if (existingAudioTrack?.id !== currentAudioTrack?.id) {
        // Remove old audio track
        if (existingAudioTrack) {
          prevStream.removeTrack(existingAudioTrack)
        }

        // Add new audio track
        if (currentAudioTrack) {
          prevStream.addTrack(currentAudioTrack)
        }
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
   * Switch audio input device during call
   * Prefers RealtimeKit SDK's setDevice() if available.
   */
  const switchAudioDevice = useCallback(
    async (deviceId: string) => {
      if (!meeting?.self) {
        return
      }

      if (typeof (meeting.self as any).setDevice !== 'function') {
        try {
          const wasAudioEnabled = getEffectiveAudioEnabled(meeting.self)

          if (wasAudioEnabled) {
            await globalCallManager.executeAudioOperation(async () => {
              await meeting.self!.disableAudio()
            })
          }

          const stream = await navigator.mediaDevices.getUserMedia({
            audio: getAudioConstraints({
              deviceId: { exact: deviceId }
            })
          })

          stream.getTracks().forEach(track => track.stop())

          if (wasAudioEnabled) {
            await globalCallManager.executeAudioOperation(async () => {
              await meeting.self!.enableAudio()
            })
          }
        } catch (error) {
          throw error
        }
        return
      }

      try {
        await (meeting.self as any).setDevice({
          kind: 'audioinput',
          deviceId
        })
      } catch (error) {
        throw error
      }
    },
    [meeting, noiseSuppressionEnabled, autoGainControlEnabled]
  )

  /**
   * Toggle / set noise suppression on the current microphone track (best-effort).
   * echoCancellation stays enabled always.
   */
  const setNoiseSuppressionEnabled = useCallback(
    async (enabled: boolean) => {
      setNoiseSuppressionEnabledState(enabled)
      const track: MediaStreamTrack | undefined = meeting?.self?.audioTrack
      if (!track || typeof track.applyConstraints !== 'function') return
      try {
        const constraints = getAudioConstraints({
          noiseSuppression: enabled
        })

        await track.applyConstraints(constraints)
      } catch {
        setNoiseSuppressionEnabledState(enabled)
      }
    },
    [meeting, autoGainControlEnabled]
  )

  /**
   * Toggle / set auto gain control on the current microphone track (best-effort).
   * echoCancellation stays enabled always.
   */
  const setAutoGainControlEnabled = useCallback(
    async (enabled: boolean) => {
      setAutoGainControlEnabledState(enabled)
      const track: MediaStreamTrack | undefined = meeting?.self?.audioTrack
      if (!track || typeof track.applyConstraints !== 'function') return
      try {
        const constraints = getAudioConstraints({
          autoGainControl: enabled
        })

        await track.applyConstraints(constraints)
      } catch {
        // Failed to apply AGC constraints
      }
    },
    [meeting, noiseSuppressionEnabled]
  )

  useEffect(() => {
    const track: MediaStreamTrack | undefined = meeting?.self?.audioTrack
    if (!track) return

    const actualSettings = track.getSettings()

    if (
      actualSettings.echoCancellation === true &&
      actualSettings.autoGainControl === true &&
      actualSettings.noiseSuppression === false
    ) {
      // Perfect! All settings are correct
    } else if (
      actualSettings.echoCancellation !== undefined ||
      actualSettings.autoGainControl !== undefined ||
      actualSettings.noiseSuppression !== undefined
    ) {
      // Settings are defined but not what we expect - log for debugging if needed
    }
  }, [meeting?.self?.audioTrack])

  /**
   * Switch video input device during call
   * Prefers RealtimeKit SDK's setDevice() if available.
   */
  const switchVideoDevice = useCallback(
    async (deviceId: string) => {
      if (!meeting?.self) {
        return
      }

      if (typeof (meeting.self as any).setDevice !== 'function') {
        try {
          const wasVideoEnabled = meeting.self.videoEnabled ?? false

          if (wasVideoEnabled) {
            await meeting.self.disableVideo()
          }

          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          })

          stream.getTracks().forEach(track => track.stop())

          if (wasVideoEnabled) {
            await meeting.self.enableVideo()
          }

          if (backgroundEnabled && virtualBackgroundRef.current) {
            // SDK should reapply background to new video track
          }
        } catch (error) {
          throw error
        }
        return
      }

      try {
        await (meeting.self as any).setDevice({
          kind: 'videoinput',
          deviceId
        })

        if (backgroundEnabled && virtualBackgroundRef.current) {
          // SDK should reapply background automatically
        }
      } catch (error) {
        throw error
      }
    },
    [meeting, backgroundEnabled]
  )

  /**
   * Stop all media tracks (audio and video)
   * CRITICAL: Must be called when leaving call to release camera/microphone
   */
  const stopAllTracks = useCallback(() => {
    if (!localStream) {
      return
    }

    // Stop all tracks
    localStream.getTracks().forEach(track => {
      track.stop()
    })

    // Clear the stream
    setLocalStream(null)
  }, [localStream])

  return {
    localStream,
    isMuted,
    isVideoEnabled,
    backgroundEnabled,
    noiseSuppressionEnabled,
    autoGainControlEnabled,
    rnnoiseEnabled,
    rnnoiseMode: rnnoiseMiddlewareRef.current?.getMode() ?? 'aggressive',
    rnnoiseStats: rnnoiseMiddlewareRef.current?.getStats() ?? null,
    videoQuality,
    toggleMute,
    toggleVideo,
    setVideoQuality,
    toggleBackground,
    toggleRnnoise,
    setRnnoiseMode,
    setNoiseSuppressionEnabled,
    setAutoGainControlEnabled,
    switchAudioDevice,
    switchVideoDevice,
    stopAllTracks
  }
}
