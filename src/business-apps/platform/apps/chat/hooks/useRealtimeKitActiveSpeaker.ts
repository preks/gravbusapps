/**
 * useRealtimeKitActiveSpeaker Hook
 *
 * Tracks the active speaker in a Realtime Kit call.
 * Provides event subscription and state management for active speaker detection.
 */

import { useEffect, useState, useRef } from 'react'

export interface UseRealtimeKitActiveSpeakerOptions {
  meeting: any // RealtimeKitMeeting instance
  debounceMs?: number // Minimum time a speaker must be active before UI updates (default: 500ms)
}

export interface UseRealtimeKitActiveSpeakerReturn {
  activeSpeakerId: string | null
  activeSpeakerHistory: string[] // Recent speakers (for sorting)
}

/**
 * Hook to track active speaker in a Realtime Kit call
 *
 * Features:
 * - Subscribes to 'activeSpeaker' event from RTK
 * - Tracks current active speaker ID
 * - Maintains history of recent speakers (for sorting)
 * - Debounces rapid speaker changes to prevent UI flickering
 *
 * @param options - Configuration options
 * @returns Active speaker state and history
 */
export const useRealtimeKitActiveSpeaker = ({
  meeting,
  debounceMs = 500
}: UseRealtimeKitActiveSpeakerOptions): UseRealtimeKitActiveSpeakerReturn => {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
  const [activeSpeakerHistory, setActiveSpeakerHistory] = useState<string[]>([])

  // Track pending speaker change and timer
  const pendingSpeakerRef = useRef<string | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Subscribe to active speaker events
   */
  useEffect(() => {
    // Early return if not in an active call - this is expected on page load
    if (!meeting?.participants) {
      return
    }

    const handleActiveSpeaker = (participant: any) => {
      // RTK provides peerId in the activeSpeaker event
      const speakerId = participant?.peerId || participant?.id || participant?.userId
      if (!speakerId) {
        return
      }

      // If this is the same speaker already active, do nothing
      if (speakerId === activeSpeakerId) {
        return
      }

      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Store the pending speaker
      pendingSpeakerRef.current = speakerId

      // Set a timer to update the active speaker after debounce period
      debounceTimerRef.current = setTimeout(() => {
        const newSpeakerId = pendingSpeakerRef.current
        if (!newSpeakerId) return

        // Update current active speaker
        setActiveSpeakerId(newSpeakerId)

        // Update history (keep last 10 speakers, most recent first)
        setActiveSpeakerHistory(prev => {
          const filtered = prev.filter(id => id !== newSpeakerId) // Remove if already in list
          return [newSpeakerId, ...filtered].slice(0, 10) // Add to front, limit to 10
        })

        pendingSpeakerRef.current = null
      }, debounceMs)
    }

    // Subscribe to active speaker event
    meeting.participants.on('activeSpeaker', handleActiveSpeaker)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      meeting.participants.off('activeSpeaker', handleActiveSpeaker)
    }
  }, [meeting, debounceMs, activeSpeakerId])

  return {
    activeSpeakerId,
    activeSpeakerHistory
  }
}
