/**
 * useRealtimeKitDiagnostics Hook
 *
 * Monitors connection health and provides diagnostic information for RealtimeKit calls.
 * Tracks call status, participant count, and provides simulcast debugging capabilities.
 */

import { useCallback, useEffect } from 'react'
import type { GroupCallParticipant } from '../services/groupWebrtcClient'

export interface UseRealtimeKitDiagnosticsOptions {
  meeting: any // RealtimeKit meeting object
  participants: GroupCallParticipant[]
  isInCall: boolean
  callStatus: 'idle' | 'setup' | 'joining' | 'connected' | 'reconnecting' | 'ended'
}

export interface UseRealtimeKitDiagnosticsReturn {
  getConnectionDiagnostics: () => Map<string, any>
  logSimulcastInfo: () => Promise<void>
  connectionQuality: 'good' | 'poor' | 'bad'
  isReconnecting: boolean
}

/**
 * Hook to monitor and diagnose RealtimeKit call connections
 *
 * Provides diagnostic information including:
 * - Connection status and participant count
 * - Simulcast quality layer information
 * - Video track settings and bandwidth
 * - Automatic periodic logging for debugging
 *
 * @param options - Configuration options
 * @returns Diagnostic functions and connection state
 */
export const useRealtimeKitDiagnostics = ({
  meeting,
  participants,
  // isInCall - not used
  callStatus
}: UseRealtimeKitDiagnosticsOptions): UseRealtimeKitDiagnosticsReturn => {
  /**
   * Get basic connection diagnostics
   * Returns a map with status, participant count, and implementation type
   */
  const getConnectionDiagnostics = useCallback((): Map<string, any> => {
    return new Map<string, any>([
      ['status', callStatus],
      ['participants', participants.length],
      ['implementation', 'cloudflare-realtime-kit'],
      ['isReconnecting', callStatus === 'reconnecting']
    ])
  }, [callStatus, participants.length])

  /**
   * Log comprehensive simulcast information for debugging (no-op).
   */
  const logSimulcastInfo = useCallback(async () => {
    if (!meeting || callStatus !== 'connected') {
      return
    }
    // Diagnostic data could be returned or sent elsewhere if needed; no console logging.
  }, [meeting, callStatus, participants])

  // Log simulcast info periodically when in call (every 30 seconds)
  useEffect(() => {
    if (callStatus !== 'connected' || !meeting) {
      return
    }

    // Initial log after 5 seconds
    const initialTimeout = setTimeout(() => {
      logSimulcastInfo()
    }, 5000)

    // Then log every 30 seconds
    const interval = setInterval(() => {
      logSimulcastInfo()
    }, 30000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [callStatus, meeting, logSimulcastInfo])

  // Determine connection quality based on status
  const connectionQuality: 'good' | 'poor' | 'bad' =
    callStatus === 'connected' ? 'good' : callStatus === 'reconnecting' ? 'poor' : 'bad'

  const isReconnecting = callStatus === 'reconnecting'

  return {
    getConnectionDiagnostics,
    logSimulcastInfo,
    connectionQuality,
    isReconnecting
  }
}
