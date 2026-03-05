/**
 * useRealtimeKitScreenShare Hook
 *
 * Manages screen sharing functionality for RealtimeKit calls.
 * Handles enabling/disabling screen share via the RealtimeKit SDK.
 */

import { useState, useCallback } from 'react'

export interface UseRealtimeKitScreenShareOptions {
  meeting: any // RealtimeKit meeting object
  onScreenShareStateChange?: (isSharing: boolean) => void
}

export interface UseRealtimeKitScreenShareReturn {
  isScreenSharing: boolean
  toggleScreenShare: () => Promise<boolean>
  screenShareTrack: MediaStreamTrack | null
}

/**
 * Hook to manage screen sharing in RealtimeKit calls
 *
 * Provides:
 * - Toggle screen share on/off
 * - Track screen sharing state
 * - Access to screen share track
 * - Automatic error handling and user feedback
 *
 * Uses RealtimeKit SDK methods:
 * - meeting.self.enableScreenShare() - Start sharing
 * - meeting.self.disableScreenShare() - Stop sharing
 *
 * @param options - Configuration options
 * @returns Screen share state and toggle function
 */
export const useRealtimeKitScreenShare = ({
  meeting,
  onScreenShareStateChange
}: UseRealtimeKitScreenShareOptions): UseRealtimeKitScreenShareReturn => {
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenShareTrack, setScreenShareTrack] = useState<MediaStreamTrack | null>(null)

  /**
   * Toggle screen sharing on or off
   *
   * When enabling:
   * - Checks browser support for getDisplayMedia
   * - Calls SDK enableScreenShare()
   * - Waits for tracks to be available
   * - Updates state
   *
   * When disabling:
   * - Calls SDK disableScreenShare()
   * - Cleans up track state
   *
   * @returns New screen sharing state (true if now sharing, false if stopped)
   */
  const toggleScreenShare = useCallback(async (): Promise<boolean> => {
    if (!meeting?.self) {
      return false
    }

    try {
      const currentSharing = isScreenSharing

      if (currentSharing) {
        // Stop screen sharing
        await meeting.self.disableScreenShare()
        setIsScreenSharing(false)
        setScreenShareTrack(null)
        onScreenShareStateChange?.(false)
        return false
      } else {
        // Start screen sharing
        // Check browser support
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Screen sharing is not supported in this browser')
        }

        await meeting.self.enableScreenShare()

        // Wait a bit for SDK to process and publish the screen share track
        await new Promise(resolve => setTimeout(resolve, 500))

        // Extract screen share tracks from SDK
        // The SDK might return tracks in various formats (Map, Set, Array, object)
        const screenShareTracksRaw = meeting.self?.screenShareTracks
        let screenShareTracks: MediaStreamTrack[] = []

        if (screenShareTracksRaw) {
          // Handle Array
          if (Array.isArray(screenShareTracksRaw)) {
            screenShareTracks = screenShareTracksRaw.filter(
              (t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack
            )
          }
          // Handle Map
          else if (
            screenShareTracksRaw &&
            typeof screenShareTracksRaw === 'object' &&
            'get' in screenShareTracksRaw &&
            'set' in screenShareTracksRaw
          ) {
            const mapLike = screenShareTracksRaw as Map<any, any>
            if (mapLike instanceof Map) {
              screenShareTracks = Array.from(mapLike.values()).filter(
                (t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack
              )
            }
          }
          // Handle Set
          else if (
            screenShareTracksRaw &&
            typeof screenShareTracksRaw === 'object' &&
            'has' in screenShareTracksRaw &&
            'add' in screenShareTracksRaw
          ) {
            const setLike = screenShareTracksRaw as Set<any>
            if (setLike instanceof Set) {
              screenShareTracks = Array.from(setLike).filter(
                (t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack
              )
            }
          }
          // Handle plain object
          else if (typeof screenShareTracksRaw === 'object' && screenShareTracksRaw !== null) {
            const values = Object.values(screenShareTracksRaw)
            screenShareTracks = values.filter((t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack)

            // Try forEach if available
            if (screenShareTracks.length === 0 && typeof screenShareTracksRaw.forEach === 'function') {
              screenShareTracksRaw.forEach((value: any) => {
                if (value instanceof MediaStreamTrack) {
                  screenShareTracks.push(value)
                }
              })
            }

            // Try iteration if available
            if (screenShareTracks.length === 0 && typeof screenShareTracksRaw[Symbol.iterator] === 'function') {
              try {
                for (const value of screenShareTracksRaw as Iterable<any>) {
                  if (value instanceof MediaStreamTrack) {
                    screenShareTracks.push(value)
                  }
                }
              } catch {
                // Ignore iteration errors
              }
            }
          }
        }

        // Store the first video track (screen share is typically video only)
        const videoTrack = screenShareTracks.find(t => t.kind === 'video') || null
        setScreenShareTrack(videoTrack)
        setIsScreenSharing(true)
        onScreenShareStateChange?.(true)
        return true
      }
    } catch (error: any) {
      setIsScreenSharing(false)
      setScreenShareTrack(null)
      onScreenShareStateChange?.(false)
      throw error
    }
  }, [meeting, isScreenSharing, onScreenShareStateChange])

  return {
    isScreenSharing,
    toggleScreenShare,
    screenShareTrack
  }
}
