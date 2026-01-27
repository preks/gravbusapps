/**
 * useRealtimeKitDiagnostics Hook
 *
 * Monitors connection health and provides diagnostic information for RealtimeKit calls.
 * Tracks call status, participant count, and provides simulcast debugging capabilities.
 */

import { useCallback, useEffect } from 'react'
import type { GroupCallParticipant } from '../services/groupWebrtcClient'
import { SIMULCAST_ENCODINGS } from '../services/realtimeKitSimulcast'
import { rtkDebug } from '../utils/rtkDebug'

export interface UseRealtimeKitDiagnosticsOptions {
  meeting: any // RealtimeKit meeting object
  participants: GroupCallParticipant[]
  isInCall: boolean
  callStatus: 'idle' | 'joining' | 'connected' | 'reconnecting' | 'ended'
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
   * Log comprehensive simulcast information for debugging
   * Shows what we're sending (publisher) and receiving (subscriber)
   *
   * Logs to console via rtkDebug:
   * - Publisher: Local video track resolution, simulcast layers, bitrates
   * - Subscribers: Each remote peer's video quality and resolution
   */
  const logSimulcastInfo = useCallback(async () => {
    if (!meeting || callStatus !== 'connected') {
      rtkDebug.log('[RTK] 📊 Simulcast Info: Not in active call')
      return
    }

    rtkDebug.log('[RTK] 📊 ========== SIMULCAST STATUS REPORT ==========')

    // Publisher info (what we're sending)
    const selfVideoTrack = meeting.self?.videoTrack
    if (selfVideoTrack) {
      const settings = selfVideoTrack.getSettings?.()
      rtkDebug.log('[RTK] 📤 PUBLISHER (YOU):', {
        trackId: selfVideoTrack.id,
        trackLabel: selfVideoTrack.label,
        sendingResolution: settings ? `${settings.width}x${settings.height} @ ${settings.frameRate}fps` : 'unknown',
        simulcastLayers: '3 layers configured (RID=a:high, RID=b:medium, RID=c:low)',
        configuredEncodings: SIMULCAST_ENCODINGS.map(e => ({
          rid: e.rid,
          maxBitrate: `${(e.maxBitrate || 0) / 1000}Kbps`,
          scaleDown: e.scaleResolutionDownBy
        }))
      })
    } else {
      rtkDebug.log('[RTK] 📤 PUBLISHER (YOU): Video not enabled')
    }

    // Subscriber info (what we're receiving from each peer)
    const joined = meeting.participants?.joined
    if (joined) {
      const allParticipants = typeof joined.toArray === 'function' ? joined.toArray() : Array.from(joined.values())

      const remotePeers = allParticipants.filter((p: any) => p.id !== meeting.self?.id)

      rtkDebug.log('[RTK] 📥 SUBSCRIBERS (Receiving from):', {
        totalRemotePeers: remotePeers.length,
        peers: remotePeers.map((peer: any) => {
          const track = peer.videoTrack
          if (!track) return { peerId: peer.id, peerName: peer.name, status: 'no video' }

          const settings = track.getSettings?.()
          const pixels = settings?.width && settings?.height ? settings.width * settings.height : 0
          let quality: string = 'unknown'
          if (pixels >= 900000) quality = 'high'
          else if (pixels >= 300000) quality = 'medium'
          else if (pixels >= 50000) quality = 'low'

          return {
            peerId: peer.id,
            peerName: peer.name || peer.displayName,
            receivingQuality: quality,
            receivingResolution: settings
              ? `${settings.width}x${settings.height} @ ${settings.frameRate}fps`
              : 'unknown',
            trackId: track.id
          }
        })
      })
    }

    rtkDebug.log('[RTK] 📊 ==============================================')
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
