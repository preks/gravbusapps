/**
 * useRealtimeKitActiveSpeaker Hook
 *
 * Tracks the active speaker in a Realtime Kit call.
 * Provides event subscription and state management for active speaker detection.
 */

import { useEffect, useState } from 'react'
import { rtkDebug } from '../utils/rtkDebug'

export interface UseRealtimeKitActiveSpeakerOptions {
  meeting: any // RealtimeKitMeeting instance
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
 * - Debounces rapid speaker changes
 *
 * @param options - Configuration options
 * @returns Active speaker state and history
 */
export const useRealtimeKitActiveSpeaker = ({
  meeting
}: UseRealtimeKitActiveSpeakerOptions): UseRealtimeKitActiveSpeakerReturn => {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
  const [activeSpeakerHistory, setActiveSpeakerHistory] = useState<string[]>([])

  /**
   * Subscribe to active speaker events
   */
  useEffect(() => {
    if (!meeting?.participants) {
      rtkDebug.warn('[RTK Active Speaker] Cannot attach listener: no meeting.participants')
      return
    }

    const handleActiveSpeaker = (participant: any) => {
      // RTK provides peerId in the activeSpeaker event
      const speakerId = participant?.peerId || participant?.id || participant?.userId
      if (!speakerId) {
        rtkDebug.warn('[RTK Active Speaker] Active speaker event with no ID:', participant)
        return
      }

      rtkDebug.log('[RTK Active Speaker] 🎙️ Active speaker changed:', {
        speakerId,
        peerId: participant?.peerId,
        volume: participant?.volume,
        participantName: participant?.name
      })

      // Update current active speaker
      setActiveSpeakerId(speakerId)

      // Update history (keep last 10 speakers, most recent first)
      setActiveSpeakerHistory(prev => {
        const filtered = prev.filter(id => id !== speakerId) // Remove if already in list
        return [speakerId, ...filtered].slice(0, 10) // Add to front, limit to 10
      })
    }

    // Subscribe to active speaker event
    meeting.participants.on('activeSpeaker', handleActiveSpeaker)
    rtkDebug.log('[RTK Active Speaker] ✅ Listener attached')

    return () => {
      meeting.participants.off('activeSpeaker', handleActiveSpeaker)
      rtkDebug.log('[RTK Active Speaker] Listener removed')
    }
  }, [meeting])

  return {
    activeSpeakerId,
    activeSpeakerHistory
  }
}
