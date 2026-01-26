/**
 * useRealtimeKitScreenShare Hook
 *
 * Manages screen sharing functionality for RealtimeKit calls.
 * Handles enabling/disabling screen share via the RealtimeKit SDK.
 */

import { useState, useCallback } from 'react'
import { rtkDebug } from '../utils/rtkDebug'

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
      rtkDebug.error('[RTK] Cannot toggle screen share: meeting.self not available')
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
        rtkDebug.log('[RTK] ✅ Screen share stopped via SDK')
        return false
      } else {
        // Start screen sharing
        // Check browser support
        if (!navigator.mediaDevices?.getDisplayMedia) {
          const error = new Error('Screen sharing is not supported in this browser')
          rtkDebug.error('[RTK] Screen share error:', error.message)
          throw error
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
            if (screenShareTracks.length === 0 && typeof (screenShareTracksRaw as any).forEach === 'function') {
              ;(screenShareTracksRaw as any).forEach((value: any) => {
                if (value instanceof MediaStreamTrack) {
                  screenShareTracks.push(value)
                }
              })
            }

            // Try iteration if available
            if (
              screenShareTracks.length === 0 &&
              typeof (screenShareTracksRaw as any)[Symbol.iterator] === 'function'
            ) {
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

        const screenShareEnabled = meeting.self?.screenShareEnabled

        rtkDebug.log('[RTK] ✅ Screen share started via SDK', {
          screenShareEnabled,
          screenShareTracksCount: screenShareTracks.length,
          screenShareTrackIds: screenShareTracks.map((t: MediaStreamTrack) => t.id)
        })

        if (screenShareTracks.length === 0) {
          rtkDebug.warn('[RTK] ⚠️ Screen share enabled but no tracks available yet - may need more time')
        }

        // Store the first video track (screen share is typically video only)
        const videoTrack = screenShareTracks.find(t => t.kind === 'video') || null
        setScreenShareTrack(videoTrack)
        setIsScreenSharing(true)
        onScreenShareStateChange?.(true)
        return true
      }
    } catch (error: any) {
      rtkDebug.error('[RTK] ❌ Failed to toggle screen share:', error)

      // Reset state on error
      setIsScreenSharing(false)
      setScreenShareTrack(null)
      onScreenShareStateChange?.(false)

      // Provide user-friendly error messages
      const errorMessage = error?.message || 'Unknown error'
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        rtkDebug.error('[RTK] Screen share permission denied by user')
      } else if (errorMessage.includes('NotSupportedError') || errorMessage.includes('not supported')) {
        rtkDebug.error('[RTK] Screen sharing not supported in this browser')
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('No screen')) {
        rtkDebug.error('[RTK] No screen or window available for sharing')
      }

      throw error
    }
  }, [meeting, isScreenSharing, onScreenShareStateChange])

  return {
    isScreenSharing,
    toggleScreenShare,
    screenShareTrack
  }
}
